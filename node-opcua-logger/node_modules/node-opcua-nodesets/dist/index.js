"use strict";
/**
 * @module node-opcua-nodesets
 */
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const path = require("path");
function constructNodesetFilename(filename) {
    const dirname = __dirname;
    let file = path.join(dirname, "../nodesets", filename);
    if (!fs.existsSync(file)) {
        if (!process.argv[1]) {
            throw new Error("Please make sure that nodeset can be found in " + path.join(dirname, "../nodesets"));
        }
        // let's find alternate places where to find the nodeset folder
        let appfolder = path.dirname(process.argv[1]);
        file = path.join(appfolder, "nodesets", filename);
        if (!fs.existsSync(file)) {
            appfolder = process.cwd();
            file = path.join(appfolder, "nodesets", filename);
        }
    }
    return file;
}
exports.constructNodesetFilename = constructNodesetFilename;
// {{ --------------------------------------------------------------
//   this block is use to force pkg to import nodesets in package
path.join(__dirname, "nodesets/Opc.Ua.NodeSet2.xml");
path.join(__dirname, "nodesets/Opc.Ua.Di.NodeSet2.xml");
path.join(__dirname, "nodesets/Opc.Ua.Adi.NodeSet2.xml");
path.join(__dirname, "nodesets/Opc.Ua.AutoID.NodeSet2.xml");
// ------------------------------------------------------------- }}
exports.standardNodeSetFilename = constructNodesetFilename("Opc.Ua.NodeSet2.xml");
exports.diNodeSetFilename = constructNodesetFilename("Opc.Ua.Di.NodeSet2.xml");
exports.adiNodeSetFilename = constructNodesetFilename("Opc.Ua.Adi.NodeSet2.xml");
exports.gdsNodeSetFilename = constructNodesetFilename("Opc.Ua.Gds.NodeSet2.xml");
exports.autoIdNodeSetFilename = constructNodesetFilename("Opc.Ua.AutoID.NodeSet2.xml");
exports.standard_nodeset_file = exports.standardNodeSetFilename;
exports.di_nodeset_filename = exports.diNodeSetFilename;
exports.adi_nodeset_filename = exports.adiNodeSetFilename;
exports.gds_nodeset_filename = exports.gdsNodeSetFilename;
exports.nodesets = {
    adi: exports.adiNodeSetFilename,
    adiNodeSetFilename: exports.adiNodeSetFilename,
    adi_nodeset_filename: exports.adiNodeSetFilename,
    di: exports.diNodeSetFilename,
    diNodeSetFilename: exports.diNodeSetFilename,
    di_nodeset_filename: exports.diNodeSetFilename,
    standard: exports.standardNodeSetFilename,
    standardNodeSetFilename: exports.standardNodeSetFilename,
    standard_nodeset_file: exports.standardNodeSetFilename,
    gds: exports.gdsNodeSetFilename,
    gdsNodeSetFilename: exports.gdsNodeSetFilename,
    gds_nodeset_filename: exports.gdsNodeSetFilename,
    autoId: exports.autoIdNodeSetFilename
};
//# sourceMappingURL=index.js.map