/* global define: false */
/* jshint browser: true */

define(['lodash'], function(_) {

    'use strict';

    return _.once(function initialize(ContextManager, enableMap) {

        var intervals = {},
            origSetTimeout = window.setTimeout.bind(window),
            origSetInterval = window.setInterval.bind(window),

            enabled = _.defaults({}, enableMap, {
                setTimeout: true,
                setInterval: true,
                requestAnimationFrame: true
            }),

            getFunctionName = function getFunctionName(fn) {
                var name = fn.name;
                if (!name) {
                    var match = fn.toString().match(/^function\s*([^\s(]+)/);
                    if (match) {
                        name = match[1];
                    }
                }
                return name || 'anonymous';
            },

            // for optimization reasons, we don't want to pass the
            // arguments object to other methods directly; we also
            // want to avoid instantiating it (which is what [].slice
            // will do); this method copies elements manually into a
            // new array instance
            toArray = function toArray(args, index) {
                var i = index || 0, j = 0, l = args.length, res = new Array(Math.max(0, l-i));
                for(; i < l; ++i, ++j) {
                    res[j] = args[i];
                }
                return res;
            };

        if (enabled.setTimeout) {

            window.setTimeout = _.wrap(window.setTimeout, function _ignore_SetTimeout(st, fn, ms) {
                if (typeof fn === 'string') {
                    throw new Error('eval mode disabled for security reasons');
                }
                var parent = ContextManager.getCurrentContext(),
                    args = toArray(arguments, 3),
                    fnName = getFunctionName(fn),
                    cleanUp = function cleanUp() {
                        parent.delete();
                    };
                parent.incRefCount();
                return st(function setTimeout() {
                    parent.fork('setTimeout: ' + fnName, fn, args, cleanUp);
                    parent.decRefCount();
                }, ms || 0);
            });

        }

        if (enabled.setInterval) {

            window.clearInterval = _.wrap(window.clearInterval, function _ignore_ClearInterval(ci, token) {
                ci(token);
                if (intervals[token]) {
                    intervals[token]();
                    delete intervals[token];
                }
            });

            window.setInterval = _.wrap(window.setInterval, function _ignore_SetInterval(si, fn, ms) {
                if (typeof fn === 'string') {
                    throw new Error('eval mode disabled for security reasons');
                }
                var childContext,
                    parent = ContextManager.getCurrentContext(),
                    args = toArray(arguments, 3),
                    fnName = getFunctionName(fn),
                    cleanUp = function cleanUp() {
                        if (childContext) {
                            childContext.unfreeze();
                        }
                        parent.delete();
                    };
                parent.incRefCount();
                var token = si(function setInterval() {
                    if (!childContext) {
                        childContext = parent.createChild('setInterval: ' + fnName);
                        childContext.freeze();
                    }
                    childContext.run(fn, args, cleanUp);
                }, ms || 0);
                intervals[token] = cleanUp;
                return token;
            });

        }

        if (enabled.requestAnimationFrame) {

            window.requestAnimationFrame = _.wrap(window.requestAnimationFrame, function _ignore_RAF(raf, fn) {
                var parent = ContextManager.getCurrentContext(),
                    fnName = getFunctionName(fn);
                parent.incRefCount();
                return raf(function requestAnimationFrame() {
                    parent.fork('requestAnimationFrame: ' + fnName, fn, toArray(arguments), function cleanUp() {
                        parent.delete();
                    });
                    parent.decRefCount();
                });
            });

        }

        return {
            origTimeout: origSetTimeout,
            origInterval: origSetInterval
        };

    });

});
