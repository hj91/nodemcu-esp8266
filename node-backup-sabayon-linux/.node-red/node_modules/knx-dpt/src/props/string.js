const uint = require('./uint');

module.exports = {
    id: "string",
    size: function (prop) {
        return prop.size * 8;
    },
    write: function (prop, buffer, value, position) {
        var bitsWritten = 0;
        for (var i = 0; i < prop.size; i++) {
            var c = i < value.length ? value.charCodeAt(i) : 0;
            bitsWritten += uint.write({size: 8}, buffer, c, position + 8 * (prop.size - i - 1));
        }
        return bitsWritten;
    },
    read: function (prop, buffer, position) {
        var result = {value: [], bitsRead: 0};
        for (var i = 0; i < prop.size; i++) {
            var readOut = uint.read({size: 8}, buffer, position + 8 * (prop.size - i - 1));
            result.bitsRead += readOut.bitsRead;
            result.value.push(String.fromCharCode(readOut.value));
        }
        if (prop.size > 1) {
            while (result.value[result.value.length - 1] === "\x00") {
                result.value.pop();
            }
        }
        result.value = result.value.join("");
        return result;
    }
};