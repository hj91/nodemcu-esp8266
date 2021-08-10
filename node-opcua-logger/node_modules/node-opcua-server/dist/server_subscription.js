"use strict";
/**
 * @module node-opcua-server
 */
// tslint:disable:no-console
Object.defineProperty(exports, "__esModule", { value: true });
// tslint:disable-next-line:no-var-requires
const Dequeue = require("dequeue");
const chalk_1 = require("chalk");
const events_1 = require("events");
const _ = require("underscore");
const node_opcua_address_space_1 = require("node-opcua-address-space");
const node_opcua_address_space_2 = require("node-opcua-address-space");
const node_opcua_assert_1 = require("node-opcua-assert");
const node_opcua_common_1 = require("node-opcua-common");
const node_opcua_data_model_1 = require("node-opcua-data-model");
const node_opcua_data_model_2 = require("node-opcua-data-model");
const node_opcua_data_model_3 = require("node-opcua-data-model");
const node_opcua_debug_1 = require("node-opcua-debug");
const node_opcua_nodeid_1 = require("node-opcua-nodeid");
const node_opcua_object_registry_1 = require("node-opcua-object-registry");
const node_opcua_secure_channel_1 = require("node-opcua-secure-channel");
const node_opcua_service_filter_1 = require("node-opcua-service-filter");
const node_opcua_service_subscription_1 = require("node-opcua-service-subscription");
const node_opcua_service_subscription_2 = require("node-opcua-service-subscription");
const node_opcua_service_subscription_3 = require("node-opcua-service-subscription");
const node_opcua_status_code_1 = require("node-opcua-status-code");
const node_opcua_types_1 = require("node-opcua-types");
const monitored_item_1 = require("./monitored_item");
const validate_filter_1 = require("./validate_filter");
const debugLog = node_opcua_debug_1.make_debugLog(__filename);
const doDebug = node_opcua_debug_1.checkDebugFlag(__filename);
const maxNotificationMessagesInQueue = 100;
var SubscriptionState;
(function (SubscriptionState) {
    SubscriptionState[SubscriptionState["CLOSED"] = 1] = "CLOSED";
    SubscriptionState[SubscriptionState["CREATING"] = 2] = "CREATING";
    SubscriptionState[SubscriptionState["NORMAL"] = 3] = "NORMAL";
    // The keep-alive counter is not used in this state.
    SubscriptionState[SubscriptionState["LATE"] = 4] = "LATE";
    // ready to be sent, but there are no Publish requests queued. When in this state, the next Publish
    // request is processed when it is received. The keep-alive counter is not used in this state.
    SubscriptionState[SubscriptionState["KEEPALIVE"] = 5] = "KEEPALIVE";
    // alive counter to count down to 0 from its maximum.
    SubscriptionState[SubscriptionState["TERMINATED"] = 6] = "TERMINATED";
})(SubscriptionState = exports.SubscriptionState || (exports.SubscriptionState = {}));
function _adjust_publishing_interval(publishingInterval) {
    publishingInterval = publishingInterval || Subscription.defaultPublishingInterval;
    publishingInterval = Math.max(publishingInterval, Subscription.minimumPublishingInterval);
    publishingInterval = Math.min(publishingInterval, Subscription.maximumPublishingInterval);
    return publishingInterval;
}
const minimumMaxKeepAliveCount = 2;
const maximumMaxKeepAliveCount = 12000;
function _adjust_maxKeepAliveCount(maxKeepAliveCount /*,publishingInterval*/) {
    maxKeepAliveCount = maxKeepAliveCount || minimumMaxKeepAliveCount;
    maxKeepAliveCount = Math.max(maxKeepAliveCount, minimumMaxKeepAliveCount);
    maxKeepAliveCount = Math.min(maxKeepAliveCount, maximumMaxKeepAliveCount);
    return maxKeepAliveCount;
}
function _adjust_lifeTimeCount(lifeTimeCount, maxKeepAliveCount, publishingInterval) {
    lifeTimeCount = lifeTimeCount || 1;
    // let's make sure that lifeTimeCount is at least three time maxKeepAliveCount
    // Note : the specs say ( part 3  - CreateSubscriptionParameter )
    //        "The lifetime count shall be a minimum of three times the keep keep-alive count."
    lifeTimeCount = Math.max(lifeTimeCount, maxKeepAliveCount * 3);
    const minTicks = Math.ceil(5 * 1000 / (publishingInterval)); // we want 5 seconds min
    lifeTimeCount = Math.max(minTicks, lifeTimeCount);
    return lifeTimeCount;
}
function _adjust_publishinEnable(publishingEnabled) {
    return (publishingEnabled === null || publishingEnabled === undefined) ? true : !!publishingEnabled;
}
function _adjust_maxNotificationsPerPublish(maxNotificationsPerPublish) {
    maxNotificationsPerPublish = maxNotificationsPerPublish === undefined ? 0 : maxNotificationsPerPublish;
    node_opcua_assert_1.assert(_.isNumber(maxNotificationsPerPublish));
    return (maxNotificationsPerPublish >= 0) ? maxNotificationsPerPublish : 0;
}
function w(s, length) {
    return ("000" + s).substr(-length);
}
function t(d) {
    return w(d.getHours(), 2) + ":"
        + w(d.getMinutes(), 2) + ":"
        + w(d.getSeconds(), 2) + ":"
        + w(d.getMilliseconds(), 3);
}
// verify that the injected publishEngine provides the expected services
// regarding the Subscription requirements...
function _assert_valid_publish_engine(publishEngine) {
    node_opcua_assert_1.assert(_.isObject(publishEngine));
    node_opcua_assert_1.assert(_.isNumber(publishEngine.pendingPublishRequestCount));
    node_opcua_assert_1.assert(_.isFunction(publishEngine.send_notification_message));
    node_opcua_assert_1.assert(_.isFunction(publishEngine.send_keep_alive_response));
    node_opcua_assert_1.assert(_.isFunction(publishEngine.on_close_subscription));
}
function assert_validNotificationData(n) {
    node_opcua_assert_1.assert(n instanceof node_opcua_service_subscription_2.DataChangeNotification ||
        n instanceof node_opcua_service_subscription_2.EventNotificationList ||
        n instanceof node_opcua_service_subscription_2.StatusChangeNotification);
}
function getSequenceNumbers(arr) {
    return arr.map((e) => {
        return e.notification.sequenceNumber;
    });
}
function analyseEventFilterResult(node, eventFilter) {
    if (!(eventFilter instanceof node_opcua_service_filter_1.EventFilter)) {
        throw new Error("Internal Error");
    }
    const selectClauseResults = node_opcua_address_space_1.checkSelectClauses(node, eventFilter.selectClauses || []);
    const whereClauseResult = new node_opcua_types_1.ContentFilterResult();
    return new node_opcua_types_1.EventFilterResult({
        selectClauseDiagnosticInfos: [],
        selectClauseResults,
        whereClauseResult
    });
}
function analyseDataChangeFilterResult(node, dataChangeFilter) {
    node_opcua_assert_1.assert(dataChangeFilter instanceof node_opcua_service_subscription_3.DataChangeFilter);
    // the opcua specification doesn't provide dataChangeFilterResult
    return null;
}
function analyseAggregateFilterResult(node, aggregateFilter) {
    node_opcua_assert_1.assert(aggregateFilter instanceof node_opcua_service_subscription_1.AggregateFilter);
    return new node_opcua_types_1.AggregateFilterResult({});
}
function _process_filter(node, filter) {
    if (!filter) {
        return null;
    }
    if (filter instanceof node_opcua_service_filter_1.EventFilter) {
        return analyseEventFilterResult(node, filter);
    }
    else if (filter instanceof node_opcua_service_subscription_3.DataChangeFilter) {
        return analyseDataChangeFilterResult(node, filter);
    }
    else if (filter instanceof node_opcua_service_subscription_1.AggregateFilter) {
        return analyseAggregateFilterResult(node, filter);
    }
    // istanbul ignore next
    throw new Error("invalid filter");
}
/**
 * @private
 */
