#!/usr/bin/env node
'use strict';

var _regenerator = require('babel-runtime/regenerator');

var _regenerator2 = _interopRequireDefault(_regenerator);

var _asyncToGenerator2 = require('babel-runtime/helpers/asyncToGenerator');

var _asyncToGenerator3 = _interopRequireDefault(_asyncToGenerator2);

var main = function () {
  var _ref = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee() {
    var argv, nodeRange, platform, arch, forceFetch, forceBuild, local;
    return _regenerator2.default.wrap(function _callee$(_context) {
      while (1) {
        switch (_context.prev = _context.next) {
          case 0:
            argv = (0, _minimist2.default)(process.argv.slice(2), {
              boolean: ['f', 'b'],
              string: ['n', 'p', 'a']
            });
            nodeRange = argv.n || argv._.shift();
            platform = argv.p || argv._.shift();
            arch = argv.a || argv._.shift();
            forceFetch = argv.f;
            forceBuild = argv.b;
            _context.next = 8;
            return (0, _index.need)({ nodeRange: nodeRange, platform: platform,
              arch: arch, forceFetch: forceFetch, forceBuild: forceBuild });

          case 8:
            local = _context.sent;

            _log.log.info(local);

          case 10:
          case 'end':
            return _context.stop();
        }
      }
    }, _callee, this);
  }));

  return function main() {
    return _ref.apply(this, arguments);
  };
}();

var _log = require('./log.js');

var _minimist = require('minimist');

var _minimist2 = _interopRequireDefault(_minimist);

var _index = require('./index.js');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

main().catch(function (error) {
  if (!error.wasReported) _log.log.error(error);
  process.exit(2);
});