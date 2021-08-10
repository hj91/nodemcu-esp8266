"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * @module node-opcua-server
 */
// tslint:disable:no-console
const async = require("async");
const chalk_1 = require("chalk");
const fs = require("fs");
const path = require("path");
const _ = require("underscore");
const util_1 = require("util");
const node_opcua_assert_1 = require("node-opcua-assert");
const node_opcua_certificate_manager_1 = require("node-opcua-certificate-manager");
const node_opcua_common_1 = require("node-opcua-common");
const node_opcua_data_model_1 = require("node-opcua-data-model");
const node_opcua_debug_1 = require("node-opcua-debug");
const node_opcua_debug_2 = require("node-opcua-debug");
const node_opcua_hostname_1 = require("node-opcua-hostname");
const node_opcua_date_time_1 = require("node-opcua-date-time");
const node_opcua_service_discovery_1 = require("node-opcua-service-discovery");
const node_opcua_service_endpoints_1 = require("node-opcua-service-endpoints");
const node_opcua_service_endpoints_2 = require("node-opcua-service-endpoints");
const node_opcua_service_secure_channel_1 = require("node-opcua-service-secure-channel");
const node_opcua_status_code_1 = require("node-opcua-status-code");
const doDebug = node_opcua_debug_1.checkDebugFlag(__filename);
const debugLog = node_opcua_debug_1.make_debugLog(__filename);
function constructFilename(p) {
    let filename = path.join(__dirname, "..", p);
    if (!fs.existsSync(filename)) {
        // try one level up
        filename = path.join(__dirname, p);
        if (!fs.existsSync(filename)) {
            throw new Error("Cannot find filename " + filename + " ( __dirname = " + __dirname);
        }
    }
    return filename;
}
const default_server_info = {
    // The globally unique identifier for the application instance. This URI is used as
    // ServerUri in Services if the application is a Server.
    applicationUri: "urn:NodeOPCUA-Server-default",
    // The globally unique identifier for the product.
    productUri: "NodeOPCUA-Server",
    // A localized descriptive name for the application.
    applicationName: { text: "NodeOPCUA", locale: null },
    applicationType: node_opcua_service_endpoints_1.ApplicationType.Server,
    gatewayServerUri: "",
    discoveryProfileUri: "",
    discoveryUrls: []
};
function cleanupEndpoint(endpoint) {
    if (endpoint._on_new_channel) {
        node_opcua_assert_1.assert(_.isFunction(endpoint._on_new_channel));
        endpoint.removeListener("newChannel", endpoint._on_new_channel);
        endpoint._on_new_channel = undefined;
    }
    if (endpoint._on_close_channel) {
        node_opcua_assert_1.assert(_.isFunction(endpoint._on_close_channel));
        endpoint.removeListener("closeChannel", endpoint._on_close_channel);
        endpoint._on_close_channel = undefined;
    }
}
const emptyCallback = () => {
};
/**
 * @class OPCUABaseServer
 * @constructor
 */
