module.exports = {
    id: 10,
    base: {
        desc: "day of week + time of day",
        beforeDeserialize: function () {
            return {};
        },
        beforeSerialize: function (d) {
            var m = d.match(/(\d+):(\d+):(\d+)/);
            return {hours: m[1], minutes: m[2], seconds: m[3], day: 0};
        },
        props: [
            {type: "uint", size: 6, index: "seconds"},
            {type: "skip", size: 2},
            {type: "uint", size: 6, index: "minutes"},
            {type: "skip", size: 2},
            {type: "uint", size: 5, index: "hours"},
            {type: "uint", size: 3, index: "day"} // TODO: This value is currently ignored
        ],
        afterDeserialize: function (d) {
            return `${d.hours}:${d.minutes}:${d.seconds}`;
        }
    },
    subs: {
        // 10.001 time of day
        "001": {
            "name": "DPT_TimeOfDay", "desc": "time of day"
        }
    }
};