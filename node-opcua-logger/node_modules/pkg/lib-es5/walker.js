'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _assign = require('babel-runtime/core-js/object/assign');

var _assign2 = _interopRequireDefault(_assign);

var _regenerator = require('babel-runtime/regenerator');

var _regenerator2 = _interopRequireDefault(_regenerator);

var _asyncToGenerator2 = require('babel-runtime/helpers/asyncToGenerator');

var _asyncToGenerator3 = _interopRequireDefault(_asyncToGenerator2);

var _classCallCheck2 = require('babel-runtime/helpers/classCallCheck');

var _classCallCheck3 = _interopRequireDefault(_classCallCheck2);

var _createClass2 = require('babel-runtime/helpers/createClass');

var _createClass3 = _interopRequireDefault(_createClass2);

var _getIterator2 = require('babel-runtime/core-js/get-iterator');

var _getIterator3 = _interopRequireDefault(_getIterator2);

var _common = require('../prelude/common.js');

var _log = require('./log.js');

var _assert = require('assert');

var _assert2 = _interopRequireDefault(_assert);

var _detector = require('./detector.js');

var _detector2 = _interopRequireDefault(_detector);

var _follow = require('./follow.js');

var _follow2 = _interopRequireDefault(_follow);

var _fsExtra = require('fs-extra');

var _fsExtra2 = _interopRequireDefault(_fsExtra);

var _globby = require('globby');

var _globby2 = _interopRequireDefault(_globby);

var _natives = require('./natives.js');

var _natives2 = _interopRequireDefault(_natives);

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function shortFromAlias(alias) {
  // alias = fs-promise or @types/node
  if (alias[0] === '@') {
    return alias.match(/^([^\\/]+[\\/][^\\/]+)/)[0];
  } else {
    return alias.match(/^[^\\/]+/)[0];
  }
}

function isPublic(config) {
  if (config.private) return false;
  var license = config.license,
      licenses = config.licenses;

  if (licenses) {
    license = licenses;
  }
  if (license) {
    license = license.type || license;
  }
  if (Array.isArray(license)) {
    license = license.map(function (c) {
      return String(c.type || c);
    }).join(',');
  }
  if (!license) return false;
  if (/^\(/.test(license)) license = license.slice(1);
  if (/\)$/.test(license)) license = license.slice(0, -1);
  license = license.toLowerCase();
  licenses = Array.prototype.concat(license.split(' or '), license.split(' and '), license.split('/'), license.split(','));
  var result = false;
  var foss = ['isc', 'mit', 'apache-2.0', 'apache 2.0', 'public domain', 'bsd', 'bsd-2-clause', 'bsd-3-clause', 'wtfpl', 'cc-by-3.0', 'x11', 'artistic-2.0', 'gplv3', 'mpl', 'mplv2.0', 'unlicense', 'apache license 2.0', 'zlib', 'mpl-2.0', 'nasa-1.3', 'apache license, version 2.0', 'lgpl-2.1+', 'cc0-1.0'];
  var _iteratorNormalCompletion = true;
  var _didIteratorError = false;
  var _iteratorError = undefined;

  try {
    for (var _iterator = (0, _getIterator3.default)(licenses), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
      var c = _step.value;

      result = foss.indexOf(c) >= 0;
      if (result) break;
    }
  } catch (err) {
    _didIteratorError = true;
    _iteratorError = err;
  } finally {
    try {
      if (!_iteratorNormalCompletion && _iterator.return) {
        _iterator.return();
      }
    } finally {
      if (_didIteratorError) {
        throw _iteratorError;
      }
    }
  }

  return result;
}

function upon(p, base) {
  if (typeof p !== 'string') {
    throw (0, _log.wasReported)('Config items must be strings. See examples');
  }
  var negate = false;
  if (p[0] === '!') {
    p = p.slice(1);
    negate = true;
  }
  p = _path2.default.join(base, p);
  if (negate) {
    p = '!' + p;
  }
  return p;
}

function collect(ps) {
  return _globby2.default.sync(ps, { dot: true });
}

function expandFiles(efs, base) {
  if (!Array.isArray(efs)) {
    efs = [efs];
  }
  efs = collect(efs.map(function (p) {
    return upon(p, base);
  }));
  return efs;
}

