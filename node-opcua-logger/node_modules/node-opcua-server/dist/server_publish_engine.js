"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * @module node-opcua-server
 */
// tslint:disable:no-console
const chalk_1 = require("chalk");
const events_1 = require("events");
const _ = require("underscore");
const node_opcua_assert_1 = require("node-opcua-assert");
const node_opcua_debug_1 = require("node-opcua-debug");
const node_opcua_object_registry_1 = require("node-opcua-object-registry");
const node_opcua_status_code_1 = require("node-opcua-status-code");
const node_opcua_types_1 = require("node-opcua-types");
const server_subscription_1 = require("./server_subscription");
const server_subscription_2 = require("./server_subscription");
const debugLog = node_opcua_debug_1.make_debugLog(__filename);
const doDebug = node_opcua_debug_1.checkDebugFlag(__filename);
function traceLog(...args) {
    if (!doDebug) {
        return;
    }
    const a = args.map((x) => x);
    a.unshift(chalk_1.default.yellow(" TRACE "));
    console.log.apply(null, a);
}
function _assertValidPublishData(publishData) {
    node_opcua_assert_1.assert(publishData.request instanceof node_opcua_types_1.PublishRequest);
    node_opcua_assert_1.assert(_.isArray(publishData.results));
    node_opcua_assert_1.assert(_.isFunction(publishData.callback));
}
function dummy_function() {
    /* empty */
}
function prepare_timeout_info(request) {
    // record received time
    request.requestHeader.timestamp = request.requestHeader.timestamp || new Date();
    node_opcua_assert_1.assert(request.requestHeader.timeoutHint >= 0);
    request.received_time = Date.now();
    request.timeout_time = (request.requestHeader.timeoutHint > 0)
        ? request.received_time + request.requestHeader.timeoutHint : 0;
}
function addDate(date, delta) {
    return new Date(date.getTime() + delta);
}
function timeout_filter(publishData) {
    const request = publishData.request;
    const results = publishData.results;
    if (!request.requestHeader.timeoutHint) {
        // no limits
        return false;
    }
    const expected_timeout_time = addDate(request.requestHeader.timestamp, request.requestHeader.timeoutHint);
    return expected_timeout_time.getTime() < Date.now();
}
/***
 *  a Publish Engine for a given session
 */
