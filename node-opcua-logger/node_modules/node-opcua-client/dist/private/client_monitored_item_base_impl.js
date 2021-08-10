"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * @module node-opcua-client-private
 */
const events_1 = require("events");
const node_opcua_assert_1 = require("node-opcua-assert");
const node_opcua_data_model_1 = require("node-opcua-data-model");
const node_opcua_debug_1 = require("node-opcua-debug");
const node_opcua_service_filter_1 = require("node-opcua-service-filter");
const node_opcua_service_read_1 = require("node-opcua-service-read");
const node_opcua_service_subscription_1 = require("node-opcua-service-subscription");
const node_opcua_status_code_1 = require("node-opcua-status-code");
const debugLog = node_opcua_debug_1.make_debugLog(__filename);
const doDebug = node_opcua_debug_1.checkDebugFlag(__filename);
class ClientMonitoredItemBaseImpl extends events_1.EventEmitter {
    constructor(subscription, itemToMonitor, monitoringParameters) {
        super();
        this.statusCode = node_opcua_status_code_1.StatusCodes.BadDataUnavailable;
        node_opcua_assert_1.assert(subscription.constructor.name === "ClientSubscriptionImpl");
        this.subscription = subscription;
        this.itemToMonitor = new node_opcua_service_read_1.ReadValueId(itemToMonitor);
        this.monitoringParameters = new node_opcua_service_subscription_1.MonitoringParameters(monitoringParameters);
        this.monitoringMode = node_opcua_service_subscription_1.MonitoringMode.Reporting;
        node_opcua_assert_1.assert(this.monitoringParameters.clientHandle === 0xFFFFFFFF, "should not have a client handle yet");
    }
    /**
     * @internal
     * @param value
     * @private
     */
    _notify_value_change(value) {
        /**
         * Notify the observers that the MonitoredItem value has changed on the server side.
         * @event changed
         * @param value
         */
        try {
            this.emit("changed", value);
        }
        catch (err) {
            debugLog("Exception raised inside the event handler called by ClientMonitoredItem.on('change')", err);
            debugLog("Please verify the application using this node-opcua client");
        }
    }
    /**
     * @internal
     * @param eventFields
     * @private
     */
    _notify_event(eventFields) {
        /**
         * Notify the observers that the MonitoredItem value has changed on the server side.
         * @event changed
         * @param value
         */
        try {
            this.emit("changed", eventFields);
        }
        catch (err) {
            debugLog("Exception raised inside the event handler called by ClientMonitoredItem.on('change')", err);
            debugLog("Please verify the application using this node-opcua client");
        }
    }
    /**
     * @internal
     * @private
     */
    _prepare_for_monitoring() {
        node_opcua_assert_1.assert(this.monitoringParameters.clientHandle === 4294967295, "should not have a client handle yet");
        const subscription = this.subscription;
        this.monitoringParameters.clientHandle = subscription.nextClientHandle();
        node_opcua_assert_1.assert(this.monitoringParameters.clientHandle > 0
            && this.monitoringParameters.clientHandle !== 4294967295);
        // If attributeId is EventNotifier then monitoring parameters need a filter.
        // The filter must then either be DataChangeFilter, EventFilter or AggregateFilter.
        // todo can be done in another way?
        // todo implement AggregateFilter
        // todo support DataChangeFilter
        // todo support whereClause
        if (this.itemToMonitor.attributeId === node_opcua_data_model_1.AttributeIds.EventNotifier) {
            //
            // see OPCUA Spec 1.02 part 4 page 65 : 5.12.1.4 Filter
            // see                 part 4 page 130: 7.16.3 EventFilter
            //                     part 3 page 11 : 4.6 Event Model
            // To monitor for Events, the attributeId element of the ReadValueId structure is the
            // the id of the EventNotifierAttribute
            // OPC Unified Architecture 1.02, Part 4 5.12.1.2 Sampling interval page 64:
            // "A Client shall define a sampling interval of 0 if it subscribes for Events."
            // toDO
            // note : the EventFilter is used when monitoring Events.
            // @ts-ignore
            this.monitoringParameters.filter = this.monitoringParameters.filter || new node_opcua_service_filter_1.EventFilter({});
            const filter = this.monitoringParameters.filter;
            if (!filter) {
                return { error: "Internal Error" };
            }
            if (filter.schema.name !== "EventFilter") {
                return {
                    error: "Mismatch between attributeId and filter in monitoring parameters : " +
                        "Got a " + filter.schema.name + " but a EventFilter object is required " +
                        "when itemToMonitor.attributeId== AttributeIds.EventNotifier"
                };
            }
        }
        else if (this.itemToMonitor.attributeId === node_opcua_data_model_1.AttributeIds.Value) {
            // the DataChangeFilter and the AggregateFilter are used when monitoring Variable Values
            // The Value Attribute is used when monitoring Variables. Variable values are monitored for a change
            // in value or a change in their status. The filters defined in this standard (see 7.16.2) and in Part 8 are
            // used to determine if the value change is large enough to cause a Notification to be generated for the
            // to do : check 'DataChangeFilter'  && 'AggregateFilter'
        }
        else {
            if (this.monitoringParameters.filter) {
                return {
                    error: "Mismatch between attributeId and filter in monitoring parameters : " +
                        "no filter expected when attributeId is not Value  or  EventNotifier"
                };
            }
        }
        return {
            itemToMonitor: this.itemToMonitor,
            monitoringMode: this.monitoringMode,
            requestedParameters: this.monitoringParameters
        };
    }
    /**
     * @internal
     * @param monitoredItemResult
     * @private
     */
    _applyResult(monitoredItemResult) {
        this.statusCode = monitoredItemResult.statusCode;
        /* istanbul ignore else */
        if (monitoredItemResult.statusCode === node_opcua_status_code_1.StatusCodes.Good) {
            this.result = monitoredItemResult;
            this.monitoredItemId = monitoredItemResult.monitoredItemId;
            this.monitoringParameters.samplingInterval = monitoredItemResult.revisedSamplingInterval;
            this.monitoringParameters.queueSize = monitoredItemResult.revisedQueueSize;
            this.filterResult = monitoredItemResult.filterResult || undefined;
        }
    }
    /**
     * @internal
     * @param monitoredItemResult
     * @private
     */
    _after_create(monitoredItemResult) {
        this._applyResult(monitoredItemResult);
        if (this.statusCode === node_opcua_status_code_1.StatusCodes.Good) {
            const subscription = this.subscription;
            subscription._add_monitored_item(this.monitoringParameters.clientHandle, this);
            /**
             * Notify the observers that the monitored item is now fully initialized.
             * @event initialized
             */
            this.emit("initialized");
        }
        else {
            /**
             * Notify the observers that the monitored item has failed to initialized.
             * @event err
             * @param statusCode {StatusCode}
             */
            const err = new Error(monitoredItemResult.statusCode.toString());
            this.emit("err", err.message);
            this.emit("terminated");
        }
    }
}
exports.ClientMonitoredItemBaseImpl = ClientMonitoredItemBaseImpl;
//# sourceMappingURL=client_monitored_item_base_impl.js.map