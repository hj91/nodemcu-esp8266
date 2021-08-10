/**
 * @module node-opcua-client-private
 */
import { EndpointDescription } from "node-opcua-service-endpoints";
import { ClientSession } from "../client_session";
import { ClientSubscription, ClientSubscriptionOptions } from "../client_subscription";
import { OPCUAClient, OPCUAClientOptions, UserIdentityInfo, WithSessionFuncP, WithSubscriptionFuncP } from "../opcua_client";
import { ClientBaseImpl } from "./client_base_impl";
import { ClientSessionImpl } from "./client_session_impl";
export interface EndpointWithUserIdentity {
    endpointUrl: string;
    userIdentity: UserIdentityInfo;
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
export declare class OPCUAClientImpl extends ClientBaseImpl implements OPCUAClient {
    static create(options: OPCUAClientOptions): OPCUAClient;
    endpoint?: EndpointDescription;
    private endpoint_must_exist;
    private requestedSessionTimeout;
    private ___sessionName_counter;
    private userIdentityInfo;
    private serverUri?;
    private clientNonce?;
    constructor(options?: OPCUAClientOptions);
    /**
     * create and activate a new session
     * @async
     * @method createSession
     *
     *
     * @example :
     *     // create a anonymous session
     *     client.createSession(function(err,session) {
     *       if (err) {} else {}
     *     });
     *
     * @example :
     *     // create a session with a userName and password
     *     client.createSession({userName: "JoeDoe", password:"secret"}, function(err,session) {
     *       if (err) {} else {}
     *     });
     *
     */
    createSession(userIdentityInfo?: UserIdentityInfo): Promise<ClientSession>;
    createSession(userIdentityInfo?: UserIdentityInfo): Promise<ClientSession>;
    createSession(userIdentityInfo: UserIdentityInfo, callback: (err: Error | null, session?: ClientSession) => void): void;
    createSession(callback: (err: Error | null, session?: ClientSession) => void): void;
    /**
     * @method changeSessionIdentity
     * @param session
     * @param userIdentityInfo
     * @param callback
     * @async
     */
    changeSessionIdentity(session: ClientSession, userIdentityInfo: UserIdentityInfo): Promise<void>;
    changeSessionIdentity(session: ClientSession, userIdentityInfo: UserIdentityInfo, callback: (err?: Error) => void): void;
    /**
     *
     * @method closeSession
     * @async
     * @param session - the created client session
     * @param deleteSubscriptions  - whether to delete subscriptions or not
     */
    closeSession(session: ClientSession, deleteSubscriptions: boolean): Promise<void>;
    closeSession(session: ClientSession, deleteSubscriptions: boolean, callback: (err?: Error) => void): void;
    toString(): string;
    /**
     * @method withSession
     */
    withSession<T>(endpointUrl: string | EndpointWithUserIdentity, inner_func: (session: ClientSession) => Promise<T>): Promise<T>;
    withSession(endpointUrl: string | EndpointWithUserIdentity, inner_func: (session: ClientSession, done: (err?: Error) => void) => void, callback: (err?: Error) => void): void;
    withSubscription(endpointUrl: string | EndpointWithUserIdentity, subscriptionParameters: ClientSubscriptionOptions, innerFunc: (session: ClientSession, subscription: ClientSubscription, done: (err?: Error) => void) => void, callback: (err?: Error) => void): void;
    withSessionAsync(connectionPoint: string | EndpointWithUserIdentity, func: WithSessionFuncP<any>): Promise<any>;
    withSubscriptionAsync(connectionPoint: string | EndpointWithUserIdentity, parameters: ClientSubscriptionOptions, func: WithSubscriptionFuncP<any>): Promise<any>;
    /**
     * transfer session to this client
     * @method reactivateSession
     * @param session
     * @param callback
     * @return {*}
     */
    reactivateSession(session: ClientSession): Promise<void>;
    reactivateSession(session: ClientSession, callback: (err?: Error) => void): void;
    /**
     * @internal
     * @private
     */
    _on_connection_reestablished(callback: (err?: Error) => void): void;
    /**
     *
     * @internal
     * @private
     */
    __createSession_step2(session: ClientSessionImpl, callback: (err: Error | null, session?: ClientSessionImpl) => void): void;
    /**
     *
     * @internal
     * @private
     */
    __createSession_step3(session: ClientSessionImpl, callback: (err: Error | null, session?: ClientSessionImpl) => void): void;
    /**
     * @internal
     * @private
     */
    _activateSession(session: ClientSessionImpl, callback: (err: Error | null, session?: ClientSessionImpl) => void): void;
    /**
     *
     * @private
     */
    private _nextSessionName;
    /**
     *
     * @private
     */
    private _getApplicationUri;
    /**
     *
     * @private
     */
    private __resolveEndPoint;
    /**
     *
     * @private
     */
    private _createSession;
    /**
     *
     * @private
     */
    private computeClientSignature;
    private _closeSession;
    /**
     *
     * @private
     */
    private createUserIdentityToken;
}
