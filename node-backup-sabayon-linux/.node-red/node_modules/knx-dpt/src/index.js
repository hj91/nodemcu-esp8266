const fs = require('fs');
const path = require('path');
const bufrev = require('./utils/buffer-reverse');
const mergeObjects = require('./utils/merge-objects');

/**
 * A collection of all layouts that are loaded.
 */
var layouts = {};

/**
 * A collection of all property types that are loaded.
 */
var proptypes = {};

/**
 * A collection of all datapoints that are currently loaded.
 * @type {{}}
 */
var datapoints = {};

/**
 * The folder that contains all layouts.
 * @type {string}
 */
var layoutDir = `${__dirname}/layouts`;

/**
 * The folder that contains all property types.
 * @type {string}
 */
var propDir = `${__dirname}/props`;

/**
 * The object that represents the library of datapoints
 * @type {{}}
 */
var dptlib = {
    formatAPDU: function (value, dpt) {
        return dpt.formatAPDU(value);
    },
    fromBuffer: function (buf, dpt) {
        return dpt.fromBuffer(buf);
    },
    loadLayout: function (layout) {
        // If layout contains list of layouts, load them separately
        if (Array.isArray(layout)) {
            layout.forEach(function (l) {
                dptlib.loadLayout(l);
            });
        } else {
            // Store the layout in the layouts object
            layouts[layout.id] = layout;
        }
    },
    loadPropType: function (proptype) {
        // If proptype contains list of proptypes, load them separately
        if (Array.isArray(proptype)) {
            proptype.forEach(function (p) {
                dptlib.loadPropType(p);
            });
        } else {
            // Store the proptype in the proptypes object
            proptypes[proptype.id] = proptype;
        }
    },
    /**
     * a generic DPT resolution function
     * @param dptid The datapoint id. Allowed formats: 9/"9"/"9.001"/"DPT9.001"
     */
    resolve: function (dptid) {
        var baseId = null;
        var subId = null;

        // Parse the dpt id
        // If it is a raw number
        if (typeof dptid === 'number' && isFinite(dptid)) {
            // we're passed in a raw number (9)
            baseId = dptid;
            // If it is a string
        } else if (typeof dptid == 'string') {
            var m = dptid.toUpperCase().match(/(\d+)(\.(\d+))?/);
            baseId = parseInt(m[1]);
            if (m[3]) {
                subId = m[3];
            }
        }

        // Verify whether it exists
        if (baseId === null || !layouts[baseId] || (subId !== null && !layouts[baseId].subs[subId])) {
            console.trace("no such DPT: %j", dptid);
            throw "No such DPT";
        } else {
            return buildDPT(baseId, subId);
        }
    }
};

/**
 * Return the library.
 */
module.exports = new Proxy(dptlib, {
    get: function (target, name) {
        // If target has the specified property, return it
        if (target[name])
            return target[name];

        // Check if string in format dpt*
        var m = name.match(/dpt(\d+)/);
        if (m) {
            return dptlib.resolve(`DPT${m[1]}`);
        }

        // Cannot get that property
        return undefined;
    }
});

/**
 * Load all property type specifications into the proptypes object.
 */
var propDirEntries = fs.readdirSync(propDir);
for (var i = 0; i < propDirEntries.length; i++) {
    // Get individual filename
    var filename = propDir + path.sep + propDirEntries[i];
    // Only load the file if it is not a directory
    if (!fs.lstatSync(filename).isDirectory()) {
        // Load the property from the file
        var prop = require(filename);

        // Load the property into the library
        dptlib.loadPropType(prop);
    }
}

/**
 * Load all datapoint specifications into the layouts object.
 */
var dirEntries = fs.readdirSync(layoutDir);
for (var i = 0; i < dirEntries.length; i++) {
    // Get individual filename
    var filename = layoutDir + path.sep + dirEntries[i];
    // Only load the file if it is not a directory
    if (!fs.lstatSync(filename).isDirectory()) {
        // Load the layout from the file
        var dptLayout = require(filename);

        // Load the layout into the library
        dptlib.loadLayout(dptLayout);
    }
}

/**
 * Builds an DPT
 * @param baseId
 * @param subId
 * @returns {*}
 */
