/* global define: false */

define(['lodash'], function(_) {

    'use strict';

    var empty = '',
        space = ' ',
        colon = ': ',
        newline = '\n',
        cache = {},
        filesToExclude = [],

        rx = {
            // TODO: add logic for other browsers
            chrome : {
                matchLength: 5,
                indices: [3, 4, 1], // file, line, method
                pattern: /\s+?at ([\w\.\$<>_ ]+(\(anonymous function\))?).+?\/(\w+\.js):(\d+)/i
            }
        },

        getCleanStack = function getCleanStack() {
            try {
                throw new Error();
            } catch (e) {
                return e.stack
                    .split(newline)
                    .filter(function isLine(line) {
                        return line.indexOf('Error') === -1 &&
                            line.indexOf('_ignore_') === -1;
                    })
                    .join(newline);
            }
        },

        getStackParts = function getStackParts(stack) {
            return stack
                .split(newline)
                .map(function getParts(line) {
                    var parts = [];

                    // TODO: we can shortcut this by caching the
                    // matching regexp so we don't have to go through
                    // other browsers unnecessarily

                    _.forIn(rx, function getPattern(def) {
                        var indices = def.indices,
                            matches = def.pattern.exec(line),
                            isMatch = matches.length === def.matchLength;
                        if (isMatch) {
                            parts = [matches[indices[0]], 'line ' + matches[indices[1]], matches[indices[2]].trim()];
                        }
                        return !isMatch;
                    });
                    return parts;
                })
                .filter(function isMatch(arr) {
                    return arr.length === 3;
                });
        },

        DEFAULT = new Context('global');

    function Context(name) {

        this.name = name;
        this.id = _.uniqueId('Context');
        this.stack = getStackParts(getCleanStack());
        cache[this.id] = this;

    }

    Context.prototype.parent = null;
    Context.prototype.children = [];
    Context.prototype.handlers = [];

    Context.prototype.run = function run(fn) {
        try {
            var wrap,
                wrapper =
                    'wrap = function __' + this.id + '() {' +
                    '   return fn.apply(null, arguments);' +
                    '};';
            /* jshint -W061 */
            eval(wrapper);
            /* jshint +W061 */
            return wrap();
        } catch (e) {
            this.handleError(e);
        }
    };

    Context.prototype.onError = function onError(handler) {
        this.handlers[this.handlers.length] = handler;
        return function removeHandler() {
            this.handlers.splice(this.handlers.indexOf(handler), 1);
        };
    };

    Context.prototype.handleError = function handleError(e) {

        var target = this,

            errorArgs = {
                error: e,
                context: this,
                handled: false,
                stack: ContextManager.getCurrentStack()
            },

            callErrorHandlers = function callErrorHandler(handler) {
                handler(errorArgs);
                return !errorArgs.handled;
            };

        while (!errorArgs.handled && !!target) {
            _.forEach(target.handlers, callErrorHandlers);
            target = target.parent;
        }

        if (!errorArgs.handled) {
            throw e;
        }

    };

    function ContextManager() {
        if (this instanceof ContextManager) {
            throw new SyntaxError('ContextManager is a static class and cannot be instantiated.');
        }
    }

    ContextManager.excludeFiles = function excludeFiles() {
        filesToExclude = filesToExclude.concat(_.flatten(_.toArray(arguments)));
    };

    ContextManager.runInChildContext = function runInChildContext(parent, childName, fn) {
        var child = new Context(childName);
        parent.children[parent.children.length] = child;
        child.parent = Object.create(parent);
        child.run(fn);
    };

    ContextManager.getCurrentContext = function getCurrentContext() {

        var stack = getCleanStack(),
            parts = getStackParts(stack),
            context = _.findLast(parts, function isContext(arr) {
                return /__Context\d+/.test(arr[2]);
            }) || [null, null, empty];

        context = Object.create(cache[context[2].substr(2)] || DEFAULT);
        context.stack = parts.concat(context.stack);

        return context;

    };

    ContextManager.getCurrentStack = function getCurrentStack() {

        var sep = empty,
            tab = empty,
            context = '\u2192 in context',
            result = [],
            target = ContextManager.getCurrentContext();

        while (!!target) {
            result = result.concat(target.stack);
            result.push([context, empty, target.name]);
            target = target.parent;
        }

        result = result.filter(function notSelf(arr) {
            return arr[0] !== 'ContextManager.js';
        }).filter(function not3rdParty(line) {
            return filesToExclude.every(function test3rdParty(lib) {
                return line.indexOf(lib) === -1;
            });
        });

        return _.reduce(result, function formatParts(res, arr, index) {
            var out = [];
            if (!_.isEqual(result[index], result[index-1])) {
                out = [sep, tab, arr[0], space, arr[1], colon, arr[2]];
                sep = newline;
                if (arr[0].indexOf(context) !== -1) {
                    tab += space;
                    tab += space;
                }
            }
            return res + out.join(empty);
        }, empty);

    };

    return ContextManager;

});
