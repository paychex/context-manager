/* global define: false */

define(['angular', './DOMEvents'], function(angular, DOMEvents) {

    'use strict';

    var eventsToHandle = ['Click'];

    return function initialize(ContextManager, $provide) {

        var $parse = angular.injector(['ng']).get('$parse');

        eventsToHandle.forEach(function wrapEventDirective(eventName) {
            $provide.decorator('ng' + eventName + 'Directive', function($delegate) {
                var orig = $delegate[0];
                orig.compile = function compile($element, attr) {
                    var fn = $parse(attr['ng' + eventName], /* interceptorFn */ null, /* expensiveChecks */ true);
                    return function ngEventHandler(scope, element) {
                        var parent = ContextManager.getCurrentContext();
                        element.on(eventName.toLowerCase(), function _ignore_EventHandler(event) {
                            var fnBound = fn.bind(null, scope, {$event:event}),
                                contextName = DOMEvents.prettify(event.target, 'ng' + eventName);
                            scope.$apply(function eventHandler() {
                                ContextManager.runInChildContext(parent, contextName, fnBound);
                            });
                        });
                    };
                };
                return $delegate;
            });
        });

    };

});
