import { ClientSession, ClientSubscription } from "node-opcua-client";
import { NodeIdLike } from "node-opcua-nodeid";
import { ErrorCallback } from "./common";
import { ProxyStateMachineType } from "./state_machine_proxy";
export declare class UAProxyManager {
    readonly session: ClientSession;
    subscription?: ClientSubscription;
    private _map;
    constructor(session: ClientSession);
    start(callback: (err?: Error) => void): void;
    stop(): Promise<void>;
    stop(callback: (err?: Error) => void): void;
    getObject(nodeId: NodeIdLike): Promise<any>;
    getObject(nodeId: NodeIdLike, callback: (err: Error | null, object?: any) => void): void;
    _monitor_value(proxyObject: any, callback: ErrorCallback): void;
    _monitor_execution_flag(proxyObject: any, callback: (err?: Error) => void): void;
    getStateMachineType(nodeId: NodeIdLike, callback: (err: Error | null, stateMachineType?: ProxyStateMachineType) => void): void;
}
