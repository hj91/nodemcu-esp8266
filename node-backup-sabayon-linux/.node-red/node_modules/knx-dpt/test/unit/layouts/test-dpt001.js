const test = require('tape');
const DPTLib = module.require('../../../src');

var dpt1 = DPTLib.dpt1;

var backward = [
    [0, [0x00]],
    [false, [0x00]],
    [1, [0x01]],
    [true, [0x01]]
];

var forward = [
    [[0x00], 0],
    [[0x01], 1]
];

test('DPT1 conversion', function (t) {
    t.plan(backward.length + forward.length);
    for (var i = 0; i < backward.length; i++) {
        var buf = new Buffer(backward[i][1]);
        var obj = backward[i][0];

        // backward test (object to raw data)
        converted = dpt1.formatAPDU(obj);
        t.deepEqual(converted, buf, `DPT1 formatAPDU ${JSON.stringify(obj)}`);
    }
    for (var i = 0; i < forward.length; i++) {
        // forward test (raw data to object)
        var buf = new Buffer(forward[i][0]);
        var obj = forward[i][1];
        var converted = dpt1.fromBuffer(buf);
        t.equal(converted, obj, `DPT18 fromBuffer ${JSON.stringify(buf)}`);
    }
    t.end();
});