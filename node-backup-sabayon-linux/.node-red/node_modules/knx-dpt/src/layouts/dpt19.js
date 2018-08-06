module.exports = {
    id: 19,
    base: {
        desc: "8-byte Date+Time",
        beforeDeserialize: function () {
            return {};
        },
        beforeSerialize: function(d) {
            return {
                //suti: d.getTimezoneOffset() < Math.max(new Date(d.getFullYear(), 0, 1).getTimezoneOffset(), new Date(d.getFullYear(), 6, 1).getTimezoneOffset()),
                suti: 0,
                seconds: d.getSeconds(),
                minutes: d.getMinutes(),
                hours: d.getHours(),
                date: d.getDate(),
                dayOfWeek: d.getDay(),
                month: d.getMonth() + 1,
                year: d.getFullYear() - 1900
            };
        },
        props: [
            {type: "skip", size: 8},
            {type: "bool", index: "suti"}, // TODO: Use this value to set the timezone offset on the date
            {type: "skip", size: 5},
            {type: "skip", size: 1}, // TODO: Implement some mechanism to check if it is a working day (include holidays etc)
            {type: "skip", size: 1},
            {type: "uint", size: 6, index: "seconds", range: [0,59]},
            {type: "skip", size: 2},
            {type: "uint", size: 6, index: "minutes", range: [0,59]},
            {type: "skip", size: 2},
            {type: "uint", size: 5, index: "hours", range: [0,24]},
            {type: "uint", size: 3, index: "dayOfWeek", range: [0,7]},
            {type: "uint", size: 5, index: "date", range: [1,31]},
            {type: "skip", size: 3},
            {type: "uint", size: 4, index: "month", range: [1,12]},
            {type: "skip", size: 4},
            {type: "uint", size: 8, index: "year", range: [0,255]}
        ],
        afterDeserialize: function(d) {
            return new Date(d.year + 1900, d.month - 1, d.date, d.hours, d.minutes, d.seconds);
        }
    },
    subs: {
        "001": {
            "name": "DPT_DateTime", "desc": "datetime"
        },
    }
};