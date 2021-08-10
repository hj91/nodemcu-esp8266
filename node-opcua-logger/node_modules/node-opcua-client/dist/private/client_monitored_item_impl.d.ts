import { ReadValueIdOptions, TimestampsToReturn } from "node-opcua-service-read";
import { MonitoringMode, MonitoringParametersOptions } from "node-opcua-service-subscription";
import { StatusCode } from "node-opcua-status-code";
import { ClientMonitoredItem } from "../client_monitored_item";
import { ClientSubscription } from "../client_subscription";
import { Callback, ErrorCallback } from "../common";
import { ClientMonitoredItemBaseImpl } from "./client_monitored_item_base_impl";
/**
 * ClientMonitoredItem
 * @class ClientMonitoredItem
 * @extends ClientMonitoredItemBase
 *
 * event:
 *    "initialized"
 *    "err"
 *    "changed"
 *
 *  note: this.monitoringMode = subscription_service.MonitoringMode.Reporting;
 */
export declare class ClientMonitoredItemImpl extends ClientMonitoredItemBaseImpl implements ClientMonitoredItem {
    timestampsToReturn: TimestampsToReturn;
    constructor(subscription: ClientSubscription, itemToMonitor: ReadValueIdOptions, monitoringParameters: MonitoringParametersOptions, timestampsToReturn: TimestampsToReturn);
    toString(): string;
    /**
     * remove the MonitoredItem from its subscription
     * @async
     */
    terminate(): Promise<void>;
    terminate(done: ErrorCallback): void;
    modify(parameters: MonitoringParametersOptions): Promise<StatusCode>;
    modify(parameters: MonitoringParametersOptions, timestampsToReturn: TimestampsToReturn): Promise<StatusCode>;
    modify(parameters: MonitoringParametersOptions, callback: (err: Error | null, statusCode?: StatusCode) => void): void;
    modify(parameters: MonitoringParametersOptions, timestampsToReturn: TimestampsToReturn | null, callback: (err: Error | null, statusCode?: StatusCode) => void): void;
    setMonitoringMode(monitoringMode: MonitoringMode): Promise<StatusCode>;
    setMonitoringMode(monitoringMode: MonitoringMode, callback: Callback<StatusCode>): void;
    /**
     * Creates the monitor item (monitoring mode = Reporting)
     * @private
     * @internal
     */
    _monitor(done?: ErrorCallback): void;
}
