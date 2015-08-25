/* global define: false */
/* jshint browser: true */

define(['lodash'], function(_) {

    'use strict';

    return _.once(function initialize(ContextManager) {

        var intervals = {},
            origSetTimeout = window.setTimeout.bind(window),
            origSetInterval = window.setInterval.bind(window);

        window.setTimeout = _.wrap(window.setTimeout, function _ignore_SetTimeout(st) {
            var args = [].slice.call(arguments, 1),
                parent = ContextManager.getCurrentContext(),
                fnName = (args[0].name || 'anonymous');
            parent.incRefCount();
            return st(function setTimeout() {
                parent.fork('setTimeout: ' + fnName, args[0], function cleanUp() {
                    parent.delete();
                });
                parent.decRefCount();
            }, args[1] || 0);
        });

        window.clearInterval = _.wrap(window.clearInterval, function _ignore_ClearInterval(ci, token) {
            ci(token);
            if (intervals[token]) {
                intervals[token]();
                delete intervals[token];
            }
        });

        window.setInterval = _.wrap(window.setInterval, function _ignore_SetInterval(si) {
            var childContext,
                args = [].slice.call(arguments, 1),
                parent = ContextManager.getCurrentContext(),
                fnName = (args[0].name || 'anonymous'),
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
                childContext.run(args[0], cleanUp);
            }, args[1] || 0);
            intervals[token] = cleanUp;
            return token;
        });

        window.requestAnimationFrame = _.wrap(window.requestAnimationFrame, function _ignore_RAF(raf) {
            var args = [].slice.call(arguments, 1),
                parent = ContextManager.getCurrentContext(),
                fnName = (args[0].name || 'anonymous');
            parent.incRefCount();
            return raf(function requestAnimationFrame() {
                parent.fork('requestAnimationFrame: ' + fnName, args[0], function cleanUp() {
                    parent.delete();
                });
                parent.decRefCount();
            });
        });

        return {
            origTimeout: origSetTimeout,
            origInterval: origSetInterval
        };

    });

});
