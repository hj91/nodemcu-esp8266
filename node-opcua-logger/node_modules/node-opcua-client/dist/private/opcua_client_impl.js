"use strict";
/**
 * @module node-opcua-client-private
 */
// tslint:disable:variable-name
// tslint:disable:no-console
// tslint:disable:no-empty
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
const async = require("async");
const chalk_1 = require("chalk");
const crypto = require("crypto");
const _ = require("underscore");
const util_1 = require("util");
const node_opcua_assert_1 = require("node-opcua-assert");
const node_opcua_buffer_utils_1 = require("node-opcua-buffer-utils");
const node_opcua_common_1 = require("node-opcua-common");
const node_opcua_crypto_1 = require("node-opcua-crypto");
const node_opcua_data_model_1 = require("node-opcua-data-model");
const node_opcua_debug_1 = require("node-opcua-debug");
const node_opcua_hostname_1 = require("node-opcua-hostname");
const node_opcua_secure_channel_1 = require("node-opcua-secure-channel");
const node_opcua_service_endpoints_1 = require("node-opcua-service-endpoints");
const node_opcua_service_secure_channel_1 = require("node-opcua-service-secure-channel");
const node_opcua_service_session_1 = require("node-opcua-service-session");
const node_opcua_status_code_1 = require("node-opcua-status-code");
const node_opcua_utils_1 = require("node-opcua-utils");
const reconnection_1 = require("../reconnection");
const client_base_impl_1 = require("./client_base_impl");
const client_session_impl_1 = require("./client_session_impl");
const client_subscription_impl_1 = require("./client_subscription_impl");
const debugLog = node_opcua_debug_1.make_debugLog(__filename);
const doDebug = node_opcua_debug_1.checkDebugFlag(__filename);
const errorLog = debugLog;
function validateServerNonce(serverNonce) {
    return (!(serverNonce && serverNonce.length < 32));
}
function verifyEndpointDescriptionMatches(client, responseServerEndpoints) {
    // The Server returns its EndpointDescriptions in the response. Clients use this information to
    // determine whether the list of EndpointDescriptions returned from the Discovery Endpoint matches
    // the Endpoints that the Server has. If there is a difference then the Client shall close the
    // Session and report an error.
    // The Server returns all EndpointDescriptions for the serverUri
    // specified by the Client in the request. The Client only verifies EndpointDescriptions with a
    // transportProfileUri that matches the profileUri specified in the original GetEndpoints request.
    // A Client may skip this check if the EndpointDescriptions were provided by a trusted source
    // such as the Administrator.
    // serverEndpoints:
    // The Client shall verify this list with the list from a Discovery Endpoint if it used a Discovery Endpoint
    // fetch to the EndpointDescriptions.
    // ToDo
    return true;
}
function findUserTokenPolicy(endpointDescription, userTokenType) {
    endpointDescription.userIdentityTokens = endpointDescription.userIdentityTokens || [];
    const r = _.filter(endpointDescription.userIdentityTokens, (userIdentity) => userIdentity.tokenType === userTokenType);
    return r.length === 0 ? null : r[0];
}
function createAnonymousIdentityToken(session) {
    const endpoint = session.endpoint;
    const userTokenPolicy = findUserTokenPolicy(endpoint, node_opcua_service_endpoints_1.UserTokenType.Anonymous);
    if (!userTokenPolicy) {
        throw new Error("Cannot find ANONYMOUS user token policy in end point description");
    }
    return new node_opcua_service_session_1.AnonymousIdentityToken({ policyId: userTokenPolicy.policyId });
}
/**
 *
 * @param session
 * @param certificate - the user certificate
 * @param privateKey  - the private key associated with the user certificate
 */
