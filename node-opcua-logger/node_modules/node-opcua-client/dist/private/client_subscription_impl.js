"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * @module node-opcua-client-private
 */
// tslint:disable:unified-signatures
const async = require("async");
const chalk_1 = require("chalk");
const events_1 = require("events");
const _ = require("underscore");
const node_opcua_assert_1 = require("node-opcua-assert");
const node_opcua_data_model_1 = require("node-opcua-data-model");
const node_opcua_debug_1 = require("node-opcua-debug");
const node_opcua_nodeid_1 = require("node-opcua-nodeid");
const node_opcua_service_read_1 = require("node-opcua-service-read");
const node_opcua_service_subscription_1 = require("node-opcua-service-subscription");
const node_opcua_status_code_1 = require("node-opcua-status-code");
const utils = require("node-opcua-utils");
const client_subscription_1 = require("../client_subscription");
const client_monitored_item_group_impl_1 = require("./client_monitored_item_group_impl");
const client_monitored_item_impl_1 = require("./client_monitored_item_impl");
const debugLog = node_opcua_debug_1.make_debugLog(__filename);
const doDebug = node_opcua_debug_1.checkDebugFlag(__filename);
const warningLog = debugLog;
const PENDING_SUBSCRIPTON_ID = 0xC0CAC01A;
const TERMINTATED_SUBSCRIPTION_ID = 0xC0CAC01B;
const TERMINATING_SUBSCRIPTION_ID = 0xC0CAC01C;
class ClientSubscriptionImpl extends events_1.EventEmitter {
    constructor(session, options) {
        super();
        this.timeoutHint = 0;
        this._nextClientHandle = 0;
        const sessionImpl = session;
        this.publishEngine = sessionImpl.getPublishEngine();
        this.lastSequenceNumber = -1;
        options = options || {};
        options.requestedPublishingInterval = options.requestedPublishingInterval || 100;
        options.requestedLifetimeCount = options.requestedLifetimeCount || 60;
        options.requestedMaxKeepAliveCount = options.requestedMaxKeepAliveCount || 10;
        options.maxNotificationsPerPublish = utils.isNullOrUndefined(options.maxNotificationsPerPublish)
            ? 0
            : options.maxNotificationsPerPublish;
        options.publishingEnabled = !!options.publishingEnabled;
        options.priority = options.priority || 1;
        this.publishingInterval = options.requestedPublishingInterval;
        this.lifetimeCount = options.requestedLifetimeCount;
        this.maxKeepAliveCount = options.requestedMaxKeepAliveCount;
        this.maxNotificationsPerPublish = options.maxNotificationsPerPublish || 0;
        this.publishingEnabled = options.publishingEnabled;
        this.priority = options.priority;
        this.subscriptionId = PENDING_SUBSCRIPTON_ID;
        this._nextClientHandle = 0;
        this.monitoredItems = {};
        this.lastRequestSentTime = new Date(1, 1, 1970);
        /**
         * set to True when the server has notified us that this subscription has timed out
         * ( maxLifeCounter x published interval without being able to process a PublishRequest
         * @property hasTimedOut
         * @type {boolean}
         */
        this.hasTimedOut = false;
        this.pendingMonitoredItemsToRegister = {};
        setImmediate(() => {
            this.__create_subscription((err) => {
                if (!err) {
                    setImmediate(() => {
                        /**
                         * notify the observers that the subscription has now started
                         * @event started
                         */
                        this.emit("started", this.subscriptionId);
                    });
                }
            });
        });
    }
    /**
     * the associated session
     * @property session
     * @type {ClientSession}
     */
    get session() {
        node_opcua_assert_1.assert(this.publishEngine.session, "expecting a valid session here");
        return this.publishEngine.session;
    }
    get hasSession() {
        return !!this.publishEngine.session;
    }
    get isActive() {
        return !(this.subscriptionId === PENDING_SUBSCRIPTON_ID
            || this.subscriptionId === TERMINTATED_SUBSCRIPTION_ID
            || this.subscriptionId === TERMINATING_SUBSCRIPTION_ID);
    }
    terminate(...args) {
        const callback = args[0];
        node_opcua_assert_1.assert(_.isFunction(callback), "expecting a callback function");
        if (this.subscriptionId === TERMINTATED_SUBSCRIPTION_ID
            || this.subscriptionId === TERMINATING_SUBSCRIPTION_ID) {
            // already terminated... just ignore
            return callback(new Error("Already Terminated"));
        }
        if (_.isFinite(this.subscriptionId)) {
            const subscriptionId = this.subscriptionId;
            this.subscriptionId = TERMINATING_SUBSCRIPTION_ID;
            this.publishEngine.unregisterSubscription(subscriptionId);
            if (!this.hasSession) {
                return this._terminate_step2(callback);
            }
            const session = this.session;
            if (!session) {
                return callback(new Error("no session"));
            }
            session.deleteSubscriptions({
                subscriptionIds: [subscriptionId]
            }, (err, response) => {
                if (response && response.results[0] !== node_opcua_status_code_1.StatusCodes.Good) {
                    debugLog("warning: deleteSubscription returned ", response.results);
                }
                if (err) {
                    /**
                     * notify the observers that an error has occurred
                     * @event internal_error
                     * @param err the error
                     */
                    this.emit("internal_error", err);
                }
                this._terminate_step2(callback);
            });
        }
        else {
            node_opcua_assert_1.assert(this.subscriptionId === PENDING_SUBSCRIPTON_ID);
            this._terminate_step2(callback);
        }
    }
    /**
     * @method nextClientHandle
     */
    nextClientHandle() {
        this._nextClientHandle += 1;
        return this._nextClientHandle;
    }
    monitor(...args) {
        const itemToMonitor = args[0];
        const requestedParameters = args[1];
        const timestampsToReturn = args[2];
        const done = args[3];
        node_opcua_assert_1.assert(_.isFunction(done), "expecting a function here");
        itemToMonitor.nodeId = node_opcua_nodeid_1.resolveNodeId(itemToMonitor.nodeId);
        const monitoredItem = new client_monitored_item_impl_1.ClientMonitoredItemImpl(this, itemToMonitor, requestedParameters, timestampsToReturn);
        this._wait_for_subscription_to_be_ready((err) => {
            if (err) {
                return done(err);
            }
            monitoredItem._monitor((err1) => {
                if (err1) {
                    return done && done(err1);
                }
                done(err1 ? err1 : null, monitoredItem);
            });
        });
        // xx return monitoredItem;
    }
    monitorItems(...args) {
        const itemsToMonitor = args[0];
        const requestedParameters = args[1];
        const timestampsToReturn = args[2];
        const done = args[3];
        const monitoredItemGroup = new client_monitored_item_group_impl_1.ClientMonitoredItemGroupImpl(this, itemsToMonitor, requestedParameters, timestampsToReturn);
        this._wait_for_subscription_to_be_ready((err) => {
            if (err) {
                return done(err);
            }
            monitoredItemGroup._monitor((err1) => {
                if (err1) {
                    return done && done(err1);
                }
                done(err1, monitoredItemGroup);
            });
        });
    }
    _delete_monitored_items(monitoredItems, callback) {
        node_opcua_assert_1.assert(_.isFunction(callback));
        node_opcua_assert_1.assert(_.isArray(monitoredItems));
        node_opcua_assert_1.assert(this.isActive);
        for (const monitoredItem of monitoredItems) {
            this._remove(monitoredItem);
        }
        const session = this.session;
        session.deleteMonitoredItems({
            monitoredItemIds: monitoredItems.map((monitoredItem) => monitoredItem.monitoredItemId),
            subscriptionId: this.subscriptionId,
        }, (err, response) => {
            callback(err);
        });
    }
    setPublishingMode(...args) {
        const publishingEnabled = args[0];
        const callback = args[1];
        node_opcua_assert_1.assert(_.isFunction(callback));
        const session = this.session;
        if (!session) {
            return callback(new Error("no session"));
        }
        const subscriptionId = this.subscriptionId;
        session.setPublishingMode(publishingEnabled, subscriptionId, (err, statusCode) => {
            if (err) {
                return callback(err);
            }
            if (!statusCode) {
                return callback(new Error("Internal Error"));
            }
            if (statusCode !== node_opcua_status_code_1.StatusCodes.Good) {
                return callback(null, statusCode);
            }
            callback(null, node_opcua_status_code_1.StatusCodes.Good);
        });
    }
    //
    // /**
    //  * @internal
    //  * @param itemsToMonitor
    //  * @param innerCallback
    //  * @private
    //  */
    // public _createMonitoredItem(itemsToMonitor: ClientMonitoredItemBase[], innerCallback: ErrorCallback) {
    //
    //     const itemsToCreate: MonitoredItemCreateRequestOptions[] = [];
    //
    //     _.forEach(itemsToMonitor, (monitoredItem: ClientMonitoredItemBase /*, clientHandle*/) => {
    //         assert(monitoredItem.monitoringParameters.clientHandle > 0);
    //         itemsToCreate.push({
    //             itemToMonitor: monitoredItem.itemToMonitor,
    //             monitoringMode: monitoredItem.monitoringMode,
    //             requestedParameters: monitoredItem.monitoringParameters
    //         });
    //     });
    //
    //     const createMonitorItemsRequest = new CreateMonitoredItemsRequest({
    //         itemsToCreate,
    //         subscriptionId: this.subscriptionId,
    //         timestampsToReturn: TimestampsToReturn.Both
    //     });
    //
    //     const session = this.session;
    //     if (!session) {
    //         return innerCallback(new Error("no session"));
    //     }
    //     session.createMonitoredItems(
    //         createMonitorItemsRequest,
    //         (err: Error | null, response?: CreateMonitoredItemsResponse) => {
    //
    //             if (err) {
    //                 return innerCallback(err);
    //             }
    //             if (!response) {
    //                 return innerCallback(new Error("Internal Error"));
    //             }
    //             const monitoredItemResults = response.results || [];
    //
    //             monitoredItemResults.forEach((monitoredItemResult: MonitoredItemCreateResult, index: number) => {
    //
    //                 const itemToCreate = itemsToCreate[index];
    //                 if (!itemToCreate || !itemToCreate.requestedParameters) {
    //                     throw new Error("Internal Error");
    //                 }
    //                 const clientHandle = itemToCreate.requestedParameters.clientHandle;
    //                 if (!clientHandle) {
    //                     throw new Error("Internal Error");
    //                 }
    //                 const monitoredItem = this.monitoredItems[clientHandle];
    //
    //                 if (monitoredItemResult.statusCode === StatusCodes.Good) {
    //
    //                     monitoredItem.result = monitoredItemResult;
    //                     monitoredItem.monitoredItemId = monitoredItemResult.monitoredItemId;
    //                     monitoredItem.monitoringParameters.samplingInterval =
    //                         monitoredItemResult.revisedSamplingInterval;
    //                     monitoredItem.monitoringParameters.queueSize = monitoredItemResult.revisedQueueSize;
    //                     monitoredItem.filterResult = monitoredItemResult.filterResult || undefined;
    //
    //                     // istanbul ignore next
    //                     if (doDebug) {
    //                         debugLog("monitoredItemResult.statusCode = ", monitoredItemResult.toString());
    //                     }
    //
    //                 } else {
    //                     // TODO: what should we do ?
    //                     debugLog("monitoredItemResult.statusCode = ",
    //                         monitoredItemResult.statusCode.toString());
    //                 }
    //             });
    //             innerCallback();
    //         });
    // }
    /**
     *  utility function to recreate new subscription
     *  @method recreateSubscriptionAndMonitoredItem
     */
    recreateSubscriptionAndMonitoredItem(callback) {
        debugLog("ClientSubscription#recreateSubscriptionAndMonitoredItem");
        if (this.subscriptionId === TERMINTATED_SUBSCRIPTION_ID) {
            debugLog("Subscription is not in a valid state");
            return callback();
        }
        const oldMonitoredItems = this.monitoredItems;
        this.publishEngine.unregisterSubscription(this.subscriptionId);
        async.series([
            (innerCallback) => {
                this.__create_subscription(innerCallback);
            },
            (innerCallback) => {
                const test = this.publishEngine.getSubscription(this.subscriptionId);
                node_opcua_assert_1.assert(test === this);
                // re-create monitored items
                const itemsToCreate = [];
                _.forEach(oldMonitoredItems, (monitoredItem /*, clientHandle*/) => {
                    node_opcua_assert_1.assert(monitoredItem.monitoringParameters.clientHandle > 0);
                    itemsToCreate.push({
                        itemToMonitor: monitoredItem.itemToMonitor,
                        monitoringMode: monitoredItem.monitoringMode,
                        requestedParameters: monitoredItem.monitoringParameters
                    });
                });
                const createMonitorItemsRequest = new node_opcua_service_subscription_1.CreateMonitoredItemsRequest({
                    itemsToCreate,
                    subscriptionId: this.subscriptionId,
                    timestampsToReturn: node_opcua_service_read_1.TimestampsToReturn.Both,
                });
                const session = this.session;
                if (!session) {
                    return innerCallback(new Error("no session"));
                }
                session.createMonitoredItems(createMonitorItemsRequest, (err, response) => {
                    if (err) {
                        return innerCallback(err);
                    }
                    if (!response) {
                        return innerCallback(new Error("Internal Error"));
                    }
                    const monitoredItemResults = response.results || [];
                    monitoredItemResults.forEach((monitoredItemResult, index) => {
                        const itemToCreate = itemsToCreate[index];
                        if (!itemToCreate || !itemToCreate.requestedParameters) {
                            throw new Error("Internal Error");
                        }
                        const clientHandle = itemToCreate.requestedParameters.clientHandle;
                        if (!clientHandle) {
                            throw new Error("Internal Error");
                        }
                        const monitoredItem = this.monitoredItems[clientHandle];
                        monitoredItem._applyResult(monitoredItemResult);
                    });
                    innerCallback();
                });
            }
        ], (err) => {
            callback(err);
        });
    }
    toString() {
        let str = "";
        str += "subscriptionId      :" + this.subscriptionId + "\n";
        str += "publishingInterval  :" + this.publishingInterval + "\n";
        str += "lifetimeCount       :" + this.lifetimeCount + "\n";
        str += "maxKeepAliveCount   :" + this.maxKeepAliveCount + "\n";
        return str;
    }
    /**
     * returns the approximated remaining life time of this subscription in milliseconds
     */
    evaluateRemainingLifetime() {
        const now = Date.now();
        const timeout = this.publishingInterval * this.lifetimeCount;
        const expiryTime = this.lastRequestSentTime.getTime() + timeout;
        return Math.max(0, (expiryTime - now));
    }
    _add_monitored_item(clientHandle, monitoredItem) {
        node_opcua_assert_1.assert(this.isActive, "subscription must be active and not terminated");
        node_opcua_assert_1.assert(monitoredItem.monitoringParameters.clientHandle === clientHandle);
        this.monitoredItems[clientHandle] = monitoredItem;
        /**
         * notify the observers that a new monitored item has been added to the subscription.
         * @event item_added
         * @param the monitored item.
         */
        this.emit("item_added", monitoredItem);
    }
    _wait_for_subscription_to_be_ready(done) {
        let _watchDogCount = 0;
        const waitForSubscriptionAndMonitor = () => {
            _watchDogCount++;
            if (this.subscriptionId === PENDING_SUBSCRIPTON_ID) {
                // the subscriptionID is not yet known because the server hasn't replied yet
                // let postpone this call, a little bit, to let things happen
                setImmediate(waitForSubscriptionAndMonitor);
            }
            else if (this.subscriptionId === TERMINTATED_SUBSCRIPTION_ID) {
                // the subscription has been terminated in the meantime
                // this indicates a potential issue in the code using this api.
                if (_.isFunction(done)) {
                    done(new Error("subscription has been deleted"));
                }
            }
            else {
                done();
            }
        };
        setImmediate(waitForSubscriptionAndMonitor);
    }
    __create_subscription(callback) {
        node_opcua_assert_1.assert(_.isFunction(callback));
        if (!this.hasSession) {
            return callback(new Error("No Session"));
        }
        const session = this.session;
        debugLog(chalk_1.default.yellow.bold("ClientSubscription created "));
        const request = new node_opcua_service_subscription_1.CreateSubscriptionRequest({
            maxNotificationsPerPublish: this.maxNotificationsPerPublish,
            priority: this.priority,
            publishingEnabled: this.publishingEnabled,
            requestedLifetimeCount: this.lifetimeCount,
            requestedMaxKeepAliveCount: this.maxKeepAliveCount,
            requestedPublishingInterval: this.publishingInterval,
        });
        session.createSubscription(request, (err, response) => {
            if (err) {
                /* istanbul ignore next */
                this.emit("internal_error", err);
                if (callback) {
                    return callback(err);
                }
                return;
            }
            if (!response) {
                return callback(new Error("internal error"));
            }
            if (!this.hasSession) {
                return callback(new Error("createSubscription has failed = > no session"));
            }
            node_opcua_assert_1.assert(this.hasSession);
            this.subscriptionId = response.subscriptionId;
            this.publishingInterval = response.revisedPublishingInterval;
            this.lifetimeCount = response.revisedLifetimeCount;
            this.maxKeepAliveCount = response.revisedMaxKeepAliveCount;
            this.timeoutHint = (this.maxKeepAliveCount + 10) * this.publishingInterval;
            if (doDebug) {
                debugLog(chalk_1.default.yellow.bold("registering callback"));
                debugLog(chalk_1.default.yellow.bold("publishingInterval               "), this.publishingInterval);
                debugLog(chalk_1.default.yellow.bold("lifetimeCount                    "), this.lifetimeCount);
                debugLog(chalk_1.default.yellow.bold("maxKeepAliveCount                "), this.maxKeepAliveCount);
                debugLog(chalk_1.default.yellow.bold("publish request timeout hint =   "), this.timeoutHint);
                debugLog(chalk_1.default.yellow.bold("hasTimedOut                      "), this.hasTimedOut);
            }
            this.publishEngine.registerSubscription(this);
            if (callback) {
                callback();
            }
        });
    }
    __on_publish_response_DataChangeNotification(notification) {
        node_opcua_assert_1.assert(notification.schema.name === "DataChangeNotification");
        const monitoredItems = notification.monitoredItems || [];
        for (const monitoredItem of monitoredItems) {
            const monitorItemObj = this.monitoredItems[monitoredItem.clientHandle];
            if (monitorItemObj) {
                if (monitorItemObj.itemToMonitor.attributeId === node_opcua_data_model_1.AttributeIds.EventNotifier) {
                    warningLog(chalk_1.default.yellow("Warning"), chalk_1.default.cyan(" Server send a DataChangeNotification for an EventNotifier." +
                        " EventNotificationList was expected"));
                    warningLog(chalk_1.default.cyan("         the Server may not be fully OPCUA compliant"), chalk_1.default.yellow(". This notification will be ignored."));
                }
                else {
                    const monitoredItemImpl = monitorItemObj;
                    monitoredItemImpl._notify_value_change(monitoredItem.value);
                }
            }
        }
    }
    __on_publish_response_StatusChangeNotification(notification) {
        node_opcua_assert_1.assert(notification.schema.name === "StatusChangeNotification");
        debugLog("Client has received a Status Change Notification ", notification.status.toString());
        if (notification.status === node_opcua_status_code_1.StatusCodes.GoodSubscriptionTransferred) {
            // OPCUA UA Spec 1.0.3 : part 3 - page 82 - 5.13.7 TransferSubscriptions:
            // If the Server transfers the Subscription to the new Session, the Server shall issue
            // a StatusChangeNotification  notificationMessage with the status code
            // Good_SubscriptionTransferred to the old Session.
            debugLog("ClientSubscription#__on_publish_response_StatusChangeNotification : GoodSubscriptionTransferred");
            this.hasTimedOut = true;
            this.terminate(() => {
            });
        }
        if (notification.status === node_opcua_status_code_1.StatusCodes.BadTimeout) {
            // the server tells use that the subscription has timed out ..
            // this mean that this subscription has been closed on the server side and cannot process any
            // new PublishRequest.
            //
            // from Spec OPCUA Version 1.03 Part 4 - 5.13.1.1 Description : Page 69:
            //
            // h. Subscriptions have a lifetime counter that counts the number of consecutive publishing cycles in
            //    which there have been no Publish requests available to send a Publish response for the
            //    Subscription. Any Service call that uses the SubscriptionId or the processing of a Publish
            //    response resets the lifetime counter of this Subscription. When this counter reaches the value
            //    calculated for the lifetime of a Subscription based on the MaxKeepAliveCount parameter in the
            //    CreateSubscription Service (5.13.2), the Subscription is closed. Closing the Subscription causes
            //    its MonitoredItems to be deleted. In addition the Server shall issue a StatusChangeNotification
            //    notificationMessage with the status code BadTimeout.
            //
            this.hasTimedOut = true;
            this.terminate(() => {
            });
        }
        /**
         * notify the observers that the server has send a status changed notification (such as BadTimeout )
         * @event status_changed
         */
        this.emit("status_changed", notification.status, notification.diagnosticInfo);
    }
    __on_publish_response_EventNotificationList(notification) {
        node_opcua_assert_1.assert(notification.schema.name === "EventNotificationList");
        const events = notification.events || [];
        for (const event of events) {
            const monitorItemObj = this.monitoredItems[event.clientHandle];
            node_opcua_assert_1.assert(monitorItemObj, "Expecting a monitored item");
            const monitoredItemImpl = monitorItemObj;
            monitoredItemImpl._notify_event(event.eventFields || []);
        }
    }
    onNotificationMessage(notificationMessage) {
        this.lastRequestSentTime = new Date(Date.now());
        node_opcua_assert_1.assert(notificationMessage.hasOwnProperty("sequenceNumber"));
        this.lastSequenceNumber = notificationMessage.sequenceNumber;
        this.emit("raw_notification", notificationMessage);
        const notificationData = notificationMessage.notificationData || [];
        if (notificationData.length === 0) {
            // this is a keep alive message
            debugLog(chalk_1.default.yellow("Client : received a keep alive notification from client"));
            /**
             * notify the observers that a keep alive Publish Response has been received from the server.
             * @event keepalive
             */
            this.emit("keepalive");
        }
        else {
            /**
             * notify the observers that some notifications has been received from the server in  a PublishResponse
             * each modified monitored Item
             * @event  received_notifications
             */
            this.emit("received_notifications", notificationMessage);
            // let publish a global event
            // now process all notifications
            for (const notification of notificationData) {
                if (!notification) {
                    continue;
                }
                // DataChangeNotification / StatusChangeNotification / EventNotification
                switch (notification.schema.name) {
                    case "DataChangeNotification":
                        // now inform each individual monitored item
                        this.__on_publish_response_DataChangeNotification(notification);
                        break;
                    case "StatusChangeNotification":
                        this.__on_publish_response_StatusChangeNotification(notification);
                        break;
                    case "EventNotificationList":
                        this.__on_publish_response_EventNotificationList(notification);
                        break;
                    default:
                        warningLog(" Invalid notification :", notification.toString());
                }
            }
        }
    }
    _terminate_step2(callback) {
        setImmediate(() => {
            /**
             * notify the observers tha the client subscription has terminated
             * @event  terminated
             */
            this.subscriptionId = TERMINTATED_SUBSCRIPTION_ID;
            this.emit("terminated");
            callback();
        });
    }
    _remove(monitoredItem) {
        const clientHandle = monitoredItem.monitoringParameters.clientHandle;
        node_opcua_assert_1.assert(clientHandle > 0);
        if (!this.monitoredItems.hasOwnProperty(clientHandle)) {
            return; // may be monitoredItem failed to be created  ....
        }
        node_opcua_assert_1.assert(this.monitoredItems.hasOwnProperty(clientHandle));
        monitoredItem.removeAllListeners();
        delete this.monitoredItems[clientHandle];
    }
}
exports.ClientSubscriptionImpl = ClientSubscriptionImpl;
// tslint:disable:no-var-requires
// tslint:disable:max-line-length
const thenify = require("thenify");
const opts = { multiArgs: false };
ClientSubscriptionImpl.prototype.setPublishingMode = thenify.withCallback(ClientSubscriptionImpl.prototype.setPublishingMode);
ClientSubscriptionImpl.prototype.monitor = thenify.withCallback(ClientSubscriptionImpl.prototype.monitor);
ClientSubscriptionImpl.prototype.monitorItems = thenify.withCallback(ClientSubscriptionImpl.prototype.monitorItems);
ClientSubscriptionImpl.prototype.recreateSubscriptionAndMonitoredItem =
    thenify.withCallback(ClientSubscriptionImpl.prototype.recreateSubscriptionAndMonitoredItem);
ClientSubscriptionImpl.prototype.terminate = thenify.withCallback(ClientSubscriptionImpl.prototype.terminate);
client_subscription_1.ClientSubscription.create = (clientSession, options) => {
    return new ClientSubscriptionImpl(clientSession, options);
};
//# sourceMappingURL=client_subscription_impl.js.map