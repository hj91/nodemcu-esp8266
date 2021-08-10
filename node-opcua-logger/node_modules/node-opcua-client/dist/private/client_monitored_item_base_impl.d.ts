/// <reference types="node" />
/**
 * @module node-opcua-client-private
 */
import { EventEmitter } from "events";
import { DataValue } from "node-opcua-data-value";
import { ExtensionObject } from "node-opcua-extension-object";
import { ReadValueId, ReadValueIdOptions } from "node-opcua-service-read";
import { MonitoredItemCreateResult, MonitoringMode, MonitoringParameters, MonitoringParametersOptions } from "node-opcua-service-subscription";
import { StatusCode } from "node-opcua-status-code";
import { Variant } from "node-opcua-variant";
import { ClientMonitoredItemBase } from "../client_monitored_item_base";
import { ClientSubscription } from "../client_subscription";
import { ClientSubscriptionImpl } from "./client_subscription_impl";
export declare type PrepareForMonitoringResult = {
    error: string;
} | {
    error?: null;
    itemToMonitor: ReadValueIdOptions;
    monitoringMode: MonitoringMode;
    requestedParameters: MonitoringParameters;
};
export declare class ClientMonitoredItemBaseImpl extends EventEmitter implements ClientMonitoredItemBase {
    itemToMonitor: ReadValueId;
    monitoringParameters: MonitoringParameters;
    subscription: ClientSubscriptionImpl;
    monitoringMode: MonitoringMode;
    statusCode: StatusCode;
    monitoredItemId?: any;
    result?: MonitoredItemCreateResult;
    filterResult?: ExtensionObject;
    constructor(subscription: ClientSubscription, itemToMonitor: ReadValueIdOptions, monitoringParameters: MonitoringParametersOptions);
    /**
     * @internal
     * @param value
     * @private
     */
    _notify_value_change(value: DataValue): void;
    /**
     * @internal
     * @param eventFields
     * @private
     */
    _notify_event(eventFields: Variant[]): void;
    /**
     * @internal
     * @private
     */
    _prepare_for_monitoring(): {
        error: string;
        itemToMonitor?: undefined;
        monitoringMode?: undefined;
        requestedParameters?: undefined;
    } | {
        itemToMonitor: ReadValueId;
        monitoringMode: MonitoringMode;
        requestedParameters: MonitoringParameters;
        error?: undefined;
    };
    /**
     * @internal
     * @param monitoredItemResult
     * @private
     */
    _applyResult(monitoredItemResult: MonitoredItemCreateResult): void;
    /**
     * @internal
     * @param monitoredItemResult
     * @private
     */
    _after_create(monitoredItemResult: MonitoredItemCreateResult): void;
}
