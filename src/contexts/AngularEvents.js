/* global define: false */

define(['lodash', 'angular', './DOMEvents'], function(_, angular, DOMEvents) {

    'use strict';

    var eventsToHandle = ['Click'];

    return _.once(function initialize(ContextManager, $provide) {

        var $parse = angular.injector(['ng']).get('$parse');

        eventsToHandle.forEach(function wrapEventDirective(eventName) {
            var ngEventName = 'ng' + eventName;
            $provide.decorator(ngEventName + 'Directive', ['$delegate', function($delegate) {
                var orig = $delegate[0];
                orig.compile = function compile($element, attr) {
                    var fn = $parse(attr[ngEventName], /* interceptorFn */ null, /* expensiveChecks */ true);
                    return function ngEventHandler(scope, element) {
                        var parent = ContextManager.getCurrentContext(),
                            handler = function _ignore_EventHandler(event) {
                                var fnBound = fn.bind(null, scope, {$event:event}),
                                    contextName = DOMEvents.prettify(event.target, ngEventName);
                                scope.$apply(function invokeHandler() {
                                    return parent.fork(contextName + ': ' + attr[ngEventName], fnBound);
                                });
                            };
                        parent.incRefCount();
                        element.on(eventName.toLowerCase(), handler);
                        element.on('$destroy', function cleanUp() {
                            element.off(eventName.toLowerCase(), handler);
                            element.off('$destroy', cleanUp);
                            parent.delete();
                        });
                    };
                };
                return $delegate;
            }]);
        });

    });

});
