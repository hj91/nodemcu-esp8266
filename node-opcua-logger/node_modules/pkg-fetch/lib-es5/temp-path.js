'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.tempPath = tempPath;

var _uniqueTempDir = require('unique-temp-dir');

var _uniqueTempDir2 = _interopRequireDefault(_uniqueTempDir);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function tempPath() {
  return _uniqueTempDir2.default.apply(undefined, arguments);
}