# Stampit Event Bus

## Install

`npm install --save stampit-event-bus`

## Usage

    var EventBus = require('stampit-event-bus');

    var stamp = stampit().compose(EventBus).init(function () {
        
    });

## API

### Register for an event

`on(event, listener)`

Listen for a specific event. Returns the current stamp so it is chainable.

`this.on('event', function (arg1, arg2) { })`

### Emit event

`emit(event, [arg1, arg2, ...])`

Emits a specific event with arguments. Returns stamp so it is chainable.

`this.emit('event', arg1, arg2)`

### Register for an event once

`once(event, listener)`

Listens for a specific event. Listener will only be executed once. Returns stamp so it is chainable.

`this.once('event', function () { // only called once })`

### Remove Listener

`removeListener(listener)`

Removes the listener from all events it is attached to. Chainable.

    var listener = function () { };

    this.on('event', listener);

    this.removeListener(listener);

## LICENSE

Copyright (C) 2014 Stefan Poeter (Stefan.Poeter[at]cloud-automation.de)

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
