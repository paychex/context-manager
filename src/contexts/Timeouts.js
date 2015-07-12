/* global define: false */
/* jshint browser: true */

define(['lodash'], function(_) {

    'use strict';

    return _.once(function initialize(ContextManager) {

        // TODO: remove child contexts on clearTimeout, clearInterval

        window.setTimeout = _.wrap(window.setTimeout, function _ignore_SetTimeout(st) {
            var args = [].slice.call(arguments, 1),
                parent = ContextManager.getCurrentContext();
            return st(function setTimeout() {
                ContextManager.runInChildContext(parent, 'setTimeout', args[0]);
            }, args[1] || 0);
        });

        window.setInterval = _.wrap(window.setInterval, function _ignore_SetInterval(si) {
            var args = [].slice.call(arguments, 1),
                parent = ContextManager.getCurrentContext();
            return si(function setInterval() {
                ContextManager.runInChildContext(parent, 'setInterval', args[0]);
            }, args[1] || 0);
        });

        window.requestAnimationFrame = _.wrap(window.requestAnimationFrame, function _ignore_RAF(raf) {
            var args = [].slice.call(arguments, 1),
                parent = ContextManager.getCurrentContext();
            return raf(function requestAnimationFrame() {
                ContextManager.runInChildContext(parent, 'requestAnimationFrame', args[0]);
            });
        });

    });

});
