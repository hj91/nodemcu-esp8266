/// <reference types="node" />
import { EventEmitter } from "events";
import { IRegisterServerManager } from "./I_register_server_manager";
export declare type EmptyCallback = (err?: Error) => void;
export declare enum RegisterServerManagerStatus {
    INACTIVE = 1,
    INITIALIZING = 2,
    REGISTERING = 3,
    WAITING = 4,
    UNREGISTERING = 5
}
/**
 * RegisterServerManager is responsible to Register an opcua server on a LDS or LDS-ME server
 * This class takes in charge :
 *  - the initial registration of a server
 *  - the regular registration renewal (every 8 minutes or so ...)
 *  - dealing with cases where LDS is not up and running when server starts.
 *    ( in this case the connection will be continuously attempted using the infinite
 *    back-off strategy
 *  - the un-registration of the server ( during shutdown for instance)
 *
 * Events:
 *
 * Emitted when the server is trying to registered the LDS
 * but when the connection to the lds has failed
 * serverRegistrationPending is sent when the backoff signal of the
 * connection process is rained
 * @event serverRegistrationPending
 *
 * emitted when the server is successfully registered to the LDS
 * @event serverRegistered
 *
 * emitted when the server has successfully renewed its registration to the LDS
 * @event serverRegistrationRenewed
 *
 * emitted when the server is successfully unregistered to the LDS
 * ( for instance during shutdown)
 * @event serverUnregistered
 *
 *
 * (LDS => Local Discovery Server)
 * @param options
 * @param options.server {OPCUAServer}
 * @param options.discoveryServerEndpointUrl {String}
 * @constructor
 */
export declare class RegisterServerManager extends EventEmitter implements IRegisterServerManager {
    discoveryServerEndpointUrl: string;
    private server;
    private readonly timeout;
    private _registrationTimerId;
    private state;
    private _registration_client;
    private selectedEndpoint;
    private _serverEndpoints;
    constructor(options: any);
    dispose(): void;
    _emitEvent(eventName: string): void;
    _setState(status: RegisterServerManagerStatus): void;
    start(callback: (err?: Error) => void): void;
    _establish_initial_connection(outer_callback: EmptyCallback): void;
    _trigger_next(): void;
    stop(outer_callback: EmptyCallback): void;
    /**
     * @param isOnline
     * @param outer_callback
     * @private
     */
    _registerServer(isOnline: boolean, outer_callback: EmptyCallback): void;
    private _cancel_pending_client_if_any;
}
