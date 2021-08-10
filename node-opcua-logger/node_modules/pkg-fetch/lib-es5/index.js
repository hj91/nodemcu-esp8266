'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.system = exports.need = undefined;

var _regenerator = require('babel-runtime/regenerator');

var _regenerator2 = _interopRequireDefault(_regenerator);

var _stringify = require('babel-runtime/core-js/json/stringify');

var _stringify2 = _interopRequireDefault(_stringify);

var _keys = require('babel-runtime/core-js/object/keys');

var _keys2 = _interopRequireDefault(_keys);

var _asyncToGenerator2 = require('babel-runtime/helpers/asyncToGenerator');

var _asyncToGenerator3 = _interopRequireDefault(_asyncToGenerator2);

var need = exports.need = function () {
  var _ref = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee() {
    var opts = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
    var nodeRange, platform, arch, forceFetch, forceBuild, dryRun, satisfyingNodeVersion, nodeVersion, fetched, built, remote, fetchFailed;
    return _regenerator2.default.wrap(function _callee$(_context) {
      while (1) {
        switch (_context.prev = _context.next) {
          case 0:
            satisfyingNodeVersion = function satisfyingNodeVersion() {
              var versions = (0, _keys2.default)(_patches2.default).filter(function (nv) {
                return _semver2.default.satisfies(nv, nodeRange) || nodeRange === 'latest';
              }).sort(function (nv1, nv2) {
                return _semver2.default.gt(nv1, nv2);
              });
              return versions.pop();
            };

            // eslint-disable-line complexity
            nodeRange = opts.nodeRange, platform = opts.platform, arch = opts.arch, forceFetch = opts.forceFetch, forceBuild = opts.forceBuild, dryRun = opts.dryRun;

            if (nodeRange) {
              _context.next = 4;
              break;
            }

            throw (0, _log.wasReported)('nodeRange not specified');

          case 4:
            if (platform) {
              _context.next = 6;
              break;
            }

            throw (0, _log.wasReported)('platform not specified');

          case 6:
            if (arch) {
              _context.next = 8;
              break;
            }

            throw (0, _log.wasReported)('arch not specified');

          case 8:

            nodeRange = (0, _system.abiToNodeRange)(nodeRange); // 'm48' -> 'node6'

            if ((0, _system.isValidNodeRange)(nodeRange)) {
              _context.next = 11;
              break;
            }

            throw (0, _log.wasReported)('nodeRange must start with \'node\'');

          case 11:
            if (nodeRange !== 'latest') {
              nodeRange = 'v' + nodeRange.slice(4); // 'node6' -> 'v6' for semver
            }

            platform = (0, _system.toFancyPlatform)(platform); // win32 -> win
            arch = (0, _system.toFancyArch)(arch); // ia32 -> x86

            nodeVersion = satisfyingNodeVersion();

            if (nodeVersion) {
              _context.next = 17;
              break;
            }

            throw (0, _log.wasReported)('No available node version satisfies \'' + opts.nodeRange + '\'');

          case 17:
            fetched = (0, _places.localPlace)({ from: 'fetched', arch: arch, nodeVersion: nodeVersion, platform: platform, version: _package.version });
            built = (0, _places.localPlace)({ from: 'built', arch: arch, nodeVersion: nodeVersion, platform: platform, version: _package.version });
            remote = (0, _places.remotePlace)({ arch: arch, nodeVersion: nodeVersion, platform: platform, version: _package.version });
            fetchFailed = void 0;

            if (forceBuild) {
              _context.next = 28;
              break;
            }

            _context.next = 24;
            return (0, _fsExtra.exists)(fetched);

          case 24:
            if (!_context.sent) {
              _context.next = 28;
              break;
            }

            if (!dryRun) {
              _context.next = 27;
              break;
            }

            return _context.abrupt('return', 'exists');

          case 27:
            return _context.abrupt('return', fetched);

          case 28:
            if (forceFetch) {
              _context.next = 36;
              break;
            }

            _context.next = 31;
            return (0, _fsExtra.exists)(built);

          case 31:
            if (!_context.sent) {
              _context.next = 36;
              break;
            }

            if (!dryRun) {
              _context.next = 34;
              break;
            }

            return _context.abrupt('return', 'exists');

          case 34:
            if (forceBuild) _log.log.info('Reusing base binaries built locally:', built);
            return _context.abrupt('return', built);

          case 36:
            if (forceBuild) {
              _context.next = 44;
              break;
            }

            if (!dryRun) {
              _context.next = 39;
              break;
            }

            return _context.abrupt('return', 'fetched');

          case 39:
            _context.next = 41;
            return cloud.download(remote, fetched);

          case 41:
            if (!_context.sent) {
              _context.next = 43;
              break;
            }

            return _context.abrupt('return', fetched);

          case 43:
            fetchFailed = true;

          case 44:
            if (!dryRun && fetchFailed) {
              _log.log.info('Not found in GitHub releases:', (0, _stringify2.default)(remote));
            }
            if (!dryRun) {
              _log.log.info('Building base binary from source:', _path2.default.basename(built));
            }

            if (!(_system.hostPlatform !== platform)) {
              _context.next = 48;
              break;
            }

            throw (0, _log.wasReported)('Not able to build for \'' + opts.platform + '\' here, only for \'' + _system.hostPlatform + '\'');

          case 48:
            if (!(_system.hostArch !== arch)) {
              _context.next = 50;
              break;
            }

            throw (0, _log.wasReported)('Not able to build for \'' + opts.arch + '\' here, only for \'' + _system.hostArch + '\'');

          case 50:
            if (!(_system.knownArchs.indexOf(arch) < 0)) {
              _context.next = 52;
              break;
            }

            throw (0, _log.wasReported)('Unknown arch \'' + opts.arch + '\'. Specify ' + _system.knownArchs.join(', '));

          case 52:
            if (!dryRun) {
              _context.next = 54;
              break;
            }

            return _context.abrupt('return', 'built');

          case 54:
            _context.next = 56;
            return (0, _build2.default)(nodeVersion, arch, built);

          case 56:
            return _context.abrupt('return', built);

          case 57:
          case 'end':
            return _context.stop();
        }
      }
    }, _callee, this);
  }));

  return function need() {
    return _ref.apply(this, arguments);
  };
}();

var _system = require('./system.js');

var system = _interopRequireWildcard(_system);

var _places = require('./places.js');

var _log = require('./log.js');

var _cloud = require('./cloud.js');

var _build = require('./build.js');

var _build2 = _interopRequireDefault(_build);

var _fsExtra = require('fs-extra');

var _patches = require('../patches/patches.json');

var _patches2 = _interopRequireDefault(_patches);

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

var _semver = require('semver');

var _semver2 = _interopRequireDefault(_semver);

var _package = require('../package.json');

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var cloud = new _cloud.Cloud({ owner: 'zeit', repo: 'pkg-fetch' });

exports.system = system;