import { NodeId } from "node-opcua-nodeid";
import { UAProxyManager } from "./proxy_manager";
export interface ObjectExplorerOptions {
    proxyManager: UAProxyManager;
    name: string;
    nodeId: NodeId;
    parent: any;
}
declare type ErrorCallback = (err?: Error) => void;
export declare class ObjectExplorer {
    proxyManager: UAProxyManager;
    name: string;
    nodeId: NodeId;
    parent: any;
    constructor(options: ObjectExplorerOptions);
    $resolve(callback: (err?: Error) => void): void;
}
export declare function readUAStructure(proxyManager: UAProxyManager, obj: any, callback: ErrorCallback): void;
export {};
