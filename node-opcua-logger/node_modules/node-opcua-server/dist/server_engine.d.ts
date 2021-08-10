/// <reference types="node" />
import { EventEmitter } from "events";
import { AddressSpace, SessionContext } from "node-opcua-address-space";
import { DataValue } from "node-opcua-data-value";
import { ServerDiagnosticsSummaryDataType, ServerState, ServerStatusDataType } from "node-opcua-common";
import { AttributeIds } from "node-opcua-data-model";
import { NodeId, NodeIdLike } from "node-opcua-nodeid";
import { BrowseResult } from "node-opcua-service-browse";
import { ReadRequest, TimestampsToReturn } from "node-opcua-service-read";
import { TransferResult } from "node-opcua-service-subscription";
import { ObjectRegistry } from "node-opcua-object-registry";
import { ApplicationDescription } from "node-opcua-service-endpoints";
import { HistoryReadRequest, HistoryReadResult } from "node-opcua-service-history";
import { StatusCode } from "node-opcua-status-code";
import { BrowseDescription, BrowsePath, BrowsePathResult, BuildInfo, BuildInfoOptions, ReadAtTimeDetails, ReadEventDetails, ReadProcessedDetails, ReadRawModifiedDetails, WriteValue } from "node-opcua-types";
import { HistoryServerCapabilities, HistoryServerCapabilitiesOptions } from "./history_server_capabilities";
import { ServerCapabilities, ServerCapabilitiesOptions } from "./server_capabilities";
import { ServerSession } from "./server_session";
import { Subscription } from "./server_subscription";
export declare type StringGetter = () => string;
export interface ServerEngineOptions {
    applicationUri: string | StringGetter;
    buildInfo?: BuildInfoOptions;
    isAuditing?: boolean;
    /**
     * set to true to enable serverDiagnostics
     */
    serverDiagnosticsEnabled?: boolean;
    serverCapabilities?: ServerCapabilitiesOptions;
    historyServerCapabilities?: HistoryServerCapabilitiesOptions;
}
/**
 *
 */
