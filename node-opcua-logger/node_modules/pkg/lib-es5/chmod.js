'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.plusx = undefined;

var _regenerator = require('babel-runtime/regenerator');

var _regenerator2 = _interopRequireDefault(_regenerator);

var _asyncToGenerator2 = require('babel-runtime/helpers/asyncToGenerator');

var _asyncToGenerator3 = _interopRequireDefault(_asyncToGenerator2);

var plusx = exports.plusx = function () {
  var _ref = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee(file) {
    var s, newMode, base8;
    return _regenerator2.default.wrap(function _callee$(_context) {
      while (1) {
        switch (_context.prev = _context.next) {
          case 0:
            _context.next = 2;
            return (0, _fsExtra.stat)(file);

          case 2:
            s = _context.sent;
            newMode = s.mode | 64 | 8 | 1;

            if (!(s.mode === newMode)) {
              _context.next = 6;
              break;
            }

            return _context.abrupt('return');

          case 6:
            base8 = newMode.toString(8).slice(-3);
            _context.next = 9;
            return (0, _fsExtra.chmod)(file, base8);

          case 9:
          case 'end':
            return _context.stop();
        }
      }
    }, _callee, this);
  }));

  return function plusx(_x) {
    return _ref.apply(this, arguments);
  };
}();

var _fsExtra = require('fs-extra');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }