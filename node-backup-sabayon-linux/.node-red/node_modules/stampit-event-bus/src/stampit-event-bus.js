var stampit = require('stampit');


module.exports = stampit().enclose(function () {

    var cbList = { };

    this.emit = function (name) {
    
        if (!cbList[name])
            return;

        var args = [];

        if (arguments.length > 1) {
            args = Array.prototype.slice.call(arguments, 1, arguments.length);
        }

        for (var i in cbList[name]) {
            cbList[name][i].listener.apply(this, args);

            // remove if once === true
            if (cbList[name][i] && cbList[name][i].once) {
                cbList[name].splice(i, 1);
            }

        }
    
        return this;
    
    };

    var addListener = function (name, listener, once) {
 
        if (!cbList.hasOwnProperty(name))
            cbList[name] = [];
        

        cbList[name].push({
            listener: listener, 
            once : once        
        });   

        return this;
    
    }.bind(this);

    this.on = function (name, listener) {

        return addListener(name, listener, false);

    };

    this.once = function (name, listener) {
    
        return addListener(name, listener, true);
    
    };

    this.removeListener = function (listener) {

        for (var i in cbList) {
        
            for (var j in cbList[i]) { 
            
                if (cbList[i][j].listener === listener) {
                
                    cbList[i].splice(j, 1);

                }
            
            }

            if (cbList[i].length === 0) {
                delete cbList[i];
            }

        }

        return this;

    };

});
