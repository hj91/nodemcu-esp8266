'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _mixer = require('./mixer');

var _mixer2 = _interopRequireDefault(_mixer);

var isFunction = function isFunction(val) {
  return typeof val === 'function';
};
var isNotFunction = function isNotFunction(val) {
  return !isFunction(val);
};

/**
 * Regular mixin function.
 */
var mixin = (0, _mixer2['default'])();

/**
 * Mixin functions only.
 */
var mixinFunctions = (0, _mixer2['default'])({
  filter: isFunction
});

/**
 * Mixin functions including prototype chain.
 */
var mixinChainFunctions = (0, _mixer2['default'])({
  filter: isFunction,
  chain: true
});

/**
 * Regular object merge function. Ignores functions.
 */
var merge = (0, _mixer2['default'])({
  deep: true
});

/**
 * Regular object merge function. Ignores functions.
 */
var mergeUnique = (0, _mixer2['default'])({
  deep: true,
  noOverwrite: true
});

/**
 * Merge objects including prototype chain properties.
 */
var mergeChainNonFunctions = (0, _mixer2['default'])({
  filter: isNotFunction,
  deep: true,
  chain: true
});

exports['default'] = _mixer2['default'];
exports.mixin = mixin;
exports.mixinFunctions = mixinFunctions;
exports.mixinChainFunctions = mixinChainFunctions;
exports.merge = merge;
exports.mergeUnique = mergeUnique;
exports.mergeChainNonFunctions = mergeChainNonFunctions;