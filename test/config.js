(function() {

    'use strict';

    /**
     * @author Dan
     * @date 2015-02-28
     */

    var isTest = function isTest(uri) {
            return uri.match(/\-spec\.js/);
        },

        makeRelative = function relative(uri) {
            return uri.replace(/^\/base/, '..').replace(/\.js$/, '');
        },

        specs = Object
            .keys(window.__karma__.files)
            .filter(isTest)
            .map(makeRelative);

    if (!!specs.length) {

        console.debug('tests:');
        specs.forEach(function(spec) {
            console.debug('\t' + spec);
        });

        Function.prototype.bind = Function.prototype.bind || function bind(context) {
            var fn = this,
                args = [].slice.call(arguments, 1);
            return function fnBound() {
                return fn.apply(context, args.concat([].slice.call(arguments)));
            };
        };

        requirejs.config({
            baseUrl: '/base/src',
            deps: specs,
            paths: {
                lodash: '../bower_components/lodash/lodash',
                angular: '../bower_components/angularjs/angular',
        'error-stack-parser': '../bower_components/error-stack-parser/dist/error-stack-parser.min'
            },
            shim: {
                angular: {
                    exports: 'angular'
                },
                lodash: {
                    exports: '_'
                }
            },
            callback: window.__karma__.start
        });

    }

}());
