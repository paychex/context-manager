/* global define: false */
/* jshint browser: true */

define(['lodash'], function(_) {

    'use strict';

    return _.once(function initialize(ContextManager) {

        var intervals = {},
            origSetTimeout = window.setTimeout;

        window.setTimeout = _.wrap(window.setTimeout, function _ignore_SetTimeout(st) {
            var args = [].slice.call(arguments, 1),
                parent = ContextManager.getCurrentContext();
            parent.incRefCount();
            return st(function setTimeout() {
                ContextManager.runInChildContext(parent, 'setTimeout', args[0]);
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
            var args = [].slice.call(arguments, 1),
                parent = ContextManager.getCurrentContext(),
                childContext;
            parent.incRefCount();
            var token = si(function setInterval() {
                if (!childContext) {
                    childContext = ContextManager.createChildContext(parent, 'setInterval');
                    childContext.onError(function removeInterval() {
                        // give error handlers time to traverse
                        // up the parent chain before cleaning up
                        // this context and its parents
                        origSetTimeout(function() {
                            clearInterval(token);
                        });
                    });
                }
                childContext.run(args[0]);
            }, args[1] || 0);
            intervals[token] = function cleanUp() {
                parent.decRefCount();
            };
            return token;
        });

        window.requestAnimationFrame = _.wrap(window.requestAnimationFrame, function _ignore_RAF(raf) {
            var args = [].slice.call(arguments, 1),
                parent = ContextManager.getCurrentContext();
            parent.incRefCount();
            return raf(function requestAnimationFrame() {
                ContextManager.runInChildContext(parent, 'requestAnimationFrame', args[0]);
                parent.decRefCount();
            });
        });

    });

});
