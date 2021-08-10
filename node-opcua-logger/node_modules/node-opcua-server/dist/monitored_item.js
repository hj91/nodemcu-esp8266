"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * @module node-opcua-server
 */
// tslint:disable:no-console
const chalk_1 = require("chalk");
const events_1 = require("events");
const node_opcua_assert_1 = require("node-opcua-assert");
const _ = require("underscore");
const node_opcua_address_space_1 = require("node-opcua-address-space");
const node_opcua_data_model_1 = require("node-opcua-data-model");
const node_opcua_data_model_2 = require("node-opcua-data-model");
const node_opcua_data_value_1 = require("node-opcua-data-value");
const node_opcua_debug_1 = require("node-opcua-debug");
const node_opcua_numeric_range_1 = require("node-opcua-numeric-range");
const node_opcua_object_registry_1 = require("node-opcua-object-registry");
const node_opcua_service_filter_1 = require("node-opcua-service-filter");
const node_opcua_service_filter_2 = require("node-opcua-service-filter");
const node_opcua_service_read_1 = require("node-opcua-service-read");
const node_opcua_service_subscription_1 = require("node-opcua-service-subscription");
const node_opcua_service_subscription_2 = require("node-opcua-service-subscription");
const node_opcua_status_code_1 = require("node-opcua-status-code");
const node_opcua_types_1 = require("node-opcua-types");
const node_opcua_variant_1 = require("node-opcua-variant");
const node_sampler_1 = require("./node_sampler");
const validate_filter_1 = require("./validate_filter");
const defaultItemToMonitor = new node_opcua_service_read_1.ReadValueId({
    attributeId: node_opcua_data_model_2.AttributeIds.Value,
    indexRange: undefined,
});
const debugLog = node_opcua_debug_1.make_debugLog(__filename);
const doDebug = node_opcua_debug_1.checkDebugFlag(__filename);
function _adjust_sampling_interval(samplingInterval, node_minimumSamplingInterval) {
    node_opcua_assert_1.assert(_.isNumber(node_minimumSamplingInterval), "expecting a number");
    if (samplingInterval === 0) {
        return (node_minimumSamplingInterval === 0)
            ? samplingInterval
            : Math.max(MonitoredItem.minimumSamplingInterval, node_minimumSamplingInterval);
    }
    node_opcua_assert_1.assert(samplingInterval >= 0, " this case should have been prevented outside");
    samplingInterval = samplingInterval || MonitoredItem.defaultSamplingInterval;
    samplingInterval = Math.max(samplingInterval, MonitoredItem.minimumSamplingInterval);
    samplingInterval = Math.min(samplingInterval, MonitoredItem.maximumSamplingInterval);
    samplingInterval = node_minimumSamplingInterval === 0
        ? samplingInterval
        : Math.max(samplingInterval, node_minimumSamplingInterval);
    return samplingInterval;
}
const maxQueueSize = 5000;
function _adjust_queue_size(queueSize) {
    queueSize = Math.min(queueSize, maxQueueSize);
    queueSize = Math.max(1, queueSize);
    return queueSize;
}
function _validate_parameters(monitoringParameters) {
    // xx assert(options instanceof MonitoringParameters);
    node_opcua_assert_1.assert(monitoringParameters.hasOwnProperty("clientHandle"));
    node_opcua_assert_1.assert(monitoringParameters.hasOwnProperty("samplingInterval"));
    node_opcua_assert_1.assert(_.isFinite(monitoringParameters.clientHandle));
    node_opcua_assert_1.assert(_.isFinite(monitoringParameters.samplingInterval));
    node_opcua_assert_1.assert(_.isBoolean(monitoringParameters.discardOldest));
    node_opcua_assert_1.assert(_.isFinite(monitoringParameters.queueSize));
    node_opcua_assert_1.assert(monitoringParameters.queueSize >= 0);
}
function statusCodeHasChanged(newDataValue, oldDataValue) {
    node_opcua_assert_1.assert(newDataValue instanceof node_opcua_data_value_1.DataValue);
    node_opcua_assert_1.assert(oldDataValue instanceof node_opcua_data_value_1.DataValue);
    return newDataValue.statusCode !== oldDataValue.statusCode;
}
function valueHasChanged(newDataValue, oldDataValue, deadbandType, deadbandValue) {
    node_opcua_assert_1.assert(newDataValue instanceof node_opcua_data_value_1.DataValue);
    node_opcua_assert_1.assert(oldDataValue instanceof node_opcua_data_value_1.DataValue);
    switch (deadbandType) {
        case node_opcua_service_subscription_2.DeadbandType.None:
            node_opcua_assert_1.assert(newDataValue.value instanceof node_opcua_variant_1.Variant);
            node_opcua_assert_1.assert(newDataValue.value instanceof node_opcua_variant_1.Variant);
            // No Deadband calculation should be applied.
            return node_opcua_service_subscription_2.checkDeadBand(oldDataValue.value, newDataValue.value, node_opcua_service_subscription_2.DeadbandType.None);
        case node_opcua_service_subscription_2.DeadbandType.Absolute:
            // AbsoluteDeadband
            return node_opcua_service_subscription_2.checkDeadBand(oldDataValue.value, newDataValue.value, node_opcua_service_subscription_2.DeadbandType.Absolute, deadbandValue);
        default:
            // Percent_2    PercentDeadband (This type is specified in Part 8).
            node_opcua_assert_1.assert(deadbandType === node_opcua_service_subscription_2.DeadbandType.Percent);
            // The range of the deadbandValue is from 0.0 to 100.0 Percent.
            node_opcua_assert_1.assert(deadbandValue >= 0 && deadbandValue <= 100);
            // DeadbandType = PercentDeadband
            // For this type of deadband the deadbandValue is defined as the percentage of the EURange. That is,
            // it applies only to AnalogItems with an EURange Property that defines the typical value range for the
            // item. This range shall be multiplied with the deadbandValue and then compared to the actual value change
            // to determine the need for a data change notification. The following pseudo code shows how the deadband
            // is calculated:
            //      DataChange if (absolute value of (last cached value - current value) >
            //                                          (deadbandValue/100.0) * ((high-low) of EURange)))
            //
            // Specifying a deadbandValue outside of this range will be rejected and reported with the
            // StatusCode BadDeadbandFilterInvalid (see Table 27).
            // If the Value of the MonitoredItem is an array, then the deadband calculation logic shall be applied to
            // each element of the array. If an element that requires a DataChange is found, then no further
            // deadband checking is necessary and the entire array shall be returned.
            node_opcua_assert_1.assert(this.node !== null, "expecting a valid address_space object here to get access the the EURange");
            if (this.node.euRange) {
                // double,double
                const rangeVariant = this.node.euRange.readValue().value;
                const range = rangeVariant.value.high - rangeVariant.value.high;
                node_opcua_assert_1.assert(_.isFinite(range));
                return node_opcua_service_subscription_2.checkDeadBand(oldDataValue.value, newDataValue.value, node_opcua_service_subscription_2.DeadbandType.Percent, deadbandValue, range);
            }
            return true;
    }
}
function timestampHasChanged(t1, t2) {
    if ((t1 || !t2) || (t2 || !t1)) {
        return true;
    }
    if (!t1 || !t2) {
        return false;
    }
    return t1.getTime() !== t2.getTime();
}
function isGoodish(statusCode) {
    return statusCode.value < 0x10000000;
}
function apply_datachange_filter(newDataValue, oldDataValue) {
    if (!this.filter || !(this.filter instanceof node_opcua_service_subscription_2.DataChangeFilter)) {
        throw new Error("Internal Error");
    }
    node_opcua_assert_1.assert(this.filter instanceof node_opcua_service_subscription_2.DataChangeFilter);
    node_opcua_assert_1.assert(newDataValue instanceof node_opcua_data_value_1.DataValue);
    node_opcua_assert_1.assert(oldDataValue instanceof node_opcua_data_value_1.DataValue);
    const trigger = this.filter.trigger;
    switch (trigger) {
        case node_opcua_service_subscription_2.DataChangeTrigger.Status: // Status
            //              Report a notification ONLY if the StatusCode associated with
            //              the value changes. See Table 166 for StatusCodes defined in
            //              this standard. Part 8 specifies additional StatusCodes that are
            //              valid in particular for device data.
            return statusCodeHasChanged(newDataValue, oldDataValue);
        case node_opcua_service_subscription_2.DataChangeTrigger.StatusValue: // StatusValue
            //              Report a notification if either the StatusCode or the value
            //              change. The Deadband filter can be used in addition for
            //              filtering value changes.
            //              This is the default setting if no filter is set.
            return statusCodeHasChanged(newDataValue, oldDataValue) ||
                valueHasChanged.call(this, newDataValue, oldDataValue, this.filter.deadbandType, this.filter.deadbandValue);
        default: // StatusValueTimestamp
            //              Report a notification if either StatusCode, value or the
            //              SourceTimestamp change.
            //
            //              If a Deadband filter is specified,this trigger has the same behaviour as STATUS_VALUE_1.
            //
            //              If the DataChangeFilter is not applied to the monitored item, STATUS_VALUE_1
            //              is the default reporting behaviour
            node_opcua_assert_1.assert(trigger === node_opcua_service_subscription_2.DataChangeTrigger.StatusValueTimestamp);
            return timestampHasChanged(newDataValue.sourceTimestamp, oldDataValue.sourceTimestamp) ||
                statusCodeHasChanged(newDataValue, oldDataValue) ||
                valueHasChanged.call(this, newDataValue, oldDataValue, this.filter.deadbandType, this.filter.deadbandValue);
    }
    return false;
}
function apply_filter(newDataValue) {
    if (!this.oldDataValue) {
        return true; // keep
    }
    if (this.filter instanceof node_opcua_service_subscription_2.DataChangeFilter) {
        return apply_datachange_filter.call(this, newDataValue, this.oldDataValue);
    }
    return true; // keep
    // else {
    //      // if filter not set, by default report changes to Status or Value only
    //      return !sameDataValue(newDataValue, this.oldDataValue, TimestampsToReturn.Neither);
    // }
    // return true; // keep
}
function setSemanticChangeBit(notification) {
    if (notification && notification.hasOwnProperty("value")) {
        notification.value.statusCode =
            node_opcua_status_code_1.StatusCode.makeStatusCode(notification.value.statusCode, "SemanticChanged");
    }
}
const useCommonTimer = true;
/**
 * a server side monitored item
 *
 * - Once created, the MonitoredItem will raised an "samplingEvent" event every "samplingInterval" millisecond
 *   until {{#crossLink "MonitoredItem/terminate:method"}}{{/crossLink}} is called.
 *
 * - It is up to the  event receiver to call {{#crossLink "MonitoredItem/recordValue:method"}}{{/crossLink}}.
 *
 */