export declare class ServerEngine extends EventEmitter {
    static readonly registry: ObjectRegistry;
    isAuditing: boolean;
    serverDiagnosticsSummary: ServerDiagnosticsSummaryDataType;
    serverDiagnosticsEnabled: boolean;
    serverCapabilities: ServerCapabilities;
    historyServerCapabilities: HistoryServerCapabilities;
    clientDescription?: ApplicationDescription;
    addressSpace: AddressSpace | null;
    serverStatus: ServerStatusDataType;
    _rejectedSessionCount: number;
    private _sessions;
    private _closedSessions;
    private _orphanPublishEngine?;
    private status;
    private _shutdownTask;
    private _applicationUri;
    constructor(options: ServerEngineOptions);
    dispose(): void;
    readonly startTime: Date;
    readonly currentTime: Date;
    readonly buildInfo: BuildInfo;
    /**
     * register a function that will be called when the server will perform its shut down.
     * @method registerShutdownTask
     */
    registerShutdownTask(task: any): void;
    /**
     * @method shutdown
     */
    shutdown(): void;
    /**
     * the number of active sessions
     */
    readonly currentSessionCount: number;
    /**
     * the cumulated number of sessions that have been opened since this object exists
     */
    readonly cumulatedSessionCount: number;
    /**
     * the number of active subscriptions.
     */
    readonly currentSubscriptionCount: number;
    /**
     * the cumulated number of subscriptions that have been created since this object exists
     */
    readonly cumulatedSubscriptionCount: number;
    readonly rejectedSessionCount: number;
    readonly rejectedRequestsCount: number;
    readonly sessionAbortCount: number;
    readonly sessionTimeoutCount: number;
    readonly publishingIntervalCount: number;
    /**
     * @method secondsTillShutdown
     * @return the approximate number of seconds until the server will be shut down. The
     * value is only relevant once the state changes into SHUTDOWN.
     */
    secondsTillShutdown(): number;
    /**
     * the name of the server
     */
    readonly serverName: string;
    /**
     * the server urn
     */
    readonly serverNameUrn: string;
    /**
     * the urn of the server namespace
     */
    readonly serverNamespaceUrn: string;
    setServerState(serverState: ServerState): void;
    getServerDiagnosticsEnabledFlag(): boolean;
    /**
     * @method initialize
     * @async
     *
     * @param options {Object}
     * @param options.nodeset_filename {String} - [option](default : 'mini.Node.Set2.xml' )
     * @param callback
     */
    initialize(options: any, callback: any): void;
    /**
     *
     * @method browseSingleNode
     * @param nodeId {NodeId|String} : the nodeid of the element to browse
     * @param browseDescription
     * @param browseDescription.browseDirection {BrowseDirection} :
     * @param browseDescription.referenceTypeId {String|NodeId}
     * @param [context]
     * @return  the browse result
     */
    browseSingleNode(nodeId: NodeIdLike, browseDescription: BrowseDescription, context?: SessionContext): BrowseResult;
    /**
     *
     */
    browse(nodesToBrowse: BrowseDescription[], context?: SessionContext): BrowseResult[];
    /**
     *
     * @method readSingleNode
     * @param context
     * @param nodeId
     * @param attributeId
     * @param [timestampsToReturn=TimestampsToReturn.Neither]
     * @return DataValue
     */
    readSingleNode(context: SessionContext, nodeId: NodeId, attributeId: AttributeIds, timestampsToReturn?: TimestampsToReturn): DataValue;
    /**
     *
     *
     *    Maximum age of the value to be read in milliseconds. The age of the value is based on the difference between
     *    the ServerTimestamp and the time when the  Server starts processing the request. For example if the Client
     *    specifies a maxAge of 500 milliseconds and it takes 100 milliseconds until the Server starts  processing
     *    the request, the age of the returned value could be 600 milliseconds  prior to the time it was requested.
     *    If the Server has one or more values of an Attribute that are within the maximum age, it can return any one
     *    of the values or it can read a new value from the data  source. The number of values of an Attribute that
     *    a Server has depends on the  number of MonitoredItems that are defined for the Attribute. In any case,
     *    the Client can make no assumption about which copy of the data will be returned.
     *    If the Server does not have a value that is within the maximum age, it shall attempt to read a new value
     *    from the data source.
     *    If the Server cannot meet the requested maxAge, it returns its 'best effort' value rather than rejecting the
     *    request.
     *    This may occur when the time it takes the Server to process and return the new data value after it has been
     *    accessed is greater than the specified maximum age.
     *    If maxAge is set to 0, the Server shall attempt to read a new value from the data source.
     *    If maxAge is set to the max Int32 value or greater, the Server shall attempt to geta cached value.
     *    Negative values are invalid for maxAge.
     *
     *  @return  an array of DataValue
     */
    read(context: SessionContext, readRequest: ReadRequest): DataValue[];
    /**
     *
     * @method writeSingleNode
     * @param context
     * @param writeValue
     * @param callback
     * @param callback.err
     * @param callback.statusCode
     * @async
     */
    writeSingleNode(context: SessionContext, writeValue: WriteValue, callback: (err: Error | null, statusCode?: StatusCode) => void): void;
    /**
     * write a collection of nodes
     * @method write
     * @param context
     * @param nodesToWrite
     * @param callback
     * @param callback.err
     * @param callback.results
     * @async
     */
    write(context: SessionContext, nodesToWrite: WriteValue[], callback: (err: Error | null, statusCodes?: StatusCode[]) => void): void;
    /**
     *
     */
    historyReadSingleNode(context: SessionContext, nodeId: NodeId, attributeId: AttributeIds, historyReadDetails: ReadRawModifiedDetails | ReadEventDetails | ReadProcessedDetails | ReadAtTimeDetails, timestampsToReturn: TimestampsToReturn, callback: (err: Error | null, results?: HistoryReadResult) => void): void;
    /**
     *
     *  @method historyRead
     *  @param context {SessionContext}
     *  @param historyReadRequest {HistoryReadRequest}
     *  @param historyReadRequest.requestHeader  {RequestHeader}
     *  @param historyReadRequest.historyReadDetails  {HistoryReadDetails}
     *  @param historyReadRequest.timestampsToReturn  {TimestampsToReturn}
     *  @param historyReadRequest.releaseContinuationPoints  {Boolean}
     *  @param historyReadRequest.nodesToRead {HistoryReadValueId[]}
     *  @param callback
     *  @param callback.err
     *  @param callback.results {HistoryReadResult[]}
     */
    historyRead(context: SessionContext, historyReadRequest: HistoryReadRequest, callback: (err: Error | null, results: HistoryReadResult[]) => void): void;
    getOldestUnactivatedSession(): ServerSession | null;
    /**
     * create a new server session object.
     * @class ServerEngine
     * @method createSession
     * @param  [options] {Object}
     * @param  [options.sessionTimeout = 1000] {Number} sessionTimeout
     * @param  [options.clientDescription] {ApplicationDescription}
     * @return {ServerSession}
     */
    createSession(options: any): ServerSession;
    /**
     * @method closeSession
     * @param authenticationToken
     * @param deleteSubscriptions {Boolean} : true if sessions's subscription shall be deleted
     * @param {String} [reason = "CloseSession"] the reason for closing the session (
     *                 shall be "Timeout", "Terminated" or "CloseSession")
     *
     *
     * what the specs say:
     * -------------------
     *
     * If a Client invokes the CloseSession Service then all Subscriptions associated with the Session are also deleted
     * if the deleteSubscriptions flag is set to TRUE. If a Server terminates a Session for any other reason,
     * Subscriptions associated with the Session, are not deleted. Each Subscription has its own lifetime to protect
     * against data loss in the case of a Session termination. In these cases, the Subscription can be reassigned to
     * another Client before its lifetime expires.
     */
    closeSession(authenticationToken: NodeId, deleteSubscriptions: boolean, reason: string): void;
    findSubscription(subscriptionId: number): Subscription | null;
    findOrphanSubscription(subscriptionId: number): Subscription | null;
    deleteOrphanSubscription(subscription: Subscription): StatusCode;
    /**
     * @method transferSubscription
     * @param session           {ServerSession}  - the new session that will own the subscription
     * @param subscriptionId    {IntegerId}      - the subscription Id to transfer
     * @param sendInitialValues {Boolean}        - true if initial values will be resent.
     * @return                  {TransferResult}
     */
    transferSubscription(session: ServerSession, subscriptionId: number, sendInitialValues: boolean): TransferResult;
    /**
     * retrieve a session by its authenticationToken.
     *
     * @method getSession
     * @param authenticationToken
     * @param activeOnly
     * @return {ServerSession}
     */
    getSession(authenticationToken: NodeId, activeOnly?: boolean): ServerSession | null;
    /**
     */
    browsePath(browsePath: BrowsePath): BrowsePathResult;
    /**
     *
     * performs a call to ```asyncRefresh``` on all variable nodes that provide an async refresh func.
     *
     * @method refreshValues
     * @param nodesToRefresh {Array<Object>}  an array containing the node to consider
     * Each element of the array shall be of the form { nodeId: <xxx>, attributeIds: <value> }.
     * @param callback
     * @param callback.err
     * @param callback.data  an array containing value read
     * The array length matches the number of  nodeIds that are candidate for an async refresh (i.e: nodes that
     * are of type Variable with asyncRefresh func }
     *
     * @async
     */
    refreshValues(nodesToRefresh: any, callback: (err: Error | null, dataValues?: DataValue[]) => void): void;
    private _exposeSubscriptionDiagnostics;
    private _unexposeSubscriptionDiagnostics;
    /**
     * create a new subscription
     * @return {Subscription}
     */
    private _createSubscriptionOnSession;
    private __findObject;
    private _readSingleNode;
    private _historyReadSingleNode;
    /**
     */
    private __internal_bindMethod;
    private _getServerSubscriptionDiagnosticsArray;
}
