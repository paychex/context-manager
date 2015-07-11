/* global require, document: false */

require.config({
    basePath: 'src',
    paths: {
        lodash: '../bower_components/lodash/lodash',
        angular: '../bower_components/angularjs/angular'
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

require(['angular', 'app'], function(angular, app) {
    angular.bootstrap(document.body, [app.name]);
});
