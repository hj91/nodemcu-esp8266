module.exports = {
    id: 6,
    base: {
        desc: "8-bit signed value",
        beforeDeserialize: 0,
        props: [
            {type: "int", size: 8, index: "", range: [-128, 127]}
        ]
    },
    subs: {
        // 6.001 percentage (-128%..127%)
        "001" : {
            "name" : "DPT_Percent_V8", "desc" : "percent",
            "unit" : "%",
        },

        // 6.010 counter pulses (-128..127)
        "010" : {
            "name" : "DPT_Value_1_Count", "desc" : "counter pulses",
            "unit" : "pulses"
        },

        // 6.020 status with mode
        "020": {
            use: "FB",
            name: "DPT_Status_Mode3",
            desc: "status with mode",
            beforeDeserialize: function() {return {};},
            props: [
                {type: "bool", index:"statusA"},
                {type: "bool", index:"statusB"},
                {type: "bool", index:"statusC"},
                {type: "bool", index:"statusD"},
                {type: "bool", index:"statusE"},
                {type: "bool", index:"mode0"},
                {type: "bool", index:"mode1"},
                {type: "bool", index:"mode2"}
            ]
        }
    }
};
