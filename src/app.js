/* global define, console: false */
/* jshint browser: true */

define([
    'angular',
    'require',
    './contexts/ContextManager',
    './contexts/Timeouts',
    './contexts/DOMEvents',
    './contexts/AngularEvents'
], function(
    angular,
    require,
    ContextManager,
    initTimeouts,
    initDOMEvents,
    initAngularEvents
) {

    'use strict';

    initTimeouts(ContextManager);
    initDOMEvents(ContextManager);
    ContextManager.excludeFiles(
        'lodash.js',
        'angular.js',
        'require.js'
        // bloodhound.js
    );

    return angular.module('App', ['ng'])
        .config(['$provide', function($provide) {
            initAngularEvents(ContextManager, $provide);
        }])
        .controller('AppController', [function AppController() {

            var ctrl = this,
                token = null;

            this.methodA = function methodA() {
                setTimeout(ctrl.methodB, 10);
            };

            this.methodB = function methodB() {
                setTimeout(ctrl.methodC, 10);
            };

            this.methodC = function methodC() {
                console.log(ContextManager.getCurrentStack());
            };

            this.repeat = function repeat() {
                if (!!token) {
                    clearInterval(token);
                    token = null;
                } else {
                    token = setInterval(ctrl.methodA, 2000);
                }
            };

            this.concurrent = function concurrent() {
                setTimeout(ctrl.methodB, 10);
                setTimeout(ctrl.methodC, 10);
            };

            document.querySelector('#windowMethodA').addEventListener('click', this.methodA);

        }]);

});
