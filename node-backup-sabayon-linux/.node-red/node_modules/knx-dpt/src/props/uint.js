module.exports = {
    id: "uint",
    size: function(prop) {
        return prop.size;
    },
    write: function(prop, buffer, value, position) {
        var bitsWritten = 0;
        var bitsLeftToWrite = prop.size;
        while (bitsLeftToWrite) {
            // Determine where to write, and how many bits to write
            var bitToWrite = position % 8;
            var byteToWrite = Math.floor(position / 8);
            var bitsToWrite = Math.min(bitsLeftToWrite, 8 - bitToWrite);
            // Write out the bits
            buffer[byteToWrite] |= (value & ((1 << bitsToWrite) - 1)) << bitToWrite;
            // Shift value for next loop
            value = value >> bitsToWrite;
            // Update counters
            position += bitsToWrite;
            bitsWritten += bitsToWrite;
            bitsLeftToWrite -= bitsToWrite;
        }
        return bitsWritten;
    },
    read: function(prop, buffer, position) {
        var bitsLeftToRead = prop.size;
        var result = {value: 0, bitsRead: 0};
        while (bitsLeftToRead) {
            // Determine where to read, and how many bits to read
            var bitToRead = position % 8;
            var byteToRead = Math.floor(position / 8);
            var bitsToRead = Math.min(bitsLeftToRead, 8 - bitToRead);
            // Read out the bits
            var r = ((buffer[byteToRead] >> bitToRead) & ((1 << bitsToRead) - 1));
            result.value += r << result.bitsRead;
            // Update counters
            result.bitsRead += bitsToRead;
            position += bitsToRead;
            bitsLeftToRead -= bitsToRead;
        }
        return result;
    }
};