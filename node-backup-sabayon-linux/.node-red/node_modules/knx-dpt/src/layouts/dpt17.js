module.exports = {
    id: 17,
    base: {
        desc: "scene number",
        beforeDeserialize: 0,
        props: [
            {type: "uint", size: 6, index: "", range: [0, 63]}
        ]
    },
    subs: {
        // 17.001 Scene number
        "001": {
            use: "G",
            name: "DPT_SceneNumber",
            desc: "Scene Number",
        },
    }
};
