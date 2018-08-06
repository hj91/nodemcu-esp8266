module.exports = {
    id: 11,
    base: {
        desc : "3-byte date value",
        beforeDeserialize: {},
        beforeSerialize: function(d) {return {year: d.getFullYear() < 2000 ? d.getFullYear() - 1900 : d.getFullYear() - 2000, month: d.getMonth() + 1, day: d.getDate()};},
        props: [
            {type: "uint", size: 7, index: "year"},
            {type: "skip", size: 1},
            {type: "uint", size: 4, index: "month"},
            {type: "skip", size: 4},
            {type: "uint", size: 5, index: "day"},
            {type: "skip", size: 3}
        ],
        afterDeserialize: function(d) {return new Date(d.year >= 90 ? d.year + 1900 : d.year + 2000, d.month - 1, d.day, 0,0,0);}
    },
    subs: {
        //11.001 date
        "001": {
            name: "DPT_Date", desc: "Date"
        }
    }
};