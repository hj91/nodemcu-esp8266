module.exports = {
    id: 5,
    base: {
        description: "8-bit unsigned value",
        beforeDeserialize: 0,
        props: [
            {type: "uint", size: 8, index: "", range: [0, 255]},
        ]
    },
    subs: {
        "001": {
            name: "DPT_Scaling",
            desc: "percent",
            unit: "%",
            props: [
                {mapRangeTo: [[0x00, 0], [0x80, 50], [0xFF, 100]]}
            ]
        },

        // 5.003 angle (degrees 0=0, ff=360)
        "003": {
            name: "DPT_Angle",
            desc: "angle degrees",
            unit: "°",
            props: [
                {mapRangeTo: [[0x00, 0], [0x80, 180], [0xFF, 360]]}
            ]
        },

        // 5.004 percentage (0..255%)
        "004": {
            name: "DPT_Percent_U8",
            desc: "percent",
            unit: "%",
        },

        // 5.005 ratio (0..255)
        "005": {
            name: "DPT_DecimalFactor",
            desc: "ratio",
            unit: "ratio",
        },

        // 5.006 tariff (0..255)
        "006": {
            name: "DPT_Tariff",
            desc: "tariff",
            unit: "tariff",
            props: [
                {range: [0, 254]}
            ]
        },

        // 5.010 counter pulses (0..255)
        "010": {
            name: "DPT_Value_1_Ucount",
            desc: "counter pulses",
            unit: "pulses",
        },
    }
};