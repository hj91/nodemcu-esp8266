const test = require('tape');
const DPTLib = require('../../../src');

test('DPT5 conversion', function(t) {
    var tests = [
        ['DPT5',     [0x00], 0.00],
        // 5.001 percentage (0=0..ff=100%)
        ['DPT5.001', [0x00], 0],
        ['DPT5.001', [0x80], 50],
        ['DPT5.001', [0xff], 100],
        // 5.003 angle (degrees 0=0, ff=360)
        ['DPT5.003', [0x00], 0],
        ['DPT5.003', [0x80], 180],
        ['DPT5.003', [0xff], 360],
    ];

    t.plan(tests.length * 2);

    for (var i = 0; i < tests.length; i++) {
        let dpt = DPTLib.resolve(tests[i][0]);
        let buf = new Buffer(tests[i][1]);
        let val = tests[i][2];

        // forward test (raw data to value)
        let converted = DPTLib.fromBuffer(buf, dpt);
        //console.log('%s: %j --> %j',dpt.id, val, converted);
        t.equal(converted, val, `${tests[i][0]} fromBuffer ${val}`);

        // backward test (value to raw data)
        converted = DPTLib.formatAPDU(val, dpt);
        //console.log('%j --> %j', val, converted)
        t.deepEqual(converted, buf, `${tests[i][0]} formatAPDU ${val}`);
    }

    t.end()
});