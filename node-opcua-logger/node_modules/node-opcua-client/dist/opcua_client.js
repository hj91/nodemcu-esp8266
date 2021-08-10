"use strict";
/**
 * @module node-opcua-client
 */
Object.defineProperty(exports, "__esModule", { value: true });
const opcua_client_impl_1 = require("./private/opcua_client_impl");
class OPCUAClient {
    static create(options) {
        return new opcua_client_impl_1.OPCUAClientImpl(options);
    }
}
exports.OPCUAClient = OPCUAClient;
//# sourceMappingURL=opcua_client.js.map