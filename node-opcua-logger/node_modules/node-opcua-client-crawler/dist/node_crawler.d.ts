/// <reference types="node" />
import { EventEmitter } from "events";
import { UAReferenceType } from "node-opcua-address-space";
import { BrowseDescriptionLike, ReadValueIdOptions, ResponseCallback } from "node-opcua-client";
import { DataTypeDefinition } from "node-opcua-common";
import { AccessLevelFlag, BrowseDirection, LocalizedText, NodeClass, QualifiedName } from "node-opcua-data-model";
import { DataValue } from "node-opcua-data-value";
import { NodeId, NodeIdLike } from "node-opcua-nodeid";
import { BrowseResult, ReferenceDescription } from "node-opcua-service-browse";
export declare class CacheNode {
    referenceToParent?: ReferenceDescription;
    parent?: CacheNode;
    nodeId: NodeId;
    browseName: QualifiedName;
    references: ReferenceDescription[];
    nodeClass: NodeClass;
    typeDefinition: any;
    displayName: LocalizedText;
    description: LocalizedText;
    constructor(nodeId: NodeId);
    toString(): string;
}
export interface CacheNodeDataType extends CacheNode {
    nodeClass: NodeClass.DataType;
    dataTypeDefinition: DataTypeDefinition;
}
export interface CacheNodeVariable extends CacheNode {
    nodeClass: NodeClass.Variable;
    dataType: NodeId;
    dataValue: DataValue;
    minimumSamplingInterval: number;
    accessLevel: AccessLevelFlag;
    userAccessLevel: AccessLevelFlag;
    arrayDimensions?: number[];
    valueRank: any;
}
export interface CacheNodeVariableType extends CacheNode {
    nodeClass: NodeClass.VariableType;
    isAbstract: boolean;
    dataType: NodeId;
    dataValue: DataValue;
    accessLevel: AccessLevelFlag;
    arrayDimensions?: number[];
    valueRank: any;
}
export interface CacheNodeObjectType extends CacheNode {
    nodeClass: NodeClass.ObjectType;
    isAbstract: boolean;
    accessLevel: AccessLevelFlag;
    arrayDimensions?: number[];
    valueRank: any;
    eventNotifier: number;
}
export interface CacheNodeReferenceType extends CacheNode {
    nodeClass: NodeClass.ReferenceType;
    isAbstract: boolean;
    inverseName: LocalizedText;
}
declare type ErrorCallback = (err?: Error) => void;
export interface UserData {
    onBrowse: (crawler: NodeCrawler, cacheNode: CacheNode, userData: UserData) => void;
    setExtraReference?: (parentNode: CacheNode, reference: any, childCacheNode: CacheNode, userData: UserData) => void;
}
interface NodeCrawlerEvents {
    on(event: "browsed", handler: (cacheNode: CacheNode, userData: UserData) => void): void;
}
export interface NodeCrawlerClientSession {
    read(nodesToRead: ReadValueIdOptions[], callback: ResponseCallback<DataValue[]>): void;
    browse(nodesToBrowse: BrowseDescriptionLike[], callback: ResponseCallback<BrowseResult[]>): void;
    browseNext(continuationPoints: Buffer[], releaseContinuationPoints: boolean, callback: ResponseCallback<BrowseResult[]>): void;
}
/**
 * @class NodeCrawler
 * @param session
 * @constructor
 */
export declare class NodeCrawler extends EventEmitter implements NodeCrawlerEvents {
    static follow(crawler: NodeCrawler, cacheNode: CacheNode, userData: UserData, referenceType?: string | UAReferenceType, browseDirection?: BrowseDirection): void;
    maxNodesPerRead: number;
    maxNodesPerBrowse: number;
    startTime: Date;
    readCounter: number;
    browseCounter: number;
    browseNextCounter: number;
    transactionCounter: number;
    private readonly session;
    private readonly browseNameMap;
    private readonly taskQueue;
    private readonly pendingReadTasks;
    private readonly pendingBrowseTasks;
    private readonly pendingBrowseNextTasks;
    private readonly _objectCache;
    private readonly _objMap;
    private _crawled;
    private _visitedNode;
    private _prePopulatedSet;
    constructor(session: NodeCrawlerClientSession);
    dispose(): void;
    toString(): string;
    crawl(nodeId: NodeIdLike, userData: UserData): Promise<void>;
    crawl(nodeId: NodeIdLike, userData: UserData, endCallback: ErrorCallback): void;
    /**
     *
     */
    read(nodeId: NodeIdLike): Promise<any>;
    read(nodeId: NodeIdLike, callback: (err: Error | null, obj?: any) => void): void;
    /**
     * @internal
     * @private
     */
    _inner_crawl(nodeId: NodeId, userData: UserData, endCallback: ErrorCallback): void;
    _add_crawl_task(cacheNode: CacheNode, userData: any): void;
    followReference(parentNode: CacheNode, reference: ReferenceDescription, userData: UserData): void;
    private simplify_object;
    private _add_for_reconstruction;
    private _reconstruct_manageable_object;
    /**
     * perform pending read Node operation
     * @method _resolve_deferred_readNode
     * @param callback
     * @private
     * @internal
     */
    private _resolve_deferred_readNode;
    private _resolve_deferred_browseNode;
    private _resolve_deferred_browseNext;
    /**
     * @method _unshift_task
     * add a task on top of the queue (high priority)
     * @param name
     * @param task
     * @private
     */
    private _unshift_task;
    /**
     * @method _push_task
     * add a task at the bottom of the queue (low priority)
     * @param name
     * @param task
     * @private
     */
    private _push_task;
    /***
     * @method _emit_on_crawled
     * @param cacheNode
     * @param userData
     * @private
     */
    private _emit_on_crawled;
    private _crawl_task;
    private _initialize_referenceTypeId;
    private _readOperationalLimits;
    private set_cache_NodeAttribute;
    private has_cache_NodeAttribute;
    private get_cache_NodeAttribute;
    /**
     * request a read operation for a Node+Attribute in the future, provides a callback
     *
     * @method _defer_readNode
     * @param nodeId
     * @param attributeId
     * @param callback
     * @private
     * @internal
     */
    private _defer_readNode;
    private _resolve_deferred;
    private resolve_deferred_readNode;
    private resolve_deferred_browseNode;
    private resolve_deferred_browseNext;
    private _getCacheNode;
    private _createCacheNode;
    /**
     * perform a deferred browse
     * instead of calling session.browse directly, this function add the request to a list
     * so that request can be grouped and send in one single browse command to the server.
     *
     * @method _defer_browse_node
     * @private
     *
     */
    private _defer_browse_node;
    private _defer_browse_next;
    /**
     * @method _process_single_browseResult
     * @param _objectToBrowse
     * @param browseResult
     * @private
     */
    private _process_single_browseResult;
    private _process_single_browseResult2;
    private _process_browse_response_task;
}
export {};
