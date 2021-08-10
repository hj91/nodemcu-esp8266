"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * @module node-opcua-date-time
 */
const node_opcua_assert_1 = require("node-opcua-assert");
const date_time_1 = require("./date_time");
//  Date(year, month [, day, hours, minutes, seconds, ms])
function isValidDateTime(value) {
    return value instanceof Date;
}
exports.isValidDateTime = isValidDateTime;
/**
 * return a random integer value in the range of  min inclusive and  max exclusive
 * @method getRandomInt
 * @param min
 * @param max
 * @return {*}
 * @private
 */
function getRandomInt(min, max) {
    // note : Math.random() returns a random number between 0 (inclusive) and 1 (exclusive):
    return Math.floor(Math.random() * (max - min)) + min;
}
function randomDateTime() {
    const r = getRandomInt;
    return new Date(1900 + r(0, 200), r(0, 11), r(0, 28), r(0, 24), r(0, 59), r(0, 59), r(0, 1000));
}
exports.randomDateTime = randomDateTime;
/**
 *
 * @param date {Date}
 * @param picoseconds {null} {number of picoseconds to improve javascript date... }
 * @param stream {BinaryStream}
 */
function encodeHighAccuracyDateTime(date, picoseconds, stream) {
    if (date === null) {
        stream.writeUInt32(0);
        stream.writeUInt32(picoseconds % 100000);
        return;
    }
    if (!(date instanceof Date)) {
        throw new Error("Expecting a Date : but got a " + typeof (date) + " " + date.toString());
    }
    node_opcua_assert_1.assert(date instanceof Date);
    const hl = date_time_1.bn_dateToHundredNanoSecondFrom1601(date, picoseconds);
    const hi = hl[0];
    const lo = hl[1];
    stream.writeInteger(lo);
    stream.writeInteger(hi);
}
exports.encodeHighAccuracyDateTime = encodeHighAccuracyDateTime;
function encodeDateTime(date, stream) {
    encodeHighAccuracyDateTime(date, 0, stream);
}
exports.encodeDateTime = encodeDateTime;
/**
 *
 * @param stream
 * @returns {Date}
 */
function decodeDateTime(stream) {
    const lo = stream.readInteger();
    const hi = stream.readInteger();
    return date_time_1.bn_hundredNanoSecondFrom1601ToDate(hi, lo);
}
exports.decodeDateTime = decodeDateTime;
exports.decodeHighAccuracyDateTime = decodeDateTime;
function coerceDateTime(value) {
    if (value instanceof Date) {
        return value;
    }
    return new Date(value);
}
exports.coerceDateTime = coerceDateTime;
//# sourceMappingURL=encode_decode.js.map