class ServerSidePublishEngine extends events_1.EventEmitter {
    constructor(options) {
        super();
        this.maxPublishRequestInQueue = 0;
        this.isSessionClosed = false;
        this._publish_request_queue = [];
        this._publish_response_queue = [];
        this._closed_subscriptions = [];
        options = options || {};
        ServerSidePublishEngine.registry.register(this);
        // a queue of pending publish request send by the client
        // waiting to be used by the server to send notification
        this._publish_request_queue = []; // { request :/*PublishRequest*/{},
        // results: [/*subscriptionAcknowledgements*/] , callback}
        this._publish_response_queue = []; // /* PublishResponse */
        this._subscriptions = {};
        // _closed_subscriptions contains a collection of Subscription that
        // have  expired but that still need to send some pending notification
        // to the client.
        // Once publish requests will be received from the  client
        // the notifications of those subscriptions will be processed so that
        // they can be properly disposed.
        this._closed_subscriptions = [];
        this.maxPublishRequestInQueue = options.maxPublishRequestInQueue || 100;
        this.isSessionClosed = false;
    }
    /**
     * @private
     */
    static transferSubscriptionsToOrphan(srcPublishEngine, destPublishEngine) {
        debugLog(chalk_1.default.yellow("ServerSidePublishEngine#transferSubscriptionsToOrphan! " +
            "start transferring long live subscriptions to orphan"));
        const tmp = srcPublishEngine._subscriptions;
        _.forEach(tmp, (subscription) => {
            node_opcua_assert_1.assert(subscription.publishEngine === srcPublishEngine);
            if (subscription.$session) {
                subscription.$session._unexposeSubscriptionDiagnostics(subscription);
            }
            else {
                console.warn("Warning:  subscription", subscription.id, " has no session attached!!!");
            }
            ServerSidePublishEngine.transferSubscription(subscription, destPublishEngine, false);
        });
        node_opcua_assert_1.assert(srcPublishEngine.subscriptionCount === 0);
        debugLog(chalk_1.default.yellow("ServerSidePublishEngine#transferSubscriptionsToOrphan! " +
            "end transferring long lived subscriptions to orphan"));
    }
    /**
     * @param subscription
     * @param destPublishEngine
     * @param sendInitialValues true if initial values should be sent
     * @private
     */
    static transferSubscription(subscription, destPublishEngine, sendInitialValues) {
        const srcPublishEngine = subscription.publishEngine;
        node_opcua_assert_1.assert(!destPublishEngine.getSubscriptionById(subscription.id));
        node_opcua_assert_1.assert(srcPublishEngine.getSubscriptionById(subscription.id));
        debugLog(chalk_1.default.cyan("ServerSidePublishEngine.transferSubscription live subscriptionId ="), subscription.subscriptionId);
        subscription.notifyTransfer();
        destPublishEngine.add_subscription(srcPublishEngine.detach_subscription(subscription));
        subscription.resetLifeTimeCounter();
        if (sendInitialValues) {
            subscription.resendInitialValues();
        }
        node_opcua_assert_1.assert(destPublishEngine.getSubscriptionById(subscription.id));
        node_opcua_assert_1.assert(!srcPublishEngine.getSubscriptionById(subscription.id));
    }
    dispose() {
        debugLog("ServerSidePublishEngine#dispose");
        // force deletion of publish response not sent
        this._publish_response_queue = [];
        node_opcua_assert_1.assert(this._publish_response_queue.length === 0, "self._publish_response_queue !=0");
        this._publish_response_queue = [];
        node_opcua_assert_1.assert(Object.keys(this._subscriptions).length === 0, "self._subscriptions count!=0");
        this._subscriptions = {};
        node_opcua_assert_1.assert(this._closed_subscriptions.length === 0, "self._closed_subscriptions count!=0");
        this._closed_subscriptions = [];
        ServerSidePublishEngine.registry.unregister(this);
    }
    process_subscriptionAcknowledgements(subscriptionAcknowledgements) {
        // process acknowledgements
        subscriptionAcknowledgements = subscriptionAcknowledgements || [];
        const results = subscriptionAcknowledgements.map((subscriptionAcknowledgement) => {
            const subscription = this.getSubscriptionById(subscriptionAcknowledgement.subscriptionId);
            if (!subscription) {
                return node_opcua_status_code_1.StatusCodes.BadSubscriptionIdInvalid;
            }
            return subscription.acknowledgeNotification(subscriptionAcknowledgement.sequenceNumber);
        });
        return results;
    }
    /**
     * get a array of subscription handled by the publish engine.
     */
    get subscriptions() {
        return _.map(this._subscriptions, (x) => x);
    }
    /**
     */
    add_subscription(subscription) {
        node_opcua_assert_1.assert(subscription instanceof server_subscription_1.Subscription);
        node_opcua_assert_1.assert(_.isFinite(subscription.id));
        subscription.publishEngine = subscription.publishEngine || this;
        node_opcua_assert_1.assert(subscription.publishEngine === this);
        node_opcua_assert_1.assert(!this._subscriptions[subscription.id]);
        debugLog("ServerSidePublishEngine#add_subscription -  adding subscription with Id:", subscription.id);
        this._subscriptions[subscription.id] = subscription;
        return subscription;
    }
    detach_subscription(subscription) {
        node_opcua_assert_1.assert(subscription instanceof server_subscription_1.Subscription);
        node_opcua_assert_1.assert(_.isFinite(subscription.id));
        node_opcua_assert_1.assert(subscription.publishEngine === this);
        node_opcua_assert_1.assert(this._subscriptions[subscription.id] === subscription);
        delete this._subscriptions[subscription.id];
        subscription.publishEngine = null;
        debugLog("ServerSidePublishEngine#detach_subscription detaching subscription with Id:", subscription.id);
        return subscription;
    }
    /**
     */
    shutdown() {
        if (this.subscriptionCount !== 0) {
            debugLog(chalk_1.default.red("Shutting down pending subscription"));
            this.subscriptions.map((subscription) => subscription.terminate());
        }
        node_opcua_assert_1.assert(this.subscriptionCount === 0, "subscription shall be removed first before you can shutdown a publish engine");
        debugLog("ServerSidePublishEngine#shutdown");
        // purge _publish_request_queue
        this._publish_request_queue = [];
        // purge _publish_response_queue
        this._publish_response_queue = [];
        // purge self._closed_subscriptions
        this._closed_subscriptions.map((subscription) => subscription.dispose());
        this._closed_subscriptions = [];
    }
    /**
     * number of pending PublishRequest available in queue
     */
    get pendingPublishRequestCount() {
        return this._publish_request_queue.length;
    }
    /**
     * number of subscriptions
     */
    get subscriptionCount() {
        return Object.keys(this._subscriptions).length;
    }
    get pendingClosedSubscriptionCount() {
        return this._closed_subscriptions.length;
    }
    get currentMonitoredItemCount() {
        const result = _.reduce(this._subscriptions, (cumul, subscription) => {
            return cumul + subscription.monitoredItemCount;
        }, 0);
        node_opcua_assert_1.assert(_.isFinite(result));
        return result;
    }
    on_close_subscription(subscription) {
        debugLog("ServerSidePublishEngine#on_close_subscription", subscription.id);
        node_opcua_assert_1.assert(this._subscriptions.hasOwnProperty(subscription.id));
        node_opcua_assert_1.assert(subscription.publishEngine === this, "subscription must belong to this ServerSidePublishEngine");
        if (subscription.hasPendingNotifications) {
            debugLog("ServerSidePublishEngine#on_close_subscription storing subscription", subscription.id, " to _closed_subscriptions because it has pending notification");
            this._closed_subscriptions.push(subscription);
        }
        else {
            debugLog("ServerSidePublishEngine#on_close_subscription disposing subscription", subscription.id);
            // subscription is no longer needed
            subscription.dispose();
        }
        delete this._subscriptions[subscription.id];
        if (this.subscriptionCount === 0) {
            while (this._feed_closed_subscription()) {
                /* keep looping */
            }
            this.cancelPendingPublishRequest();
        }
    }
    /**
     * retrieve a subscription by id.
     * @param subscriptionId
     * @return Subscription
     */
    getSubscriptionById(subscriptionId) {
        return this._subscriptions[subscriptionId.toString()];
    }
    findSubscriptionWaitingForFirstPublish() {
        // find all subscriptions that are late and sort them by urgency
        let subscriptions_waiting_for_first_reply = _.filter(this._subscriptions, (subscription) => {
            return !subscription.messageSent && subscription.state === server_subscription_2.SubscriptionState.LATE;
        });
        if (subscriptions_waiting_for_first_reply.length) {
            subscriptions_waiting_for_first_reply = _(subscriptions_waiting_for_first_reply).sortBy("timeToExpiration");
            debugLog("Some subscriptions with messageSent === false ");
            return subscriptions_waiting_for_first_reply[0];
        }
        return null;
    }
    findLateSubscriptions() {
        return _.filter(this._subscriptions, (subscription) => {
            return subscription.state === server_subscription_2.SubscriptionState.LATE
                && subscription.publishingEnabled; // && subscription.hasMonitoredItemNotifications;
        });
    }
    get hasLateSubscriptions() {
        return this.findLateSubscriptions().length > 0;
    }
    findLateSubscriptionSortedByPriority() {
        const late_subscriptions = this.findLateSubscriptions();
        if (late_subscriptions.length === 0) {
            return null;
        }
        late_subscriptions.sort(compare_subscriptions);
        // istanbul ignore next
        if (doDebug) {
            debugLog(late_subscriptions.map((s) => "[ id = " + s.id +
                " prio=" + s.priority +
                " t=" + s.timeToExpiration +
                " ka=" + s.timeToKeepAlive +
                " m?=" + s.hasMonitoredItemNotifications + "]").join(" \n"));
        }
        return late_subscriptions[late_subscriptions.length - 1];
    }
    findLateSubscriptionsSortedByAge() {
        let late_subscriptions = this.findLateSubscriptions();
        late_subscriptions = _(late_subscriptions).sortBy("timeToExpiration");
        return late_subscriptions;
    }
    cancelPendingPublishRequestBeforeChannelChange() {
        this._cancelPendingPublishRequest(node_opcua_status_code_1.StatusCodes.BadSecureChannelClosed);
    }
    onSessionClose() {
        this.isSessionClosed = true;
        this._cancelPendingPublishRequest(node_opcua_status_code_1.StatusCodes.BadSessionClosed);
    }
    /**
     * @private
     */
    cancelPendingPublishRequest() {
        node_opcua_assert_1.assert(this.subscriptionCount === 0);
        this._cancelPendingPublishRequest(node_opcua_status_code_1.StatusCodes.BadNoSubscription);
    }
    /**
     *
     * @param request
     * @param callback
     * @private
     */
    _on_PublishRequest(request, callback) {
        // xx console.log("#_on_PublishRequest self._publish_request_queue.length before ",
        // self._publish_request_queue.length);
        callback = callback || dummy_function;
        if (!(request instanceof node_opcua_types_1.PublishRequest)) {
            throw new Error("Internal error : expecting a Publish Request here");
        }
        node_opcua_assert_1.assert(_.isFunction(callback));
        const subscriptionAckResults = this.process_subscriptionAcknowledgements(request.subscriptionAcknowledgements || []);
        const publishData = {
            callback,
            request,
            results: subscriptionAckResults
        };
        if (this._process_pending_publish_response(publishData)) {
            console.log(" PENDING RESPONSE HAS BEEN PROCESSED !");
            return;
        }
        if (this.isSessionClosed) {
            traceLog("server has received a PublishRequest but session is Closed");
            this.send_error_for_request(publishData, node_opcua_status_code_1.StatusCodes.BadSessionClosed);
        }
        else if (this.subscriptionCount === 0) {
            if (this._closed_subscriptions.length > 0 && this._closed_subscriptions[0].hasPendingNotifications) {
                const verif = this._publish_request_queue.length;
                // add the publish request to the queue for later processing
                this._publish_request_queue.push(publishData);
                const processed = this._feed_closed_subscription();
                node_opcua_assert_1.assert(verif === this._publish_request_queue.length);
                node_opcua_assert_1.assert(processed);
                return;
            }
            traceLog("server has received a PublishRequest but has no subscription opened");
            this.send_error_for_request(publishData, node_opcua_status_code_1.StatusCodes.BadNoSubscription);
        }
        else {
            prepare_timeout_info(request);
            // add the publish request to the queue for later processing
            this._publish_request_queue.push(publishData);
            debugLog(chalk_1.default.bgWhite.red("Adding a PublishRequest to the queue "), this._publish_request_queue.length);
            this._feed_late_subscription();
            this._feed_closed_subscription();
            this._handle_too_many_requests();
        }
    }
    _feed_late_subscription() {
        if (!this.pendingPublishRequestCount) {
            return;
        }
        const starving_subscription = this.findSubscriptionWaitingForFirstPublish()
            || this.findLateSubscriptionSortedByPriority();
        if (starving_subscription) {
            debugLog(chalk_1.default.bgWhite.red("feeding most late subscription subscriptionId  = "), starving_subscription.id);
            starving_subscription.process_subscription();
        }
    }
    _feed_closed_subscription() {
        if (!this.pendingPublishRequestCount) {
            return false;
        }
        debugLog("ServerSidePublishEngine#_feed_closed_subscription");
        const closed_subscription = this._closed_subscriptions.shift();
        if (closed_subscription) {
            traceLog("_feed_closed_subscription for closed_subscription ", closed_subscription.id);
            if (closed_subscription.hasPendingNotifications) {
                closed_subscription._publish_pending_notifications();
                // now closed_subscription can be disposed
                closed_subscription.dispose();
                return true;
            }
        }
        return false;
    }
    send_error_for_request(publishData, statusCode) {
        _assertValidPublishData(publishData);
        this.send_response_for_request(publishData, new node_opcua_types_1.PublishResponse({
            responseHeader: { serviceResult: statusCode }
        }));
    }
    _cancelPendingPublishRequest(statusCode) {
        debugLog(chalk_1.default.red("Cancelling pending PublishRequest with statusCode  "), statusCode.toString(), " length =", this._publish_request_queue.length);
        for (const publishData of this._publish_request_queue) {
            this.send_error_for_request(publishData, statusCode);
        }
        this._publish_request_queue = [];
    }
    _handle_too_many_requests() {
        if (this.pendingPublishRequestCount > this.maxPublishRequestInQueue) {
            traceLog("server has received too many PublishRequest", this.pendingPublishRequestCount, "/", this.maxPublishRequestInQueue);
            node_opcua_assert_1.assert(this.pendingPublishRequestCount === (this.maxPublishRequestInQueue + 1));
            // When a Server receives a new Publish request that exceeds its limit it shall de-queue the oldest Publish
            // request and return a response with the result set to Bad_TooManyPublishRequests.
            // dequeue oldest request
            const publishData = this._publish_request_queue.shift();
            this.send_error_for_request(publishData, node_opcua_status_code_1.StatusCodes.BadTooManyPublishRequests);
        }
    }
    /**
     * call by a subscription when no notification message is available after the keep alive delay has
     * expired.
     *
     * @method send_keep_alive_response
     * @param subscriptionId
     * @param future_sequence_number
     * @return true if a publish response has been sent
     */
    send_keep_alive_response(subscriptionId, future_sequence_number) {
        //  this keep-alive Message informs the Client that the Subscription is still active.
        //  Each keep-alive Message is a response to a Publish request in which the  notification Message
        //  parameter does not contain any Notifications and that contains the sequence number of the next
        //  Notification Message that is to be sent.
        const subscription = this.getSubscriptionById(subscriptionId);
        /* istanbul ignore next */
        if (!subscription) {
            traceLog("send_keep_alive_response  => invalid subscriptionId = ", subscriptionId);
            return false;
        }
        if (this.pendingPublishRequestCount === 0) {
            return false;
        }
        const sequenceNumber = future_sequence_number;
        this.send_notification_message({
            moreNotifications: false,
            notificationData: [],
            sequenceNumber,
            subscriptionId
        }, false);
        return true;
    }
    _on_tick() {
        this._cancelTimeoutRequests();
    }
    _cancelTimeoutRequests() {
        if (this._publish_request_queue.length === 0) {
            return;
        }
        // filter out timeout requests
        const partition = _.partition(this._publish_request_queue, timeout_filter);
        this._publish_request_queue = partition[1]; // still valid
        const invalid_published_request = partition[0];
        invalid_published_request.forEach((publishData) => {
            console.log(chalk_1.default.cyan(" CANCELING TIMEOUT PUBLISH REQUEST "));
            const response = new node_opcua_types_1.PublishResponse({
                responseHeader: { serviceResult: node_opcua_status_code_1.StatusCodes.BadTimeout }
            });
            this.send_response_for_request(publishData, response);
        });
    }
    /**
     * @method send_notification_message
     * @param param
     * @param param.subscriptionId
     * @param param.sequenceNumber
     * @param param.notificationData
     * @param param.availableSequenceNumbers
     * @param param.moreNotifications
     * @param force                          push response in queue until next publish Request is received
     * @private
     */
    send_notification_message(param, force) {
        node_opcua_assert_1.assert(this.pendingPublishRequestCount > 0 || force);
        node_opcua_assert_1.assert(!param.hasOwnProperty("availableSequenceNumbers"));
        node_opcua_assert_1.assert(param.hasOwnProperty("subscriptionId"));
        node_opcua_assert_1.assert(param.hasOwnProperty("sequenceNumber"));
        node_opcua_assert_1.assert(param.hasOwnProperty("notificationData"));
        node_opcua_assert_1.assert(param.hasOwnProperty("moreNotifications"));
        const subscription = this.getSubscriptionById(param.subscriptionId);
        const subscriptionId = param.subscriptionId;
        const sequenceNumber = param.sequenceNumber;
        const notificationData = param.notificationData;
        const moreNotifications = param.moreNotifications;
        const availableSequenceNumbers = subscription ? subscription.getAvailableSequenceNumbers() : [];
        const response = new node_opcua_types_1.PublishResponse({
            availableSequenceNumbers,
            moreNotifications,
            notificationMessage: {
                notificationData,
                publishTime: new Date(),
                sequenceNumber
            },
            subscriptionId
        });
        if (this.pendingPublishRequestCount === 0) {
            console.log(chalk_1.default.bgRed.white.bold(" -------------------------------- PUSHING PUBLISH RESPONSE FOR LATE ANSWER !"));
            this._publish_response_queue.push(response);
        }
        else {
            const publishData = this._publish_request_queue.shift();
            this.send_response_for_request(publishData, response);
        }
    }
    _process_pending_publish_response(publishData) {
        _assertValidPublishData(publishData);
        if (this._publish_response_queue.length === 0) {
            // no pending response to send
            return false;
        }
        node_opcua_assert_1.assert(this._publish_request_queue.length === 0);
        const response = this._publish_response_queue.shift();
        this.send_response_for_request(publishData, response);
        return true;
    }
    send_response_for_request(publishData, response) {
        _assertValidPublishData(publishData);
        // xx assert(response.responseHeader.requestHandle !== 0,"expecting a valid requestHandle");
        response.results = publishData.results;
        response.responseHeader.requestHandle = publishData.request.requestHeader.requestHandle;
        publishData.callback(publishData.request, response);
    }
}
exports.ServerSidePublishEngine = ServerSidePublishEngine;
ServerSidePublishEngine.registry = new node_opcua_object_registry_1.ObjectRegistry();
function compare_subscriptions(s1, s2) {
    if (s1.priority === s2.priority) {
        return s1.timeToExpiration < s2.timeToExpiration ? 1 : 0;
    }
    return s1.priority > s2.priority ? 1 : 0;
}
//# sourceMappingURL=server_publish_engine.js.map