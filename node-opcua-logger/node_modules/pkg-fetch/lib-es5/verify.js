'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.verify = undefined;

var _regenerator = require('babel-runtime/regenerator');

var _regenerator2 = _interopRequireDefault(_regenerator);

var _asyncToGenerator2 = require('babel-runtime/helpers/asyncToGenerator');

var _asyncToGenerator3 = _interopRequireDefault(_asyncToGenerator2);

var verify = exports.verify = function () {
  var _ref = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee(local) {
    return _regenerator2.default.wrap(function _callee$(_context) {
      while (1) {
        switch (_context.prev = _context.next) {
          case 0:
            _context.next = 2;
            return (0, _chmod.plusx)(local);

          case 2:
            _context.next = 4;
            return (0, _spawn.spawn)(local, ['-e', script], { env: { PKG_EXECPATH: 'PKG_INVOKE_NODEJS' } });

          case 4:
          case 'end':
            return _context.stop();
        }
      }
    }, _callee, this);
  }));

  return function verify(_x) {
    return _ref.apply(this, arguments);
  };
}();

var _chmod = require('./chmod.js');

var _spawn = require('./spawn.js');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var script = '\n  var vm = require(\'vm\');\n  var assert = require(\'assert\');\n  var text = \'(function () { return 42; })\';\n  var cd, fn, result;\n  var modules = process.versions.modules | 0;\n  var v8 = process.versions.v8.split(\'.\').slice(0, 2).join(\'.\');\n\n  var s1 = new vm.Script(text, { filename: \'s1\', produceCachedData: true, sourceless: true });\n  assert(s1.cachedDataProduced);\n  cd = s1.cachedData;\n\n  var kCpuFeaturesOffset, cpuFeatures;\n\n  if (modules === 14) {\n  } else\n  if (modules === 46 || modules === 48 || modules === 51) {\n    kCpuFeaturesOffset = 0x0c;\n  } else\n  if (modules === 57) {\n    if (v8 === \'6.2\') {\n      kCpuFeaturesOffset = 0x0c;\n    } else\n    if (v8 === \'5.8\') {\n      kCpuFeaturesOffset = 0x0c;\n    } else {\n      kCpuFeaturesOffset = 0x10;\n    }\n  } else\n  if (modules === 59) {\n    kCpuFeaturesOffset = 0x0c;\n  } else\n  if (modules === 64) {\n    kCpuFeaturesOffset = 0x0c;\n  } else {\n    assert(false, modules);\n  }\n\n  if (modules >= 46 && // no cpu_features field in 0.12\n      // non-zero features even in sourceless mode in arm\n      process.arch !== \'arm\') {\n    cpuFeatures = cd.readUInt32LE(kCpuFeaturesOffset);\n    assert(cpuFeatures === 0, \'CPU_FEATURES must be zero\');\n  }\n\n  var s2 = new vm.Script(undefined, { filename: \'s2\', cachedData: cd, sourceless: true });\n  fn = s2.runInThisContext();\n  result = fn();\n  assert.equal(result, 42);\n\n  if (modules === 14) {\n  } else\n  if (modules === 46 || modules === 48 ||\n      modules === 51 || modules === 57 || modules === 59 || modules === 64) {\n    var paddedPayloadOffset = 0x48; // see SerializedCodeData::Payload()\n    var index = paddedPayloadOffset + 10;\n    cd[index] ^= 0xf0;\n    var s3 = new vm.Script(undefined, { filename: \'s3\', cachedData: cd, sourceless: true });\n    assert(s3.cachedDataRejected, \'s3.cachedDataRejected must be true\');\n  } else {\n    assert(false, modules);\n  }\n\n  var s4 = new vm.Script(text, { filename: \'s4\', produceCachedData: true });\n  assert(s4.cachedDataProduced, \'s4.cachedDataProduced must be true\');\n  cd = s4.cachedData;\n\n  if (modules >= 46 && // no cpu_features field in 0.12\n      // zero features even in non-sourceless mode in arm\n      process.arch !== \'arm\') {\n    cpuFeatures = cd.readUInt32LE(kCpuFeaturesOffset);\n    assert(cpuFeatures !== 0, \'CPU_FEATURES must be non-zero\');\n  }\n\n  console.log(\'ok\');\n';