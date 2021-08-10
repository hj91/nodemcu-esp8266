"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/* istanbul ignore file */
// tslint:disable:no-console
const os = require("os");
const node_opcua_assert_1 = require("node-opcua-assert");
const node_opcua_constants_1 = require("node-opcua-constants");
const node_opcua_server_1 = require("node-opcua-server");
const node_opcua_status_code_1 = require("node-opcua-status-code");
const node_opcua_variant_1 = require("node-opcua-variant");
// tslint:disable:no-var-requires
const humanize = require("humanize");
/**
 * @method addVariableWithHumanizeText
 * @param namespace
 * @param options
 * @param options.browseName
 * @private
 */
function addVariableWithHumanizeText(namespace, options) {
    node_opcua_assert_1.assert(options.componentOf || options.organizedBy);
    node_opcua_assert_1.assert(typeof options.description === "string");
    const variable = namespace.addVariable(options);
    // add the xxxAsText property
    namespace.addVariable({
        propertyOf: variable,
        browseName: options.browseName.name.toString() + "AsText",
        dataType: "String",
        description: options.description + " as text",
        minimumSamplingInterval: options.minimumSamplingInterval,
        value: {
            get() {
                const v = options.value.get();
                if (v instanceof node_opcua_variant_1.Variant) {
                    return new node_opcua_variant_1.Variant({ dataType: node_opcua_variant_1.DataType.String, value: humanize.filesize(v.value) });
                }
                else {
                    return v;
                }
            }
        }
    });
}
/**
 *
 * optionally install a CPU Usage and Memory Usage node
 * ( condition : running on linux and require("usage")
 * @method install_optional_cpu_and_memory_usage_node
 * @param server {OPCUAServer}
 *
 */
