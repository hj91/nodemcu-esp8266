"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * @module node-opcua-client
 */
const chalk_1 = require("chalk");
const _ = require("underscore");
const node_opcua_assert_1 = require("node-opcua-assert");
const node_opcua_debug_1 = require("node-opcua-debug");
const node_opcua_service_subscription_1 = require("node-opcua-service-subscription");
const node_opcua_status_code_1 = require("node-opcua-status-code");
const debugLog = node_opcua_debug_1.make_debugLog(__filename);
const doDebug = node_opcua_debug_1.checkDebugFlag(__filename);
/**
 * @internal
 */
class ClientMonitoredItemToolbox {
    static _toolbox_monitor(subscription, timestampsToReturn, monitoredItems, done) {
        node_opcua_assert_1.assert(_.isFunction(done));
        const itemsToCreate = [];
        for (const monitoredItem of monitoredItems) {
            const monitoredItemI = monitoredItem;
            const itemToCreate = monitoredItemI._prepare_for_monitoring();
            if (_.isString(itemToCreate.error)) {
                return done(new Error(itemToCreate.error));
            }
            itemsToCreate.push(itemToCreate);
        }
        const createMonitorItemsRequest = new node_opcua_service_subscription_1.CreateMonitoredItemsRequest({
            itemsToCreate,
            subscriptionId: subscription.subscriptionId,
            timestampsToReturn,
        });
        const session = subscription.session;
        node_opcua_assert_1.assert(session, "expecting a valid session attached to the subscription ");
        session.createMonitoredItems(createMonitorItemsRequest, (err, response) => {
            /* istanbul ignore next */
            if (err) {
                debugLog(chalk_1.default.red("ClientMonitoredItemBase#_toolbox_monitor:  ERROR in createMonitoredItems "));
            }
            else {
                if (!response) {
                    return done(new Error("Internal Error"));
                }
                response.results = response.results || [];
                for (let i = 0; i < response.results.length; i++) {
                    const monitoredItemResult = response.results[i];
                    const monitoredItem = monitoredItems[i];
                    monitoredItem._after_create(monitoredItemResult);
                }
            }
            done(err ? err : undefined);
        });
    }
    static _toolbox_modify(subscription, monitoredItems, parameters, timestampsToReturn, callback) {
        node_opcua_assert_1.assert(callback === undefined || _.isFunction(callback));
        const itemsToModify = monitoredItems.map((monitoredItem) => {
            const clientHandle = monitoredItem.monitoringParameters.clientHandle;
            return new node_opcua_service_subscription_1.MonitoredItemModifyRequest({
                monitoredItemId: monitoredItem.monitoredItemId,
                requestedParameters: _.extend(_.clone(parameters), { clientHandle })
            });
        });
        const modifyMonitoredItemsRequest = new node_opcua_service_subscription_1.ModifyMonitoredItemsRequest({
            itemsToModify,
            subscriptionId: subscription.subscriptionId,
            timestampsToReturn,
        });
        const session = subscription.session;
        node_opcua_assert_1.assert(session, "expecting a valid session attached to the subscription ");
        session.modifyMonitoredItems(modifyMonitoredItemsRequest, (err, response) => {
            /* istanbul ignore next */
            if (err) {
                return callback(err);
            }
            if (!response || !(response instanceof node_opcua_service_subscription_1.ModifyMonitoredItemsResponse)) {
                return callback(new Error("internal error"));
            }
            response.results = response.results || [];
            node_opcua_assert_1.assert(response.results.length === monitoredItems.length);
            const res = response.results[0];
            /* istanbul ignore next */
            if (response.results.length === 1 && res.statusCode !== node_opcua_status_code_1.StatusCodes.Good) {
                return callback(new Error("Error" + res.statusCode.toString()));
            }
            callback(null, response.results);
        });
    }
    static _toolbox_setMonitoringMode(subscription, monitoredItems, monitoringMode, callback) {
        const monitoredItemIds = monitoredItems.map((monitoredItem) => monitoredItem.monitoredItemId);
        const setMonitoringModeRequest = {
            monitoredItemIds,
            monitoringMode,
            subscriptionId: subscription.subscriptionId,
        };
        const session = subscription.session;
        node_opcua_assert_1.assert(session, "expecting a valid session attached to the subscription ");
        session.setMonitoringMode(setMonitoringModeRequest, (err, response) => {
            if (err) {
                return callback(err);
            }
            monitoredItems.forEach((monitoredItem) => {
                monitoredItem.monitoringMode = monitoringMode;
            });
            response = response;
            response.results = response.results || [];
            callback(null, response.results);
        });
    }
}
exports.ClientMonitoredItemToolbox = ClientMonitoredItemToolbox;
//# sourceMappingURL=client_monitored_item_toolbox.js.map