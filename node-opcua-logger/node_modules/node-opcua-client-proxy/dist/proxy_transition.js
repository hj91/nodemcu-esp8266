"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * @module node-opcua-client-proxy
 */
class ProxyTransition {
    constructor(proxyNode) {
        Object.defineProperty(this, "_node", { value: proxyNode, enumerable: false });
    }
    get nodeId() {
        // note stateNumber has no real dataValue
        return this._node.nodeId.value.toString();
    }
    get browseName() {
        return this._node.browseName.toString();
    }
    get fromStateNode() {
        return this._node.$fromState;
    }
    get toStateNode() {
        return this._node.$toState;
    }
}
exports.ProxyTransition = ProxyTransition;
function makeProxyTransition(node) {
    return new ProxyTransition(node);
}
exports.makeProxyTransition = makeProxyTransition;
//# sourceMappingURL=proxy_transition.js.map