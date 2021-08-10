/// <reference types="node" />
import { EventEmitter } from "events";
import { DateTime } from "node-opcua-basic-types";
import { ExtraDataTypeManager } from "node-opcua-client-dynamic-extension-object";
import { Certificate, Nonce } from "node-opcua-crypto";
import { LocalizedTextLike } from "node-opcua-data-model";
import { DataValue } from "node-opcua-data-value";
import { ExtensionObject } from "node-opcua-extension-object";
import { NodeId, NodeIdLike } from "node-opcua-nodeid";
import { AnyConstructorFunc } from "node-opcua-schemas";
import { ErrorCallback, SignatureData } from "node-opcua-secure-channel";
import { BrowseResult } from "node-opcua-service-browse";
import { CallMethodResult } from "node-opcua-service-call";
import { EndpointDescription } from "node-opcua-service-endpoints";
import { HistoryReadResult } from "node-opcua-service-history";
import { QueryFirstResponse } from "node-opcua-service-query";
import { CreateMonitoredItemsResponse, CreateSubscriptionResponse, DeleteMonitoredItemsResponse, DeleteSubscriptionsResponse, ModifyMonitoredItemsResponse, ModifySubscriptionResponse, PublishRequest, PublishResponse, RepublishRequest, RepublishResponse, SetMonitoringModeResponse, TransferSubscriptionsResponse } from "node-opcua-service-subscription";
import { BrowsePath, BrowsePathResult } from "node-opcua-service-translate-browse-path";
import { StatusCode } from "node-opcua-status-code";
import { VariantLike } from "node-opcua-variant";
import { ArgumentDefinition, BrowseDescriptionLike, CallMethodRequestLike, ClientSession, CreateMonitoredItemsRequestLike, CreateSubscriptionRequestLike, DeleteMonitoredItemsRequestLike, DeleteSubscriptionsRequestLike, MethodId, ModifyMonitoredItemsRequestLike, ModifySubscriptionRequestLike, MonitoredItemData, NodeAttributes, QueryFirstRequestLike, ReadValueIdLike, SetMonitoringModeRequestLike, SubscriptionId, TransferSubscriptionsRequestLike, WriteValueLike } from "../client_session";
import { ClientSubscription } from "../client_subscription";
import { Callback, Request, Response } from "../common";
import { ClientSidePublishEngine } from "./client_publish_engine";
export declare type ResponseCallback<T> = (err: Error | null, response?: T) => void;
/**
 * @class ClientSession
 * @param client {OPCUAClientImpl}
 * @constructor
 * @private
 */
