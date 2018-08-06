const test = require('tape');
const DPTLib = require('../../../src');

var dpt3 = DPTLib.resolve('DPT3');

var tests = [
    [[0x00], {incr_decr: 0, data: 0}], [[0x8], {incr_decr: 1, data: 0}],
    [[0x01], {incr_decr: 0, data: 1}], [[0x9], {incr_decr: 1, data: 1}],
    [[0x02], {incr_decr: 0, data: 2}], [[0xA], {incr_decr: 1, data: 2}],
    [[0x03], {incr_decr: 0, data: 3}], [[0xB], {incr_decr: 1, data: 3}],
    [[0x04], {incr_decr: 0, data: 4}], [[0xC], {incr_decr: 1, data: 4}],
    [[0x05], {incr_decr: 0, data: 5}], [[0xD], {incr_decr: 1, data: 5}],
    [[0x06], {incr_decr: 0, data: 6}], [[0xE], {incr_decr: 1, data: 6}],
    [[0x07], {incr_decr: 0, data: 7}], [[0xF], {incr_decr: 1, data: 7}],
];

test('DPT3 conversion', function (t) {
    t.plan(tests.length * 2);
    for (var i = 0; i < tests.length; i++) {
        var buf = new Buffer(tests[i][0]);
        var obj = tests[i][1];

        // backward test (object to raw data)
        converted = dpt3.formatAPDU(obj);
        t.deepEqual(converted, buf, `DPT3 formatAPDU ${JSON.stringify(obj)}`);

        // forward test (raw data to object)
        var converted = dpt3.fromBuffer(buf);
        t.deepEqual(converted, obj, `DPT3 fromBuffer ${JSON.stringify(buf)}`
        );
    }
    t.end();
});