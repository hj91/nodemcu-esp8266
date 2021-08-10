"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * @module node-opcua-client-crawler
 */
const async = require("async");
const chalk_1 = require("chalk");
const events_1 = require("events");
const _ = require("underscore");
const node_opcua_assert_1 = require("node-opcua-assert");
const node_opcua_constants_1 = require("node-opcua-constants");
const node_opcua_data_model_1 = require("node-opcua-data-model");
const node_opcua_debug_1 = require("node-opcua-debug");
const node_opcua_nodeid_1 = require("node-opcua-nodeid");
const node_opcua_service_browse_1 = require("node-opcua-service-browse");
const node_opcua_status_code_1 = require("node-opcua-status-code");
const node_opcua_utils_1 = require("node-opcua-utils");
const debugLog = node_opcua_debug_1.make_debugLog(__filename);
const doDebug = node_opcua_debug_1.checkDebugFlag(__filename);
//                         "ReferenceType | IsForward | BrowseName | NodeClass | DisplayName | TypeDefinition"
const resultMask = node_opcua_data_model_1.makeResultMask("ReferenceType | IsForward | BrowseName | DisplayName | NodeClass | TypeDefinition");
function make_node_attribute_key(nodeId, attributeId) {
    return nodeId.toString() + "_" + attributeId.toString();
}
//
// some server do not expose the ReferenceType Node in their address space
// ReferenceType are defined by the OPCUA standard and can be prepopulated in the crawler.
// Pre-populating the ReferenceType node in the crawler will also reduce the network traffic.
//
/*=
 *
 * @param arr
 * @param maxNode
 * @private
 * @return {*}
 */
function _fetch_elements(arr, maxNode) {
    node_opcua_assert_1.assert(_.isArray(arr));
    node_opcua_assert_1.assert(arr.length > 0);
    const highLimit = (maxNode <= 0) ? arr.length : maxNode;
    const tmp = arr.splice(0, highLimit);
    node_opcua_assert_1.assert(tmp.length > 0);
    return tmp;
}
const pendingBrowseName = new node_opcua_data_model_1.QualifiedName({ name: "pending" });
function w(s, l) {
    return (s + "                                                                ").substr(0, l);
}
class CacheNode {
    constructor(nodeId) {
        this.description = node_opcua_data_model_1.coerceLocalizedText("");
        /**
         */
        this.nodeId = nodeId;
        /**
         */
        this.browseName = pendingBrowseName;
        /**
         */
        this.references = [];
        this.nodeClass = node_opcua_data_model_1.NodeClass.Unspecified;
        this.typeDefinition = "";
        this.displayName = new node_opcua_data_model_1.LocalizedText({});
    }
    toString() {
        let str = w(this.nodeId.toString(), 20);
        str += " " + w(this.browseName.toString(), 30);
        str += " typeDef : " + w((this.typeDefinition ? this.typeDefinition.toString() : ""), 30);
        str += " nodeClass : " + w(node_opcua_data_model_1.NodeClass[this.nodeClass], 12);
        return str;
    }
}
exports.CacheNode = CacheNode;
const referencesNodeId = node_opcua_nodeid_1.resolveNodeId("References");
// const hierarchicalReferencesId = resolveNodeId("HierarchicalReferences");
const hasTypeDefinitionNodeId = node_opcua_nodeid_1.resolveNodeId("HasTypeDefinition");
function dedup_reference(references) {
    const results = [];
    const dedup = {};
    for (const reference of references) {
        const key = reference.referenceTypeId.toString() + reference.nodeId.toString();
        /* istanbul ignore next */
        if (dedup[key]) {
            debugLog(" Warning => Duplicated reference found  !!!! please contact the server vendor");
            debugLog(reference.toString());
            continue;
        }
        dedup[key] = reference;
        results.push(reference);
    }
    return results;
}
function _setExtraReference(task, callback) {
    const param = task.param;
    node_opcua_assert_1.assert(param.userData.setExtraReference);
    param.userData.setExtraReference(param.parentNode, param.reference, param.childCacheNode, param.userData);
    callback();
}
function remove_cycle(object, innerCallback) {
    const visitedNodeIds = {};
    function hasBeenVisited(e) {
        const key1 = e.nodeId.toString();
        return visitedNodeIds[key1];
    }
    function setVisited(e) {
        const key1 = e.nodeId.toString();
        return visitedNodeIds[key1] = e;
    }
    function mark_array(arr) {
        if (!arr) {
            return;
        }
        node_opcua_assert_1.assert(_.isArray(arr));
        for (const e of arr) {
            if (hasBeenVisited(e)) {
                return;
            }
            else {
                setVisited(e);
                explorerObject(e);
            }
        }
    }
    function explorerObject(obj) {
        mark_array(obj.organizes);
        mark_array(obj.hasComponent);
        mark_array(obj.hasNotifier);
        mark_array(obj.hasProperty);
    }
    explorerObject(object);
    innerCallback(null, object);
}
function getReferenceTypeId(referenceType) {
    if (!referenceType) {
        return null;
    }
    /* istanbul ignore next */
    if (referenceType.toString() === "i=45" || referenceType === "HasSubtype") {
        return node_opcua_nodeid_1.NodeId.resolveNodeId("i=45");
    }
    else if (referenceType.toString() === "i=35" || referenceType === "Organizes") {
        return node_opcua_nodeid_1.NodeId.resolveNodeId("i=35");
    }
    else if (referenceType.toString() === "i=47" || referenceType === "HasComponent") {
        return node_opcua_nodeid_1.NodeId.resolveNodeId("i=47");
    }
    else if (referenceType.toString() === "i=46" || referenceType === "HasProperty") {
        return node_opcua_nodeid_1.NodeId.resolveNodeId("i=46");
    }
    else {
        throw new Error("Invalid reference Type" + referenceType.toString());
    }
    return node_opcua_nodeid_1.NodeId.nullNodeId;
}
// tslint:disable:max-classes-per-file
/**
 * @class NodeCrawler
 * @param session
 * @constructor
 */
