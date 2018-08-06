var stampit = require('stampit');

module.exports = stampit()
    .refs({
    })
    .init(function () {

        this.log = { };

        var levels = [ 'error', 'warn', 'info', 'debug', 'trace'];

        var init = function () {
        
            if (!this.logEnabled) {
                this.log.error = function () { };
                this.log.warn = function () { };
                this.log.info = function () { };
                this.log.debug = function () { };
                this.log.trace = function () { };

                // deprecated
                this.logInfo = function () { };
                this.logError = function () { };

            } else {
            
                this.log.error = log('error');
                this.log.warn = log('warn');
                this.log.info = log('info');
                this.log.debug = log('debug');
                this.log.trace = log('trace');

                // deprecated
                this.logInfo = log('info');
                this.logError = log('error');

            }

            if (!this.logLevel) {
                this.logLevel = 'info';                
            } else {
                this.logLevel = this.logLevel.toLowerCase();
            }
        
        }.bind(this);

        var inLogLevel = function (level) {
        
            var logLevelIndex = levels.indexOf(this.logLevel),
                levelIndex = levels.indexOf(level);

            return logLevelIndex >= levelIndex;
        
        }.bind(this);

        var log = function (level) {
       
            return function () { 

                if (!inLogLevel(level)) {
                    return;
                }

                var args = Array.prototype.slice.call(arguments);

                if (this.logLabel) {
                    args.splice(0, 0, this.logLabel);
                }

                args.splice(0, 0, level.toUpperCase() + ' :');

                if (this.logTimestamp) {
                    args.splice(0, 0, new Date());
                }


                var stack;

                if (level === 'trace') {
                    stack = new Error().stack;
                    args.push(stack);
                }

                console.log.apply(null, args);

            }.bind(this);
      
        }.bind(this);

  
        init(); 
    
    });
