module.exports = function(config) {

    'use strict';

    config.set({

        basePath: './',

        browsers: ['PhantomJS'],

        frameworks: ['jasmine', 'requirejs'],

        files: [
            'test/config.js',
            {pattern: 'src/**/*.js', included: false, watched: true},
            {pattern: 'test/**/*.js', included: false, watched: true},
            {pattern: 'bower_components/**/*.js', included: false, watched: true}
        ],

        autoWatch: true,
        singleRun: false,
        captureTimeout: 120000,

        reporters: ['story', 'coverage'],

        coverageReporter: {
            reporters: [
                {type: 'text-summary', dir: 'build/dev/coverage'},
                {type: 'html', dir: 'build/dev/coverage'}
            ]
        },

        junitReporter: {
            outputFile: 'build/dev/unit.xml',
            suite: 'unit'
        }

    });
};
