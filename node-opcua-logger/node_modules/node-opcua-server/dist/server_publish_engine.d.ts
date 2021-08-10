/// <reference types="node" />
import { EventEmitter } from "events";
import { ObjectRegistry } from "node-opcua-object-registry";
import { StatusCode } from "node-opcua-status-code";
import { PublishRequest, SubscriptionAcknowledgement } from "node-opcua-types";
import { Subscription } from "./server_subscription";
export interface ServerSidePublishEngineOptions {
    maxPublishRequestInQueue?: number;
}
/***
 *  a Publish Engine for a given session
 */
export declare class ServerSidePublishEngine extends EventEmitter {
    static registry: ObjectRegistry;
    /**
     * @private
     */
    static transferSubscriptionsToOrphan(srcPublishEngine: ServerSidePublishEngine, destPublishEngine: ServerSidePublishEngine): void;
    /**
     * @param subscription
     * @param destPublishEngine
     * @param sendInitialValues true if initial values should be sent
     * @private
     */
    static transferSubscription(subscription: Subscription, destPublishEngine: ServerSidePublishEngine, sendInitialValues: boolean): void;
    maxPublishRequestInQueue: number;
    isSessionClosed: boolean;
    private _publish_request_queue;
    private _publish_response_queue;
    private _subscriptions;
    private _closed_subscriptions;
    constructor(options: ServerSidePublishEngineOptions);
    dispose(): void;
    process_subscriptionAcknowledgements(subscriptionAcknowledgements: SubscriptionAcknowledgement[]): StatusCode[];
    /**
     * get a array of subscription handled by the publish engine.
     */
    readonly subscriptions: Subscription[];
    /**
     */
    add_subscription(subscription: Subscription): Subscription;
    detach_subscription(subscription: Subscription): Subscription;
    /**
     */
    shutdown(): void;
    /**
     * number of pending PublishRequest available in queue
     */
    readonly pendingPublishRequestCount: number;
    /**
     * number of subscriptions
     */
    readonly subscriptionCount: number;
    readonly pendingClosedSubscriptionCount: number;
    readonly currentMonitoredItemCount: number;
    on_close_subscription(subscription: Subscription): void;
    /**
     * retrieve a subscription by id.
     * @param subscriptionId
     * @return Subscription
     */
    getSubscriptionById(subscriptionId: number | string): Subscription;
    findSubscriptionWaitingForFirstPublish(): Subscription | null;
    findLateSubscriptions(): Subscription[];
    readonly hasLateSubscriptions: boolean;
    findLateSubscriptionSortedByPriority(): Subscription | null;
    findLateSubscriptionsSortedByAge(): Subscription[];
    cancelPendingPublishRequestBeforeChannelChange(): void;
    onSessionClose(): void;
    /**
     * @private
     */
    cancelPendingPublishRequest(): void;
    /**
     *
     * @param request
     * @param callback
     * @private
     */
    _on_PublishRequest(request: PublishRequest, callback: any): void;
    private _feed_late_subscription;
    private _feed_closed_subscription;
    private send_error_for_request;
    private _cancelPendingPublishRequest;
    private _handle_too_many_requests;
    /**
     * call by a subscription when no notification message is available after the keep alive delay has
     * expired.
     *
     * @method send_keep_alive_response
     * @param subscriptionId
     * @param future_sequence_number
     * @return true if a publish response has been sent
     */
    private send_keep_alive_response;
    private _on_tick;
    private _cancelTimeoutRequests;
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
    private send_notification_message;
    private _process_pending_publish_response;
    private send_response_for_request;
}
