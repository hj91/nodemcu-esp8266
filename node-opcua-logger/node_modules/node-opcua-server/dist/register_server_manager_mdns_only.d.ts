/**
 * @module node-opcua-server
 */
/// <reference types="node" />
import { EventEmitter } from "events";
import { IRegisterServerManager } from "./I_register_server_manager";
/**
 * a RegisterServerManager that declare the server the OPCUA Bonjour service
 * available on the current computer
 */
export declare class RegisterServerManagerMDNSONLY extends EventEmitter implements IRegisterServerManager {
    discoveryServerEndpointUrl: string;
    private server?;
    private bonjour;
    constructor(options: any);
    stop(callback: () => void): void;
    start(callback: () => void): void;
    dispose(): void;
}
