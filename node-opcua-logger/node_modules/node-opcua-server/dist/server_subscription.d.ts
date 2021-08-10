/**
 * @module node-opcua-server
 */
/// <reference types="node" />
import { TimestampsToReturn } from "node-opcua-data-value";
import { EventEmitter } from "events";
import { AddressSpace, BaseNode, Duration } from "node-opcua-address-space";
import { Byte } from "node-opcua-basic-types";
import { SubscriptionDiagnosticsDataType } from "node-opcua-common";
import { NodeId } from "node-opcua-nodeid";
import { ObjectRegistry } from "node-opcua-object-registry";
import { DataChangeNotification, EventNotificationList, NotificationMessage, StatusChangeNotification } from "node-opcua-service-subscription";
import { MonitoredItemCreateRequest } from "node-opcua-service-subscription";
import { StatusCode } from "node-opcua-status-code";
import { MonitoredItemCreateResult } from "node-opcua-types";
import { MonitoredItem } from "./monitored_item";
import { ServerSession } from "./server_session";
export interface SubscriptionDiagnosticsDataTypePriv extends SubscriptionDiagnosticsDataType {
    $subscription: Subscription;
}
export declare enum SubscriptionState {
    CLOSED = 1,
    CREATING = 2,
    NORMAL = 3,
    LATE = 4,
    KEEPALIVE = 5,
    TERMINATED = 6
}
export interface SubscriptionOptions {
    sessionId?: NodeId;
    /**
     * (default:1000) the publishing interval.
     */
    publishingInterval?: number;
    /**
     * (default:10) the max Life Time Count
     */
    maxKeepAliveCount?: number;
    lifeTimeCount?: number;
    /**
     * (default:true)
     */
    publishingEnabled?: boolean;
    /**
     * (default:0)
     */
    maxNotificationsPerPublish?: number;
    /**
     * subscription priority Byte:(0-255)
     */
    priority?: number;
    publishEngine?: IServerPublishEngine;
    /**
     *  a unique identifier
     */
    id?: number;
}
declare type IServerPublishEngine = any;
export declare type Notification = DataChangeNotification | EventNotificationList | StatusChangeNotification;
export declare type Counter = number;
export interface ModifySubscriptionParameters {
    /**
     *     requestedPublishingInterval =0 means fastest possible
     */
    requestedPublishingInterval?: Duration;
    requestedLifetimeCount?: Counter;
    /**
     * requestedMaxKeepAliveCount  ===0 means no change
     */
    requestedMaxKeepAliveCount?: Counter;
    maxNotificationsPerPublish?: Counter;
    priority?: Byte;
}
export interface GetMonitoredItemsResult {
    /**
     * array of serverHandles for all MonitoredItems of the subscription
     * identified by subscriptionId.
     */
    serverHandles: number[];
    /**
     *  array of clientHandles for all MonitoredItems of the subscription
     *  identified by subscriptionId.
     */
    clientHandles: number[];
    statusCode: StatusCode;
}
interface InternalNotification {
    notification: NotificationMessage;
    publishTime: Date;
    sequenceNumber: number;
    start_tick: number;
}
/**
 * The Subscription class used in the OPCUA server side.
 */
