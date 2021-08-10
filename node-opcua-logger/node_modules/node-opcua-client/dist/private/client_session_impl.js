"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * @module node-opcua-client-private
 */
const chalk_1 = require("chalk");
const events_1 = require("events");
const _ = require("underscore");
const node_opcua_assert_1 = require("node-opcua-assert");
const node_opcua_client_dynamic_extension_object_1 = require("node-opcua-client-dynamic-extension-object");
const node_opcua_constants_1 = require("node-opcua-constants");
const node_opcua_data_model_1 = require("node-opcua-data-model");
const node_opcua_data_value_1 = require("node-opcua-data-value");
const node_opcua_debug_1 = require("node-opcua-debug");
const node_opcua_nodeid_1 = require("node-opcua-nodeid");
const node_opcua_pseudo_session_1 = require("node-opcua-pseudo-session");
const node_opcua_service_browse_1 = require("node-opcua-service-browse");
const node_opcua_service_call_1 = require("node-opcua-service-call");
const node_opcua_service_history_1 = require("node-opcua-service-history");
const node_opcua_service_query_1 = require("node-opcua-service-query");
const node_opcua_service_read_1 = require("node-opcua-service-read");
const node_opcua_service_register_node_1 = require("node-opcua-service-register-node");
const node_opcua_service_subscription_1 = require("node-opcua-service-subscription");
const node_opcua_service_translate_browse_path_1 = require("node-opcua-service-translate-browse-path");
const node_opcua_service_write_1 = require("node-opcua-service-write");
const node_opcua_status_code_1 = require("node-opcua-status-code");
const node_opcua_types_1 = require("node-opcua-types");
const node_opcua_utils_1 = require("node-opcua-utils");
const node_opcua_variant_1 = require("node-opcua-variant");
const client_session_keepalive_manager_1 = require("../client_session_keepalive_manager");
const client_publish_engine_1 = require("./client_publish_engine");
const client_subscription_impl_1 = require("./client_subscription_impl");
const resultMask = node_opcua_data_model_1.makeResultMask("ReferenceType");
const helpAPIChange = process.env.DEBUG && process.env.DEBUG.match(/API/);
const debugLog = node_opcua_debug_1.make_debugLog(__filename);
const doDebug = node_opcua_debug_1.checkDebugFlag(__filename);
const warningLog = debugLog;
function coerceBrowseDescription(data) {
    if (typeof data === "string" || data instanceof node_opcua_nodeid_1.NodeId) {
        return coerceBrowseDescription({
            browseDirection: node_opcua_data_model_1.BrowseDirection.Forward,
            includeSubtypes: true,
            nodeClassMask: 0,
            nodeId: data,
            referenceTypeId: "HierarchicalReferences",
            resultMask: 63
        });
    }
    else {
        data.nodeId = node_opcua_nodeid_1.resolveNodeId(data.nodeId);
        data.referenceTypeId = data.referenceTypeId ? node_opcua_nodeid_1.resolveNodeId(data.referenceTypeId) : null;
        return new node_opcua_service_browse_1.BrowseDescription(data);
    }
}
function coerceReadValueId(node) {
    if (typeof node === "string" || node instanceof node_opcua_nodeid_1.NodeId) {
        return new node_opcua_service_read_1.ReadValueId({
            attributeId: node_opcua_service_read_1.AttributeIds.Value,
            dataEncoding: undefined,
            indexRange: undefined,
            nodeId: node_opcua_nodeid_1.resolveNodeId(node)
        });
    }
    else {
        node_opcua_assert_1.assert(node instanceof Object);
        return new node_opcua_service_read_1.ReadValueId(node);
    }
}
const keys = Object.keys(node_opcua_service_read_1.AttributeIds).filter((k) => node_opcua_service_read_1.AttributeIds[k] !== node_opcua_service_read_1.AttributeIds.INVALID);
const attributeNames = (() => {
    const r = [];
    for (let i = 1; i <= 22; i++) {
        r.push(node_opcua_data_model_1.attributeNameById[i]);
    }
    return r;
})();
function composeResult(nodes, nodesToRead, dataValues) {
    node_opcua_assert_1.assert(nodesToRead.length === dataValues.length);
    let c = 0;
    const results = [];
    let dataValue;
    let k;
    let nodeToRead;
    for (const node of nodes) {
        const data = {
            nodeId: node_opcua_nodeid_1.resolveNodeId(node),
            statusCode: node_opcua_status_code_1.StatusCodes.BadNodeIdUnknown
        };
        let addedProperty = 0;
        for (const key of attributeNames) {
            dataValue = dataValues[c];
            nodeToRead = nodesToRead[c];
            c++;
            if (dataValue.statusCode.equals(node_opcua_status_code_1.StatusCodes.Good)) {
                k = node_opcua_utils_1.lowerFirstLetter(key);
                data[k] = dataValue.value ? dataValue.value.value : null;
                addedProperty += 1;
            }
        }
        /* istanbul ignore if */
        if (addedProperty > 0) {
            data.statusCode = node_opcua_status_code_1.StatusCodes.Good;
        }
        else {
            data.statusCode = node_opcua_status_code_1.StatusCodes.BadNodeIdUnknown;
        }
        results.push(data);
    }
    return results;
}
function __findBasicDataType(session, dataTypeId, callback) {
    /* istanbul ignore next */
    if (dataTypeId.identifierType !== node_opcua_nodeid_1.NodeIdType.NUMERIC) {
        throw new Error("Invalid NodeId Identifier type => Numeric expected");
    }
    node_opcua_assert_1.assert(dataTypeId instanceof node_opcua_nodeid_1.NodeId);
    if (dataTypeId.value <= 25) {
        // we have a well-known DataType
        const dataTypeName = node_opcua_variant_1.DataType[dataTypeId.value];
        callback(null, dataTypeId.value);
    }
    else {
        // let's browse for the SuperType of this object
        const nodeToBrowse = new node_opcua_service_browse_1.BrowseDescription({
            browseDirection: node_opcua_data_model_1.BrowseDirection.Inverse,
            includeSubtypes: false,
            nodeId: dataTypeId,
            referenceTypeId: node_opcua_nodeid_1.makeNodeId(node_opcua_constants_1.ReferenceTypeIds.HasSubtype),
            resultMask
        });
        session.browse(nodeToBrowse, (err, browseResult) => {
            /* istanbul ignore next */
            if (err) {
                return callback(err);
            }
            /* istanbul ignore next */
            if (!browseResult) {
                return callback(new Error("Internal Error"));
            }
            browseResult.references = browseResult.references || /* istanbul ignore next */ [];
            const baseDataType = browseResult.references[0].nodeId;
            return __findBasicDataType(session, baseDataType, callback);
        });
    }
}
const emptyUint32Array = new Uint32Array(0);
/**
 * @class ClientSession
 * @param client {OPCUAClientImpl}
 * @constructor
 * @private
 */
