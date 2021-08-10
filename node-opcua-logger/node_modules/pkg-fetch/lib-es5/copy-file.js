'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.copyFile = copyFile;
exports.moveFile = moveFile;

var _fsExtra = require('fs-extra');

var _fsExtra2 = _interopRequireDefault(_fsExtra);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function copyFile(src, dest) {
  return _fsExtra2.default.copy(src, dest);
}

function moveFile(src, dest) {
  return _fsExtra2.default.move(src, dest);
}