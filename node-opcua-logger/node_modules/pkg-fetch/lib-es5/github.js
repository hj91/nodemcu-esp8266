'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.GitHub = undefined;

var _regenerator = require('babel-runtime/regenerator');

var _regenerator2 = _interopRequireDefault(_regenerator);

var _asyncToGenerator2 = require('babel-runtime/helpers/asyncToGenerator');

var _asyncToGenerator3 = _interopRequireDefault(_asyncToGenerator2);

var _stringify = require('babel-runtime/core-js/json/stringify');

var _stringify2 = _interopRequireDefault(_stringify);

var _promise = require('babel-runtime/core-js/promise');

var _promise2 = _interopRequireDefault(_promise);

var _classCallCheck2 = require('babel-runtime/helpers/classCallCheck');

var _classCallCheck3 = _interopRequireDefault(_classCallCheck2);

var _createClass2 = require('babel-runtime/helpers/createClass');

var _createClass3 = _interopRequireDefault(_createClass2);

var _log = require('./log.js');

var _assert = require('assert');

var _assert2 = _interopRequireDefault(_assert);

var _fs = require('fs');

var _fs2 = _interopRequireDefault(_fs);

var _requestProgress = require('request-progress');

var _requestProgress2 = _interopRequireDefault(_requestProgress);

var _request = require('request');

