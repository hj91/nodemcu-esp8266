import { OPCUASecureObject } from "node-opcua-common";
import { Certificate, Nonce } from "node-opcua-crypto";
import { ConnectionStrategy, ConnectionStrategyOptions, ErrorCallback, SecurityPolicy } from "node-opcua-secure-channel";
import { ServerOnNetwork } from "node-opcua-service-discovery";
import { ApplicationDescription, EndpointDescription } from "node-opcua-service-endpoints";
import { MessageSecurityMode } from "node-opcua-service-secure-channel";
import { ResponseCallback } from "../client_session";
import { Request, Response } from "../common";
import { CreateSecureChannelCallbackFunc, FindServersOnNetworkRequestLike, FindServersRequestLike, GetEndpointsOptions, OPCUAClientBase, OPCUAClientBaseOptions } from "../client_base";
import { ClientSessionImpl } from "./client_session_impl";
/**
 * @internal
 */
export declare class ClientBaseImpl extends OPCUASecureObject implements OPCUAClientBase {
    /**
     *
     */
    readonly timedOutRequestCount: any;
    /**
     * total number of transactions performed by the client
     * @property transactionsPerformed
     * @type {Number}
     */
    readonly transactionsPerformed: any;
    /**
     * is true when the client has already requested the server end points.
     * @property knowsServerEndpoint
     * @type boolean
     */
    readonly knowsServerEndpoint: boolean;
    /**
     * @property isReconnecting
     * @type {Boolean} true if the client is trying to reconnect to the server after a connection break.
     */
    readonly isReconnecting: boolean;
    /**
     * true if the connection strategy is set to automatically try to reconnect in case of failure
     * @property reconnectOnFailure
     * @type {Boolean}
     */
    readonly reconnectOnFailure: boolean;
    /**
     * total number of bytes read by the client
     * @property bytesRead
     * @type {Number}
     */
    readonly bytesRead: any;
    /**
     * total number of bytes written by the client
     * @property bytesWritten
     * @type {Number}
     */
    readonly bytesWritten: any;
    securityMode: MessageSecurityMode;
    securityPolicy: SecurityPolicy;
    serverCertificate?: Certificate;
    clientName: string;
    protocolVersion: 0;
    defaultSecureTokenLifetime: number;
    tokenRenewalInterval: number;
    connectionStrategy: ConnectionStrategy;
    keepPendingSessionsOnDisconnect: boolean;
    endpointUrl: string;
    discoveryUrl: string;
    readonly applicationName: string;
    keepSessionAlive: boolean;
    _sessions: any;
    protected _serverEndpoints: EndpointDescription[];
    protected _secureChannel: any;
    private _byteRead;
    private _byteWritten;
    private _timedOutRequestCount;
    private _transactionsPerformed;
    private reconnectionIsCanceled;
    constructor(options?: OPCUAClientBaseOptions);
    _cancel_reconnection(callback: ErrorCallback): void;
    _recreate_secure_channel(callback: ErrorCallback): void;
    _internal_create_secure_channel(connectionStrategy: ConnectionStrategyOptions, callback: CreateSecureChannelCallbackFunc): void;
    /**
     * connect the OPC-UA client to a server end point.
     * @async
     */
    connect(endpointUrl: string): Promise<void>;
    connect(endpointUrl: string, callback: ErrorCallback): void;
    getClientNonce(): Nonce;
    performMessageTransaction(request: Request, callback: ResponseCallback<Response>): void;
    /**
     *
     * return the endpoint information matching  security mode and security policy.
     * @method findEndpoint
     */
    findEndpointForSecurity(securityMode: MessageSecurityMode, securityPolicy: SecurityPolicy): EndpointDescription | undefined;
    /**
     *
     * return the endpoint information matching the specified url , security mode and security policy.
     * @method findEndpoint
     */
    findEndpoint(endpointUrl: string, securityMode: MessageSecurityMode, securityPolicy: SecurityPolicy): EndpointDescription | undefined;
    getEndpoints(options?: GetEndpointsOptions): Promise<EndpointDescription[]>;
    getEndpoints(options: GetEndpointsOptions, callback: ResponseCallback<EndpointDescription[]>): void;
    getEndpoints(callback: ResponseCallback<EndpointDescription[]>): void;
    getEndpointsRequest(options: any, callback: any): void;
    /**
     * @method findServers
     */
    findServers(options?: FindServersRequestLike): Promise<ApplicationDescription[]>;
    findServers(options: FindServersRequestLike, callback: ResponseCallback<ApplicationDescription[]>): void;
    findServers(callback: ResponseCallback<ApplicationDescription[]>): void;
    findServersOnNetwork(options?: FindServersOnNetworkRequestLike): Promise<ServerOnNetwork[]>;
    findServersOnNetwork(callback: ResponseCallback<ServerOnNetwork[]>): void;
    findServersOnNetwork(options: FindServersOnNetworkRequestLike, callback: ResponseCallback<ServerOnNetwork[]>): void;
    _removeSession(session: ClientSessionImpl): void;
    disconnect(): Promise<void>;
    disconnect(callback: ErrorCallback): void;
    _on_connection_reestablished(callback: ErrorCallback): void;
    toString(): string;
    protected _addSession(session: ClientSessionImpl): void;
    private fetchServerCertificate;
    private _destroy_secure_channel;
    private _close_pending_sessions;
    private _install_secure_channel_event_handlers;
}
