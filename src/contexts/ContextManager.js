/* global define: false */
/* jshint browser: true */

define(['lodash'], function(_) {

    'use strict';

    var empty = '',
        space = ' ',
        colon = ': ',
        newline = '\n',
        cache = {},
        filesToExclude = [],

        isOpera = !!window.opera || navigator.userAgent.indexOf(' OPR/') >= 0,
        isFirefox = typeof InstallTrigger !== 'undefined',
        isSafari = Object.prototype.toString.call(window.HTMLElement).indexOf('Constructor') > 0,
        isChrome = !!window.chrome && !isOpera,
        isIE = /*@cc_on!@*/false || !!document.documentMode,

        rx = {
            // TODO: add logic for other browsers
            ie : {
                indices: [2, 3, 1],
                pattern: /\s+?at ([^\(]+).+?(\w+\.js|[\w \$\_]+):(\d+)/i
            },
            chrome : {
                indices: [3, 4, 1], // file, line, method
                pattern: /\s+?at ([\w\.\$<>_ ]+(\(anonymous function\))?).+?\/(\w+\.js):(\d+)/i
            },
            firefox : {
                indices: [2, 3, 1], // file, line, method
                pattern: /([^@\n<]*)?.+?\/(\w+\.js)[: line]+(\d+)/i
            }
        },

        rxDef = isIE ? rx.ie :
            isFirefox ? rx.firefox :
            isChrome ? rx.chrome : /\0/,

        sanitize = function sanitize(stack) {
            return stack
                .split(newline)
                .filter(function isLine(line) {
                    return line.indexOf('Error') !== 0 &&
                        line.indexOf('_ignore_') === -1;
                })
                .join(newline);
        },

        getCleanStack = function getCleanStack() {
            try {
                throw new Error();
            } catch (e) {
                return sanitize(e.stack);
            }
        },

        getParts = _.memoize(function getParts(line) {

            var matches = rxDef.pattern.exec(line),
                indices = rxDef.indices;

            return !matches ? [] : [matches[indices[0]], 'line ' + matches[indices[1]], (matches[indices[2]] || 'anonymous').trim()];

        }),

        getStackParts = function getStackParts(stack) {
            return stack
                .split(newline)
                .map(getParts)
                .filter(function isMatch(arr) {
                    return arr.length === 3;
                });
        },

        DEFAULT = new Context('global');

    function Context(name) {

        this.name = name;
        this.refCount = 0;
        this.id = _.uniqueId('Context');
        this.stack = getStackParts(getCleanStack());
        this.parent = null;
        this.children = [];
        this.handlers = [];

        cache[this.id] = this;

    }

    Context.prototype.toString = function toString() {
        var res = [],
            target = this,
            corner = '\u2514 ';
        while (!!target) {
            res[res.length] = target.name;
            target = target.parent;
        }
        return res.reverse().map(function map(item, i) {
            return i === 0 ? item : [
                newline,
                new Array(i << 1).join(space),
                corner,
                item
            ].join(empty);
        }).join(empty).trim();
    };

    Context.prototype.incRefCount = function increment() {
        this.refCount++;
    };

    function noMoreRefs(context) {
        var target = context;
        if (target.refCount > 0) {
            return false;
        }
        return !target.children.length || target.children.every(noMoreRefs);
    }

    function deleteContext(context) {
        context.children.forEach(deleteContext);
        context.children.length = 0;
        context.handlers.length = 0;
        delete context.stack;
        delete context.children;
        delete context.handlers;
        delete cache[context.id];
    }

    Context.prototype.decRefCount = function decrement() {
        this.refCount = Math.max(0, --this.refCount);
        if (noMoreRefs(this)) {
            deleteContext(this);
            if (this.parent) {
                this.parent.children.splice(
                    this.parent.children.indexOf(this), 1);
                this.parent.decRefCount();
            }
            delete this.parent;
        }
    };

    Context.prototype.run = function run(fn) {
        try {
            var wrap,
                ctx = this,
                wrapper =
                    'wrap = function __' + this.id + '() {' +
                    '   var res = fn.apply(fn, arguments);' +
                    '   return res;' +
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

    function ContextError(causedBy, context, stack) {
        this.stack = ContextManager.getCurrentStack(causedBy);
        this.context = context;
        this.handled = false;
        this.name = causedBy.name;
        this.message = causedBy.message;
    }

    ContextError.prototype = Object.create(Error.prototype);
    ContextError.prototype.constructor = ContextError;

    Context.prototype.handleError = function handleError(e) {

        var target = this,

            errorArgs = new ContextError(e, this, ContextManager.getCurrentStack()),

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

    // TODO: privatize?
    ContextManager.createChildContext = function createChildContext(parent, childName) {
        var child = new Context(childName);
        parent.children[parent.children.length] = child;
        child.parent = Object.create(parent);

        child.stack = child.stack.concat(parent.stack);

        return child;
    };

    ContextManager.runInChildContext = function runInChildContext(parent, childName, fn) {
        return ContextManager.createChildContext(parent, childName).run(fn);
    };

    ContextManager.getCurrentContext = function getCurrentContext(optStack) {

        var stack = !!optStack ? sanitize(optStack) : getCleanStack(),
            parts = getStackParts(stack),
            context = _.findLast(parts, function isContext(arr) {
                return /__Context\d+/.test(arr[2]);
            }) || [null, null, empty];

        return cache[context[2].substr(2)] || DEFAULT;

    };

    // TODO: privatize?
    ContextManager.getCurrentStack = function getCurrentStack(e) {

        var sep = empty,
            tab = empty,
            context = '\u2192 in context',
            result = [],
            target = ContextManager.getCurrentContext(e ? e.stack : undefined);

        while (!!target) {
            result = result.concat(target.stack);
            result.push([context, empty, target.name]);
            target = target.parent;
        }

        result = result.filter(function notSelf(arr) {
            return arr[0] !== 'ContextManager.js' &&
                arr[0].indexOf('eval') === -1 &&
                arr[0].indexOf('Function') === -1;
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