class ClientSessionImpl extends events_1.EventEmitter {
    constructor(client) {
        super();
        this.name = "";
        this.serverEndpoints = [];
        this.serverCertificate = Buffer.alloc(0);
        this.sessionId = node_opcua_nodeid_1.NodeId.nullNodeId;
        this._closeEventHasBeenEmitted = false;
        this._client = client;
        this._publishEngine = null;
        this._closed = false;
        this.requestedMaxReferencesPerNode = 10000;
        this.lastRequestSentTime = new Date(1, 1, 1970);
        this.lastResponseReceivedTime = new Date(1, 1, 1970);
        this.timeout = 0;
    }
    /**
     * the endpoint on which this session is operating
     * @property endpoint
     * @type {EndpointDescription}
     */
    get endpoint() {
        return this._client.endpoint;
    }
    get subscriptionCount() {
        return this._publishEngine ? this._publishEngine.subscriptionCount : 0;
    }
    get isReconnecting() {
        return this._client ? this._client.isReconnecting : false;
    }
    getPublishEngine() {
        if (!this._publishEngine) {
            this._publishEngine = new client_publish_engine_1.ClientSidePublishEngine(this);
        }
        return this._publishEngine;
    }
    /**
     * @internal
     * @param args
     */
    browse(...args) {
        const arg0 = args[0];
        const isArray = _.isArray(arg0);
        const callback = args[1];
        node_opcua_assert_1.assert(_.isFunction(callback));
        node_opcua_assert_1.assert(_.isFinite(this.requestedMaxReferencesPerNode));
        const nodesToBrowse = (isArray ? arg0 : [arg0]).map(coerceBrowseDescription);
        const request = new node_opcua_service_browse_1.BrowseRequest({
            nodesToBrowse,
            requestedMaxReferencesPerNode: this.requestedMaxReferencesPerNode
        });
        this.performMessageTransaction(request, (err, response) => {
            if (err) {
                return callback(err);
            }
            /* istanbul ignore next */
            if (!response || !(response instanceof node_opcua_service_browse_1.BrowseResponse)) {
                return callback(new Error("Internal Error"));
            }
            const results = response.results ? response.results : [];
            if (this.requestedMaxReferencesPerNode > 0) {
                for (let i = 0; i < results.length; i++) {
                    const r = results[i];
                    /* istanbul ignore next */
                    if (r.references && r.references.length > this.requestedMaxReferencesPerNode) {
                        warningLog(chalk_1.default.yellow("warning") + " BrowseResponse : server didn't take into" +
                            " account our requestedMaxReferencesPerNode ");
                        warningLog("        this.requestedMaxReferencesPerNode= " + this.requestedMaxReferencesPerNode);
                        warningLog("        got " + r.references.length + "for " + nodesToBrowse[i].nodeId.toString());
                        warningLog("        continuationPoint ", r.continuationPoint);
                    }
                }
            }
            for (const r of results) {
                r.references = r.references || /* istanbul ignore next */ [];
            }
            // detect unsupported case :
            // todo implement proper support for r.continuationPoint
            /* istanbul ignore next */
            for (const r of results) {
                if (r.continuationPoint !== null) {
                    warningLog(chalk_1.default.yellow(" warning:"), " BrowseResponse : server didn't send all references " +
                        "and has provided a continuationPoint. Unfortunately we do not support this yet");
                    warningLog("           this.requestedMaxReferencesPerNode = ", this.requestedMaxReferencesPerNode);
                    warningLog("           continuationPoint ", r.continuationPoint);
                }
            }
            node_opcua_assert_1.assert(results[0] instanceof node_opcua_service_browse_1.BrowseResult);
            return callback(null, isArray ? results : results[0]);
        });
    }
    browseNext(...args) {
        const arg0 = args[0];
        const isArray = _.isArray(arg0);
        const releaseContinuationPoints = args[1];
        const callback = args[2];
        node_opcua_assert_1.assert(_.isFunction(callback), "expecting a callback function here");
        const continuationPoints = (isArray ? arg0 : [arg0]);
        const request = new node_opcua_types_1.BrowseNextRequest({
            continuationPoints,
            releaseContinuationPoints
        });
        this.performMessageTransaction(request, (err, response) => {
            /* istanbul ignore next */
            if (err) {
                return callback(err);
            }
            /* istanbul ignore next */
            if (!response || !(response instanceof node_opcua_types_1.BrowseNextResponse)) {
                return callback(new Error("Internal Error"));
            }
            const results = response.results ? response.results : [];
            for (const r of results) {
                r.references = r.references || [];
            }
            node_opcua_assert_1.assert(results[0] instanceof node_opcua_service_browse_1.BrowseResult);
            return callback(null, isArray ? results : results[0]);
        });
    }
    /**
     * @internal
     * @param args
     */
    readVariableValue(...args) {
        const callback = args[1];
        node_opcua_assert_1.assert(_.isFunction(callback));
        const isArray = _.isArray(args[0]);
        const nodes = isArray ? args[0] : [args[0]];
        const nodesToRead = nodes.map(coerceReadValueId);
        const request = new node_opcua_service_read_1.ReadRequest({
            nodesToRead,
            timestampsToReturn: node_opcua_service_read_1.TimestampsToReturn.Neither
        });
        this.performMessageTransaction(request, (err, response) => {
            /* istanbul ignore next */
            if (err) {
                return callback(err);
            }
            /* istanbul ignore next */
            if (!(response instanceof node_opcua_service_read_1.ReadResponse)) {
                return callback(new Error("Internal Error"));
            }
            /* istanbul ignore next */
            if (response.responseHeader.serviceResult.isNot(node_opcua_status_code_1.StatusCodes.Good)) {
                return callback(new Error(response.responseHeader.serviceResult.toString()));
            }
            /* istanbul ignore next */
            if (!response.results) {
                response.results = [];
            }
            node_opcua_assert_1.assert(nodes.length === response.results.length);
            callback(null, isArray ? response.results : response.results[0]);
        });
    }
    readHistoryValue(...args) {
        const start = args[1];
        const end = args[2];
        const callback = args[3];
        node_opcua_assert_1.assert(_.isFunction(callback));
        const arg0 = args[0];
        const isArray = _.isArray(arg0);
        const nodes = isArray ? arg0 : [arg0];
        const nodesToRead = [];
        const historyReadDetails = [];
        for (const node of nodes) {
            nodesToRead.push({
                continuationPoint: undefined,
                dataEncoding: undefined,
                indexRange: undefined,
                nodeId: node_opcua_nodeid_1.resolveNodeId(node)
            });
        }
        const readRawModifiedDetails = new node_opcua_service_history_1.ReadRawModifiedDetails({
            endTime: end,
            isReadModified: false,
            numValuesPerNode: 0,
            returnBounds: true,
            startTime: start
        });
        const request = new node_opcua_service_history_1.HistoryReadRequest({
            historyReadDetails: readRawModifiedDetails,
            nodesToRead,
            releaseContinuationPoints: false,
            timestampsToReturn: node_opcua_service_read_1.TimestampsToReturn.Both
        });
        request.nodesToRead = request.nodesToRead || [];
        node_opcua_assert_1.assert(nodes.length === request.nodesToRead.length);
        this.performMessageTransaction(request, (err, response) => {
            /* istanbul ignore next */
            if (err) {
                return callback(err);
            }
            /* istanbul ignore next */
            if (!response || !(response instanceof node_opcua_service_history_1.HistoryReadResponse)) {
                return callback(new Error("Internal Error"));
            }
            if (response.responseHeader.serviceResult.isNot(node_opcua_status_code_1.StatusCodes.Good)) {
                return callback(new Error(response.responseHeader.serviceResult.toString()));
            }
            response.results = response.results || /* istanbul ignore next */ [];
            node_opcua_assert_1.assert(nodes.length === response.results.length);
            callback(null, isArray ? response.results : response.results[0]);
        });
    }
    /**
     * @internal
     * @param args
     */
    write(...args) {
        const arg0 = args[0];
        const isArray = _.isArray(arg0);
        const nodesToWrite = isArray ? arg0 : [arg0];
        const callback = args[1];
        node_opcua_assert_1.assert(_.isFunction(callback));
        const request = new node_opcua_service_write_1.WriteRequest({ nodesToWrite });
        this.performMessageTransaction(request, (err, response) => {
            /* istanbul ignore next */
            if (err) {
                return callback(err, response);
            }
            /* istanbul ignore next */
            if (!response || !(response instanceof node_opcua_service_write_1.WriteResponse)) {
                return callback(new Error("Internal Error"));
            }
            /* istanbul ignore next */
            if (response.responseHeader.serviceResult.isNot(node_opcua_status_code_1.StatusCodes.Good)) {
                return callback(new Error(response.responseHeader.serviceResult.toString()));
            }
            response.results = response.results || /* istanbul ignore next */ [];
            node_opcua_assert_1.assert(nodesToWrite.length === response.results.length);
            callback(null, isArray ? response.results : response.results[0]);
        });
    }
    writeSingleNode(...args) {
        const nodeId = args[0];
        const value = args[1];
        const callback = args[2];
        node_opcua_assert_1.assert(_.isFunction(callback));
        const nodeToWrite = new node_opcua_service_write_1.WriteValue({
            attributeId: node_opcua_service_read_1.AttributeIds.Value,
            indexRange: undefined,
            nodeId: node_opcua_nodeid_1.resolveNodeId(nodeId),
            value: new node_opcua_data_value_1.DataValue({ value })
        });
        this.write(nodeToWrite, (err, statusCode) => {
            /* istanbul ignore next */
            if (err) {
                return callback(err);
            }
            node_opcua_assert_1.assert(statusCode);
            callback(null, statusCode);
        });
    }
    readAllAttributes(...args) {
        const arg0 = args[0];
        const callback = args[1];
        node_opcua_assert_1.assert(_.isFunction(callback));
        const isArray = _.isArray(arg0);
        const nodes = isArray ? arg0 : [arg0];
        const nodesToRead = [];
        for (const node of nodes) {
            const nodeId = node_opcua_nodeid_1.resolveNodeId(node);
            /* istanbul ignore next */
            if (!nodeId) {
                throw new Error("cannot coerce " + node + " to a valid NodeId");
            }
            for (let attributeId = 1; attributeId <= 22; attributeId++) {
                nodesToRead.push({
                    attributeId,
                    dataEncoding: undefined,
                    indexRange: undefined,
                    nodeId
                });
            }
        }
        this.read(nodesToRead, (err, dataValues) => {
            /* istanbul ignore next */
            if (err) {
                return callback(err);
            }
            /* istanbul ignore next */
            if (!dataValues) {
                return callback(new Error("Internal Error"));
            }
            const results = composeResult(nodes, nodesToRead, dataValues);
            callback(err, isArray ? results : results[0]);
        });
    }
    /**
     * @internal
     * @param args
     */
    read(...args) {
        if (args.length === 2) {
            return this.read(args[0], 0, args[1]);
        }
        node_opcua_assert_1.assert(args.length === 3);
        const isArray = _.isArray(args[0]);
        const nodesToRead = isArray ? args[0] : [args[0]];
        node_opcua_assert_1.assert(_.isArray(nodesToRead));
        const maxAge = args[1];
        const callback = args[2];
        node_opcua_assert_1.assert(_.isFunction(callback));
        /* istanbul ignore next */
        if (helpAPIChange) {
            // the read method deprecation detection and warning
            if (!(node_opcua_utils_1.getFunctionParameterNames(callback)[1] === "dataValues"
                || node_opcua_utils_1.getFunctionParameterNames(callback)[1] === "dataValue")) {
                warningLog(chalk_1.default.red("ERROR ClientSession#read  API has changed !!, please fix the client code"));
                warningLog(chalk_1.default.red("   replace ..:"));
                warningLog(chalk_1.default.cyan("   session.read(nodesToRead,function(err,nodesToRead,results) {}"));
                warningLog(chalk_1.default.red("   with .... :"));
                warningLog(chalk_1.default.cyan("   session.read(nodesToRead,function(err,dataValues) {}"));
                warningLog("");
                warningLog(chalk_1.default.yellow("please make sure to refactor your code and check that " +
                    "the second argument of your callback function is named"), chalk_1.default.cyan("dataValue" + (isArray ? "s" : "")));
                warningLog(chalk_1.default.cyan("to make this exception disappear"));
                throw new Error("ERROR ClientSession#read  API has changed !!, please fix the client code");
            }
        }
        // coerce nodeIds
        for (const node of nodesToRead) {
            node.nodeId = node_opcua_nodeid_1.resolveNodeId(node.nodeId);
        }
        const request = new node_opcua_service_read_1.ReadRequest({
            maxAge,
            nodesToRead,
            timestampsToReturn: node_opcua_service_read_1.TimestampsToReturn.Both
        });
        this.performMessageTransaction(request, (err, response) => {
            /* istanbul ignore next */
            if (err) {
                return callback(err, response);
            }
            /* istanbul ignore next */
            if (!response || !(response instanceof node_opcua_service_read_1.ReadResponse)) {
                return callback(new Error("Internal Error"));
            }
            // perform ExtensionObject resolution
            promoteOpaqueStructureWithCallback(this, response.results, () => {
                response.results = response.results || /* istanbul ignore next */ [];
                return callback(null, isArray ? response.results : response.results[0]);
            });
        });
    }
    emitCloseEvent(statusCode) {
        if (!this._closeEventHasBeenEmitted) {
            debugLog("ClientSession#emitCloseEvent");
            this._closeEventHasBeenEmitted = true;
            this.emit("session_closed", statusCode);
        }
    }
    createSubscription(options, callback) {
        this._defaultRequest(node_opcua_service_subscription_1.CreateSubscriptionRequest, node_opcua_service_subscription_1.CreateSubscriptionResponse, options, callback);
    }
    createSubscription2(...args) {
        const createSubscriptionRequest = args[0];
        const callback = args[1];
        const subscription = new client_subscription_impl_1.ClientSubscriptionImpl(this, createSubscriptionRequest);
        // tslint:disable-next-line:no-empty
        subscription.on("error", () => {
        });
        subscription.on("started", () => {
            node_opcua_assert_1.assert(subscription.session === this, "expecting a session here");
            callback(null, subscription);
        });
    }
    /**
     * @method deleteSubscriptions
     * @async
     * @example:
     *
     *     session.deleteSubscriptions(request,function(err,response) {} );
     */
    deleteSubscriptions(options, callback) {
        this._defaultRequest(node_opcua_service_subscription_1.DeleteSubscriptionsRequest, node_opcua_service_subscription_1.DeleteSubscriptionsResponse, options, callback);
    }
    /**
     * @method transferSubscriptions
     * @async
     */
    transferSubscriptions(options, callback) {
        this._defaultRequest(node_opcua_service_subscription_1.TransferSubscriptionsRequest, node_opcua_service_subscription_1.TransferSubscriptionsResponse, options, callback);
    }
    createMonitoredItems(options, callback) {
        this._defaultRequest(node_opcua_service_subscription_1.CreateMonitoredItemsRequest, node_opcua_service_subscription_1.CreateMonitoredItemsResponse, options, callback);
    }
    modifyMonitoredItems(options, callback) {
        this._defaultRequest(node_opcua_service_subscription_1.ModifyMonitoredItemsRequest, node_opcua_service_subscription_1.ModifyMonitoredItemsResponse, options, callback);
    }
    /**
     *
     * @method modifySubscription
     * @async
     * @param options {ModifySubscriptionRequest}
     * @param callback {Function}
     * @param callback.err {Error|null}   - the Error if the async method has failed
     * @param callback.response {ModifySubscriptionResponse} - the response
     */
    modifySubscription(options, callback) {
        this._defaultRequest(node_opcua_service_subscription_1.ModifySubscriptionRequest, node_opcua_service_subscription_1.ModifySubscriptionResponse, options, callback);
    }
    setMonitoringMode(options, callback) {
        this._defaultRequest(node_opcua_service_subscription_1.SetMonitoringModeRequest, node_opcua_service_subscription_1.SetMonitoringModeResponse, options, callback);
    }
    /**
     *
     * @method publish
     * @async
     * @param options  {PublishRequest}
     * @param callback {Function}
     * @param callback.err {Error|null}   - the Error if the async method has failed
     * @param callback.response {PublishResponse} - the response
     */
    publish(options, callback) {
        this._defaultRequest(node_opcua_service_subscription_1.PublishRequest, node_opcua_service_subscription_1.PublishResponse, options, callback);
    }
    /**
     *
     * @method republish
     * @async
     * @param options  {RepublishRequest}
     * @param callback the callback
     */
    republish(options, callback) {
        this._defaultRequest(node_opcua_service_subscription_1.RepublishRequest, node_opcua_service_subscription_1.RepublishResponse, options, callback);
    }
    /**
     *
     * @method deleteMonitoredItems
     * @async
     * @param options  {DeleteMonitoredItemsRequest}
     * @param callback {Function}
     * @param callback.err {Error|null}   - the Error if the async method has failed
     */
    deleteMonitoredItems(options, callback) {
        this._defaultRequest(node_opcua_service_subscription_1.DeleteMonitoredItemsRequest, node_opcua_service_subscription_1.DeleteMonitoredItemsResponse, options, callback);
    }
    /**
     * @internal
     */
    setPublishingMode(...args) {
        const publishingEnabled = args[0];
        const isArray = _.isArray(args[1]);
        const subscriptionIds = isArray ? args[1] : [args[1]];
        const callback = args[2];
        node_opcua_assert_1.assert(_.isFunction(callback));
        node_opcua_assert_1.assert(publishingEnabled === true || publishingEnabled === false);
        const options = new node_opcua_service_subscription_1.SetPublishingModeRequest({
            publishingEnabled,
            subscriptionIds
        });
        this._defaultRequest(node_opcua_service_subscription_1.SetPublishingModeRequest, node_opcua_service_subscription_1.SetPublishingModeResponse, options, (err, response) => {
            /* istanbul ignore next */
            if (err) {
                return callback(err);
            }
            /* istanbul ignore next */
            if (!response) {
                return callback(new Error("Internal Error"));
            }
            response.results = response.results || /* istanbul ignore next */ [];
            callback(err, isArray ? response.results : response.results[0]);
        });
    }
    /**
     * @internal
     * @param args
     */
    translateBrowsePath(...args) {
        const isArray = _.isArray(args[0]);
        const browsePaths = isArray ? args[0] : [args[0]];
        const callback = args[1];
        node_opcua_assert_1.assert(_.isFunction(callback));
        const request = new node_opcua_service_translate_browse_path_1.TranslateBrowsePathsToNodeIdsRequest({ browsePaths });
        this.performMessageTransaction(request, (err, response) => {
            /* istanbul ignore next */
            if (err) {
                return callback(err, response);
            }
            /* istanbul ignore next */
            if (!response || !(response instanceof node_opcua_service_translate_browse_path_1.TranslateBrowsePathsToNodeIdsResponse)) {
                return callback(new Error("Internal Error"));
            }
            response.results = response.results || /* istanbul ignore next */ [];
            callback(null, isArray ? response.results : response.results[0]);
        });
    }
    isChannelValid() {
        /* istanbul ignore next */
        if (!this._client) {
            debugLog(chalk_1.default.red("Warning SessionClient is null ?"));
        }
        return (this._client !== null
            && this._client._secureChannel !== null
            && this._client._secureChannel.isOpened());
    }
    performMessageTransaction(request, callback) {
        node_opcua_assert_1.assert(_.isFunction(callback));
        /* istanbul ignore next */
        if (!this._client) {
            // session may have been closed by user ... but is still in used !!
            return callback(new Error("Session has been closed and should not be used to perform a transaction anymore"));
        }
        if (!this.isChannelValid()) {
            // the secure channel is broken, may be the server has crashed or the network cable has been disconnected
            // for a long time
            // we may need to queue this transaction, as a secure token may be being reprocessed
            debugLog(chalk_1.default.bgWhite.red("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!! "));
            return callback(new Error("Invalid Channel "));
        }
        // is this stuff useful?
        if (request.requestHeader) {
            request.requestHeader.authenticationToken = this.authenticationToken;
        }
        this.lastRequestSentTime = new Date();
        this._client.performMessageTransaction(request, (err, response) => {
            this.lastResponseReceivedTime = new Date();
            /* istanbul ignore next */
            if (err) {
                if (response && response.responseHeader.serviceDiagnostics) {
                    err.serviceDiagnostics = response.responseHeader.serviceDiagnostics;
                }
                if (response && response.diagnosticInfos) {
                    err.diagnosticsInfo = response.diagnosticInfos;
                }
                return callback(err);
            }
            /* istanbul ignore next */
            if (!response) {
                return callback(new Error("internal Error"));
            }
            /* istanbul ignore next */
            if (response.responseHeader.serviceResult.isNot(node_opcua_status_code_1.StatusCodes.Good)) {
                err = new Error(" ServiceResult is "
                    + response.responseHeader.serviceResult.toString()
                    + " request was " + request.constructor.name);
                if (response && response.responseHeader.serviceDiagnostics) {
                    err.serviceDiagnostics = response.responseHeader.serviceDiagnostics;
                }
                if (response && response.diagnosticInfos) {
                    err.diagnosticsInfo = response.diagnosticInfos;
                }
                return callback(err, response);
            }
            return callback(null, response);
        });
    }
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
    evaluateRemainingLifetime() {
        const now = Date.now();
        const expiryTime = this.lastRequestSentTime.getTime() + this.timeout;
        return Math.max(0, (expiryTime - now));
    }
    _terminatePublishEngine() {
        if (this._publishEngine) {
            this._publishEngine.terminate();
            this._publishEngine = null;
        }
    }
    /**
     * @internal
     * @param args
     */
    close(...args) {
        if (arguments.length === 1) {
            return this.close(true, args[0]);
        }
        const deleteSubscription = args[0];
        const callback = args[1];
        node_opcua_assert_1.assert(_.isFunction(callback));
        node_opcua_assert_1.assert(_.isBoolean(deleteSubscription));
        /* istanbul ignore next */
        if (!this._client) {
            debugLog("ClientSession#close : warning, client is already closed");
            return callback(); // already close ?
        }
        node_opcua_assert_1.assert(this._client);
        this._terminatePublishEngine();
        this._client.closeSession(this, deleteSubscription, callback);
    }
    /**
     * @method hasBeenClosed
     * @return {Boolean}
     */
    hasBeenClosed() {
        return node_opcua_utils_1.isNullOrUndefined(this._client) || this._closed || this._closeEventHasBeenEmitted;
    }
    /**
     * @internal
     * @param args
     */
    call(...args) {
        const isArray = _.isArray(args[0]);
        const methodsToCall = isArray ? args[0] : [args[0]];
        node_opcua_assert_1.assert(_.isArray(methodsToCall));
        const callback = args[1];
        // Note : The client has no explicit address space and therefore will struggle to
        //        access the method arguments signature.
        //        There are two methods that can be considered:
        //           - get the object definition by querying the server
        //           - load a fake address space to have some thing to query on our end
        // const request = this._client.factory.constructObjectId("CallRequest",{ methodsToCall: methodsToCall});
        const request = new node_opcua_service_call_1.CallRequest({ methodsToCall });
        this.performMessageTransaction(request, (err, response) => {
            /* istanbul ignore next */
            if (err) {
                return callback(err);
            }
            /* istanbul ignore next */
            if (!response || !(response instanceof node_opcua_service_call_1.CallResponse)) {
                return callback(new Error("internal error"));
            }
            response.results = response.results || [];
            promoteOpaqueStructure3WithCallback(this, response.results, () => {
                callback(null, isArray ? response.results : response.results[0]);
            });
        });
    }
    getMonitoredItems(...args) {
        const subscriptionId = args[0];
        const callback = args[1];
        // <UAObject NodeId="i=2253"  BrowseName="Server">
        // <UAMethod NodeId="i=11492" BrowseName="GetMonitoredItems"
        //                                         ParentNodeId="i=2253" MethodDeclarationId="i=11489">
        // <UAMethod NodeId="i=11489" BrowseName="GetMonitoredItems" ParentNodeId="i=2004">
        const methodsToCall = new node_opcua_service_call_1.CallMethodRequest({
            inputArguments: [
                // BaseDataType
                { dataType: node_opcua_variant_1.DataType.UInt32, value: subscriptionId }
            ],
            methodId: node_opcua_nodeid_1.coerceNodeId("ns=0;i=11492"),
            objectId: node_opcua_nodeid_1.coerceNodeId("ns=0;i=2253") // ObjectId.Server
        });
        this.call(methodsToCall, (err, result) => {
            /* istanbul ignore next */
            if (err) {
                return callback(err);
            }
            /* istanbul ignore next */
            if (!result) {
                return callback(new Error("internal error"));
            }
            /* istanbul ignore next */
            if (result.statusCode.isNot(node_opcua_status_code_1.StatusCodes.Good)) {
                callback(new Error(result.statusCode.toString()));
            }
            else {
                result.outputArguments = result.outputArguments || [];
                node_opcua_assert_1.assert(result.outputArguments.length === 2);
                const data = {
                    clientHandles: result.outputArguments[1].value,
                    serverHandles: result.outputArguments[0].value //
                };
                // Note some server might return null array
                // let make sure we have Uint32Array and not a null pointer
                data.serverHandles = data.serverHandles || /* istanbul ignore next */ emptyUint32Array;
                data.clientHandles = data.clientHandles || /* istanbul ignore next */ emptyUint32Array;
                node_opcua_assert_1.assert(data.serverHandles instanceof Uint32Array);
                node_opcua_assert_1.assert(data.clientHandles instanceof Uint32Array);
                callback(null, data);
            }
        });
    }
    /**
     * @internal
     */
    getArgumentDefinition(...args) {
        const methodId = args[0];
        const callback = args[1];
        node_opcua_assert_1.assert(_.isFunction(callback));
        return node_opcua_pseudo_session_1.getArgumentDefinitionHelper(this, methodId, callback);
    }
    registerNodes(...args) {
        const nodesToRegister = args[0];
        const callback = args[1];
        node_opcua_assert_1.assert(_.isFunction(callback));
        node_opcua_assert_1.assert(_.isArray(nodesToRegister));
        const request = new node_opcua_service_register_node_1.RegisterNodesRequest({
            nodesToRegister: nodesToRegister.map(node_opcua_nodeid_1.resolveNodeId)
        });
        this.performMessageTransaction(request, (err, response) => {
            /* istanbul ignore next */
            if (err) {
                return callback(err);
            }
            /* istanbul ignore next */
            if (!response || !(response instanceof node_opcua_service_register_node_1.RegisterNodesResponse)) {
                return callback(new Error("Internal Error"));
            }
            response.registeredNodeIds = response.registeredNodeIds || /* istanbul ignore next */ [];
            callback(null, response.registeredNodeIds);
        });
    }
    unregisterNodes(...args) {
        const nodesToUnregister = args[0];
        const callback = args[1];
        node_opcua_assert_1.assert(_.isFunction(callback));
        node_opcua_assert_1.assert(_.isArray(nodesToUnregister));
        const request = new node_opcua_service_register_node_1.UnregisterNodesRequest({
            nodesToUnregister: nodesToUnregister.map(node_opcua_nodeid_1.resolveNodeId)
        });
        this.performMessageTransaction(request, (err, response) => {
            /* istanbul ignore next */
            if (err) {
                return callback(err);
            }
            /* istanbul ignore next */
            if (!response || !(response instanceof node_opcua_service_register_node_1.UnregisterNodesResponse)) {
                return callback(new Error("Internal Error"));
            }
            callback();
        });
    }
    queryFirst(...args) {
        const queryFirstRequest = args[0];
        const callback = args[1];
        node_opcua_assert_1.assert(_.isFunction(callback));
        const request = new node_opcua_service_query_1.QueryFirstRequest(queryFirstRequest);
        this.performMessageTransaction(request, (err, response) => {
            /* istanbul ignore next */
            if (err) {
                return callback(err);
            }
            /* istanbul ignore next */
            if (!response || !(response instanceof node_opcua_service_query_1.QueryFirstResponse)) {
                return callback(new Error("internal error"));
            }
            callback(null, response);
        });
    }
    startKeepAliveManager() {
        node_opcua_assert_1.assert(!this._keepAliveManager, "keepAliveManger already started");
        this._keepAliveManager = new client_session_keepalive_manager_1.ClientSessionKeepAliveManager(this);
        this._keepAliveManager.on("failure", () => {
            this.stopKeepAliveManager();
            /**
             * raised when a keep-alive request has failed on the session, may be the session has timeout
             * unexpectidaly on the server side, may be the connection is broken.
             * @event keepalive_failure
             */
            this.emit("keepalive_failure");
        });
        this._keepAliveManager.on("keepalive", (state) => {
            /**
             * @event keepalive
             */
            this.emit("keepalive", state);
        });
        this._keepAliveManager.start();
    }
    stopKeepAliveManager() {
        if (this._keepAliveManager) {
            this._keepAliveManager.stop();
            this._keepAliveManager = undefined;
        }
    }
    dispose() {
        node_opcua_assert_1.assert(this._closeEventHasBeenEmitted);
        this._terminatePublishEngine();
        this.stopKeepAliveManager();
        this.removeAllListeners();
    }
    toString() {
        const now = Date.now();
        const lap1 = (now - this.lastRequestSentTime.getTime());
        const lap2 = now - this.lastResponseReceivedTime.getTime();
        let str = "";
        str += " name..................... " + this.name;
        str += " sessionId................ " + this.sessionId.toString();
        str += " authenticationToken...... " + this.authenticationToken ? this.authenticationToken.toString() : "";
        str += " timeout.................. " + this.timeout + "ms";
        str += " serverNonce.............. " + this.serverNonce ? this.serverNonce.toString("hex") : "";
        str += " serverCertificate........ " + this.serverCertificate.toString("base64");
        // xx console.log(" serverSignature.......... ", this.serverSignature);
        str += " lastRequestSentTime...... " + new Date(this.lastRequestSentTime).toISOString() + lap1;
        str += " lastResponseReceivedTime. " + new Date(this.lastResponseReceivedTime).toISOString() + lap2;
        return str;
    }
    getBuiltInDataType(...args) {
        const nodeId = args[0];
        const callback = args[1];
        let dataTypeId = null;
        const nodeToRead = {
            attributeId: node_opcua_service_read_1.AttributeIds.DataType,
            nodeId
        };
        this.read(nodeToRead, 0, (err, dataValue) => {
            if (err) {
                return callback(err);
            }
            /* istanbul ignore next */
            if (!dataValue) {
                return callback(new Error("Internal Error"));
            }
            /* istanbul ignore next */
            if (dataValue.statusCode.isNot(node_opcua_status_code_1.StatusCodes.Good)) {
                return callback(new Error("cannot read DataType Attribute " + dataValue.statusCode.toString()));
            }
            dataTypeId = dataValue.value.value;
            node_opcua_assert_1.assert(dataTypeId instanceof node_opcua_nodeid_1.NodeId);
            __findBasicDataType(this, dataTypeId, callback);
        });
    }
    resumePublishEngine() {
        node_opcua_assert_1.assert(this._publishEngine);
        if (this._publishEngine && this._publishEngine.subscriptionCount > 0) {
            this._publishEngine.replenish_publish_request_queue();
        }
    }
    readNamespaceArray(...args) {
        const callback = args[0];
        this.read({
            attributeId: node_opcua_service_read_1.AttributeIds.Value,
            nodeId: node_opcua_nodeid_1.resolveNodeId("Server_NamespaceArray")
        }, (err, dataValue) => {
            /* istanbul ignore next */
            if (err) {
                return callback(err);
            }
            /* istanbul ignore next */
            if (!dataValue) {
                return callback(new Error("Internal Error"));
            }
            /* istanbul ignore next */
            if (dataValue.statusCode !== node_opcua_status_code_1.StatusCodes.Good) {
                return callback(new Error("readNamespaceArray : " + dataValue.statusCode.toString()));
            }
            node_opcua_assert_1.assert(dataValue.value.value instanceof Array);
            this._namespaceArray = dataValue.value.value; // keep a cache
            callback(null, this._namespaceArray);
        });
    }
    getNamespaceIndex(namespaceUri) {
        node_opcua_assert_1.assert(this._namespaceArray, "please make sure that readNamespaceArray has been called");
        return this._namespaceArray.indexOf(namespaceUri);
    }
    // tslint:disable:no-empty
    // ---------------------------------------- Alarm & condition stub
    disableCondition() {
    }
    enableCondition() {
    }
    addCommentCondition(_conditionId, _eventId, _comment, _callback) {
    }
    confirmCondition(_conditionId, _eventId, _comment, _callback) {
    }
    acknowledgeCondition(_conditionId, _eventId, _comment, _callback) {
    }
    findMethodId(_nodeId, _methodName, _callback) {
    }
    _callMethodCondition(_methodName, _conditionId, _eventId, _comment, _callback) {
    }
    extractNamespaceDataType() {
        return __awaiter(this, void 0, void 0, function* () {
            const sessionPriv = this;
            if (!sessionPriv.$$extraDataTypeManager) {
                const extraDataTypeManager = new node_opcua_client_dynamic_extension_object_1.ExtraDataTypeManager();
                yield node_opcua_client_dynamic_extension_object_1.extractNamespaceDataType(this, extraDataTypeManager);
                sessionPriv.$$extraDataTypeManager = extraDataTypeManager;
            }
            return sessionPriv.$$extraDataTypeManager;
        });
    }
    getExtensionObjectConstructor(dataTypeNodeId) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.extractNamespaceDataType();
            const sessionPriv = this;
            if (!sessionPriv.$$extraDataTypeManager) {
                throw new Error("Make sure to call await session.extractNamespaceDataType(); ");
            }
            const extraDataTypeManager = sessionPriv.$$extraDataTypeManager;
            // make sure schema has been extracted
            const schema = yield node_opcua_client_dynamic_extension_object_1.getDataTypeDefinition(this, dataTypeNodeId, extraDataTypeManager);
            // now resolve it
            return extraDataTypeManager.getExtensionObjectConstructorFromDataType(dataTypeNodeId);
        });
    }
    /**
     *
     * @param dataType
     * @param pojo
     * @async
     */
    constructExtensionObject(dataType, pojo) {
        return __awaiter(this, void 0, void 0, function* () {
            const Constructor = yield this.getExtensionObjectConstructor(dataType);
            return new Constructor(pojo);
        });
    }
    _defaultRequest(requestClass, _responseClass, options, callback) {
        node_opcua_assert_1.assert(_.isFunction(callback));
        const request = options instanceof requestClass ? options : new requestClass(options);
        /* istanbul ignore next */
        if (doDebug) {
            request.trace = new Error("").stack;
        }
        /* istanbul ignore next */
        if (this._closeEventHasBeenEmitted) {
            debugLog("ClientSession#_defaultRequest => session has been closed !!", request.toString());
            setImmediate(() => {
                callback(new Error("ClientSession is closed !"));
            });
            return;
        }
        this.performMessageTransaction(request, (err, response) => {
            if (this._closeEventHasBeenEmitted) {
                debugLog("ClientSession#_defaultRequest ... err =", err, response ? response.toString() : " null");
            }
            /* istanbul ignore next */
            if (err) {
                // let intercept interesting error message
                if (err.message.match(/BadSessionClosed/)) {
                    // the session has been closed by Server
                    // probably due to timeout issue
                    // let's print some statistics
                    const now = Date.now();
                    /* istanbul ignore next */
                    if (doDebug) {
                        debugLog(chalk_1.default.bgWhite.red(" server send BadSessionClosed !"));
                        debugLog(chalk_1.default.bgWhite.red(" request was               "), request.toString());
                        debugLog(" timeout.................. ", this.timeout);
                        debugLog(" lastRequestSentTime...... ", new Date(this.lastRequestSentTime).toISOString(), now - this.lastRequestSentTime.getTime());
                        debugLog(" lastResponseReceivedTime. ", new Date(this.lastResponseReceivedTime).toISOString(), now - this.lastResponseReceivedTime.getTime());
                    }
                    //  DO NOT TERMINATE SESSION, as we will need a publishEngine when we
                    //  reconnect this._terminatePublishEngine();
                    /**
                     * send when the session has been closed by the server ( probably due to inactivity and timeout)
                     * @event session_closed
                     */
                    this.emitCloseEvent(node_opcua_status_code_1.StatusCodes.BadSessionClosed);
                }
                return callback(err, response);
            }
            callback(null, response);
        });
    }
}
exports.ClientSessionImpl = ClientSessionImpl;
function promoteOpaqueStructure2(session, callMethodResult) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!callMethodResult || !callMethodResult.outputArguments || callMethodResult.outputArguments.length === 0) {
            return;
        }
        // construct dataTypeManager if not already present
        const extraDataTypeManager = yield node_opcua_client_dynamic_extension_object_1.getExtraDataTypeManager(session);
        const promises = callMethodResult.outputArguments.map((value) => __awaiter(this, void 0, void 0, function* () {
            if (value.dataType === node_opcua_variant_1.DataType.ExtensionObject) {
                yield node_opcua_client_dynamic_extension_object_1.resolveDynamicExtensionObject(value, extraDataTypeManager);
            }
        }));
        yield Promise.all(promises);
    });
}
function promoteOpaqueStructure3(session, callMethodResults) {
    return __awaiter(this, void 0, void 0, function* () {
        // construct dataTypeManager if not already present
        const extraDataTypeManager = yield node_opcua_client_dynamic_extension_object_1.getExtraDataTypeManager(session);
        const promises = callMethodResults.map((x) => __awaiter(this, void 0, void 0, function* () { return promoteOpaqueStructure2(session, x); }));
        yield Promise.all(promises);
    });
}
// tslint:disable:no-var-requires
// tslint:disable:max-line-length
const thenify = require("thenify");
const callbackify = require("callbackify");
const opts = { multiArgs: false };
const promoteOpaqueStructureWithCallback = callbackify(node_opcua_client_dynamic_extension_object_1.promoteOpaqueStructure);
const promoteOpaqueStructure3WithCallback = callbackify(promoteOpaqueStructure3);
ClientSessionImpl.prototype.browse = thenify.withCallback(ClientSessionImpl.prototype.browse, opts);
ClientSessionImpl.prototype.browseNext = thenify.withCallback(ClientSessionImpl.prototype.browseNext, opts);
ClientSessionImpl.prototype.readVariableValue = thenify.withCallback(ClientSessionImpl.prototype.readVariableValue, opts);
ClientSessionImpl.prototype.readHistoryValue = thenify.withCallback(ClientSessionImpl.prototype.readHistoryValue, opts);
ClientSessionImpl.prototype.write = thenify.withCallback(ClientSessionImpl.prototype.write, opts);
ClientSessionImpl.prototype.writeSingleNode = thenify.withCallback(ClientSessionImpl.prototype.writeSingleNode, opts);
ClientSessionImpl.prototype.readAllAttributes = thenify.withCallback(ClientSessionImpl.prototype.readAllAttributes, opts);
ClientSessionImpl.prototype.read = thenify.withCallback(ClientSessionImpl.prototype.read, opts);
ClientSessionImpl.prototype.createSubscription = thenify.withCallback(ClientSessionImpl.prototype.createSubscription, opts);
ClientSessionImpl.prototype.createSubscription2 = thenify.withCallback(ClientSessionImpl.prototype.createSubscription2, opts);
ClientSessionImpl.prototype.deleteSubscriptions = thenify.withCallback(ClientSessionImpl.prototype.deleteSubscriptions, opts);
ClientSessionImpl.prototype.transferSubscriptions = thenify.withCallback(ClientSessionImpl.prototype.transferSubscriptions, opts);
ClientSessionImpl.prototype.createMonitoredItems = thenify.withCallback(ClientSessionImpl.prototype.createMonitoredItems, opts);
ClientSessionImpl.prototype.modifyMonitoredItems = thenify.withCallback(ClientSessionImpl.prototype.modifyMonitoredItems, opts);
ClientSessionImpl.prototype.modifySubscription = thenify.withCallback(ClientSessionImpl.prototype.modifySubscription, opts);
ClientSessionImpl.prototype.setMonitoringMode = thenify.withCallback(ClientSessionImpl.prototype.setMonitoringMode, opts);
ClientSessionImpl.prototype.publish = thenify.withCallback(ClientSessionImpl.prototype.publish, opts);
ClientSessionImpl.prototype.republish = thenify.withCallback(ClientSessionImpl.prototype.republish, opts);
ClientSessionImpl.prototype.deleteMonitoredItems = thenify.withCallback(ClientSessionImpl.prototype.deleteMonitoredItems, opts);
ClientSessionImpl.prototype.setPublishingMode = thenify.withCallback(ClientSessionImpl.prototype.setPublishingMode, opts);
ClientSessionImpl.prototype.translateBrowsePath = thenify.withCallback(ClientSessionImpl.prototype.translateBrowsePath, opts);
ClientSessionImpl.prototype.performMessageTransaction = thenify.withCallback(ClientSessionImpl.prototype.performMessageTransaction, opts);
ClientSessionImpl.prototype.close = thenify.withCallback(ClientSessionImpl.prototype.close, opts);
ClientSessionImpl.prototype.call = thenify.withCallback(ClientSessionImpl.prototype.call, opts);
ClientSessionImpl.prototype.getMonitoredItems = thenify.withCallback(ClientSessionImpl.prototype.getMonitoredItems, opts);
ClientSessionImpl.prototype.getArgumentDefinition = thenify.withCallback(ClientSessionImpl.prototype.getArgumentDefinition, opts);
ClientSessionImpl.prototype.queryFirst = thenify.withCallback(ClientSessionImpl.prototype.queryFirst, opts);
ClientSessionImpl.prototype.registerNodes = thenify.withCallback(ClientSessionImpl.prototype.registerNodes, opts);
ClientSessionImpl.prototype.unregisterNodes = thenify.withCallback(ClientSessionImpl.prototype.unregisterNodes, opts);
ClientSessionImpl.prototype.readNamespaceArray = thenify.withCallback(ClientSessionImpl.prototype.readNamespaceArray, opts);
ClientSessionImpl.prototype.getBuiltInDataType = thenify.withCallback(ClientSessionImpl.prototype.getBuiltInDataType, opts);
ClientSessionImpl.prototype.constructExtensionObject = callbackify(ClientSessionImpl.prototype.constructExtensionObject);
//# sourceMappingURL=client_session_impl.js.map