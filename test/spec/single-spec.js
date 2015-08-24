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
        return Array.prototype.reduce.call(arrays, function(a, b) {
            var ret = [];
            a.forEach(function(a) {
                b.forEach(function(b) {
                    ret.push(a.concat([b]));
                });
            });
            return ret;
        }, [[]]);
    }

    var methods = {
        setTimeout: {
            method: 'timeout',
            args: [10]
        },
        setInterval: {
            method: 'interval',
            args: [5, 3]
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
        
        describe('in sequence', function() {
            
            for(var count = 2; count <= 4; count++) {
                
                cross(Object.keys(methods), count).forEach(function(arrs) {

                    it(count + ' deep: ' + arrs.join(' > '), function(done) {

                        run(arrs.concat().reverse().reduce(function toMethod(last, currentKey) {
                            var child = methods[currentKey];
                            return gen[child.method].apply(null, child.args.concat([last]));
                        },  gen.verify(
                            gen.ok(done),
                            gen.fail(done),
                            gen.matches.context.apply(null, ['global'].concat(arrs)))));
            
                    });
            
                });
            
            }

        });

        iit('in sequence and parallel', function(done) {
            var count = 0,
                numTests = 6,
                increment = function inc(test) {
                    return function() {
                        console.log('ok', test);
                        if (++count === numTests) {
                            done();
                        }
                    };
                },
                error = function err(msg) {
                    console.error(msg);
                };
            run(gen.timeout(10,
                gen.parallel(
                    gen.parallel(
                        gen.verify(
                            gen.ok(increment(1)),
                            gen.fail(error),
                            gen.matches.context('global', 'Timeout')),
                        gen.interval(10, 5,
                            gen.animate(
                                gen.verify(
                                    gen.ok(increment(2)),
                                    gen.fail(error),
                                    gen.matches.context('global', 'Timeout', 'Interval', 'Animation'))
                            )),
                        gen.timeout(20,
                            gen.animate(
                                gen.verify(
                                    gen.ok(increment(3)),
                                    gen.fail(error),
                                    gen.matches.context('global', 'Timeout', 'Timeout', 'Animation'))
                            )),
                        gen.domEvent('click',
                            gen.animate(
                                gen.verify(
                                    gen.ok(increment(4)),
                                    gen.fail(error),
                                    gen.matches.context('global', 'Timeout', 'click', 'Animation'))
                            ))
                    ),
                    gen.interval(10, 5,
                        gen.animate(
                            gen.verify(
                                gen.ok(increment(5)),
                                gen.fail(error),
                                gen.matches.context('global', 'Timeout', 'Interval', 'Animation'))
                        )),
                    gen.domEvent('click',
                        gen.animate(
                            gen.verify(
                                gen.ok(increment(6)),
                                gen.fail(error),
                                gen.matches.context('global', 'Timeout', 'click', 'Animation'))
                        ))
                )));
        });

        describe('handled errors', pending);
        describe('unhandled errors', pending);

    });

});