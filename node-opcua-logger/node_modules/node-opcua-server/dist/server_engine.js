"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * @module node-opcua-server
 */
// tslint:disable:no-console
const async = require("async");
const chalk_1 = require("chalk");
const events_1 = require("events");
const node_opcua_assert_1 = require("node-opcua-assert");
const _ = require("underscore");
const node_opcua_address_space_1 = require("node-opcua-address-space");
const node_opcua_data_value_1 = require("node-opcua-data-value");
const node_opcua_common_1 = require("node-opcua-common");
const node_opcua_data_model_1 = require("node-opcua-data-model");
const node_opcua_nodeid_1 = require("node-opcua-nodeid");
const node_opcua_service_read_1 = require("node-opcua-service-read");
const node_opcua_service_subscription_1 = require("node-opcua-service-subscription");
const node_opcua_client_dynamic_extension_object_1 = require("node-opcua-client-dynamic-extension-object");
const node_opcua_constants_1 = require("node-opcua-constants");
const node_opcua_date_time_1 = require("node-opcua-date-time");
const node_opcua_debug_1 = require("node-opcua-debug");
const node_opcua_nodesets_1 = require("node-opcua-nodesets");
const node_opcua_object_registry_1 = require("node-opcua-object-registry");
const node_opcua_service_call_1 = require("node-opcua-service-call");
const node_opcua_service_endpoints_1 = require("node-opcua-service-endpoints");
const node_opcua_service_history_1 = require("node-opcua-service-history");
const node_opcua_status_code_1 = require("node-opcua-status-code");
const node_opcua_types_1 = require("node-opcua-types");
const node_opcua_variant_1 = require("node-opcua-variant");
const history_server_capabilities_1 = require("./history_server_capabilities");
const monitored_item_1 = require("./monitored_item");
const server_capabilities_1 = require("./server_capabilities");
const server_publish_engine_1 = require("./server_publish_engine");
const server_publish_engine_for_orphan_subscriptions_1 = require("./server_publish_engine_for_orphan_subscriptions");
const server_session_1 = require("./server_session");
const server_subscription_1 = require("./server_subscription");
const debugLog = node_opcua_debug_1.make_debugLog(__filename);
const errorLog = node_opcua_debug_1.make_errorLog(__filename);
const doDebug = node_opcua_debug_1.checkDebugFlag(__filename);
function shutdownAndDisposeAddressSpace() {
    if (this.addressSpace) {
        this.addressSpace.shutdown();
        this.addressSpace.dispose();
        delete this.addressSpace;
    }
}
// binding methods
function getMonitoredItemsId(inputArguments, context, callback) {
    const engine = this; // ServerEngine
    node_opcua_assert_1.assert(_.isArray(inputArguments));
    node_opcua_assert_1.assert(_.isFunction(callback));
    node_opcua_assert_1.assert(context.hasOwnProperty("session"), " expecting a session id in the context object");
    const session = context.session;
    if (!session) {
        return callback(null, { statusCode: node_opcua_status_code_1.StatusCodes.BadInternalError });
    }
    const subscriptionId = inputArguments[0].value;
    const subscription = session.getSubscription(subscriptionId);
    if (!subscription) {
        // subscription may belongs to a different session  that ours
        if (engine.findSubscription(subscriptionId)) {
            // if yes, then access to  Subscription data should be denied
            return callback(null, { statusCode: node_opcua_status_code_1.StatusCodes.BadUserAccessDenied });
        }
        return callback(null, { statusCode: node_opcua_status_code_1.StatusCodes.BadSubscriptionIdInvalid });
    }
    const result = subscription.getMonitoredItems();
    node_opcua_assert_1.assert(result.statusCode);
    node_opcua_assert_1.assert(_.isArray(result.serverHandles));
    node_opcua_assert_1.assert(_.isArray(result.clientHandles));
    node_opcua_assert_1.assert(result.serverHandles.length === result.clientHandles.length);
    const callMethodResult = new node_opcua_service_call_1.CallMethodResult({
        statusCode: result.statusCode,
        outputArguments: [
            { dataType: node_opcua_variant_1.DataType.UInt32, arrayType: node_opcua_variant_1.VariantArrayType.Array, value: result.serverHandles },
            { dataType: node_opcua_variant_1.DataType.UInt32, arrayType: node_opcua_variant_1.VariantArrayType.Array, value: result.clientHandles }
        ]
    });
    callback(null, callMethodResult);
}
function __bindVariable(self, nodeId, options) {
    options = options || {};
    // must have a get and a set property
    node_opcua_assert_1.assert(_.difference(["get", "set"], _.keys(options)).length === 0);
    const variable = self.addressSpace.findNode(nodeId);
    if (variable && variable.bindVariable) {
        variable.bindVariable(options);
        node_opcua_assert_1.assert(_.isFunction(variable.asyncRefresh));
        node_opcua_assert_1.assert(_.isFunction(variable.refreshFunc));
    }
    else {
        console.log("Warning: cannot bind object with id ", nodeId.toString(), " please check your nodeset.xml file or add this node programmatically");
    }
}
// note OPCUA 1.03 part 4 page 76
// The Server-assigned identifier for the Subscription (see 7.14 for IntegerId definition). This identifier shall
// be unique for the entire Server, not just for the Session, in order to allow the Subscription to be transferred
// to another Session using the TransferSubscriptions service.
// After Server start-up the generation of subscriptionIds should start from a random IntegerId or continue from
// the point before the restart.
let next_subscriptionId = Math.ceil(Math.random() * 1000000);
function _get_next_subscriptionId() {
    debugLog(" next_subscriptionId = ", next_subscriptionId);
    return next_subscriptionId++;
}
/**
 *
 */
