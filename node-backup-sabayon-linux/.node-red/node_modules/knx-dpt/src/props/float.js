const uint = require('./uint');

// kudos to http://croquetweak.blogspot.gr/2014/08/deconstructing-floats-frexp-and-ldexp.html
function ldexp(mantissa, exponent) {
    return exponent > 1023 // avoid multiplying by infinity
        ? mantissa * Math.pow(2, 1023) * Math.pow(2, exponent - 1023)
        : exponent < -1074 // avoid multiplying by zero
        ? mantissa * Math.pow(2, -1074) * Math.pow(2, exponent + 1074)
        : mantissa * Math.pow(2, exponent);
}

function frexp(value) {
    if (value === 0) return [value, 0];
    var data = new DataView(new ArrayBuffer(8));
    data.setFloat64(0, value);
    var bits = (data.getUint32(0) >>> 20) & 0x7FF;
    if (bits === 0) {
        data.setFloat64(0, value * Math.pow(2, 64));
        bits = ((data.getUint32(0) >>> 20) & 0x7FF) - 64;
    }
    var exponent = bits - 1022,
        mantissa = ldexp(value, -exponent);
    return [mantissa, exponent];
}

function to16Bin(value) {
    var arr = frexp(value);
    var mantissa = arr[0], exponent = arr[1];
    // find the minimum exponent that will upsize the normalized mantissa (0,5 to 1 range)
    // in order to fit in 11 bits ([-2048, 2047])
    var max_mantissa = 0;
    for (e = exponent; e >= -15; e--) {
        max_mantissa = ldexp(100*mantissa, e);
        if (max_mantissa > -2048 && max_mantissa < 2047) break;
    }
    var sign = (mantissa < 0) ?  1 :  0
    var mant = (mantissa < 0) ?  ~(max_mantissa^2047) : max_mantissa
    var exp = exponent - e;
    var apdu_data = new Buffer(2);
    // yucks
    apdu_data[0] = (sign << 7) + (exp << 3) + (mant >> 8);
    apdu_data[1] = mant % 256;
    return apdu_data;
}

function from16Bin(buf) {
    var sign     =  buf[0] >> 7;
    var exponent = (buf[0] & 0b01111000) >> 3;
    var mantissa = 256 * (buf[0] & 0b00000111) + buf[1];
    mantissa = (sign == 1) ? ~(mantissa^2047) : mantissa;
    return ldexp((0.01*mantissa), exponent);
}

module.exports = {
    id: "float",
    size: function (prop) {
        return prop.size;
    },
    write: function (prop, buffer, value, position) {
        if (prop.size === 32) {
            var buf = Buffer.alloc(4);
            buf.writeFloatLE(value, 0);
            uint.write({size: 8}, buffer, buf[0], position);
            uint.write({size: 8}, buffer, buf[1], position + 8);
            uint.write({size: 8}, buffer, buf[2], position + 16);
            uint.write({size: 8}, buffer, buf[3], position + 24);
            return 32;
        } else if (prop.size === 16) {
            // Get as binary
            var binary = to16Bin(value);
            uint.write({size: 8}, buffer, binary[1], position);
            uint.write({size: 8}, buffer, binary[0], position + 8);
            return 16;
        } else {
            return prop.size; // TODO: Implement
        }
    },
    read: function (prop, buffer, position) {
        if (prop.size === 32) {
            var buf = Buffer.alloc(4);
            buf[0] = uint.read({size: 8}, buffer, position).value;
            buf[1] = uint.read({size: 8}, buffer, position + 8).value;
            buf[2] = uint.read({size: 8}, buffer, position + 16).value;
            buf[3] = uint.read({size: 8}, buffer, position + 24).value;
            return {value: buf.readFloatLE(0), bitsRead: 32};
        } else if (prop.size === 16) {
            var buf = Buffer.alloc(2);
            buf[1] = uint.read({size: 8}, buffer, position).value;
            buf[0] = uint.read({size: 8}, buffer, position + 8).value;
            return {value: from16Bin(buf), bitsRead: 16};
        } else {
            return {value: 0, bitsRead: prop.size}; // TODO: Implement
        }
    }
};