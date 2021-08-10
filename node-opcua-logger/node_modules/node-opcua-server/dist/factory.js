"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * @module node-opcua-server
 */
const _ = require("underscore");
const node_opcua_assert_1 = require("node-opcua-assert");
const node_opcua_extension_object_1 = require("node-opcua-extension-object");
const node_opcua_factory_1 = require("node-opcua-factory");
class Factory {
    constructor(engine) {
        node_opcua_assert_1.assert(_.isObject(engine));
        this.engine = engine;
    }
    constructObject(id) {
        const obj = node_opcua_factory_1.constructObject(id);
        if (!(obj instanceof node_opcua_extension_object_1.ExtensionObject)) {
            throw new Error("Internal Error constructObject");
        }
        return obj;
    }
}
exports.Factory = Factory;
//# sourceMappingURL=factory.js.map