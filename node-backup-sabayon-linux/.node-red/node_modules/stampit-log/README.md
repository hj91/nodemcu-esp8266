# Stampit Log

A simple logging mechanism for stampit objects.

## Installation

    npm install stampit-log

## Usage

    var stampit = require('stampit'),
        log = require('stampit-log');

    var example = stampit()
        .refs({
            'logLabel' : 'Example',
            'logLevel' : 'info',
            'logEnabled' : true    
        })
        .compose(log)
        .init(function () {
        

            this.log.error('This is a error log.', { 'key' : 'value' });             
            this.log.warn('This is a warning.');
            this.log.info('This is a information.', 1, 'abc');
            this.log.debug('This is a debug message.');
            this.log.trace('This is a trace with a stack trace attached.');
           
        });

## Log Level

Log level are ordered like this

error, warn, info, debug, trace

For example set the log level to debug and error, warn, info and debug messages are shown. Set the log level to error than only the error messages are shown.

## Licence

Copyright (C) 2016 Stefan Poeter (Stefan.Poeter[at]cloud-automation.de)

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
