'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _keys = require('babel-runtime/core-js/object/keys');

var _keys2 = _interopRequireDefault(_keys);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var b = process.binding('natives');
var list = (0, _keys2.default)(b).concat(['system' // esprima/bin/esvalidate.js
]);
exports.default = list.reduce(function (p, c) {
  p[c] = true;
  return p;
}, {});