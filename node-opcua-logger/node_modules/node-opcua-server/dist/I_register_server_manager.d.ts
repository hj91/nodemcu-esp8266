/// <reference types="node" />
/**
 * @module node-opcua-server
 */
import { EventEmitter } from "events";
export interface IRegisterServerManager extends EventEmitter {
    discoveryServerEndpointUrl: string;
    start(callback: (err?: Error) => void): void;
    stop(callback: (err?: Error) => void): void;
    dispose(): void;
    on(eventName: "serverRegistrationPending", eventHandler: () => void): this;
    on(eventName: "serverRegistered", eventHandler: () => void): this;
    on(eventName: "serverRegistrationRenewed", eventHandler: () => void): this;
    on(eventName: "serverUnregistered", eventHandler: () => void): this;
}
