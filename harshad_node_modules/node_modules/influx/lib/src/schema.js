"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var grammar_1 = require("./grammar");
/**
 * The Schema provides information and utilities for an InfluxDB measurement.
 * @private
 */
var Schema = (function () {
    function Schema(options) {
        var _this = this;
        this.options = options;
        this.tagHash = {};
        // fieldNames are sorted for performance: when coerceFields is run the
        // fields will be added to the output in order.
        this.fieldNames = Object.keys(options.fields).sort();
        options.tags.forEach(function (tag) { _this.tagHash[tag] = true; });
    }
    /**
     * coerceFields converts a map of field values to a strings which
     * can be injected into the line protocol without further escaping.
     * The output is given in [key, value] pairs.
     */
    Schema.prototype.coerceFields = function (fields) {
        var _this = this;
        var consumed = 0;
        var output = [];
        this.fieldNames.forEach(function (field) {
            if (!fields.hasOwnProperty(field)) {
                return;
            }
            var value = fields[field];
            var typ = typeof value;
            consumed += 1;
            if (value == null) {
                return;
            }
            var coerced;
            switch (_this.options.fields[field]) {
                case grammar_1.FieldType.STRING:
                    coerced = grammar_1.escape.quoted(String(value));
                    break;
                case grammar_1.FieldType.INTEGER:
                    if (typ !== 'number' && !grammar_1.isNumeric(String(value))) {
                        throw new Error("Expected numeric value for " + _this.ref(field) + ", but got '" + value + "'!");
                    }
                    coerced = String(Math.floor(value)) + 'i';
                    break;
                case grammar_1.FieldType.FLOAT:
                    if (typ !== 'number' && !grammar_1.isNumeric(String(value))) {
                        throw new Error("Expected numeric value for " + _this.ref(field) + ", but got '" + value + "'!");
                    }
                    coerced = String(value);
                    break;
                case grammar_1.FieldType.BOOLEAN:
                    if (typ !== 'boolean') {
                        throw new Error("Expected boolean value for " + _this.ref(field) + ", but got a " + typ + "!");
                    }
                    coerced = value ? 'T' : 'F';
                    break;
                default:
                    throw new Error("Unknown field type " + _this.options.fields[field] + " for " + field + " in " +
                        (_this.ref() + ". Please ensure that your configuration is correct."));
            }
            output.push([field, coerced]);
        });
        var keys = Object.keys(fields);
        if (consumed !== keys.length) {
            var extraneous = keys.filter(function (f) { return _this.fieldNames.indexOf(f) === -1; });
            throw new Error("Extraneous fields detected for writing InfluxDB point in " +
                (this.ref() + ": `" + extraneous.join('`, `') + "`."));
        }
        return output;
    };
    /**
     * Throws an error if the tags include values other than
     * what was specified in the schema. It returns a list of tag names.
     */
    Schema.prototype.checkTags = function (tags) {
        var _this = this;
        var names = Object.keys(tags);
        var extraneous = names.filter(function (tag) { return !_this.tagHash[tag]; });
        if (extraneous.length > 0) {
            throw new Error("Extraneous tags detected for writing InfluxDB point in " +
                (this.ref() + ": `" + extraneous.join('`, `') + "`."));
        }
        return names;
    };
    /**
     * Returns the 'db'.'measurement'[.'field'] referencing the current schema.
     */
    Schema.prototype.ref = function (field) {
        var out = this.options.database + '.' + this.options.measurement;
        if (field) {
            out += '.' + field;
        }
        return out;
    };
    return Schema;
}());
exports.Schema = Schema;
/**
 * Coerces the field map to a set of writable values, a la coerceFields,
 * using native guesses based on the field datatypes.
 * @private
 */
function coerceBadly(fields) {
    return Object.keys(fields).sort().map(function (field) {
        var value = fields[field];
        if (typeof value === 'string') {
            return [field, grammar_1.escape.quoted(value)];
        }
        else {
            return [field, String(value)];
        }
    });
}
exports.coerceBadly = coerceBadly;
