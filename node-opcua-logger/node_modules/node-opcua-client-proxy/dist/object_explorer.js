"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * @module node-opcua-client-proxy
 */
const async = require("async");
const _ = require("underscore");
const node_opcua_assert_1 = require("node-opcua-assert");
const node_opcua_data_model_1 = require("node-opcua-data-model");
const node_opcua_service_call_1 = require("node-opcua-service-call");
const node_opcua_status_code_1 = require("node-opcua-status-code");
const node_opcua_utils_1 = require("node-opcua-utils");
const node_opcua_variant_1 = require("node-opcua-variant");
const proxy_1 = require("./proxy");
const proxy_variable_1 = require("./proxy_variable");
const resultMask = node_opcua_data_model_1.makeResultMask("ReferenceType | IsForward | BrowseName | NodeClass | TypeDefinition");
function convertNodeIdToDataType(dataTypeId) {
    return dataTypeId._dataType;
}
/**
 * @method convertNodeIdToDataTypeAsync
 *
 * @param session
 * @param dataTypeId
 * @param callback
 * @param callback.err
 * @param callback.dataType
 *
 *  @example
 *
 *      const dataTypeId  ="ns=0;i=11"; // Double
 *      convertNodeIdToDataTypeAsync(session,dataTypeId,function(err,dataType) {
 *          assert(!err && dataType === DataType.Double);
 *      });
 *
 *      const dataTypeId  ="ns=0;i=290"; // Duration => SubTypeOf Double
 *      convertNodeIdToDataTypeAsync(session,dataTypeId,function(err,dataType) {
 *          assert(!err && dataType === DataType.Double);
 *      });
 *
 * see also AddressSpace#findCorrespondingBasicDataType
 */
function convertNodeIdToDataTypeAsync(session, dataTypeId, callback) {
    const nodeToRead = {
        attributeId: node_opcua_data_model_1.AttributeIds.BrowseName,
        nodeId: dataTypeId,
    };
    session.read(nodeToRead, (err, dataValue) => {
        // istanbul ignore next
        if (err) {
            setImmediate(() => {
                callback(err);
            });
            return;
        }
        dataValue = dataValue;
        let dataType;
        // istanbul ignore next
        if (dataValue.statusCode !== node_opcua_status_code_1.StatusCodes.Good) {
            dataType = node_opcua_variant_1.DataType.Null;
            setImmediate(() => {
                callback(null, dataType);
            });
            return;
        }
        const dataTypeName = dataValue.value.value;
        if (dataTypeId.namespace === 0 && node_opcua_variant_1.DataType[dataTypeId.value]) {
            dataType = node_opcua_variant_1.DataType[dataTypeId.value];
            setImmediate(() => {
                callback(null, dataType);
            });
            return;
        }
        /// example => Duration (i=290) => Double (i=11)
        // read subTypeOf
        const nodeToBrowse = {
            browseDirection: node_opcua_data_model_1.BrowseDirection.Inverse,
            includeSubtypes: false,
            nodeId: dataTypeId,
            // BrowseDescription
            referenceTypeId: proxy_1.makeRefId("HasSubtype"),
            // xx nodeClassMask: makeNodeClassMask("ObjectType"),
            resultMask
        };
        // tslint:disable:no-shadowed-variable
        session.browse(nodeToBrowse, (err, browseResult) => {
            // istanbul ignore next
            if (err) {
                return callback(err);
            }
            const references = browseResult.references;
            if (!references || references.length !== 1) {
                return callback(new Error("cannot find SuperType of " + dataTypeName.toString()));
            }
            const nodeId = references[0].nodeId;
            return convertNodeIdToDataTypeAsync(session, nodeId, callback);
        });
    });
}
/**
 * @method add_method
 * @private
 */
