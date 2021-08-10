"use strict";
/**
 * @module node-opcua
 */
// tslint:disable:max-line-length
// tslint:disable:no-var-requires
// tslint:disable:no-console
// tslint:disable:variable-name
function __export(m) {
    for (var p in m) if (!exports.hasOwnProperty(p)) exports[p] = m[p];
}
Object.defineProperty(exports, "__esModule", { value: true });
const chalk_1 = require("chalk");
const semver = require("semver");
const minimumNodeVersionRequired = ">=8.0.0"; // minimum
// istanbul ignore next
if (!semver.satisfies(process.version, minimumNodeVersionRequired)) {
    console.log(chalk_1.default.cyan(`warning node-opcua: Required nodejs version ${minimumNodeVersionRequired} not satisfied with current nodejs version ${process.version}.`));
}
__export(require("node-opcua-common"));
var node_opcua_assert_1 = require("node-opcua-assert");
exports.assert = node_opcua_assert_1.assert;
__export(require("node-opcua-utils"));
var node_opcua_nodeid_1 = require("node-opcua-nodeid");
exports.NodeId = node_opcua_nodeid_1.NodeId;
exports.resolveNodeId = node_opcua_nodeid_1.resolveNodeId;
exports.makeNodeId = node_opcua_nodeid_1.makeNodeId;
exports.coerceNodeId = node_opcua_nodeid_1.coerceNodeId;
exports.sameNodeId = node_opcua_nodeid_1.sameNodeId;
exports.NodeIdType = node_opcua_nodeid_1.NodeIdType;
exports.ExpandedNodeId = node_opcua_nodeid_1.ExpandedNodeId;
exports.makeExpandedNodeId = node_opcua_nodeid_1.makeExpandedNodeId;
exports.coerceExpandedNodeId = node_opcua_nodeid_1.coerceExpandedNodeId;
var node_opcua_status_code_1 = require("node-opcua-status-code");
exports.StatusCode = node_opcua_status_code_1.StatusCode;
exports.StatusCodes = node_opcua_status_code_1.StatusCodes;
var node_opcua_constants_1 = require("node-opcua-constants");
exports.VariableTypeIds = node_opcua_constants_1.VariableTypeIds;
exports.VariableIds = node_opcua_constants_1.VariableIds;
exports.MethodIds = node_opcua_constants_1.MethodIds;
exports.ObjectIds = node_opcua_constants_1.ObjectIds;
exports.ObjectTypeIds = node_opcua_constants_1.ObjectTypeIds;
exports.ReferenceTypeIds = node_opcua_constants_1.ReferenceTypeIds;
exports.DataTypeIds = node_opcua_constants_1.DataTypeIds;
var node_opcua_variant_1 = require("node-opcua-variant");
exports.DataType = node_opcua_variant_1.DataType;
exports.Variant = node_opcua_variant_1.Variant;
exports.VariantArrayType = node_opcua_variant_1.VariantArrayType;
exports.buildVariantArray = node_opcua_variant_1.buildVariantArray;
var node_opcua_data_value_1 = require("node-opcua-data-value");
exports.DataValue = node_opcua_data_value_1.DataValue;
exports.sameDataValue = node_opcua_data_value_1.sameDataValue;
var node_opcua_numeric_range_1 = require("node-opcua-numeric-range");
exports.NumericRange = node_opcua_numeric_range_1.NumericRange;
var node_opcua_data_model_1 = require("node-opcua-data-model");
exports.AccessLevelFlag = node_opcua_data_model_1.AccessLevelFlag;
exports.makeAccessLevelFlag = node_opcua_data_model_1.makeAccessLevelFlag;
exports.LocalizedText = node_opcua_data_model_1.LocalizedText;
exports.coerceLocalizedText = node_opcua_data_model_1.coerceLocalizedText;
exports.QualifiedName = node_opcua_data_model_1.QualifiedName;
exports.coerceQualifiedName = node_opcua_data_model_1.coerceQualifiedName;
exports.NodeClass = node_opcua_data_model_1.NodeClass;
exports.NodeClassMask = node_opcua_data_model_1.NodeClassMask;
exports.AttributeIds = node_opcua_data_model_1.AttributeIds;
exports.BrowseDirection = node_opcua_data_model_1.BrowseDirection;
// basic_types
__export(require("node-opcua-basic-types"));
// DA
var node_opcua_data_access_1 = require("node-opcua-data-access");
exports.standardUnits = node_opcua_data_access_1.standardUnits;
exports.makeEUInformation = node_opcua_data_access_1.makeEUInformation;
exports.Range = node_opcua_data_access_1.Range;
__export(require("node-opcua-hostname"));
// services
__export(require("node-opcua-service-browse"));
__export(require("node-opcua-service-read"));
__export(require("node-opcua-service-write"));
__export(require("node-opcua-service-call"));
__export(require("node-opcua-service-session"));
__export(require("node-opcua-service-register-node"));
__export(require("node-opcua-service-endpoints"));
__export(require("node-opcua-service-subscription"));
// export * from "node-opcua-service-history";
__export(require("node-opcua-service-discovery"));
__export(require("node-opcua-service-secure-channel"));
__export(require("node-opcua-service-translate-browse-path"));
__export(require("node-opcua-service-query"));
__export(require("node-opcua-service-node-management"));
var node_opcua_data_model_2 = require("node-opcua-data-model");
exports.DiagnosticInfo = node_opcua_data_model_2.DiagnosticInfo;
var node_opcua_secure_channel_1 = require("node-opcua-secure-channel");
exports.SecurityPolicy = node_opcua_secure_channel_1.SecurityPolicy;
exports.MessageSecurityMode = node_opcua_secure_channel_1.MessageSecurityMode;
// -----------------------------------------------------------------------------
// Nodeset stuff
// -----------------------------------------------------------------------------
var node_opcua_nodesets_1 = require("node-opcua-nodesets");
exports.nodesets = node_opcua_nodesets_1.nodesets;
// an incomplete but sufficient nodeset file used during testing
var node_opcua_address_space_1 = require("node-opcua-address-space");
exports.get_empty_nodeset_filename = node_opcua_address_space_1.get_empty_nodeset_filename;
exports.get_mini_nodeset_filename = node_opcua_address_space_1.get_mini_nodeset_filename;
module.exports.utils = require("node-opcua-utils");
module.exports.hexDump = require("node-opcua-debug").hexDump;
// ----------------------------------------------------------------------------------------------------------
// client services
// ----------------------------------------------------------------------------------------------------------
__export(require("node-opcua-client"));
__export(require("node-opcua-client-proxy"));
__export(require("node-opcua-client-crawler"));
var node_opcua_transport_1 = require("node-opcua-transport");
exports.parseEndpointUrl = node_opcua_transport_1.parseEndpointUrl;
exports.is_valid_endpointUrl = node_opcua_transport_1.is_valid_endpointUrl;
// ----------------------------------------------------------------------------------------------------------
// server management
// ----------------------------------------------------------------------------------------------------------
__export(require("./server-stuff"));
// filtering tools
__export(require("node-opcua-service-filter"));
__export(require("node-opcua-address-space"));
// filtering tools
var node_opcua_service_filter_1 = require("node-opcua-service-filter");
exports.constructEventFilter = node_opcua_service_filter_1.constructEventFilter;
__export(require("node-opcua-transport"));
module.exports.OPCUADiscoveryServer = require("node-opcua-server-discovery").OPCUADiscoveryServer;
const address_space_for_conformance_testing = require("node-opcua-address-space-for-conformance-testing");
module.exports.build_address_space_for_conformance_testing =
    address_space_for_conformance_testing.build_address_space_for_conformance_testing;
module.exports.install_optional_cpu_and_memory_usage_node = require("node-opcua-vendor-diagnostic").install_optional_cpu_and_memory_usage_node;
//# sourceMappingURL=index.js.map