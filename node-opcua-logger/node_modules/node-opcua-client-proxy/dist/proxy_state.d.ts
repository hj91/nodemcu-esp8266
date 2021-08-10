/**
 * @module node-opcua-client-proxy
 */
import { NodeId } from "node-opcua-nodeid";
export declare class ProxyState {
    private _node;
    constructor(proxyNode: any);
    readonly browseName: any;
    readonly stateNumber: any;
    readonly nodeId: NodeId;
    toString(): string;
}
export declare function makeProxyState(node: any): ProxyState;
