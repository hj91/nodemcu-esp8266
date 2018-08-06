module.exports = {
    id: 15,
    base: {
        desc: "4-byte access control data",
        beforeDeserialize: function () {
            return {};
        },
        props: [
            {type: "skip", size: 4},
            {type: "bool", index: "encryption"},
            {type: "bool", index: "readDirection"},
            {type: "bool", index: "permission"},
            {type: "bool", index: "error"},
            {type: "uint", size: 4, range: [0,10], index: "digit1"},
            {type: "uint", size: 4, range: [0,10], index: "digit2"},
            {type: "uint", size: 4, range: [0,10], index: "digit3"},
            {type: "uint", size: 4, range: [0,10], index: "digit4"},
            {type: "uint", size: 4, range: [0,10], index: "digit5"},
            {type: "uint", size: 4, range: [0,10], index: "digit6"}
        ]
    },
    subs: {
        "000": {
            "name": "DPT_Access_Data"
        }
    }
};