function add_method(proxyManager, obj, reference, outerCallback) {
    const session = proxyManager.session;
    const name = node_opcua_utils_1.lowerFirstLetter(reference.browseName.name);
    obj[name] = function functionCaller(inputArgs, callback) {
        node_opcua_assert_1.assert(_.isFunction(callback));
        // convert input arguments into Variants
        const inputArgsDef = obj[name].inputArguments || [];
        const inputArguments = inputArgsDef.map((arg) => {
            const dataType = convertNodeIdToDataType(arg.dataType);
            const arrayType = (arg.valueRank === 1) ? node_opcua_variant_1.VariantArrayType.Array : node_opcua_variant_1.VariantArrayType.Scalar;
            // xx console.log("xxx ",arg.toString());
            const propName = node_opcua_utils_1.lowerFirstLetter(arg.name);
            const value = inputArgs[propName];
            if (value === undefined) {
                throw new Error("expecting input argument " + propName);
            }
            if (arrayType === node_opcua_variant_1.VariantArrayType.Array) {
                if (!_.isArray(value)) {
                    throw new Error("expecting value to be an Array or a TypedArray");
                }
            }
            return new node_opcua_variant_1.Variant({ arrayType, dataType, value });
        });
        const methodToCall = new node_opcua_service_call_1.CallMethodRequest({
            inputArguments,
            methodId: reference.nodeId,
            objectId: obj.nodeId,
        });
        session.call(methodToCall, (err, callResult) => {
            // istanbul ignore next
            if (err) {
                return callback(err);
            }
            callResult = callResult;
            if (callResult.statusCode !== node_opcua_status_code_1.StatusCodes.Good) {
                return callback(new Error("Error " + callResult.statusCode.toString()));
            }
            callResult.outputArguments = callResult.outputArguments || [];
            obj[name].outputArguments = obj[name].outputArguments || [];
            if (callResult.outputArguments.length !== obj[name].outputArguments.length) {
                return callback(new Error("Internal error callResult.outputArguments.length "
                    + callResult.outputArguments.length + " " + obj[name].outputArguments.length));
            }
            const outputArgs = {};
            const outputArgsDef = obj[name].outputArguments;
            _.zip(outputArgsDef, callResult.outputArguments).forEach((pair) => {
                const arg = pair[0];
                const variant = pair[1];
                const propName = node_opcua_utils_1.lowerFirstLetter(arg.name);
                outputArgs[propName] = variant.value;
            });
            callback(err, outputArgs);
        });
    };
    function extractDataType(arg, callback) {
        if (arg.dataType && arg.dataType._dataType) {
            setImmediate(callback); // already convertedr
            return;
        }
        convertNodeIdToDataTypeAsync(session, arg.dataType, (err, dataType) => {
            if (!err) {
                arg.dataType._dataType = dataType;
            }
            callback(err);
        });
    }
    const methodObj = {
        browseName: name,
        executableFlag: false,
        func: obj[name],
        nodeId: reference.nodeId,
    };
    obj.$methods[name] = methodObj;
    // tslint:disable:no-shadowed-variable
    async.parallel([
        (callback) => {
            session.getArgumentDefinition(reference.nodeId, (err, args) => {
                // istanbul ignore next
                if (err) {
                    setImmediate(() => {
                        callback(err);
                    });
                    return;
                }
                const inputArguments = args.inputArguments;
                const outputArguments = args.outputArguments;
                obj[name].inputArguments = inputArguments;
                obj[name].outputArguments = outputArguments;
                async.series([
                    (callback) => {
                        async.each(obj[name].inputArguments, extractDataType, (err) => callback(err));
                    },
                    (callback) => {
                        async.each(obj[name].outputArguments, extractDataType, (err) => callback(err));
                    }
                ], (err) => callback(err));
            });
        },
        (callback) => {
            proxyManager._monitor_execution_flag(methodObj, () => {
                callback();
            });
        }
    ], (err) => outerCallback(err));
}
function add_component(proxyManager, obj, reference, callback) {
    const session = proxyManager.session;
    const name = node_opcua_utils_1.lowerFirstLetter(reference.browseName.name || "");
    proxyManager.getObject(reference.nodeId, (err, childObj) => {
        // istanbul ignore else
        if (!err) {
            childObj = new ObjectExplorer({
                name,
                nodeId: reference.nodeId,
                parent: obj,
                proxyManager,
            });
            obj[name] = childObj;
            obj.$components.push(childObj);
            childObj.$resolve(callback);
        }
        else {
            callback(err);
        }
    });
}
function addFolderElement(proxyManager, obj, reference, callback) {
    const session = proxyManager.session;
    const name = node_opcua_utils_1.lowerFirstLetter(reference.browseName.name || "");
    const childObj = new ObjectExplorer({
        name,
        nodeId: reference.nodeId,
        parent: obj,
        proxyManager,
    });
    obj[name] = childObj;
    obj.$organizes.push(childObj);
    childObj.$resolve(callback);
}
function add_property(proxyManager, obj, reference, callback) {
    const session = proxyManager.session;
    const name = node_opcua_utils_1.lowerFirstLetter(reference.browseName.name || "");
    obj[name] = new proxy_variable_1.ProxyVariable(proxyManager, reference.nodeId, reference);
    obj.$properties[name] = obj[name];
    setImmediate(callback);
}
function add_typeDefinition(proxyManager, obj, references, callback) {
    const session = proxyManager.session;
    references = references || [];
    if (references.length !== 1) {
        // xx console.log(" cannot find type definition", references.length);
        setImmediate(callback);
        return;
    }
    const reference = references[0];
    node_opcua_assert_1.assert(!obj.typeDefinition, "type definition can only be set once");
    obj.typeDefinition = reference.browseName.name || "";
    setImmediate(callback);
}
function addFromState(proxyManager, obj, reference, callback) {
    proxyManager.getObject(reference.nodeId, (err, childObj) => {
        if (err) {
            callback(err);
        }
        obj.$fromState = childObj;
        callback();
    });
}
function addToState(proxyManager, obj, reference, callback) {
    proxyManager.getObject(reference.nodeId, (err, childObj) => {
        if (err) {
            callback(err);
        }
        obj.$toState = childObj;
        callback();
    });
}
class ObjectExplorer {
    constructor(options) {
        this.proxyManager = options.proxyManager;
        this.name = options.name;
        this.nodeId = options.nodeId;
        this.parent = options.parent;
    }
    $resolve(callback) {
        this.proxyManager.getObject(this.nodeId, (err, childObj) => {
            // istanbul ignore next
            if (err) {
                return callback(err);
            }
            this.parent[this.name] = childObj;
            this.parent.$components.push(childObj);
            callback();
        });
    }
}
exports.ObjectExplorer = ObjectExplorer;
function readUAStructure(proxyManager, obj, callback) {
    const session = proxyManager.session;
    //   0   Object
    //   1   Variable
    //   2   Method
    const nodeId = obj.nodeId;
    const nodesToBrowse = [
        // Components (except Methods)
        {
            // BrowseDescription
            browseDirection: node_opcua_data_model_1.BrowseDirection.Forward,
            includeSubtypes: true,
            nodeClassMask: node_opcua_data_model_1.makeNodeClassMask("Object | Variable"),
            nodeId,
            referenceTypeId: proxy_1.makeRefId("HasComponent"),
            resultMask,
        },
        // Properties
        {
            // BrowseDescription
            browseDirection: node_opcua_data_model_1.BrowseDirection.Forward,
            includeSubtypes: true,
            // nodeClassMask: makeNodeClassMask("Variable"),
            nodeId,
            referenceTypeId: proxy_1.makeRefId("HasProperty"),
            resultMask
        },
        // Methods
        {
            // BrowseDescription
            browseDirection: node_opcua_data_model_1.BrowseDirection.Forward,
            includeSubtypes: true,
            nodeClassMask: node_opcua_data_model_1.makeNodeClassMask("Method"),
            nodeId,
            referenceTypeId: proxy_1.makeRefId("HasComponent"),
            resultMask
        },
        // TypeDefinition
        {
            // BrowseDescription
            browseDirection: node_opcua_data_model_1.BrowseDirection.Both,
            includeSubtypes: true,
            nodeId,
            referenceTypeId: proxy_1.makeRefId("HasTypeDefinition"),
            resultMask
        },
        // FromState
        {
            // BrowseDescription
            browseDirection: node_opcua_data_model_1.BrowseDirection.Forward,
            includeSubtypes: true,
            nodeId,
            referenceTypeId: proxy_1.makeRefId("FromState"),
            resultMask
        },
        // ToState
        {
            // BrowseDescription
            browseDirection: node_opcua_data_model_1.BrowseDirection.Forward,
            includeSubtypes: true,
            nodeId,
            referenceTypeId: proxy_1.makeRefId("ToState"),
            resultMask
        },
        // (for folders ) Organizes
        {
            // BrowseDescription
            browseDirection: node_opcua_data_model_1.BrowseDirection.Forward,
            includeSubtypes: true,
            nodeId,
            referenceTypeId: proxy_1.makeRefId("Organizes"),
            resultMask
        }
    ];
    session.browse(nodesToBrowse, (err, browseResults) => {
        function t(references) {
            return references.map((r) => r.browseName.name + " " + r.nodeId.toString());
        }
        browseResults = browseResults || [];
        // istanbul ignore next
        if (err) {
            return callback(err);
        }
        // xx console.log("Components", t(results[0].references));
        // xx console.log("Properties", t(results[1].references));
        // xx console.log("Methods", t(results[2].references));
        async.parallel([
            (callback) => {
                async.map(browseResults[0].references, (reference, callback) => add_component(proxyManager, obj, reference, callback), (err) => callback(err));
            },
            (callback) => {
                async.map(browseResults[1].references, (reference, callback) => add_property(proxyManager, obj, reference, callback), (err) => callback(err));
            },
            // now enrich our object with nice callable async methods
            (callback) => {
                async.map(browseResults[2].references, (reference, callback) => add_method(proxyManager, obj, reference, callback), (err) => callback(err));
            },
            // now set typeDefinition
            (callback) => {
                add_typeDefinition(proxyManager, obj, browseResults[3].references, callback);
            },
            // FromState
            (callback) => {
                // fromState
                const reference = browseResults[4].references ? browseResults[4].references[0] : null;
                // fromState
                if (reference) {
                    return addFromState(proxyManager, obj, reference, callback);
                }
                callback();
            },
            // ToState
            (callback) => {
                const reference = browseResults[5].references ? browseResults[5].references[0] : null;
                // fromState
                if (reference) {
                    return addToState(proxyManager, obj, reference, callback);
                }
                callback();
            },
            // Organizes
            (callback) => {
                async.map(browseResults[6].references, (reference, callback) => addFolderElement(proxyManager, obj, reference, callback), (err) => callback(err));
            }
        ], (err) => callback(err));
    });
}
exports.readUAStructure = readUAStructure;
//# sourceMappingURL=object_explorer.js.map