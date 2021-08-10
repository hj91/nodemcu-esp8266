'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _assign = require('babel-runtime/core-js/object/assign');

var _assign2 = _interopRequireDefault(_assign);

exports.localPlace = localPlace;
exports.remotePlace = remotePlace;

var _semver = require('semver');

var _expandTemplate = require('expand-template');

var _expandTemplate2 = _interopRequireDefault(_expandTemplate);

var _os = require('os');

var _os2 = _interopRequireDefault(_os);

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

var _places = require('../places.json');

var _places2 = _interopRequireDefault(_places);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var expand = (0, _expandTemplate2.default)();

var PKG_CACHE_PATH = process.env.PKG_CACHE_PATH;

var cachePath = PKG_CACHE_PATH || _path2.default.join(_os2.default.homedir(), '.pkg-cache');

function tagFromVersion(version) {
  var mj = (0, _semver.major)(version);
  var mn = (0, _semver.minor)(version);
  return 'v' + mj + '.' + mn;
}

function localPlace(opts) {
  var p = _places2.default.localPlace;
  var version = opts.version;

  var tag = tagFromVersion(version);
  (0, _assign2.default)(opts, { tag: tag });
  var atHome = _path2.default.join(cachePath, p);
  return expand(_path2.default.resolve(atHome), opts);
}

function remotePlace(opts) {
  var p = _places2.default.remotePlace;
  var version = opts.version;

  var tag = tagFromVersion(version);
  (0, _assign2.default)(opts, { tag: tag });
  return { tag: tag, name: expand(p, opts) };
}