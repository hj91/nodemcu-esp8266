#!/usr/bin/env node
'use strict';

var _regenerator = require('babel-runtime/regenerator');

var _regenerator2 = _interopRequireDefault(_regenerator);

var _asyncToGenerator2 = require('babel-runtime/helpers/asyncToGenerator');

var _asyncToGenerator3 = _interopRequireDefault(_asyncToGenerator2);

var main = function () {
  var _ref = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee() {
    return _regenerator2.default.wrap(function _callee$(_context) {
      while (1) {
        switch (_context.prev = _context.next) {
          case 0:
            if (process.env.CHDIR && process.env.CHDIR !== process.cwd()) {
              // allow to override cwd by CHDIR env var
              // https://github.com/resin-io/etcher/pull/1713
              process.chdir(process.env.CHDIR);
            }

            _context.next = 3;
            return (0, _index.exec)(process.argv.slice(2));

          case 3:
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

var _index = require('./index.js');

var _log = require('./log.js');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

main().catch(function (error) {
  if (!error.wasReported) _log.log.error(error);
  process.exit(2);
});