/* global define, console: false */
/* jshint browser: true */

define([
    'angular',
    'require',
    '../build/cm'
], function(
    angular,
    require,
    ContextManager
) {

    'use strict';

    ContextManager.initTimeouts();
    ContextManager.initDOMEvents();
    ContextManager.initAngularCore();
    ContextManager.manager.excludeFiles(
        'lodash.js',
        'angular.js',
        'require.js'
    );

    return angular.module('App', ['ng'])
        .config(['$provide', function($provide) {
            ContextManager.initAngularEvents($provide);
        }])
        .controller('AppController', [function AppController() {

            var ctrl = this,
                token = null;

            ContextManager.manager.getCurrentContext().onError(function handler(e) {
                e.handled = true;
                console.group('Error in context: ' + e.context.name);
                console.error(e.message);
                console.info(e.stack);
                console.groupEnd();
            });

            this.methodA = function methodA() {
                setTimeout(ctrl.methodB, 10);
            };

            this.methodB = function methodB() {
                // uncomment to see internal error handling:
                // null.doSomething();
                setTimeout(ctrl.methodC, 10);
            };

            this.methodC = function methodC() {
                console.log(ContextManager.manager.getCurrentContext().toString());
            };

            this.repeat = function repeat() {
                if (!!token) {
                    clearInterval(token);
                    token = null;
                } else {
                    token = setInterval(ctrl.methodA, 2000);
                }
            };

            this.frame = function frame() {
                requestAnimationFrame(ctrl.methodB);
            };

            this.concurrent = function concurrent() {
                setTimeout(ctrl.methodB, 10);
                setTimeout(ctrl.methodC, 10);
            };

            this.throwError = function throwError() {
                var count = 0,
                    token = setInterval(function inner() {
                        if (++count === 3) {
                            throw new Error('Unexpected error!');
                        }
                    }, 1000);
            };

            document.querySelector('#windowMethodA').addEventListener('click', this.methodA);

        }]);

});
