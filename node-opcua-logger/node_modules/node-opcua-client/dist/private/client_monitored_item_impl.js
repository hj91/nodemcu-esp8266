"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const _ = require("underscore");
const node_opcua_assert_1 = require("node-opcua-assert");
const node_opcua_service_read_1 = require("node-opcua-service-read");
const client_monitored_item_1 = require("../client_monitored_item");
const client_monitored_item_toolbox_1 = require("../client_monitored_item_toolbox");
const client_monitored_item_base_impl_1 = require("./client_monitored_item_base_impl");
/**
 * ClientMonitoredItem
 * @class ClientMonitoredItem
 * @extends ClientMonitoredItemBase
 *
 * event:
 *    "initialized"
 *    "err"
 *    "changed"
 *
 *  note: this.monitoringMode = subscription_service.MonitoringMode.Reporting;
 */
class ClientMonitoredItemImpl extends client_monitored_item_base_impl_1.ClientMonitoredItemBaseImpl {
    constructor(subscription, itemToMonitor, monitoringParameters, timestampsToReturn) {
        node_opcua_assert_1.assert(subscription.session, "expecting session");
        super(subscription, itemToMonitor, monitoringParameters);
        timestampsToReturn = timestampsToReturn || node_opcua_service_read_1.TimestampsToReturn.Neither;
        node_opcua_assert_1.assert(subscription.constructor.name === "ClientSubscriptionImpl");
        this.timestampsToReturn = timestampsToReturn;
    }
    toString() {
        let ret = "";
        ret += "itemToMonitor:        " + this.itemToMonitor.toString() + "\n";
        ret += "monitoringParameters: " + this.monitoringParameters.toString() + "\n";
        ret += "timestampsToReturn:   " + this.timestampsToReturn.toString() + "\n";
        ret += "itemToMonitor         " + this.itemToMonitor.nodeId + "\n";
        return ret;
    }
    terminate(...args) {
        const done = args[0];
        node_opcua_assert_1.assert(_.isFunction(done));
        /**
         * Notify the observer that this monitored item has been terminated.
         * @event terminated
         */
        this.emit("terminated");
        const subscription = this.subscription;
        subscription._delete_monitored_items([this], (err) => {
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
        client_monitored_item_toolbox_1.ClientMonitoredItemToolbox._toolbox_modify(this.subscription, [this], parameters, this.timestampsToReturn, (err, results) => {
            if (err) {
                return callback(err);
            }
            if (!results) {
                return callback(new Error("internal error"));
            }
            node_opcua_assert_1.assert(results.length === 1);
            callback(null, results[0]);
        });
    }
    setMonitoringMode(...args) {
        const monitoringMode = args[0];
        const callback = args[1];
        client_monitored_item_toolbox_1.ClientMonitoredItemToolbox._toolbox_setMonitoringMode(this.subscription, [this], monitoringMode, (err, statusCodes) => {
            callback(err ? err : null, statusCodes[0]);
        });
    }
    /**
     * Creates the monitor item (monitoring mode = Reporting)
     * @private
     * @internal
     */
    _monitor(done) {
        node_opcua_assert_1.assert(done === undefined || _.isFunction(done));
        client_monitored_item_toolbox_1.ClientMonitoredItemToolbox._toolbox_monitor(this.subscription, this.timestampsToReturn, [this], (err) => {
            if (err) {
                this.emit("err", err.message);
                this.emit("terminated");
            }
            if (done) {
                done(err);
            }
        });
    }
}
exports.ClientMonitoredItemImpl = ClientMonitoredItemImpl;
// tslint:disable:no-var-requires
// tslint:disable:max-line-length
const thenify = require("thenify");
const opts = { multiArgs: false };
ClientMonitoredItemImpl.prototype.terminate = thenify.withCallback(ClientMonitoredItemImpl.prototype.terminate);
ClientMonitoredItemImpl.prototype.setMonitoringMode = thenify.withCallback(ClientMonitoredItemImpl.prototype.setMonitoringMode);
ClientMonitoredItemImpl.prototype.modify = thenify.withCallback(ClientMonitoredItemImpl.prototype.modify);
client_monitored_item_1.ClientMonitoredItem.create = (subscription, itemToMonitor, monitoringParameters, timestampsToReturn) => {
    const monitoredItem = new ClientMonitoredItemImpl(subscription, itemToMonitor, monitoringParameters, timestampsToReturn);
    setImmediate(() => {
        subscription._wait_for_subscription_to_be_ready((err) => {
            if (err) {
                return;
            }
            monitoredItem._monitor((err1) => {
            });
        });
    });
    return monitoredItem;
};
//# sourceMappingURL=client_monitored_item_impl.js.map