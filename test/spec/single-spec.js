define([
    'lodash',
    './generators',
    '../../index'
], function(
    _,
    gen,
    index
) {

    'use strict';

    window.requestAnimationFrame =
        window.requestAnimationFrame ||
        window.setTimeout;

    index.initTimeouts();
    index.initDOMEvents();
    index.manager.excludeFiles(
        'lodash.js',
        'angular.js',
        'require.js'
    );

    function run(method) {
        method(index.manager);
    }

    function cross(arr, count) {
        var arrays = [];
        for (var i = 0; i < count; i++) {
            arrays.push(arr);
        }
        return _.reduce(arrays, function(a, b) {
            return _.flatten(_.map(a, function(x) {
                return _.map(b, function(y) {
                    return x.concat([y]);
                });
            }), true);
        }, [ [] ]);
    }

    var methods = {
        setInterval: {
            method: 'interval',
            args: [100, 1]
        },
        setTimeout: {
            method: 'timeout',
            args: [10]
        },
        requestAnimationFrame: {
            method: 'animate',
            args: []
        },
        'div:click': {
            method: 'domEvent',
            args: ['click']
        }
    };

    describe('execution contexts', function() {

        beforeEach(index.manager.attemptCollection);

        describe('in parallel', function() {

            for(var count = 1; count <= 3; count++) {

                cross(Object.keys(methods), count).forEach(function(arrs) {

                    it(count + ' at a time: ' + arrs.join(', '), function(done) {
                        var fns = arrs.reduce(function toMethods(out, key) {
                            var test = methods[key];
                            out.push(gen[test.method].apply(null, test.args.concat([
                                gen.verify(
                                    gen.nop(),
                                    gen.fail(done),
                                    gen.matches.context('global', key))
                            ])));
                            return out;
                        }, []);
                        run(gen.parallel.apply(null, [gen.ok(done)].concat(fns)));
                    });

                });

            }

        });

        ddescribe('in sequence', function() {

            it('manual', function(done) {

                // FIXME: this works in chrome but not in Phantom
                run(gen.timeout(10,
                    gen.timeout(10,
                        gen.verify(
                            gen.ok(done),
                            gen.fail(done),
                            gen.matches.context.apply(null, ['global'].concat(['setTimeout', 'setTimeout']))))));

            });

            //for(var count = 2; count <= 4; count++) {
            //
            //    cross(Object.keys(methods), count).forEach(function(arrs) {
            //
            //        it(count + ' deep: ' + arrs.join(' > '), function(done) {
            //
            //            var fn = arrs.reduce(function toMethod(f, key) {
            //                var parent = methods[key];
            //                var child = methods[key];
            //                return gen[parent.method].apply(null, parent.args.concat([f]));
            //            });
            //
            //            run(fn(gen.verify(
            //                gen.ok(done),
            //                gen.fail(done),
            //                gen.matches.context.apply(null, ['global'].concat(arrs)))));
            //
            //        });
            //
            //    });
            //
            //}

        });

        describe('handled errors', pending);
        describe('unhandled errors', pending);

    });

});