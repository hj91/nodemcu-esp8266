var StateMachine    = require('../src/stampit-state-machine.js'),
    assert          = require('assert');

describe('Stampit State Machine Tests.', function () {

    it('Should initiate with init as first state.', function () {
   
        var sm = StateMachine();

        assert.equal(sm.getState(), 'init');
        assert.ok(sm.inState('init'));

    
    });

    it('Should set a custom initial state.', function () {
    
        var sm = StateMachine({ initialState : 'someState' });

        assert.equal(sm.getState(), 'someState');
        assert.ok(sm.inState('someState'));
    
    });

    it('Should switch the state an emit an event.', function () {
   
        var sm = StateMachine(),
            counter = 0;

        sm.on('stateChanged', function (oldState, newState) {
        
            assert.equal(oldState, 'init');
            assert.equal(newState, 'someState');

            counter += 1;
        
        });

        sm.on('newState_someState', function () {

            counter += 1;

        });

        sm.setState('someState');

        assert.equal(counter, 2);

    
    });

});