function createSubscriptionDiagnostics(subscription) {
    node_opcua_assert_1.assert(subscription instanceof Subscription);
    const subscriptionDiagnostics = new node_opcua_common_1.SubscriptionDiagnosticsDataType({});
    const subscription_subscriptionDiagnostics = subscriptionDiagnostics;
    subscription_subscriptionDiagnostics.$subscription = subscription;
    // "sessionId"
    subscription_subscriptionDiagnostics.__defineGetter__("sessionId", function () {
        return this.$subscription.getSessionId();
    });
    subscription_subscriptionDiagnostics.__defineGetter__("subscriptionId", function () {
        return this.$subscription.id;
    });
    subscription_subscriptionDiagnostics.__defineGetter__("priority", function () {
        return this.$subscription.priority;
    });
    subscription_subscriptionDiagnostics.__defineGetter__("publishingInterval", function () {
        return this.$subscription.publishingInterval;
    });
    subscription_subscriptionDiagnostics.__defineGetter__("maxLifetimeCount", function () {
        return this.$subscription.lifeTimeCount;
    });
    subscription_subscriptionDiagnostics.__defineGetter__("maxKeepAliveCount", function () {
        return this.$subscription.maxKeepAliveCount;
    });
    subscription_subscriptionDiagnostics.__defineGetter__("maxNotificationsPerPublish", function () {
        return this.$subscription.maxNotificationsPerPublish;
    });
    subscription_subscriptionDiagnostics.__defineGetter__("publishingEnabled", function () {
        return this.$subscription.publishingEnabled;
    });
    subscription_subscriptionDiagnostics.__defineGetter__("monitoredItemCount", function () {
        return this.$subscription.monitoredItemCount;
    });
    subscription_subscriptionDiagnostics.__defineGetter__("nextSequenceNumber", function () {
        return this.$subscription._get_future_sequence_number();
    });
    subscription_subscriptionDiagnostics.__defineGetter__("disabledMonitoredItemCount", function () {
        return this.$subscription.disabledMonitoredItemCount;
    });
    /* those member of self.subscriptionDiagnostics are handled directly

     modifyCount
     enableCount,
     disableCount,
     republishRequestCount,
     notificationsCount,
     publishRequestCount,
     dataChangeNotificationsCount,
     eventNotificationsCount,
    */
    /*
     those members are not updated yet in the code :
     "republishMessageRequestCount",
     "republishMessageCount",
     "transferRequestCount",
     "transferredToAltClientCount",
     "transferredToSameClientCount",
     "latePublishRequestCount",
     "currentKeepAliveCount",
     "currentLifetimeCount",
     "unacknowledgedMessageCount",
     "discardedMessageCount",
     "monitoringQueueOverflowCount",
     "eventQueueOverFlowCount"
     */
    // add object in Variable SubscriptionDiagnosticArray (i=2290) ( Array of SubscriptionDiagnostics)
    // add properties in Variable to reflect
    return subscriptionDiagnostics;
}
let g_monitoredItemId = 1;
function getNextMonitoredItemId() {
    return g_monitoredItemId++;
}
const INVALID_ID = -1;
/**
 * The Subscription class used in the OPCUA server side.
 */
