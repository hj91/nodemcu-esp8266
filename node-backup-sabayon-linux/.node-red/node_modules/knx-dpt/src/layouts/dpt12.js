module.exports = {
    id: 12,
    desc: "4-byte unsigned value",
    base: {
        beforeDeserialize: 0,
        props: [
            {type: "uint", size: 32, index: ""}
        ]
    },
    subs: {
        // 12.001 counter pulses
        "001": {
            name: "DPT_Value_4_Ucount",
            desc: "counter pulses"
        }
    }
};
