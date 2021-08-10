import { SignedSoftwareCertificate } from "node-opcua-types";
/**
 */
export interface OperationLimitsOptions {
    maxNodesPerRead?: number;
    maxNodesPerBrowse?: number;
    maxNodesPerWrite?: number;
    maxNodesPerMethodCall?: number;
    maxNodesPerRegisterNodes?: number;
    maxNodesPerNodeManagement?: number;
    maxMonitoredItemsPerCall?: number;
    maxNodesPerHistoryReadData?: number;
    maxNodesPerHistoryReadEvents?: number;
    maxNodesPerHistoryUpdateData?: number;
    maxNodesPerHistoryUpdateEvents?: number;
    maxNodesPerTranslateBrowsePathsToNodeIds?: number;
}
export declare class OperationLimits {
    maxNodesPerRead: number;
    maxNodesPerBrowse: number;
    maxNodesPerWrite: number;
    maxNodesPerMethodCall: number;
    maxNodesPerRegisterNodes: number;
    maxNodesPerNodeManagement: number;
    maxMonitoredItemsPerCall: number;
    maxNodesPerHistoryReadData: number;
    maxNodesPerHistoryReadEvents: number;
    maxNodesPerHistoryUpdateData: number;
    maxNodesPerHistoryUpdateEvents: number;
    maxNodesPerTranslateBrowsePathsToNodeIds: number;
    constructor(options: OperationLimitsOptions);
}
export interface ServerCapabilitiesOptions {
    maxBrowseContinuationPoints?: number;
    maxHistoryContinuationPoints?: number;
    maxStringLength?: number;
    maxArrayLength?: number;
    maxByteStringLength?: number;
    maxQueryContinuationPoints?: number;
    minSupportedSampleRate?: number;
    operationLimits?: OperationLimitsOptions;
    serverProfileArray?: string[];
    localeIdArray?: string[];
    softwareCertificates?: SignedSoftwareCertificate[];
}
/**
 */
export declare class ServerCapabilities {
    maxBrowseContinuationPoints: number;
    maxHistoryContinuationPoints: number;
    maxStringLength: number;
    maxArrayLength: number;
    maxByteStringLength: number;
    maxQueryContinuationPoints: number;
    minSupportedSampleRate: number;
    operationLimits: OperationLimits;
    serverProfileArray: string[];
    localeIdArray: string[];
    softwareCertificates: SignedSoftwareCertificate[];
    constructor(options: ServerCapabilitiesOptions);
}