export declare class Subscription extends EventEmitter {
    static minimumPublishingInterval: number;
    static defaultPublishingInterval: number;
    static maximumPublishingInterval: number;
    static registry: ObjectRegistry;
    sessionId: NodeId;
    publishEngine: IServerPublishEngine;
    id: number;
    priority: number;
    /**
     * the Subscription publishing interval
     * @default 1000
     */
    publishingInterval: number;
    /**
     * The keep alive count defines how many times the publish interval need to
     * expires without having notifications available before the server send an
     * empty message.
     * OPCUA Spec says: a value of 0 is invalid.
     * @default 10
     *
     */
    maxKeepAliveCount: number;
    /**
     * The life time count defines how many times the publish interval expires without
     * having a connection to the client to deliver data.
     * If the life time count reaches maxKeepAliveCount, the subscription will
     * automatically terminate.
     * OPCUA Spec: The life-time count shall be a minimum of three times the keep keep-alive count.
     *
     * Note: this has to be interpreted as without having a PublishRequest available
     * @default 1
     */
    lifeTimeCount: number;
    /**
     * The maximum number of notifications that the Client wishes to receive in a
     * single Publish response. A value of zero indicates that there is no limit.
     * The number of notifications per Publish is the sum of monitoredItems in the
     * DataChangeNotification and events in the EventNotificationList.
     *
     * @property maxNotificationsPerPublish
     * @default 0
     */
    maxNotificationsPerPublish: number;
    publishingEnabled: boolean;
    subscriptionDiagnostics: SubscriptionDiagnosticsDataTypePriv;
    state: any;
    messageSent: boolean;
    $session?: ServerSession;
    private _life_time_counter;
    private _keep_alive_counter;
    private _pending_notifications;
    private _sent_notifications;
    private readonly _sequence_number_generator;
    private publishIntervalCount;
    private readonly monitoredItems;
    /**
     *  number of monitored Item
     */
    private monitoredItemIdCounter;
    private _unacknowledgedMessageCount;
    private timerId;
    private _hasMonitoredItemNotifications;
    constructor(options: SubscriptionOptions);
    getSessionId(): NodeId;
    toString(): string;
    /**
     * modify subscription parameters
     * @param param
     */
    modify(param: ModifySubscriptionParameters): void;
    /**
     * set publishing mode
     * @param publishingEnabled
     */
    setPublishingMode(publishingEnabled: boolean): StatusCode;
    /**
     * @private
     */
    readonly keepAliveCounterHasExpired: boolean;
    /**
     * Reset the Lifetime Counter Variable to the value specified for the lifetime of a Subscription in
     * the CreateSubscription Service( 5.13.2).
     * @private
     */
    resetLifeTimeCounter(): void;
    /**
     * @private
     */
    increaseLifeTimeCounter(): void;
    /**
     *  True if the subscription life time has expired.
     *
     */
    readonly lifeTimeHasExpired: boolean;
    /**
     * number of milliseconds before this subscription times out (lifeTimeHasExpired === true);
     */
    readonly timeToExpiration: number;
    readonly timeToKeepAlive: number;
    /**
     * Terminates the subscription.
     * Calling this method will also remove any monitored items.
     *
     */
    terminate(): void;
    dispose(): void;
    readonly aborted: boolean;
    /**
     * number of pending notifications
     */
    readonly pendingNotificationsCount: number;
    /**
     * is 'true' if there are pending notifications for this subscription. (i.e moreNotifications)
     */
    readonly hasPendingNotifications: boolean;
    /**
     * number of sent notifications
     */
    readonly sentNotificationsCount: number;
    /**
     * number of monitored items handled by this subscription
     */
    readonly monitoredItemCount: number;
    /**
     * number of disabled monitored items.
     */
    readonly disabledMonitoredItemCount: number;
    /**
     * The number of unacknowledged messages saved in the republish queue.
     */
    readonly unacknowledgedMessageCount: number;
    /**
     * adjust monitored item sampling interval
     *  - an samplingInterval ===0 means that we use a event-base model ( no sampling)
     *  - otherwise the sampling is adjusted
     * @private
     */
    adjustSamplingInterval(samplingInterval: number, node: BaseNode): number;
    /**
     * create a monitored item
     * @param addressSpace - address space
     * @param timestampsToReturn  - the timestamp to return
     * @param monitoredItemCreateRequest - the parameters describing the monitored Item to create
     */
    createMonitoredItem(addressSpace: AddressSpace, timestampsToReturn: TimestampsToReturn, monitoredItemCreateRequest: MonitoredItemCreateRequest): MonitoredItemCreateResult;
    /**
     * get a monitoredItem by Id.
     * @param monitoredItemId : the id of the monitored item to get.
     * @return the monitored item matching monitoredItemId
     */
    getMonitoredItem(monitoredItemId: number | string): MonitoredItem;
    /**
     * remove a monitored Item from the subscription.
     * @param monitoredItemId : the id of the monitored item to get.
     */
    removeMonitoredItem(monitoredItemId: number | string): StatusCode;
    /**
     * rue if monitored Item have uncollected Notifications
     */
    readonly hasMonitoredItemNotifications: boolean;
    readonly subscriptionId: number;
    getMessageForSequenceNumber(sequenceNumber: number): InternalNotification | null;
    /**
     * returns true if the notification has expired
     * @param notification
     */
    notificationHasExpired(notification: any): boolean;
    /**
     *  returns in an array the sequence numbers of the notifications that haven't been
     *  acknowledged yet.
     */
    getAvailableSequenceNumbers(): number[];
    /**
     * acknowledges a notification identified by its sequence number
     */
    acknowledgeNotification(sequenceNumber: number): StatusCode;
    /**
     * getMonitoredItems is used to get information about monitored items of a subscription.Its intended
     * use is defined in Part 4. This method is the implementation of the Standard OPCUA GetMonitoredItems Method.
     * from spec:
     * This method can be used to get the  list of monitored items in a subscription if CreateMonitoredItems
     * failed due to a network interruption and the client does not know if the creation succeeded in the server.
     *
     */
    getMonitoredItems(): GetMonitoredItemsResult;
    /**
     * @private
     */
    resendInitialValues(): void;
    /**
     * @private
     */
    notifyTransfer(): void;
    /**
     *
     *  the server invokes the resetLifeTimeAndKeepAliveCounters method of the subscription
     *  when the server  has send a Publish Response, so that the subscription
     *  can reset its life time counter.
     *
     * @private
     */
    resetLifeTimeAndKeepAliveCounters(): void;
    /**
     *  _publish_pending_notifications send a "notification" event:
     *
     * @private
     *
     */
    _publish_pending_notifications(): void;
    process_subscription(): void;
    _get_future_sequence_number(): number;
    private _process_keepAlive;
    private _stop_timer;
    private _start_timer;
    private _get_next_sequence_number;
    /**
     * @private
     */
    private _tick;
    /**
     * @private
     */
    private _sendKeepAliveResponse;
    /**
     * Reset the Lifetime Counter Variable to the value specified for the lifetime of a Subscription in
     * the CreateSubscription Service( 5.13.2).
     * @private
     */
    private resetKeepAliveCounter;
    /**
     * @private
     */
    private increaseKeepAliveCounter;
    /**
     * @private
     */
    private _addNotificationMessage;
    /**
     * Extract the next Notification that is ready to be sent to the client.
     * @return the Notification to send._pending_notifications
     */
    private _popNotificationToSend;
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
    private discardOldSentNotifications;
    /**
     * @param timestampsToReturn
     * @param monitoredItemCreateRequest
     * @param node
     * @private
     */
    private _createMonitoredItemStep2;
    /**
     *
     * @param monitoredItem
     * @param monitoredItemCreateRequest
     * @private
     */
    private _createMonitoredItemStep3;
    private _collectNotificationData;
    private _harvestMonitoredItems;
}
export {};
