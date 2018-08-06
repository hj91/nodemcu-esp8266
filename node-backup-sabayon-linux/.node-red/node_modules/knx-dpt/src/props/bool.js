module.exports = {
    id: "bool",
    size: function(prop) {
        return 1;
    },
    write: function(prop, buffer, value, position) {
        var bitToWrite = position % 8;
        var byteToWrite = Math.floor(position / 8);
        if (value) {
            buffer[byteToWrite] |= (1 << bitToWrite);
        } else {
            buffer[byteToWrite] &= ~(1 << bitToWrite);
        }
        return 1;
    },
    read: function(prop, buffer, position) {
        var bitToRead = position % 8;
        var byteToRead = Math.floor(position / 8);
        return {
            value: (buffer[byteToRead] >> bitToRead) & 1,
            bitsRead: 1
        };
    }
};