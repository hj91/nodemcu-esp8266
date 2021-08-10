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
const node_opcua_data_model_1 = require("node-opcua-data-model");
const node_opcua_nodeid_1 = require("node-opcua-nodeid");
const node_opcua_service_filter_1 = require("node-opcua-service-filter");
const node_opcua_service_read_1 = require("node-opcua-service-read");
const client_monitored_item_1 = require("../client_monitored_item");
const client_alarm_1 = require("./client_alarm");
const client_alarm_list_1 = require("./client_alarm_list");
const client_alarm_tools_extractConditionFields_1 = require("./client_alarm_tools_extractConditionFields");
const client_tools_1 = require("./client_tools");
// ------------------------------------------------------------------------------------------------------------------------------
function uninstallAlarmMonitoring(session) {
    return __awaiter(this, void 0, void 0, function* () {
        const _sessionPriv = session;
        if (!_sessionPriv.$clientAlarmList) {
            return;
        }
        const mi = _sessionPriv.$monitoredItemForAlarmList;
        mi.removeAllListeners();
        _sessionPriv.$monitoredItemForAlarmList = null;
        yield _sessionPriv.$subscriptionforAlarmList.terminate();
        _sessionPriv.$clientAlarmList = null;
        return;
    });
}
exports.uninstallAlarmMonitoring = uninstallAlarmMonitoring;
// Release 1.04 8 OPC Unified Architecture, Part 9
// 4.5 Condition state synchronization
//
// A Client that wishes to display the current status of Alarms and Conditions (known as a
// “current Alarm display”) would use the following logic to process Refresh Event Notifications.
// The Client flags all Retained Conditions as suspect on reception of the Event of the
// RefreshStartEventType. The Client adds any new Events that are received during the Refresh
// without flagging them as suspect. The Client also removes the suspect flag from any Retained
// Conditions that are returned as part of the Refresh. When the Client receives a
// RefreshEndEvent, the Client removes any remaining suspect Events, since they no longer
// apply.
// ------------------------------------------------------------------------------------------------------------------------------
function installAlarmMonitoring(session) {
    return __awaiter(this, void 0, void 0, function* () {
        const _sessionPriv = session;
        // create
        if (_sessionPriv.$clientAlarmList) {
            return _sessionPriv.$clientAlarmList;
        }
        const clientAlarmList = new client_alarm_list_1.ClientAlarmList();
        _sessionPriv.$clientAlarmList = clientAlarmList;
        const request = {
            maxNotificationsPerPublish: 10000,
            priority: 6,
            publishingEnabled: true,
            requestedLifetimeCount: 10000,
            requestedMaxKeepAliveCount: 1000,
            requestedPublishingInterval: 10,
        };
        const subscription = yield session.createSubscription2(request);
        _sessionPriv.$subscriptionforAlarmList = subscription;
        const itemToMonitor = {
            attributeId: node_opcua_data_model_1.AttributeIds.EventNotifier,
            nodeId: node_opcua_nodeid_1.resolveNodeId("Server"),
        };
        const fields = yield client_alarm_tools_extractConditionFields_1.extractConditionFields(session, "AlarmConditionType");
        const eventFilter = node_opcua_service_filter_1.constructEventFilter(fields, [node_opcua_nodeid_1.resolveNodeId("AcknowledgeableConditionType")]);
        const monitoringParameters = {
            discardOldest: false,
            filter: eventFilter,
            queueSize: 10000,
            samplingInterval: 0,
        };
        // now create a event monitored Item
        const event_monitoringItem = client_monitored_item_1.ClientMonitoredItem.create(subscription, itemToMonitor, monitoringParameters, node_opcua_service_read_1.TimestampsToReturn.Both);
        const RefreshStartEventType = node_opcua_nodeid_1.resolveNodeId("RefreshStartEventType").toString();
        const RefreshEndEventType = node_opcua_nodeid_1.resolveNodeId("RefreshEndEventType").toString();
        event_monitoringItem.on("changed", (eventFields) => {
            const pojo = client_alarm_1.fieldsToJson(fields, eventFields);
            try {
                if (pojo.eventType.value.toString() === RefreshStartEventType) {
                    return;
                }
                if (pojo.eventType.value.toString() === RefreshEndEventType) {
                    return;
                }
                if (!pojo.conditionId || !pojo.conditionId.value || pojo.conditionId.dataType === 0) {
                    // not a acknowledgeable condition
                    return;
                }
                clientAlarmList.update(pojo);
            }
            catch (err) {
                // tslint:disable-next-line: no-console
                function r(_key, o) {
                    if (o && o.dataType === "Null") {
                        return undefined;
                    }
                    return o;
                }
                // tslint:disable-next-line: no-console
                console.log(JSON.stringify(pojo, r, " "));
                // tslint:disable-next-line: no-console
                console.log("Error !!", err);
            }
            // Release 1.04 8 OPC Unified Architecture, Part 9
            // 4.5 Condition state synchronization
            // RefreshRequiredEventType
            // Under some circumstances a Server may not be capable of ensuring the Client is fully
            //  in sync with the current state of Condition instances. For example, if the underlying
            // system represented by the Server is reset or communications are lost for some period
            // of time the Server may need to resynchronize itself with the underlying system. In
            // these cases, the Server shall send an Event of the RefreshRequiredEventType to
            // advise the Client that a Refresh may be necessary. A Client receiving this special
            // Event should initiate a ConditionRefresh as noted in this clause.
            // TODO
        });
        try {
            yield client_tools_1.callConditionRefresh(subscription);
        }
        catch (err) {
            console.log("Server may not implement condition refresh", err.message);
        }
        _sessionPriv.$monitoredItemForAlarmList = event_monitoringItem;
        // also request updates
        return clientAlarmList;
    });
}
exports.installAlarmMonitoring = installAlarmMonitoring;
//# sourceMappingURL=client_alarm_tools.js.map