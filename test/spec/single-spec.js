define([
    'lodash',
    './generators',
    'index'
], function(
    _,
    gen,
    index
) {

    'use strict';

    window.requestAnimationFrame =
        window.requestAnimationFrame ||
        window.setTimeout;

    var origST = window.setTimeout.bind(window);

    index.initTimeouts();
    index.initDOMEvents(['click']);
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

    describe('specifications', function() {

        describe('setTimeout', function() {

            it('wrapper passes extra args to callback', function(done) {
                setTimeout(function verify(arg1, arg2) {
                    expect(arg1).toBe('a');
                    expect(arg2).toBe('b');
                    done();
                }, 20, 'a', 'b');
            });

            it('throws on string instead of function', function() {
                try {
                    setTimeout('alert(0)', 20);
                } catch (e) {
                    expect(e.message).toContain('eval');
                }
            });

        });

        describe('setInterval', function() {

            it('throws on string instead of function', function() {
                try {
                    setTimeout('alert(0)', 20);
                } catch (e) {
                    expect(e.message).toContain('eval');
                }
            });

            it('wrapper returns token to clear interval', function(done) {
                var called = false,
                    token = setInterval(function() {
                        called = true;
                    }, 50);
                expect(token).toBeDefined();
                expect(called).toBe(false);
                clearInterval(token);
                setTimeout(function verify() {
                    expect(called).toBe(false);
                    done();
                }, 100);
            });

            it('wrappper passes extra args to callback', function(done) {
                var count = 0,
                    interval = setInterval(function verify(arg1, arg2) {
                        expect(arg1).toBe('a');
                        expect(arg2).toBe('b');
                        if (++count >= 5) {
                            clearInterval(interval);
                            done();
                        }
                    }, 100, 'a', 'b');
            });

        });

    });

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

        it('in sequence and parallel', function(done) {
            var count = 0,
                numTests = 6,
                increment = function inc() {
                    return function() {
                        if (++count === numTests) {
                            done();
                        }
                    };
                },
                error = function err(test) {
                    return function(msg) {
                        console.error('error occurred', test, msg);
                    };
                };
            run(gen.timeout(10,
                gen.parallel(
                    gen.parallel(
                        gen.verify(
                            gen.ok(increment(1)),
                            gen.fail(error(1)),
                            gen.matches.context('global', 'Timeout')),
                        gen.interval(10, 5,
                            gen.animate(
                                gen.verify(
                                    gen.ok(increment(2)),
                                    gen.fail(error(2)),
                                    gen.matches.context('global', 'Timeout', 'Interval', 'Animation'))
                            )),
                        gen.timeout(20,
                            gen.animate(
                                gen.verify(
                                    gen.ok(increment(3)),
                                    gen.fail(error(3)),
                                    gen.matches.context('global', 'Timeout', 'Timeout', 'Animation'))
                            )),
                        gen.domEvent('click',
                            gen.animate(
                                gen.verify(
                                    gen.ok(increment(4)),
                                    gen.fail(error(4)),
                                    gen.matches.context('global', 'Timeout', 'click', 'Animation'))
                            ))
                    ),
                    gen.interval(10, 5,
                        gen.animate(
                            gen.verify(
                                gen.ok(increment(5)),
                                gen.fail(error(5)),
                                gen.matches.context('global', 'Timeout', 'Interval', 'Animation'))
                        )),
                    gen.domEvent('click',
                        gen.animate(
                            gen.verify(
                                gen.ok(increment(6)),
                                gen.fail(error(6)),
                                gen.matches.context('global', 'Timeout', 'click', 'Animation'))
                        ))
                )));
        });

        describe('error handling', function() {

            it('does not propagate if e.handled', function(done) {
                var root = index.manager.getCurrentContext(),
                    unsub1 = root.onError(function handler() {
                        throw new Error('should not be reached');
                    }),
                    child = root.createChild('child'),
                    unsub2 = child.onError(function handler(e) {
                        e.handled = true;
                        origST(function() {
                            unsub1();
                            unsub2();
                            done();
                        });
                    });
                child.run(function() {
                    throw new Error('error message');
                });
            });

            it('propagates to parent contexts until handled', function(done) {
                var root = index.manager.getCurrentContext(),
                    unsub = root.onError(function handler(e) {
                        e.handled = true;
                        expect(e.context.name).toBe('child');
                        expect(e.message).toBe('error message');
                        unsub();
                        done();
                    });
                root.fork('child', function() {
                    throw new Error('error message');
                });
            });

            it('parameter contains error and context data', function(done) {
                var root = index.manager.getCurrentContext(),
                    unsub = root.onError(function handler(e) {
                        e.handled = true;
                        expect(e.context.name).toBe('global');
                        expect(e.message).toBe('error message');
                        unsub();
                        done();
                    });
                try {
                    throw new Error('error message');
                } catch (e) {
                    root.handleError(e);
                }
            });

            it('unhandled errors throw', function(done) {
                var root = index.manager.getCurrentContext();
                try {
                    root.handleError(new Error('error message'));
                } catch (e) {
                    done();
                }
            });

        });

    });

});
