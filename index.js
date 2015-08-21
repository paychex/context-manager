define([
    './src/contexts/ContextManager',
    './src/contexts/Timeouts',
    './src/contexts/DOMEvents',
    './src/contexts/AngularCore',
    './src/contexts/AngularEvents'
], function(
    ContextManager,
    initTimeouts,
    initDOMEvents,
    initAngularCore,
    initAngularEvents
) {

    'use strict';

    function wrap(fn) {
        return function doInit() {
            fn(ContextManager);
        };
    }

    return {
        manager: ContextManager,
        initTimeouts: wrap(initTimeouts),
        initDOMEvents: wrap(initDOMEvents),
        initAngularCore: wrap(initAngularCore),
        initAngularEvents: wrap(initAngularEvents)
    };

});