class OPCUABaseServer extends node_opcua_common_1.OPCUASecureObject {
    constructor(options) {
        options = options || {};
        options.certificateFile = options.certificateFile ||
            constructFilename("certificates/server_selfsigned_cert_2048.pem");
        options.privateKeyFile = options.privateKeyFile ||
            constructFilename("certificates/PKI/own/private/private_key.pem");
        super(options);
        this.capabilitiesForMDNS = [];
        this.endpoints = [];
        this.options = options;
        const serverInfo = _.extend(_.clone(default_server_info), options.serverInfo);
        serverInfo.applicationName = node_opcua_data_model_1.coerceLocalizedText(serverInfo.applicationName);
        this.serverInfo = new node_opcua_service_endpoints_2.ApplicationDescription(serverInfo);
        const __applicationUri = serverInfo.applicationUri || "";
        this.serverInfo.__defineGetter__("applicationUri", function () {
            return node_opcua_hostname_1.resolveFullyQualifiedDomainName(__applicationUri);
        });
        this.serverCertificateManager = options.serverCertificateManager
            || new node_opcua_certificate_manager_1.OPCUACertificateManager({
                name: "certificates"
            });
    }
    /**
     * The type of server
     */
    get serverType() {
        return this.serverInfo.applicationType;
    }
    /**
     * start all registered endPoint, in parallel, and call done when all endPoints are listening.
     * @method start
     * @async
     * @param {callback} done
     */
    start(done) {
        node_opcua_date_time_1.installPeriodicClockAdjustmement();
        const self = this;
        node_opcua_assert_1.assert(_.isFunction(done));
        node_opcua_assert_1.assert(_.isArray(this.endpoints));
        node_opcua_assert_1.assert(this.endpoints.length > 0, "We neeed at least one end point");
        util_1.callbackify(node_opcua_hostname_1.extractFullyQualifiedDomainName)((err, fqdn) => {
            async.forEach(this.endpoints, (endpoint, callback) => {
                endpoint._on_new_channel = (channel) => {
                    self.emit("newChannel", channel);
                };
                endpoint.on("newChannel", endpoint._on_new_channel);
                node_opcua_assert_1.assert(!endpoint._on_close_channel);
                endpoint._on_close_channel = (channel) => {
                    self.emit("closeChannel", channel);
                };
                endpoint.on("closeChannel", endpoint._on_close_channel);
                endpoint.start(callback);
            }, done);
        });
    }
    /**
     * shutdown all server endPoints
     * @async
     */
    shutdown(done) {
        node_opcua_date_time_1.uninstallPeriodicClockAdjustmement();
        debugLog("OPCUABaseServer#shutdown starting");
        node_opcua_assert_1.assert(_.isFunction(done));
        async.forEach(this.endpoints, (endpoint, callback) => {
            cleanupEndpoint(endpoint);
            endpoint.shutdown(callback);
        }, (err) => {
            debugLog("shutdown completed");
            done(err);
        });
    }
    shutdownChannels(callback) {
        node_opcua_assert_1.assert(_.isFunction(callback));
        debugLog("OPCUABaseServer#shutdownChannels");
        async.forEach(this.endpoints, (endpoint, inner_callback) => {
            debugLog(" shutting down endpoint ", endpoint.endpointDescriptions()[0].endpointUrl);
            async.series([
                // xx                  (callback2: (err?: Error| null) => void) => {
                // xx                      endpoint.suspendConnection(callback2);
                // xx                  },
                (callback2) => {
                    endpoint.abruptlyInterruptChannels();
                    endpoint.shutdown(callback2);
                }
                // xx              (callback2: (err?: Error| null) => void) => {
                // xx                 endpoint.restoreConnection(callback2);
                // xx              }
            ], inner_callback);
        }, callback);
    }
    on_request(message, channel) {
        node_opcua_assert_1.assert(message.request);
        node_opcua_assert_1.assert(message.requestId !== 0);
        const request = message.request;
        // install channel._on_response so we can intercept its call and  emit the "response" event.
        if (!channel._on_response) {
            channel._on_response = (msg, response1 /*, inner_message: Message*/) => {
                this.emit("response", response1, channel);
            };
        }
        // prepare request
        this.prepare(message, channel);
        debugLog(chalk_1.default.green.bold("--------------------------------------------------------"), channel.channelId, request.schema.name);
        let errMessage;
        let response;
        this.emit("request", request, channel);
        try {
            // handler must be named _on_ActionRequest()
            const handler = this["_on_" + request.schema.name];
            if (_.isFunction(handler)) {
                handler.apply(this, arguments);
            }
            else {
                errMessage = "UNSUPPORTED REQUEST !! " + request.schema.name;
                console.log(errMessage);
                debugLog(chalk_1.default.red.bold(errMessage));
                response = makeServiceFault(node_opcua_status_code_1.StatusCodes.BadNotImplemented, [errMessage]);
                channel.send_response("MSG", response, message, emptyCallback);
            }
        }
        catch (err) {
            /* istanbul ignore if */
            const errMessage1 = "EXCEPTION CAUGHT WHILE PROCESSING REQUEST !! " + request.schema.name;
            console.log(chalk_1.default.red.bold(errMessage1));
            console.log(request.toString());
            node_opcua_debug_2.display_trace_from_this_projet_only(err);
            let additional_messages = [];
            additional_messages.push("EXCEPTION CAUGHT WHILE PROCESSING REQUEST !!! " + request.schema.name);
            additional_messages.push(err.message);
            if (err.stack) {
                additional_messages = additional_messages.concat(err.stack.split("\n"));
            }
            response = makeServiceFault(node_opcua_status_code_1.StatusCodes.BadInternalError, additional_messages);
            channel.send_response("MSG", response, message, emptyCallback);
        }
    }
    _get_endpoints() {
        let endpoints = [];
        for (const endPoint of this.endpoints) {
            const ep = endPoint.endpointDescriptions();
            endpoints = endpoints.concat(ep);
        }
        return endpoints;
    }
    getDiscoveryUrls() {
        const discoveryUrls = this.endpoints.map((e) => {
            return e.endpointDescriptions()[0].endpointUrl;
        });
        return discoveryUrls;
        // alternative : return _.uniq(this._get_endpoints().map(function(e){ return e.endpointUrl; }));
    }
    getServers(channel) {
        this.serverInfo.discoveryUrls = this.getDiscoveryUrls();
        const servers = [this.serverInfo];
        return servers;
    }
    suspendEndPoints(callback) {
        if (!callback) {
            throw new Error("Internal Error");
        }
        async.forEach(this.endpoints, (ep, _inner_callback) => {
            /* istanbul ignore next */
            if (doDebug) {
                debugLog("Suspending ", ep.endpointDescriptions()[0].endpointUrl);
            }
            ep.suspendConnection((err) => {
                /* istanbul ignore next */
                if (doDebug) {
                    debugLog("Suspended ", ep.endpointDescriptions()[0].endpointUrl);
                }
                _inner_callback(err);
            });
        }, (err) => callback(err));
    }
    resumeEndPoints(callback) {
        async.forEach(this.endpoints, (ep, _inner_callback) => {
            ep.restoreConnection(_inner_callback);
        }, (err) => callback(err));
    }
    prepare(message, channel) {
        /* empty */
    }
    /**
     * @private
     */
    _on_GetEndpointsRequest(message, channel) {
        const server = this;
        const request = message.request;
        node_opcua_assert_1.assert(request.schema.name === "GetEndpointsRequest");
        const response = new node_opcua_service_endpoints_1.GetEndpointsResponse({});
        response.endpoints = server._get_endpoints();
        response.endpoints = response.endpoints.filter((endpoint) => !endpoint.restricted);
        // apply filters
        if (request.profileUris && request.profileUris.length > 0) {
            response.endpoints = response.endpoints.filter((endpoint) => {
                return request.profileUris.indexOf(endpoint.transportProfileUri) >= 0;
            });
        }
        // adjust locale on ApplicationName to match requested local or provide
        // a string with neutral locale (locale === null)
        // TODO: find a better way to handle this
        response.endpoints.forEach((endpoint) => {
            endpoint.server.applicationName.locale = null;
        });
        channel.send_response("MSG", response, message, emptyCallback);
    }
    /**
     * @private
     */
    _on_FindServersRequest(message, channel) {
        const server = this;
        // Release 1.02  13  OPC Unified Architecture, Part 4 :
        //   This  Service  can be used without security and it is therefore vulnerable to Denial Of Service (DOS)
        //   attacks. A  Server  should minimize the amount of processing required to send the response for this
        //   Service.  This can be achieved by preparing the result in advance.   The  Server  should  also add a
        //   short delay before starting processing of a request during high traffic conditions.
        const shortDelay = 2;
        setTimeout(() => {
            const request = message.request;
            node_opcua_assert_1.assert(request.schema.name === "FindServersRequest");
            if (!(request instanceof node_opcua_service_discovery_1.FindServersRequest)) {
                throw new Error("Invalid request type");
            }
            let servers = server.getServers(channel);
            // apply filters
            // TODO /
            if (request.serverUris && request.serverUris.length > 0) {
                // A serverUri matches the applicationUri from the ApplicationDescription define
                servers = servers.filter((inner_Server) => {
                    return request.serverUris.indexOf(inner_Server.applicationUri) >= 0;
                });
            }
            function adapt(applicationDescription) {
                return new node_opcua_service_endpoints_2.ApplicationDescription({
                    applicationName: applicationDescription.applicationName,
                    applicationType: applicationDescription.applicationType,
                    applicationUri: applicationDescription.applicationUri,
                    discoveryProfileUri: applicationDescription.discoveryProfileUri,
                    discoveryUrls: applicationDescription.discoveryUrls,
                    gatewayServerUri: applicationDescription.gatewayServerUri,
                    productUri: applicationDescription.productUri
                });
            }
            const response = new node_opcua_service_discovery_1.FindServersResponse({
                servers: servers.map(adapt)
            });
            channel.send_response("MSG", response, message, emptyCallback);
        }, shortDelay);
    }
    /**
     * returns a array of currently active channels
     */
    getChannels() {
        let channels = [];
        for (const endpoint of this.endpoints) {
            const c = endpoint.getChannels();
            channels = channels.concat(c);
        }
        return channels;
    }
}
exports.OPCUABaseServer = OPCUABaseServer;
OPCUABaseServer.makeServiceFault = makeServiceFault;
/**
 * construct a service Fault response
 * @method makeServiceFault
 * @param statusCode
 * @param messages
 */
function makeServiceFault(statusCode, messages) {
    const response = new node_opcua_service_secure_channel_1.ServiceFault();
    response.responseHeader.serviceResult = statusCode;
    // xx response.serviceDiagnostics.push( new DiagnosticInfo({ additionalInfo: messages.join("\n")}));
    node_opcua_assert_1.assert(_.isArray(messages));
    node_opcua_assert_1.assert(typeof messages[0] === "string");
    response.responseHeader.stringTable = messages;
    // tslint:disable:no-console
    console.log(chalk_1.default.cyan(" messages "), messages.join("\n"));
    return response;
}
// tslint:disable:no-var-requires
const thenify = require("thenify");
const opts = { multiArgs: false };
OPCUABaseServer.prototype.resumeEndPoints = thenify.withCallback(OPCUABaseServer.prototype.resumeEndPoints, opts);
OPCUABaseServer.prototype.suspendEndPoints = thenify.withCallback(OPCUABaseServer.prototype.suspendEndPoints, opts);
OPCUABaseServer.prototype.shutdownChannels = thenify.withCallback(OPCUABaseServer.prototype.shutdownChannels, opts);
//# sourceMappingURL=base_server.js.map