class ServerEngine extends events_1.EventEmitter {
    constructor(options) {
        super();
        this._rejectedSessionCount = 0;
        options = options || { applicationUri: "" };
        options.buildInfo = options.buildInfo || {};
        ServerEngine.registry.register(this);
        this._sessions = {};
        this._closedSessions = {};
        this._orphanPublishEngine = undefined; // will be constructed on demand
        this.isAuditing = _.isBoolean(options.isAuditing) ? options.isAuditing : false;
        options.buildInfo.buildDate = options.buildInfo.buildDate || new Date();
        // ---------------------------------------------------- ServerStatusDataType
        this.serverStatus = new node_opcua_common_1.ServerStatusDataType({
            buildInfo: options.buildInfo,
            currentTime: new Date(),
            secondsTillShutdown: 0,
            shutdownReason: { text: "" },
            startTime: new Date(),
            state: node_opcua_common_1.ServerState.NoConfiguration
        });
        // --------------------------------------------------- ServerCapabilities
        options.serverCapabilities = options.serverCapabilities || {};
        options.serverCapabilities.serverProfileArray = options.serverCapabilities.serverProfileArray || [
            "Standard UA Server Profile",
            "Embedded UA Server Profile",
            "Micro Embedded Device Server Profile",
            "Nano Embedded Device Server Profile"
        ];
        options.serverCapabilities.localeIdArray = options.serverCapabilities.localeIdArray || ["en-EN", "fr-FR"];
        this.serverCapabilities = new server_capabilities_1.ServerCapabilities(options.serverCapabilities);
        // to do when spec is clear about what goes here!
        // spec 1.04 says (in Part 4 7.33 SignedSoftwareCertificate
        // Note: Details on SoftwareCertificates need to be defined in a future version.
        this.serverCapabilities.softwareCertificates = [
        // new SignedSoftwareCertificate({})
        ];
        // make sure minSupportedSampleRate matches MonitoredItem.minimumSamplingInterval
        this.serverCapabilities.__defineGetter__("minSupportedSampleRate", () => {
            return monitored_item_1.MonitoredItem.minimumSamplingInterval;
        });
        this.historyServerCapabilities = new history_server_capabilities_1.HistoryServerCapabilities(options.historyServerCapabilities);
        // --------------------------------------------------- serverDiagnosticsSummary extension Object
        this.serverDiagnosticsSummary = new node_opcua_common_1.ServerDiagnosticsSummaryDataType();
        node_opcua_assert_1.assert(this.serverDiagnosticsSummary.hasOwnProperty("currentSessionCount"));
        // note spelling is different for serverDiagnosticsSummary.currentSubscriptionCount
        //      and sessionDiagnostics.currentSubscriptionsCount ( with an s)
        node_opcua_assert_1.assert(this.serverDiagnosticsSummary.hasOwnProperty("currentSubscriptionCount"));
        this.serverDiagnosticsSummary.__defineGetter__("currentSubscriptionCount", () => {
            // currentSubscriptionCount returns the total number of subscriptions
            // that are currently active on all sessions
            let counter = 0;
            _.values(this._sessions).forEach((session) => {
                counter += session.currentSubscriptionCount;
            });
            return counter;
        });
        this.status = "creating";
        this.setServerState(node_opcua_common_1.ServerState.NoConfiguration);
        this.addressSpace = null;
        this._shutdownTask = [];
        this._applicationUri = "";
        if (typeof options.applicationUri === "function") {
            this.__defineGetter__("_applicationUri", options.applicationUri);
        }
        else {
            this._applicationUri = options.applicationUri || "<unset _applicationUri>";
        }
        options.serverDiagnosticsEnabled = options.hasOwnProperty("serverDiagnosticsEnable")
            ? options.serverDiagnosticsEnabled : true;
        this.serverDiagnosticsEnabled = options.serverDiagnosticsEnabled;
    }
    dispose() {
        this.addressSpace = null;
        node_opcua_assert_1.assert(Object.keys(this._sessions).length === 0, "ServerEngine#_sessions not empty");
        this._sessions = {};
        // todo fix me
        this._closedSessions = {};
        node_opcua_assert_1.assert(Object.keys(this._closedSessions).length === 0, "ServerEngine#_closedSessions not empty");
        this._closedSessions = {};
        if (this._orphanPublishEngine) {
            this._orphanPublishEngine.dispose();
            this._orphanPublishEngine = undefined;
        }
        this._shutdownTask = [];
        this.serverStatus = null;
        this.status = "disposed";
        this.removeAllListeners();
        ServerEngine.registry.unregister(this);
    }
    get startTime() {
        return this.serverStatus.startTime;
    }
    get currentTime() {
        return this.serverStatus.currentTime;
    }
    get buildInfo() {
        return this.serverStatus.buildInfo;
    }
    /**
     * register a function that will be called when the server will perform its shut down.
     * @method registerShutdownTask
     */
    registerShutdownTask(task) {
        const engine = this;
        node_opcua_assert_1.assert(_.isFunction(task));
        engine._shutdownTask.push(task);
    }
    /**
     * @method shutdown
     */
    shutdown() {
        debugLog("ServerEngine#shutdown");
        this.status = "shutdown";
        this.setServerState(node_opcua_common_1.ServerState.Shutdown);
        // delete any existing sessions
        const tokens = Object.keys(this._sessions).map((key) => {
            const session = this._sessions[key];
            return session.authenticationToken;
        });
        // delete and close any orphan subscriptions
        if (this._orphanPublishEngine) {
            this._orphanPublishEngine.shutdown();
        }
        // xx console.log("xxxxxxxxx ServerEngine.shutdown must terminate "+ tokens.length," sessions");
        tokens.forEach((token) => {
            this.closeSession(token, true, "Terminated");
        });
        // all sessions must have been terminated
        node_opcua_assert_1.assert(this.currentSessionCount === 0);
        // all subscriptions must have been terminated
        node_opcua_assert_1.assert(this.currentSubscriptionCount === 0, "all subscriptions must have been terminated");
        this._shutdownTask.push(shutdownAndDisposeAddressSpace);
        // perform registerShutdownTask
        this._shutdownTask.forEach((task) => {
            task.call(this);
        });
        this.dispose();
    }
    /**
     * the number of active sessions
     */
    get currentSessionCount() {
        return this.serverDiagnosticsSummary.currentSessionCount;
    }
    /**
     * the cumulated number of sessions that have been opened since this object exists
     */
    get cumulatedSessionCount() {
        return this.serverDiagnosticsSummary.cumulatedSessionCount;
    }
    /**
     * the number of active subscriptions.
     */
    get currentSubscriptionCount() {
        return this.serverDiagnosticsSummary.currentSubscriptionCount;
    }
    /**
     * the cumulated number of subscriptions that have been created since this object exists
     */
    get cumulatedSubscriptionCount() {
        return this.serverDiagnosticsSummary.cumulatedSubscriptionCount;
    }
    get rejectedSessionCount() {
        return this.serverDiagnosticsSummary.rejectedSessionCount;
    }
    get rejectedRequestsCount() {
        return this.serverDiagnosticsSummary.rejectedRequestsCount;
    }
    get sessionAbortCount() {
        return this.serverDiagnosticsSummary.sessionAbortCount;
    }
    get sessionTimeoutCount() {
        return this.serverDiagnosticsSummary.sessionTimeoutCount;
    }
    get publishingIntervalCount() {
        return this.serverDiagnosticsSummary.publishingIntervalCount;
    }
    /**
     * @method secondsTillShutdown
     * @return the approximate number of seconds until the server will be shut down. The
     * value is only relevant once the state changes into SHUTDOWN.
     */
    secondsTillShutdown() {
        // ToDo: implement a correct solution here
        return 0;
    }
    /**
     * the name of the server
     */
    get serverName() {
        return this.serverStatus.buildInfo.productName;
    }
    /**
     * the server urn
     */
    get serverNameUrn() {
        return this._applicationUri;
    }
    /**
     * the urn of the server namespace
     */
    get serverNamespaceUrn() {
        return this._applicationUri; // "urn:" + engine.serverName;
    }
    setServerState(serverState) {
        node_opcua_assert_1.assert(serverState !== null && serverState !== undefined);
        this.serverStatus.state = serverState;
    }
    getServerDiagnosticsEnabledFlag() {
        const server = this.addressSpace.rootFolder.objects.server;
        const serverDiagnostics = server.getComponentByName("ServerDiagnostics");
        if (!serverDiagnostics) {
            return false;
        }
        return serverDiagnostics.readValue().value.value;
    }
    /**
     * @method initialize
     * @async
     *
     * @param options {Object}
     * @param options.nodeset_filename {String} - [option](default : 'mini.Node.Set2.xml' )
     * @param callback
     */
    initialize(options, callback) {
        const engine = this;
        node_opcua_assert_1.assert(!engine.addressSpace); // check that 'initialize' has not been already called
        engine.status = "initializing";
        options = options || {};
        node_opcua_assert_1.assert(_.isFunction(callback));
        options.nodeset_filename = options.nodeset_filename || node_opcua_nodesets_1.nodesets.standard_nodeset_file;
        const startTime = new Date();
        debugLog("Loading ", options.nodeset_filename, "...");
        engine.addressSpace = node_opcua_address_space_1.AddressSpace.create();
        // register namespace 1 (our namespace);
        const serverNamespace = engine.addressSpace.registerNamespace(engine.serverNamespaceUrn);
        node_opcua_assert_1.assert(serverNamespace.index === 1);
        node_opcua_address_space_1.generateAddressSpace(engine.addressSpace, options.nodeset_filename, () => {
            if (!engine.addressSpace) {
                throw new Error("Internal error");
            }
            const addressSpace = engine.addressSpace;
            const endTime = new Date();
            debugLog("Loading ", options.nodeset_filename, " done : ", endTime.getTime() - startTime.getTime(), " ms");
            engine.setServerState(node_opcua_common_1.ServerState.Running);
            function bindVariableIfPresent(nodeId, opts) {
                node_opcua_assert_1.assert(nodeId instanceof node_opcua_nodeid_1.NodeId);
                node_opcua_assert_1.assert(!nodeId.isEmpty());
                const obj = addressSpace.findNode(nodeId);
                if (obj) {
                    __bindVariable(engine, nodeId, opts);
                }
                return obj;
            }
            // -------------------------------------------- install default get/put handler
            const server_NamespaceArray_Id = node_opcua_nodeid_1.makeNodeId(node_opcua_constants_1.VariableIds.Server_NamespaceArray); // ns=0;i=2255
            bindVariableIfPresent(server_NamespaceArray_Id, {
                get() {
                    return new node_opcua_variant_1.Variant({
                        arrayType: node_opcua_variant_1.VariantArrayType.Array,
                        dataType: node_opcua_variant_1.DataType.String,
                        value: addressSpace.getNamespaceArray().map((x) => x.namespaceUri)
                    });
                },
                set: null // read only
            });
            const server_NameUrn_var = new node_opcua_variant_1.Variant({
                arrayType: node_opcua_variant_1.VariantArrayType.Array,
                dataType: node_opcua_variant_1.DataType.String,
                value: [
                    engine.serverNameUrn // this is us !
                ]
            });
            const server_ServerArray_Id = node_opcua_nodeid_1.makeNodeId(node_opcua_constants_1.VariableIds.Server_ServerArray); // ns=0;i=2254
            bindVariableIfPresent(server_ServerArray_Id, {
                get() {
                    return server_NameUrn_var;
                },
                set: null // read only
            });
            function bindStandardScalar(id, dataType, func, setter_func) {
                node_opcua_assert_1.assert(_.isNumber(id), "expecting id to be a number");
                node_opcua_assert_1.assert(_.isFunction(func));
                node_opcua_assert_1.assert(_.isFunction(setter_func) || !setter_func);
                node_opcua_assert_1.assert(dataType !== null); // check invalid dataType
                let setter_func2 = null;
                if (setter_func) {
                    setter_func2 = (variant) => {
                        const variable2 = !!variant.value;
                        setter_func(variable2);
                        return node_opcua_status_code_1.StatusCodes.Good;
                    };
                }
                const nodeId = node_opcua_nodeid_1.makeNodeId(id);
                // make sur the provided function returns a valid value for the variant type
                // This test may not be exhaustive but it will detect obvious mistakes.
                /* istanbul ignore next */
                if (!node_opcua_variant_1.isValidVariant(node_opcua_variant_1.VariantArrayType.Scalar, dataType, func())) {
                    errorLog("func", func());
                    throw new Error("bindStandardScalar : func doesn't provide an value of type " + node_opcua_variant_1.DataType[dataType]);
                }
                return bindVariableIfPresent(nodeId, {
                    get() {
                        return new node_opcua_variant_1.Variant({
                            arrayType: node_opcua_variant_1.VariantArrayType.Scalar,
                            dataType,
                            value: func()
                        });
                    },
                    set: setter_func2
                });
            }
            function bindStandardArray(id, variantDataType, dataType, func) {
                node_opcua_assert_1.assert(_.isFunction(func));
                node_opcua_assert_1.assert(variantDataType !== null); // check invalid dataType
                const nodeId = node_opcua_nodeid_1.makeNodeId(id);
                // make sur the provided function returns a valid value for the variant type
                // This test may not be exhaustive but it will detect obvious mistakes.
                node_opcua_assert_1.assert(node_opcua_variant_1.isValidVariant(node_opcua_variant_1.VariantArrayType.Array, variantDataType, func()));
                bindVariableIfPresent(nodeId, {
                    get() {
                        const value = func();
                        node_opcua_assert_1.assert(_.isArray(value));
                        return new node_opcua_variant_1.Variant({
                            arrayType: node_opcua_variant_1.VariantArrayType.Array,
                            dataType: variantDataType,
                            value
                        });
                    },
                    set: null // read only
                });
            }
            bindStandardScalar(node_opcua_constants_1.VariableIds.Server_EstimatedReturnTime, node_opcua_variant_1.DataType.DateTime, () => node_opcua_date_time_1.minOPCUADate);
            // TimeZoneDataType
            const timeZoneDataType = addressSpace.findDataType(node_opcua_nodeid_1.resolveNodeId(node_opcua_constants_1.DataTypeIds.TimeZoneDataType));
            // xx console.log(timeZoneDataType.toString());
            const timeZone = new node_opcua_types_1.TimeZoneDataType({
                daylightSavingInOffset: /* boolean*/ false,
                offset: /* int16 */ 0
            });
            bindStandardScalar(node_opcua_constants_1.VariableIds.Server_LocalTime, node_opcua_variant_1.DataType.ExtensionObject, () => {
                return timeZone;
            });
            bindStandardScalar(node_opcua_constants_1.VariableIds.Server_ServiceLevel, node_opcua_variant_1.DataType.Byte, () => {
                return 255;
            });
            bindStandardScalar(node_opcua_constants_1.VariableIds.Server_Auditing, node_opcua_variant_1.DataType.Boolean, () => {
                return engine.isAuditing;
            });
            function bindServerDiagnostics() {
                bindStandardScalar(node_opcua_constants_1.VariableIds.Server_ServerDiagnostics_EnabledFlag, node_opcua_variant_1.DataType.Boolean, () => {
                    return engine.serverDiagnosticsEnabled;
                }, (newFlag) => {
                    engine.serverDiagnosticsEnabled = newFlag;
                });
                const nodeId = node_opcua_nodeid_1.makeNodeId(node_opcua_constants_1.VariableIds.Server_ServerDiagnostics_ServerDiagnosticsSummary);
                const serverDiagnosticsSummary = addressSpace.findNode(nodeId);
                if (serverDiagnosticsSummary) {
                    serverDiagnosticsSummary.bindExtensionObject(engine.serverDiagnosticsSummary);
                    engine.serverDiagnosticsSummary = serverDiagnosticsSummary.$extensionObject;
                }
            }
            function bindServerStatus() {
                const serverStatusNode = addressSpace.findNode(node_opcua_nodeid_1.makeNodeId(node_opcua_constants_1.VariableIds.Server_ServerStatus));
                if (!serverStatusNode) {
                    return;
                }
                if (serverStatusNode) {
                    serverStatusNode.bindExtensionObject(engine.serverStatus);
                    // xx serverStatusNode.updateExtensionObjectPartial(self.serverStatus);
                    // xx self.serverStatus = serverStatusNode.$extensionObject;
                    serverStatusNode.minimumSamplingInterval = 1000;
                }
                const currentTimeNode = addressSpace.findNode(node_opcua_nodeid_1.makeNodeId(node_opcua_constants_1.VariableIds.Server_ServerStatus_CurrentTime));
                if (currentTimeNode) {
                    currentTimeNode.minimumSamplingInterval = 1000;
                }
                const secondsTillShutdown = addressSpace.findNode(node_opcua_nodeid_1.makeNodeId(node_opcua_constants_1.VariableIds.Server_ServerStatus_SecondsTillShutdown));
                if (secondsTillShutdown) {
                    secondsTillShutdown.minimumSamplingInterval = 1000;
                }
                node_opcua_assert_1.assert(serverStatusNode.$extensionObject);
                serverStatusNode.$extensionObject = new Proxy(serverStatusNode.$extensionObject, {
                    get(target, prop) {
                        if (prop === "currentTime") {
                            serverStatusNode.currentTime.touchValue();
                            return new Date();
                        }
                        else if (prop === "secondsTillShutdown") {
                            serverStatusNode.secondsTillShutdown.touchValue();
                            return engine.secondsTillShutdown();
                        }
                        return target[prop];
                    }
                });
            }
            function bindServerCapabilities() {
                bindStandardArray(node_opcua_constants_1.VariableIds.Server_ServerCapabilities_ServerProfileArray, node_opcua_variant_1.DataType.String, node_opcua_variant_1.DataType.String, () => {
                    return engine.serverCapabilities.serverProfileArray;
                });
                bindStandardArray(node_opcua_constants_1.VariableIds.Server_ServerCapabilities_LocaleIdArray, node_opcua_variant_1.DataType.String, "LocaleId", () => {
                    return engine.serverCapabilities.localeIdArray;
                });
                bindStandardScalar(node_opcua_constants_1.VariableIds.Server_ServerCapabilities_MinSupportedSampleRate, node_opcua_variant_1.DataType.Double, () => {
                    return engine.serverCapabilities.minSupportedSampleRate;
                });
                bindStandardScalar(node_opcua_constants_1.VariableIds.Server_ServerCapabilities_MaxBrowseContinuationPoints, node_opcua_variant_1.DataType.UInt16, () => {
                    return engine.serverCapabilities.maxBrowseContinuationPoints;
                });
                bindStandardScalar(node_opcua_constants_1.VariableIds.Server_ServerCapabilities_MaxQueryContinuationPoints, node_opcua_variant_1.DataType.UInt16, () => {
                    return engine.serverCapabilities.maxQueryContinuationPoints;
                });
                bindStandardScalar(node_opcua_constants_1.VariableIds.Server_ServerCapabilities_MaxHistoryContinuationPoints, node_opcua_variant_1.DataType.UInt16, () => {
                    return engine.serverCapabilities.maxHistoryContinuationPoints;
                });
                // added by DI : Server-specific period of time in milliseconds until the Server will revoke a lock.
                // TODO bindStandardScalar(VariableIds.Server_ServerCapabilities_MaxInactiveLockTime,
                // TODO     DataType.UInt16, function () {
                // TODO         return self.serverCapabilities.maxInactiveLockTime;
                // TODO });
                bindStandardArray(node_opcua_constants_1.VariableIds.Server_ServerCapabilities_SoftwareCertificates, node_opcua_variant_1.DataType.ExtensionObject, "SoftwareCertificates", () => {
                    return engine.serverCapabilities.softwareCertificates;
                });
                bindStandardScalar(node_opcua_constants_1.VariableIds.Server_ServerCapabilities_MaxArrayLength, node_opcua_variant_1.DataType.UInt32, () => {
                    return engine.serverCapabilities.maxArrayLength;
                });
                bindStandardScalar(node_opcua_constants_1.VariableIds.Server_ServerCapabilities_MaxStringLength, node_opcua_variant_1.DataType.UInt32, () => {
                    return engine.serverCapabilities.maxStringLength;
                });
                bindStandardScalar(node_opcua_constants_1.VariableIds.Server_ServerCapabilities_MaxByteStringLength, node_opcua_variant_1.DataType.UInt32, () => {
                    return engine.serverCapabilities.maxByteStringLength;
                });
                function bindOperationLimits(operationLimits) {
                    node_opcua_assert_1.assert(_.isObject(operationLimits));
                    function upperCaseFirst(str) {
                        return str.slice(0, 1).toUpperCase() + str.slice(1);
                    }
                    // Xx bindStandardArray(VariableIds.Server_ServerCapabilities_OperationLimits_MaxNodesPerWrite,
                    // Xx     DataType.UInt32, "UInt32", function () {  return operationLimits.maxNodesPerWrite;  });
                    const keys = Object.keys(operationLimits);
                    keys.forEach((key) => {
                        const uid = "Server_ServerCapabilities_OperationLimits_" + upperCaseFirst(key);
                        const nodeId = node_opcua_nodeid_1.makeNodeId(node_opcua_constants_1.VariableIds[uid]);
                        // xx console.log("xxx Binding ",uid,nodeId.toString());
                        node_opcua_assert_1.assert(!nodeId.isEmpty());
                        bindStandardScalar(node_opcua_constants_1.VariableIds[uid], node_opcua_variant_1.DataType.UInt32, () => {
                            return operationLimits[key];
                        });
                    });
                }
                bindOperationLimits(engine.serverCapabilities.operationLimits);
            }
            function bindHistoryServerCapabilities() {
                bindStandardScalar(node_opcua_constants_1.VariableIds.HistoryServerCapabilities_MaxReturnDataValues, node_opcua_variant_1.DataType.UInt32, () => {
                    return engine.historyServerCapabilities.maxReturnDataValues;
                });
                bindStandardScalar(node_opcua_constants_1.VariableIds.HistoryServerCapabilities_MaxReturnEventValues, node_opcua_variant_1.DataType.UInt32, () => {
                    return engine.historyServerCapabilities.maxReturnEventValues;
                });
                bindStandardScalar(node_opcua_constants_1.VariableIds.HistoryServerCapabilities_AccessHistoryDataCapability, node_opcua_variant_1.DataType.Boolean, () => {
                    return engine.historyServerCapabilities.accessHistoryDataCapability;
                });
                bindStandardScalar(node_opcua_constants_1.VariableIds.HistoryServerCapabilities_AccessHistoryEventsCapability, node_opcua_variant_1.DataType.Boolean, () => {
                    return engine.historyServerCapabilities.accessHistoryEventsCapability;
                });
                bindStandardScalar(node_opcua_constants_1.VariableIds.HistoryServerCapabilities_InsertDataCapability, node_opcua_variant_1.DataType.Boolean, () => {
                    return engine.historyServerCapabilities.insertDataCapability;
                });
                bindStandardScalar(node_opcua_constants_1.VariableIds.HistoryServerCapabilities_ReplaceDataCapability, node_opcua_variant_1.DataType.Boolean, () => {
                    return engine.historyServerCapabilities.replaceDataCapability;
                });
                bindStandardScalar(node_opcua_constants_1.VariableIds.HistoryServerCapabilities_UpdateDataCapability, node_opcua_variant_1.DataType.Boolean, () => {
                    return engine.historyServerCapabilities.updateDataCapability;
                });
                bindStandardScalar(node_opcua_constants_1.VariableIds.HistoryServerCapabilities_InsertEventCapability, node_opcua_variant_1.DataType.Boolean, () => {
                    return engine.historyServerCapabilities.insertEventCapability;
                });
                bindStandardScalar(node_opcua_constants_1.VariableIds.HistoryServerCapabilities_ReplaceEventCapability, node_opcua_variant_1.DataType.Boolean, () => {
                    return engine.historyServerCapabilities.replaceEventCapability;
                });
                bindStandardScalar(node_opcua_constants_1.VariableIds.HistoryServerCapabilities_UpdateEventCapability, node_opcua_variant_1.DataType.Boolean, () => {
                    return engine.historyServerCapabilities.updateEventCapability;
                });
                bindStandardScalar(node_opcua_constants_1.VariableIds.HistoryServerCapabilities_DeleteEventCapability, node_opcua_variant_1.DataType.Boolean, () => {
                    return engine.historyServerCapabilities.deleteEventCapability;
                });
                bindStandardScalar(node_opcua_constants_1.VariableIds.HistoryServerCapabilities_DeleteRawCapability, node_opcua_variant_1.DataType.Boolean, () => {
                    return engine.historyServerCapabilities.deleteRawCapability;
                });
                bindStandardScalar(node_opcua_constants_1.VariableIds.HistoryServerCapabilities_DeleteAtTimeCapability, node_opcua_variant_1.DataType.Boolean, () => {
                    return engine.historyServerCapabilities.deleteAtTimeCapability;
                });
                bindStandardScalar(node_opcua_constants_1.VariableIds.HistoryServerCapabilities_InsertAnnotationCapability, node_opcua_variant_1.DataType.Boolean, () => {
                    return engine.historyServerCapabilities.insertAnnotationCapability;
                });
            }
            bindServerDiagnostics();
            bindServerStatus();
            bindServerCapabilities();
            bindHistoryServerCapabilities();
            function bindExtraStuff() {
                // mainly for compliance
                // The version number for the data type description. i=104
                bindStandardScalar(node_opcua_constants_1.VariableIds.DataTypeDescriptionType_DataTypeVersion, node_opcua_variant_1.DataType.UInt16, () => {
                    return 0.0;
                });
                const nrt = addressSpace.findDataType(node_opcua_nodeid_1.resolveNodeId(node_opcua_constants_1.DataTypeIds.NamingRuleType));
                // xx console.log(nrt.toString());
                if (nrt) {
                    const namingRuleType = nrt._getDefinition().nameIndex; // getEnumeration("NamingRuleType");
                    // i=111
                    bindStandardScalar(node_opcua_constants_1.VariableIds.ModellingRuleType_NamingRule, node_opcua_variant_1.DataType.UInt16, () => {
                        return 0;
                    });
                    // i=112
                    bindStandardScalar(node_opcua_constants_1.VariableIds.ModellingRule_Mandatory_NamingRule, node_opcua_variant_1.DataType.UInt16, () => {
                        return namingRuleType.Mandatory ? namingRuleType.Mandatory.value : 0;
                    });
                    // i=113
                    bindStandardScalar(node_opcua_constants_1.VariableIds.ModellingRule_Optional_NamingRule, node_opcua_variant_1.DataType.UInt16, () => {
                        return namingRuleType.Optional ? namingRuleType.Optional.value : 0;
                    });
                    // i=114
                    bindStandardScalar(node_opcua_constants_1.VariableIds.ModellingRule_ExposesItsArray_NamingRule, node_opcua_variant_1.DataType.UInt16, () => {
                        return namingRuleType.ExposesItsArray ? namingRuleType.ExposesItsArray.value : 0;
                    });
                    bindStandardScalar(node_opcua_constants_1.VariableIds.ModellingRule_MandatoryShared_NamingRule, node_opcua_variant_1.DataType.UInt16, () => {
                        return namingRuleType.MandatoryShared ? namingRuleType.MandatoryShared.value : 0;
                    });
                }
            }
            bindExtraStuff();
            engine.__internal_bindMethod(node_opcua_nodeid_1.makeNodeId(node_opcua_constants_1.MethodIds.Server_GetMonitoredItems), getMonitoredItemsId.bind(engine));
            // fix getMonitoredItems.outputArguments arrayDimensions
            (function fixGetMonitoredItemArgs() {
                const objects = engine.addressSpace.rootFolder.objects;
                if (!objects || !objects.server || !objects.server.getMonitoredItems) {
                    return;
                }
                const outputArguments = objects.server.getMonitoredItems.outputArguments;
                const dataValue = outputArguments.readValue();
                node_opcua_assert_1.assert(dataValue.value.value[0].arrayDimensions.length === 1
                    && dataValue.value.value[0].arrayDimensions[0] === 0);
                node_opcua_assert_1.assert(dataValue.value.value[1].arrayDimensions.length === 1
                    && dataValue.value.value[1].arrayDimensions[0] === 0);
            })();
            function prepareServerDiagnostics() {
                const addressSpace1 = engine.addressSpace;
                if (!addressSpace1.rootFolder.objects) {
                    return;
                }
                const server = addressSpace1.rootFolder.objects.server;
                if (!server) {
                    return;
                }
                // create SessionsDiagnosticsSummary
                const serverDiagnostics = server.getComponentByName("ServerDiagnostics");
                if (!serverDiagnostics) {
                    return;
                }
                const subscriptionDiagnosticsArray = serverDiagnostics.getComponentByName("SubscriptionDiagnosticsArray");
                node_opcua_assert_1.assert(subscriptionDiagnosticsArray.nodeClass === node_opcua_data_model_1.NodeClass.Variable);
                node_opcua_address_space_1.bindExtObjArrayNode(subscriptionDiagnosticsArray, "SubscriptionDiagnosticsType", "subscriptionId");
                const sessionsDiagnosticsSummary = serverDiagnostics.getComponentByName("SessionsDiagnosticsSummary");
                const sessionDiagnosticsArray = sessionsDiagnosticsSummary.getComponentByName("SessionDiagnosticsArray");
                node_opcua_assert_1.assert(sessionDiagnosticsArray.nodeClass === node_opcua_data_model_1.NodeClass.Variable);
                node_opcua_address_space_1.bindExtObjArrayNode(sessionDiagnosticsArray, "SessionDiagnosticsVariableType", "sessionId");
                const varType = addressSpace.findVariableType("SessionSecurityDiagnosticsType");
                if (!varType) {
                    console.log("Warning cannot find SessionSecurityDiagnosticsType variable Type");
                }
                else {
                    const sessionSecurityDiagnosticsArray = sessionsDiagnosticsSummary.getComponentByName("SessionSecurityDiagnosticsArray");
                    node_opcua_assert_1.assert(sessionSecurityDiagnosticsArray.nodeClass === node_opcua_data_model_1.NodeClass.Variable);
                    node_opcua_address_space_1.bindExtObjArrayNode(sessionSecurityDiagnosticsArray, "SessionSecurityDiagnosticsType", "sessionId");
                    node_opcua_address_space_1.ensureObjectIsSecure(sessionSecurityDiagnosticsArray);
                }
            }
            prepareServerDiagnostics();
            engine.status = "initialized";
            setImmediate(callback);
        });
    }
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
    browseSingleNode(nodeId, browseDescription, context) {
        const engine = this;
        const addressSpace = engine.addressSpace;
        return addressSpace.browseSingleNode(nodeId, browseDescription, context);
    }
    /**
     *
     */
    browse(nodesToBrowse, context) {
        const engine = this;
        node_opcua_assert_1.assert(_.isArray(nodesToBrowse));
        const results = [];
        for (const browseDescription of nodesToBrowse) {
            const nodeId = node_opcua_nodeid_1.resolveNodeId(browseDescription.nodeId);
            const r = engine.browseSingleNode(nodeId, browseDescription, context);
            results.push(r);
        }
        return results;
    }
    /**
     *
     * @method readSingleNode
     * @param context
     * @param nodeId
     * @param attributeId
     * @param [timestampsToReturn=TimestampsToReturn.Neither]
     * @return DataValue
     */
    readSingleNode(context, nodeId, attributeId, timestampsToReturn) {
        const engine = this;
        return engine._readSingleNode(context, {
            attributeId,
            nodeId
        }, timestampsToReturn);
    }
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
    read(context, readRequest) {
        node_opcua_assert_1.assert(context instanceof node_opcua_address_space_1.SessionContext);
        node_opcua_assert_1.assert(readRequest instanceof node_opcua_service_read_1.ReadRequest);
        node_opcua_assert_1.assert(readRequest.maxAge >= 0);
        const engine = this;
        const timestampsToReturn = readRequest.timestampsToReturn;
        const nodesToRead = readRequest.nodesToRead || [];
        node_opcua_assert_1.assert(_.isArray(nodesToRead));
        context.currentTime = new Date();
        const dataValues = [];
        for (let i = 0; i < nodesToRead.length; i++) {
            const readValueId = nodesToRead[i];
            dataValues[i] = engine._readSingleNode(context, readValueId, timestampsToReturn);
        }
        return dataValues;
    }
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
    writeSingleNode(context, writeValue, callback) {
        const engine = this;
        node_opcua_assert_1.assert(context instanceof node_opcua_address_space_1.SessionContext);
        node_opcua_assert_1.assert(_.isFunction(callback));
        node_opcua_assert_1.assert(writeValue.schema.name === "WriteValue");
        node_opcua_assert_1.assert(writeValue.value instanceof node_opcua_data_value_1.DataValue);
        if (writeValue.value.value === null) {
            return callback(null, node_opcua_status_code_1.StatusCodes.BadTypeMismatch);
        }
        node_opcua_assert_1.assert(writeValue.value.value instanceof node_opcua_variant_1.Variant);
        const nodeId = writeValue.nodeId;
        const obj = engine.__findObject(nodeId);
        if (!obj) {
            return callback(null, node_opcua_status_code_1.StatusCodes.BadNodeIdUnknown);
        }
        else {
            obj.writeAttribute(context, writeValue, callback);
        }
    }
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
    write(context, nodesToWrite, callback) {
        node_opcua_assert_1.assert(context instanceof node_opcua_address_space_1.SessionContext);
        node_opcua_assert_1.assert(_.isFunction(callback));
        const engine = this;
        context.currentTime = new Date();
        let l_extraDataTypeManager;
        function performWrite(writeValue, inner_callback) {
            node_opcua_assert_1.assert(writeValue instanceof node_opcua_types_1.WriteValue);
            const ignored_promise = node_opcua_client_dynamic_extension_object_1.resolveDynamicExtensionObject(writeValue.value.value, l_extraDataTypeManager);
            engine.writeSingleNode(context, writeValue, inner_callback);
        }
        node_opcua_address_space_1.ensureDatatypeExtractedWithCallback(this.addressSpace, (err2, extraDataTypeManager) => {
            l_extraDataTypeManager = extraDataTypeManager;
            // tslint:disable:array-type
            async.map(nodesToWrite, performWrite, (err, statusCodes) => {
                node_opcua_assert_1.assert(_.isArray(statusCodes));
                callback(err, statusCodes);
            });
        });
    }
    /**
     *
     */
    historyReadSingleNode(context, nodeId, attributeId, historyReadDetails, timestampsToReturn, callback) {
        if (timestampsToReturn === node_opcua_service_read_1.TimestampsToReturn.Invalid) {
            callback(null, new node_opcua_service_history_1.HistoryReadResult({
                statusCode: node_opcua_status_code_1.StatusCodes.BadTimestampsToReturnInvalid
            }));
            return;
        }
        node_opcua_assert_1.assert(context instanceof node_opcua_address_space_1.SessionContext);
        this._historyReadSingleNode(context, new node_opcua_service_history_1.HistoryReadValueId({
            nodeId
        }), historyReadDetails, timestampsToReturn, callback);
    }
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
    historyRead(context, historyReadRequest, callback) {
        node_opcua_assert_1.assert(context instanceof node_opcua_address_space_1.SessionContext);
        node_opcua_assert_1.assert(historyReadRequest instanceof node_opcua_service_history_1.HistoryReadRequest);
        node_opcua_assert_1.assert(_.isFunction(callback));
        const engine = this;
        const timestampsToReturn = historyReadRequest.timestampsToReturn;
        const historyReadDetails = historyReadRequest.historyReadDetails;
        const nodesToRead = historyReadRequest.nodesToRead || [];
        node_opcua_assert_1.assert(historyReadDetails instanceof node_opcua_service_history_1.HistoryReadDetails);
        node_opcua_assert_1.assert(_.isArray(nodesToRead));
        const historyData = [];
        async.eachSeries(nodesToRead, (historyReadValueId, cbNode) => {
            engine._historyReadSingleNode(context, historyReadValueId, historyReadDetails, timestampsToReturn, (err, result) => {
                if (err && !result) {
                    result = new node_opcua_service_history_1.HistoryReadResult({ statusCode: node_opcua_status_code_1.StatusCodes.BadInternalError });
                }
                historyData.push(result);
                async.setImmediate(cbNode);
                // it's not guaranteed that the historical read process is really asynchronous
            });
        }, (err) => {
            node_opcua_assert_1.assert(historyData.length === nodesToRead.length);
            callback(err || null, historyData);
        });
    }
    getOldestUnactivatedSession() {
        const tmp = _.filter(this._sessions, (session1) => {
            return session1.status === "new";
        });
        if (tmp.length === 0) {
            return null;
        }
        let session = tmp[0];
        for (let i = 1; i < tmp.length; i++) {
            const c = tmp[i];
            if (session.creationDate.getTime() < c.creationDate.getTime()) {
                session = c;
            }
        }
        return session;
    }
    /**
     * create a new server session object.
     * @class ServerEngine
     * @method createSession
     * @param  [options] {Object}
     * @param  [options.sessionTimeout = 1000] {Number} sessionTimeout
     * @param  [options.clientDescription] {ApplicationDescription}
     * @return {ServerSession}
     */
    createSession(options) {
        options = options || {};
        debugLog("createSession : increasing serverDiagnosticsSummary cumulatedSessionCount/currentSessionCount ");
        this.serverDiagnosticsSummary.cumulatedSessionCount += 1;
        this.serverDiagnosticsSummary.currentSessionCount += 1;
        this.clientDescription = options.clientDescription || new node_opcua_service_endpoints_1.ApplicationDescription({});
        const sessionTimeout = options.sessionTimeout || 1000;
        node_opcua_assert_1.assert(_.isNumber(sessionTimeout));
        const session = new server_session_1.ServerSession(this, sessionTimeout);
        const key = session.authenticationToken.toString();
        this._sessions[key] = session;
        // see spec OPC Unified Architecture,  Part 2 page 26 Release 1.02
        // TODO : When a Session is created, the Server adds an entry for the Client
        //        in its SessionDiagnosticsArray Variable
        const engine = this;
        session.on("new_subscription", (subscription) => {
            engine.serverDiagnosticsSummary.cumulatedSubscriptionCount += 1;
            // add the subscription diagnostics in our subscriptions diagnostics array
        });
        session.on("subscription_terminated", (subscription) => {
            // remove the subscription diagnostics in our subscriptions diagnostics array
        });
        // OPC Unified Architecture, Part 4 23 Release 1.03
        // Sessions are terminated by the Server automatically if the Client fails to issue a Service request on the
        // Session within the timeout period negotiated by the Server in the CreateSession Service response.
        // This protects the Server against Client failures and against situations where a failed underlying
        // connection cannot be re-established. Clients shall be prepared to submit requests in a timely manner
        // prevent the Session from closing automatically. Clients may explicitly terminate sessions using the
        // CloseSession Service.
        session.on("timeout", () => {
            // the session hasn't been active for a while , probably because the client has disconnected abruptly
            // it is now time to close the session completely
            this.serverDiagnosticsSummary.sessionTimeoutCount += 1;
            session.sessionName = session.sessionName || "";
            console.log(chalk_1.default.cyan("Server: closing SESSION "), session.status, chalk_1.default.yellow(session.sessionName), chalk_1.default.cyan(" because of timeout = "), session.sessionTimeout, chalk_1.default.cyan(" has expired without a keep alive"));
            const channel = session.channel;
            if (channel) {
                console.log(chalk_1.default.bgCyan("channel = "), channel.remoteAddress, " port = ", channel.remotePort);
            }
            // If a Server terminates a Session for any other reason, Subscriptions  associated with the Session,
            // are not deleted. => deleteSubscription= false
            this.closeSession(session.authenticationToken, /*deleteSubscription=*/ false, /* reason =*/ "Timeout");
        });
        return session;
    }
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
    closeSession(authenticationToken, deleteSubscriptions, reason) {
        const engine = this;
        reason = reason || "CloseSession";
        node_opcua_assert_1.assert(_.isString(reason));
        node_opcua_assert_1.assert(reason === "Timeout" || reason === "Terminated" || reason === "CloseSession" || reason === "Forcing");
        debugLog("ServerEngine.closeSession ", authenticationToken.toString(), deleteSubscriptions);
        const session = engine.getSession(authenticationToken);
        if (!session) {
            throw new Error("Internal Error");
        }
        if (!deleteSubscriptions) {
            // Live Subscriptions will not be deleted, but transferred to the orphanPublishEngine
            // until they time out or until a other session transfer them back to it.
            if (!engine._orphanPublishEngine) {
                engine._orphanPublishEngine = new server_publish_engine_for_orphan_subscriptions_1.ServerSidePublishEngineForOrphanSubscription({ maxPublishRequestInQueue: 0 });
            }
            debugLog("transferring remaining live subscription to orphanPublishEngine !");
            server_publish_engine_1.ServerSidePublishEngine.transferSubscriptionsToOrphan(session.publishEngine, engine._orphanPublishEngine);
        }
        session.close(deleteSubscriptions, reason);
        node_opcua_assert_1.assert(session.status === "closed");
        debugLog(" engine.serverDiagnosticsSummary.currentSessionCount -= 1;");
        engine.serverDiagnosticsSummary.currentSessionCount -= 1;
        // xx //TODO make sure _closedSessions gets cleaned at some point
        // xx self._closedSessions[key] = session;
        // remove sessionDiagnostics from server.ServerDiagnostics.SessionsDiagnosticsSummary.SessionDiagnosticsSummary
        delete engine._sessions[authenticationToken.toString()];
        session.dispose();
    }
    findSubscription(subscriptionId) {
        const engine = this;
        const subscriptions = [];
        _.map(engine._sessions, (session) => {
            if (subscriptions.length) {
                return;
            }
            const subscription = session.publishEngine.getSubscriptionById(subscriptionId);
            if (subscription) {
                // xx console.log("foundSubscription  ", subscriptionId, " in session", session.sessionName);
                subscriptions.push(subscription);
            }
        });
        if (subscriptions.length) {
            node_opcua_assert_1.assert(subscriptions.length === 1);
            return subscriptions[0];
        }
        return engine.findOrphanSubscription(subscriptionId);
    }
    findOrphanSubscription(subscriptionId) {
        if (!this._orphanPublishEngine) {
            return null;
        }
        return this._orphanPublishEngine.getSubscriptionById(subscriptionId);
    }
    deleteOrphanSubscription(subscription) {
        if (!this._orphanPublishEngine) {
            return node_opcua_status_code_1.StatusCodes.BadInternalError;
        }
        node_opcua_assert_1.assert(this.findSubscription(subscription.id));
        const c = this._orphanPublishEngine.subscriptionCount;
        subscription.terminate();
        subscription.dispose();
        node_opcua_assert_1.assert(this._orphanPublishEngine.subscriptionCount === c - 1);
        return node_opcua_status_code_1.StatusCodes.Good;
    }
    /**
     * @method transferSubscription
     * @param session           {ServerSession}  - the new session that will own the subscription
     * @param subscriptionId    {IntegerId}      - the subscription Id to transfer
     * @param sendInitialValues {Boolean}        - true if initial values will be resent.
     * @return                  {TransferResult}
     */
    transferSubscription(session, subscriptionId, sendInitialValues) {
        node_opcua_assert_1.assert(session instanceof server_session_1.ServerSession);
        node_opcua_assert_1.assert(_.isNumber(subscriptionId));
        node_opcua_assert_1.assert(_.isBoolean(sendInitialValues));
        if (subscriptionId <= 0) {
            return new node_opcua_service_subscription_1.TransferResult({ statusCode: node_opcua_status_code_1.StatusCodes.BadSubscriptionIdInvalid });
        }
        const subscription = this.findSubscription(subscriptionId);
        if (!subscription) {
            return new node_opcua_service_subscription_1.TransferResult({ statusCode: node_opcua_status_code_1.StatusCodes.BadSubscriptionIdInvalid });
        }
        if (!subscription.$session) {
            return new node_opcua_service_subscription_1.TransferResult({ statusCode: node_opcua_status_code_1.StatusCodes.BadInternalError });
        }
        // now check that new session has sufficient right
        // if (session.authenticationToken.toString() !== subscription.authenticationToken.toString()) {
        //     console.log("ServerEngine#transferSubscription => BadUserAccessDenied");
        //     return new TransferResult({ statusCode: StatusCodes.BadUserAccessDenied });
        // }
        if (session.publishEngine === subscription.publishEngine) {
            // subscription is already in this session !!
            return new node_opcua_service_subscription_1.TransferResult({ statusCode: node_opcua_status_code_1.StatusCodes.BadNothingToDo });
        }
        if (session === subscription.$session) {
            // subscription is already in this session !!
            return new node_opcua_service_subscription_1.TransferResult({ statusCode: node_opcua_status_code_1.StatusCodes.BadNothingToDo });
        }
        const nbSubscriptionBefore = session.publishEngine.subscriptionCount;
        subscription.$session._unexposeSubscriptionDiagnostics(subscription);
        server_publish_engine_1.ServerSidePublishEngine.transferSubscription(subscription, session.publishEngine, sendInitialValues);
        subscription.$session = session;
        session._exposeSubscriptionDiagnostics(subscription);
        node_opcua_assert_1.assert(subscription.publishEngine === session.publishEngine);
        node_opcua_assert_1.assert(session.publishEngine.subscriptionCount === nbSubscriptionBefore + 1);
        // TODO: If the Server transfers the Subscription to the new Session, the Server shall issue a
        //       StatusChangeNotification notificationMessage with the status code Good_SubscriptionTransferred
        //       to the old Session.
        const result = new node_opcua_service_subscription_1.TransferResult({
            availableSequenceNumbers: subscription.getAvailableSequenceNumbers(),
            statusCode: node_opcua_status_code_1.StatusCodes.Good
        });
        // istanbul ignore next
        if (doDebug) {
            debugLog("TransferResult", result.toString());
        }
        return result;
    }
    /**
     * retrieve a session by its authenticationToken.
     *
     * @method getSession
     * @param authenticationToken
     * @param activeOnly
     * @return {ServerSession}
     */
    getSession(authenticationToken, activeOnly) {
        const engine = this;
        if (!authenticationToken ||
            (authenticationToken.identifierType &&
                (authenticationToken.identifierType !== node_opcua_nodeid_1.NodeIdType.BYTESTRING))) {
            return null; // wrong type !
        }
        const key = authenticationToken.toString();
        let session = engine._sessions[key];
        if (!activeOnly && !session) {
            session = engine._closedSessions[key];
        }
        return session;
    }
    /**
     */
    browsePath(browsePath) {
        return this.addressSpace.browsePath(browsePath);
    }
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
    refreshValues(nodesToRefresh, callback) {
        node_opcua_assert_1.assert(callback instanceof Function);
        const engine = this;
        const objs = {};
        for (const nodeToRefresh of nodesToRefresh) {
            // only consider node  for which the caller wants to read the Value attribute
            // assuming that Value is requested if attributeId is missing,
            if (nodeToRefresh.attributeId && nodeToRefresh.attributeId !== node_opcua_data_model_1.AttributeIds.Value) {
                continue;
            }
            // ... and that are valid object and instances of Variables ...
            const obj = engine.addressSpace.findNode(nodeToRefresh.nodeId);
            if (!obj || !(obj.nodeClass === node_opcua_data_model_1.NodeClass.Variable)) {
                continue;
            }
            // ... and that have been declared as asynchronously updating
            if (!_.isFunction(obj.refreshFunc)) {
                continue;
            }
            const key = obj.nodeId.toString();
            if (objs[key]) {
                continue;
            }
            objs[key] = obj;
        }
        if (Object.keys(objs).length === 0) {
            // nothing to do
            return callback(null, []);
        }
        // perform all asyncRefresh in parallel
        async.map(objs, (obj, inner_callback) => {
            if (obj.nodeClass !== node_opcua_data_model_1.NodeClass.Variable) {
                inner_callback(null, new node_opcua_data_value_1.DataValue({
                    statusCode: node_opcua_status_code_1.StatusCodes.BadNodeClassInvalid
                }));
                return;
            }
            obj.asyncRefresh(inner_callback);
        }, (err, arrResult) => {
            callback(err || null, arrResult);
        });
    }
    _exposeSubscriptionDiagnostics(subscription) {
        debugLog("ServerEngine#_exposeSubscriptionDiagnostics");
        const subscriptionDiagnosticsArray = this._getServerSubscriptionDiagnosticsArray();
        const subscriptionDiagnostics = subscription.subscriptionDiagnostics;
        node_opcua_assert_1.assert(subscriptionDiagnostics.$subscription === subscription);
        node_opcua_assert_1.assert(subscriptionDiagnostics instanceof node_opcua_common_1.SubscriptionDiagnosticsDataType);
        if (subscriptionDiagnostics && subscriptionDiagnosticsArray) {
            node_opcua_address_space_1.addElement(subscriptionDiagnostics, subscriptionDiagnosticsArray);
        }
    }
    _unexposeSubscriptionDiagnostics(subscription) {
        const subscriptionDiagnosticsArray = this._getServerSubscriptionDiagnosticsArray();
        const subscriptionDiagnostics = subscription.subscriptionDiagnostics;
        node_opcua_assert_1.assert(subscriptionDiagnostics instanceof node_opcua_common_1.SubscriptionDiagnosticsDataType);
        if (subscriptionDiagnostics && subscriptionDiagnosticsArray) {
            const node = subscriptionDiagnosticsArray[subscription.id];
            node_opcua_address_space_1.removeElement(subscriptionDiagnosticsArray, subscriptionDiagnostics);
            node_opcua_assert_1.assert(!subscriptionDiagnosticsArray[subscription.id], " subscription node must have been removed from subscriptionDiagnosticsArray");
        }
        debugLog("ServerEngine#_unexposeSubscriptionDiagnostics");
    }
    /**
     * create a new subscription
     * @return {Subscription}
     */
    _createSubscriptionOnSession(session, request) {
        node_opcua_assert_1.assert(request.hasOwnProperty("requestedPublishingInterval")); // Duration
        node_opcua_assert_1.assert(request.hasOwnProperty("requestedLifetimeCount")); // Counter
        node_opcua_assert_1.assert(request.hasOwnProperty("requestedMaxKeepAliveCount")); // Counter
        node_opcua_assert_1.assert(request.hasOwnProperty("maxNotificationsPerPublish")); // Counter
        node_opcua_assert_1.assert(request.hasOwnProperty("publishingEnabled")); // Boolean
        node_opcua_assert_1.assert(request.hasOwnProperty("priority")); // Byte
        const subscription = new server_subscription_1.Subscription({
            id: _get_next_subscriptionId(),
            lifeTimeCount: request.requestedLifetimeCount,
            maxKeepAliveCount: request.requestedMaxKeepAliveCount,
            maxNotificationsPerPublish: request.maxNotificationsPerPublish,
            priority: request.priority || 0,
            publishEngine: session.publishEngine,
            publishingEnabled: request.publishingEnabled,
            publishingInterval: request.requestedPublishingInterval,
            // -------------------
            sessionId: node_opcua_nodeid_1.NodeId.nullNodeId
        });
        // add subscriptionDiagnostics
        this._exposeSubscriptionDiagnostics(subscription);
        node_opcua_assert_1.assert(subscription.publishEngine === session.publishEngine);
        session.publishEngine.add_subscription(subscription);
        const engine = this;
        subscription.once("terminated", function () {
            engine._unexposeSubscriptionDiagnostics(this);
        });
        return subscription;
    }
    __findObject(nodeId) {
        const engine = this;
        nodeId = node_opcua_nodeid_1.resolveNodeId(nodeId);
        node_opcua_assert_1.assert(nodeId instanceof node_opcua_nodeid_1.NodeId);
        return engine.addressSpace.findNode(nodeId);
    }
    _readSingleNode(context, nodeToRead, timestampsToReturn) {
        node_opcua_assert_1.assert(context instanceof node_opcua_address_space_1.SessionContext);
        const engine = this;
        const nodeId = nodeToRead.nodeId;
        const attributeId = nodeToRead.attributeId;
        const indexRange = nodeToRead.indexRange;
        const dataEncoding = nodeToRead.dataEncoding;
        if (timestampsToReturn === node_opcua_service_read_1.TimestampsToReturn.Invalid) {
            return new node_opcua_data_value_1.DataValue({ statusCode: node_opcua_status_code_1.StatusCodes.BadTimestampsToReturnInvalid });
        }
        timestampsToReturn = (timestampsToReturn !== undefined) ? timestampsToReturn : node_opcua_service_read_1.TimestampsToReturn.Neither;
        const obj = engine.__findObject(nodeId);
        let dataValue;
        if (!obj) {
            // may be return BadNodeIdUnknown in dataValue instead ?
            // Object Not Found
            return new node_opcua_data_value_1.DataValue({ statusCode: node_opcua_status_code_1.StatusCodes.BadNodeIdUnknown });
        }
        else {
            // check access
            //    BadUserAccessDenied
            //    BadNotReadable
            //    invalid attributes : BadNodeAttributesInvalid
            //    invalid range      : BadIndexRangeInvalid
            try {
                dataValue = obj.readAttribute(context, attributeId, indexRange, dataEncoding);
                node_opcua_assert_1.assert(dataValue.statusCode instanceof node_opcua_status_code_1.StatusCode);
                if (!dataValue.isValid()) {
                    console.log("Invalid value for node ", obj.nodeId.toString(), obj.browseName.toString());
                }
            }
            catch (err) {
                console.log(" Internal error reading  NodeId       ", obj.nodeId.toString());
                console.log("                         AttributeId  ", attributeId.toString());
                console.log("                        ", err.message);
                console.log("                        ", err.stack);
                return new node_opcua_data_value_1.DataValue({ statusCode: node_opcua_status_code_1.StatusCodes.BadInternalError });
            }
            // Xx console.log(dataValue.toString());
            dataValue = node_opcua_data_value_1.apply_timestamps(dataValue, timestampsToReturn, attributeId);
            return dataValue;
        }
    }
    _historyReadSingleNode(context, nodeToRead, historyReadDetails, timestampsToReturn, callback) {
        node_opcua_assert_1.assert(context instanceof node_opcua_address_space_1.SessionContext);
        node_opcua_assert_1.assert(callback instanceof Function);
        const nodeId = nodeToRead.nodeId;
        const indexRange = nodeToRead.indexRange;
        const dataEncoding = nodeToRead.dataEncoding;
        const continuationPoint = nodeToRead.continuationPoint;
        timestampsToReturn = (_.isObject(timestampsToReturn)) ? timestampsToReturn : node_opcua_service_read_1.TimestampsToReturn.Neither;
        const obj = this.__findObject(nodeId);
        if (!obj) {
            // may be return BadNodeIdUnknown in dataValue instead ?
            // Object Not Found
            callback(null, new node_opcua_service_history_1.HistoryReadResult({ statusCode: node_opcua_status_code_1.StatusCodes.BadNodeIdUnknown }));
            return;
        }
        else {
            if (!obj.historyRead) {
                // note : Object and View may also support historyRead to provide Event historical data
                //        todo implement historyRead for Object and View
                const msg = " this node doesn't provide historyRead! probably not a UAVariable\n "
                    + obj.nodeId.toString() + " " + obj.browseName.toString() + "\n"
                    + "with " + nodeToRead.toString() + "\n"
                    + "HistoryReadDetails " + historyReadDetails.toString();
                if (doDebug) {
                    console.log(chalk_1.default.cyan("ServerEngine#_historyReadSingleNode "), chalk_1.default.white.bold(msg));
                }
                const err = new Error(msg);
                // object has no historyRead method
                setImmediate(callback.bind(null, err));
                return;
            }
            // check access
            //    BadUserAccessDenied
            //    BadNotReadable
            //    invalid attributes : BadNodeAttributesInvalid
            //    invalid range      : BadIndexRangeInvalid
            obj.historyRead(context, historyReadDetails, indexRange, dataEncoding, continuationPoint, (err, result) => {
                if (err || !result) {
                    return callback(err);
                }
                node_opcua_assert_1.assert(result.statusCode instanceof node_opcua_status_code_1.StatusCode);
                node_opcua_assert_1.assert(result.isValid());
                // result = apply_timestamps(result, timestampsToReturn, attributeId);
                callback(err, result);
            });
        }
    }
    /**
     */
    __internal_bindMethod(nodeId, func) {
        const engine = this;
        node_opcua_assert_1.assert(_.isFunction(func));
        node_opcua_assert_1.assert(nodeId instanceof node_opcua_nodeid_1.NodeId);
        const methodNode = engine.addressSpace.findNode(nodeId);
        if (!methodNode) {
            return;
        }
        if (methodNode && methodNode.bindMethod) {
            methodNode.bindMethod(func);
        }
        else {
            console.log(chalk_1.default.yellow("WARNING:  cannot bind a method with id ") +
                chalk_1.default.cyan(nodeId.toString()) +
                chalk_1.default.yellow(". please check your nodeset.xml file or add this node programmatically"));
            console.log(node_opcua_debug_1.trace_from_this_projet_only());
        }
    }
    _getServerSubscriptionDiagnosticsArray() {
        if (!this.addressSpace) {
            if (doDebug) {
                console.warn("ServerEngine#_getServerSubscriptionDiagnosticsArray : no addressSpace");
            }
            return null; // no addressSpace
        }
        const subscriptionDiagnosticsType = this.addressSpace.findVariableType("SubscriptionDiagnosticsType");
        if (!subscriptionDiagnosticsType) {
            if (doDebug) {
                console.warn("ServerEngine#_getServerSubscriptionDiagnosticsArray " +
                    ": cannot find SubscriptionDiagnosticsType");
            }
        }
        // SubscriptionDiagnosticsArray = i=2290
        const subscriptionDiagnosticsArray = this.addressSpace.findNode(node_opcua_nodeid_1.makeNodeId(node_opcua_constants_1.VariableIds.Server_ServerDiagnostics_SubscriptionDiagnosticsArray));
        return subscriptionDiagnosticsArray;
    }
}
exports.ServerEngine = ServerEngine;
ServerEngine.registry = new node_opcua_object_registry_1.ObjectRegistry();
//# sourceMappingURL=server_engine.js.map