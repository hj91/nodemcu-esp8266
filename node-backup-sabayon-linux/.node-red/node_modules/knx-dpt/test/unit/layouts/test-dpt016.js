const test = require('tape');
const DPTLib = require('../../../src');

var dpt = DPTLib.resolve('DPT16');

var tests = [
    [[0x41, 0x42, 0x43, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00], "ABC"],
    [[0x4B, 0x4E, 0x58, 0x20, 0x69, 0x73, 0x20, 0x4F, 0x4B, 0x00, 0x00, 0x00, 0x00, 0x00], "KNX is OK"],
];

test('DPT16 conversion', function (t) {
    t.plan(tests.length * 2);
    for (var i = 0; i < tests.length; i++) {
        var buf = new Buffer(tests[i][0]);
        var obj = tests[i][1];

        // backward test (object to raw data)
        converted = dpt.formatAPDU(obj);
        t.deepEqual(converted, buf, `DPT16 formatAPDU ${JSON.stringify(obj)}`);

        // forward test (raw data to object)
        var converted = dpt.fromBuffer(buf);
        t.deepEqual(converted, obj, `DPT16 fromBuffer ${JSON.stringify(buf)}`
        );
    }
    t.end();
});