class NodeCrawler extends events_1.EventEmitter {
    constructor(session) {
        super();
        this.maxNodesPerRead = 0;
        this.maxNodesPerBrowse = 0;
        this.startTime = new Date();
        this.readCounter = 0;
        this.browseCounter = 0;
        this.browseNextCounter = 0;
        this.transactionCounter = 0;
        this._prePopulatedSet = new WeakSet();
        this.session = session;
        // verify that session object provides the expected methods (browse/read)
        node_opcua_assert_1.assert(_.isFunction(session.browse));
        node_opcua_assert_1.assert(_.isFunction(session.read));
        this.browseNameMap = {};
        this._objectCache = {};
        this._objMap = {};
        this._initialize_referenceTypeId();
        this.pendingReadTasks = [];
        this.pendingBrowseTasks = [];
        this.pendingBrowseNextTasks = [];
        this.taskQueue = async.queue((task, callback) => {
            // use process next tick to relax the stack frame
            /* istanbul ignore next */
            if (doDebug) {
                debugLog(" executing Task ", task.name); // JSON.stringify(task, null, " "));
            }
            setImmediate(() => {
                task.func.call(this, task, () => {
                    this.resolve_deferred_browseNext();
                    this.resolve_deferred_browseNode();
                    this.resolve_deferred_readNode();
                    callback();
                });
            });
        }, 1);
        // MaxNodesPerRead from Server.ServerCapabilities.OperationLimits
        // VariableIds.ServerType_ServerCapabilities_OperationLimits_MaxNodesPerRead
        this.maxNodesPerRead = 0;
        //  MaxNodesPerBrowse from Server.ServerCapabilities.OperationLimits
        //  VariableIds.Server_ServerCapabilities_OperationLimits_MaxNodesPerBrowse
        this.maxNodesPerBrowse = 0; // 0 = no limits
        // statistics
        this.startTime = new Date();
        this.readCounter = 0;
        this.browseCounter = 0;
        this.transactionCounter = 0;
    }
    static follow(crawler, cacheNode, userData, referenceType, browseDirection) {
        const referenceTypeNodeId = getReferenceTypeId(referenceType);
        for (const reference of cacheNode.references) {
            if (browseDirection === node_opcua_data_model_1.BrowseDirection.Forward && !reference.isForward) {
                continue;
            }
            if (browseDirection === node_opcua_data_model_1.BrowseDirection.Inverse && reference.isForward) {
                continue;
            }
            if (!referenceTypeNodeId) {
                crawler.followReference(cacheNode, reference, userData);
            }
            else {
                if (node_opcua_nodeid_1.NodeId.sameNodeId(referenceTypeNodeId, reference.referenceTypeId)) {
                    crawler.followReference(cacheNode, reference, userData);
                }
            }
        }
    }
    dispose() {
        node_opcua_assert_1.assert(this.pendingReadTasks.length === 0);
        node_opcua_assert_1.assert(this.pendingBrowseTasks.length === 0);
        /*
                this.session = null;
                this.browseNameMap = null;
                this._objectCache = null;
                this._objectToBrowse = null;
                this._objMap = null;
        */
        this.pendingReadTasks.length = 0;
        this.pendingBrowseTasks.length = 0;
    }
    toString() {
        return "" + `reads:       ${this.readCounter}\n` +
            `browses:     ${this.browseCounter}  \n` +
            `transaction: ${this.transactionCounter}  \n`;
    }
    crawl(nodeId, userData, ...args) {
        const endCallback = args[0];
        node_opcua_assert_1.assert(endCallback instanceof Function, "expecting callback");
        nodeId = node_opcua_nodeid_1.resolveNodeId(nodeId);
        node_opcua_assert_1.assert(_.isFunction(endCallback));
        this._readOperationalLimits((err) => {
            /* istanbul ignore next */
            if (err) {
                return endCallback(err);
            }
            this._inner_crawl(nodeId, userData, endCallback);
        });
    }
    read(nodeId, callback) {
        /* istanbul ignore next */
        if (!callback) {
            throw new Error("Invalid Error");
        }
        try {
            nodeId = node_opcua_nodeid_1.resolveNodeId(nodeId);
        } /* istanbul ignore next */
        catch (err) {
            return callback(err);
        }
        const key = nodeId.toString();
        // check if object has already been crawled
        if (this._objMap.hasOwnProperty(key)) {
            const object = this._objMap[key];
            return callback(null, object);
        }
        const userData = {
            onBrowse: NodeCrawler.follow
        };
        this.crawl(nodeId, userData, (err) => {
            /* istanbul ignore next */
            if (err) {
                return callback(err);
            }
            /* istanbul ignore else */
            if (this._objectCache.hasOwnProperty(key)) {
                const cacheNode = this._objectCache[key];
                node_opcua_assert_1.assert(cacheNode.browseName.name !== "pending");
                this.simplify_object(this._objMap, cacheNode, callback);
            }
            else {
                callback(new Error("Cannot find nodeId" + key));
            }
        });
    }
    /**
     * @internal
     * @private
     */
    _inner_crawl(nodeId, userData, endCallback) {
        node_opcua_assert_1.assert(_.isObject(userData));
        node_opcua_assert_1.assert(_.isFunction(endCallback));
        node_opcua_assert_1.assert(!this._visitedNode);
        node_opcua_assert_1.assert(!this._crawled);
        this._visitedNode = {};
        this._crawled = {};
        let hasEnded = false;
        this.taskQueue.drain(() => {
            debugLog("taskQueue is empty !!", this.taskQueue.length());
            if (!hasEnded) {
                hasEnded = true;
                this._visitedNode = null;
                this._crawled = null;
                this.emit("end");
                endCallback();
            }
        });
        let cacheNode = this._getCacheNode(nodeId);
        if (!cacheNode) {
            cacheNode = this._createCacheNode(nodeId);
        }
        node_opcua_assert_1.assert(cacheNode.nodeId.toString() === nodeId.toString());
        // ----------------------- Read missing essential information about node
        // such as nodeClass, typeDefinition browseName, displayName
        // this sequence is only necessary on the top node being crawled,
        // as browseName,displayName,nodeClass will be provided by ReferenceDescription later on for child nodes
        //
        async.parallel({
            task1: (callback) => {
                this._defer_readNode(cacheNode.nodeId, node_opcua_data_model_1.AttributeIds.BrowseName, (err, value) => {
                    /* istanbul ignore else */
                    if (err) {
                        return callback(err);
                    }
                    node_opcua_assert_1.assert(value instanceof node_opcua_data_model_1.QualifiedName);
                    cacheNode.browseName = value;
                    setImmediate(callback);
                });
            },
            task2: (callback) => {
                this._defer_readNode(cacheNode.nodeId, node_opcua_data_model_1.AttributeIds.NodeClass, (err, value) => {
                    /* istanbul ignore else */
                    if (err) {
                        return callback(err);
                    }
                    cacheNode.nodeClass = value;
                    setImmediate(callback);
                });
            },
            task3: (callback) => {
                this._defer_readNode(cacheNode.nodeId, node_opcua_data_model_1.AttributeIds.DisplayName, (err, value) => {
                    /* istanbul ignore else */
                    if (err) {
                        return callback(err);
                    }
                    node_opcua_assert_1.assert(value instanceof node_opcua_data_model_1.LocalizedText);
                    cacheNode.displayName = value;
                    setImmediate(callback);
                });
            },
            task4: (callback) => {
                this._resolve_deferred_readNode(callback);
            }
        }, (err, data) => {
            this._add_crawl_task(cacheNode, userData);
        });
    }
    _add_crawl_task(cacheNode, userData) {
        node_opcua_assert_1.assert(userData);
        node_opcua_assert_1.assert(_.isObject(this));
        node_opcua_assert_1.assert(_.isObject(this._crawled));
        const key = cacheNode.nodeId.toString();
        /* istanbul ignore else */
        if (this._crawled.hasOwnProperty(key)) {
            return;
        }
        this._crawled[key] = 1;
        const task = {
            func: NodeCrawler.prototype._crawl_task,
            param: {
                cacheNode,
                userData
            }
        };
        this._push_task("_crawl task", task);
    }
    followReference(parentNode, reference, userData) {
        node_opcua_assert_1.assert(reference instanceof node_opcua_service_browse_1.ReferenceDescription);
        const crawler = this;
        let referenceTypeIdCacheNode = crawler._getCacheNode(reference.referenceTypeId);
        if (this._prePopulatedSet.has(referenceTypeIdCacheNode)) {
            this._prePopulatedSet.delete(referenceTypeIdCacheNode);
            this._add_crawl_task(referenceTypeIdCacheNode, userData);
        }
        if (!referenceTypeIdCacheNode) {
            referenceTypeIdCacheNode = crawler._createCacheNode(reference.referenceTypeId);
            this._add_crawl_task(referenceTypeIdCacheNode, userData);
        }
        let childCacheNode = crawler._getCacheNode(reference.nodeId);
        if (!childCacheNode) {
            childCacheNode = crawler._createCacheNode(reference.nodeId, parentNode, reference);
            childCacheNode.browseName = reference.browseName;
            childCacheNode.displayName = reference.displayName;
            childCacheNode.typeDefinition = reference.typeDefinition;
            childCacheNode.nodeClass = reference.nodeClass;
            node_opcua_assert_1.assert(childCacheNode.parent === parentNode);
            node_opcua_assert_1.assert(childCacheNode.referenceToParent === reference);
            this._add_crawl_task(childCacheNode, userData);
        }
        else {
            if (userData.setExtraReference) {
                const task = {
                    func: _setExtraReference,
                    param: {
                        childCacheNode,
                        parentNode,
                        reference,
                        userData
                    }
                };
                this._push_task("setExtraRef", task);
            }
        }
    }
    simplify_object(objMap, object, finalCallback) {
        node_opcua_assert_1.assert(_.isFunction(finalCallback));
        const queue = async.queue((task, innerCallback) => {
            setImmediate(() => {
                node_opcua_assert_1.assert(_.isFunction(task.func));
                task.func(task.data, innerCallback);
            });
        }, 1);
        // tslint:disable:no-empty
        this._add_for_reconstruction(queue, objMap, object, () => {
        });
        const key1 = object.nodeId.toString();
        queue.drain(() => {
            const object1 = this._objMap[key1];
            remove_cycle(object1, finalCallback);
        });
    }
    _add_for_reconstruction(queue, objMap, object, extraFunc) {
        node_opcua_assert_1.assert(_.isFunction(extraFunc));
        node_opcua_assert_1.assert(typeof object.nodeId.toString() === "string");
        const task = {
            data: object,
            func: (data, callback) => {
                this._reconstruct_manageable_object(queue, objMap, data, (err, obj) => {
                    extraFunc(err, obj);
                    callback(err || undefined);
                });
            }
        };
        queue.push(task);
    }
    _reconstruct_manageable_object(queue, objMap, object, callback) {
        node_opcua_assert_1.assert(_.isFunction(callback));
        node_opcua_assert_1.assert(object);
        node_opcua_assert_1.assert(object.nodeId);
        const key2 = object.nodeId.toString();
        if (objMap.hasOwnProperty(key2)) {
            return callback(null, objMap[key2]);
        }
        /* reconstruct a more manageable object
         * var obj = {
         *    browseName: "Objects",
         *    organises : [
         *       {
         *            browseName: "Server",
         *            hasComponent: [
         *            ]
         *            hasProperty: [
         *            ]
         *       }
         *    ]
         * }
         */
        const obj = {
            browseName: object.browseName.name,
            nodeId: object.nodeId.toString()
        };
        // Append nodeClass
        if (object.nodeClass) {
            obj.nodeClass = object.nodeClass.toString();
        }
        if (object.dataType) {
            obj.dataType = object.dataType.toString();
            // xx obj.dataTypeName = object.dataTypeName;
        }
        if (object.dataValue) {
            if (object.dataValue instanceof Array || object.dataValue.length > 10) {
                // too much verbosity here
            }
            else {
                obj.dataValue = object.dataValue.toString();
            }
        }
        objMap[key2] = obj;
        const referenceMap = obj;
        object.references = object.references || [];
        object.references.map((ref) => {
            node_opcua_assert_1.assert(ref);
            const refIndex = ref.referenceTypeId.toString();
            const referenceType = this._objectCache[refIndex];
            /* istanbul ignore else */
            if (!referenceType) {
                debugLog(chalk_1.default.red("Unknown reference type " + refIndex));
                // debugLog(util.inspect(object, { colors: true, depth: 10 }));
                // console.log(chalk.red("Unknown reference type " + refIndex));
                // console.log(util.inspect(ref, { colors: true, depth: 10 }));
            }
            const reference = this._objectCache[ref.nodeId.toString()];
            /* istanbul ignore else */
            if (!reference) {
                debugLog(ref.nodeId.toString(), "bn=", ref.browseName.toString(), "class =", ref.nodeClass.toString(), ref.typeDefinition.toString());
                debugLog("#_reconstruct_manageable_object: Cannot find reference", ref.nodeId.toString(), "in cache");
            }
            if (reference) {
                // Extract nodeClass so it can be appended
                reference.nodeClass = ref.$nodeClass;
            }
            if (referenceType) {
                const refName = node_opcua_utils_1.lowerFirstLetter(referenceType.browseName.name);
                if (refName === "hasTypeDefinition") {
                    obj.typeDefinition = reference.browseName.name;
                }
                else {
                    if (!referenceMap[refName]) {
                        referenceMap[refName] = [];
                    }
                    this._add_for_reconstruction(queue, objMap, reference, (err, mobject) => {
                        if (!err) {
                            referenceMap[refName].push(mobject);
                        }
                    });
                }
            }
        });
        callback(null, obj);
    }
    /**
     * perform pending read Node operation
     * @method _resolve_deferred_readNode
     * @param callback
     * @private
     * @internal
     */
    _resolve_deferred_readNode(callback) {
        if (this.pendingReadTasks.length === 0) {
            // nothing to read
            callback();
            return;
        }
        debugLog("_resolve_deferred_readNode = ", this.pendingReadTasks.length);
        const selectedPendingReadTasks = _fetch_elements(this.pendingReadTasks, this.maxNodesPerRead);
        const nodesToRead = selectedPendingReadTasks.map((e) => e.nodeToRead);
        this.readCounter += nodesToRead.length;
        this.transactionCounter++;
        this.session.read(nodesToRead, (err, dataValues) => {
            /* istanbul ignore else */
            if (err) {
                return callback(err || undefined);
            }
            for (const pair of _.zip(selectedPendingReadTasks, dataValues)) {
                const readTask = pair[0];
                const dataValue = pair[1];
                node_opcua_assert_1.assert(dataValue.hasOwnProperty("statusCode"));
                if (dataValue.statusCode.equals(node_opcua_status_code_1.StatusCodes.Good)) {
                    /* istanbul ignore else */
                    if (dataValue.value === null) {
                        readTask.action(null, dataValue);
                    }
                    else {
                        readTask.action(dataValue.value.value, dataValue);
                    }
                }
                else {
                    readTask.action({ name: dataValue.statusCode.toString() }, dataValue);
                }
            }
            callback();
        });
    }
    _resolve_deferred_browseNode(callback) {
        if (this.pendingBrowseTasks.length === 0) {
            callback();
            return;
        }
        debugLog("_resolve_deferred_browseNode = ", this.pendingBrowseTasks.length);
        const objectsToBrowse = _fetch_elements(this.pendingBrowseTasks, this.maxNodesPerBrowse);
        const nodesToBrowse = objectsToBrowse.map((e) => {
            node_opcua_assert_1.assert(e.hasOwnProperty("referenceTypeId"));
            return new node_opcua_service_browse_1.BrowseDescription({
                browseDirection: node_opcua_data_model_1.BrowseDirection.Forward,
                includeSubtypes: true,
                nodeId: e.nodeId,
                referenceTypeId: e.referenceTypeId,
                resultMask
            });
        });
        this.browseCounter += nodesToBrowse.length;
        this.transactionCounter++;
        this.session.browse(nodesToBrowse, (err, browseResults) => {
            /* istanbul ignore else */
            if (err) {
                debugLog("session.browse err:", err);
                return callback(err || undefined);
            }
            node_opcua_assert_1.assert(browseResults.length === nodesToBrowse.length);
            browseResults = browseResults || [];
            const task = {
                func: NodeCrawler.prototype._process_browse_response_task,
                param: {
                    browseResults,
                    objectsToBrowse
                }
            };
            this._unshift_task("process browseResults", task);
            callback();
        });
    }
    _resolve_deferred_browseNext(callback) {
        /* istanbul ignore else */
        if (this.pendingBrowseNextTasks.length === 0) {
            callback();
            return;
        }
        debugLog("_resolve_deferred_browseNext = ", this.pendingBrowseNextTasks.length);
        const objectsToBrowse = _fetch_elements(this.pendingBrowseNextTasks, this.maxNodesPerBrowse);
        const continuationPoints = objectsToBrowse.map((e) => {
            return e.continuationPoint;
        });
        this.browseNextCounter += continuationPoints.length;
        this.transactionCounter++;
        this.session.browseNext(continuationPoints, false, (err, browseResults) => {
            if (err) {
                debugLog("session.browse err:", err);
                return callback(err || undefined);
            }
            node_opcua_assert_1.assert(browseResults.length === continuationPoints.length);
            browseResults = browseResults || [];
            const task = {
                func: NodeCrawler.prototype._process_browse_response_task,
                param: {
                    browseResults,
                    objectsToBrowse
                }
            };
            this._unshift_task("process browseResults", task);
            callback();
        });
    }
    /**
     * @method _unshift_task
     * add a task on top of the queue (high priority)
     * @param name
     * @param task
     * @private
     */
    _unshift_task(name, task) {
        node_opcua_assert_1.assert(_.isFunction(task.func));
        node_opcua_assert_1.assert(task.func.length === 2);
        this.taskQueue.unshift(task);
        debugLog("unshift task", name);
    }
    /**
     * @method _push_task
     * add a task at the bottom of the queue (low priority)
     * @param name
     * @param task
     * @private
     */
    _push_task(name, task) {
        node_opcua_assert_1.assert(_.isFunction(task.func));
        node_opcua_assert_1.assert(task.func.length === 2);
        debugLog("pushing task", name);
        this.taskQueue.push(task);
    }
    /***
     * @method _emit_on_crawled
     * @param cacheNode
     * @param userData
     * @private
     */
    _emit_on_crawled(cacheNode, userData) {
        const self = this;
        self.emit("browsed", cacheNode, userData);
    }
    _crawl_task(task, callback) {
        const cacheNode = task.param.cacheNode;
        const nodeId = task.param.cacheNode.nodeId;
        const key = nodeId.toString();
        if (this._visitedNode.hasOwnProperty(key)) {
            debugLog("skipping already visited", key);
            callback();
            return; // already visited
        }
        // mark as visited to avoid infinite recursion
        this._visitedNode[key] = true;
        const browseNodeAction = (err, cacheNode1) => {
            if (err || !cacheNode1) {
                return;
            }
            for (const reference of cacheNode1.references) {
                // those ones come for free
                if (!this.has_cache_NodeAttribute(reference.nodeId, node_opcua_data_model_1.AttributeIds.BrowseName)) {
                    this.set_cache_NodeAttribute(reference.nodeId, node_opcua_data_model_1.AttributeIds.BrowseName, reference.browseName);
                }
                if (!this.has_cache_NodeAttribute(reference.nodeId, node_opcua_data_model_1.AttributeIds.DisplayName)) {
                    this.set_cache_NodeAttribute(reference.nodeId, node_opcua_data_model_1.AttributeIds.DisplayName, reference.displayName);
                }
                if (!this.has_cache_NodeAttribute(reference.nodeId, node_opcua_data_model_1.AttributeIds.NodeClass)) {
                    this.set_cache_NodeAttribute(reference.nodeId, node_opcua_data_model_1.AttributeIds.NodeClass, reference.nodeClass);
                }
            }
            this._emit_on_crawled(cacheNode1, task.param.userData);
            const userData = task.param.userData;
            if (userData.onBrowse) {
                userData.onBrowse(this, cacheNode1, userData);
            }
        };
        this._defer_browse_node(cacheNode, referencesNodeId, browseNodeAction);
        callback();
    }
    _initialize_referenceTypeId() {
        const appendPrepopulatedReference = (browseName) => {
            const nodeId = node_opcua_nodeid_1.makeNodeId(node_opcua_constants_1.ReferenceTypeIds[browseName], 0);
            node_opcua_assert_1.assert(nodeId);
            const cacheNode = this._createCacheNode(nodeId);
            cacheNode.browseName = new node_opcua_data_model_1.QualifiedName({ name: browseName });
            cacheNode.nodeClass = node_opcua_data_model_1.NodeClass.ReferenceType;
            this._prePopulatedSet.add(cacheNode);
        };
        //  References
        //  +->(hasSubtype) NonHierarchicalReferences
        //                  +->(hasSubtype) HasTypeDefinition
        //  +->(hasSubtype) HierarchicalReferences
        //                  +->(hasSubtype) HasChild/ChildOf
        //                                  +->(hasSubtype) Aggregates/AggregatedBy
        //                                                  +-> HasProperty/PropertyOf
        //                                                  +-> HasComponent/ComponentOf
        //                                                  +-> HasHistoricalConfiguration/HistoricalConfigurationOf
        //                                 +->(hasSubtype) HasSubtype/HasSupertype
        //                  +->(hasSubtype) Organizes/OrganizedBy
        //                  +->(hasSubtype) HasEventSource/EventSourceOf
        appendPrepopulatedReference("HasSubtype");
        /* istanbul ignore else */
        if (false) {
            appendPrepopulatedReference("HasTypeDefinition");
            appendPrepopulatedReference("HasChild");
            appendPrepopulatedReference("HasProperty");
            appendPrepopulatedReference("HasComponent");
            appendPrepopulatedReference("HasHistoricalConfiguration");
            appendPrepopulatedReference("Organizes");
            appendPrepopulatedReference("HasEventSource");
            appendPrepopulatedReference("HasModellingRule");
        }
    }
    _readOperationalLimits(callback) {
        const n1 = node_opcua_nodeid_1.makeNodeId(node_opcua_constants_1.VariableIds.Server_ServerCapabilities_OperationLimits_MaxNodesPerRead);
        const n2 = node_opcua_nodeid_1.makeNodeId(node_opcua_constants_1.VariableIds.Server_ServerCapabilities_OperationLimits_MaxNodesPerBrowse);
        const nodesToRead = [
            { nodeId: n1, attributeId: node_opcua_data_model_1.AttributeIds.Value },
            { nodeId: n2, attributeId: node_opcua_data_model_1.AttributeIds.Value }
        ];
        this.transactionCounter++;
        this.session.read(nodesToRead, (err, dataValues) => {
            /* istanbul ignore else */
            if (err) {
                return callback(err);
            }
            dataValues = dataValues;
            const fix = (self, maxNodePerX, dataValue) => {
                if (dataValue.statusCode.equals(node_opcua_status_code_1.StatusCodes.Good)) {
                    const value = dataValue.value.value;
                    // if this.maxNodesPerRead has been set (<>0) by the user before call is made,
                    // then it serve as a minimum
                    if (self[maxNodePerX]) {
                        if (value > 0) {
                            self[maxNodePerX] = Math.min(self[maxNodePerX], value);
                        }
                    }
                    else {
                        self[maxNodePerX] = value;
                    }
                }
                else {
                    debugLog("warning: server does not provide a valid dataValue for " + maxNodePerX, dataValue.statusCode.toString());
                }
                // ensure we have a sensible maxNodesPerRead value in case the server doesn't specify one
                self[maxNodePerX] = self[maxNodePerX] || 100;
                debugLog("maxNodesPerRead", self[maxNodePerX]);
            };
            fix(this, "maxNodesPerRead", dataValues[0]);
            fix(this, "maxNodesPerBrowse", dataValues[1]);
            callback();
        });
    }
    set_cache_NodeAttribute(nodeId, attributeId, value) {
        const key = make_node_attribute_key(nodeId, attributeId);
        this.browseNameMap[key] = value;
    }
    has_cache_NodeAttribute(nodeId, attributeId) {
        const key = make_node_attribute_key(nodeId, attributeId);
        return this.browseNameMap.hasOwnProperty(key);
    }
    get_cache_NodeAttribute(nodeId, attributeId) {
        const key = make_node_attribute_key(nodeId, attributeId);
        return this.browseNameMap[key];
    }
    _defer_readNode(nodeId, attributeId, callback) {
        nodeId = node_opcua_nodeid_1.resolveNodeId(nodeId);
        const key = make_node_attribute_key(nodeId, attributeId);
        if (this.has_cache_NodeAttribute(nodeId, attributeId)) {
            callback(null, this.get_cache_NodeAttribute(nodeId, attributeId));
        }
        else {
            this.browseNameMap[key] = "?";
            this.pendingReadTasks.push({
                action: (value, dataValue) => {
                    if (dataValue.statusCode === node_opcua_status_code_1.StatusCodes.Good) {
                        // xx  console.log("xxxx set_cache_NodeAttribute", nodeId, attributeId, value);
                        this.set_cache_NodeAttribute(nodeId, attributeId, value);
                        callback(null, value);
                    }
                    else {
                        callback(new Error("Error " + dataValue.statusCode.toString() + " while reading " + nodeId.toString() + " attributeIds " + node_opcua_data_model_1.AttributeIds[attributeId]));
                    }
                },
                nodeToRead: {
                    attributeId,
                    nodeId
                }
            });
        }
    }
    _resolve_deferred(comment, collection, method) {
        debugLog("_resolve_deferred ", comment, collection.length);
        if (collection.length > 0) {
            this._push_task("adding operation " + comment, {
                func: (task, callback) => {
                    method.call(this, callback);
                },
                param: {}
            });
        }
    }
    resolve_deferred_readNode() {
        this._resolve_deferred("read_node", this.pendingReadTasks, this._resolve_deferred_readNode);
    }
    resolve_deferred_browseNode() {
        this._resolve_deferred("browse_node", this.pendingBrowseTasks, this._resolve_deferred_browseNode);
    }
    resolve_deferred_browseNext() {
        this._resolve_deferred("browse_next", this.pendingBrowseNextTasks, this._resolve_deferred_browseNext);
    }
    // ---------------------------------------------------------------------------------------
    _getCacheNode(nodeId) {
        const key = node_opcua_nodeid_1.resolveNodeId(nodeId).toString();
        return this._objectCache[key];
    }
    _createCacheNode(nodeId, parentNode, referenceToParent) {
        const key = node_opcua_nodeid_1.resolveNodeId(nodeId).toString();
        let cacheNode = this._objectCache[key];
        /* istanbul ignore else */
        if (cacheNode) {
            throw new Error("NodeCrawler#_createCacheNode :" +
                " cache node should not exist already : " + nodeId.toString());
        }
        cacheNode = new CacheNode(nodeId);
        cacheNode.parent = parentNode;
        cacheNode.referenceToParent = referenceToParent;
        node_opcua_assert_1.assert(!this._objectCache.hasOwnProperty(key));
        this._objectCache[key] = cacheNode;
        return cacheNode;
    }
    /**
     * perform a deferred browse
     * instead of calling session.browse directly, this function add the request to a list
     * so that request can be grouped and send in one single browse command to the server.
     *
     * @method _defer_browse_node
     * @private
     *
     */
    _defer_browse_node(cacheNode, referenceTypeId, actionOnBrowse) {
        this.pendingBrowseTasks.push({
            action: (object) => {
                node_opcua_assert_1.assert(object === cacheNode);
                node_opcua_assert_1.assert(_.isArray(object.references));
                node_opcua_assert_1.assert(cacheNode.browseName.name !== "pending");
                actionOnBrowse(null, cacheNode);
            },
            cacheNode,
            nodeId: cacheNode.nodeId,
            referenceTypeId
        });
    }
    _defer_browse_next(cacheNode, continuationPoint, referenceTypeId, actionOnBrowse) {
        this.pendingBrowseNextTasks.push({
            action: (object) => {
                node_opcua_assert_1.assert(object === cacheNode);
                node_opcua_assert_1.assert(_.isArray(object.references));
                node_opcua_assert_1.assert(cacheNode.browseName.name !== "pending");
                actionOnBrowse(null, cacheNode);
            },
            cacheNode,
            continuationPoint,
            nodeId: cacheNode.nodeId,
            referenceTypeId
        });
    }
    /**
     * @method _process_single_browseResult
     * @param _objectToBrowse
     * @param browseResult
     * @private
     */
    _process_single_browseResult(_objectToBrowse, browseResult) {
        const cacheNode = _objectToBrowse.cacheNode;
        // note : some OPCUA may expose duplicated reference, they need to be filtered out
        // dedup reference
        cacheNode.references = cacheNode.references.concat(browseResult.references);
        if (browseResult.continuationPoint) {
            //
            this._defer_browse_next(_objectToBrowse.cacheNode, browseResult.continuationPoint, _objectToBrowse.referenceTypeId, (err, cacheNode1) => {
                this._process_single_browseResult2(_objectToBrowse);
            });
        }
        else {
            this._process_single_browseResult2(_objectToBrowse);
        }
    }
    _process_single_browseResult2(_objectToBrowse) {
        const cacheNode = _objectToBrowse.cacheNode;
        cacheNode.references = dedup_reference(cacheNode.references);
        // extract the reference containing HasTypeDefinition
        const tmp = cacheNode.references.filter((x) => node_opcua_nodeid_1.sameNodeId(x.referenceTypeId, hasTypeDefinitionNodeId));
        if (tmp.length) {
            cacheNode.typeDefinition = tmp[0].nodeId;
        }
        async.parallel({
            task1_read_browseName: (callback) => {
                if (cacheNode.browseName !== pendingBrowseName) {
                    return callback();
                }
                this._defer_readNode(cacheNode.nodeId, node_opcua_data_model_1.AttributeIds.BrowseName, (err, browseName) => {
                    cacheNode.browseName = browseName;
                    callback();
                });
            },
            task2_read_displayName: (callback) => {
                if (cacheNode.displayName) {
                    return callback();
                }
                this._defer_readNode(cacheNode.nodeId, node_opcua_data_model_1.AttributeIds.DisplayName, (err, value) => {
                    if (err) {
                        return callback(err);
                    }
                    cacheNode.displayName = value;
                    callback();
                });
            },
            task3_read_description: (callback) => {
                this._defer_readNode(cacheNode.nodeId, node_opcua_data_model_1.AttributeIds.Description, (err, value) => {
                    if (err) {
                        // description may not be defined and this is OK !
                        return callback();
                    }
                    cacheNode.description = node_opcua_data_model_1.coerceLocalizedText(value);
                    callback();
                });
            },
            task4_variable_dataType: (callback) => {
                // only if nodeClass is Variable || VariableType
                if (cacheNode.nodeClass !== node_opcua_data_model_1.NodeClass.Variable
                    && cacheNode.nodeClass !== node_opcua_data_model_1.NodeClass.VariableType) {
                    return callback();
                }
                const cache = cacheNode;
                // read dataType and DataType if node is a variable
                this._defer_readNode(cacheNode.nodeId, node_opcua_data_model_1.AttributeIds.DataType, (err, dataType) => {
                    if (!(dataType instanceof node_opcua_nodeid_1.NodeId)) {
                        return callback();
                    }
                    cache.dataType = dataType;
                    callback();
                });
            },
            task5_variable_dataValue: (callback) => {
                // only if nodeClass is Variable || VariableType
                if (cacheNode.nodeClass !== node_opcua_data_model_1.NodeClass.Variable
                    && cacheNode.nodeClass !== node_opcua_data_model_1.NodeClass.VariableType) {
                    return callback();
                }
                const cache = cacheNode;
                this._defer_readNode(cacheNode.nodeId, node_opcua_data_model_1.AttributeIds.Value, (err, value) => {
                    cache.dataValue = value;
                    callback();
                });
            },
            task6_variable_arrayDimension: (callback) => {
                callback();
            },
            task7_variable_minimumSamplingInterval: (callback) => {
                if (cacheNode.nodeClass !== node_opcua_data_model_1.NodeClass.Variable) {
                    return callback();
                }
                const cache = cacheNode;
                this._defer_readNode(cacheNode.nodeId, node_opcua_data_model_1.AttributeIds.MinimumSamplingInterval, (err, value) => {
                    cache.minimumSamplingInterval = value;
                    callback();
                });
            },
            task8_variable_accessLevel: (callback) => {
                if (cacheNode.nodeClass !== node_opcua_data_model_1.NodeClass.Variable) {
                    return callback();
                }
                const cache = cacheNode;
                this._defer_readNode(cacheNode.nodeId, node_opcua_data_model_1.AttributeIds.AccessLevel, (err, value) => {
                    if (err) {
                        return callback(err);
                    }
                    cache.accessLevel = value;
                    callback();
                });
            },
            task9_variable_userAccessLevel: (callback) => {
                if (cacheNode.nodeClass !== node_opcua_data_model_1.NodeClass.Variable) {
                    return callback();
                }
                const cache = cacheNode;
                this._defer_readNode(cacheNode.nodeId, node_opcua_data_model_1.AttributeIds.UserAccessLevel, (err, value) => {
                    if (err) {
                        return callback(err);
                    }
                    cache.userAccessLevel = value;
                    callback();
                });
            },
            taskA_referenceType_inverseName: (callback) => {
                if (cacheNode.nodeClass !== node_opcua_data_model_1.NodeClass.ReferenceType) {
                    return callback();
                }
                const cache = cacheNode;
                this._defer_readNode(cacheNode.nodeId, node_opcua_data_model_1.AttributeIds.InverseName, (err, value) => {
                    if (err) {
                        return callback(err);
                    }
                    cache.inverseName = value;
                    callback();
                });
            },
            taskB_isAbstract: (callback) => {
                if (cacheNode.nodeClass !== node_opcua_data_model_1.NodeClass.ReferenceType) {
                    return callback();
                }
                const cache = cacheNode;
                this._defer_readNode(cacheNode.nodeId, node_opcua_data_model_1.AttributeIds.IsAbstract, (err, value) => {
                    if (err) {
                        return callback(err);
                    }
                    cache.isAbstract = value;
                    callback();
                });
            },
            taskC_dataTypeDefinition: (callback) => {
                if (cacheNode.nodeClass !== node_opcua_data_model_1.NodeClass.DataType) {
                    return callback();
                }
                // dataTypeDefinition is new in 1.04
                const cache = cacheNode;
                this._defer_readNode(cacheNode.nodeId, node_opcua_data_model_1.AttributeIds.DataTypeDefinition, (err, value) => {
                    if (err) {
                        // may be we are crawling a 1.03 server => DataTypeDefinition was not defined yet
                        return callback();
                    }
                    cache.dataTypeDefinition = value;
                    callback();
                });
            }
        }, () => {
            _objectToBrowse.action(cacheNode);
        });
    }
    _process_browse_response_task(task, callback) {
        const objectsToBrowse = task.param.objectsToBrowse;
        const browseResults = task.param.browseResults;
        for (const pair of _.zip(objectsToBrowse, browseResults)) {
            const objectToBrowse = pair[0];
            const browseResult = pair[1];
            node_opcua_assert_1.assert(browseResult instanceof node_opcua_service_browse_1.BrowseResult);
            this._process_single_browseResult(objectToBrowse, browseResult);
        }
        setImmediate(callback);
    }
}
exports.NodeCrawler = NodeCrawler;
// tslint:disable:no-var-requires
// tslint:disable:max-line-length
const thenify = require("thenify");
NodeCrawler.prototype.read = thenify.withCallback(NodeCrawler.prototype.read);
NodeCrawler.prototype.crawl = thenify.withCallback(NodeCrawler.prototype.crawl);
//# sourceMappingURL=node_crawler.js.map