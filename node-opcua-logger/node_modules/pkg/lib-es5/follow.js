'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _promise = require('babel-runtime/core-js/promise');

var _promise2 = _interopRequireDefault(_promise);

exports.default = follow;

var _resolve = require('resolve');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function follow(x, opts) {
  return new _promise2.default(function (resolve) {
    resolve((0, _resolve.sync)(x, opts));
    // TODO own implementation with foreign tests
    // TODO async follow
    /*
        resolve_(x, opts, (error, result) => {
          if (error) return reject(error);
          resolve(result);
        });
    */
  });
}