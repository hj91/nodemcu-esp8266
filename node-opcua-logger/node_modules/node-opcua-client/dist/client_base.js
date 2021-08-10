"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_opcua_object_registry_1 = require("node-opcua-object-registry");
class OPCUAClientBase {
    static create(options) {
        /* istanbul ignore next*/
        throw new Error("Not Implemented");
    }
}
exports.OPCUAClientBase = OPCUAClientBase;
OPCUAClientBase.registry = new node_opcua_object_registry_1.ObjectRegistry();
//# sourceMappingURL=client_base.js.map