function install_optional_cpu_and_memory_usage_node(server) {
    const engine = server.engine;
    node_opcua_assert_1.assert(engine instanceof node_opcua_server_1.ServerEngine);
    let usage;
    try {
        usage = require("usage");
    }
    catch (err) {
        console.log("err", err.message);
        usage = null;
        // xx return;
    }
    const addressSpace = engine.addressSpace;
    const namespace = addressSpace.getOwnNamespace();
    const folder = addressSpace.findNode(node_opcua_constants_1.ObjectIds.Server_VendorServerInfo);
    let usage_result = { memory: 0, cpu: 100 };
    const pid = process.pid;
    if (usage) {
        const options = { keepHistory: true };
        setInterval(() => {
            usage.lookup(pid, options, (err, result) => {
                usage_result = result;
                console.log("result Used Memory: ", humanize.filesize(result.memory), " CPU ", Math.round(result.cpu), " %");
                if (err) {
                    console.log("err ", err);
                }
            });
        }, 1000);
        namespace.addVariable({
            organizedBy: folder,
            browseName: "CPUUsage",
            dataType: "Double",
            description: "Current CPU usage of the server process",
            minimumSamplingInterval: 1000,
            nodeId: "s=CPUUsage",
            value: {
                get: () => {
                    if (!usage_result) {
                        return node_opcua_status_code_1.StatusCodes.BadResourceUnavailable;
                    }
                    return new node_opcua_variant_1.Variant({ dataType: node_opcua_variant_1.DataType.Double, value: Math.round(usage_result.cpu) });
                }
            }
        });
        addVariableWithHumanizeText(namespace, {
            browseName: "MemoryUsage",
            dataType: "Number",
            description: "Current memory usage of the server process",
            minimumSamplingInterval: 1000,
            nodeId: "s=MemoryUsage",
            organizedBy: folder,
            value: {
                get: () => {
                    if (!usage_result) {
                        return node_opcua_status_code_1.StatusCodes.BadResourceUnavailable;
                    }
                    return new node_opcua_variant_1.Variant({ dataType: node_opcua_variant_1.DataType.UInt32, value: usage_result.memory });
                }
            }
        });
    }
    else {
        console.log("skipping installation of cpu_usage and memory_usage nodes");
    }
    namespace.addVariable({
        organizedBy: folder,
        browseName: "PercentageMemoryUsed",
        dataType: "Number",
        description: "% of  memory used by the server",
        minimumSamplingInterval: 1000,
        nodeId: "s=PercentageMemoryUsed",
        value: {
            get() {
                const percent_used = Math.round((os.totalmem() - os.freemem()) / os.totalmem() * 100);
                return new node_opcua_variant_1.Variant({ dataType: node_opcua_variant_1.DataType.Double, value: percent_used });
            }
        }
    });
    addVariableWithHumanizeText(namespace, {
        organizedBy: folder,
        accessLevel: "CurrentRead",
        browseName: "SystemMemoryTotal",
        dataType: "Number",
        description: "Total Memory usage of the server",
        minimumSamplingInterval: 1000,
        nodeId: "s=SystemMemoryTotal",
        value: {
            get() {
                const memory = os.totalmem();
                return new node_opcua_variant_1.Variant({ dataType: node_opcua_variant_1.DataType.UInt64, value: memory });
            }
        }
    });
    addVariableWithHumanizeText(namespace, {
        organizedBy: folder,
        accessLevel: "CurrentRead",
        browseName: "SystemMemoryFree",
        dataType: "Number",
        description: "Free Memory usage of the server in MB",
        minimumSamplingInterval: 1000,
        nodeId: "s=SystemMemoryFree",
        value: {
            get() {
                const memory = os.freemem();
                return new node_opcua_variant_1.Variant({ dataType: node_opcua_variant_1.DataType.UInt64, value: memory });
            }
        }
    });
    namespace.addVariable({
        organizedBy: folder,
        accessLevel: "CurrentRead",
        browseName: "NumberOfCPUs",
        dataType: "Number",
        description: "Number of cpus on the server",
        minimumSamplingInterval: 1000,
        nodeId: "s=NumberOfCPUs",
        value: {
            get() {
                return new node_opcua_variant_1.Variant({ dataType: node_opcua_variant_1.DataType.UInt32, value: os.cpus().length });
            }
        }
    });
    namespace.addVariable({
        organizedBy: folder,
        accessLevel: "CurrentRead",
        browseName: "Arch",
        dataType: "String",
        description: "ServerArchitecture",
        minimumSamplingInterval: 1000,
        nodeId: "s=ServerArchitecture",
        value: {
            get() {
                return new node_opcua_variant_1.Variant({ dataType: node_opcua_variant_1.DataType.String, value: os.type() });
            }
        }
    });
    addVariableWithHumanizeText(namespace, {
        organizedBy: folder,
        accessLevel: "CurrentRead",
        browseName: "BytesWritten",
        dataType: "Number",
        description: "number of bytes written by the server",
        minimumSamplingInterval: 1000,
        nodeId: "s=BytesWritten",
        value: {
            get() {
                return new node_opcua_variant_1.Variant({ dataType: node_opcua_variant_1.DataType.UInt64, value: server.bytesWritten });
            }
        }
    });
    addVariableWithHumanizeText(namespace, {
        organizedBy: folder,
        accessLevel: "CurrentRead",
        browseName: "BytesRead",
        dataType: "Number",
        description: "number of bytes read by the server",
        minimumSamplingInterval: 1000,
        nodeId: "s=BytesRead",
        value: {
            get() {
                return new node_opcua_variant_1.Variant({ dataType: node_opcua_variant_1.DataType.UInt64, value: server.bytesRead });
            }
        }
    });
    namespace.addVariable({
        organizedBy: folder,
        accessLevel: "CurrentRead",
        browseName: "TransactionsCount",
        dataType: "Number",
        description: "total number of transactions performed the server",
        minimumSamplingInterval: 1000,
        nodeId: "s=TransactionsCount",
        value: {
            get() {
                return new node_opcua_variant_1.Variant({ dataType: node_opcua_variant_1.DataType.UInt32, value: server.transactionsCount });
            }
        }
    });
    namespace.addVariable({
        organizedBy: folder,
        accessLevel: "CurrentRead",
        browseName: "ConnectionsCount",
        dataType: "String",
        description: "number of active Connections",
        minimumSamplingInterval: 1000,
        nodeId: "s=ConnectionCount",
        value: {
            get() {
                return new node_opcua_variant_1.Variant({ dataType: node_opcua_variant_1.DataType.String, value: humanize.filesize(server.currentChannelCount) });
            }
        }
    });
}
exports.install_optional_cpu_and_memory_usage_node = install_optional_cpu_and_memory_usage_node;
//# sourceMappingURL=vendor_diagnostic_nodes.js.map