var _request2 = _interopRequireDefault(_request);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var GitHub = exports.GitHub = function () {
  function GitHub(_ref) {
    var owner = _ref.owner,
        repo = _ref.repo;
    (0, _classCallCheck3.default)(this, GitHub);

    this.owner = owner;
    this.repo = repo;
    var _process$env = process.env,
        GITHUB_USERNAME = _process$env.GITHUB_USERNAME,
        GITHUB_PASSWORD = _process$env.GITHUB_PASSWORD;

    var auth = { user: GITHUB_USERNAME, pass: GITHUB_PASSWORD };
    this.request = _request2.default.defaults({
      auth: auth.user ? auth : undefined,
      headers: { 'User-Agent': this.owner + '/' + this.repo + '/' + GITHUB_USERNAME },
      timeout: 30 * 1000
    });
  }

  (0, _createClass3.default)(GitHub, [{
    key: 'getRelease',
    value: function getRelease(tag) {
      var _this = this;

      return new _promise2.default(function (resolve, reject) {
        var url = 'https://api.github.com/repos/' + _this.owner + '/' + _this.repo + '/releases/tags/' + tag;
        _this.request(url, function (error, response, body) {
          if (error) return reject((0, _log.wasReported)(error.message));
          var release = JSON.parse(body);
          var message = release.message;

          if (message === 'Not Found') return resolve(undefined);
          if (message) return reject((0, _log.wasReported)(message));
          resolve(release);
        });
      });
    }
  }, {
    key: 'getReleaseDraft',
    value: function getReleaseDraft(tag) {
      var _this2 = this;

      return new _promise2.default(function (resolve, reject) {
        var url = 'https://api.github.com/repos/' + _this2.owner + '/' + _this2.repo + '/releases';
        _this2.request(url, function (error, response, body) {
          if (error) return reject((0, _log.wasReported)(error.message));
          // here we use `get release by tag` endpoint
          // because draft releases are really `untagged`.
          // seems that `get release by tag` is for non-drafts.
          // hence listing all releases and looking through them
          var releases = JSON.parse(body);
          if (releases.message) return reject((0, _log.wasReported)(releases.message));
          var found = releases.filter(function (_ref2) {
            var tag_name = _ref2.tag_name;
            return tag_name === tag;
          }); // eslint-disable-line camelcase
          (0, _assert2.default)(found.length <= 1);
          if (!found.length) return resolve(undefined);
          resolve(found[0]);
        });
      });
    }
  }, {
    key: 'createRelease',
    value: function createRelease(tag) {
      var _this3 = this;

      return new _promise2.default(function (resolve, reject) {
        var form = (0, _stringify2.default)({
          tag_name: tag,
          target_commitish: 'master', // TODO maybe git rev-parse HEAD
          name: tag,
          draft: true,
          prerelease: true
        });
        var url = 'https://api.github.com/repos/' + _this3.owner + '/' + _this3.repo + '/releases';
        _this3.request.post(url, { form: form }, function (error, response, body) {
          if (error) return reject((0, _log.wasReported)(error.message));
          var release = JSON.parse(body);
          if (release.message) return reject((0, _log.wasReported)(release.message));
          resolve(release);
        });
      });
    }
  }, {
    key: 'uploadAsset',
    value: function uploadAsset(file, release, name) {
      var _this4 = this;

      (0, _assert2.default)(!/[\\/]/.test(name));
      return new _promise2.default(function (resolve, reject) {
        _fs2.default.stat(file, function (error, stat) {
          if (error) return reject(error);
          var headers = {
            'Content-Length': stat.size,
            'Content-Type': 'application/octet-stream'
          };
          var rs = _fs2.default.createReadStream(file);
          var subst = '?name=' + name;
          var url = release.upload_url.replace(/\{\?name,label\}/, subst);
          var req = _this4.request.post(url, {
            headers: headers, timeout: 30 * 60 * 1000
          }, function (error2, response, body) {
            if (error2) return reject((0, _log.wasReported)(error2.message));
            var asset = JSON.parse(body);
            var errors = asset.errors;

            if (errors && errors[0]) return reject((0, _log.wasReported)(errors[0].code));
            if (asset.message) return reject((0, _log.wasReported)(asset.message));
            resolve(asset);
          });
          rs.pipe(req);
        });
      });
    }
  }, {
    key: 'downloadUrl',
    value: function downloadUrl(url, file, short) {
      var _this5 = this;

      _log.log.enableProgress(short);
      _log.log.showProgress(0);
      return new _promise2.default(function (resolve, reject) {
        var headers = { Accept: 'application/octet-stream' };
        var ws = _fs2.default.createWriteStream(file);
        var result = void 0;
        var req = (0, _requestProgress2.default)(_this5.request.get(url, {
          headers: headers
        }, function (error, response) {
          if (error) {
            _log.log.disableProgress();
            return reject((0, _log.wasReported)(error.message));
          }
          if (response.statusCode !== 200) {
            _log.log.disableProgress();
            var message = response.statusCode + ' ' + response.body;
            return reject((0, _log.wasReported)(message, url));
          }
          result = response;
        }));
        req.on('progress', function (state) {
          var p = void 0;
          if (state.size && state.size.transferred && state.size.total) {
            p = state.size.transferred / state.size.total;
          } else {
            p = state.percentage;
          }
          _log.log.showProgress(p * 100);
        });
        req.pipe(ws);
        ws.on('close', function () {
          _log.log.showProgress(100);
          _log.log.disableProgress();
          resolve(result);
        }).on('error', function (error) {
          _log.log.disableProgress();
          reject((0, _log.wasReported)(error.message));
        });
      });
    }
  }, {
    key: 'tryDirectly',
    value: function () {
      var _ref3 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee(tag, name, file, short) {
        var url;
        return _regenerator2.default.wrap(function _callee$(_context) {
          while (1) {
            switch (_context.prev = _context.next) {
              case 0:
                _context.prev = 0;
                url = 'https://github.com/' + this.owner + '/' + this.repo + '/releases/download/' + tag + '/' + name;
                _context.next = 4;
                return this.downloadUrl(url, file, short);

              case 4:
                return _context.abrupt('return', true);

              case 7:
                _context.prev = 7;
                _context.t0 = _context['catch'](0);

                _log.log.info('Asset not found by direct link:', (0, _stringify2.default)({ tag: tag, name: name }));
                return _context.abrupt('return', false);

              case 11:
              case 'end':
                return _context.stop();
            }
          }
        }, _callee, this, [[0, 7]]);
      }));

      function tryDirectly(_x, _x2, _x3, _x4) {
        return _ref3.apply(this, arguments);
      }

      return tryDirectly;
    }()
  }]);
  return GitHub;
}(); /* eslint-disable camelcase */