var buildDPT = function (baseId, subId) {
    // Determine datapoint FQN
    var name = subId === null ? baseId.toString() : baseId.toString() + '.' + subId;

    // Check if datapoint is cached
    if (datapoints[name])
        return datapoints[name];

    // Not cached, so build the datapoint, first we determine the layout
    var specs = layouts[baseId];
    var layout = subId === null ? specs.base : mergeObjects(specs.base, specs.subs[subId]);

    // Then we build the base datapoint intformation
    var r = {};
    r.name = layout.name;
    r.desc = layout.desc;
    r.unit = layout.unit;
    r.use = layout.use;

    // First, determine the buffer size
    var bitsize = 0;
    for (var k in layout.props) {
        if (layout.props.hasOwnProperty(k)) {
            var prop = layout.props[k];
            if(prop.type === 'skip') {
                bitsize += prop.size;
                continue;
            }
            bitsize += proptypes[prop.type].size(prop);
        }
    }
    var bytesize = Math.ceil(bitsize / 8);

    // Define the formatAPDU function
    r.formatAPDU = function (input) {
        // Allocate buffer and needed counters
        var buffer = Buffer.alloc(bytesize);
        var bitsWritten = 0;

        // Check beforeSerialize
        if (layout.beforeSerialize && typeof layout.beforeSerialize === 'function') {
            input = layout.beforeSerialize(input);
        }

        // Write out all properties
        for (var pk in layout.props) {
            if (layout.props.hasOwnProperty(pk)) {
                var pv = layout.props[pk];

                // If property type is skip, increment bits written and go to next
                if (pv.type === "skip") {
                    bitsWritten += pv.size;
                    continue;
                }

                // Get value from input
                var value;
                if (pv.hasOwnProperty("index") && pv.index !== null) {
                    if (typeof pv.index === 'string') {
                        value = input;
                        if (pv.index !== '') {
                            pv.index.split('.').forEach(function (p) {
                                value = value[p];
                            });
                        }
                    } else if (typeof pv.index === 'object') {
                        value = pv.index.get(input);
                    }
                }

                // Map if necessary
                if (pv.range && pv.mapRangeTo) {
                    var lowerBound = null;
                    var upperBound = null;
                    // Find upper and lower bound
                    for (var i = 0; i < pv.mapRangeTo.length; i++) {
                        var point = pv.mapRangeTo[i];
                        lowerBound = point[1] <= value && (lowerBound === null || point[1] >= lowerBound[1]) ? point : lowerBound;
                        upperBound = point[1] >= value && (upperBound === null || point[1] <= upperBound[1]) ? point : upperBound;
                    }
                    // Check if value is a defined point
                    if (lowerBound !== null && lowerBound[1] === value) {
                        value = lowerBound[0];
                    } else if (upperBound !== null && upperBound[1] === value) {
                        value = upperBound[0];
                    } else {
                        value = (value - lowerBound[1]) * (upperBound[0] - lowerBound[0]) / (upperBound[1] - lowerBound[1]) + lowerBound[0];
                    }
                }

                // Check range
                if (pv.range) {
                    if (value < pv.range[0] || value > pv.range[1]) {
                        throw `Invalid range: ${pv.range[0]}<=${value}<=${pv.range[1]}`;
                    }
                }

                // Write value to buffer
                bitsWritten += proptypes[pv.type].write(pv, buffer, value, bitsWritten);
            }
        }

        // Apparently KNX wants to have the MSB first, so reverse the buffer
        bufrev(buffer);

        // Return the buffer with the formatted data
        return buffer;
    };

    // Define the fromBuffer function
    r.fromBuffer = function (buffer) {
        // First determine if buffer is correct size
        if (buffer.length != bytesize) throw "Buffer should be " + bytesize + " byte" + (bytesize > 1 ? "s" : "") + " long";

        // Apparently KNX wants to have the MSB first, so reverse the buffer
        bufrev(buffer);

        // Create result
        var result = null;
        if (typeof layout.beforeDeserialize === 'function') {
            result = layout.beforeDeserialize();
        } else {
            result = layout.beforeDeserialize;
        }

        // Read data from buffer
        var bitsRead = 0;
        for (var pk in layout.props) {
            if (layout.props.hasOwnProperty(pk)) {
                var pv = layout.props[pk];

                // If property type is skip, increment bits read and go to next
                if (pv.type === "skip") {
                    bitsRead += pv.size;
                    continue;
                }

                // Read value from buffer
                var readOut = proptypes[pv.type].read(pv, buffer, bitsRead);
                bitsRead += readOut.bitsRead;
                var value = readOut.value;

                // Map if necessary
                if (pv.range && pv.mapRangeTo) {
                    var lowerBound = null;
                    var upperBound = null;
                    // Find upper and lower bound
                    for (var i = 0; i < pv.mapRangeTo.length; i++) {
                        var point = pv.mapRangeTo[i];
                        lowerBound = point[0] <= value && (lowerBound === null || point[0] >= lowerBound[0]) ? point : lowerBound;
                        upperBound = point[0] >= value && (upperBound === null || point[0] <= upperBound[0]) ? point : upperBound;
                    }
                    // Check if value is a defined point
                    if (lowerBound !== null && lowerBound[0] === value) {
                        value = lowerBound[1];
                    } else if (upperBound !== null && upperBound[0] === value) {
                        value = upperBound[1];
                    } else {
                        value = (value - lowerBound[0]) * (upperBound[1] - lowerBound[1]) / (upperBound[0] - lowerBound[0]) + lowerBound[1];
                    }
                }

                // Insert value into result
                if (pv.hasOwnProperty("index") && pv.index !== null) {
                    if (typeof pv.index === 'string') {
                        if (pv.index === '') {
                            result = value;
                        } else {
                            var selectionPath = pv.index.split('.');
                            var selected = result;
                            // Select correct part of result
                            for (var i = 0; i < selectionPath.length - 1; i++) {
                                selected = selected[selectionPath[i]] ? selected[selectionPath[i]] : selected[selectionPath[i]] = {};
                            }
                            // Set property
                            selected[selectionPath[selectionPath.length - 1]] = value;
                        }
                    } else if (typeof pv.index === 'object') {
                        pv.index.set(result, value);
                    }
                }
            }
        }

        // Run after deserialization code
        if (layout.afterDeserialize && typeof layout.afterDeserialize === 'function') {
            result = layout.afterDeserialize(result);
        }

        // Return the result
        return result;
    };

    // Return the built datapoint
    return datapoints[name] = r;
};