var Walker = function () {
  function Walker() {
    (0, _classCallCheck3.default)(this, Walker);
  }

  (0, _createClass3.default)(Walker, [{
    key: 'appendRecord',
    value: function appendRecord(task) {
      var file = task.file;

      if (this.records[file]) return;
      this.records[file] = { file };
    }
  }, {
    key: 'append',
    value: function append(task) {
      task.file = (0, _common.normalizePath)(task.file);
      this.appendRecord(task);
      this.tasks.push(task);

      var what = {
        [_common.STORE_BLOB]: 'Bytecode of',
        [_common.STORE_CONTENT]: 'Content of',
        [_common.STORE_LINKS]: 'Directory',
        [_common.STORE_STAT]: 'Stat info of'
      }[task.store];
      if (task.reason) {
        _log.log.debug(what + ' %1 is added to queue. It was required from %2', [task.file, task.reason]);
      } else {
        _log.log.debug(what + ' %1 is added to queue', [task.file]);
      }
    }
  }, {
    key: 'appendFilesFromConfig',
    value: function () {
      var _ref = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee(marker) {
        var config, configPath, base, pkgConfig, scripts, _iteratorNormalCompletion2, _didIteratorError2, _iteratorError2, _iterator2, _step2, script, stat, assets, _iteratorNormalCompletion3, _didIteratorError3, _iteratorError3, _iterator3, _step3, asset, _stat, files, _iteratorNormalCompletion4, _didIteratorError4, _iteratorError4, _iterator4, _step4, file, _stat2;

        return _regenerator2.default.wrap(function _callee$(_context) {
          while (1) {
            switch (_context.prev = _context.next) {
              case 0:
                config = marker.config, configPath = marker.configPath, base = marker.base;
                pkgConfig = config.pkg;

                if (!pkgConfig) {
                  _context.next = 67;
                  break;
                }

                scripts = pkgConfig.scripts;

                if (!scripts) {
                  _context.next = 34;
                  break;
                }

                scripts = expandFiles(scripts, base);
                _iteratorNormalCompletion2 = true;
                _didIteratorError2 = false;
                _iteratorError2 = undefined;
                _context.prev = 9;
                _iterator2 = (0, _getIterator3.default)(scripts);

              case 11:
                if (_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done) {
                  _context.next = 20;
                  break;
                }

                script = _step2.value;
                _context.next = 15;
                return _fsExtra2.default.stat(script);

              case 15:
                stat = _context.sent;

                if (stat.isFile()) {
                  if (!(0, _common.isDotJS)(script) && !(0, _common.isDotJSON)(script) & !(0, _common.isDotNODE)(script)) {
                    _log.log.warn('Non-javascript file is specified in \'scripts\'.', ['Pkg will probably fail to parse. Specify *.js in glob.', script]);
                  }

                  this.append({
                    file: script,
                    marker,
                    store: _common.STORE_BLOB,
                    reason: configPath
                  });
                }

              case 17:
                _iteratorNormalCompletion2 = true;
                _context.next = 11;
                break;

              case 20:
                _context.next = 26;
                break;

              case 22:
                _context.prev = 22;
                _context.t0 = _context['catch'](9);
                _didIteratorError2 = true;
                _iteratorError2 = _context.t0;

              case 26:
                _context.prev = 26;
                _context.prev = 27;

                if (!_iteratorNormalCompletion2 && _iterator2.return) {
                  _iterator2.return();
                }

              case 29:
                _context.prev = 29;

                if (!_didIteratorError2) {
                  _context.next = 32;
                  break;
                }

                throw _iteratorError2;

              case 32:
                return _context.finish(29);

              case 33:
                return _context.finish(26);

              case 34:
                assets = pkgConfig.assets;

                if (!assets) {
                  _context.next = 65;
                  break;
                }

                assets = expandFiles(assets, base);
                _iteratorNormalCompletion3 = true;
                _didIteratorError3 = false;
                _iteratorError3 = undefined;
                _context.prev = 40;
                _iterator3 = (0, _getIterator3.default)(assets);

              case 42:
                if (_iteratorNormalCompletion3 = (_step3 = _iterator3.next()).done) {
                  _context.next = 51;
                  break;
                }

                asset = _step3.value;
                _context.next = 46;
                return _fsExtra2.default.stat(asset);

              case 46:
                _stat = _context.sent;

                if (_stat.isFile()) {
                  this.append({
                    file: asset,
                    marker,
                    store: _common.STORE_CONTENT,
                    reason: configPath
                  });
                }

              case 48:
                _iteratorNormalCompletion3 = true;
                _context.next = 42;
                break;

              case 51:
                _context.next = 57;
                break;

              case 53:
                _context.prev = 53;
                _context.t1 = _context['catch'](40);
                _didIteratorError3 = true;
                _iteratorError3 = _context.t1;

              case 57:
                _context.prev = 57;
                _context.prev = 58;

                if (!_iteratorNormalCompletion3 && _iterator3.return) {
                  _iterator3.return();
                }

              case 60:
                _context.prev = 60;

                if (!_didIteratorError3) {
                  _context.next = 63;
                  break;
                }

                throw _iteratorError3;

              case 63:
                return _context.finish(60);

              case 64:
                return _context.finish(57);

              case 65:
                _context.next = 98;
                break;

              case 67:
                files = config.files;

                if (!files) {
                  _context.next = 98;
                  break;
                }

                files = expandFiles(files, base);
                _iteratorNormalCompletion4 = true;
                _didIteratorError4 = false;
                _iteratorError4 = undefined;
                _context.prev = 73;
                _iterator4 = (0, _getIterator3.default)(files);

              case 75:
                if (_iteratorNormalCompletion4 = (_step4 = _iterator4.next()).done) {
                  _context.next = 84;
                  break;
                }

                file = _step4.value;
                _context.next = 79;
                return _fsExtra2.default.stat(file);

              case 79:
                _stat2 = _context.sent;

                if (_stat2.isFile()) {
                  // 1) remove sources of top-level(!) package 'files' i.e. ship as BLOB
                  // 2) non-source (non-js) files of top-level package are shipped as CONTENT
                  // 3) parsing some js 'files' of non-top-level packages fails, hence all CONTENT
                  if (marker.toplevel) {
                    this.append({
                      file,
                      marker,
                      store: (0, _common.isDotJS)(file) ? _common.STORE_BLOB : _common.STORE_CONTENT,
                      reason: configPath
                    });
                  } else {
                    this.append({
                      file,
                      marker,
                      store: _common.STORE_CONTENT,
                      reason: configPath
                    });
                  }
                }

              case 81:
                _iteratorNormalCompletion4 = true;
                _context.next = 75;
                break;

              case 84:
                _context.next = 90;
                break;

              case 86:
                _context.prev = 86;
                _context.t2 = _context['catch'](73);
                _didIteratorError4 = true;
                _iteratorError4 = _context.t2;

              case 90:
                _context.prev = 90;
                _context.prev = 91;

                if (!_iteratorNormalCompletion4 && _iterator4.return) {
                  _iterator4.return();
                }

              case 93:
                _context.prev = 93;

                if (!_didIteratorError4) {
                  _context.next = 96;
                  break;
                }

                throw _iteratorError4;

              case 96:
                return _context.finish(93);

              case 97:
                return _context.finish(90);

              case 98:
              case 'end':
                return _context.stop();
            }
          }
        }, _callee, this, [[9, 22, 26, 34], [27,, 29, 33], [40, 53, 57, 65], [58,, 60, 64], [73, 86, 90, 98], [91,, 93, 97]]);
      }));

      function appendFilesFromConfig(_x) {
        return _ref.apply(this, arguments);
      }

      return appendFilesFromConfig;
    }()
  }, {
    key: 'stepActivate',
    value: function () {
      var _ref2 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee2(marker, derivatives) {
        var config, base, name, d, dependencies, dependency, pkgConfig, patches, key, p, deployFiles, _iteratorNormalCompletion5, _didIteratorError5, _iteratorError5, _iterator5, _step5, deployFile, type;

        return _regenerator2.default.wrap(function _callee2$(_context2) {
          while (1) {
            switch (_context2.prev = _context2.next) {
              case 0:
                if (!marker) (0, _assert2.default)(false);

                if (!marker.activated) {
                  _context2.next = 3;
                  break;
                }

                return _context2.abrupt('return');

              case 3:
                config = marker.config, base = marker.base;

                if (!config) (0, _assert2.default)(false);

                name = config.name;

                if (name) {
                  d = this.dictionary[name];

                  if (d) {
                    if (typeof config.dependencies === 'object' && typeof d.dependencies === 'object') {
                      (0, _assign2.default)(config.dependencies, d.dependencies);
                      delete d.dependencies;
                    }
                    (0, _assign2.default)(config, d);
                    marker.hasDictionary = true;
                  }
                }

                dependencies = config.dependencies;

                if (typeof dependencies === 'object') {
                  for (dependency in dependencies) {
                    // it may be `undefined` - overridden
                    // in dictionary (see publicsuffixlist)
                    if (dependencies[dependency]) {
                      derivatives.push({
                        alias: dependency,
                        aliasType: _common.ALIAS_AS_RESOLVABLE,
                        fromDependencies: true
                      });
                    }
                  }
                }

                pkgConfig = config.pkg;

                if (!pkgConfig) {
                  _context2.next = 36;
                  break;
                }

                patches = pkgConfig.patches;

                if (patches) {
                  for (key in patches) {
                    p = _path2.default.join(base, key);

                    this.patches[p] = patches[key];
                  }
                }

                deployFiles = pkgConfig.deployFiles;

                if (!deployFiles) {
                  _context2.next = 35;
                  break;
                }

                marker.hasDeployFiles = true;
                _iteratorNormalCompletion5 = true;
                _didIteratorError5 = false;
                _iteratorError5 = undefined;
                _context2.prev = 19;
                for (_iterator5 = (0, _getIterator3.default)(deployFiles); !(_iteratorNormalCompletion5 = (_step5 = _iterator5.next()).done); _iteratorNormalCompletion5 = true) {
                  deployFile = _step5.value;
                  type = deployFile[2] || 'file';

                  _log.log.warn(`Cannot include ${type} %1 into executable.`, [`The ${type} must be distributed with executable as %2.`, _path2.default.relative(process.cwd(), _path2.default.join(base, deployFile[0])), 'path-to-executable/' + deployFile[1]]);
                }
                _context2.next = 27;
                break;

              case 23:
                _context2.prev = 23;
                _context2.t0 = _context2['catch'](19);
                _didIteratorError5 = true;
                _iteratorError5 = _context2.t0;

              case 27:
                _context2.prev = 27;
                _context2.prev = 28;

                if (!_iteratorNormalCompletion5 && _iterator5.return) {
                  _iterator5.return();
                }

              case 30:
                _context2.prev = 30;

                if (!_didIteratorError5) {
                  _context2.next = 33;
                  break;
                }

                throw _iteratorError5;

              case 33:
                return _context2.finish(30);

              case 34:
                return _context2.finish(27);

              case 35:

                if (pkgConfig.log) {
                  pkgConfig.log(_log.log, { packagePath: base });
                }

              case 36:
                _context2.next = 38;
                return this.appendFilesFromConfig(marker);

              case 38:
                marker.public = isPublic(config);
                if (!marker.public && marker.toplevel) {
                  marker.public = this.params.publicToplevel;
                }
                if (!marker.public && !marker.toplevel && this.params.publicPackages) {
                  marker.public = this.params.publicPackages[0] === '*' || this.params.publicPackages.indexOf(name) !== -1;
                }

                marker.activated = true;
                // assert no further work with config
                delete marker.config;

              case 43:
              case 'end':
                return _context2.stop();
            }
          }
        }, _callee2, this, [[19, 23, 27, 35], [28,, 30, 34]]);
      }));

      function stepActivate(_x2, _x3) {
        return _ref2.apply(this, arguments);
      }

      return stepActivate;
    }()
  }, {
    key: 'stepRead',
    value: function () {
      var _ref3 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee3(record) {
        var body;
        return _regenerator2.default.wrap(function _callee3$(_context3) {
          while (1) {
            switch (_context3.prev = _context3.next) {
              case 0:
                body = void 0;
                _context3.prev = 1;
                _context3.next = 4;
                return _fsExtra2.default.readFile(record.file);

              case 4:
                body = _context3.sent;
                _context3.next = 11;
                break;

              case 7:
                _context3.prev = 7;
                _context3.t0 = _context3['catch'](1);

                _log.log.error('Cannot read file, ' + _context3.t0.code, record.file);
                throw (0, _log.wasReported)(_context3.t0);

              case 11:

                record.body = body;

              case 12:
              case 'end':
                return _context3.stop();
            }
          }
        }, _callee3, this, [[1, 7]]);
      }));

      function stepRead(_x4) {
        return _ref3.apply(this, arguments);
      }

      return stepRead;
    }()
  }, {
    key: 'hasPatch',
    value: function hasPatch(record) {
      var patch = this.patches[record.file];
      if (!patch) return;
      return true;
    }
  }, {
    key: 'stepPatch',
    value: function stepPatch(record) {
      var patch = this.patches[record.file];
      if (!patch) return;

      var body = record.body.toString('utf8');

      for (var i = 0; i < patch.length; i += 2) {
        if (typeof patch[i] === 'object') {
          if (patch[i].do === 'erase') {
            body = patch[i + 1];
          } else if (patch[i].do === 'prepend') {
            body = patch[i + 1] + body;
          } else if (patch[i].do === 'append') {
            body += patch[i + 1];
          }
        } else if (typeof patch[i] === 'string') {
          // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions
          // function escapeRegExp
          var esc = patch[i].replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          var regexp = new RegExp(esc, 'g');
          body = body.replace(regexp, patch[i + 1]);
        }
      }

      record.body = body;
    }
  }, {
    key: 'stepStrip',
    value: function stepStrip(record) {
      var body = record.body.toString('utf8');

      if (/^\ufeff/.test(body)) {
        body = body.replace(/^\ufeff/, '');
      }
      if (/^#!/.test(body)) {
        body = body.replace(/^#![^\n]*\n/, '\n');
      }

      record.body = body;
    }
  }, {
    key: 'stepDetect',
    value: function stepDetect(record, marker, derivatives) {
      var body = record.body;

      try {
        _detector2.default.detect(body, function (node, trying) {
          var toplevel = marker.toplevel;

          var d = _detector2.default.visitor_SUCCESSFUL(node);
          if (d) {
            if (d.mustExclude) return false;
            d.mayExclude = d.mayExclude || trying;
            derivatives.push(d);
            return false;
          }
          d = _detector2.default.visitor_NONLITERAL(node);
          if (d) {
            if (d.mustExclude) return false;
            var debug = !toplevel || d.mayExclude || trying;
            var level = debug ? 'debug' : 'warn';
            _log.log[level](`Cannot resolve '${d.alias}'`, [record.file, 'Dynamic require may fail at run time, because the requested file', 'is unknown at compilation time and not included into executable.', 'Use a string literal as an argument for \'require\', or leave it', 'as is and specify the resolved file name in \'scripts\' option.']);
            return false;
          }
          d = _detector2.default.visitor_MALFORMED(node);
          if (d) {
            // there is no 'mustExclude'
            var _debug = !toplevel || trying;
            var _level = _debug ? 'debug' : 'warn'; // there is no 'mayExclude'
            _log.log[_level](`Malformed requirement for '${d.alias}'`, [record.file]);
            return false;
          }
          d = _detector2.default.visitor_USESCWD(node);
          if (d) {
            // there is no 'mustExclude'
            var _level2 = 'debug'; // there is no 'mayExclude'
            _log.log[_level2](`Path.resolve(${d.alias}) is ambiguous`, [record.file, 'It resolves relatively to \'process.cwd\' by default, however', 'you may want to use \'path.dirname(require.main.filename)\'']);
            return false;
          }
          return true; // can i go inside?
        });
      } catch (error) {
        _log.log.error(error.message, record.file);
        throw (0, _log.wasReported)(error);
      }
    }
  }, {
    key: 'stepDerivatives_ALIAS_AS_RELATIVE',
    value: function () {
      var _ref4 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee4(record, marker, derivative) {
        var file, stat, toplevel, debug, level;
        return _regenerator2.default.wrap(function _callee4$(_context4) {
          while (1) {
            switch (_context4.prev = _context4.next) {
              case 0:
                // eslint-disable-line camelcase
                file = _path2.default.join(_path2.default.dirname(record.file), derivative.alias);
                stat = void 0;
                _context4.prev = 2;
                _context4.next = 5;
                return _fsExtra2.default.stat(file);

              case 5:
                stat = _context4.sent;
                _context4.next = 14;
                break;

              case 8:
                _context4.prev = 8;
                _context4.t0 = _context4['catch'](2);
                toplevel = marker.toplevel;
                debug = !toplevel && _context4.t0.code === 'ENOENT';
                level = debug ? 'debug' : 'warn';

                _log.log[level]('Cannot stat, ' + _context4.t0.code, [file, 'The file was required from \'' + record.file + '\'']);

              case 14:

                if (stat && stat.isFile()) {
                  this.append({
                    file,
                    marker,
                    store: _common.STORE_CONTENT,
                    reason: record.file
                  });
                }

              case 15:
              case 'end':
                return _context4.stop();
            }
          }
        }, _callee4, this, [[2, 8]]);
      }));

      function stepDerivatives_ALIAS_AS_RELATIVE(_x5, _x6, _x7) {
        return _ref4.apply(this, arguments);
      }

      return stepDerivatives_ALIAS_AS_RELATIVE;
    }()
  }, {
    key: 'stepDerivatives_ALIAS_AS_RESOLVABLE',
    value: function () {
      var _ref5 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee5(record, marker, derivative) {
        var catcher, stage, newPackage, newMarker, newFile, failure, isNear, mainNotFound, short, toplevel, debug, level, message;
        return _regenerator2.default.wrap(function _callee5$(_context5) {
          while (1) {
            switch (_context5.prev = _context5.next) {
              case 0:
                // eslint-disable-line camelcase
                catcher = {};
                stage = 0;
                newPackage = void 0;
                newMarker = void 0;


                catcher.readFileSync = function (file) {
                  // only first occurence from loadNodeModulesSync
                  if (stage === 2) return;
                  (0, _assert2.default)(stage === 0);
                  (0, _assert2.default)((0, _common.isPackageJson)(file), 'walker: ' + file + ' must be package.json');
                  newPackage = file;
                  newMarker = undefined;
                  stage = 1;
                  return _fsExtra2.default.readFileSync(file);
                };

                catcher.packageFilter = function (config, base) {
                  (0, _assert2.default)(stage === 1);
                  newMarker = { config, configPath: newPackage, base };
                  stage = 2;
                  return config;
                };

                newFile = void 0, failure = void 0;
                _context5.prev = 7;
                _context5.next = 10;
                return (0, _follow2.default)(derivative.alias, {
                  basedir: _path2.default.dirname(record.file),
                  // default is extensions: ['.js'], but
                  // it is not enough because 'typos.json'
                  // is not taken in require('./typos')
                  // in 'normalize-package-data/lib/fixer.js'
                  extensions: ['.js', '.json', '.node'],
                  readFileSync: catcher.readFileSync,
                  packageFilter: catcher.packageFilter
                });

              case 10:
                newFile = _context5.sent;
                _context5.next = 16;
                break;

              case 13:
                _context5.prev = 13;
                _context5.t0 = _context5['catch'](7);

                failure = _context5.t0;

              case 16:

                // was taken from resolve/lib/sync.js
                isNear = /^(?:\.\.?(?:\/|$)|\/|([A-Za-z]:)?[\\/])/;
                mainNotFound = false;

                if (isNear.test(derivative.alias)) {
                  _context5.next = 29;
                  break;
                }

                short = shortFromAlias(derivative.alias);
                // 'npm' !== 'npm/bin/npm-cli.js'

                if (!(short !== derivative.alias)) {
                  _context5.next = 28;
                  break;
                }

                _context5.prev = 21;
                _context5.next = 24;
                return (0, _follow2.default)(short, {
                  basedir: _path2.default.dirname(record.file),
                  extensions: ['.js', '.json', '.node'],
                  readFileSync: catcher.readFileSync,
                  packageFilter: catcher.packageFilter
                });

              case 24:
                _context5.next = 28;
                break;

              case 26:
                _context5.prev = 26;
                _context5.t1 = _context5['catch'](21);

              case 28:
                // 'babel-runtime' === 'babel-runtime'
                if (short === derivative.alias) {
                  mainNotFound = failure && newMarker && newMarker.config && !newMarker.config.main;
                }

              case 29:

                (0, _assert2.default)(newPackage && newMarker || !newPackage && !newMarker, 'Probably, package.json is malformed');

                if (newPackage) {
                  this.append({
                    file: newPackage,
                    marker: newMarker,
                    store: _common.STORE_CONTENT,
                    reason: record.file
                  });
                }

                if (!failure) {
                  _context5.next = 37;
                  break;
                }

                toplevel = marker.toplevel;
                debug = !toplevel || derivative.mayExclude || mainNotFound && derivative.fromDependencies;
                level = debug ? 'debug' : 'warn';

                if (mainNotFound) {
                  message = 'Entry \'main\' not found in %1';

                  _log.log[level](message, [newPackage, record.file]);
                } else {
                  _log.log[level](failure.message, [record.file]);
                }
                return _context5.abrupt('return');

              case 37:

                this.append({
                  file: newFile,
                  marker: newMarker || marker,
                  store: _common.STORE_BLOB,
                  reason: record.file
                });

              case 38:
              case 'end':
                return _context5.stop();
            }
          }
        }, _callee5, this, [[7, 13], [21, 26]]);
      }));

      function stepDerivatives_ALIAS_AS_RESOLVABLE(_x8, _x9, _x10) {
        return _ref5.apply(this, arguments);
      }

      return stepDerivatives_ALIAS_AS_RESOLVABLE;
    }()
  }, {
    key: 'stepDerivatives',
    value: function () {
      var _ref6 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee6(record, marker, derivatives) {
        var _iteratorNormalCompletion6, _didIteratorError6, _iteratorError6, _iterator6, _step6, derivative;

        return _regenerator2.default.wrap(function _callee6$(_context6) {
          while (1) {
            switch (_context6.prev = _context6.next) {
              case 0:
                _iteratorNormalCompletion6 = true;
                _didIteratorError6 = false;
                _iteratorError6 = undefined;
                _context6.prev = 3;
                _iterator6 = (0, _getIterator3.default)(derivatives);

              case 5:
                if (_iteratorNormalCompletion6 = (_step6 = _iterator6.next()).done) {
                  _context6.next = 23;
                  break;
                }

                derivative = _step6.value;

                if (!_natives2.default[derivative.alias]) {
                  _context6.next = 9;
                  break;
                }

                return _context6.abrupt('continue', 20);

              case 9:
                if (!(derivative.aliasType === _common.ALIAS_AS_RELATIVE)) {
                  _context6.next = 14;
                  break;
                }

                _context6.next = 12;
                return this.stepDerivatives_ALIAS_AS_RELATIVE(record, marker, derivative);

              case 12:
                _context6.next = 20;
                break;

              case 14:
                if (!(derivative.aliasType === _common.ALIAS_AS_RESOLVABLE)) {
                  _context6.next = 19;
                  break;
                }

                _context6.next = 17;
                return this.stepDerivatives_ALIAS_AS_RESOLVABLE(record, marker, derivative);

              case 17:
                _context6.next = 20;
                break;

              case 19:
                (0, _assert2.default)(false, 'walker: unknown aliasType ' + derivative.aliasType);

              case 20:
                _iteratorNormalCompletion6 = true;
                _context6.next = 5;
                break;

              case 23:
                _context6.next = 29;
                break;

              case 25:
                _context6.prev = 25;
                _context6.t0 = _context6['catch'](3);
                _didIteratorError6 = true;
                _iteratorError6 = _context6.t0;

              case 29:
                _context6.prev = 29;
                _context6.prev = 30;

                if (!_iteratorNormalCompletion6 && _iterator6.return) {
                  _iterator6.return();
                }

              case 32:
                _context6.prev = 32;

                if (!_didIteratorError6) {
                  _context6.next = 35;
                  break;
                }

                throw _iteratorError6;

              case 35:
                return _context6.finish(32);

              case 36:
                return _context6.finish(29);

              case 37:
              case 'end':
                return _context6.stop();
            }
          }
        }, _callee6, this, [[3, 25, 29, 37], [30,, 32, 36]]);
      }));

      function stepDerivatives(_x11, _x12, _x13) {
        return _ref6.apply(this, arguments);
      }

      return stepDerivatives;
    }()
  }, {
    key: 'step_STORE_ANY',
    value: function () {
      var _ref7 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee7(record, marker, store) {
        var derivatives1, derivatives2;
        return _regenerator2.default.wrap(function _callee7$(_context7) {
          while (1) {
            switch (_context7.prev = _context7.next) {
              case 0:
                if (!(record[store] !== undefined)) {
                  _context7.next = 2;
                  break;
                }

                return _context7.abrupt('return');

              case 2:
                record[store] = false; // default is discard

                this.append({
                  file: record.file,
                  store: _common.STORE_STAT
                });

                if (!(0, _common.isDotNODE)(record.file)) {
                  _context7.next = 7;
                  break;
                }

                // provide explicit deployFiles to override
                // native addon deployment place. see 'sharp'
                if (!marker.hasDeployFiles) {
                  _log.log.warn('Cannot include addon %1 into executable.', ['The addon must be distributed with executable as %2.', record.file, 'path-to-executable/' + _path2.default.basename(record.file)]);
                }
                return _context7.abrupt('return');

              case 7:
                derivatives1 = [];
                _context7.next = 10;
                return this.stepActivate(marker, derivatives1);

              case 10:
                _context7.next = 12;
                return this.stepDerivatives(record, marker, derivatives1);

              case 12:
                if (!(store === _common.STORE_BLOB)) {
                  _context7.next = 17;
                  break;
                }

                if (!(0, _common.isDotJSON)(record.file)) {
                  _context7.next = 16;
                  break;
                }

                this.append({
                  file: record.file,
                  marker,
                  store: _common.STORE_CONTENT
                });
                return _context7.abrupt('return');

              case 16:

                if (marker.public || marker.hasDictionary) {
                  this.append({
                    file: record.file,
                    marker,
                    store: _common.STORE_CONTENT
                  });
                }

              case 17:
                if (!(store === _common.STORE_BLOB || this.hasPatch(record))) {
                  _context7.next = 28;
                  break;
                }

                if (record.body) {
                  _context7.next = 23;
                  break;
                }

                _context7.next = 21;
                return this.stepRead(record);

              case 21:
                this.stepPatch(record);
                if (store === _common.STORE_BLOB) {
                  this.stepStrip(record);
                }

              case 23:
                if (!(store === _common.STORE_BLOB)) {
                  _context7.next = 28;
                  break;
                }

                derivatives2 = [];

                this.stepDetect(record, marker, derivatives2);
                _context7.next = 28;
                return this.stepDerivatives(record, marker, derivatives2);

              case 28:

                record[store] = true;

              case 29:
              case 'end':
                return _context7.stop();
            }
          }
        }, _callee7, this);
      }));

      function step_STORE_ANY(_x14, _x15, _x16) {
        return _ref7.apply(this, arguments);
      }

      return step_STORE_ANY;
    }()
  }, {
    key: 'step_STORE_LINKS',
    value: function step_STORE_LINKS(record, data) {
      // eslint-disable-line camelcase
      if (record[_common.STORE_LINKS]) {
        record[_common.STORE_LINKS].push(data);
        return;
      }

      record[_common.STORE_LINKS] = [data];

      this.append({
        file: record.file,
        store: _common.STORE_STAT
      });
    }
  }, {
    key: 'step_STORE_STAT',
    value: function () {
      var _ref8 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee8(record) {
        return _regenerator2.default.wrap(function _callee8$(_context8) {
          while (1) {
            switch (_context8.prev = _context8.next) {
              case 0:
                if (!record[_common.STORE_STAT]) {
                  _context8.next = 2;
                  break;
                }

                return _context8.abrupt('return');

              case 2:
                _context8.prev = 2;
                _context8.next = 5;
                return _fsExtra2.default.stat(record.file);

              case 5:
                record[_common.STORE_STAT] = _context8.sent;
                _context8.next = 12;
                break;

              case 8:
                _context8.prev = 8;
                _context8.t0 = _context8['catch'](2);

                _log.log.error('Cannot stat, ' + _context8.t0.code, record.file);
                throw (0, _log.wasReported)(_context8.t0);

              case 12:

                if (_path2.default.dirname(record.file) !== record.file) {
                  // root directory
                  this.append({
                    file: _path2.default.dirname(record.file),
                    store: _common.STORE_LINKS,
                    data: _path2.default.basename(record.file)
                  });
                }

              case 13:
              case 'end':
                return _context8.stop();
            }
          }
        }, _callee8, this, [[2, 8]]);
      }));

      function step_STORE_STAT(_x17) {
        return _ref8.apply(this, arguments);
      }

      return step_STORE_STAT;
    }()
  }, {
    key: 'step',
    value: function () {
      var _ref9 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee9(task) {
        var file, store, data, record;
        return _regenerator2.default.wrap(function _callee9$(_context9) {
          while (1) {
            switch (_context9.prev = _context9.next) {
              case 0:
                file = task.file, store = task.store, data = task.data;
                record = this.records[file];

                if (!(store === _common.STORE_BLOB || store === _common.STORE_CONTENT)) {
                  _context9.next = 7;
                  break;
                }

                _context9.next = 5;
                return this.step_STORE_ANY(record, task.marker, store);

              case 5:
                _context9.next = 17;
                break;

              case 7:
                if (!(store === _common.STORE_LINKS)) {
                  _context9.next = 11;
                  break;
                }

                this.step_STORE_LINKS(record, data);
                _context9.next = 17;
                break;

              case 11:
                if (!(store === _common.STORE_STAT)) {
                  _context9.next = 16;
                  break;
                }

                _context9.next = 14;
                return this.step_STORE_STAT(record);

              case 14:
                _context9.next = 17;
                break;

              case 16:
                (0, _assert2.default)(false, 'walker: unknown store ' + store);

              case 17:
              case 'end':
                return _context9.stop();
            }
          }
        }, _callee9, this);
      }));

      function step(_x18) {
        return _ref9.apply(this, arguments);
      }

      return step;
    }()
  }, {
    key: 'readDictionary',
    value: function () {
      var _ref10 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee10() {
        var dd, files, _iteratorNormalCompletion7, _didIteratorError7, _iteratorError7, _iterator7, _step7, file, name, config;

        return _regenerator2.default.wrap(function _callee10$(_context10) {
          while (1) {
            switch (_context10.prev = _context10.next) {
              case 0:
                dd = _path2.default.join(__dirname, '../dictionary');
                _context10.next = 3;
                return _fsExtra2.default.readdir(dd);

              case 3:
                files = _context10.sent;
                _iteratorNormalCompletion7 = true;
                _didIteratorError7 = false;
                _iteratorError7 = undefined;
                _context10.prev = 7;


                for (_iterator7 = (0, _getIterator3.default)(files); !(_iteratorNormalCompletion7 = (_step7 = _iterator7.next()).done); _iteratorNormalCompletion7 = true) {
                  file = _step7.value;

                  if (/\.js$/.test(file)) {
                    name = file.slice(0, -3);
                    config = require(_path2.default.join(dd, file));

                    this.dictionary[name] = config;
                  }
                }
                _context10.next = 15;
                break;

              case 11:
                _context10.prev = 11;
                _context10.t0 = _context10['catch'](7);
                _didIteratorError7 = true;
                _iteratorError7 = _context10.t0;

              case 15:
                _context10.prev = 15;
                _context10.prev = 16;

                if (!_iteratorNormalCompletion7 && _iterator7.return) {
                  _iterator7.return();
                }

              case 18:
                _context10.prev = 18;

                if (!_didIteratorError7) {
                  _context10.next = 21;
                  break;
                }

                throw _iteratorError7;

              case 21:
                return _context10.finish(18);

              case 22:
                return _context10.finish(15);

              case 23:
              case 'end':
                return _context10.stop();
            }
          }
        }, _callee10, this, [[7, 11, 15, 23], [16,, 18, 22]]);
      }));

      function readDictionary() {
        return _ref10.apply(this, arguments);
      }

      return readDictionary;
    }()
  }, {
    key: 'start',
    value: function () {
      var _ref11 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee11(marker, entrypoint, addition, params) {
        var tasks, i;
        return _regenerator2.default.wrap(function _callee11$(_context11) {
          while (1) {
            switch (_context11.prev = _context11.next) {
              case 0:
                this.tasks = [];
                this.records = {};
                this.dictionary = {};
                this.patches = {};
                this.params = params;

                _context11.next = 7;
                return this.readDictionary();

              case 7:

                this.append({
                  file: entrypoint,
                  marker,
                  store: _common.STORE_BLOB
                });

                if (addition) {
                  this.append({
                    file: addition,
                    marker,
                    store: _common.STORE_CONTENT
                  });
                }

                tasks = this.tasks;
                i = 0;

              case 11:
                if (!(i < tasks.length)) {
                  _context11.next = 17;
                  break;
                }

                _context11.next = 14;
                return this.step(tasks[i]);

              case 14:
                i += 1;
                _context11.next = 11;
                break;

              case 17:
                return _context11.abrupt('return', {
                  records: this.records,
                  entrypoint: (0, _common.normalizePath)(entrypoint)
                });

              case 18:
              case 'end':
                return _context11.stop();
            }
          }
        }, _callee11, this);
      }));

      function start(_x19, _x20, _x21, _x22) {
        return _ref11.apply(this, arguments);
      }

      return start;
    }()
  }]);
  return Walker;
}();

exports.default = function () {
  var _ref12 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee12() {
    var w,
        _args12 = arguments;
    return _regenerator2.default.wrap(function _callee12$(_context12) {
      while (1) {
        switch (_context12.prev = _context12.next) {
          case 0:
            w = new Walker();
            _context12.next = 3;
            return w.start.apply(w, _args12);

          case 3:
            return _context12.abrupt('return', _context12.sent);

          case 4:
          case 'end':
            return _context12.stop();
        }
      }
    }, _callee12, this);
  }));

  return function () {
    return _ref12.apply(this, arguments);
  };
}();