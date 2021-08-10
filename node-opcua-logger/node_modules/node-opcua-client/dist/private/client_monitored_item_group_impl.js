"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * @module node-opcua-client-private
 */
// tslint:disable:no-empty
const events_1 = require("events");
const _ = require("underscore");
const node_opcua_assert_1 = require("node-opcua-assert");
const node_opcua_data_value_1 = require("node-opcua-data-value");
const node_opcua_debug_1 = require("node-opcua-debug");
const node_opcua_service_subscription_1 = require("node-opcua-service-subscription");
const node_opcua_nodeid_1 = require("node-opcua-nodeid");
const client_monitored_item_group_1 = require("../client_monitored_item_group");
const client_monitored_item_toolbox_1 = require("../client_monitored_item_toolbox");
const client_monitored_item_base_impl_1 = require("./client_monitored_item_base_impl");
const debugLog = node_opcua_debug_1.make_debugLog(__filename);
const doDebug = node_opcua_debug_1.checkDebugFlag(__filename);
const warningLog = debugLog;
/**
 * ClientMonitoredItemGroup
 * event:
 *    "initialized"
 *    "err"
 *    "changed"
 *
 *  note: this.monitoringMode = subscription_service.MonitoringMode.Reporting;
 */
class ClientMonitoredItemGroupImpl extends events_1.EventEmitter {
    constructor(subscription, itemsToMonitor, monitoringParameters, timestampsToReturn) {
        super();
        node_opcua_assert_1.assert(_.isArray(itemsToMonitor));
        // Try to resolve the nodeId and fail fast if we can't.
        itemsToMonitor.forEach((itemToMonitor) => {
            itemToMonitor.nodeId = node_opcua_nodeid_1.resolveNodeId(itemToMonitor.nodeId);
        });
        timestampsToReturn = timestampsToReturn || node_opcua_data_value_1.TimestampsToReturn.Neither;
        node_opcua_assert_1.assert(subscription.constructor.name === "ClientSubscriptionImpl");
        this.subscription = subscription;
        this.monitoredItems = itemsToMonitor.map((itemToMonitor) => {
            return new client_monitored_item_base_impl_1.ClientMonitoredItemBaseImpl(subscription, itemToMonitor, monitoringParameters);
        });
        this.timestampsToReturn = timestampsToReturn;
        this.monitoringMode = node_opcua_service_subscription_1.MonitoringMode.Reporting;
    }
    toString() {
        let ret = "ClientMonitoredItemGroup : \n";
        ret += "itemsToMonitor:       = [\n " +
            this.monitoredItems.map((monitoredItem) => monitoredItem.itemToMonitor.toString()).join("\n")
            + "\n];\n";
        ret += "timestampsToReturn:   " +
            this.timestampsToReturn.toString() + "\n";
        ret += "monitoringMode        " + node_opcua_service_subscription_1.MonitoringMode[this.monitoringMode];
        return ret;
    }
    terminate(...args) {
        const done = args[0];
        node_opcua_assert_1.assert(!done || _.isFunction(done));
        /**
         * Notify the observer that this monitored item has been terminated.
         * @event terminated
         */
        this.emit("terminated");
        const subscription = this.subscription;
        subscription._delete_monitored_items(this.monitoredItems, (err) => {
            if (done) {
                done(err);
            }
        });
    }
    modify(...args) {
        if (args.length === 2) {
            return this.modify(args[0], null, args[1]);
        }
        const parameters = args[0];
        const timestampsToReturn = args[1];
        const callback = args[2];
        this.timestampsToReturn = timestampsToReturn || this.timestampsToReturn;
        client_monitored_item_toolbox_1.ClientMonitoredItemToolbox._toolbox_modify(this.subscription, this.monitoredItems, parameters, this.timestampsToReturn, (err) => {
            callback(err ? err : undefined);
        });
    }
    setMonitoringMode(...args) {
        const monitoringMode = args[0];
        const callback = args[1];
        client_monitored_item_toolbox_1.ClientMonitoredItemToolbox._toolbox_setMonitoringMode(this.subscription, this.monitoredItems, monitoringMode, (err, statusCode) => {
            // todo fix me
            callback(err, statusCode[0]);
        });
    }
    /**
     * @internal
     * @method _monitor
     * Creates the monitor item (monitoring mode = Reporting)
     * @private
     */
    _monitor(done) {
        node_opcua_assert_1.assert(done === undefined || _.isFunction(done));
        this.monitoredItems.forEach((monitoredItem, index) => {
            monitoredItem.on("changed", (dataValue) => {
                /**
                 * Notify the observers that a group MonitoredItem value has changed on the server side.
                 * @event changed
                 * @param monitoredItem
                 * @param value
                 * @param index
                 */
                try {
                    this.emit("changed", monitoredItem, dataValue, index);
                }
                catch (err) {
                    warningLog(err);
                }
            });
        });
        client_monitored_item_toolbox_1.ClientMonitoredItemToolbox._toolbox_monitor(this.subscription, this.timestampsToReturn, this.monitoredItems, (err) => {
            if (err) {
                this.emit("terminated");
            }
            else {
                this.emit("initialized");
                // set the event handler
            }
            if (done) {
                done(err);
            }
        });
    }
}
exports.ClientMonitoredItemGroupImpl = ClientMonitoredItemGroupImpl;
// tslint:disable:no-var-requires
// tslint:disable:max-line-length
const thenify = require("thenify");
const opts = { multiArgs: false };
ClientMonitoredItemGroupImpl.prototype.terminate = thenify.withCallback(ClientMonitoredItemGroupImpl.prototype.terminate);
ClientMonitoredItemGroupImpl.prototype.setMonitoringMode = thenify.withCallback(ClientMonitoredItemGroupImpl.prototype.setMonitoringMode);
ClientMonitoredItemGroupImpl.prototype.modify = thenify.withCallback(ClientMonitoredItemGroupImpl.prototype.modify);
client_monitored_item_group_1.ClientMonitoredItemGroup.create = (subscription, itemsToMonitor, monitoringParameters, timestampsToReturn) => {
    const monitoredItemGroup = new ClientMonitoredItemGroupImpl(subscription, itemsToMonitor, monitoringParameters, timestampsToReturn);
    subscription._wait_for_subscription_to_be_ready((err) => {
        if (err) {
            return;
        }
        monitoredItemGroup._monitor((err1) => {
        });
    });
    return monitoredItemGroup;
};
//# sourceMappingURL=client_monitored_item_group_impl.js.map