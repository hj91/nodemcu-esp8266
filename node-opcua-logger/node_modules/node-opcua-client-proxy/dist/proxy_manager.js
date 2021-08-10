"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * @module node-opcua-client-proxy
 */
// tslint:disable:no-shadowed-variable
const async = require("async");
const node_opcua_assert_1 = require("node-opcua-assert");
const _ = require("underscore");
const node_opcua_client_1 = require("node-opcua-client");
const node_opcua_status_code_1 = require("node-opcua-status-code");
const object_explorer_1 = require("./object_explorer");
const proxy_1 = require("./proxy");
const proxy_object_1 = require("./proxy_object");
const state_machine_proxy_1 = require("./state_machine_proxy");
function getObject(proxyManager, nodeId, options, callback) {
    const session = proxyManager.session;
    nodeId = node_opcua_client_1.coerceNodeId(nodeId);
    if (nodeId.isEmpty()) {
        setImmediate(() => {
            callback(new Error(" Invalid empty node in getObject"));
        });
        return;
    }
    const nodesToRead = [
        {
            attributeId: node_opcua_client_1.AttributeIds.BrowseName,
            nodeId,
        },
        {
            attributeId: node_opcua_client_1.AttributeIds.Description,
            nodeId,
        },
        {
            attributeId: node_opcua_client_1.AttributeIds.NodeClass,
            nodeId,
        }
    ];
    function read_accessLevels(clientObject, callback) {
        const nodesToRead = [
            {
                attributeId: node_opcua_client_1.AttributeIds.Value,
                nodeId,
            },
            {
                attributeId: node_opcua_client_1.AttributeIds.UserAccessLevel,
                nodeId,
            },
            {
                attributeId: node_opcua_client_1.AttributeIds.AccessLevel,
                nodeId,
            }
        ];
        session.read(nodesToRead, 1, (err, dataValues) => {
            if (err) {
                return callback(err);
            }
            dataValues = dataValues || [];
            if (dataValues[0].statusCode === node_opcua_status_code_1.StatusCodes.Good) {
                clientObject.dataValue = dataValues[0].value;
            }
            if (dataValues[1].statusCode === node_opcua_status_code_1.StatusCodes.Good) {
                clientObject.userAccessLevel = node_opcua_client_1.coerceAccessLevelFlag(dataValues[1].value.value);
            }
            if (dataValues[2].statusCode === node_opcua_status_code_1.StatusCodes.Good) {
                clientObject.accessLevel = node_opcua_client_1.coerceAccessLevelFlag(dataValues[2].value.value);
            }
            callback(err);
        });
    }
    let clientObject;
    async.series([
        (callback) => {
            // readAttributes like browseName and references
            session.read(nodesToRead, 1, (err, dataValues) => {
                if (!err) {
                    dataValues = dataValues;
                    if (dataValues[0].statusCode === node_opcua_status_code_1.StatusCodes.BadNodeIdUnknown) {
                        // xx console.log(" INVALID NODE ", nodeId.toString());
                        return callback(new Error("Invalid Node " + nodeId.toString()));
                    }
                    clientObject = new proxy_object_1.ProxyObject(proxyManager, nodeId);
                    /// x console.log("xxxx ,s",results.map(function(a){ return a.toString();}));
                    clientObject.browseName = dataValues[0].value.value;
                    clientObject.description = (dataValues[1].value ? dataValues[1].value.value : "");
                    clientObject.nodeClass = dataValues[2].value.value;
                    // xx console.log("xxx nodeClass = ",clientObject.nodeClass.toString());
                    if (clientObject.nodeClass === node_opcua_client_1.NodeClass.Variable) {
                        return read_accessLevels(clientObject, callback);
                    }
                }
                callback(err);
            });
        },
        (callback) => {
            // install monitored item
            if (clientObject.nodeClass === node_opcua_client_1.NodeClass.Variable) {
                // xx console.log("xxxx -> ???", clientObject.nodeId.toString(), clientObject.nodeClass.toString());
                return proxyManager._monitor_value(clientObject, callback);
            }
            callback();
        },
        (callback) => {
            object_explorer_1.readUAStructure(proxyManager, clientObject, callback);
        }
        //
    ], (err) => {
        // istanbul ignore next
        if (err) {
            return callback(err);
        }
        callback(null, clientObject);
    });
}
class UAProxyManager {
    constructor(session) {
        this.session = session;
        this._map = {};
        // create a subscription
    }
    start(callback) {
        const createSubscriptionRequest = {
            maxNotificationsPerPublish: 1000,
            priority: 10,
            publishingEnabled: true,
            requestedLifetimeCount: 6000,
            requestedMaxKeepAliveCount: 100,
            requestedPublishingInterval: 100,
        };
        this.session.createSubscription2(createSubscriptionRequest, (err, subscription) => {
            if (err) {
                return callback(err);
            }
            this.subscription = subscription;
            this.subscription.on("terminated", () => {
                this.subscription = undefined;
            });
            callback();
        });
    }
    stop(...args) {
        const callback = args[0];
        if (this.subscription) {
            this.subscription.terminate(() => {
                this.subscription = undefined;
                callback();
            });
        }
        else {
            callback(new Error("UAProxyManager already stopped ?"));
        }
    }
    getObject(...args) {
        const nodeId = args[0];
        const callback = args[1];
        let options = {};
        setImmediate(() => {
            options = options || {};
            options.depth = options.depth || 1;
            const key = nodeId.toString();
            // the object already exist in the map ?
            if (this._map.hasOwnProperty(key)) {
                return callback(null, this._map[key]);
            }
            getObject(this, nodeId, options, (err, obj) => {
                if (!err) {
                    this._map[key] = obj;
                }
                callback(err, obj);
            });
        });
    }
    _monitor_value(proxyObject, callback) {
        if (!this.subscription) {
            // some server do not provide subscription support, do not treat this as an error.
            return callback(); // new Error("No subscription"));
        }
        const itemToMonitor = {
            attributeId: node_opcua_client_1.AttributeIds.Value,
            nodeId: proxyObject.nodeId,
        };
        const monitoringParameters = {
            discardOldest: true,
            queueSize: 10,
            samplingInterval: 0,
        };
        const requestedParameters = node_opcua_client_1.TimestampsToReturn.Both;
        this.subscription.monitor(itemToMonitor, monitoringParameters, requestedParameters, (err, monitoredItem) => {
            Object.defineProperty(proxyObject, "__monitoredItem", { value: monitoredItem, enumerable: false });
            proxyObject.__monitoredItem.on("changed", (dataValue) => {
                proxyObject.dataValue = dataValue;
                proxyObject.emit("value_changed", dataValue);
            });
            callback(err);
        });
    }
    _monitor_execution_flag(proxyObject, callback) {
        // note : proxyObject must wrap a method
        node_opcua_assert_1.assert(_.isFunction(callback));
        node_opcua_assert_1.assert(proxyObject.nodeId instanceof node_opcua_client_1.NodeId);
        if (!this.subscription) {
            // some server do not provide subscription support, do not treat this as an error.
            return callback(); // new Error("No subscription"));
        }
        const itemToMonitor = {
            attributeId: node_opcua_client_1.AttributeIds.Executable,
            nodeId: proxyObject.nodeId,
        };
        const monitoringParameters = {
            discardOldest: true,
            queueSize: 10,
            samplingInterval: 0,
        };
        const requestedParameters = node_opcua_client_1.TimestampsToReturn.Neither;
        this.subscription.monitor(itemToMonitor, monitoringParameters, requestedParameters, (err, monitoredItem) => {
            Object.defineProperty(proxyObject, "__monitoredItem_execution_flag", { value: monitoredItem, enumerable: false });
            proxyObject.__monitoredItem_execution_flag.on("changed", (dataValue) => {
                proxyObject.executableFlag = dataValue.value.value;
            });
            callback(err);
        });
    }
    getStateMachineType(nodeId, callback) {
        if (typeof nodeId === "string") {
            const org_nodeId = nodeId;
            nodeId = proxy_1.makeRefId(nodeId);
        }
        this.getObject(nodeId, (err, obj) => {
            // read fromState and toState Reference on
            let stateMachineType;
            if (!err) {
                stateMachineType = new state_machine_proxy_1.ProxyStateMachineType(obj);
            }
            callback(err, stateMachineType);
        });
    }
}
exports.UAProxyManager = UAProxyManager;
// tslint:disable-next-line:no-var-requires
const thenify = require("thenify");
UAProxyManager.prototype.start = thenify.withCallback(UAProxyManager.prototype.start);
UAProxyManager.prototype.stop = thenify.withCallback(UAProxyManager.prototype.stop);
UAProxyManager.prototype.getObject = thenify.withCallback(UAProxyManager.prototype.getObject);
//# sourceMappingURL=proxy_manager.js.map