const test = require('tape');
const DPTLib = require('../../../src');

var dpt = DPTLib.resolve('DPT9');

var tests = [
    [[0x00, 0x02], 0.02],
    [[0x87, 0xfe], -0.02],
    [[0x0c, 0x24], 21.2],
    [[0x0c, 0x7e], 23],
    [[0x5c, 0xc4], 24985.6],
    [[0xdb, 0x3c], -24985.6],
    [[0x7f, 0xfe], 670433.28],
    [[0xf8, 0x02], -670433.28],
];

var epsilon = 0.0001;

test('DPT9 floating point conversion', function(t) {
    for (var i = 0; i < tests.length; i++) {
        let buf = new Buffer(tests[i][0]);
        let val = tests[i][1];

        // backward test (value to raw data)
        let converted = dpt.formatAPDU(val);
        t.deepEqual(converted, buf,  `DPT9 formatAPDU value ${val}`);

        // forward test (raw data to value)
        converted = dpt.fromBuffer(buf);
        t.ok( Math.abs(converted - val) < 0.0001, `DPT9 fromBuffer value ${val}`);
    }
    t.end()
})