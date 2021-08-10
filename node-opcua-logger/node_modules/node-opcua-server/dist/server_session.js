"use strict";
/**
 * @module node-opcua-server
 */
// tslint:disable:no-console
Object.defineProperty(exports, "__esModule", { value: true });
const crypto = require("crypto");
const events_1 = require("events");
const _ = require("underscore");
const node_opcua_address_space_1 = require("node-opcua-address-space");
const node_opcua_assert_1 = require("node-opcua-assert");
const node_opcua_basic_types_1 = require("node-opcua-basic-types");
const node_opcua_common_1 = require("node-opcua-common");
const node_opcua_data_model_1 = require("node-opcua-data-model");
const node_opcua_data_model_2 = require("node-opcua-data-model");
const node_opcua_debug_1 = require("node-opcua-debug");
const node_opcua_nodeid_1 = require("node-opcua-nodeid");
const node_opcua_object_registry_1 = require("node-opcua-object-registry");
const node_opcua_status_code_1 = require("node-opcua-status-code");
const node_opcua_utils_1 = require("node-opcua-utils");
const node_opcua_utils_2 = require("node-opcua-utils");
const server_publish_engine_1 = require("./server_publish_engine");
const server_subscription_1 = require("./server_subscription");
const debugLog = node_opcua_debug_1.make_debugLog(__filename);
const doDebug = node_opcua_debug_1.checkDebugFlag(__filename);
const theWatchDog = new node_opcua_utils_1.WatchDog();
const registeredNodeNameSpace = 9999;
function compareSessionId(sessionDiagnostics1, sessionDiagnostics2) {
    return sessionDiagnostics1.sessionId.toString() === sessionDiagnostics2.sessionId.toString();
}
function on_channel_abort() {
    debugLog("ON CHANNEL ABORT ON  SESSION!!!");
    /**
     * @event channel_aborted
     */
    this.emit("channel_aborted");
}
/**
 *
 * A Server session object.
 *
 * **from OPCUA Spec 1.02:**
 *
 * * Sessions are created to be independent of the underlying communications connection. Therefore, if a communication
 *   connection fails, the Session is not immediately affected. The exact mechanism to recover from an underlying
 *   communication connection error depends on the SecureChannel mapping as described in Part 6.
 *
 * * Sessions are terminated by the Server automatically if the Client fails to issue a Service request on the Session
 *   within the timeout period negotiated by the Server in the CreateSession Service response. This protects the Server
 *   against Client failures and against situations where a failed underlying connection cannot be re-established.
 *
 * * Clients shall be prepared to submit requests in a timely manner to prevent the Session from closing automatically.
 *
 * * Clients may explicitly terminate Sessions using the CloseSession Service.
 *
 * * When a Session is terminated, all outstanding requests on the Session are aborted and BadSessionClosed StatusCodes
 *   are returned to the Client. In addition, the Server deletes the entry for the Client from its
 *   SessionDiagnosticsArray Variable and notifies any other Clients who were subscribed to this entry.
 *
 */