class MonitoredItem extends events_1.EventEmitter {
    constructor(options) {
        super();
        this.samplingInterval = -1;
        this.discardOldest = true;
        this.queueSize = 0;
        this.samplingFunc = null;
        this._is_sampling = false;
        node_opcua_assert_1.assert(options.hasOwnProperty("monitoredItemId"));
        node_opcua_assert_1.assert(!options.monitoringMode, "use setMonitoring mode explicitly to activate the monitored item");
        options.itemToMonitor = options.itemToMonitor || defaultItemToMonitor;
        this._samplingId = undefined;
        this._set_parameters(options);
        this.monitoredItemId = options.monitoredItemId; // ( known as serverHandle)
        this.queue = [];
        this.overflow = false;
        this.oldDataValue = new node_opcua_data_value_1.DataValue({ statusCode: node_opcua_status_code_1.StatusCodes.BadDataUnavailable }); // unset initially
        // user has to call setMonitoringMode
        this.monitoringMode = node_opcua_service_subscription_1.MonitoringMode.Invalid;
        this.timestampsToReturn = options.timestampsToReturn || node_opcua_service_read_1.TimestampsToReturn.Neither;
        this.itemToMonitor = options.itemToMonitor;
        this.filter = options.filter || null;
        this._node = null;
        this._semantic_version = 0;
        if (doDebug) {
            debugLog("Monitoring ", options.itemToMonitor.toString());
        }
        this._on_node_disposed_listener = null;
        MonitoredItem.registry.register(this);
    }
    get node() {
        return this._node;
    }
    set node(someNode) {
        throw new Error("Unexpected way to set node");
    }
    setNode(node) {
        node_opcua_assert_1.assert(!this.node || this.node === node, "node already set");
        this._node = node;
        this._semantic_version = node.semantic_version;
        this._on_node_disposed_listener = () => this._on_node_disposed(this._node);
        this._node.on("dispose", this._on_node_disposed_listener);
    }
    setMonitoringMode(monitoringMode) {
        node_opcua_assert_1.assert(monitoringMode !== node_opcua_service_subscription_1.MonitoringMode.Invalid);
        if (monitoringMode === this.monitoringMode) {
            // nothing to do
            return;
        }
        const old_monitoringMode = this.monitoringMode;
        this.monitoringMode = monitoringMode;
        if (this.monitoringMode === node_opcua_service_subscription_1.MonitoringMode.Disabled) {
            this._stop_sampling();
            // OPCUA 1.03 part 4 : $5.12.4
            // setting the mode to DISABLED causes all queued Notifications to be deleted
            this.queue = [];
            this.overflow = false;
        }
        else {
            node_opcua_assert_1.assert(this.monitoringMode === node_opcua_service_subscription_1.MonitoringMode.Sampling || this.monitoringMode === node_opcua_service_subscription_1.MonitoringMode.Reporting);
            // OPCUA 1.03 part 4 : $5.12.1.3
            // When a MonitoredItem is enabled (i.e. when the MonitoringMode is changed from DISABLED to
            // SAMPLING or REPORTING) or it is created in the enabled state, the Server shall report the first
            // sample as soon as possible and the time of this sample becomes the starting point for the next
            // sampling interval.
            const recordInitialValue = (old_monitoringMode === node_opcua_service_subscription_1.MonitoringMode.Invalid ||
                old_monitoringMode === node_opcua_service_subscription_1.MonitoringMode.Disabled);
            this._start_sampling(recordInitialValue);
        }
    }
    /**
     * Terminate the  MonitoredItem.
     * @method terminate
     *
     * This will stop the internal sampling timer.
     */
    terminate() {
        this._stop_sampling();
    }
    dispose() {
        if (doDebug) {
            debugLog("DISPOSING MONITORED ITEM", this._node.nodeId.toString());
        }
        this._stop_sampling();
        MonitoredItem.registry.unregister(this);
        if (this._on_node_disposed_listener) {
            this._node.removeListener("dispose", this._on_node_disposed_listener);
            this._on_node_disposed_listener = null;
        }
        // x assert(this._samplingId === null,"Sampling Id must be null");
        this.oldDataValue = undefined;
        this.queue = [];
        this.itemToMonitor = null;
        this.filter = null;
        this.monitoredItemId = 0;
        this._node = null;
        this._semantic_version = 0;
        this.$subscription = null;
        this.removeAllListeners();
        node_opcua_assert_1.assert(!this._samplingId);
        node_opcua_assert_1.assert(!this._value_changed_callback);
        node_opcua_assert_1.assert(!this._semantic_changed_callback);
        node_opcua_assert_1.assert(!this._attribute_changed_callback);
        node_opcua_assert_1.assert(!this._on_opcua_event_received_callback);
        this._on_opcua_event_received_callback = null;
        this._attribute_changed_callback = null;
        this._semantic_changed_callback = null;
        this._on_opcua_event_received_callback = null;
    }
    get isSampling() {
        return !!this._samplingId || _.isFunction(this._value_changed_callback) ||
            _.isFunction(this._attribute_changed_callback);
    }
    /**
     * @param dataValue       the whole dataValue
     * @param skipChangeTest  indicates whether recordValue should  not check that dataValue is really
     *                                  different from previous one, ( by checking timestamps but also variant value)
     * @private
     *
     * Notes:
     *  - recordValue can only be called within timer event
     *  - for performance reason, dataValue may be a shared value with the underlying node,
     *    therefore recordValue must clone the dataValue to make sure it retains a snapshot
     *    of the contain at the time recordValue was called.
     *
     */
    recordValue(dataValue, skipChangeTest, indexRange) {
        node_opcua_assert_1.assert(dataValue instanceof node_opcua_data_value_1.DataValue);
        node_opcua_assert_1.assert(dataValue !== this.oldDataValue, "recordValue expects different dataValue to be provided");
        node_opcua_assert_1.assert(!dataValue.value || dataValue.value !== this.oldDataValue.value, "recordValue expects different dataValue.value to be provided");
        node_opcua_assert_1.assert(!dataValue.value || dataValue.value.isValid(), "expecting a valid variant value");
        const hasSemanticChanged = this.node && (this.node.semantic_version !== this._semantic_version);
        // xx   console.log("`\n----------------------------",skipChangeTest,this.clientHandle,
        //             this.node.listenerCount("value_changed"),this.node.nodeId.toString());
        // xx   console.log("events ---- ",this.node.eventNames().join("-"));
        // xx    console.log("indexRange = ",indexRange ? indexRange.toString() :"");
        // xx    console.log("this.itemToMonitor.indexRange = ",this.itemToMonitor.indexRange.toString());
        if (!hasSemanticChanged && indexRange && this.itemToMonitor.indexRange) {
            // we just ignore changes that do not fall within our range
            // ( unless semantic bit has changed )
            if (!node_opcua_numeric_range_1.NumericRange.overlap(indexRange, this.itemToMonitor.indexRange)) {
                return; // no overlap !
            }
        }
        node_opcua_assert_1.assert(this.itemToMonitor, "must have a valid itemToMonitor(have this monitoredItem been disposed already ?");
        // extract the range that we are interested with
        dataValue = node_opcua_data_value_1.extractRange(dataValue, this.itemToMonitor.indexRange);
        // istanbul ignore next
        if (doDebug) {
            debugLog("MonitoredItem#recordValue", this.node.nodeId.toString(), this.node.browseName.toString(), " has Changed = ", !node_opcua_data_value_1.sameDataValue(dataValue, this.oldDataValue));
        }
        // if semantic has changed, value need to be enqueued regardless of other assumptions
        if (hasSemanticChanged) {
            return this._enqueue_value(dataValue);
        }
        const useIndexRange = this.itemToMonitor.indexRange && !this.itemToMonitor.indexRange.isEmpty();
        if (!skipChangeTest) {
            const hasChanged = !node_opcua_data_value_1.sameDataValue(dataValue, this.oldDataValue);
            if (!hasChanged) {
                return;
            }
        }
        if (!apply_filter.call(this, dataValue)) {
            return;
        }
        if (useIndexRange) {
            // when an indexRange is provided , make sure that no record happens unless
            // extracted variant in the selected range  has really changed.
            // istanbul ignore next
            if (doDebug) {
                debugLog("Current : ", this.oldDataValue.toString());
                debugLog("New : ", dataValue.toString());
                debugLog("indexRange=", indexRange);
            }
            if (node_opcua_variant_1.sameVariant(dataValue.value, this.oldDataValue.value)) {
                return;
            }
        }
        // store last value
        this._enqueue_value(dataValue);
    }
    get hasMonitoredItemNotifications() {
        return this.queue.length > 0;
    }
    extractMonitoredItemNotifications() {
        if (this.monitoringMode !== node_opcua_service_subscription_1.MonitoringMode.Reporting) {
            return [];
        }
        const notifications = this.queue;
        this._empty_queue();
        // apply semantic changed bit if necessary
        if (notifications.length > 0 && this.node && this._semantic_version < this.node.semantic_version) {
            const dataValue = notifications[notifications.length - 1];
            setSemanticChangeBit(dataValue);
            this._semantic_version = this.node.semantic_version;
        }
        return notifications;
    }
    modify(timestampsToReturn, monitoringParameters) {
        node_opcua_assert_1.assert(monitoringParameters instanceof node_opcua_service_subscription_1.MonitoringParameters);
        const old_samplingInterval = this.samplingInterval;
        this.timestampsToReturn = timestampsToReturn || this.timestampsToReturn;
        if (old_samplingInterval !== 0 && monitoringParameters.samplingInterval === 0) {
            monitoringParameters.samplingInterval = MonitoredItem.minimumSamplingInterval; // fastest possible
        }
        this._set_parameters(monitoringParameters);
        this._adjust_queue_to_match_new_queue_size();
        this._adjust_sampling(old_samplingInterval);
        if (monitoringParameters.filter) {
            const statusCodeFilter = validate_filter_1.validateFilter(monitoringParameters.filter, this.itemToMonitor, this.node);
            if (statusCodeFilter.isNot(node_opcua_status_code_1.StatusCodes.Good)) {
                return new node_opcua_service_subscription_1.MonitoredItemModifyResult({
                    statusCode: statusCodeFilter
                });
            }
        }
        // validate filter
        // note : The DataChangeFilter does not have an associated result structure.
        const filterResult = null; // new subscription_service.DataChangeFilter
        return new node_opcua_service_subscription_1.MonitoredItemModifyResult({
            filterResult,
            revisedQueueSize: this.queueSize,
            revisedSamplingInterval: this.samplingInterval,
            statusCode: node_opcua_status_code_1.StatusCodes.Good
        });
    }
    resendInitialValues() {
        // tte first Publish response(s) after the TransferSubscriptions call shall contain the current values of all
        // Monitored Items in the Subscription where the Monitoring Mode is set to Reporting.
        // the first Publish response after the TransferSubscriptions call shall contain only the value changes since
        // the last Publish response was sent.
        // This parameter only applies to MonitoredItems used for monitoring Attribute changes.
        this._stop_sampling();
        this._start_sampling(true);
    }
    /**
     * @method _on_sampling_timer
     * @private
     * request
     *
     */
    _on_sampling_timer() {
        // istanbul ignore next
        if (doDebug) {
            debugLog("MonitoredItem#_on_sampling_timer", this.node ? this.node.nodeId.toString() : "null", " isSampling?=", this._is_sampling);
        }
        if (this._samplingId) {
            node_opcua_assert_1.assert(this.monitoringMode === node_opcua_service_subscription_1.MonitoringMode.Sampling || this.monitoringMode === node_opcua_service_subscription_1.MonitoringMode.Reporting);
            if (this._is_sampling) {
                // previous sampling call is not yet completed..
                // there is nothing we can do about it except waiting until next tick.
                // note : see also issue #156 on github
                return;
            }
            // xx console.log("xxxx ON SAMPLING");
            node_opcua_assert_1.assert(!this._is_sampling, "sampling func shall not be re-entrant !! fix it");
            if (!this.samplingFunc) {
                throw new Error("internal error : missing samplingFunc");
            }
            this._is_sampling = true;
            this.samplingFunc.call(this, this.oldDataValue, (err, newDataValue) => {
                if (!this._samplingId) {
                    // item has been dispose .... the monitored item has been disposed while the async sampling func
                    // was taking place ... just ignore this
                    return;
                }
                if (err) {
                    console.log(" SAMPLING ERROR =>", err);
                }
                else {
                    // only record value if source timestamp is newer
                    // xx if (newDataValue.sourceTimestamp > this.oldDataValue.sourceTimestamp) {
                    this._on_value_changed(newDataValue);
                    // xx }
                }
                this._is_sampling = false;
            });
        }
        else {
            /* istanbul ignore next */
            debugLog("_on_sampling_timer call but MonitoredItem has been terminated !!! ");
        }
    }
    _stop_sampling() {
        // debugLog("MonitoredItem#_stop_sampling");
        if (!this.node) {
            throw new Error("Internal Error");
        }
        if (this._on_opcua_event_received_callback) {
            node_opcua_assert_1.assert(_.isFunction(this._on_opcua_event_received_callback));
            this.node.removeListener("event", this._on_opcua_event_received_callback);
            this._on_opcua_event_received_callback = null;
        }
        if (this._attribute_changed_callback) {
            node_opcua_assert_1.assert(_.isFunction(this._attribute_changed_callback));
            const event_name = node_opcua_address_space_1.makeAttributeEventName(this.itemToMonitor.attributeId);
            this.node.removeListener(event_name, this._attribute_changed_callback);
            this._attribute_changed_callback = null;
        }
        if (this._value_changed_callback) {
            // samplingInterval was 0 for a exception-based data Item
            // we setup a event listener that we need to unwind here
            node_opcua_assert_1.assert(_.isFunction(this._value_changed_callback));
            node_opcua_assert_1.assert(!this._samplingId);
            this.node.removeListener("value_changed", this._value_changed_callback);
            this._value_changed_callback = null;
        }
        if (this._semantic_changed_callback) {
            node_opcua_assert_1.assert(_.isFunction(this._semantic_changed_callback));
            node_opcua_assert_1.assert(!this._samplingId);
            this.node.removeListener("semantic_changed", this._semantic_changed_callback);
            this._semantic_changed_callback = null;
        }
        if (this._samplingId) {
            this._clear_timer();
        }
        node_opcua_assert_1.assert(!this._samplingId);
        node_opcua_assert_1.assert(!this._value_changed_callback);
        node_opcua_assert_1.assert(!this._semantic_changed_callback);
        node_opcua_assert_1.assert(!this._attribute_changed_callback);
        node_opcua_assert_1.assert(!this._on_opcua_event_received_callback);
    }
    _on_value_changed(dataValue, indexRange) {
        node_opcua_assert_1.assert(dataValue instanceof node_opcua_data_value_1.DataValue);
        this.recordValue(dataValue, false, indexRange);
    }
    _on_semantic_changed() {
        const dataValue = this.node.readValue();
        this._on_value_changed(dataValue);
    }
    _on_opcua_event(eventData) {
        // TO DO : => Improve Filtering, bearing in mind that ....
        // Release 1.04 8 OPC Unified Architecture, Part 9
        // 4.5 Condition state synchronization
        // To ensure a Client is always informed, the three special EventTypes
        // (RefreshEndEventType, RefreshStartEventType and RefreshRequiredEventType)
        // ignore the Event content filtering associated with a Subscription and will always be
        // delivered to the Client.
        if (!this.filter || !(this.filter instanceof node_opcua_service_filter_2.EventFilter)) {
            throw new Error("Internal Error");
        }
        const selectClauses = this.filter.selectClauses
            ? this.filter.selectClauses
            : [];
        const eventFields = node_opcua_service_filter_1.extractEventFields(selectClauses, eventData);
        // istanbul ignore next
        if (doDebug) {
            console.log(" RECEIVED INTERNAL EVENT THAT WE ARE MONITORING");
            console.log(this.filter ? this.filter.toString() : "no filter");
            eventFields.forEach((e) => {
                console.log(e.toString());
            });
        }
        this._enqueue_event(eventFields);
    }
    _getSession() {
        if (!this.$subscription) {
            return null;
        }
        if (!this.$subscription.$session) {
            return null;
        }
        return this.$subscription.$session;
    }
    _start_sampling(recordInitialValue) {
        if (!this.node) {
            throw new Error("Internal Error");
        }
        // make sure oldDataValue is scrapped so first data recording can happen
        this.oldDataValue = new node_opcua_data_value_1.DataValue({ statusCode: node_opcua_status_code_1.StatusCodes.BadDataUnavailable }); // unset initially
        this._stop_sampling();
        const context = new node_opcua_address_space_1.SessionContext({
            // xx  server: this.server,
            session: this._getSession()
        });
        if (this.itemToMonitor.attributeId === node_opcua_data_model_2.AttributeIds.EventNotifier) {
            // istanbul ignore next
            if (doDebug) {
                debugLog("xxxxxx monitoring EventNotifier on", this.node.nodeId.toString(), this.node.browseName.toString());
            }
            // we are monitoring OPCUA Event
            this._on_opcua_event_received_callback = this._on_opcua_event.bind(this);
            this.node.on("event", this._on_opcua_event_received_callback);
            return;
        }
        if (this.itemToMonitor.attributeId !== node_opcua_data_model_2.AttributeIds.Value) {
            // sampling interval only applies to Value Attributes.
            this.samplingInterval = 0; // turned to exception-based regardless of requested sampling interval
            // non value attribute only react on value change
            this._attribute_changed_callback = this._on_value_changed.bind(this);
            const event_name = node_opcua_address_space_1.makeAttributeEventName(this.itemToMonitor.attributeId);
            this.node.on(event_name, this._attribute_changed_callback);
            if (recordInitialValue) {
                // read initial value
                const dataValue = this.node.readAttribute(context, this.itemToMonitor.attributeId);
                this.recordValue(dataValue, true);
            }
            return;
        }
        if (this.samplingInterval === 0) {
            // we have a exception-based dataItem : event based model, so we do not need a timer
            // rather , we setup the "value_changed_event";
            this._value_changed_callback = this._on_value_changed.bind(this);
            this._semantic_changed_callback = this._on_semantic_changed.bind(this);
            this.node.on("value_changed", this._value_changed_callback);
            this.node.on("semantic_changed", this._semantic_changed_callback);
            // initiate first read
            if (recordInitialValue) {
                this.node.readValueAsync(context, (err, dataValue) => {
                    if (!err && dataValue) {
                        this.recordValue(dataValue, true);
                    }
                });
            }
        }
        else {
            this._set_timer();
            if (recordInitialValue) {
                setImmediate(() => {
                    // xx console.log("Record Initial Value ",this.node.nodeId.toString());
                    // initiate first read (this requires this._samplingId to be set)
                    this._on_sampling_timer();
                });
            }
        }
    }
    _set_parameters(monitoredParameters) {
        _validate_parameters(monitoredParameters);
        this.clientHandle = monitoredParameters.clientHandle;
        // The Server may support data that is collected based on a sampling model or generated based on an
        // exception-based model. The fastest supported sampling interval may be equal to 0, which indicates
        // that the data item is exception-based rather than being sampled at some period. An exception-based
        // model means that the underlying system does not require sampling and reports data changes.
        if (this.node && this.node.nodeClass === node_opcua_data_model_1.NodeClass.Variable) {
            this.samplingInterval = _adjust_sampling_interval(monitoredParameters.samplingInterval, this.node ? this.node.minimumSamplingInterval : 0);
        }
        else {
            this.samplingInterval = _adjust_sampling_interval(monitoredParameters.samplingInterval, 0);
        }
        this.discardOldest = monitoredParameters.discardOldest;
        this.queueSize = _adjust_queue_size(monitoredParameters.queueSize);
    }
    _setOverflowBit(notification) {
        if (notification.hasOwnProperty("value")) {
            node_opcua_assert_1.assert(notification.value.statusCode.equals(node_opcua_status_code_1.StatusCodes.Good));
            notification.value.statusCode =
                node_opcua_status_code_1.StatusCode.makeStatusCode(notification.value.statusCode, "Overflow | InfoTypeDataValue");
            node_opcua_assert_1.assert(_.isEqual(notification.value.statusCode, node_opcua_status_code_1.StatusCodes.GoodWithOverflowBit));
            node_opcua_assert_1.assert(notification.value.statusCode.hasOverflowBit);
        }
    }
    _enqueue_notification(notification) {
        if (this.queueSize === 1) {
            // ensure queuesize
            if (!this.queue || this.queue.length !== 1) {
                this.queue = [];
            }
            this.queue[0] = notification;
            node_opcua_assert_1.assert(this.queue.length === 1);
        }
        else {
            if (this.discardOldest) {
                // push new value to queue
                this.queue.push(notification);
                if (this.queue.length > this.queueSize) {
                    this.overflow = true;
                    this.queue.shift(); // remove front element
                    // set overflow bit
                    this._setOverflowBit(this.queue[0]);
                }
            }
            else {
                if (this.queue.length < this.queueSize) {
                    this.queue.push(notification);
                }
                else {
                    this.overflow = true;
                    this._setOverflowBit(notification);
                    this.queue[this.queue.length - 1] = notification;
                }
            }
        }
        node_opcua_assert_1.assert(this.queue.length >= 1);
    }
    _makeDataChangeNotification(dataValue) {
        const attributeId = this.itemToMonitor.attributeId;
        dataValue = node_opcua_data_value_1.apply_timestamps(dataValue, this.timestampsToReturn, attributeId);
        return new node_opcua_service_subscription_1.MonitoredItemNotification({
            clientHandle: this.clientHandle,
            value: dataValue
        });
    }
    /**
     * @method _enqueue_value
     * @param dataValue {DataValue} the dataValue to enquue
     * @private
     */
    _enqueue_value(dataValue) {
        // preconditions:
        node_opcua_assert_1.assert(dataValue instanceof node_opcua_data_value_1.DataValue);
        // lets verify that, if status code is good then we have a valid Variant in the dataValue
        node_opcua_assert_1.assert(!isGoodish(dataValue.statusCode) || dataValue.value instanceof node_opcua_variant_1.Variant);
        // xx assert(isGoodish(dataValue.statusCode) || util.isNullOrUndefined(dataValue.value) );
        // let's check that data Value is really a different object
        // we may end up with corrupted queue if dataValue are recycled and stored as is in notifications
        node_opcua_assert_1.assert(dataValue !== this.oldDataValue, "dataValue cannot be the same object twice!");
        // Xx // todo ERN !!!! PLEASE CHECK this !!!
        // Xx // let make a clone, so we have a snapshot
        // Xx dataValue = dataValue.clone();
        // let's check that data Value is really a different object
        // we may end up with corrupted queue if dataValue are recycled and stored as is in notifications
        node_opcua_assert_1.assert(!this.oldDataValue || !dataValue.value || (dataValue.value !== this.oldDataValue.value), "dataValue cannot be the same object twice!");
        if (!(!this.oldDataValue || !this.oldDataValue.value
            || !dataValue.value || !(dataValue.value.value instanceof Object)
            || (dataValue.value.value !== this.oldDataValue.value.value)) && !(dataValue.value.value instanceof Date)) {
            throw new Error("dataValue.value.value cannot be the same object twice! "
                + this.node.browseName.toString() + " " + dataValue.toString() + "  " +
                chalk_1.default.cyan(this.oldDataValue.toString()));
        }
        // istanbul ignore next
        if (doDebug) {
            debugLog("MonitoredItem#_enqueue_value", this.node.nodeId.toString());
        }
        this.oldDataValue = dataValue;
        const notification = this._makeDataChangeNotification(dataValue);
        this._enqueue_notification(notification);
    }
    _makeEventFieldList(eventFields) {
        node_opcua_assert_1.assert(_.isArray(eventFields));
        return new node_opcua_types_1.EventFieldList({
            clientHandle: this.clientHandle,
            eventFields
        });
    }
    _enqueue_event(eventFields) {
        if (doDebug) {
            debugLog(" MonitoredItem#_enqueue_event");
        }
        const notification = this._makeEventFieldList(eventFields);
        this._enqueue_notification(notification);
    }
    _empty_queue() {
        // empty queue
        this.queue = [];
        this.overflow = false;
    }
    _clear_timer() {
        if (this._samplingId) {
            if (useCommonTimer) {
                node_sampler_1.removeFromTimer(this);
            }
            else {
                clearInterval(this._samplingId);
            }
            this._samplingId = undefined;
        }
    }
    _set_timer() {
        node_opcua_assert_1.assert(this.samplingInterval >= MonitoredItem.minimumSamplingInterval);
        node_opcua_assert_1.assert(!this._samplingId);
        if (useCommonTimer) {
            this._samplingId = node_sampler_1.appendToTimer(this);
        }
        else {
            // settle periodic sampling
            this._samplingId = setInterval(() => {
                this._on_sampling_timer();
            }, this.samplingInterval);
        }
        // xx console.log("MonitoredItem#_set_timer",this._samplingId);
    }
    _adjust_queue_to_match_new_queue_size() {
        // adjust queue size if necessary
        if (this.queueSize < this.queue.length) {
            if (this.discardOldest) {
                this.queue.splice(0, this.queue.length - this.queueSize);
            }
            else {
                const lastElement = this.queue[this.queue.length - 1];
                // only keep queueSize first element, discard others
                this.queue.splice(this.queueSize);
                this.queue[this.queue.length - 1] = lastElement;
            }
        }
        if (this.queueSize <= 1) {
            this.overflow = false;
            // unset OverFlowBit
            if (this.queue.length === 1) {
                if (this.queue[0] instanceof node_opcua_service_subscription_1.MonitoredItemNotification) {
                    const el = this.queue[0];
                    if (el.value.statusCode.hasOverflowBit) {
                        el.value.statusCode.unset("Overflow | InfoTypeDataValue");
                    }
                }
            }
        }
        node_opcua_assert_1.assert(this.queue.length <= this.queueSize);
    }
    _adjust_sampling(old_samplingInterval) {
        if (old_samplingInterval !== this.samplingInterval) {
            this._start_sampling(false);
        }
    }
    _on_node_disposed(node) {
        this._on_value_changed(new node_opcua_data_value_1.DataValue({
            sourceTimestamp: new Date(),
            statusCode: node_opcua_status_code_1.StatusCodes.BadNodeIdInvalid
        }));
        this._stop_sampling();
        node.removeListener("dispose", this._on_node_disposed_listener);
        this._on_node_disposed_listener = null;
    }
}
exports.MonitoredItem = MonitoredItem;
MonitoredItem.registry = new node_opcua_object_registry_1.ObjectRegistry();
MonitoredItem.minimumSamplingInterval = 50; // 50 ms as a minimum sampling interval
MonitoredItem.defaultSamplingInterval = 1500; // 1500 ms as a default sampling interval
MonitoredItem.maximumSamplingInterval = 1000 * 60 * 60; // 1 hour !
//# sourceMappingURL=monitored_item.js.map