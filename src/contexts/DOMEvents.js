/* global define: false */
/* jshint browser: true */

define(['lodash'], function(_) {

    'use strict';

    var initialize = _.once(function init(ContextManager) {

        function wrapAddListener(obj) {
            var ael = obj.addEventListener;
            obj.addEventListener = function _ignore_AddEventListener(type, handler, capture) {
                var parent = ContextManager.getCurrentContext(),
                    eventHandler = function handleEvent(e) {
                        return ContextManager.runInChildContext(parent, initialize.prettify(e.target, type), handler.bind(null, e));
                    };
                parent.incRefCount();
                // TODO: switch to mutation observer?
                // what happens if node is re-parented -- would
                // we get false positives? we'd need to make sure
                // the node is actually being garbage collected
                ael('$destroy', function cleanUp() {
                    parent.decRefCount();
                    obj.removeEventListener(type, eventHandler);
                }, false);
                return ael.call(this, type, eventHandler, capture);
            };
        }

        wrapAddListener(window);
        wrapAddListener(window.Element.prototype);
        wrapAddListener(window.Document.prototype);

    });

    initialize.prettify = function prettify(node, eventType) {
        return node.localName +
            (!!node.id ? '#' + node.id : '') +
            (!!node.classList.length ?
                '.' + [].slice.call(node.classList).join('.') : '') +
            ':' + eventType;
    };

    return initialize;

});
