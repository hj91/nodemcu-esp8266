# Stampit State Machine

## Install

`npm install --save stampit-state-machine`

## Usage

    var stampit = require('stampit'),
        StateMachine = require('stampit-state-machine'); 

    var stamp = stampit().compose(StateMachine).init(function () {
        
    });

## API

### Set initial state

Specify the `initialState` attribute of the state.

    var stamp = StateMachine().refs({ initialState : 'someState' });

### Get the current State

`getState()`

Returns the current state.

### Check the current state

`inState(state)`

Returns true if the current state is state. False otherwise.

### Set a new state

`setState(newState)`

Set a new state. Listen for the event `stateChanged` or the `newState_{state}` event to be notified.

    this.on('stateChanged', function (oldState, nextState) { });
    this.on('newState_someState', function () { });

    this.setState('someState');

## LICENSE

Copyright (C) 2014 Stefan Poeter (Stefan.Poeter[at]cloud-automation.de)

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
