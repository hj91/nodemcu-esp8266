"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
var grammar_1 = require("./grammar");
/**
 * A ResultError is thrown when a query generates errorful results from Influx.
 */
var ResultError = (function (_super) {
    __extends(ResultError, _super);
    function ResultError(message) {
        var _this = _super.call(this) || this;
        _this.message = "Error from InfluxDB: " + message;
        return _this;
    }
    return ResultError;
}(Error));
exports.ResultError = ResultError;
function groupMethod(matcher) {
    // We do a tiny bit of 'custom' deep equality checking here, taking
    // advantage of the fact that the tag keys are consistent across all
    // series results. This lets us match groupings much more efficiently,
    // ~6000x faster than the fastest vanilla equality checker (lodash)
    // when operating on large (~100,000 grouping) sets.
    var srcKeys = this.groupsTagsKeys;
    var dstKeys = Object.keys(matcher);
    if (srcKeys.length === 0 || srcKeys.length !== dstKeys.length) {
        return [];
    }
    L: for (var i = 0; i < this.groupRows.length; i += 1) {
        for (var k = 0; k < srcKeys.length; k += 1) {
            if (this.groupRows[i].tags[srcKeys[k]] !== matcher[srcKeys[k]]) {
                continue L;
            }
        }
        return this.groupRows[i].rows;
    }
    return [];
}
function groupsMethod() {
    return this.groupRows;
}
/**
 * Inner parsing function which unpacks the series into a table and attaches
 * methods to the array. This is quite optimized and a bit of a mess to read,
 * but it's all fairly easy procedural logic.
 *
 * We do this instead of subclassing Array since subclassing has some
 * undesirable side-effects. For example, calling .slice() on the array
 * makes it impossible to preserve groups as would be necessary if it's
 * subclassed.
 */
function parseInner(series, precision) {
    if (series === void 0) { series = []; }
    var results = [];
    var tags = results.groupsTagsKeys
        = series.length && series[0].tags ? Object.keys(series[0].tags) : [];
    var nextGroup = [];
    results.groupRows = new Array(series.length); // tslint:disable-line
    var lastEnd = 0;
    for (var i = 0; i < series.length; i += 1, lastEnd = results.length) {
        var _a = series[i], _b = _a.columns, columns = _b === void 0 ? [] : _b, _c = _a.values, values = _c === void 0 ? [] : _c;
        for (var k = 0; k < values.length; k += 1) {
            var obj = {};
            for (var j = 0; j < columns.length; j += 1) {
                if (columns[j] === 'time') {
                    obj.time = grammar_1.isoOrTimeToDate(values[k][j], precision);
                }
                else {
                    obj[columns[j]] = values[k][j];
                }
            }
            for (var j = 0; j < tags.length; j += 1) {
                obj[tags[j]] = series[i].tags[tags[j]];
            }
            results.push(obj);
            nextGroup.push(obj);
        }
        results.groupRows[i] = {
            name: series[i].name,
            rows: nextGroup,
            tags: series[i].tags || {},
        };
        nextGroup = [];
    }
    results.group = groupMethod;
    results.groups = groupsMethod;
    return results;
}
/**
 * Checks if there are any errors in the IResponse and, if so, it throws them.
 * @private
 * @throws {ResultError}
 */
function assertNoErrors(res) {
    for (var i = 0; i < res.results.length; i += 1) {
        var error = res.results[i].error;
        if (error) {
            throw new ResultError(error);
        }
    }
    return res;
}
exports.assertNoErrors = assertNoErrors;
/**
 * From parses out a response to a result or list of responses.
 * There are three situations we cover here:
 *  1. A single query without groups, like `select * from myseries`
 *  2. A single query with groups, generated with a `group by` statement
 *     which groups by series *tags*, grouping by times is case (1)
 *  3. Multiple queries of types 1 and 2
 * @private
 */
function parse(res, precision) {
    assertNoErrors(res);
    if (res.results.length === 1) {
        return parseInner(res.results[0].series, precision);
    }
    else {
        return res.results.map(function (result) { return parseInner(result.series, precision); });
    }
}
exports.parse = parse;
/**
 * parseSingle asserts that the response contains a single result,
 * and returns that result.
 * @throws {Error} if the number of results is not exactly one
 * @private
 */
function parseSingle(res, precision) {
    assertNoErrors(res);
    if (res.results.length !== 1) {
        throw new Error('node-influx expected the results length to equal 1, but ' +
            ("it was " + 0 + ". Please report this here: https://git.io/influx-err"));
    }
    return parseInner(res.results[0].series, precision);
}
exports.parseSingle = parseSingle;
