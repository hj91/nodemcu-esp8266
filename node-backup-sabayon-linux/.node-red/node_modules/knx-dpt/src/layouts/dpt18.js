module.exports = {
    id: 18,
    base: {
        description: "8-bit Scene Activate/Learn + number",
        beforeDeserialize: function() {return {};},
        props: [
            {type: "uint", size: 6, index: "scene", range: [0, 63]},
            {type: "skip", size: 1},
            {type: "bool", index: "action"}
        ]
    },
    subs: {
        "001": {
            name: "DPT_SceneControl",
            desc: "scene control"
        }
    }
};
