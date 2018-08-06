var eventbus = require('../src/stampit-event-bus.js'),
    assert  = require('assert');

describe('eventbus', function () {

    it('should listen on one simple event', function () {
    
        var eb = eventbus(),
            counter = 0;

        eb.on('event', function () {
        
            counter += 1;

        });

        eb.emit('event');
    
        assert.equal(counter, 1);

    });

    it('should listen on two simple events.', function () {
    
        var eb = eventbus(),
            counter = 0;

        eb.on('event1', function () {

            counter += 1;        

        });

        eb.on('event2', function () {
            counter += 1;
        });

        eb.emit('event1');
        eb.emit('event2');

        assert.equal(counter, 2);
    
    });

    it('should call an event with arguments', function (done) {
    
        var eb = eventbus();

        eb.on('event', function (arg1, arg2) {
        
            assert.equal(arg1, '1');
            assert.equal(arg2, 2);
        
            done();

        });

        eb.emit('event', '1', 2);
    
    });

    it('should call an event only once.', function () {
    
        var eb = eventbus(),
            counter = 0;

        eb.once('event', function () {
        
            counter += 1;
        
        });

        eb.emit('event');
        eb.emit('event');

        assert.equal(counter, 1);
    
    });

    it('should remove a listener.', function () {
    
        var eb = eventbus(),
            counter = 0,
            listener;

        listener = function () {
       
            counter += 1; 

        };

        eb.on('event', listener);
   
        eb.emit('event');

        eb.removeListener(listener);

        eb.emit('event');

        assert.equal(counter, 1);

    });

});
