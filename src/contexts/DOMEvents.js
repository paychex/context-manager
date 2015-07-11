/* global define: false */
/* jshint browser: true */

define(['lodash'], function(_) {

    'use strict';

    function initialize(ContextManager) {

        function wrappedAddListener(obj) {
            var ael = obj.addEventListener;
            obj.addEventListener = function _ignore_AddEventListener(type, handler, capture) {
                var parent = ContextManager.getCurrentContext();
                return ael.call(this, type, function addEventListener(e) {
                    ContextManager.runInChildContext(parent, initialize.prettify(e.target, type), handler.bind(null, e));
                }, capture);
            };
        }

        wrappedAddListener(window);
        wrappedAddListener(window.Element.prototype);
        wrappedAddListener(window.Document.prototype);

    }

    initialize.prettify = function prettify(node, eventType) {
        return node.localName +
            (!!node.id ? '#' + node.id : '') +
            (!!node.classList.length ?
                '.' + [].slice.call(node.classList).join('.') : '') +
            ':' + eventType;
    };

    return initialize;

});
