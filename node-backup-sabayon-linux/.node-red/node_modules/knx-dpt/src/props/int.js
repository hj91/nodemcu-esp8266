const uint = require('./uint');

module.exports = {
    id: "int",
    size: function(prop) {
        return prop.size;
    },
    write: function(prop, buffer, value, position) {
        return uint.write({size: prop.size}, buffer, value, position);
    },
    read: function(prop, buffer, position) {
        var result = uint.read({size: prop.size}, buffer, position);
        if (prop.size < 32 && result.value >= (1 << (prop.size - 1))) result.value -= 1 << prop.size;
        return result;
    }
};