function createX509IdentityToken(session, certificate, privateKey) {
    const endpoint = session.endpoint;
    node_opcua_assert_1.assert(endpoint instanceof node_opcua_service_endpoints_1.EndpointDescription);
    const userTokenPolicy = findUserTokenPolicy(endpoint, node_opcua_service_endpoints_1.UserTokenType.Certificate);
    // istanbul ignore next
    if (!userTokenPolicy) {
        throw new Error("Cannot find Certificate (X509) user token policy in end point description");
    }
    let securityPolicy = node_opcua_secure_channel_1.fromURI(userTokenPolicy.securityPolicyUri);
    // if the security policy is not specified we use the session security policy
    if (securityPolicy === node_opcua_secure_channel_1.SecurityPolicy.Invalid) {
        securityPolicy = session._client._secureChannel.securityPolicy;
    }
    const userIdentityToken = new node_opcua_service_session_1.X509IdentityToken({
        certificateData: certificate,
        policyId: userTokenPolicy.policyId
    });
    const serverCertificate = session.serverCertificate;
    node_opcua_assert_1.assert(serverCertificate instanceof Buffer);
    const serverNonce = session.serverNonce || Buffer.alloc(0);
    node_opcua_assert_1.assert(serverNonce instanceof Buffer);
    // see Release 1.02 155 OPC Unified Architecture, Part 4
    const cryptoFactory = node_opcua_secure_channel_1.getCryptoFactory(securityPolicy);
    // istanbul ignore next
    if (!cryptoFactory) {
        throw new Error(" Unsupported security Policy");
    }
    /**
     * OPCUA Spec 1.04 - part 4
     * page 28:
     * 5.6.3.1
     * ...
     * If the token is an X509IdentityToken then the proof is a signature generated with private key
     * associated with the Certificate. The data to sign is created by appending the last serverNonce to
     * the **serverCertificate** specified in the CreateSession response. If a token includes a secret then it
     * should be encrypted using the public key from the serverCertificate.
     *
     * page 155:
     * Token Encryption and Proof of Possession
     * 7.36.2.1 Overview
     * The Client shall always prove possession of a UserIdentityToken when it passes it to the Server.
     * Some tokens include a secret such as a password which the Server will accept as proof. In order
     * to protect these secrets the Token may be encrypted before it is passed to the Server. Other types
     * of tokens allow the Client to create a signature with the secret associated with the Token. In these
     * cases, the Client proves possession of a UserIdentityToken by creating a signature with the secret
     * and passing it to the Server
     *
     * page 159:
     * 7.36.5 X509IdentityTokens
     * The X509IdentityToken is used to pass an X.509 v3 Certificate which is issued by the user.
     * This token shall always be accompanied by a Signature in the userTokenSignature parameter of
     * ActivateSession if required by the SecurityPolicy. The Server should specify a SecurityPolicy for
     * the UserTokenPolicy if the SecureChannel has a SecurityPolicy of None.
     */
    // now create the proof of possession, by creating a signature
    // The data to sign is created by appending the last serverNonce to the serverCertificate
    // The signature generated with private key associated with the User Certificate
    const userTokenSignature = node_opcua_secure_channel_1.computeSignature(serverCertificate, serverNonce, privateKey, securityPolicy);
    return { userIdentityToken, userTokenSignature };
}
function createUserNameIdentityToken(session, userName, password) {
    // assert(endpoint instanceof EndpointDescription);
    node_opcua_assert_1.assert(userName === null || typeof userName === "string");
    node_opcua_assert_1.assert(password === null || typeof password === "string");
    const endpoint = session.endpoint;
    node_opcua_assert_1.assert(endpoint instanceof node_opcua_service_endpoints_1.EndpointDescription);
    /**
     * OPC Unified Architecture 1.0.4:  Part 4 155
     * Each UserIdentityToken allowed by an Endpoint shall have a UserTokenPolicy specified in the
     * EndpointDescription. The UserTokenPolicy specifies what SecurityPolicy to use when encrypting
     * or signing. If this SecurityPolicy is omitted then the Client uses the SecurityPolicy in the
     * EndpointDescription. If the matching SecurityPolicy is set to None then no encryption or signature
     * is required.
     *
     */
    const userTokenPolicy = findUserTokenPolicy(endpoint, node_opcua_service_endpoints_1.UserTokenType.UserName);
    // istanbul ignore next
    if (!userTokenPolicy) {
        throw new Error("Cannot find USERNAME user token policy in end point description");
    }
    let securityPolicy = node_opcua_secure_channel_1.fromURI(userTokenPolicy.securityPolicyUri);
    // if the security policy is not specified we use the session security policy
    if (securityPolicy === node_opcua_secure_channel_1.SecurityPolicy.Invalid) {
        securityPolicy = session._client._secureChannel.securityPolicy;
    }
    let identityToken;
    let serverCertificate = session.serverCertificate;
    // if server does not provide certificate use unencrypted password
    if (!serverCertificate) {
        identityToken = new node_opcua_service_session_1.UserNameIdentityToken({
            encryptionAlgorithm: null,
            password: Buffer.from(password, "utf-8"),
            policyId: userTokenPolicy ? userTokenPolicy.policyId : null,
            userName
        });
        return identityToken;
    }
    node_opcua_assert_1.assert(serverCertificate instanceof Buffer);
    serverCertificate = node_opcua_crypto_1.toPem(serverCertificate, "CERTIFICATE");
    const publicKey = node_opcua_crypto_1.extractPublicKeyFromCertificateSync(serverCertificate);
    const serverNonce = session.serverNonce || Buffer.alloc(0);
    node_opcua_assert_1.assert(serverNonce instanceof Buffer);
    // If None is specified for the UserTokenPolicy and SecurityPolicy is None
    // then the password only contains the UTF-8 encoded password.
    // note: this means that password is sent in clear text to the server
    // note: OPCUA specification discourages use of unencrypted password
    //       but some old OPCUA server may only provide this policy and we
    //       still have to support in the client?
    if (securityPolicy === node_opcua_secure_channel_1.SecurityPolicy.None) {
        identityToken = new node_opcua_service_session_1.UserNameIdentityToken({
            encryptionAlgorithm: null,
            password: Buffer.from(password, "utf-8"),
            policyId: userTokenPolicy.policyId,
            userName
        });
        return identityToken;
    }
    // see Release 1.02 155 OPC Unified Architecture, Part 4
    const cryptoFactory = node_opcua_secure_channel_1.getCryptoFactory(securityPolicy);
    // istanbul ignore next
    if (!cryptoFactory) {
        throw new Error(" Unsupported security Policy");
    }
    identityToken = new node_opcua_service_session_1.UserNameIdentityToken({
        encryptionAlgorithm: cryptoFactory.asymmetricEncryptionAlgorithm,
        password: Buffer.from(password, "utf-8"),
        policyId: userTokenPolicy.policyId,
        userName
    });
    // now encrypt password as requested
    const lenBuf = node_opcua_buffer_utils_1.createFastUninitializedBuffer(4);
    lenBuf.writeUInt32LE(identityToken.password.length + serverNonce.length, 0);
    const block = Buffer.concat([lenBuf, identityToken.password, serverNonce]);
    identityToken.password = cryptoFactory.asymmetricEncrypt(block, publicKey);
    return identityToken;
}
/***
 *
 * @class OPCUAClientImpl
 * @extends ClientBaseImpl
 * @param options
 * @param [options.securityMode=MessageSecurityMode.None] {MessageSecurityMode} the default security mode.
 * @param [options.securityPolicy =SecurityPolicy.None] {SecurityPolicy} the security mode.
 * @param [options.requestedSessionTimeout= 60000]            {Number} the requested session time out in CreateSession
 * @param [options.applicationName="NodeOPCUA-Client"]        {string} the client application name
 * @param [options.endpoint_must_exist=true] {Boolean} set to false if the client should accept server endpoint mismatch
 * @param [options.keepSessionAlive=false]{Boolean}
 * @param [options.certificateFile="certificates/client_selfsigned_cert_2048.pem"] {String} client certificate pem file.
 * @param [options.privateKeyFile="certificates/client_key_2048.pem"] {String} client private key pem file.
 * @param [options.clientName=""] {String} a client name string that will be used to generate session names.
 * @constructor
 * @internal
 */
