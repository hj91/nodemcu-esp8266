"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * FieldType is an enumeration of InfluxDB field data types.
 * @typedef {Number} FieldType
 * @example
 * import { FieldType } from 'influx'; // or const FieldType = require('influx').FieldType
 *
 * const schema = {
 *   measurement: 'my_measurement',
 *   fields: {
 *     my_int: FieldType.INTEGER,
 *     my_float: FieldType.FLOAT,
 *     my_string: FieldType.STRING,
 *     my_boolean: FieldType.BOOLEAN,
 *   }
 * }
 */
var FieldType;
(function (FieldType) {
    FieldType[FieldType["FLOAT"] = 0] = "FLOAT";
    FieldType[FieldType["INTEGER"] = 1] = "INTEGER";
    FieldType[FieldType["STRING"] = 2] = "STRING";
    FieldType[FieldType["BOOLEAN"] = 3] = "BOOLEAN";
})(FieldType = exports.FieldType || (exports.FieldType = {}));
function isNumeric(value) {
    return !Number.isNaN(Number(value));
}
exports.isNumeric = isNumeric;
/**
 * You can provide Raw values to Influx methods to prevent it from escaping
 * your provided string.
 * @class
 * @example
 * influx.createDatabase(new Influx.Raw('This won\'t be escaped!'));
 */
var Raw = (function () {
    /**
     * Wraps a string so that it is not escaped in Influx queries.
     * @param {String} value
     * @example
     * influx.createDatabase(new Influx.Raw('This won\'t be escaped!'));
     */
    function Raw(value) {
        this.value = value;
    }
    /**
     * Returns the wrapped string.
     * @return {String}
     */
    Raw.prototype.getValue = function () {
        return this.value;
    };
    return Raw;
}());
exports.Raw = Raw;
