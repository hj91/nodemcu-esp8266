/// <reference types="node" />
import { EventEmitter } from "events";
import { ReadValueIdOptions, TimestampsToReturn } from "node-opcua-service-read";
import { MonitoringParametersOptions } from "node-opcua-service-subscription";
import { StatusCode } from "node-opcua-status-code";
import { ClientMonitoredItemBase } from "../client_monitored_item_base";
import { ClientMonitoredItemGroup } from "../client_monitored_item_group";
import { ClientSession, SubscriptionId } from "../client_session";
import { ClientHandle, ClientMonitoredItemBaseMap, ClientSubscription, ClientSubscriptionOptions } from "../client_subscription";
import { Callback, ErrorCallback } from "../common";
import { ClientSidePublishEngine } from "./client_publish_engine";
import { ClientSessionImpl } from "./client_session_impl";
export declare class ClientSubscriptionImpl extends EventEmitter implements ClientSubscription {
    /**
     * the associated session
     * @property session
     * @type {ClientSession}
     */
    readonly session: ClientSessionImpl;
    readonly hasSession: boolean;
    readonly isActive: boolean;
    subscriptionId: SubscriptionId;
    publishingInterval: number;
    lifetimeCount: number;
    maxKeepAliveCount: number;
    maxNotificationsPerPublish: number;
    publishingEnabled: boolean;
    priority: number;
    monitoredItems: ClientMonitoredItemBaseMap;
    timeoutHint: number;
    publishEngine: ClientSidePublishEngine;
    private lastSequenceNumber;
    private lastRequestSentTime;
    private _nextClientHandle;
    private hasTimedOut;
    private pendingMonitoredItemsToRegister;
    constructor(session: ClientSession, options: ClientSubscriptionOptions);
    terminate(): Promise<void>;
    terminate(callback: ErrorCallback): void;
    /**
     * @method nextClientHandle
     */
    nextClientHandle(): number;
    monitor(itemToMonitor: ReadValueIdOptions, requestedParameters: MonitoringParametersOptions, timestampsToReturn: TimestampsToReturn): Promise<ClientMonitoredItemBase>;
    monitor(itemToMonitor: ReadValueIdOptions, requestedParameters: MonitoringParametersOptions, timestampsToReturn: TimestampsToReturn, done: Callback<ClientMonitoredItemBase>): void;
    monitorItems(itemsToMonitor: ReadValueIdOptions[], requestedParameters: MonitoringParametersOptions, timestampsToReturn: TimestampsToReturn): Promise<ClientMonitoredItemGroup>;
    monitorItems(itemsToMonitor: ReadValueIdOptions[], requestedParameters: MonitoringParametersOptions, timestampsToReturn: TimestampsToReturn, done: Callback<ClientMonitoredItemGroup>): void;
    _delete_monitored_items(monitoredItems: ClientMonitoredItemBase[], callback: ErrorCallback): void;
    setPublishingMode(publishingEnabled: boolean): Promise<StatusCode>;
    setPublishingMode(publishingEnabled: boolean, callback: Callback<StatusCode>): void;
    /**
     *  utility function to recreate new subscription
     *  @method recreateSubscriptionAndMonitoredItem
     */
    recreateSubscriptionAndMonitoredItem(callback: ErrorCallback): void;
    toString(): string;
    /**
     * returns the approximated remaining life time of this subscription in milliseconds
     */
    evaluateRemainingLifetime(): number;
    _add_monitored_item(clientHandle: ClientHandle, monitoredItem: ClientMonitoredItemBase): void;
    _wait_for_subscription_to_be_ready(done: ErrorCallback): void;
    private __create_subscription;
    private __on_publish_response_DataChangeNotification;
    private __on_publish_response_StatusChangeNotification;
    private __on_publish_response_EventNotificationList;
    private onNotificationMessage;
    private _terminate_step2;
    private _remove;
}