class OPCUAClientImpl extends client_base_impl_1.ClientBaseImpl {
    constructor(options) {
        options = options || {};
        super(options);
        // @property endpoint_must_exist {Boolean}
        // if set to true , create Session will only accept connection from server which endpoint_url has been reported
        // by GetEndpointsRequest.
        // By default, the client is strict.
        this.endpoint_must_exist = (node_opcua_utils_1.isNullOrUndefined(options.endpoint_must_exist))
            ? true
            : !!options.endpoint_must_exist;
        this.requestedSessionTimeout = options.requestedSessionTimeout || 60000; // 1 minute
        this.___sessionName_counter = 0;
        this.userIdentityInfo = { type: node_opcua_service_endpoints_1.UserTokenType.Anonymous };
        this.endpoint = undefined;
    }
    static create(options) {
        return new OPCUAClientImpl(options);
    }
    /**
     * @internal
     * @param args
     */
    createSession(...args) {
        if (args.length === 1) {
            return this.createSession({ type: node_opcua_service_endpoints_1.UserTokenType.Anonymous }, args[0]);
        }
        const userIdentityInfo = args[0];
        const callback = args[1];
        this.userIdentityInfo = userIdentityInfo;
        node_opcua_assert_1.assert(_.isFunction(callback));
        this._createSession((err, session) => {
            if (err) {
                callback(err);
            }
            else {
                if (!session) {
                    return callback(new Error("Internal Error"));
                }
                this._addSession(session);
                this._activateSession(session, (err1, session2) => {
                    callback(err1, session2);
                });
            }
        });
    }
    /**
     * @internal
     * @param args
     */
    changeSessionIdentity(...args) {
        const session = args[0];
        const userIdentityInfo = args[1];
        const callback = args[2];
        node_opcua_assert_1.assert(_.isFunction(callback));
        const old_userIdentity = this.userIdentityInfo;
        this.userIdentityInfo = userIdentityInfo;
        this._activateSession(session, (err1, session1) => {
            callback(err1 ? err1 : undefined);
        });
    }
    /**
     * @internals
     * @param args
     */
    closeSession(...args) {
        const session = args[0];
        const deleteSubscriptions = args[1];
        const callback = args[2];
        node_opcua_assert_1.assert(_.isBoolean(deleteSubscriptions));
        node_opcua_assert_1.assert(_.isFunction(callback));
        node_opcua_assert_1.assert(session);
        node_opcua_assert_1.assert(session._client === this, "session must be attached to this");
        session._closed = true;
        // todo : send close session on secure channel
        this._closeSession(session, deleteSubscriptions, (err, response) => {
            session.emitCloseEvent(node_opcua_status_code_1.StatusCodes.Good);
            this._removeSession(session);
            session.dispose();
            node_opcua_assert_1.assert(!_.contains(this._sessions, session));
            node_opcua_assert_1.assert(session._closed, "session must indicate it is closed");
            callback(err ? err : undefined);
        });
    }
    toString() {
        let str = client_base_impl_1.ClientBaseImpl.prototype.toString.call(this);
        str += "  requestedSessionTimeout....... " + this.requestedSessionTimeout;
        str += "  endpointUrl................... " + this.endpointUrl;
        str += "  serverUri..................... " + this.serverUri;
        return str;
    }
    /**
     * @internal
     * @param args
     */
    withSession(connectionPoint, inner_func, ...args) {
        const endpointUrl = (typeof connectionPoint === "string") ? connectionPoint : connectionPoint.endpointUrl;
        const userIdentity = (typeof connectionPoint === "string") ? { type: node_opcua_service_endpoints_1.UserTokenType.Anonymous } : connectionPoint.userIdentity;
        const callback = args[0];
        node_opcua_assert_1.assert(_.isFunction(inner_func), "expecting inner function");
        node_opcua_assert_1.assert(_.isFunction(callback), "expecting callback function");
        let theSession;
        let the_error;
        let need_disconnect = false;
        async.series([
            // step 1 : connect to
            (innerCallback) => {
                this.connect(endpointUrl, (err) => {
                    need_disconnect = true;
                    if (err) {
                        errorLog(" cannot connect to endpoint :", endpointUrl);
                    }
                    innerCallback(err);
                });
            },
            // step 2 : createSession
            (innerCallback) => {
                this.createSession(userIdentity, (err, session) => {
                    if (err) {
                        return innerCallback(err);
                    }
                    if (!session) {
                        return innerCallback(new Error("internal error"));
                    }
                    theSession = session;
                    innerCallback();
                });
            },
            (innerCallback) => {
                try {
                    inner_func(theSession, (err) => {
                        the_error = err;
                        innerCallback();
                    });
                }
                catch (err) {
                    errorLog("OPCUAClientImpl#withClientSession", err.message);
                    the_error = err;
                    innerCallback();
                }
            },
            // close session
            (innerCallback) => {
                theSession.close(/*deleteSubscriptions=*/ true, (err) => {
                    if (err) {
                        debugLog("OPCUAClientImpl#withClientSession: session closed failed ?");
                    }
                    innerCallback();
                });
            },
            (innerCallback) => {
                this.disconnect((err) => {
                    need_disconnect = false;
                    if (err) {
                        errorLog("OPCUAClientImpl#withClientSession: client disconnect failed ?");
                    }
                    innerCallback();
                });
            }
        ], (err1) => {
            if (err1) {
                console.log("err", err1);
            }
            if (need_disconnect) {
                errorLog("Disconnecting client after failure");
                this.disconnect((err2) => {
                    return callback(the_error || err1 || err2);
                });
            }
            else {
                return callback(the_error || err1);
            }
        });
    }
    withSubscription(endpointUrl, subscriptionParameters, innerFunc, callback) {
        node_opcua_assert_1.assert(_.isFunction(innerFunc));
        node_opcua_assert_1.assert(_.isFunction(callback));
        this.withSession(endpointUrl, (session, done) => {
            node_opcua_assert_1.assert(_.isFunction(done));
            const subscription = new client_subscription_impl_1.ClientSubscriptionImpl(session, subscriptionParameters);
            try {
                innerFunc(session, subscription, (err) => {
                    subscription.terminate((err1) => {
                        done(err1);
                    });
                });
            }
            catch (err) {
                debugLog(err);
                done(err);
            }
        }, callback);
    }
    withSessionAsync(connectionPoint, func) {
        return __awaiter(this, void 0, void 0, function* () {
            node_opcua_assert_1.assert(_.isFunction(func));
            node_opcua_assert_1.assert(func.length === 1, "expecting a single argument in func");
            const endpointUrl = (typeof connectionPoint === "string") ? connectionPoint : connectionPoint.endpointUrl;
            const userIdentity = (typeof connectionPoint === "string") ? { type: node_opcua_service_endpoints_1.UserTokenType.Anonymous } : connectionPoint.userIdentity;
            try {
                yield this.connect(endpointUrl);
                const session = yield this.createSession(userIdentity);
                let result;
                try {
                    result = yield func(session);
                }
                catch (err) {
                    errorLog(err);
                }
                yield session.close();
                yield this.disconnect();
                return result;
            }
            catch (err) {
                throw err;
            }
        });
    }
    withSubscriptionAsync(connectionPoint, parameters, func) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.withSessionAsync(connectionPoint, (session) => __awaiter(this, void 0, void 0, function* () {
                node_opcua_assert_1.assert(session, " session must exist");
                const subscription = new client_subscription_impl_1.ClientSubscriptionImpl(session, parameters);
                // tslint:disable-next-line:no-empty
                subscription.on("started", () => {
                }).on("internal_error", (err) => {
                    debugLog(" received internal error", err.message);
                }).on("keepalive", () => {
                }).on("terminated", (err) => {
                    // console.log(" terminated");
                });
                try {
                    const result = yield func(session, subscription);
                    return result;
                }
                catch (_a) {
                    return undefined;
                }
                finally {
                    yield subscription.terminate();
                }
            }));
        });
    }
    reactivateSession(session, callback) {
        const internalSession = session;
        node_opcua_assert_1.assert(typeof callback === "function");
        node_opcua_assert_1.assert(this._secureChannel, " client must be connected first");
        // istanbul ignore next
        if (!this.__resolveEndPoint() || !this.endpoint) {
            return callback(new Error(" End point must exist " + this._secureChannel.endpointUrl));
        }
        node_opcua_assert_1.assert(!internalSession._client || internalSession._client.endpointUrl === this.endpointUrl, "cannot reactivateSession on a different endpoint");
        const old_client = internalSession._client;
        debugLog("OPCUAClientImpl#reactivateSession");
        this._activateSession(internalSession, (err /*, newSession?: ClientSessionImpl*/) => {
            if (!err) {
                if (old_client !== this) {
                    // remove session from old client:
                    if (old_client) {
                        old_client._removeSession(internalSession);
                        node_opcua_assert_1.assert(!_.contains(old_client._sessions, internalSession));
                    }
                    this._addSession(internalSession);
                    node_opcua_assert_1.assert(internalSession._client === this);
                    node_opcua_assert_1.assert(!internalSession._closed, "session should not vbe closed");
                    node_opcua_assert_1.assert(_.contains(this._sessions, internalSession));
                }
                callback();
            }
            else {
                // istanbul ignore next
                if (doDebug) {
                    debugLog(chalk_1.default.red.bgWhite("reactivateSession has failed !"), err.message);
                }
                callback(err);
            }
        });
    }
    /**
     * @internal
     * @private
     */
    _on_connection_reestablished(callback) {
        node_opcua_assert_1.assert(_.isFunction(callback));
        // call base class implementation first
        client_base_impl_1.ClientBaseImpl.prototype._on_connection_reestablished.call(this, ( /*err?: Error*/) => {
            reconnection_1.repair_client_sessions(this, callback);
        });
    }
    /**
     *
     * @internal
     * @private
     */
    __createSession_step2(session, callback) {
        util_1.callbackify(node_opcua_hostname_1.extractFullyQualifiedDomainName)(() => {
            this.__createSession_step3(session, callback);
        });
    }
    /**
     *
     * @internal
     * @private
     */
    __createSession_step3(session, callback) {
        node_opcua_assert_1.assert(typeof callback === "function");
        node_opcua_assert_1.assert(this._secureChannel);
        node_opcua_assert_1.assert(this.serverUri !== undefined, " must have a valid server URI");
        node_opcua_assert_1.assert(this.endpointUrl !== undefined, " must have a valid server endpointUrl");
        node_opcua_assert_1.assert(this.endpoint);
        const applicationUri = this._getApplicationUri();
        const applicationDescription = {
            applicationName: new node_opcua_data_model_1.LocalizedText({ text: this.applicationName, locale: null }),
            applicationType: node_opcua_service_endpoints_1.ApplicationType.Client,
            applicationUri,
            discoveryProfileUri: undefined,
            discoveryUrls: [],
            gatewayServerUri: undefined,
            productUri: "NodeOPCUA-Client"
        };
        // note : do not confuse CreateSessionRequest.clientNonce with OpenSecureChannelRequest.clientNonce
        //        which are two different nonce, with different size (although they share the same name )
        this.clientNonce = crypto.randomBytes(32);
        const request = new node_opcua_service_session_1.CreateSessionRequest({
            clientCertificate: this.getCertificate(),
            clientDescription: applicationDescription,
            clientNonce: this.clientNonce,
            endpointUrl: this.endpointUrl,
            maxResponseMessageSize: 800000,
            requestedSessionTimeout: this.requestedSessionTimeout,
            serverUri: this.serverUri,
            sessionName: this._nextSessionName()
        });
        // a client Nonce must be provided if security mode is set
        node_opcua_assert_1.assert(this._secureChannel.securityMode === node_opcua_service_secure_channel_1.MessageSecurityMode.None || request.clientNonce !== null);
        this.performMessageTransaction(request, (err, response) => {
            if (err) {
                return callback(err);
            }
            if (!response || !(response instanceof node_opcua_service_session_1.CreateSessionResponse)) {
                return callback(new Error("internal error"));
            }
            if (response.responseHeader.serviceResult === node_opcua_status_code_1.StatusCodes.BadTooManySessions) {
                return callback(new Error("Too Many Sessions : " + response.responseHeader.serviceResult.toString()));
            }
            if (response.responseHeader.serviceResult !== node_opcua_status_code_1.StatusCodes.Good) {
                err = new Error("Error " + response.responseHeader.serviceResult.name
                    + " " + response.responseHeader.serviceResult.description);
                return callback(err);
            }
            // istanbul ignore next
            if (!validateServerNonce(response.serverNonce)) {
                return callback(new Error("Invalid server Nonce"));
            }
            // todo: verify SignedSoftwareCertificates and  response.serverSignature
            session = session || new client_session_impl_1.ClientSessionImpl(this);
            session.name = request.sessionName || "";
            session.sessionId = response.sessionId;
            session.authenticationToken = response.authenticationToken;
            session.timeout = response.revisedSessionTimeout;
            session.serverNonce = response.serverNonce;
            session.serverCertificate = response.serverCertificate;
            session.serverSignature = response.serverSignature;
            debugLog("revised session timeout = ", session.timeout);
            response.serverEndpoints = response.serverEndpoints || [];
            if (!verifyEndpointDescriptionMatches(this, response.serverEndpoints)) {
                errorLog("Endpoint description previously retrieved with GetendpointsDescription");
                errorLog("CreateSessionResponse.serverEndpoints= ");
                errorLog(response.serverEndpoints);
                return callback(new Error("Invalid endpoint descriptions Found"));
            }
            // this._serverEndpoints = response.serverEndpoints;
            session.serverEndpoints = response.serverEndpoints;
            callback(null, session);
        });
    }
    /**
     * @internal
     * @private
     */
    _activateSession(session, callback) {
        // see OPCUA Part 4 - $7.35
        node_opcua_assert_1.assert(typeof callback === "function");
        // istanbul ignore next
        if (!this._secureChannel) {
            return callback(new Error(" No secure channel"));
        }
        const serverCertificate = session.serverCertificate;
        // If the securityPolicyUri is None and none of the UserTokenPolicies requires encryption,
        // the Client shall ignore the ApplicationInstanceCertificate (serverCertificate)
        node_opcua_assert_1.assert(serverCertificate === null || serverCertificate instanceof Buffer);
        const serverNonce = session.serverNonce;
        node_opcua_assert_1.assert(!serverNonce || serverNonce instanceof Buffer);
        // make sure session is attached to this client
        const _old_client = session._client;
        session._client = this;
        this.createUserIdentityToken(session, this.userIdentityInfo, (err, data) => {
            if (err) {
                session._client = _old_client;
                return callback(err);
            }
            data = data;
            const userIdentityToken = data.userIdentityToken;
            const userTokenSignature = data.userTokenSignature;
            // TODO. fill the ActivateSessionRequest
            // see 5.6.3.2 Parameters OPC Unified Architecture, Part 4 30 Release 1.02
            const request = new node_opcua_service_session_1.ActivateSessionRequest({
                // This is a signature generated with the private key associated with the
                // clientCertificate. The SignatureAlgorithm shall be the AsymmetricSignatureAlgorithm
                // specified in the SecurityPolicy for the Endpoint. The SignatureData type is defined in 7.30.
                clientSignature: this.computeClientSignature(this._secureChannel, serverCertificate, serverNonce) || undefined,
                // These are the SoftwareCertificates which have been issued to the Client application.
                // The productUri contained in the SoftwareCertificates shall match the productUri in the
                // ApplicationDescription passed by the Client in the CreateSession requests. Certificates without
                // matching productUri should be ignored.  Servers may reject connections from Clients if they are
                // not satisfied with the SoftwareCertificates provided by the Client.
                // This parameter only needs to be specified in the first ActivateSession request
                // after CreateSession.
                // It shall always be omitted if the maxRequestMessageSize returned from the Server in the
                // CreateSession response is less than one megabyte.
                // The SignedSoftwareCertificate type is defined in 7.31.
                clientSoftwareCertificates: [],
                // List of locale ids in priority order for localized strings. The first LocaleId in the list
                // has the highest priority. If the Server returns a localized string to the Client, the Server
                // shall return the translation with the highest priority that it can. If it does not have a
                // translation for any of the locales identified in this list, then it shall return the string
                // value that it has and include the locale id with the string.
                // See Part 3 for more detail on locale ids. If the Client fails to specify at least one locale id,
                // the Server shall use any that it has.
                // This parameter only needs to be specified during the first call to ActivateSession during
                // a single application Session. If it is not specified the Server shall keep using the current
                // localeIds for the Session.
                localeIds: [],
                // The credentials of the user associated with the Client application. The Server uses these
                // credentials to determine whether the Client should be allowed to activate a Session and what
                // resources the Client has access to during this Session. The UserIdentityToken is an extensible
                // parameter type defined in 7.35.
                // The EndpointDescription specifies what UserIdentityTokens the Server shall accept.
                userIdentityToken,
                // If the Client specified a user   identity token that supports digital signatures,
                // then it shall create a signature and pass it as this parameter. Otherwise the parameter
                // is omitted.
                // The SignatureAlgorithm depends on the identity token type.
                userTokenSignature
            });
            session.performMessageTransaction(request, (err1, response) => {
                if (!err1 && response && response.responseHeader.serviceResult === node_opcua_status_code_1.StatusCodes.Good) {
                    if (!(response instanceof node_opcua_service_session_1.ActivateSessionResponse)) {
                        return callback(new Error("Internal Error"));
                    }
                    session.serverNonce = response.serverNonce;
                    if (!validateServerNonce(session.serverNonce)) {
                        return callback(new Error("Invalid server Nonce"));
                    }
                    return callback(null, session);
                }
                else {
                    if (!err1 && response) {
                        err1 = new Error(response.responseHeader.serviceResult.toString());
                    }
                    session._client = _old_client;
                    return callback(err1);
                }
            });
        });
    }
    /**
     *
     * @private
     */
    _nextSessionName() {
        if (!this.___sessionName_counter) {
            this.___sessionName_counter = 0;
        }
        this.___sessionName_counter += 1;
        return this.clientName + this.___sessionName_counter;
    }
    /**
     *
     * @private
     */
    _getApplicationUri() {
        const certificate = this.getCertificate();
        let applicationUri;
        if (certificate) {
            const e = node_opcua_crypto_1.exploreCertificate(certificate);
            if (e.tbsCertificate.extensions !== null) {
                applicationUri = e.tbsCertificate.extensions.subjectAltName.uniformResourceIdentifier[0];
            }
            else {
                errorLog("Certificate has no extension");
                errorLog(node_opcua_crypto_1.toPem(certificate, "CERTIFICATE"));
                applicationUri = node_opcua_common_1.makeApplicationUrn(node_opcua_hostname_1.getFullyQualifiedDomainName(), this.applicationName);
            }
        }
        else {
            errorLog("client has no certificate");
            applicationUri = node_opcua_common_1.makeApplicationUrn(node_opcua_hostname_1.getFullyQualifiedDomainName(), this.applicationName);
        }
        return node_opcua_hostname_1.resolveFullyQualifiedDomainName(applicationUri);
    }
    /**
     *
     * @private
     */
    __resolveEndPoint() {
        this.securityPolicy = this.securityPolicy || node_opcua_secure_channel_1.SecurityPolicy.None;
        let endpoint = this.findEndpoint(this._secureChannel.endpointUrl, this.securityMode, this.securityPolicy);
        this.endpoint = endpoint;
        // this is explained here : see OPCUA Part 4 Version 1.02 $5.4.1 page 12:
        //   A  Client  shall verify the  HostName  specified in the  Server Certificate  is the same as the  HostName
        //   contained in the  endpointUrl  provided in the  EndpointDescription. If there is a difference  then  the
        //   Client  shall report the difference and may close the  SecureChannel.
        if (!this.endpoint) {
            if (this.endpoint_must_exist) {
                debugLog("OPCUAClientImpl#endpoint_must_exist = true and endpoint with url ", this._secureChannel.endpointUrl, " cannot be found");
                return false;
            }
            else {
                // fallback :
                // our strategy is to take the first server_end_point that match the security settings
                // ( is this really OK ?)
                // this will permit us to access a OPCUA Server using it's IP address instead of its hostname
                endpoint = this.findEndpointForSecurity(this.securityMode, this.securityPolicy);
                if (!endpoint) {
                    return false;
                }
                this.endpoint = endpoint;
            }
        }
        return true;
    }
    /**
     *
     * @private
     */
    _createSession(callback) {
        node_opcua_assert_1.assert(typeof callback === "function");
        node_opcua_assert_1.assert(this._secureChannel);
        if (!this.__resolveEndPoint() || !this.endpoint) {
            if (this._serverEndpoints) {
                debugLog(this._serverEndpoints.map((endpoint) => endpoint.endpointUrl + " " + endpoint.securityMode.toString() + " " + endpoint.securityPolicyUri));
            }
            return callback(new Error(" End point must exist " + this._secureChannel.endpointUrl));
        }
        this.serverUri = this.endpoint.server.applicationUri || "invalid application uri";
        this.endpointUrl = this._secureChannel.endpointUrl;
        const session = new client_session_impl_1.ClientSessionImpl(this);
        this.__createSession_step2(session, callback);
    }
    /**
     *
     * @private
     */
    computeClientSignature(channel, serverCertificate, serverNonce) {
        return node_opcua_secure_channel_1.computeSignature(serverCertificate, serverNonce || Buffer.alloc(0), this.getPrivateKey(), channel.securityPolicy);
    }
    _closeSession(session, deleteSubscriptions, callback) {
        node_opcua_assert_1.assert(_.isFunction(callback));
        node_opcua_assert_1.assert(_.isBoolean(deleteSubscriptions));
        // istanbul ignore next
        if (!this._secureChannel) {
            return callback(null); // new Error("no channel"));
        }
        node_opcua_assert_1.assert(this._secureChannel);
        if (!this._secureChannel.isValid()) {
            return callback(null);
        }
        if (this.isReconnecting) {
            errorLog("OPCUAClientImpl#_closeSession called while reconnection in progress ! What shall we do");
            return callback(null);
        }
        const request = new node_opcua_service_session_1.CloseSessionRequest({
            deleteSubscriptions
        });
        session.performMessageTransaction(request, (err, response) => {
            if (err) {
                callback(err);
            }
            else {
                callback(err, response);
            }
        });
    }
    /**
     *
     * @private
     */
    createUserIdentityToken(session, userIdentityInfo, callback) {
        function coerceUserIdentityInfo(identityInfo) {
            if (!identityInfo) {
                return { type: node_opcua_service_endpoints_1.UserTokenType.Anonymous };
            }
            if (identityInfo.hasOwnProperty("type")) {
                return identityInfo;
            }
            if (identityInfo.hasOwnProperty("userName")) {
                identityInfo.type = node_opcua_service_endpoints_1.UserTokenType.UserName;
                return identityInfo;
            }
            if (identityInfo.hasOwnProperty("certificateData")) {
                identityInfo.type = node_opcua_service_endpoints_1.UserTokenType.Certificate;
                return identityInfo;
            }
            identityInfo.type = node_opcua_service_endpoints_1.UserTokenType.Anonymous;
            return identityInfo;
        }
        userIdentityInfo = coerceUserIdentityInfo(userIdentityInfo);
        node_opcua_assert_1.assert(_.isFunction(callback));
        if (null === userIdentityInfo) {
            return callback(null, {
                userIdentityToken: null,
                userTokenSignature: {}
            });
        }
        let userIdentityToken;
        let userTokenSignature = {
            algorithm: undefined,
            signature: undefined
        };
        try {
            switch (userIdentityInfo.type) {
                case node_opcua_service_endpoints_1.UserTokenType.Anonymous:
                    userIdentityToken = createAnonymousIdentityToken(session);
                    break;
                case node_opcua_service_endpoints_1.UserTokenType.UserName: {
                    const userName = userIdentityInfo.userName || "";
                    const password = userIdentityInfo.password || "";
                    userIdentityToken = createUserNameIdentityToken(session, userName, password);
                    break;
                }
                case node_opcua_service_endpoints_1.UserTokenType.Certificate: {
                    const certificate = userIdentityInfo.certificateData;
                    const privateKey = userIdentityInfo.privateKey;
                    ({
                        userIdentityToken,
                        userTokenSignature
                    } = createX509IdentityToken(session, certificate, privateKey));
                    break;
                }
                default:
                    debugLog(" userIdentityInfo = ", userIdentityInfo);
                    return callback(new Error("CLIENT: Invalid userIdentityInfo"));
            }
        }
        catch (err) {
            if (typeof err === "string") {
                return callback(new Error("Create identity token failed " + userIdentityInfo.type + " " + err));
            }
            return callback(err);
        }
        return callback(null, { userIdentityToken, userTokenSignature });
    }
}
exports.OPCUAClientImpl = OPCUAClientImpl;
// tslint:disable:no-var-requires
// tslint:disable:max-line-length
const thenify = require("thenify");
OPCUAClientImpl.prototype.connect = thenify.withCallback(OPCUAClientImpl.prototype.connect);
OPCUAClientImpl.prototype.disconnect = thenify.withCallback(OPCUAClientImpl.prototype.disconnect);
/**
 * @method createSession
 * @async
 *
 * @example
 *     // create a anonymous session
 *     const session = await client.createSession();
 *
 * @example
 *     // create a session with a userName and password
 *     const userIdentityInfo  = {UserTokenType.UserName, userName: "JoeDoe", password:"secret"};
 *     const session = client.createSession(userIdentityInfo);
 *
 */
OPCUAClientImpl.prototype.createSession = thenify.withCallback(OPCUAClientImpl.prototype.createSession);
/**
 * @method changeSessionIdentity
 * @async
 */
OPCUAClientImpl.prototype.changeSessionIdentity = thenify.withCallback(OPCUAClientImpl.prototype.changeSessionIdentity);
/**
 * @method closeSession
 * @async
 * @example
 *    const session  = await client.createSession();
 *    await client.closeSession(session);
 */
OPCUAClientImpl.prototype.closeSession = thenify.withCallback(OPCUAClientImpl.prototype.closeSession);
OPCUAClientImpl.prototype.reactivateSession = thenify.withCallback(OPCUAClientImpl.prototype.reactivateSession);
//# sourceMappingURL=opcua_client_impl.js.map