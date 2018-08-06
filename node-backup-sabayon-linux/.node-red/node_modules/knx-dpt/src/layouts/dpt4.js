module.exports = {
    id: 4,
    base: {
        desc: "8-bit character",
        props: [
            {type: 'string', size: 1, index: '', range: [0, 255]}
        ]
    },
    subs: {
        // 4.001 character (ASCII)
        "001": {
            name: "DPT_Char_ASCII",
            desc: "ASCII character (0-127)",
            use: "G",
            props: [
                {range: [0, 127]}
            ]
        },
        // 4.002 character (ISO-8859-1)
        "002": {
            name: "DPT_Char_8859_1",
            desc: "ISO-8859-1 character (0..255)",
            use: "G",
        }
    }
};
exports.formatAPDU = function (value) {
    var apdu_data;
    if (!value) throw "cannot write null value for DPT4"
    else {
        if (typeof value == 'string') {
            apdu_data = value.charCodeAt(0);
        }
        else throw "Must supply a character";
        if (apdu_data > 255) throw "must supply an ASCII character";
    }
    return apdu_data;
}

exports.fromBuffer = function (buf) {
    if (buf.length != 1) throw "Buffer should be 1 byte long"
    return String.fromCharCode(buf[0]);
}