export declare class ClientSessionImpl extends EventEmitter implements ClientSession {
    timeout: number;
    authenticationToken?: NodeId;
    requestedMaxReferencesPerNode: number;
    sessionId: NodeId;
    lastRequestSentTime: Date;
    lastResponseReceivedTime: Date;
    serverCertificate: Certificate;
    name: string;
    serverNonce?: Nonce;
    serverSignature?: SignatureData;
    serverEndpoints: any[];
    _client: any;
    _closed: boolean;
    /**
     * @internal
     */
    _closeEventHasBeenEmitted: boolean;
    private _publishEngine;
    private _keepAliveManager?;
    private _namespaceArray?;
    constructor(client: any);
    /**
     * the endpoint on which this session is operating
     * @property endpoint
     * @type {EndpointDescription}
     */
    readonly endpoint: EndpointDescription;
    readonly subscriptionCount: number;
    readonly isReconnecting: any;
    getPublishEngine(): ClientSidePublishEngine;
    /**
     * @method browse
     * @async
     *
     * @example
     *
     *    ```javascript
     *    session.browse("RootFolder",function(err,browseResult) {
     *      if(err) return callback(err);
     *      console.log(browseResult.toString());
     *      callback();
     *    } );
     *    ```
     *
     *
     * @example
     *
     *    ``` javascript
     *    const browseDescription = {
     *       nodeId: "ObjectsFolder",
     *       referenceTypeId: "Organizes",
     *       browseDirection: BrowseDirection.Inverse,
     *       includeSubtypes: true,
     *       nodeClassMask: 0,
     *       resultMask: 63
     *    }
     *    session.browse(browseDescription,function(err, browseResult) {
     *       if(err) return callback(err);
     *       console.log(browseResult.toString());
     *       callback();
     *    });
     *    ```
     * @example
     *
     * ``` javascript
     * session.browse([ "RootFolder", "ObjectsFolder"],function(err, browseResults) {
     *       assert(browseResults.length === 2);
     * });
     * ```
     *
     * @example
     * ``` javascript
     * const browseDescriptions = [
     * {
     *   nodeId: "ObjectsFolder",
     *   referenceTypeId: "Organizes",
     *   browseDirection: BrowseDirection.Inverse,
     *   includeSubtypes: true,
     *   nodeClassMask: 0,
     *   resultMask: 63
     * },
     * // {...}
     * ]
     *  session.browse(browseDescriptions,function(err, browseResults) {
     *
     *   });
     * ```
     *
     *
     */
    browse(nodeToBrowse: BrowseDescriptionLike, callback: ResponseCallback<BrowseResult>): void;
    browse(nodesToBrowse: BrowseDescriptionLike[], callback: ResponseCallback<BrowseResult[]>): void;
    browse(nodeToBrowse: BrowseDescriptionLike): Promise<BrowseResult>;
    browse(nodesToBrowse: BrowseDescriptionLike[]): Promise<BrowseResult[]>;
    browseNext(continuationPoint: Buffer, releaseContinuationPoints: boolean, callback: ResponseCallback<BrowseResult>): void;
    browseNext(continuationPoints: Buffer[], releaseContinuationPoints: boolean, callback: ResponseCallback<BrowseResult[]>): void;
    browseNext(continuationPoint: Buffer, releaseContinuationPoints: boolean): Promise<BrowseResult>;
    browseNext(continuationPoints: Buffer[], releaseContinuationPoints: boolean): Promise<BrowseResult[]>;
    /**
     * @method readVariableValue
     * @async
     *
     * @example
     *
     * ```javascript
     *     session.readVariableValue("ns=2;s=Furnace_1.Temperature",function(err,dataValue) {
     *        if(err) { return callback(err); }
     *        if (dataValue.statusCode === opcua.StatusCodes.Good) {
     *        }
     *        console.log(dataValue.toString());
     *        callback();
     *     });
     * ```
     *
     * @example
     *
     * ```javascript
     *   session.readVariableValue(["ns=0;i=2257","ns=0;i=2258"],function(err,dataValues) {
     *      if (!err) {
     *         console.log(dataValues[0].toString());
     *         console.log(dataValues[1].toString());
     *      }
     *   });
     * ```
     *
     * @example
     * ```javascript
     *     const dataValues = await session.readVariableValue(["ns=1;s=Temperature","ns=1;s=Pressure"]);
     * ```
     */
    readVariableValue(nodeId: NodeIdLike, callback: ResponseCallback<DataValue>): void;
    readVariableValue(nodeIds: NodeIdLike[], callback: ResponseCallback<DataValue[]>): void;
    readVariableValue(nodeId: NodeIdLike): Promise<DataValue>;
    readVariableValue(nodeIds: NodeIdLike[]): Promise<DataValue[]>;
    /**
     * @method readHistoryValue
     * @async
     *
     * @example
     *
     * ```javascript
     * //  es5
     * session.readHistoryValue(
     *   "ns=5;s=Simulation Examples.Functions.Sine1",
     *   "2015-06-10T09:00:00.000Z",
     *   "2015-06-10T09:01:00.000Z", function(err,dataValues) {
     *
     * });
     * ```
     *
     * ```javascript
     * //  es6
     * const dataValues = await session.readHistoryValue(
     *   "ns=5;s=Simulation Examples.Functions.Sine1",
     *   "2015-06-10T09:00:00.000Z",
     *   "2015-06-10T09:01:00.000Z");
     * ```
     * @param nodes   the read value id
     * @param start   the start time in UTC format
     * @param end     the end time in UTC format
     * @param callback
     */
    readHistoryValue(nodes: ReadValueIdLike[], start: DateTime, end: DateTime, callback: (err: Error | null, results?: HistoryReadResult[]) => void): void;
    readHistoryValue(nodes: ReadValueIdLike[], start: DateTime, end: DateTime): Promise<HistoryReadResult[]>;
    readHistoryValue(node: ReadValueIdLike, start: DateTime, end: DateTime, callback: (err: Error | null, results?: HistoryReadResult) => void): void;
    readHistoryValue(nodes: ReadValueIdLike, start: DateTime, end: DateTime): Promise<HistoryReadResult>;
    /**
     *
     * @method write
     * @param nodesToWrite {WriteValue[]}  - the array of value to write. One or more elements.
     * @param {Function} callback -   the callback function
     * @param callback.err {object|null} the error if write has failed or null if OK
     * @param callback.statusCodes {StatusCode[]} - an array of status code of each write
     * @async
     *
     * @example
     *
     *     const nodesToWrite = [
     *     {
     *          nodeId: "ns=1;s=SetPoint1",
     *          attributeId: opcua.AttributeIds.Value,
     *          value: {
     *             statusCode: Good,
     *             value: {
     *               dataType: opcua.DataType.Double,
     *               value: 100.0
     *             }
     *          }
     *     },
     *     {
     *          nodeId: "ns=1;s=SetPoint2",
     *          attributeIds opcua.AttributeIds.Value,
     *          value: {
     *             statusCode: Good,
     *             value: {
     *               dataType: opcua.DataType.Double,
     *               value: 45.0
     *             }
     *          }
     *     }
     *     ];
     *     session.write(nodesToWrite,function (err,statusCodes) {
     *       if(err) { return callback(err);}
     *       //
     *     });
     *
     * @method write
     * @param nodeToWrite {WriteValue}  - the value to write
     * @param callback -   the callback function
     * @param callback.err {object|null} the error if write has failed or null if OK
     * @param callback.statusCode {StatusCodes} - the status code of the write
     * @async
     *
     * @example
     *
     *     const nodeToWrite = {
     *          nodeId: "ns=1;s=SetPoint",
     *          attributeId: opcua.AttributeIds.Value,
     *          value: {
     *             statusCode: Good,
     *             value: {
     *               dataType: opcua.DataType.Double,
     *               value: 100.0
     *             }
     *          }
     *     };
     *     session.write(nodeToWrite,function (err,statusCode) {
     *       if(err) { return callback(err);}
     *       //
     *     });
     *
     *
     * @method write
     * @param nodeToWrite {WriteValue}  - the value to write
     * @return {Promise<StatusCode>}
     * @async
     *
     * @example
     *
     * ```javascript
     *   session.write(nodeToWrite).then(function(statusCode) { });
     * ```
     *
     * @example
     *
     * ```javascript
     *   const statusCode = await session.write(nodeToWrite);
     * ```
     *
     * @method write
     * @param nodesToWrite {Array<WriteValue>}  - the value to write
     * @return {Promise<Array<StatusCode>>}
     * @async
     *
     * @example
     * ```javascript
     * session.write(nodesToWrite).then(function(statusCodes) { });
     * ```
     *
     * @example
     * ```javascript
     *   const statusCodes = await session.write(nodesToWrite);
     * ```
     */
    write(nodeToWrite: WriteValueLike, callback: ResponseCallback<StatusCode>): void;
    write(nodesToWrite: WriteValueLike[], callback: ResponseCallback<StatusCode[]>): void;
    write(nodesToWrite: WriteValueLike[]): Promise<StatusCode[]>;
    write(nodeToWrite: WriteValueLike): Promise<StatusCode>;
    /**
     *
     * @method writeSingleNode
     * @async
     * @param nodeId  {NodeId}  - the node id of the node to write
     * @param value   {Variant} - the value to write
     * @param callback   {Function}
     * @param callback.err {object|null} the error if write has failed or null if OK
     * @param callback.statusCode {StatusCode} - the status code of the write
     *
     * @method writeSingleNode
     * @async
     * @param nodeId  {NodeId}  - the node id of the node to write
     * @param value   {Variant} - the value to write
     * @return {Promise<StatusCode>} - the status code of the write
     *
     */
    writeSingleNode(nodeId: NodeIdLike, value: VariantLike, callback: ResponseCallback<StatusCode>): void;
    writeSingleNode(nodeId: NodeIdLike, value: VariantLike): Promise<StatusCode>;
    /**
     * @method readAllAttributes
     *
     * @example
     *
     *
     *  ``` javascript
     *  session.readAllAttributes("ns=2;s=Furnace_1.Temperature",function(err,data) {
     *    if(data.statusCode === StatusCodes.Good) {
     *      console.log(" nodeId      = ",data.nodeId.toString());
     *      console.log(" browseName  = ",data.browseName.toString());
     *      console.log(" description = ",data.description.toString());
     *      console.log(" value       = ",data.value.toString()));
     *    }
     *  });
     *  ```
     *
     * @async
     * @param nodes  array of nodeId to read
     * @param node  nodeId to read
     * @param callback
     */
    readAllAttributes(node: NodeIdLike, callback: (err: Error | null, data?: NodeAttributes) => void): void;
    readAllAttributes(nodes: NodeIdLike[], callback: (err: Error | null, data?: NodeAttributes[]) => void): void;
    /**
     * @method read (form1)
     *
     * @async
     *
     * @example
     *
     *     ```javascript
     *     ```
     *
     *   form1: reading a single node
     *
     *  ``` javascript
     *    const nodeToRead = {
     *             nodeId:      "ns=2;s=Furnace_1.Temperature",
     *             attributeId: AttributeIds.BrowseName
     *    };
     *
     *    session.read(nodeToRead,function(err,dataValue) {
     *        if (!err) {
     *           console.log(dataValue.toString());
     *        }
     *    });
     *    ```
     *
     *
     * @method read (form2)
     * @param nodesToRead               {Array<ReadValueId>} - an array of nodeId to read or a ReadValueId
     * @param [maxAge]                 {Number}
     * @param callback                 {Function}                - the callback function
     * @param callback.err             {Error|null}              - the error or null if the transaction was OK}
     * @param callback.dataValues       {Array<DataValue>}
     * @async
     *
     * @example
     *
     *   ``` javascript
     *   const nodesToRead = [
     *        {
     *             nodeId:      "ns=2;s=Furnace_1.Temperature",
     *             attributeId: AttributeIds.BrowseName
     *        }
     *   ];
     *   session.read(nodesToRead,function(err,dataValues) {
     *     if (!err) {
     *       dataValues.forEach(dataValue=>console.log(dataValue.toString()));
     *     }
     *   });
     *   ```
     *
     */
    read(nodeToRead: ReadValueIdLike, maxAge: number, callback: ResponseCallback<DataValue>): void;
    read(nodesToRead: ReadValueIdLike[], maxAge: number, callback: ResponseCallback<DataValue[]>): void;
    read(nodeToRead: ReadValueIdLike, callback: ResponseCallback<DataValue>): void;
    read(nodesToRead: ReadValueIdLike[], callback: ResponseCallback<DataValue[]>): void;
    read(nodeToRead: ReadValueIdLike, maxAge?: number): Promise<DataValue>;
    read(nodeToRead: ReadValueIdLike[], maxAge?: number): Promise<DataValue[]>;
    emitCloseEvent(statusCode: StatusCode): void;
    createSubscription(options: CreateSubscriptionRequestLike, callback?: ResponseCallback<CreateSubscriptionResponse>): any;
    /**
     * @method createSubscription2
     * @param createSubscriptionRequest
     * @param callback
     *
     *
     * subscription.on("error',    function(err){ ... });
     * subscription.on("terminate',function(err){ ... });
     * const monitoredItem = await subscription.monitor(itemToMonitor,monitoringParameters,requestedParameters);
     * monitoredItem.on("changed",function( dataValue) {...});
     *
     */
    createSubscription2(createSubscriptionRequest: CreateSubscriptionRequestLike): Promise<ClientSubscription>;
    createSubscription2(createSubscriptionRequest: CreateSubscriptionRequestLike, callback: (err: Error | null, subscription?: ClientSubscription) => void): void;
    /**
     * @method deleteSubscriptions
     * @async
     * @example:
     *
     *     session.deleteSubscriptions(request,function(err,response) {} );
     */
    deleteSubscriptions(options: DeleteSubscriptionsRequestLike, callback?: ResponseCallback<DeleteSubscriptionsResponse>): any;
    /**
     * @method transferSubscriptions
     * @async
     */
    transferSubscriptions(options: TransferSubscriptionsRequestLike, callback?: ResponseCallback<TransferSubscriptionsResponse>): any;
    createMonitoredItems(options: CreateMonitoredItemsRequestLike, callback?: ResponseCallback<CreateMonitoredItemsResponse>): any;
    modifyMonitoredItems(options: ModifyMonitoredItemsRequestLike, callback?: ResponseCallback<ModifyMonitoredItemsResponse>): any;
    /**
     *
     * @method modifySubscription
     * @async
     * @param options {ModifySubscriptionRequest}
     * @param callback {Function}
     * @param callback.err {Error|null}   - the Error if the async method has failed
     * @param callback.response {ModifySubscriptionResponse} - the response
     */
    modifySubscription(options: ModifySubscriptionRequestLike, callback?: ResponseCallback<ModifySubscriptionResponse>): any;
    setMonitoringMode(options: SetMonitoringModeRequestLike, callback?: ResponseCallback<SetMonitoringModeResponse>): any;
    /**
     *
     * @method publish
     * @async
     * @param options  {PublishRequest}
     * @param callback {Function}
     * @param callback.err {Error|null}   - the Error if the async method has failed
     * @param callback.response {PublishResponse} - the response
     */
    publish(options: PublishRequest, callback: (err: Error | null, response?: PublishResponse) => void): void;
    /**
     *
     * @method republish
     * @async
     * @param options  {RepublishRequest}
     * @param callback the callback
     */
    republish(options: RepublishRequest, callback: (err: Error | null, response?: RepublishResponse) => void): void;
    /**
     *
     * @method deleteMonitoredItems
     * @async
     * @param options  {DeleteMonitoredItemsRequest}
     * @param callback {Function}
     * @param callback.err {Error|null}   - the Error if the async method has failed
     */
    deleteMonitoredItems(options: DeleteMonitoredItemsRequestLike, callback: (err: Error | null, response?: DeleteMonitoredItemsResponse) => void): void;
    /**
     *
     * @method setPublishingMode
     * @async
     */
    setPublishingMode(publishingEnabled: boolean, subscriptionId: SubscriptionId): Promise<StatusCode>;
    setPublishingMode(publishingEnabled: boolean, subscriptionIds: SubscriptionId[]): Promise<StatusCode[]>;
    setPublishingMode(publishingEnabled: boolean, subscriptionId: SubscriptionId, callback: (err: Error | null, statusCode?: StatusCode) => void): void;
    setPublishingMode(publishingEnabled: boolean, subscriptionIds: SubscriptionId[], callback: (err: Error | null, statusCodes?: StatusCode[]) => void): void;
    /**
     *
     * @method translateBrowsePath
     * @async
     * @param browsePath {BrowsePath|Array<BrowsePath>}
     * @param callback {Function}
     * @param callback.err {Error|null}
     * @param callback.response {BrowsePathResult|Array<BrowsePathResult>}
     *
     *
     *
     */
    translateBrowsePath(browsePath: BrowsePath, callback: ResponseCallback<BrowsePathResult>): void;
    translateBrowsePath(browsesPath: BrowsePath[], callback: ResponseCallback<BrowsePathResult[]>): void;
    translateBrowsePath(browsePath: BrowsePath): Promise<BrowsePathResult>;
    translateBrowsePath(browsePaths: BrowsePath[]): Promise<BrowsePathResult[]>;
    isChannelValid(): boolean;
    performMessageTransaction(request: Request, callback: (err: Error | null, response?: Response) => void): void;
    /**
     *  evaluate the remaining time for the session
     *
     *
     * evaluate the time in milliseconds that the session will live
     * on the server end from now.
     * The remaining live time is calculated based on when the last message was sent to the server
     * and the session timeout.
     *
     * * In normal operation , when server and client communicates on a regular
     *   basis, evaluateRemainingLifetime will return a number slightly below
     *   session.timeout
     *
     * * when the client and server cannot communicate due to a network issue
     *   (or a server crash), evaluateRemainingLifetime returns the estimated number
     *   of milliseconds before the server (if not crash) will keep  the session alive
     *   on its end to allow a automatic reconnection with session.
     *
     * * When evaluateRemainingLifetime returns zero , this mean that
     *   the session has probably ended on the server side and will have to be recreated
     *   from scratch in case of a reconnection.
     *
     * @return the number of milliseconds before session expires
     */
    evaluateRemainingLifetime(): number;
    _terminatePublishEngine(): void;
    /**
     *
     * @method close
     * @async
     * @param [deleteSubscription=true] {Boolean}
     * @param callback {Function}
     */
    close(callback: ErrorCallback): void;
    close(deleteSubscription: boolean, callback: ErrorCallback): void;
    close(deleteSubscription?: boolean): Promise<void>;
    /**
     * @method hasBeenClosed
     * @return {Boolean}
     */
    hasBeenClosed(): boolean;
    call(methodToCall: CallMethodRequestLike): Promise<CallMethodResult>;
    call(methodToCall: CallMethodRequestLike[]): Promise<CallMethodResult[]>;
    call(methodToCall: CallMethodRequestLike, callback: ResponseCallback<CallMethodResult>): void;
    call(methodsToCall: CallMethodRequestLike[], callback: ResponseCallback<CallMethodResult[]>): void;
    /**
     * @method getMonitoredItems
     * @param subscriptionId {UInt32} the subscription Id to return
     * @param callback {Function}
     * @param callback.err {Error}
     * @param callback.monitoredItems the monitored Items
     * @param callback.monitoredItems the monitored Items
     */
    getMonitoredItems(subscriptionId: SubscriptionId): Promise<MonitoredItemData>;
    getMonitoredItems(subscriptionId: SubscriptionId, callback: ResponseCallback<MonitoredItemData>): void;
    /**
     * @method getArgumentDefinition
     *    extract the argument definition of a method
     * @param methodId the method nodeId to get argument definition from
     * @async
     *
     */
    getArgumentDefinition(methodId: MethodId): Promise<ArgumentDefinition>;
    getArgumentDefinition(methodId: MethodId, callback: ResponseCallback<ArgumentDefinition>): void;
    registerNodes(nodesToRegister: NodeIdLike[]): Promise<NodeId[]>;
    registerNodes(nodesToRegister: NodeIdLike[], callback: (err: Error | null, registeredNodeIds?: NodeId[]) => void): void;
    unregisterNodes(nodesToUnregister: NodeIdLike[]): Promise<void>;
    unregisterNodes(nodesToUnregister: NodeIdLike[], callback: (err?: Error) => void): void;
    queryFirst(queryFirstRequest: QueryFirstRequestLike): Promise<QueryFirstResponse>;
    queryFirst(queryFirstRequest: QueryFirstRequestLike, callback: ResponseCallback<QueryFirstResponse>): void;
    startKeepAliveManager(): void;
    stopKeepAliveManager(): void;
    dispose(): void;
    toString(): string;
    getBuiltInDataType(...args: any[]): any;
    resumePublishEngine(): void;
    readNamespaceArray(): Promise<string[]>;
    readNamespaceArray(callback: (err: Error | null, namespaceArray?: string[]) => void): void;
    getNamespaceIndex(namespaceUri: string): number;
    disableCondition(): void;
    enableCondition(): void;
    addCommentCondition(_conditionId: NodeIdLike, _eventId: Buffer, _comment: LocalizedTextLike, _callback?: Callback<StatusCode>): any;
    confirmCondition(_conditionId: NodeIdLike, _eventId: Buffer, _comment: LocalizedTextLike, _callback?: Callback<StatusCode>): any;
    acknowledgeCondition(_conditionId: NodeId, _eventId: Buffer, _comment: LocalizedTextLike, _callback?: Callback<StatusCode>): any;
    findMethodId(_nodeId: NodeIdLike, _methodName: string, _callback?: ResponseCallback<NodeId>): any;
    _callMethodCondition(_methodName: string, _conditionId: NodeIdLike, _eventId: Buffer, _comment: LocalizedTextLike, _callback: Callback<StatusCode>): void;
    extractNamespaceDataType(): Promise<ExtraDataTypeManager>;
    getExtensionObjectConstructor(dataTypeNodeId: NodeId): Promise<AnyConstructorFunc>;
    /**
     *
     * @param dataType
     * @param pojo
     * @async
     */
    constructExtensionObject(dataType: NodeId, pojo: any): Promise<ExtensionObject>;
    private _defaultRequest;
}
