/* global define: false */
/* jshint browser: true */

define(['lodash'], function(_) {

    'use strict';

    var initialize = _.once(function init(ContextManager) {

        function wrapAddListener(obj) {
            var ael = obj.addEventListener;
            obj.addEventListener = function _ignore_AddEventListener(type, handler, capture) {
                var parent = ContextManager.getCurrentContext();
                return ael.call(this, type, function addEventListener(e) {
                    // TODO: remove child context (and children) when element destroyed (MutationObserver?)
                    return ContextManager.runInChildContext(parent, initialize.prettify(e.target, type), handler.bind(null, e));
                }, capture);
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
