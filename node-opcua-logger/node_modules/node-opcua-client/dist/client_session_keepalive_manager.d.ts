/**
 * @module node-opcua-client
 */
/// <reference types="node" />
import { EventEmitter } from "events";
import { ServerState } from "node-opcua-common";
import { ClientSessionImpl } from "./private/client_session_impl";
export interface ClientSessionKeepAliveManagerEvents {
    on(event: "keepalive", eventHandler: (lastKnownServerState: ServerState) => void): ClientSessionKeepAliveManager;
}
export declare class ClientSessionKeepAliveManager extends EventEmitter implements ClientSessionKeepAliveManagerEvents {
    private readonly session;
    private timerId?;
    private pingTimeout;
    private lastKnownState?;
    private checkInterval;
    constructor(session: ClientSessionImpl);
    start(): void;
    stop(): void;
    /**
     * @method ping_server
     * @internal
     * when a session is opened on a server, the client shall send request on a regular basis otherwise the server
     * session object might time out.
     * start_ping make sure that ping_server is called on a regular basis to prevent session to timeout.
     *
     * @param callback
     */
    private ping_server;
}
