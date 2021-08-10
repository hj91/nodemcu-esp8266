"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * @module node-opcua-server
 */
const node_opcua_assert_1 = require("node-opcua-assert");
const node_opcua_debug_1 = require("node-opcua-debug");
const debugLog = node_opcua_debug_1.make_debugLog(__filename);
const doDebug = node_opcua_debug_1.checkDebugFlag(__filename);
const timers = {};
const NS_PER_SEC = 1E9;
function sampleMonitoredItem(monitoredItem) {
    const _monitoredItem = monitoredItem;
    setImmediate(() => {
        _monitoredItem._on_sampling_timer();
    });
}
function appendToTimer(monitoredItem) {
    const samplingInterval = monitoredItem.samplingInterval;
    const key = samplingInterval.toString();
    node_opcua_assert_1.assert(samplingInterval > 0);
    let _t = timers[key];
    if (!_t) {
        _t = {
            _samplingId: false,
            monitoredItems: {},
            monitoredItemsCount: 0
        };
        _t._samplingId = setInterval(() => {
            const start = doDebug ? process.hrtime() : undefined;
            let counter = 0;
            for (const m in _t.monitoredItems) {
                if (_t.monitoredItems.hasOwnProperty(m)) {
                    sampleMonitoredItem(_t.monitoredItems[m]);
                    counter++;
                }
            }
            if (doDebug) {
                const elapsed = process.hrtime(start);
                debugLog(`Sampler ${samplingInterval}  ms : Benchmark took ${((elapsed[0] * NS_PER_SEC + elapsed[1]) / 1000 / 1000.0).toFixed(3)} milliseconds for ${counter} elements`);
            }
        }, samplingInterval);
        timers[key] = _t;
    }
    node_opcua_assert_1.assert(!_t.monitoredItems[monitoredItem.monitoredItemId]);
    _t.monitoredItems[monitoredItem.monitoredItemId] = monitoredItem;
    _t.monitoredItemsCount++;
    return key;
}
exports.appendToTimer = appendToTimer;
function removeFromTimer(monitoredItem) {
    const samplingInterval = monitoredItem.samplingInterval;
    node_opcua_assert_1.assert(samplingInterval > 0);
    node_opcua_assert_1.assert(typeof monitoredItem._samplingId === "string");
    const key = monitoredItem._samplingId;
    const _t = timers[key];
    if (!_t) {
        debugLog("cannot find common timer for samplingInterval", key);
        return;
    }
    node_opcua_assert_1.assert(_t);
    node_opcua_assert_1.assert(_t.monitoredItems[monitoredItem.monitoredItemId]);
    delete _t.monitoredItems[monitoredItem.monitoredItemId];
    _t.monitoredItemsCount--;
    node_opcua_assert_1.assert(_t.monitoredItemsCount >= 0);
    if (_t.monitoredItemsCount === 0) {
        clearInterval(_t._samplingId);
        delete timers[key];
    }
}
exports.removeFromTimer = removeFromTimer;
//# sourceMappingURL=node_sampler.js.map