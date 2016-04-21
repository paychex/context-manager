/* global define: false */
/* jshint browser: true */

define(['lodash'], function(_) {

    'use strict';

    var initialize = _.once(function init(ContextManager, eventTokensToWrap) {

        function getFunctionName(fn) {
            var name = fn.name;
            if (!name) {
                var match = fn.toString().match(/^function\s*([^\s(]+)/);
                if (match) {
                    name = match[1];
                }
            }
            return name || 'anonymous';
        }

        function wrapAddListener(obj) {

            var ael = obj.addEventListener,
                rel = obj.removeEventListener,
                tokensToWrap = eventTokensToWrap || [];

            obj.addEventListener = function _ignore_AddEventListener(type, handler, capture) {
                // we only want to wrap mouse and keyboard events
                if (tokensToWrap.every(function eventShouldNotBeWrapped(token) {
                    return type.indexOf(token) === -1;
                })) {
                    // defer to the original handler
                    return ael.call(this, type, handler, capture);
                }
                var parent = ContextManager.getCurrentContext(),
                    eventHandler = function handleEvent(e) {
                        var method = handler.bind(null, e),
                            childName = initialize.prettify(e.target, type);
                        return parent.fork(childName + ': ' + getFunctionName(handler), method);
                    };
                parent.incRefCount();
                // TODO: switch to mutation observer?
                // what happens if node is re-parented -- would
                // we get false positives? we'd need to make sure
                // the node is actually being garbage collected
                ael.call(this, '$destroy', function cleanUp() {
                    parent.delete();
                    obj.removeEventListener(type, eventHandler);
                }, false);
                handler._wrapped = eventHandler;
                return ael.call(this, type, eventHandler, capture);
            };

            obj.removeEventListener = function _ignore_RemoveEventListener(type, handler, capture) {
                if (handler._wrapped) {
                    rel.call(this, type, handler._wrapped, capture);
                } else {
                    rel.call(this, type, handler, capture);
                }
            };

        }

        wrapAddListener(window);
        wrapAddListener(window.Element.prototype);
        wrapAddListener(window.Document.prototype);

    });

    initialize.prettify = function prettify(node, eventType) {
        return node.localName +
            (!!node.id ? '#' + node.id : '') +
            (!!node.classList && node.classList.length ?
                '.' + [].slice.call(node.classList).join('.') : '') +
            ':' + eventType;
    };

    return initialize;

});
