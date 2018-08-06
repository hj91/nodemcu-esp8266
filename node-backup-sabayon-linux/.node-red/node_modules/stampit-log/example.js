var stampit = require('stampit'),
    log     = require('./stampit-log.js');

var stamp = stampit()
    .refs({
        'logLabel' : 'TEST',
        'logEnabled' : true,
        'logTimestamp' : true
    })
    .compose(log)
    .init(function () {
    
        this.log.error('Logging an error', 123);
        this.log.warn('This is a warning.');
        this.log.info('Logging information', { 'key' : 'someValue' });
        this.log.debug('This is a debug message.');
        this.log.trace('This is a trace.');
    
    });

stamp({ logLevel : 'error' });
stamp({ logLevel : 'warn' });
stamp({ logLevel : 'info' });
stamp({ logLevel : 'debug' });
stamp({ logLevel : 'trace' });
