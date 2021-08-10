/**
 * @module node-opcua-client
 */
/// <reference types="node" />
import { EventEmitter } from "events";
import { DataValue, TimestampsToReturn } from "node-opcua-data-value";
import { ClientMonitoredItemBase, ClientMonitoredItemOrGroupAction } from "./client_monitored_item_base";
import { ClientSubscription } from "./client_subscription";
export interface ClientMonitoredItemGroup extends EventEmitter, ClientMonitoredItemOrGroupAction {
    on(event: "changed", eventHandler: (monitoredItem: ClientMonitoredItemBase, dataValue: DataValue, index: number) => void): this;
    on(event: "err", eventHandler: (message: string) => void): this;
    on(event: "terminated", eventHandler: () => void): this;
    on(event: "initialized", eventHandler: () => void): this;
}
export declare class ClientMonitoredItemGroup {
    static create(subscription: ClientSubscription, itemsToMonitor: any[], monitoringParameters: any, timestampsToReturn: TimestampsToReturn): ClientMonitoredItemGroup;
}
