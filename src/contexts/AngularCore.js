/* global define: false */
/* jshint browser: true */

define(['lodash', 'angular'], function(_, angular) {

    'use strict';

    var orig = angular.module,
        targets = [
            'constant',
            'value',
            'factory',
            'service',
            'controller',
            'directive',
            'filter',
            'animation'
        ];

    return _.once(function initialize(ContextManager) {

        angular.module = function module() {

            var mod = orig.apply(angular, arguments),
                parent = ContextManager.getCurrentContext();

            targets.forEach(function wrapTarget(target) {

                var fn = mod[target];

                mod[target] = function _ignore_(name) {
                    try {
                        var args = [].slice.call(arguments);
                        return fn.apply(angular, args);
                    } catch (e) {
                        parent.handleError(e);
                    }
                };

                return mod;

            });

            mod.onError = function onError(handler) {
                parent.onError(handler);
            };

            return mod;

        };

    });

});
