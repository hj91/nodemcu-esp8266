/// <reference types="node" />
/**
 * @module node-opcua-server
 */
import { EventEmitter } from "events";
import { IRegisterServerManager } from "./I_register_server_manager";
/**
 * a IRegisterServerManager that hides the server from any local discover server
 *
 */
export declare class RegisterServerManagerHidden extends EventEmitter implements IRegisterServerManager {
    discoveryServerEndpointUrl: string;
    constructor(options?: any);
    stop(callback: () => void): void;
    start(callback: () => void): void;
    dispose(): void;
}
