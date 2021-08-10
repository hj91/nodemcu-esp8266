"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * @module node-opcua-client
 */
const node_opcua_assert_1 = require("node-opcua-assert");
const node_opcua_constants_1 = require("node-opcua-constants");
const node_opcua_data_model_1 = require("node-opcua-data-model");
const node_opcua_nodeid_1 = require("node-opcua-nodeid");
const node_opcua_service_translate_browse_path_1 = require("node-opcua-service-translate-browse-path");
const node_opcua_status_code_1 = require("node-opcua-status-code");
const node_opcua_utils_1 = require("node-opcua-utils");
function readHistoryServerCapabilities(session, callback) {
    if (!callback) {
        throw new Error("Internal error");
    }
    // display HistoryCapabilities of server
    const browsePath = node_opcua_service_translate_browse_path_1.makeBrowsePath(node_opcua_constants_1.ObjectIds.ObjectsFolder, "/Server/ServerCapabilities.HistoryServerCapabilities");
    session.translateBrowsePath(browsePath, (err, result) => {
        if (err) {
            return callback(err);
        }
        if (!result) {
            return callback(new Error("Internal Error"));
        }
        if (result.statusCode !== node_opcua_status_code_1.StatusCodes.Good) {
            return callback(new Error("StatusCode = " + result.statusCode.toString()));
        }
        result.targets = result.targets || [];
        const historyServerCapabilitiesNodeId = result.targets[0].targetId;
        // (should be ns=0;i=11192)
        node_opcua_assert_1.assert(historyServerCapabilitiesNodeId.toString() === "ns=0;i=11192");
        // -------------------------
        const properties = [
            "AccessHistoryDataCapability",
            "AccessHistoryEventsCapability",
            "DeleteAtTimeCapability",
            "DeleteRawCapability",
            "DeleteEventCapability",
            "InsertAnnotationCapability",
            "InsertDataCapability",
            "InsertEventCapability",
            "ReplaceDataCapability",
            "ReplaceEventCapability",
            "UpdateDataCapability",
            "UpdateEventCapability",
            "MaxReturnDataValues",
            "MaxReturnEventValues",
            "AggregateFunctions/AnnotationCount",
            "AggregateFunctions/Average",
            "AggregateFunctions/Count",
            "AggregateFunctions/Delta",
            "AggregateFunctions/DeltaBounds",
            "AggregateFunctions/DurationBad",
            "AggregateFunctions/DurationGood",
            "AggregateFunctions/DurationStateNonZero",
        ];
        const browsePaths = properties.map((prop) => node_opcua_service_translate_browse_path_1.makeBrowsePath(historyServerCapabilitiesNodeId, "." + prop));
        session.translateBrowsePath(browsePaths, (innerErr, results) => {
            if (innerErr) {
                return callback(innerErr);
            }
            if (!results) {
                return callback(new Error("Internal Error"));
            }
            const nodeIds = results.map((innerResult) => (innerResult.statusCode === node_opcua_status_code_1.StatusCodes.Good && innerResult.targets)
                ? innerResult.targets[0].targetId
                : node_opcua_nodeid_1.NodeId.nullNodeId);
            const nodesToRead = nodeIds.map((nodeId) => ({
                attributeId: node_opcua_data_model_1.AttributeIds.Value,
                nodeId /*: coerceNodeId(nodeId)*/
            }));
            const data = {};
            session.read(nodesToRead, (err2, dataValues) => {
                if (err2) {
                    return callback(err2);
                }
                if (!dataValues) {
                    return callback(new Error("Internal Error"));
                }
                for (let i = 0; i < dataValues.length; i++) {
                    const propName = node_opcua_utils_1.lowerFirstLetter(properties[i]);
                    data[propName] = dataValues[i].value;
                }
                callback(null, data);
            });
        });
    });
}
exports.readHistoryServerCapabilities = readHistoryServerCapabilities;
// tslint:disable:no-var-requires
const thenify = require("thenify");
const opts = { multiArgs: false };
module.exports.readHistoryServerCapabilities = thenify.withCallback(module.exports.readHistoryServerCapabilities, opts);
//# sourceMappingURL=read_history_server_capabilities.js.map