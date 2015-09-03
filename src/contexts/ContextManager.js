/* global define: false */
/* jshint browser: true */

define(['lodash', 'error-stack-parser', './Timeouts'], function(_, StackParser, Timeouts) {

    'use strict';

    var empty = '',
        space = ' ',
        colon = ': ',
        newline = '\n',
        writable = undefined,

        cache = {},
        garbage = [],
        filesToExclude = [],
        
        isFirefox = typeof InstallTrigger !== 'undefined',

        sanitize = function sanitize(stackframes) {
            return stackframes
                .filter(function isLine(frame) {
                    return frame.functionName && frame.functionName.indexOf('_ignore_') === -1;
                });
        },

        getCleanStack = function getCleanStack() {
            try {
                throw new Error();
            } catch (e) {
                if (isFirefox) {
                    if (writable === undefined) {
                        var prop = Object.getOwnPropertyDescriptor(e, 'stack')
                        writable = prop && prop.writable;
                    }
                    if (writable) {
                        e.stack = e.stack ? e.stack.replace(/ line (\d+) \> eval.+/g, ':$1') : '';
                    }
                }
                return sanitize(StackParser.parse(e));
            }
        },

        getParts = function getParts(frame) {
            return [frame.fileName.split('/').pop(), frame.lineNumber, frame.functionName];
        },

        getStackParts = function getStackParts(stackframes) {
            return stackframes
                .map(getParts)
                .filter(function isMatch(arr) {
                    return arr.length === 3;
                });
        },

        DEFAULT = new Context('global'),

        canCollect = function canCollect(entry) {
            if (entry.refCount > 0 || entry.frozen || entry.name === 'global') {
                return false;
            }
            var parent = entry.parent;
            while (!!parent) {
                if (parent.frozen) {
                    return false;
                }
                parent = parent.parent;
            }
            return !entry.children ||
                entry.children.length === 0 ||
                entry.children.every(canCollect);
        },

        deleteEntry = function deleteEntry(entry) {
            entry.children.forEach(deleteEntry);
            entry.stack.length = 0;
            entry.isolateStack.length = 0;
            entry.children.length = 0;
            entry.handlers.length = 0;
            if (entry.parent && entry.parent.children) {
                entry.parent.children.splice(
                    entry.parent.children.indexOf(entry), 1);
            }
            delete cache[entry.id];
        },

        getCurrentStack = function getCurrentStack(e) {

            var sep = empty,
                tab = empty,
                result = [],
                context = '\u2192 in context',
                target = ContextManager.getCurrentContext(e);

            while (!!target) {
                result = result.concat(target.isolateStack);
                result.push([context, empty, target.name]);
                target = target.parent;
            }

            result = result.filter(function notSelf(arr) {
                return arr[0] !== 'ContextManager.js' &&
                    arr[0] !== 'cm.js' &&
                    arr[0] !== 'cm.min.js' &&
                    arr[0].indexOf('eval') === -1 &&
                    arr[0].indexOf('Function') === -1;
            }).filter(function not3rdParty(line) {
                return filesToExclude.every(function test3rdParty(lib) {
                    return line.indexOf(lib) === -1;
                });
            });

            return _.reduce(result, function formatParts(res, arr, index) {
                var out = [];
                if (!_.isEqual(result[index], result[index - 1])) {
                    out = [sep, tab, arr[0], space, arr[1], colon, arr[2]];
                    sep = newline;
                    if (arr[0].indexOf(context) !== -1) {
                        tab += space;
                        tab += space;
                    }
                }
                return res + out.join(empty);
            }, empty);

        },

        attemptCollection = function attemptCollection() {
            var count = garbage.length,
                entry = garbage.shift();
            while (count-- && !!entry) {
                if (canCollect(entry)) {
                    deleteEntry(entry);
                } else {
                    garbage.push(entry);
                }
                entry = garbage.shift();
            }
        };

    setInterval(attemptCollection, 1000);

    function ContextError(causedBy, context) {
        this.stack = getCurrentStack(causedBy);
        this.context = context;
        this.handled = false;
        this.name = 'ContextError';
        this.message = causedBy.message;
        this.causedBy = causedBy;
    }

    ContextError.prototype = Object.create(Error.prototype);
    ContextError.prototype.constructor = ContextError;

    function Context(name) {
        this.name = name;
        this.refCount = 0;
        this.id = _.uniqueId('Context');
        this.isolateStack = [];
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

    Context.prototype.delete = function deleteContext() {
        if (this.name === 'global') {
            return;
        }
        this.refCount = 0;
        garbage.push(this);
    };

    Context.prototype.incRefCount = function incRefCount() {
        this.refCount++;
    };

    Context.prototype.decRefCount = function decRefCount() {
        this.refCount = Math.max(0, --this.refCount);
        if (this.refCount === 0) {
            this.delete();
        }
    };

    Context.prototype.freeze = function freeze() {
        this.frozen = true;
    };

    Context.prototype.unfreeze = function unfreeze() {
        this.frozen = false;
    };

    Context.prototype.isActive = function isActive(context) {
        context = context || this;
        return context.children.length > 0 &&
            context.children.some(isActive);
    };

    Context.prototype.createChild = function createChild(name) {
        var child = new Context(name);
        this.children[this.children.length] = child;
        child.parent = this;
        child.isolateStack = child.stack.concat();
        child.stack = child.stack.concat(this.stack);
        return child;
    };

    Context.prototype.fork = function fork(childName, method, args, cleanUp) {
        var child = this.createChild(childName),
            result = child.run(method, args, cleanUp);
        return child.delete(), result;
    };

    Context.prototype.run = function run(fn, args, cleanUp) {
        try {
            args = args || [];
            if (typeof args === 'function') {
                cleanUp = args;
                args = [];
            }
            var wrapper =
                'wrapper = function __' + this.id + '() {' +
                '  return fn.apply(fn, args);' +
                '};';
            /* jshint -W061 */
            return eval(wrapper)();
            /* jshint +W061 */
            //return wrapper();
        } catch (e) {
            if (cleanUp) {
                // give error handlers time to traverse
                // up the parent chain before cleaning up
                // this context and its parents
                Timeouts().origTimeout(cleanUp);
            }
            this.handleError(e);
        }
    };

    Context.prototype.onError = function onError(handler) {
        this.handlers[this.handlers.length] = handler;
        return function removeHandler() {
            this.handlers.splice(this.handlers.indexOf(handler), 1);
        }.bind(this);
    };

    Context.prototype.handleError = function handleError(e) {

        var target = this,

            errorArgs = new ContextError(e, this),

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

    ContextManager.getCurrentContext = function getCurrentContext(e) {

        var stack = e instanceof Error ? sanitize(StackParser.parse(e)) : getCleanStack(),
            parts = getStackParts(stack),
            context = _.findLast(parts, function isContext(arr) {
                    return /__Context\d+/.test(arr[2]);
                }) || [null, null, empty];

        return cache[context[2].substr(2)] || DEFAULT;

    };

    ContextManager.attemptCollection = attemptCollection;

    return ContextManager;

});
