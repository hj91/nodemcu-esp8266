/**
 * @module node-opcua-client-proxy
 */
export declare class ProxyTransition {
    private _node;
    constructor(proxyNode: any);
    readonly nodeId: any;
    readonly browseName: any;
    readonly fromStateNode: any;
    readonly toStateNode: any;
}
export declare function makeProxyTransition(node: any): ProxyTransition;
