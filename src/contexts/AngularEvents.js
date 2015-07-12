/* global define: false */

define(['lodash', 'angular', './DOMEvents'], function(_, angular, DOMEvents) {

    'use strict';

    var eventsToHandle = ['Click'];

    return _.once(function initialize(ContextManager, $provide) {

        var $parse = angular.injector(['ng']).get('$parse');

        eventsToHandle.forEach(function wrapEventDirective(eventName) {
            var ngEventName = 'ng' + eventName;
            $provide.decorator(ngEventName + 'Directive', function($delegate) {
                var orig = $delegate[0];
                orig.compile = function compile($element, attr) {
                    var fn = $parse(attr[ngEventName], /* interceptorFn */ null, /* expensiveChecks */ true);
                    return function ngEventHandler(scope, element) {
                        var parent = ContextManager.getCurrentContext();
                        element.on(eventName.toLowerCase(), function _ignore_EventHandler(event) {
                            var fnBound = fn.bind(null, scope, {$event:event}),
                                contextName = DOMEvents.prettify(event.target, ngEventName);
                            scope.$apply(function invokeHandler() {
                                // TODO: remove child context (and children) on $destroy
                                ContextManager.runInChildContext(parent, contextName, fnBound);
                            });
                        });
                    };
                };
                return $delegate;
            });
        });

    });

});
