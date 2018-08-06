module.exports = function (buffer) {
    // A temporary variable to store one of the values in when the swap is performed
    var temp;

    // Start at both ends and work towards the middle
    for (var front = 0, back = buffer.length - 1; front < back; ++front, --back) {
        // Swap values
        temp = buffer[back];
        buffer[back] = buffer[front];
        buffer[front] = temp;
    }

    // Return the reversed buffer to enable chaining
    return buffer;
};