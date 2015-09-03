/* global require, document: false */

require.config({
    basePath: '../src',
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
    }
});

require(['angular', 'app'], function bootstrap(angular, app) {
    angular.bootstrap(document.body, [app.name]);
});
