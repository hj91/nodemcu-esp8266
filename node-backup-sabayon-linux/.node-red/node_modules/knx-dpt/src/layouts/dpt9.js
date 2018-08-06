module.exports = {
    id: 9,
    base: {
        "desc": "16-bit floating point value",
        beforeDeserialize: 0,
        props: [
            {type: "float", size: 16, index: ""}
        ]
    },
    subs: {
        // 9.001 temperature (oC)
        "001": {
            "name": "DPT_Value_Temp", "desc": "temperature",
            "unit": "°C",
            "range": [-273, 670760]
        },

        // 9.002 temperature difference (oC)
        "002": {
            "name": "DPT_Value_Tempd", "desc": "temperature difference",
            "unit": "°C", "range": [-670760, 670760]
        },

        // 9.003 kelvin/hour (K/h)
        "003": {
            "name": "DPT_Value_Tempa", "desc": "kelvin/hour",
            "unit": "°K/h", "range": [-670760, 670760]
        },

        // 9.004 lux (Lux)
        "004": {
            "name": "DPT_Value_Lux", "desc": "lux",
            "unit": "lux", "range": [0, 670760]
        },

        // 9.005 speed (m/s)
        "005": {
            "name": "DPT_Value_Wsp", "desc": "wind speed",
            "unit": "m/s", "range": [0, 670760]
        },

        // 9.006 pressure (Pa)
        "006": {
            "name": "DPT_Value_Pres", "desc": "pressure",
            "unit": "Pa", "range": [0, 670760]
        },

        // 9.007 humidity (%)
        "007": {
            "name": "DPT_Value_Humidity", "desc": "humidity",
            "unit": "%", "range": [0, 670760]
        },

        // 9.008 parts/million (ppm)
        "008": {
            "name": "DPT_Value_AirQuality", "desc": "air quality",
            "unit": "ppm", "range": [0, 670760]
        },

        // 9.010 time (s)
        "010": {
            "name": "DPT_Value_Time1", "desc": "time(sec)",
            "unit": "s", "range": [-670760, 670760]
        },

        // 9.011 time (ms)
        "011": {
            "name": "DPT_Value_Time2", "desc": "time(msec)",
            "unit": "ms", "range": [-670760, 670760]
        },

        // 9.020 voltage (mV)
        "020": {
            "name": "DPT_Value_Volt", "desc": "voltage",
            "unit": "mV", "range": [-670760, 670760]
        },

        // 9.021 current (mA)
        "021": {
            "name": "DPT_Value_Curr", "desc": "current",
            "unit": "mA", "range": [-670760, 670760]
        },

        // 9.022 power density (W/m2)
        "022": {
            "name": "DPT_PowerDensity", "desc": "power density",
            "unit": "W/m²", "range": [-670760, 670760]
        },

        // 9.023 kelvin/percent (K/%)
        "023": {
            "name": "DPT_KelvinPerPercent", "desc": "Kelvin / %",
            "unit": "K/%", "range": [-670760, 670760]
        },

        // 9.024 power (kW)
        "024": {
            "name": "DPT_Power", "desc": "power (kW)",
            "unit": "kW", "range": [-670760, 670760]
        },

        // 9.025 volume flow (l/h)
        "025": {
            "name": "DPT_Value_Volume_Flow", "desc": "volume flow",
            "unit": "l/h", "range": [-670760, 670760]
        },

        // 9.026 rain amount (l/m2)
        "026": {
            "name": "DPT_Rain_Amount", "desc": "rain amount",
            "unit": "l/m²", "range": [-670760, 670760]
        },

        // 9.027 temperature (Fahrenheit)
        "027": {
            "name": "DPT_Value_Temp_F", "desc": "temperature (F)",
            "unit": "°F", "range": -[459.6, 670760]
        },

        // 9.028 wind speed (km/h)
        "028": {
            "name": "DPT_Value_Wsp_kmh", "desc": "wind speed (km/h)",
            "unit": "km/h", "range": [0, 670760]
        }
    }
};