class ServerSession extends events_1.EventEmitter {
    constructor(parent, sessionTimeout) {
        super();
        this.__status = "";
        this.sessionName = "";
        this.parent = parent; // SessionEngine
        ServerSession.registry.register(this);
        node_opcua_assert_1.assert(_.isFinite(sessionTimeout));
        node_opcua_assert_1.assert(sessionTimeout >= 0, " sessionTimeout");
        this.sessionTimeout = sessionTimeout;
        const authenticationTokenBuf = crypto.randomBytes(16);
        this.authenticationToken = new node_opcua_nodeid_1.NodeId(node_opcua_nodeid_1.NodeIdType.BYTESTRING, authenticationTokenBuf);
        // the sessionId
        const ownNamespaceIndex = 1; // addressSpace.getOwnNamespace().index;
        this.nodeId = new node_opcua_nodeid_1.NodeId(node_opcua_nodeid_1.NodeIdType.GUID, node_opcua_basic_types_1.randomGuid(), ownNamespaceIndex);
        node_opcua_assert_1.assert(this.authenticationToken instanceof node_opcua_nodeid_1.NodeId);
        node_opcua_assert_1.assert(this.nodeId instanceof node_opcua_nodeid_1.NodeId);
        this._cumulatedSubscriptionCount = 0;
        this.publishEngine = new server_publish_engine_1.ServerSidePublishEngine({
            maxPublishRequestInQueue: ServerSession.maxPublishRequestInQueue
        });
        this.publishEngine.setMaxListeners(100);
        theWatchDog.addSubscriber(this, this.sessionTimeout);
        this.__status = "new";
        /**
         * the continuation point manager for this session
         * @property continuationPointManager
         * @type {ContinuationPointManager}
         */
        this.continuationPointManager = new node_opcua_address_space_1.ContinuationPointManager();
        /**
         * @property creationDate
         * @type {Date}
         */
        this.creationDate = new Date();
        this._registeredNodesCounter = 0;
        this._registeredNodes = {};
        this._registeredNodesInv = {};
    }
    dispose() {
        debugLog("ServerSession#dispose()");
        node_opcua_assert_1.assert(!this.sessionObject, " sessionObject has not been cleared !");
        this.parent = null;
        this.authenticationToken = node_opcua_nodeid_1.NodeId.nullNodeId;
        if (this.publishEngine) {
            this.publishEngine.dispose();
            this.publishEngine = null;
        }
        this._sessionDiagnostics = undefined;
        this._registeredNodesCounter = 0;
        this._registeredNodes = null;
        this._registeredNodesInv = null;
        this.continuationPointManager = null;
        this.removeAllListeners();
        this.__status = "disposed";
        ServerSession.registry.unregister(this);
    }
    get clientConnectionTime() {
        return this.creationDate;
    }
    get clientLastContactTime() {
        return this._watchDogData.lastSeen;
    }
    get status() {
        return this.__status;
    }
    set status(value) {
        if (value === "active") {
            this._createSessionObjectInAddressSpace();
        }
        this.__status = value;
    }
    get addressSpace() {
        return this.parent ? this.parent.addressSpace : null;
    }
    get currentPublishRequestInQueue() {
        return this.publishEngine
            ? this.publishEngine.pendingPublishRequestCount : 0;
    }
    updateClientLastContactTime(currentTime) {
        const session = this;
        if (session._sessionDiagnostics && session._sessionDiagnostics.clientLastContactTime) {
            currentTime = currentTime || new Date();
            // do not record all ticks as this may be overwhelming,
            if (currentTime.getTime() - 250 >= session._sessionDiagnostics.clientLastContactTime.getTime()) {
                session._sessionDiagnostics.clientLastContactTime = currentTime;
            }
        }
    }
    /**
     * @method onClientSeen
     * required for watch dog
     * @param currentTime {DateTime}
     * @private
     */
    onClientSeen(currentTime) {
        this.updateClientLastContactTime(currentTime);
        if (this._sessionDiagnostics) {
            // see https://opcfoundation-onlineapplications.org/mantis/view.php?id=4111
            node_opcua_assert_1.assert(this._sessionDiagnostics.hasOwnProperty("currentMonitoredItemsCount"));
            node_opcua_assert_1.assert(this._sessionDiagnostics.hasOwnProperty("currentSubscriptionsCount"));
            node_opcua_assert_1.assert(this._sessionDiagnostics.hasOwnProperty("currentPublishRequestsInQueue"));
            // note : https://opcfoundation-onlineapplications.org/mantis/view.php?id=4111
            // sessionDiagnostics extension object uses a different spelling
            // here with an S !!!!
            this._sessionDiagnostics.currentMonitoredItemsCount = this.currentMonitoredItemCount;
            this._sessionDiagnostics.currentSubscriptionsCount = this.currentSubscriptionCount;
            this._sessionDiagnostics.currentPublishRequestsInQueue = this.currentPublishRequestInQueue;
        }
    }
    incrementTotalRequestCount() {
        if (this._sessionDiagnostics && this._sessionDiagnostics.totalRequestCount) {
            this._sessionDiagnostics.totalRequestCount.totalCount += 1;
        }
    }
    incrementRequestTotalCounter(counterName) {
        if (this._sessionDiagnostics) {
            const propName = node_opcua_utils_2.lowerFirstLetter(counterName + "Count");
            if (!this._sessionDiagnostics.hasOwnProperty(propName)) {
                console.log(" cannot find", propName);
                // xx return;
            }
            else {
                //   console.log(self._sessionDiagnostics.toString());
                this._sessionDiagnostics[propName].totalCount += 1;
            }
        }
    }
    incrementRequestErrorCounter(counterName) {
        if (this._sessionDiagnostics) {
            const propName = node_opcua_utils_2.lowerFirstLetter(counterName + "Count");
            if (!this._sessionDiagnostics.hasOwnProperty(propName)) {
                console.log(" cannot find", propName);
                // xx  return;
            }
            else {
                this._sessionDiagnostics[propName].errorCount += 1;
            }
        }
    }
    /**
     * returns rootFolder.objects.server.serverDiagnostics.sessionsDiagnosticsSummary.sessionDiagnosticsArray
     */
    getSessionDiagnosticsArray() {
        const server = this.addressSpace.rootFolder.objects.server;
        return server.serverDiagnostics.sessionsDiagnosticsSummary.sessionDiagnosticsArray;
    }
    /**
     * returns rootFolder.objects.server.serverDiagnostics.sessionsDiagnosticsSummary.sessionSecurityDiagnosticsArray
     */
    getSessionSecurityDiagnosticsArray() {
        const server = this.addressSpace.rootFolder.objects.server;
        return server.serverDiagnostics.sessionsDiagnosticsSummary.sessionSecurityDiagnosticsArray;
    }
    /**
     * number of active subscriptions
     */
    get currentSubscriptionCount() {
        return this.publishEngine ? this.publishEngine.subscriptionCount : 0;
    }
    /**
     * number of subscriptions ever created since this object is live
     */
    get cumulatedSubscriptionCount() {
        return this._cumulatedSubscriptionCount;
    }
    /**
     * number of monitored items
     */
    get currentMonitoredItemCount() {
        const self = this;
        return self.publishEngine ? self.publishEngine.currentMonitoredItemCount : 0;
    }
    /**
     * retrieve an existing subscription by subscriptionId
     * @method getSubscription
     * @param subscriptionId {Number}
     * @return {Subscription}
     */
    getSubscription(subscriptionId) {
        const subscription = this.publishEngine.getSubscriptionById(subscriptionId);
        if (subscription && subscription.state === server_subscription_1.SubscriptionState.CLOSED) {
            // subscription is CLOSED but has not been notified yet
            // it should be considered as excluded
            return null;
        }
        node_opcua_assert_1.assert(!subscription || subscription.state !== server_subscription_1.SubscriptionState.CLOSED, "CLOSED subscription shall not be managed by publish engine anymore");
        return subscription;
    }
    /**
     * @method deleteSubscription
     * @param subscriptionId {Number}
     * @return {StatusCode}
     */
    deleteSubscription(subscriptionId) {
        const session = this;
        const subscription = session.getSubscription(subscriptionId);
        if (!subscription) {
            return node_opcua_status_code_1.StatusCodes.BadSubscriptionIdInvalid;
        }
        // xx this.publishEngine.remove_subscription(subscription);
        subscription.terminate();
        if (session.currentSubscriptionCount === 0) {
            const local_publishEngine = session.publishEngine;
            local_publishEngine.cancelPendingPublishRequest();
        }
        return node_opcua_status_code_1.StatusCodes.Good;
    }
    /**
     * close a ServerSession, this will also delete the subscriptions if the flag is set.
     *
     * Spec extract:
     *
     * If a Client invokes the CloseSession Service then all Subscriptions associated with the Session are also deleted
     * if the deleteSubscriptions flag is set to TRUE. If a Server terminates a Session for any other reason,
     * Subscriptions associated with the Session, are not deleted. Each Subscription has its own lifetime to protect
     * against data loss in the case of a Session termination. In these cases, the Subscription can be reassigned to
     * another Client before its lifetime expires.
     *
     * @method close
     * @param deleteSubscriptions : should we delete subscription ?
     * @param [reason = "CloseSession"] the reason for closing the session
     *         (shall be "Timeout", "Terminated" or "CloseSession")
     *
     */
    close(deleteSubscriptions, reason) {
        debugLog(" closing session deleteSubscriptions = ", deleteSubscriptions);
        if (this.publishEngine) {
            this.publishEngine.onSessionClose();
        }
        theWatchDog.removeSubscriber(this);
        // ---------------  delete associated subscriptions ---------------------
        if (!deleteSubscriptions && this.currentSubscriptionCount !== 0) {
            // I don't know what to do yet if deleteSubscriptions is false
            console.log("TO DO : Closing session without deleting subscription not yet implemented");
            // to do: Put subscriptions in safe place for future transfer if any
        }
        this._deleteSubscriptions();
        node_opcua_assert_1.assert(this.currentSubscriptionCount === 0);
        // Post-Conditions
        node_opcua_assert_1.assert(this.currentSubscriptionCount === 0);
        this.status = "closed";
        /**
         * @event session_closed
         * @param deleteSubscriptions {Boolean}
         * @param reason {String}
         */
        this.emit("session_closed", this, deleteSubscriptions, reason);
        // ---------------- shut down publish engine
        if (this.publishEngine) {
            // remove subscription
            this.publishEngine.shutdown();
            node_opcua_assert_1.assert(this.publishEngine.subscriptionCount === 0);
            this.publishEngine.dispose();
            this.publishEngine = null;
        }
        this._removeSessionObjectFromAddressSpace();
        node_opcua_assert_1.assert(!this.sessionDiagnostics, "ServerSession#_removeSessionObjectFromAddressSpace must be called");
        node_opcua_assert_1.assert(!this.sessionObject, "ServerSession#_removeSessionObjectFromAddressSpace must be called");
    }
    registerNode(nodeId) {
        node_opcua_assert_1.assert(nodeId instanceof node_opcua_nodeid_1.NodeId);
        const session = this;
        if (nodeId.namespace === 0 && nodeId.identifierType === node_opcua_nodeid_1.NodeIdType.NUMERIC) {
            return nodeId;
        }
        const key = nodeId.toString();
        const registeredNode = session._registeredNodes[key];
        if (registeredNode) {
            // already registered
            return registeredNode;
        }
        const node = session.addressSpace.findNode(nodeId);
        if (!node) {
            return nodeId;
        }
        session._registeredNodesCounter += 1;
        const aliasNodeId = node_opcua_nodeid_1.makeNodeId(session._registeredNodesCounter, registeredNodeNameSpace);
        session._registeredNodes[key] = aliasNodeId;
        session._registeredNodesInv[aliasNodeId.toString()] = node;
        return aliasNodeId;
    }
    unRegisterNode(aliasNodeId) {
        node_opcua_assert_1.assert(aliasNodeId instanceof node_opcua_nodeid_1.NodeId);
        if (aliasNodeId.namespace !== registeredNodeNameSpace) {
            return; // not a registered Node
        }
        const session = this;
        const node = session._registeredNodesInv[aliasNodeId.toString()];
        if (!node) {
            return;
        }
        session._registeredNodesInv[aliasNodeId.toString()] = null;
        session._registeredNodes[node.nodeId.toString()] = null;
    }
    resolveRegisteredNode(aliasNodeId) {
        if (aliasNodeId.namespace !== registeredNodeNameSpace) {
            return aliasNodeId; // not a registered Node
        }
        const node = this._registeredNodesInv[aliasNodeId.toString()];
        if (!node) {
            return aliasNodeId;
        }
        return node.nodeId;
    }
    /**
     * true if the underlying channel has been closed or aborted...
     */
    get aborted() {
        if (!this.channel) {
            return true;
        }
        return this.channel.aborted;
    }
    createSubscription(parameters) {
        const subscription = this.parent._createSubscriptionOnSession(this, parameters);
        this.assignSubscription(subscription);
        node_opcua_assert_1.assert(subscription.$session === this);
        node_opcua_assert_1.assert(subscription.sessionId instanceof node_opcua_nodeid_1.NodeId);
        node_opcua_assert_1.assert(node_opcua_nodeid_1.sameNodeId(subscription.sessionId, this.nodeId));
        return subscription;
    }
    _attach_channel(channel) {
        node_opcua_assert_1.assert(this.nonce && this.nonce instanceof Buffer);
        this.channel = channel;
        this.channelId = channel.channelId;
        const key = this.authenticationToken.toString();
        node_opcua_assert_1.assert(!channel.sessionTokens.hasOwnProperty(key), "channel has already a session");
        channel.sessionTokens[key] = this;
        // when channel is aborting
        this.channel_abort_event_handler = on_channel_abort.bind(this);
        channel.on("abort", this.channel_abort_event_handler);
    }
    _detach_channel() {
        const channel = this.channel;
        if (!channel) {
            throw new Error("expecting a valid channel");
        }
        node_opcua_assert_1.assert(this.nonce && this.nonce instanceof Buffer);
        node_opcua_assert_1.assert(this.authenticationToken);
        const key = this.authenticationToken.toString();
        node_opcua_assert_1.assert(channel.sessionTokens.hasOwnProperty(key));
        node_opcua_assert_1.assert(this.channel);
        node_opcua_assert_1.assert(_.isFunction(this.channel_abort_event_handler));
        channel.removeListener("abort", this.channel_abort_event_handler);
        delete channel.sessionTokens[key];
        this.channel = undefined;
        this.channelId = undefined;
    }
    _exposeSubscriptionDiagnostics(subscription) {
        debugLog("ServerSession#_exposeSubscriptionDiagnostics");
        node_opcua_assert_1.assert(subscription.$session === this);
        const subscriptionDiagnosticsArray = this._getSubscriptionDiagnosticsArray();
        const subscriptionDiagnostics = subscription.subscriptionDiagnostics;
        node_opcua_assert_1.assert(subscriptionDiagnostics.$subscription === subscription);
        if (subscriptionDiagnostics && subscriptionDiagnosticsArray) {
            // xx console.log("GG => ServerSession Exposing subscription diagnostics =>",
            // subscription.id,"on session", session.nodeId.toString());
            node_opcua_address_space_1.addElement(subscriptionDiagnostics, subscriptionDiagnosticsArray);
        }
    }
    _unexposeSubscriptionDiagnostics(subscription) {
        const subscriptionDiagnosticsArray = this._getSubscriptionDiagnosticsArray();
        const subscriptionDiagnostics = subscription.subscriptionDiagnostics;
        node_opcua_assert_1.assert(subscriptionDiagnostics instanceof node_opcua_common_1.SubscriptionDiagnosticsDataType);
        if (subscriptionDiagnostics && subscriptionDiagnosticsArray) {
            // console.log("GG => ServerSession **Unexposing** subscription diagnostics =>",
            // subscription.id,"on session", session.nodeId.toString());
            node_opcua_address_space_1.removeElement(subscriptionDiagnosticsArray, subscriptionDiagnostics);
        }
        debugLog("ServerSession#_unexposeSubscriptionDiagnostics");
    }
    /**
     * @method watchdogReset
     * used as a callback for the Watchdog
     * @private
     */
    watchdogReset() {
        const self = this;
        // the server session has expired and must be removed from the server
        self.emit("timeout");
    }
    _createSessionObjectInAddressSpace() {
        if (this.sessionObject) {
            return;
        }
        node_opcua_assert_1.assert(!this.sessionObject, "ServerSession#_createSessionObjectInAddressSpace already called ?");
        this.sessionObject = null;
        if (!this.addressSpace) {
            debugLog("ServerSession#_createSessionObjectInAddressSpace : no addressSpace");
            return; // no addressSpace
        }
        const root = this.addressSpace.rootFolder;
        node_opcua_assert_1.assert(root, "expecting a root object");
        if (!root.objects) {
            debugLog("ServerSession#_createSessionObjectInAddressSpace : no object folder");
            return false;
        }
        if (!root.objects.server) {
            debugLog("ServerSession#_createSessionObjectInAddressSpace : no server object");
            return false;
        }
        // self.addressSpace.findNode(makeNodeId(ObjectIds.Server_ServerDiagnostics));
        const serverDiagnosticsNode = root.objects.server.serverDiagnostics;
        if (!serverDiagnosticsNode || !serverDiagnosticsNode.sessionsDiagnosticsSummary) {
            debugLog("ServerSession#_createSessionObjectInAddressSpace :" +
                " no serverDiagnostics.sessionsDiagnosticsSummary");
            return false;
        }
        const sessionDiagnosticsObjectType = this.addressSpace.findObjectType("SessionDiagnosticsObjectType");
        const sessionDiagnosticsDataType = this.addressSpace.findDataType("SessionDiagnosticsDataType");
        const sessionDiagnosticsVariableType = this.addressSpace.findVariableType("SessionDiagnosticsVariableType");
        const sessionSecurityDiagnosticsDataType = this.addressSpace.findDataType("SessionSecurityDiagnosticsDataType");
        const sessionSecurityDiagnosticsType = this.addressSpace.findVariableType("SessionSecurityDiagnosticsType");
        const namespace = this.addressSpace.getOwnNamespace();
        function createSessionDiagnosticsStuff() {
            if (sessionDiagnosticsDataType && sessionDiagnosticsVariableType) {
                // the extension object
                this._sessionDiagnostics = this.addressSpace.constructExtensionObject(sessionDiagnosticsDataType, {});
                this._sessionDiagnostics.$session = this;
                // install property getter on property that are unlikely to change
                if (this.parent.clientDescription) {
                    this._sessionDiagnostics.clientDescription = this.parent.clientDescription;
                }
                Object.defineProperty(this._sessionDiagnostics, "clientConnectionTime", {
                    get() {
                        return this.$session.clientConnectionTime;
                    }
                });
                Object.defineProperty(this._sessionDiagnostics, "actualSessionTimeout", {
                    get() {
                        return this.$session.sessionTimeout;
                    }
                });
                Object.defineProperty(this._sessionDiagnostics, "sessionId", {
                    get() {
                        return this.$session.nodeId;
                    }
                });
                Object.defineProperty(this._sessionDiagnostics, "sessionName", {
                    get() {
                        return this.$session.sessionName.toString();
                    }
                });
                this.sessionDiagnostics = sessionDiagnosticsVariableType.instantiate({
                    browseName: new node_opcua_data_model_1.QualifiedName({ name: "SessionDiagnostics", namespaceIndex: 0 }),
                    componentOf: this.sessionObject,
                    extensionObject: this._sessionDiagnostics,
                    minimumSamplingInterval: 2000 // 2 seconds
                });
                this._sessionDiagnostics = this.sessionDiagnostics.$extensionObject;
                node_opcua_assert_1.assert(this._sessionDiagnostics.$session === this);
                const sessionDiagnosticsArray = this.getSessionDiagnosticsArray();
                // add sessionDiagnostics into sessionDiagnosticsArray
                node_opcua_address_space_1.addElement(this._sessionDiagnostics, sessionDiagnosticsArray);
            }
        }
        function createSessionSecurityDiagnosticsStuff() {
            if (sessionSecurityDiagnosticsDataType && sessionSecurityDiagnosticsType) {
                // the extension object
                this._sessionSecurityDiagnostics = this.addressSpace.constructExtensionObject(sessionSecurityDiagnosticsDataType, {});
                this._sessionSecurityDiagnostics.$session = this;
                /*
                    sessionId: NodeId;
                    clientUserIdOfSession: UAString;
                    clientUserIdHistory: UAString[] | null;
                    authenticationMechanism: UAString;
                    encoding: UAString;
                    transportProtocol: UAString;
                    securityMode: MessageSecurityMode;
                    securityPolicyUri: UAString;
                    clientCertificate: ByteString;
                */
                Object.defineProperty(this._sessionSecurityDiagnostics, "sessionId", {
                    get() {
                        return this.$session.nodeId;
                    }
                });
                Object.defineProperty(this._sessionSecurityDiagnostics, "clientUserIdOfSession", {
                    get() {
                        return ""; // UAString
                    }
                });
                Object.defineProperty(this._sessionSecurityDiagnostics, "clientUserIdHistory", {
                    get() {
                        return []; //UAString[] | null
                    }
                });
                Object.defineProperty(this._sessionSecurityDiagnostics, "authenticationMechanism", {
                    get() {
                        return "";
                    }
                });
                Object.defineProperty(this._sessionSecurityDiagnostics, "encoding", {
                    get() {
                        return "";
                    }
                });
                Object.defineProperty(this._sessionSecurityDiagnostics, "transportProtocol", {
                    get() {
                        return "opc.tcp";
                    }
                });
                Object.defineProperty(this._sessionSecurityDiagnostics, "securityMode", {
                    get() {
                        const session = this.$session;
                        return session.channel.endpoint.securityMode;
                    }
                });
                Object.defineProperty(this._sessionSecurityDiagnostics, "securityPolicyUri", {
                    get() {
                        const session = this.$session;
                        return session.channel.endpoint.securityPolicyUri;
                    }
                });
                Object.defineProperty(this._sessionSecurityDiagnostics, "clientCertificate", {
                    get() {
                        const session = this.$session;
                        return session.channel.clientCertificate;
                    }
                });
                this.sessionSecurityDiagnostics = sessionSecurityDiagnosticsType.instantiate({
                    browseName: new node_opcua_data_model_1.QualifiedName({ name: "SessionSecurityDiagnostics", namespaceIndex: 0 }),
                    componentOf: this.sessionObject,
                    extensionObject: this._sessionSecurityDiagnostics,
                    minimumSamplingInterval: 2000 // 2 seconds
                });
                node_opcua_address_space_1.ensureObjectIsSecure(this.sessionSecurityDiagnostics);
                this._sessionSecurityDiagnostics = this.sessionSecurityDiagnostics.$extensionObject;
                node_opcua_assert_1.assert(this._sessionSecurityDiagnostics.$session === this);
                const sessionSecurityDiagnosticsArray = this.getSessionSecurityDiagnosticsArray();
                // add sessionDiagnostics into sessionDiagnosticsArray
                const node = node_opcua_address_space_1.addElement(this._sessionSecurityDiagnostics, sessionSecurityDiagnosticsArray);
                node_opcua_address_space_1.ensureObjectIsSecure(node);
            }
        }
        function createSessionDiagnosticSummaryUAObject() {
            const references = [];
            if (sessionDiagnosticsObjectType) {
                references.push({
                    isForward: true,
                    nodeId: sessionDiagnosticsObjectType,
                    referenceType: "HasTypeDefinition",
                });
            }
            this.sessionObject = namespace.createNode({
                browseName: this.sessionName || "Session-" + this.nodeId.toString(),
                componentOf: serverDiagnosticsNode.sessionsDiagnosticsSummary,
                nodeClass: node_opcua_data_model_2.NodeClass.Object,
                nodeId: this.nodeId,
                references,
                typeDefinition: sessionDiagnosticsObjectType,
            });
            createSessionDiagnosticsStuff.call(this);
            createSessionSecurityDiagnosticsStuff.call(this);
        }
        function createSubscriptionDiagnosticsArray() {
            const subscriptionDiagnosticsArrayType = this.addressSpace.findVariableType("SubscriptionDiagnosticsArrayType");
            node_opcua_assert_1.assert(subscriptionDiagnosticsArrayType.nodeId.toString() === "ns=0;i=2171");
            this.subscriptionDiagnosticsArray =
                node_opcua_address_space_1.createExtObjArrayNode(this.sessionObject, {
                    browseName: { namespaceIndex: 0, name: "SubscriptionDiagnosticsArray" },
                    complexVariableType: "SubscriptionDiagnosticsArrayType",
                    indexPropertyName: "subscriptionId",
                    minimumSamplingInterval: 2000,
                    variableType: "SubscriptionDiagnosticsType",
                });
        }
        createSessionDiagnosticSummaryUAObject.call(this);
        createSubscriptionDiagnosticsArray.call(this);
        return this.sessionObject;
    }
    /**
     *
     * @private
     */
    _removeSessionObjectFromAddressSpace() {
        // todo : dump session statistics in a file or somewhere for deeper diagnostic analysis on closed session
        if (!this.addressSpace) {
            return;
        }
        if (this.sessionDiagnostics) {
            const sessionDiagnosticsArray = this.getSessionDiagnosticsArray();
            node_opcua_address_space_1.removeElement(sessionDiagnosticsArray, this.sessionDiagnostics.$extensionObject);
            this.addressSpace.deleteNode(this.sessionDiagnostics);
            node_opcua_assert_1.assert(this._sessionDiagnostics.$session === this);
            this._sessionDiagnostics.$session = null;
            this._sessionDiagnostics = undefined;
            this.sessionDiagnostics = undefined;
        }
        if (this.sessionSecurityDiagnostics) {
            const sessionSecurityDiagnosticsArray = this.getSessionSecurityDiagnosticsArray();
            node_opcua_address_space_1.removeElement(sessionSecurityDiagnosticsArray, this.sessionSecurityDiagnostics.$extensionObject);
            this.addressSpace.deleteNode(this.sessionSecurityDiagnostics);
            node_opcua_assert_1.assert(this._sessionSecurityDiagnostics.$session === this);
            this._sessionSecurityDiagnostics.$session = null;
            this._sessionSecurityDiagnostics = undefined;
            this.sessionSecurityDiagnostics = undefined;
        }
        if (this.sessionObject) {
            this.addressSpace.deleteNode(this.sessionObject);
            this.sessionObject = null;
        }
    }
    /**
     *
     * @private
     */
    _getSubscriptionDiagnosticsArray() {
        if (!this.addressSpace) {
            if (doDebug) {
                console.warn("ServerSession#_getSubscriptionDiagnosticsArray : no addressSpace");
            }
            return null; // no addressSpace
        }
        const subscriptionDiagnosticsArray = this.subscriptionDiagnosticsArray;
        if (!subscriptionDiagnosticsArray) {
            return null; // no subscriptionDiagnosticsArray
        }
        node_opcua_assert_1.assert(subscriptionDiagnosticsArray.browseName.toString() === "SubscriptionDiagnosticsArray");
        return subscriptionDiagnosticsArray;
    }
    assignSubscription(subscription) {
        node_opcua_assert_1.assert(!subscription.$session);
        node_opcua_assert_1.assert(this.nodeId instanceof node_opcua_nodeid_1.NodeId);
        subscription.$session = this;
        subscription.sessionId = this.nodeId;
        this._cumulatedSubscriptionCount += 1;
        // Notify the owner that a new subscription has been created
        // @event new_subscription
        // @param {Subscription} subscription
        this.emit("new_subscription", subscription);
        // add subscription diagnostics to SubscriptionDiagnosticsArray
        this._exposeSubscriptionDiagnostics(subscription);
        subscription.once("terminated", () => {
            // Xx session._unexposeSubscriptionDiagnostics(subscription);
            // Notify the owner that a new subscription has been terminated
            // @event subscription_terminated
            // @param {Subscription} subscription
            this.emit("subscription_terminated", subscription);
        });
    }
    _deleteSubscriptions() {
        node_opcua_assert_1.assert(this.publishEngine);
        const subscriptions = this.publishEngine.subscriptions;
        subscriptions.forEach((subscription) => {
            this.deleteSubscription(subscription.id);
        });
    }
}
exports.ServerSession = ServerSession;
ServerSession.registry = new node_opcua_object_registry_1.ObjectRegistry();
ServerSession.maxPublishRequestInQueue = 100;
//# sourceMappingURL=server_session.js.map