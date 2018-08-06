module.exports = {
    id: 16,
    base: {
        desc: "14-character string",
        beforeDeserialize: "",
        props: [
            {type: "string", size: 14, index: ""}
        ]
    },
    subs: {
        // 16.000 ASCII string
        "000": {
            use: "G",
            name: "DPT_String_ASCII",
            desc: "ASCII string",
            force_encoding: "US-ASCII"
        },

        // 16.001 ISO-8859-1 string
        "001": {
            use: "G",
            name: "DPT_String_8859_1",
            desc: "ISO-8859-1 string",
            force_encoding: "ISO-8859-1"
        },
    }
};