class Subscription extends events_1.EventEmitter {
    constructor(options) {
        super();
        this._keep_alive_counter = 0;
        this._hasMonitoredItemNotifications = false;
        options = options || {};
        Subscription.registry.register(this);
        this.sessionId = options.sessionId || node_opcua_nodeid_1.NodeId.nullNodeId;
        node_opcua_assert_1.assert(this.sessionId instanceof node_opcua_nodeid_1.NodeId, "expecting a sessionId NodeId");
        this.publishEngine = options.publishEngine;
        _assert_valid_publish_engine(this.publishEngine);
        this.id = options.id || INVALID_ID;
        this.priority = options.priority || 0;
        this.publishingInterval = _adjust_publishing_interval(options.publishingInterval);
        this.maxKeepAliveCount = _adjust_maxKeepAliveCount(options.maxKeepAliveCount); // , this.publishingInterval);
        this.resetKeepAliveCounter();
        this.lifeTimeCount = _adjust_lifeTimeCount(options.lifeTimeCount || 0, this.maxKeepAliveCount, this.publishingInterval);
        this.maxNotificationsPerPublish = _adjust_maxNotificationsPerPublish(options.maxNotificationsPerPublish);
        this._life_time_counter = 0;
        this.resetLifeTimeCounter();
        // notification message that are ready to be sent to the client
        this._pending_notifications = new Dequeue();
        this._sent_notifications = [];
        this._sequence_number_generator = new node_opcua_secure_channel_1.SequenceNumberGenerator();
        // initial state of the subscription
        this.state = SubscriptionState.CREATING;
        this.publishIntervalCount = 0;
        this.monitoredItems = {}; // monitored item map
        this.monitoredItemIdCounter = 0;
        this.publishingEnabled = _adjust_publishinEnable(options.publishingEnabled);
        this.subscriptionDiagnostics = createSubscriptionDiagnostics(this);
        // A boolean value that is set to TRUE to mean that either a NotificationMessage or a keep-alive
        // Message has been sent on the Subscription. It is a flag that is used to ensure that either a
        // NotificationMessage or a keep-alive Message is sent out the first time the publishing
        // timer expires.
        this.messageSent = false;
        this._unacknowledgedMessageCount = 0;
        this.timerId = null;
        this._start_timer();
    }
    getSessionId() {
        return this.sessionId;
    }
    toString() {
        let str = "Subscription:\n";
        str += "  subscriptionId          " + this.id + "\n";
        str += "  sessionId          " + this.getSessionId().toString() + "\n";
        str += "  publishingEnabled  " + this.publishingEnabled + "\n";
        str += "  maxKeepAliveCount  " + this.maxKeepAliveCount + "\n";
        str += "  publishingInterval " + this.publishingInterval + "\n";
        str += "  lifeTimeCount      " + this.lifeTimeCount + "\n";
        str += "  maxKeepAliveCount  " + this.maxKeepAliveCount + "\n";
        return str;
    }
    /**
     * modify subscription parameters
     * @param param
     */
    modify(param) {
        // update diagnostic counter
        this.subscriptionDiagnostics.modifyCount += 1;
        const publishingInterval_old = this.publishingInterval;
        param.requestedPublishingInterval = param.requestedPublishingInterval || 0;
        param.requestedMaxKeepAliveCount = param.requestedMaxKeepAliveCount || this.maxKeepAliveCount;
        param.requestedLifetimeCount = param.requestedLifetimeCount || this.lifeTimeCount;
        this.publishingInterval = _adjust_publishing_interval(param.requestedPublishingInterval);
        this.maxKeepAliveCount = _adjust_maxKeepAliveCount(param.requestedMaxKeepAliveCount);
        // this.publishingInterval);
        this.lifeTimeCount = _adjust_lifeTimeCount(param.requestedLifetimeCount, this.maxKeepAliveCount, this.publishingInterval);
        this.maxNotificationsPerPublish = param.maxNotificationsPerPublish || 0;
        this.priority = param.priority || 0;
        this.resetLifeTimeAndKeepAliveCounters();
        if (publishingInterval_old !== this.publishingInterval) {
            // todo
        }
        this._stop_timer();
        this._start_timer();
    }
    /**
     * set publishing mode
     * @param publishingEnabled
     */
    setPublishingMode(publishingEnabled) {
        this.publishingEnabled = !!publishingEnabled;
        // update diagnostics
        if (this.publishingEnabled) {
            this.subscriptionDiagnostics.enableCount += 1;
        }
        else {
            this.subscriptionDiagnostics.disableCount += 1;
        }
        this.resetLifeTimeCounter();
        if (!publishingEnabled && this.state !== SubscriptionState.CLOSED) {
            this.state = SubscriptionState.NORMAL;
        }
        return node_opcua_status_code_1.StatusCodes.Good;
    }
    /**
     * @private
     */
    get keepAliveCounterHasExpired() {
        return this._keep_alive_counter >= this.maxKeepAliveCount;
    }
    /**
     * Reset the Lifetime Counter Variable to the value specified for the lifetime of a Subscription in
     * the CreateSubscription Service( 5.13.2).
     * @private
     */
    resetLifeTimeCounter() {
        this._life_time_counter = 0;
    }
    /**
     * @private
     */
    increaseLifeTimeCounter() {
        this._life_time_counter += 1;
    }
    /**
     *  True if the subscription life time has expired.
     *
     */
    get lifeTimeHasExpired() {
        node_opcua_assert_1.assert(this.lifeTimeCount > 0);
        return this._life_time_counter >= this.lifeTimeCount;
    }
    /**
     * number of milliseconds before this subscription times out (lifeTimeHasExpired === true);
     */
    get timeToExpiration() {
        return (this.lifeTimeCount - this._life_time_counter) * this.publishingInterval;
    }
    get timeToKeepAlive() {
        return (this.maxKeepAliveCount - this._keep_alive_counter) * this.publishingInterval;
    }
    /**
     * Terminates the subscription.
     * Calling this method will also remove any monitored items.
     *
     */
    terminate() {
        node_opcua_assert_1.assert(arguments.length === 0);
        debugLog("Subscription#terminate status", this.state);
        if (this.state === SubscriptionState.CLOSED) {
            // todo verify if asserting is required here
            return;
        }
        node_opcua_assert_1.assert(this.state !== SubscriptionState.CLOSED, "terminate already called ?");
        // stop timer
        this._stop_timer();
        debugLog("terminating Subscription  ", this.id, " with ", this.monitoredItemCount, " monitored items");
        // dispose all monitoredItem
        const keys = Object.keys(this.monitoredItems);
        for (const key of keys) {
            const status = this.removeMonitoredItem(key);
            node_opcua_assert_1.assert(status === node_opcua_status_code_1.StatusCodes.Good);
        }
        node_opcua_assert_1.assert(this.monitoredItemCount === 0);
        if (this.$session) {
            this.$session._unexposeSubscriptionDiagnostics(this);
        }
        this.state = SubscriptionState.CLOSED;
        /**
         * notify the subscription owner that the subscription has been terminated.
         * @event "terminated"
         */
        this.emit("terminated");
        this.publishEngine.on_close_subscription(this);
    }
    dispose() {
        if (doDebug) {
            debugLog("Subscription#dispose", this.id, this.monitoredItemCount);
        }
        node_opcua_assert_1.assert(this.monitoredItemCount === 0, "MonitoredItems haven't been  deleted first !!!");
        node_opcua_assert_1.assert(this.timerId === null, "Subscription timer haven't been terminated");
        if (this.subscriptionDiagnostics) {
            delete this.subscriptionDiagnostics.$subscription;
        }
        this.publishEngine = null;
        this._pending_notifications = [];
        this._sent_notifications = [];
        this.sessionId = node_opcua_nodeid_1.NodeId.nullNodeId;
        this.$session = undefined;
        this.removeAllListeners();
        Subscription.registry.unregister(this);
    }
    get aborted() {
        const session = this.$session;
        if (!session) {
            return true;
        }
        return session.aborted;
    }
    /**
     * number of pending notifications
     */
    get pendingNotificationsCount() {
        return this._pending_notifications ? this._pending_notifications.length : 0;
    }
    /**
     * is 'true' if there are pending notifications for this subscription. (i.e moreNotifications)
     */
    get hasPendingNotifications() {
        return this.pendingNotificationsCount > 0;
    }
    /**
     * number of sent notifications
     */
    get sentNotificationsCount() {
        return this._sent_notifications.length;
    }
    /**
     * number of monitored items handled by this subscription
     */
    get monitoredItemCount() {
        return Object.keys(this.monitoredItems).length;
    }
    /**
     * number of disabled monitored items.
     */
    get disabledMonitoredItemCount() {
        return _.reduce(_.values(this.monitoredItems), (cumul, monitoredItem) => {
            return cumul + ((monitoredItem.monitoringMode === node_opcua_service_subscription_2.MonitoringMode.Disabled) ? 1 : 0);
        }, 0);
    }
    /**
     * The number of unacknowledged messages saved in the republish queue.
     */
    get unacknowledgedMessageCount() {
        return this._unacknowledgedMessageCount;
    }
    /**
     * adjust monitored item sampling interval
     *  - an samplingInterval ===0 means that we use a event-base model ( no sampling)
     *  - otherwise the sampling is adjusted
     * @private
     */
    adjustSamplingInterval(samplingInterval, node) {
        if (samplingInterval < 0) {
            // - The value -1 indicates that the default sampling interval defined by the publishing
            //   interval of the Subscription is requested.
            // - Any negative number is interpreted as -1.
            samplingInterval = this.publishingInterval;
        }
        else if (samplingInterval === 0) {
            // OPCUA 1.0.3 Part 4 - 5.12.1.2
            // The value 0 indicates that the Server should use the fastest practical rate.
            // The fastest supported sampling interval may be equal to 0, which indicates
            // that the data item is exception-based rather than being sampled at some period.
            // An exception-based model means that the underlying system does not require
            // sampling and reports data changes.
            const dataValueSamplingInterval = node.readAttribute(node_opcua_address_space_2.SessionContext.defaultContext, node_opcua_data_model_2.AttributeIds.MinimumSamplingInterval);
            // TODO if attributeId === AttributeIds.Value : sampling interval required here
            if (dataValueSamplingInterval.statusCode === node_opcua_status_code_1.StatusCodes.Good) {
                // node provides a Minimum sampling interval ...
                samplingInterval = dataValueSamplingInterval.value.value;
                node_opcua_assert_1.assert(samplingInterval >= 0 && samplingInterval <= monitored_item_1.MonitoredItem.maximumSamplingInterval);
                // note : at this stage, a samplingInterval===0 means that the data item is really exception-based
            }
        }
        else if (samplingInterval < monitored_item_1.MonitoredItem.minimumSamplingInterval) {
            samplingInterval = monitored_item_1.MonitoredItem.minimumSamplingInterval;
        }
        else if (samplingInterval > monitored_item_1.MonitoredItem.maximumSamplingInterval) {
            // If the requested samplingInterval is higher than the
            // maximum sampling interval supported by the Server, the maximum sampling
            // interval is returned.
            samplingInterval = monitored_item_1.MonitoredItem.maximumSamplingInterval;
        }
        const node_minimumSamplingInterval = (node && node.minimumSamplingInterval)
            ? node.minimumSamplingInterval : 0;
        samplingInterval = Math.max(samplingInterval, node_minimumSamplingInterval);
        return samplingInterval;
    }
    /**
     * create a monitored item
     * @param addressSpace - address space
     * @param timestampsToReturn  - the timestamp to return
     * @param monitoredItemCreateRequest - the parameters describing the monitored Item to create
     */
    createMonitoredItem(addressSpace, timestampsToReturn, monitoredItemCreateRequest) {
        node_opcua_assert_1.assert(monitoredItemCreateRequest instanceof node_opcua_service_subscription_3.MonitoredItemCreateRequest);
        function handle_error(statusCode) {
            return new node_opcua_types_1.MonitoredItemCreateResult({ statusCode });
        }
        const itemToMonitor = monitoredItemCreateRequest.itemToMonitor;
        const node = addressSpace.findNode(itemToMonitor.nodeId);
        if (!node) {
            return handle_error(node_opcua_status_code_1.StatusCodes.BadNodeIdUnknown);
        }
        if (itemToMonitor.attributeId === node_opcua_data_model_2.AttributeIds.Value && !(node.nodeClass === node_opcua_data_model_1.NodeClass.Variable)) {
            // AttributeIds.Value is only valid for monitoring value of UAVariables.
            return handle_error(node_opcua_status_code_1.StatusCodes.BadAttributeIdInvalid);
        }
        if (itemToMonitor.attributeId === node_opcua_data_model_2.AttributeIds.INVALID) {
            return handle_error(node_opcua_status_code_1.StatusCodes.BadAttributeIdInvalid);
        }
        if (!itemToMonitor.indexRange.isValid()) {
            return handle_error(node_opcua_status_code_1.StatusCodes.BadIndexRangeInvalid);
        }
        // check dataEncoding applies only on Values
        if (itemToMonitor.dataEncoding.name && itemToMonitor.attributeId !== node_opcua_data_model_2.AttributeIds.Value) {
            return handle_error(node_opcua_status_code_1.StatusCodes.BadDataEncodingInvalid);
        }
        // check dataEncoding
        if (!node_opcua_data_model_3.isValidDataEncoding(itemToMonitor.dataEncoding)) {
            return handle_error(node_opcua_status_code_1.StatusCodes.BadDataEncodingUnsupported);
        }
        // check that item can be read by current user session
        // filter
        const requestedParameters = monitoredItemCreateRequest.requestedParameters;
        const filter = requestedParameters.filter;
        const statusCodeFilter = validate_filter_1.validateFilter(filter, itemToMonitor, node);
        if (statusCodeFilter !== node_opcua_status_code_1.StatusCodes.Good) {
            return handle_error(statusCodeFilter);
        }
        // xx var monitoringMode      = monitoredItemCreateRequest.monitoringMode; // Disabled, Sampling, Reporting
        // xx var requestedParameters = monitoredItemCreateRequest.requestedParameters;
        const monitoredItemCreateResult = this._createMonitoredItemStep2(timestampsToReturn, monitoredItemCreateRequest, node);
        node_opcua_assert_1.assert(monitoredItemCreateResult.statusCode === node_opcua_status_code_1.StatusCodes.Good);
        const monitoredItem = this.getMonitoredItem(monitoredItemCreateResult.monitoredItemId);
        node_opcua_assert_1.assert(monitoredItem);
        // TODO: fix old way to set node. !!!!
        monitoredItem.setNode(node);
        this.emit("monitoredItem", monitoredItem, itemToMonitor);
        this._createMonitoredItemStep3(monitoredItem, monitoredItemCreateRequest);
        return monitoredItemCreateResult;
    }
    /**
     * get a monitoredItem by Id.
     * @param monitoredItemId : the id of the monitored item to get.
     * @return the monitored item matching monitoredItemId
     */
    getMonitoredItem(monitoredItemId) {
        node_opcua_assert_1.assert(_.isFinite(monitoredItemId));
        return this.monitoredItems[monitoredItemId];
    }
    /**
     * remove a monitored Item from the subscription.
     * @param monitoredItemId : the id of the monitored item to get.
     */
    removeMonitoredItem(monitoredItemId) {
        debugLog("Removing monitoredIem ", monitoredItemId);
        node_opcua_assert_1.assert(_.isFinite(monitoredItemId));
        if (!this.monitoredItems.hasOwnProperty(monitoredItemId)) {
            return node_opcua_status_code_1.StatusCodes.BadMonitoredItemIdInvalid;
        }
        const monitoredItem = this.monitoredItems[monitoredItemId];
        monitoredItem.terminate();
        monitoredItem.dispose();
        /**
         *
         * notify that a monitored item has been removed from the subscription
         * @param monitoredItem {MonitoredItem}
         */
        this.emit("removeMonitoredItem", monitoredItem);
        delete this.monitoredItems[monitoredItemId];
        return node_opcua_status_code_1.StatusCodes.Good;
    }
    /**
     * rue if monitored Item have uncollected Notifications
     */
    get hasMonitoredItemNotifications() {
        if (this._hasMonitoredItemNotifications) {
            return true;
        }
        const keys = Object.keys(this.monitoredItems);
        const n = keys.length;
        for (let i = 0; i < n; i++) {
            const key = keys[i];
            const monitoredItem = this.monitoredItems[key];
            if (monitoredItem.hasMonitoredItemNotifications) {
                this._hasMonitoredItemNotifications = true;
                return true;
            }
        }
        return false;
    }
    get subscriptionId() {
        return this.id;
    }
    getMessageForSequenceNumber(sequenceNumber) {
        function filter_func(e) {
            return e.sequenceNumber === sequenceNumber;
        }
        const notification_message = _.find(this._sent_notifications, filter_func);
        if (!notification_message) {
            return null;
        }
        return notification_message;
    }
    /**
     * returns true if the notification has expired
     * @param notification
     */
    notificationHasExpired(notification) {
        node_opcua_assert_1.assert(notification.hasOwnProperty("start_tick"));
        node_opcua_assert_1.assert(_.isFinite(notification.start_tick + this.maxKeepAliveCount));
        return (notification.start_tick + this.maxKeepAliveCount) < this.publishIntervalCount;
    }
    /**
     *  returns in an array the sequence numbers of the notifications that haven't been
     *  acknowledged yet.
     */
    getAvailableSequenceNumbers() {
        const availableSequenceNumbers = getSequenceNumbers(this._sent_notifications);
        return availableSequenceNumbers;
    }
    /**
     * acknowledges a notification identified by its sequence number
     */
    acknowledgeNotification(sequenceNumber) {
        let foundIndex = -1;
        _.find(this._sent_notifications, (e, index) => {
            if (e.sequenceNumber === sequenceNumber) {
                foundIndex = index;
            }
        });
        if (foundIndex === -1) {
            if (doDebug) {
                debugLog(chalk_1.default.red("acknowledging sequence FAILED !!! "), chalk_1.default.cyan(sequenceNumber.toString()));
            }
            return node_opcua_status_code_1.StatusCodes.BadSequenceNumberUnknown;
        }
        else {
            if (doDebug) {
                debugLog(chalk_1.default.yellow("acknowledging sequence "), chalk_1.default.cyan(sequenceNumber.toString()));
            }
            this._sent_notifications.splice(foundIndex, 1);
            this._unacknowledgedMessageCount--;
            return node_opcua_status_code_1.StatusCodes.Good;
        }
    }
    /**
     * getMonitoredItems is used to get information about monitored items of a subscription.Its intended
     * use is defined in Part 4. This method is the implementation of the Standard OPCUA GetMonitoredItems Method.
     * from spec:
     * This method can be used to get the  list of monitored items in a subscription if CreateMonitoredItems
     * failed due to a network interruption and the client does not know if the creation succeeded in the server.
     *
     */
    getMonitoredItems() {
        const result = {
            clientHandles: [],
            serverHandles: [],
            statusCode: node_opcua_status_code_1.StatusCodes.Good
        };
        Object.keys(this.monitoredItems).forEach((monitoredItemId) => {
            const monitoredItem = this.getMonitoredItem(monitoredItemId);
            result.clientHandles.push(monitoredItem.clientHandle);
            // TODO:  serverHandle is defined anywhere in the OPCUA Specification 1.02
            //        I am not sure what shall be reported for serverHandle...
            //        using monitoredItem.monitoredItemId instead...
            //        May be a clarification in the OPCUA Spec is required.
            result.serverHandles.push(parseInt(monitoredItemId, 10));
        });
        return result;
    }
    /**
     * @private
     */
    resendInitialValues() {
        _.forEach(this.monitoredItems, (monitoredItem /*,monitoredItemId*/) => {
            monitoredItem.resendInitialValues();
        });
    }
    /**
     * @private
     */
    notifyTransfer() {
        // OPCUA UA Spec 1.0.3 : part 3 - page 82 - 5.13.7 TransferSubscriptions:
        // If the Server transfers the Subscription to the new Session, the Server shall issue
        // a StatusChangeNotification notificationMessage with the status code
        // Good_SubscriptionTransferred to the old Session.
        const subscription = this;
        debugLog(chalk_1.default.red(" Subscription => Notifying Transfer                                  "));
        const notificationData = [
            new node_opcua_service_subscription_2.StatusChangeNotification({
                status: node_opcua_status_code_1.StatusCodes.GoodSubscriptionTransferred
            })
        ];
        subscription.publishEngine.send_notification_message({
            moreNotifications: false,
            notificationData,
            sequenceNumber: subscription._get_next_sequence_number(),
            subscriptionId: subscription.id
        }, true);
    }
    /**
     *
     *  the server invokes the resetLifeTimeAndKeepAliveCounters method of the subscription
     *  when the server  has send a Publish Response, so that the subscription
     *  can reset its life time counter.
     *
     * @private
     */
    resetLifeTimeAndKeepAliveCounters() {
        this.resetLifeTimeCounter();
        this.resetKeepAliveCounter();
    }
    /**
     *  _publish_pending_notifications send a "notification" event:
     *
     * @private
     *
     */
    _publish_pending_notifications() {
        const publishEngine = this.publishEngine;
        const subscriptionId = this.id;
        // preconditions
        node_opcua_assert_1.assert(publishEngine.pendingPublishRequestCount > 0);
        node_opcua_assert_1.assert(this.hasPendingNotifications);
        // todo : get rid of this....
        this.emit("notification");
        const notificationMessage = this._popNotificationToSend().notification;
        this.emit("notificationMessage", notificationMessage);
        node_opcua_assert_1.assert(_.isArray(notificationMessage.notificationData));
        notificationMessage.notificationData.forEach((notificationData) => {
            if (notificationData instanceof node_opcua_service_subscription_2.DataChangeNotification) {
                this.subscriptionDiagnostics.dataChangeNotificationsCount += 1;
            }
            else if (notificationData instanceof node_opcua_service_subscription_2.EventNotificationList) {
                this.subscriptionDiagnostics.eventNotificationsCount += 1;
            }
            else {
                // TODO
            }
        });
        node_opcua_assert_1.assert(notificationMessage.hasOwnProperty("sequenceNumber"));
        node_opcua_assert_1.assert(notificationMessage.hasOwnProperty("notificationData"));
        const moreNotifications = (this.hasPendingNotifications);
        // update diagnostics
        if (this.subscriptionDiagnostics) {
            this.subscriptionDiagnostics.notificationsCount += 1;
            this.subscriptionDiagnostics.publishRequestCount += 1;
        }
        publishEngine.send_notification_message({
            moreNotifications,
            notificationData: notificationMessage.notificationData,
            sequenceNumber: notificationMessage.sequenceNumber,
            subscriptionId
        }, false);
        this.messageSent = true;
        this._unacknowledgedMessageCount++;
        this.resetLifeTimeAndKeepAliveCounters();
        if (doDebug) {
            debugLog("Subscription sending a notificationMessage subscriptionId=", subscriptionId, "sequenceNumber = ", notificationMessage.sequenceNumber.toString());
            // debugLog(notificationMessage.toString());
        }
        if (this.state !== SubscriptionState.CLOSED) {
            node_opcua_assert_1.assert(notificationMessage.notificationData.length > 0, "We are not expecting a keep-alive message here");
            this.state = SubscriptionState.NORMAL;
            debugLog("subscription " + this.id + chalk_1.default.bgYellow(" set to NORMAL"));
        }
    }
    process_subscription() {
        node_opcua_assert_1.assert(this.publishEngine.pendingPublishRequestCount > 0);
        if (!this.publishingEnabled) {
            // no publish to do, except keep alive
            this._process_keepAlive();
            return;
        }
        if (!this.hasPendingNotifications && this.hasMonitoredItemNotifications) {
            // collect notification from monitored items
            this._harvestMonitoredItems();
        }
        // let process them first
        if (this.hasPendingNotifications) {
            this._publish_pending_notifications();
            if (this.state === SubscriptionState.NORMAL && this.hasPendingNotifications) {
                // istanbul ignore next
                if (doDebug) {
                    debugLog("    -> pendingPublishRequestCount > 0 " +
                        "&& normal state => re-trigger tick event immediately ");
                }
                // let process an new publish request
                setImmediate(this._tick.bind(this));
            }
        }
        else {
            this._process_keepAlive();
        }
    }
    _get_future_sequence_number() {
        return this._sequence_number_generator ? this._sequence_number_generator.future() : 0;
    }
    _process_keepAlive() {
        // xx assert(!self.publishingEnabled || (!self.hasPendingNotifications && !self.hasMonitoredItemNotifications));
        this.increaseKeepAliveCounter();
        if (this.keepAliveCounterHasExpired) {
            if (this._sendKeepAliveResponse()) {
                this.resetLifeTimeAndKeepAliveCounters();
            }
            else {
                debugLog("     -> subscription.state === LATE , " +
                    "because keepAlive Response cannot be send due to lack of PublishRequest");
                this.state = SubscriptionState.LATE;
            }
        }
    }
    _stop_timer() {
        if (this.timerId) {
            debugLog(chalk_1.default.bgWhite.blue("Subscription#_stop_timer subscriptionId="), this.id);
            clearInterval(this.timerId);
            this.timerId = null;
        }
    }
    _start_timer() {
        debugLog(chalk_1.default.bgWhite.blue("Subscription#_start_timer  subscriptionId="), this.id, " publishingInterval = ", this.publishingInterval);
        node_opcua_assert_1.assert(this.timerId === null);
        // from the spec:
        // When a Subscription is created, the first Message is sent at the end of the first publishing cycle to
        // inform the Client that the Subscription is operational. A NotificationMessage is sent if there are
        // Notifications ready to be reported. If there are none, a keep-alive Message is sent instead that
        // contains a sequence number of 1, indicating that the first NotificationMessage has not yet been sent.
        // This is the only time a keep-alive Message is sent without waiting for the maximum keep-alive count
        // to be reached, as specified in (f) above.
        // make sure that a keep-alive Message will be send at the end of the first publishing cycle
        // if there are no Notifications ready.
        this._keep_alive_counter = this.maxKeepAliveCount;
        node_opcua_assert_1.assert(this.publishingInterval >= Subscription.minimumPublishingInterval);
        this.timerId = setInterval(this._tick.bind(this), this.publishingInterval);
    }
    // counter
    _get_next_sequence_number() {
        return this._sequence_number_generator ? this._sequence_number_generator.next() : 0;
    }
    /**
     * @private
     */
    _tick() {
        debugLog("Subscription#_tick  aborted=", this.aborted, "state=", this.state.toString());
        if (this.aborted) {
            // xx  console.log(" Log aborteds")
            // xx  // underlying channel has been aborted ...
            // xx self.publishEngine.cancelPendingPublishRequestBeforeChannelChange();
            // xx // let's still increase lifetime counter to detect timeout
        }
        if (this.state === SubscriptionState.CLOSED) {
            console.log("Warning: Subscription#_tick called while subscription is CLOSED");
            return;
        }
        this.discardOldSentNotifications();
        // istanbul ignore next
        if (doDebug) {
            debugLog((t(new Date()) + "  " + this._life_time_counter + "/" + this.lifeTimeCount +
                chalk_1.default.cyan("   Subscription#_tick")), "  processing subscriptionId=", this.id, "hasMonitoredItemNotifications = ", this.hasMonitoredItemNotifications, " publishingIntervalCount =", this.publishIntervalCount);
        }
        if (this.publishEngine._on_tick) {
            this.publishEngine._on_tick();
        }
        this.publishIntervalCount += 1;
        this.increaseLifeTimeCounter();
        if (this.lifeTimeHasExpired) {
            /* istanbul ignore next */
            if (doDebug) {
                debugLog(chalk_1.default.red.bold("Subscription " + this.id + " has expired !!!!! => Terminating"));
            }
            /**
             * notify the subscription owner that the subscription has expired by exceeding its life time.
             * @event expired
             *
             */
            this.emit("expired");
            // notify new terminated status only when subscription has timeout.
            debugLog("adding StatusChangeNotification notification message for BadTimeout subscription = ", this.id);
            this._addNotificationMessage([
                new node_opcua_service_subscription_2.StatusChangeNotification({ status: node_opcua_status_code_1.StatusCodes.BadTimeout })
            ]);
            // kill timer and delete monitored items and transfer pending notification messages
            this.terminate();
            return;
        }
        const publishEngine = this.publishEngine;
        // istanbul ignore next
        if (doDebug) {
            debugLog("Subscription#_tick  self._pending_notifications= ", this._pending_notifications.length);
        }
        if (publishEngine.pendingPublishRequestCount === 0 &&
            (this.hasPendingNotifications || this.hasMonitoredItemNotifications)) {
            // istanbul ignore next
            if (doDebug) {
                debugLog("subscription set to LATE  hasPendingNotifications = ", this.hasPendingNotifications, " hasMonitoredItemNotifications =", this.hasMonitoredItemNotifications);
            }
            this.state = SubscriptionState.LATE;
            return;
        }
        if (publishEngine.pendingPublishRequestCount > 0) {
            if (this.hasPendingNotifications) {
                // simply pop pending notification and send it
                this.process_subscription();
            }
            else if (this.hasMonitoredItemNotifications) {
                this.process_subscription();
            }
            else {
                this._process_keepAlive();
            }
        }
        else {
            this._process_keepAlive();
        }
    }
    /**
     * @private
     */
    _sendKeepAliveResponse() {
        const future_sequence_number = this._get_future_sequence_number();
        debugLog("     -> Subscription#_sendKeepAliveResponse subscriptionId", this.id);
        if (this.publishEngine.send_keep_alive_response(this.id, future_sequence_number)) {
            this.messageSent = true;
            /**
             * notify the subscription owner that a keepalive message has to be sent.
             * @event keepalive
             *
             */
            this.emit("keepalive", future_sequence_number);
            this.state = SubscriptionState.KEEPALIVE;
            return true;
        }
        return false;
    }
    /**
     * Reset the Lifetime Counter Variable to the value specified for the lifetime of a Subscription in
     * the CreateSubscription Service( 5.13.2).
     * @private
     */
    resetKeepAliveCounter() {
        this._keep_alive_counter = 0;
        // istanbul ignore next
        if (doDebug) {
            debugLog("     -> subscriptionId", this.id, " Resetting keepAliveCounter = ", this._keep_alive_counter, this.maxKeepAliveCount);
        }
    }
    /**
     * @private
     */
    increaseKeepAliveCounter() {
        this._keep_alive_counter += 1;
        // istanbul ignore next
        if (doDebug) {
            debugLog("     -> subscriptionId", this.id, " Increasing keepAliveCounter = ", this._keep_alive_counter, this.maxKeepAliveCount);
        }
    }
    /**
     * @private
     */
    _addNotificationMessage(notificationData) {
        node_opcua_assert_1.assert(_.isArray(notificationData));
        node_opcua_assert_1.assert(notificationData.length === 1 || notificationData.length === 2); // as per spec part 3.
        // istanbul ignore next
        if (doDebug) {
            debugLog(chalk_1.default.yellow("Subscription#_addNotificationMessage"), notificationData.toString());
        }
        const subscription = this;
        node_opcua_assert_1.assert(_.isObject(notificationData[0]));
        assert_validNotificationData(notificationData[0]);
        if (notificationData.length === 2) {
            assert_validNotificationData(notificationData[1]);
        }
        const notification_message = new node_opcua_service_subscription_2.NotificationMessage({
            notificationData,
            publishTime: new Date(),
            sequenceNumber: this._get_next_sequence_number()
        });
        subscription._pending_notifications.push({
            notification: notification_message,
            publishTime: new Date(),
            sequenceNumber: notification_message.sequenceNumber,
            start_tick: subscription.publishIntervalCount
        });
        debugLog("pending notification to send ", subscription._pending_notifications.length);
    }
    /**
     * Extract the next Notification that is ready to be sent to the client.
     * @return the Notification to send._pending_notifications
     */
    _popNotificationToSend() {
        node_opcua_assert_1.assert(this._pending_notifications.length > 0);
        const notification_message = this._pending_notifications.shift();
        if (!notification_message) {
            throw new Error("internal error");
        }
        this._sent_notifications.push(notification_message);
        return notification_message;
    }
    /**
     * discardOldSentNotification find all sent notification message that have expired keep-alive
     * and destroy them.
     * @private
     *
     * Subscriptions maintain a retransmission queue of sent  NotificationMessages.
     * NotificationMessages are retained in this queue until they are acknowledged or until they have
     * been in the queue for a minimum of one keep-alive interval.
     *
     */
    discardOldSentNotifications() {
        // Sessions maintain a retransmission queue of sent NotificationMessages. NotificationMessages
        // are retained in this queue until they are acknowledged. The Session shall maintain a
        // retransmission queue size of at least two times the number of Publish requests per Session the
        // Server supports.  Clients are required to acknowledge NotificationMessages as they are received. In the
        // case of a retransmission queue overflow, the oldest sent NotificationMessage gets deleted. If a
        // Subscription is transferred to another Session, the queued NotificationMessages for this
        // Subscription are moved from the old to the new Session.
        if (maxNotificationMessagesInQueue <= this._sent_notifications.length) {
            debugLog("discardOldSentNotifications = ", this._sent_notifications.length);
            this._sent_notifications.splice(this._sent_notifications.length - maxNotificationMessagesInQueue);
        }
        //
        // var arr = _.filter(self._sent_notifications,function(notification){
        //   return self.notificationHasExpired(notification);
        // });
        // var results = arr.map(function(notification){
        //    return self.acknowledgeNotification(notification.sequenceNumber);
        // });
        // xx return results;
    }
    /**
     * @param timestampsToReturn
     * @param monitoredItemCreateRequest
     * @param node
     * @private
     */
    _createMonitoredItemStep2(timestampsToReturn, monitoredItemCreateRequest, node) {
        // note : most of the parameter inconsistencies shall have been handled by the caller
        // any error here will raise an assert here
        node_opcua_assert_1.assert(monitoredItemCreateRequest instanceof node_opcua_service_subscription_3.MonitoredItemCreateRequest);
        const itemToMonitor = monitoredItemCreateRequest.itemToMonitor;
        // xx check if attribute Id invalid (we only support Value or EventNotifier )
        // xx assert(itemToMonitor.attributeId !== AttributeIds.INVALID);
        this.monitoredItemIdCounter += 1;
        const monitoredItemId = getNextMonitoredItemId();
        const requestedParameters = monitoredItemCreateRequest.requestedParameters;
        // adjust requestedParameters.samplingInterval
        requestedParameters.samplingInterval = this.adjustSamplingInterval(requestedParameters.samplingInterval, node);
        // reincorporate monitoredItemId and itemToMonitor into the requestedParameters
        const options = requestedParameters;
        options.monitoredItemId = monitoredItemId;
        options.itemToMonitor = itemToMonitor;
        const monitoredItem = new monitored_item_1.MonitoredItem(options);
        monitoredItem.timestampsToReturn = timestampsToReturn;
        monitoredItem.$subscription = this;
        node_opcua_assert_1.assert(monitoredItem.monitoredItemId === monitoredItemId);
        this.monitoredItems[monitoredItemId] = monitoredItem;
        const filterResult = _process_filter(node, requestedParameters.filter);
        const monitoredItemCreateResult = new node_opcua_types_1.MonitoredItemCreateResult({
            filterResult,
            monitoredItemId,
            revisedQueueSize: monitoredItem.queueSize,
            revisedSamplingInterval: monitoredItem.samplingInterval,
            statusCode: node_opcua_status_code_1.StatusCodes.Good
        });
        return monitoredItemCreateResult;
    }
    /**
     *
     * @param monitoredItem
     * @param monitoredItemCreateRequest
     * @private
     */
    _createMonitoredItemStep3(monitoredItem, monitoredItemCreateRequest) {
        node_opcua_assert_1.assert(monitoredItem.monitoringMode === node_opcua_service_subscription_2.MonitoringMode.Invalid);
        node_opcua_assert_1.assert(_.isFunction(monitoredItem.samplingFunc));
        const monitoringMode = monitoredItemCreateRequest.monitoringMode; // Disabled, Sampling, Reporting
        monitoredItem.setMonitoringMode(monitoringMode);
    }
    // collect DataChangeNotification
    _collectNotificationData() {
        let notifications = [];
        // reset cache ...
        this._hasMonitoredItemNotifications = false;
        const all_notifications = new Dequeue();
        // visit all monitored items
        const keys = Object.keys(this.monitoredItems);
        const n = keys.length;
        for (let i = 0; i < n; i++) {
            const key = keys[i];
            const monitoredItem = this.monitoredItems[key];
            notifications = monitoredItem.extractMonitoredItemNotifications();
            add_all_in(notifications, all_notifications);
        }
        const notificationsMessage = [];
        while (all_notifications.length > 0) {
            // split into one or multiple dataChangeNotification with no more than
            //  self.maxNotificationsPerPublish monitoredItems
            const notifications_chunk = extract_notifications_chunk(all_notifications, this.maxNotificationsPerPublish);
            // separate data for DataChangeNotification (MonitoredItemNotification) from data for
            // EventNotificationList(EventFieldList)
            const dataChangedNotificationData = notifications_chunk.filter(filter_instanceof.bind(null, node_opcua_types_1.MonitoredItemNotification));
            const eventNotificationListData = notifications_chunk.filter(filter_instanceof.bind(null, node_opcua_types_1.EventFieldList));
            node_opcua_assert_1.assert(notifications_chunk.length ===
                dataChangedNotificationData.length + eventNotificationListData.length);
            notifications = [];
            // add dataChangeNotification
            if (dataChangedNotificationData.length) {
                const dataChangeNotification = new node_opcua_service_subscription_2.DataChangeNotification({
                    diagnosticInfos: [],
                    monitoredItems: dataChangedNotificationData
                });
                notifications.push(dataChangeNotification);
            }
            // add dataChangeNotification
            if (eventNotificationListData.length) {
                const eventNotificationList = new node_opcua_service_subscription_2.EventNotificationList({
                    events: eventNotificationListData
                });
                notifications.push(eventNotificationList);
            }
            node_opcua_assert_1.assert(notifications.length === 1 || notifications.length === 2);
            notificationsMessage.push(notifications);
        }
        node_opcua_assert_1.assert(notificationsMessage instanceof Array);
        return notificationsMessage;
    }
    _harvestMonitoredItems() {
        // Only collect data change notification for the time being
        const notificationData = this._collectNotificationData();
        node_opcua_assert_1.assert(notificationData instanceof Array);
        // istanbul ignore next
        if (doDebug) {
            debugLog("Subscription#_harvestMonitoredItems =>", notificationData.length);
        }
        notificationData.forEach((notificationMessage) => {
            this._addNotificationMessage(notificationMessage);
        });
        this._hasMonitoredItemNotifications = false;
    }
}
exports.Subscription = Subscription;
Subscription.minimumPublishingInterval = 50; // fastest possible
Subscription.defaultPublishingInterval = 1000; // one second
Subscription.maximumPublishingInterval = 1000 * 60 * 60 * 24 * 15; // 15 days
Subscription.registry = new node_opcua_object_registry_1.ObjectRegistry();
/**
 * extract up to maxNotificationsPerPublish notifications
 * @param the full array of monitored items
 * @param maxNotificationsPerPublish  the maximum number of notification to extract
 * @return an extract of array of monitored item matching at most maxNotificationsPerPublish
 * @private
 */
function extract_notifications_chunk(monitoredItems, maxNotificationsPerPublish) {
    let n = maxNotificationsPerPublish === 0 ?
        monitoredItems.length :
        Math.min(monitoredItems.length, maxNotificationsPerPublish);
    const chunk_monitoredItems = [];
    while (n) {
        chunk_monitoredItems.push(monitoredItems.shift());
        n--;
    }
    return chunk_monitoredItems;
}
function add_all_in(notifications, allNotifications) {
    for (const n of notifications) {
        allNotifications.push(n);
    }
}
function filter_instanceof(Class, e) {
    return (e instanceof Class);
}
node_opcua_assert_1.assert(Subscription.maximumPublishingInterval < 2147483647, "maximumPublishingInterval cannot exceed (2**31-1) ms ");
//# sourceMappingURL=server_subscription.js.map