"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_opcua_nodeid_1 = require("node-opcua-nodeid");
const node_opcua_service_filter_1 = require("node-opcua-service-filter");
const node_opcua_service_read_1 = require("node-opcua-service-read");
const node_opcua_status_code_1 = require("node-opcua-status-code");
const node_opcua_variant_1 = require("node-opcua-variant");
const client_monitored_item_1 = require("../client_monitored_item");
const client_alarm_1 = require("./client_alarm");
const client_alarm_tools_extractConditionFields_1 = require("./client_alarm_tools_extractConditionFields");
const client_tools_1 = require("./client_tools");
/**
 *
 * @param session
 * @param eventStuff
 * @param comment
 */
function acknowledgeCondition(session, eventStuff, comment) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const conditionId = eventStuff.conditionId.value;
            const eventId = eventStuff.eventId.value;
            return yield session.acknowledgeCondition(conditionId, eventId, comment);
        }
        catch (err) {
            // tslint:disable-next-line: no-console
            console.log("Acknwoledding alarm has failed !", err);
            return node_opcua_status_code_1.StatusCodes.BadInternalError;
        }
    });
}
exports.acknowledgeCondition = acknowledgeCondition;
function confirmCondition(session, eventStuff, comment) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const conditionId = eventStuff.conditionId.value;
            const eventId = eventStuff.eventId.value;
            return yield session.confirmCondition(conditionId, eventId, comment);
        }
        catch (err) {
            // tslint:disable-next-line: no-console
            console.log("Acknwoledding alarm has failed !", err);
            return node_opcua_status_code_1.StatusCodes.BadInternalError;
        }
    });
}
exports.confirmCondition = confirmCondition;
/**
 * Enumerate all events
 * @param session
 */
function findActiveConditions(session) {
    return __awaiter(this, void 0, void 0, function* () {
        const request = {
            maxNotificationsPerPublish: 10000,
            priority: 6,
            publishingEnabled: true,
            requestedLifetimeCount: 1000,
            requestedMaxKeepAliveCount: 100,
            requestedPublishingInterval: 1000,
        };
        const subscription = yield session.createSubscription2(request);
        const itemToMonitor = {
            attributeId: node_opcua_service_read_1.AttributeIds.EventNotifier,
            nodeId: node_opcua_nodeid_1.resolveNodeId("Server"),
        };
        const fields = yield client_alarm_tools_extractConditionFields_1.extractConditionFields(session, "AcknowledgeableConditionType");
        const eventFilter = node_opcua_service_filter_1.constructEventFilter(fields, [node_opcua_nodeid_1.resolveNodeId("AcknowledgeableConditionType")]);
        const monitoringParameters = {
            discardOldest: false,
            filter: eventFilter,
            queueSize: 10000,
            samplingInterval: 0,
        };
        const acknowledgeableConditions = [];
        // now create a event monitored Item
        const event_monitoringItem = client_monitored_item_1.ClientMonitoredItem.create(subscription, itemToMonitor, monitoringParameters, node_opcua_service_read_1.TimestampsToReturn.Both);
        let refreshStartEventHasBeenReceived = false;
        let RefreshEndEventHasBeenReceived = false;
        const RefreshStartEventType = node_opcua_nodeid_1.resolveNodeId("RefreshStartEventType").toString();
        const RefreshEndEventType = node_opcua_nodeid_1.resolveNodeId("RefreshEndEventType").toString();
        const promise = new Promise((resolve, reject) => {
            event_monitoringItem.on("changed", (eventFields) => {
                try {
                    if (RefreshEndEventHasBeenReceived) {
                        return;
                    }
                    // dumpEvent(session, fields, eventFields);
                    const pojo = client_alarm_1.fieldsToJson(fields, eventFields);
                    // console.log(pojo.eventType.value.toString(), RefreshEndEventType, RefreshStartEventType);
                    // make sure we only start recording event after the RefreshStartEvent has been received
                    if (!refreshStartEventHasBeenReceived) {
                        if (pojo.eventType.value.toString() === RefreshStartEventType) {
                            refreshStartEventHasBeenReceived = true;
                        }
                        return;
                    }
                    if (pojo.eventType.value.toString() === RefreshEndEventType) {
                        RefreshEndEventHasBeenReceived = true;
                        resolve();
                        return;
                    }
                    if (!pojo.conditionId.value) {
                        // not a Acknowledgeable condition
                        return;
                    }
                    if (pojo.ackedState.id.dataType === node_opcua_variant_1.DataType.Boolean) {
                        acknowledgeableConditions.push(pojo);
                    }
                }
                catch (err) {
                    // tslint:disable-next-line: no-console
                    console.log("Error !!", err);
                }
            });
            // async call without waiting !
            try {
                client_tools_1.callConditionRefresh(subscription);
            }
            catch (err) {
                // it is possible that server do not implement conditionRefresh ...
                console.log("Server may not implement conditionRefresh");
                console.log(err.message);
            }
        });
        yield promise;
        // now shut down susbscription
        yield subscription.terminate();
        return acknowledgeableConditions;
    });
}
exports.findActiveConditions = findActiveConditions;
function acknwoledgeAllConditions(session, message) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            let conditions = yield findActiveConditions(session);
            if (conditions.length === 0) {
                // tslint:disable-next-line: no-console
                console.log("Warning: cannot find conditions ");
            }
            // filter acknowledgable conditions (no acked yet)
            conditions = conditions.filter((pojo) => pojo.ackedState.id.value === false);
            const promises = [];
            for (const eventStuff of conditions) {
                promises.push(acknowledgeCondition(session, eventStuff, message));
            }
            const result = yield Promise.all(promises);
            // tslint:disable-next-line: no-console
            console.log("Acked all results: ", result.map(e => e.toString()).join(" "));
        }
        catch (err) {
            // tslint:disable-next-line: no-console
            console.log("Error", err);
        }
    });
}
exports.acknwoledgeAllConditions = acknwoledgeAllConditions;
function confirmAllConditions(session, message) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            let conditions = yield findActiveConditions(session);
            if (conditions.length === 0) {
                // tslint:disable-next-line: no-console
                console.log("Warning: cannot find conditions ");
            }
            // filter acknowledgable conditions (no acked yet)
            conditions = conditions.filter((pojo) => pojo.confirmedState.id.value === false);
            const promises = [];
            for (const eventStuff of conditions) {
                promises.push(confirmCondition(session, eventStuff, message));
            }
            const result = yield Promise.all(promises);
            // tslint:disable-next-line: no-console
            console.log("Confirm all results: ", result.map(e => e.toString()).join(" "));
        }
        catch (err) {
            // tslint:disable-next-line: no-console
            console.log("Error", err);
        }
    });
}
exports.confirmAllConditions = confirmAllConditions;
//# sourceMappingURL=client_alarm_tools_acknowledge_all_conditions.js.map