define(['index'], function(CM) {

    'use strict';

    CM.initDOMEvents(['click']);

    describe('DOMEvents', function() {

        it('removes any added event listeners', function() {
            var div = document.createElement('div'),
                event = document.createEvent('MouseEvent'),
                callback = jasmine.createSpy('click');
            event.initMouseEvent('click',
                false, false,
                window, 0, 0, 0, 0, 0,
                false, false, false, false,
                0, div);
            div.addEventListener('click', callback, false);
            expect(callback.calls.count()).toBe(0);
            div.dispatchEvent(event);
            expect(callback.calls.count()).toBe(1);
            callback.calls.reset();
            expect(callback.calls.count()).toBe(0);
            div.removeEventListener('click', callback, false);
            div.dispatchEvent(event);
            expect(callback.calls.count()).toBe(0);
        });

    });

});