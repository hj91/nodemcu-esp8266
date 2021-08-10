'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.exec = undefined;

var _stringify = require('babel-runtime/core-js/json/stringify');

var _stringify2 = _interopRequireDefault(_stringify);

var _regenerator = require('babel-runtime/regenerator');

var _regenerator2 = _interopRequireDefault(_regenerator);

var _assign = require('babel-runtime/core-js/object/assign');

var _assign2 = _interopRequireDefault(_assign);

var _asyncToGenerator2 = require('babel-runtime/helpers/asyncToGenerator');

var _asyncToGenerator3 = _interopRequireDefault(_asyncToGenerator2);

var _keys = require('babel-runtime/core-js/object/keys');

var _keys2 = _interopRequireDefault(_keys);

var _getIterator2 = require('babel-runtime/core-js/get-iterator');

var _getIterator3 = _interopRequireDefault(_getIterator2);

var needWithDryRun = function () {
  var _ref = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee(target) {
    var target2, result;
    return _regenerator2.default.wrap(function _callee$(_context) {
      while (1) {
        switch (_context.prev = _context.next) {
          case 0:
            target2 = (0, _assign2.default)({ dryRun: true }, target);
            _context.next = 3;
            return (0, _pkgFetch.need)(target2);

          case 3:
            result = _context.sent;

            (0, _assert2.default)(['exists', 'fetched', 'built'].indexOf(result) >= 0);
            dryRunResults[result] = true;

          case 6:
          case 'end':
            return _context.stop();
        }
      }
    }, _callee, this);
  }));

  return function needWithDryRun(_x) {
    return _ref.apply(this, arguments);
  };
}();

var needViaCache = function () {
  var _ref2 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee2(target) {
    var s, c;
    return _regenerator2.default.wrap(function _callee2$(_context2) {
      while (1) {
        switch (_context2.prev = _context2.next) {
          case 0:
            s = stringifyTarget(target);
            c = targetsCache[s];

            if (!c) {
              _context2.next = 4;
              break;
            }

            return _context2.abrupt('return', c);

          case 4:
            _context2.next = 6;
            return (0, _pkgFetch.need)(target);

          case 6:
            c = _context2.sent;

            targetsCache[s] = c;
            return _context2.abrupt('return', c);

          case 9:
          case 'end':
            return _context2.stop();
        }
      }
    }, _callee2, this);
  }));

  return function needViaCache(_x2) {
    return _ref2.apply(this, arguments);
  };
}();

var exec = exports.exec = function () {
  var _ref3 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee3(argv2) {
    var argv, forceBuild, input, inputJson, inputJsonName, inputBin, bin, inputFin, config, configJson, output, outputPath, autoOutput, name, ext, sTargets, targets, jsonTargets, different, _iteratorNormalCompletion4, _didIteratorError4, _iteratorError4, _iterator4, _step4, target, file, bakes, _iteratorNormalCompletion5, _didIteratorError5, _iteratorError5, _iterator5, _step5, _target, bytecode, _iteratorNormalCompletion6, _didIteratorError6, _iteratorError6, _iterator6, _step6, _target2, f, _iteratorNormalCompletion7, _didIteratorError7, _iteratorError7, _iterator7, _step7, _target3, marker, params, records, entrypoint, addition, walkResult, refineResult, backpack, _iteratorNormalCompletion8, _didIteratorError8, _iteratorError8, _iterator8, _step8, _target4, slash;

    return _regenerator2.default.wrap(function _callee3$(_context3) {
      while (1) {
        switch (_context3.prev = _context3.next) {
          case 0:
            // eslint-disable-line complexity
            argv = (0, _minimist2.default)(argv2, {
              boolean: ['b', 'build', 'bytecode', 'd', 'debug', 'h', 'help', 'public', 'v', 'version'],
              string: ['_', 'c', 'config', 'o', 'options', 'output', 'outdir', 'out-dir', 'out-path', 'public-packages', 't', 'target', 'targets'],
              default: { bytecode: true }
            });

            if (!(argv.h || argv.help)) {
              _context3.next = 4;
              break;
            }

            (0, _help2.default)();
            return _context3.abrupt('return');

          case 4:
            if (!(argv.v || argv.version)) {
              _context3.next = 7;
              break;
            }

            console.log(_package.version);
            return _context3.abrupt('return');

          case 7:

            _log.log.info(`pkg@${_package.version}`);

            // debug

            _log.log.debugMode = argv.d || argv.debug;

            // forceBuild

            forceBuild = argv.b || argv.build;

            // _

            if (argv._.length) {
              _context3.next = 12;
              break;
            }

            throw (0, _log.wasReported)('Entry file/directory is expected', ['Pass --help to see usage information']);

          case 12:
            if (!(argv._.length > 1)) {
              _context3.next = 14;
              break;
            }

            throw (0, _log.wasReported)('Not more than one entry file/directory is expected');

          case 14:

            // input

            input = _path2.default.resolve(argv._[0]);
            _context3.next = 17;
            return (0, _fsExtra.exists)(input);

          case 17:
            if (_context3.sent) {
              _context3.next = 19;
              break;
            }

            throw (0, _log.wasReported)('Input file does not exist', [input]);

          case 19:
            _context3.next = 21;
            return (0, _fsExtra.stat)(input);

          case 21:
            if (!_context3.sent.isDirectory()) {
              _context3.next = 27;
              break;
            }

            input = _path2.default.join(input, 'package.json');
            _context3.next = 25;
            return (0, _fsExtra.exists)(input);

          case 25:
            if (_context3.sent) {
              _context3.next = 27;
              break;
            }

            throw (0, _log.wasReported)('Input file does not exist', [input]);

          case 27:

            // inputJson

            inputJson = void 0, inputJsonName = void 0;

            if (!isConfiguration(input)) {
              _context3.next = 36;
              break;
            }

            _context3.t0 = JSON;
            _context3.next = 32;
            return (0, _fsExtra.readFile)(input);

          case 32:
            _context3.t1 = _context3.sent;
            inputJson = _context3.t0.parse.call(_context3.t0, _context3.t1);

            inputJsonName = inputJson.name;
            if (inputJsonName) {
              inputJsonName = inputJsonName.split('/').pop(); // @org/foo
            }

          case 36:

            // inputBin

            inputBin = void 0;

            if (!inputJson) {
              _context3.next = 46;
              break;
            }

            bin = inputJson.bin;

            if (!bin) {
              _context3.next = 46;
              break;
            }

            if (typeof bin === 'object') {
              if (bin[inputJsonName]) {
                bin = bin[inputJsonName];
              } else {
                bin = bin[(0, _keys2.default)(bin)[0]]; // TODO multiple inputs to pkg them all?
              }
            }
            inputBin = _path2.default.resolve(_path2.default.dirname(input), bin);
            _context3.next = 44;
            return (0, _fsExtra.exists)(inputBin);

          case 44:
            if (_context3.sent) {
              _context3.next = 46;
              break;
            }

            throw (0, _log.wasReported)('Bin file does not exist (taken from package.json ' + '\'bin\' property)', [inputBin]);

          case 46:
            if (!(inputJson && !inputBin)) {
              _context3.next = 48;
              break;
            }

            throw (0, _log.wasReported)('Property \'bin\' does not exist in', [input]);

          case 48:

            // inputFin

            inputFin = inputBin || input;

            // config

            config = argv.c || argv.config;

            if (!(inputJson && config)) {
              _context3.next = 52;
              break;
            }

            throw (0, _log.wasReported)('Specify either \'package.json\' or config. Not both');

          case 52:

            // configJson

            configJson = void 0;

            if (!config) {
              _context3.next = 61;
              break;
            }

            config = _path2.default.resolve(config);
            _context3.next = 57;
            return (0, _fsExtra.exists)(config);

          case 57:
            if (_context3.sent) {
              _context3.next = 59;
              break;
            }

            throw (0, _log.wasReported)('Config file does not exist', [config]);

          case 59:
            configJson = require(config); // may be either json or js
            if (!configJson.name && !configJson.files && !configJson.dependencies && !configJson.pkg) {
              // package.json not detected
              configJson = { pkg: configJson };
            }

          case 61:

            // output, outputPath

            output = argv.o || argv.output;
            outputPath = argv['out-path'] || argv.outdir || argv['out-dir'];
            autoOutput = false;

            if (!(output && outputPath)) {
              _context3.next = 66;
              break;
            }

            throw (0, _log.wasReported)('Specify either \'output\' or \'out-path\'. Not both');

          case 66:
            if (output) {
              _context3.next = 82;
              break;
            }

            name = void 0;

            if (!inputJson) {
              _context3.next = 74;
              break;
            }

            name = inputJsonName;

            if (name) {
              _context3.next = 72;
              break;
            }

            throw (0, _log.wasReported)('Property \'name\' does not exist in', [argv._[0]]);

          case 72:
            _context3.next = 75;
            break;

          case 74:
            if (configJson) {
              name = configJson.name;
            }

          case 75:
            if (!name) {
              name = _path2.default.basename(inputFin);
            }
            autoOutput = true;
            ext = _path2.default.extname(name);

            output = name.slice(0, -ext.length || undefined);
            output = _path2.default.resolve(outputPath || '', output);
            _context3.next = 83;
            break;

          case 82:
            output = _path2.default.resolve(output);

          case 83:

            // targets

            sTargets = argv.t || argv.target || argv.targets || '';

            if (!(typeof sTargets !== 'string')) {
              _context3.next = 86;
              break;
            }

            throw (0, _log.wasReported)(`Something is wrong near ${(0, _stringify2.default)(sTargets)}`);

          case 86:
            targets = parseTargets(sTargets.split(',').filter(function (t) {
              return t;
            }));


            if (!targets.length) {
              jsonTargets = void 0;

              if (inputJson && inputJson.pkg) {
                jsonTargets = inputJson.pkg.targets;
              } else if (configJson && configJson.pkg) {
                jsonTargets = configJson.pkg.targets;
              }
              if (jsonTargets) {
                targets = parseTargets(jsonTargets);
              }
            }

            if (!targets.length) {
              if (!autoOutput) {
                targets = parseTargets(['host']);
                (0, _assert2.default)(targets.length === 1);
              } else {
                targets = parseTargets(['linux', 'macos', 'win']);
              }
              _log.log.info('Targets not specified. Assuming:', `${targets.map(stringifyTarget).join(', ')}`);
            }

            // differentParts

            different = differentParts(targets);

            // targets[].output

            _iteratorNormalCompletion4 = true;
            _didIteratorError4 = false;
            _iteratorError4 = undefined;
            _context3.prev = 93;
            for (_iterator4 = (0, _getIterator3.default)(targets); !(_iteratorNormalCompletion4 = (_step4 = _iterator4.next()).done); _iteratorNormalCompletion4 = true) {
              target = _step4.value;
              file = void 0;

              if (targets.length === 1) {
                file = output;
              } else {
                file = stringifyTargetForOutput(output, target, different);
              }
              if (target.platform === 'win' && _path2.default.extname(file) !== '.exe') file += '.exe';
              target.output = file;
            }

            // bakes

            _context3.next = 101;
            break;

          case 97:
            _context3.prev = 97;
            _context3.t2 = _context3['catch'](93);
            _didIteratorError4 = true;
            _iteratorError4 = _context3.t2;

          case 101:
            _context3.prev = 101;
            _context3.prev = 102;

            if (!_iteratorNormalCompletion4 && _iterator4.return) {
              _iterator4.return();
            }

          case 104:
            _context3.prev = 104;

            if (!_didIteratorError4) {
              _context3.next = 107;
              break;
            }

            throw _iteratorError4;

          case 107:
            return _context3.finish(104);

          case 108:
            return _context3.finish(101);

          case 109:
            bakes = (argv.options || '').split(',').filter(function (bake) {
              return bake;
            }).map(function (bake) {
              return '--' + bake;
            });

            // check if input is going
            // to be overwritten by output

            _iteratorNormalCompletion5 = true;
            _didIteratorError5 = false;
            _iteratorError5 = undefined;
            _context3.prev = 113;
            _iterator5 = (0, _getIterator3.default)(targets);

          case 115:
            if (_iteratorNormalCompletion5 = (_step5 = _iterator5.next()).done) {
              _context3.next = 126;
              break;
            }

            _target = _step5.value;

            if (!(_target.output === inputFin)) {
              _context3.next = 123;
              break;
            }

            if (!autoOutput) {
              _context3.next = 122;
              break;
            }

            _target.output += '-' + _target.platform;
            _context3.next = 123;
            break;

          case 122:
            throw (0, _log.wasReported)('Refusing to overwrite input file', [inputFin]);

          case 123:
            _iteratorNormalCompletion5 = true;
            _context3.next = 115;
            break;

          case 126:
            _context3.next = 132;
            break;

          case 128:
            _context3.prev = 128;
            _context3.t3 = _context3['catch'](113);
            _didIteratorError5 = true;
            _iteratorError5 = _context3.t3;

          case 132:
            _context3.prev = 132;
            _context3.prev = 133;

            if (!_iteratorNormalCompletion5 && _iterator5.return) {
              _iterator5.return();
            }

          case 135:
            _context3.prev = 135;

            if (!_didIteratorError5) {
              _context3.next = 138;
              break;
            }

            throw _iteratorError5;

          case 138:
            return _context3.finish(135);

          case 139:
            return _context3.finish(132);

          case 140:

            // fetch targets

            bytecode = argv.bytecode;
            _iteratorNormalCompletion6 = true;
            _didIteratorError6 = false;
            _iteratorError6 = undefined;
            _context3.prev = 144;
            _iterator6 = (0, _getIterator3.default)(targets);

          case 146:
            if (_iteratorNormalCompletion6 = (_step6 = _iterator6.next()).done) {
              _context3.next = 159;
              break;
            }

            _target2 = _step6.value;

            _target2.forceBuild = forceBuild;
            _context3.next = 151;
            return needWithDryRun(_target2);

          case 151:
            f = _target2.fabricator = fabricatorForTarget(_target2);

            f.forceBuild = forceBuild;

            if (!bytecode) {
              _context3.next = 156;
              break;
            }

            _context3.next = 156;
            return needWithDryRun(f);

          case 156:
            _iteratorNormalCompletion6 = true;
            _context3.next = 146;
            break;

          case 159:
            _context3.next = 165;
            break;

          case 161:
            _context3.prev = 161;
            _context3.t4 = _context3['catch'](144);
            _didIteratorError6 = true;
            _iteratorError6 = _context3.t4;

          case 165:
            _context3.prev = 165;
            _context3.prev = 166;

            if (!_iteratorNormalCompletion6 && _iterator6.return) {
              _iterator6.return();
            }

          case 168:
            _context3.prev = 168;

            if (!_didIteratorError6) {
              _context3.next = 171;
              break;
            }

            throw _iteratorError6;

          case 171:
            return _context3.finish(168);

          case 172:
            return _context3.finish(165);

          case 173:

            if (dryRunResults.fetched && !dryRunResults.built) {
              _log.log.info('Fetching base Node.js binaries to PKG_CACHE_PATH');
            }

            _iteratorNormalCompletion7 = true;
            _didIteratorError7 = false;
            _iteratorError7 = undefined;
            _context3.prev = 177;
            _iterator7 = (0, _getIterator3.default)(targets);

          case 179:
            if (_iteratorNormalCompletion7 = (_step7 = _iterator7.next()).done) {
              _context3.next = 195;
              break;
            }

            _target3 = _step7.value;
            _context3.next = 183;
            return needViaCache(_target3);

          case 183:
            _target3.binaryPath = _context3.sent;
            f = _target3.fabricator;

            if (!bytecode) {
              _context3.next = 192;
              break;
            }

            _context3.next = 188;
            return needViaCache(f);

          case 188:
            f.binaryPath = _context3.sent;

            if (!(f.platform !== 'win')) {
              _context3.next = 192;
              break;
            }

            _context3.next = 192;
            return (0, _chmod.plusx)(f.binaryPath);

          case 192:
            _iteratorNormalCompletion7 = true;
            _context3.next = 179;
            break;

          case 195:
            _context3.next = 201;
            break;

          case 197:
            _context3.prev = 197;
            _context3.t5 = _context3['catch'](177);
            _didIteratorError7 = true;
            _iteratorError7 = _context3.t5;

          case 201:
            _context3.prev = 201;
            _context3.prev = 202;

            if (!_iteratorNormalCompletion7 && _iterator7.return) {
              _iterator7.return();
            }

          case 204:
            _context3.prev = 204;

            if (!_didIteratorError7) {
              _context3.next = 207;
              break;
            }

            throw _iteratorError7;

          case 207:
            return _context3.finish(204);

          case 208:
            return _context3.finish(201);

          case 209:

            // marker

            marker = void 0;


            if (configJson) {
              marker = {
                config: configJson,
                base: _path2.default.dirname(config),
                configPath: config
              };
            } else {
              marker = {
                config: inputJson || {}, // not `inputBin` because only `input`
                base: _path2.default.dirname(input), // is the place for `inputJson`
                configPath: input
              };
            }

            marker.toplevel = true;

            // public

            params = {};

            if (argv.public) {
              params.publicToplevel = true;
            }
            if (argv['public-packages']) {
              params.publicPackages = argv['public-packages'].split(',');
              if (params.publicPackages.indexOf('*') !== -1) {
                params.publicPackages = ['*'];
              }
            }

            // records

            records = void 0;
            entrypoint = inputFin;
            addition = isConfiguration(input) ? input : undefined;
            _context3.next = 220;
            return (0, _walker2.default)(marker, entrypoint, addition, params);

          case 220:
            walkResult = _context3.sent;

            entrypoint = walkResult.entrypoint;
            records = walkResult.records;

            refineResult = (0, _refiner2.default)(records, entrypoint);

            entrypoint = refineResult.entrypoint;
            records = refineResult.records;

            backpack = (0, _packer2.default)({ records, entrypoint, bytecode });


            _log.log.debug('Targets:', (0, _stringify2.default)(targets, null, 2));

            _iteratorNormalCompletion8 = true;
            _didIteratorError8 = false;
            _iteratorError8 = undefined;
            _context3.prev = 231;
            _iterator8 = (0, _getIterator3.default)(targets);

          case 233:
            if (_iteratorNormalCompletion8 = (_step8 = _iterator8.next()).done) {
              _context3.next = 259;
              break;
            }

            _target4 = _step8.value;
            _context3.next = 237;
            return (0, _fsExtra.exists)(_target4.output);

          case 237:
            if (!_context3.sent) {
              _context3.next = 248;
              break;
            }

            _context3.next = 240;
            return (0, _fsExtra.stat)(_target4.output);

          case 240:
            if (!_context3.sent.isFile()) {
              _context3.next = 245;
              break;
            }

            _context3.next = 243;
            return (0, _fsExtra.remove)(_target4.output);

          case 243:
            _context3.next = 246;
            break;

          case 245:
            throw (0, _log.wasReported)('Refusing to overwrite non-file output', [_target4.output]);

          case 246:
            _context3.next = 250;
            break;

          case 248:
            _context3.next = 250;
            return (0, _fsExtra.mkdirp)(_path2.default.dirname(_target4.output));

          case 250:
            slash = _target4.platform === 'win' ? '\\' : '/';
            _context3.next = 253;
            return (0, _producer2.default)({ backpack, bakes, slash, target: _target4 });

          case 253:
            if (!(_target4.platform !== 'win')) {
              _context3.next = 256;
              break;
            }

            _context3.next = 256;
            return (0, _chmod.plusx)(_target4.output);

          case 256:
            _iteratorNormalCompletion8 = true;
            _context3.next = 233;
            break;

          case 259:
            _context3.next = 265;
            break;

          case 261:
            _context3.prev = 261;
            _context3.t6 = _context3['catch'](231);
            _didIteratorError8 = true;
            _iteratorError8 = _context3.t6;

          case 265:
            _context3.prev = 265;
            _context3.prev = 266;

            if (!_iteratorNormalCompletion8 && _iterator8.return) {
              _iterator8.return();
            }

          case 268:
            _context3.prev = 268;

            if (!_didIteratorError8) {
              _context3.next = 271;
              break;
            }

            throw _iteratorError8;

          case 271:
            return _context3.finish(268);

          case 272:
            return _context3.finish(265);

          case 273:

            (0, _fabricator.shutdown)();

          case 274:
          case 'end':
            return _context3.stop();
        }
      }
    }, _callee3, this, [[93, 97, 101, 109], [102,, 104, 108], [113, 128, 132, 140], [133,, 135, 139], [144, 161, 165, 173], [166,, 168, 172], [177, 197, 201, 209], [202,, 204, 208], [231, 261, 265, 273], [266,, 268, 272]]);
  }));

  return function exec(_x3) {
    return _ref3.apply(this, arguments);
  };
}();

var _fsExtra = require('fs-extra');

var _log = require('./log.js');

var _pkgFetch = require('pkg-fetch');

var _assert = require('assert');

var _assert2 = _interopRequireDefault(_assert);

var _help = require('./help');

var _help2 = _interopRequireDefault(_help);

var _common = require('../prelude/common.js');

var _minimist = require('minimist');

var _minimist2 = _interopRequireDefault(_minimist);

var _packer = require('./packer.js');

var _packer2 = _interopRequireDefault(_packer);

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

var _chmod = require('./chmod.js');

var _producer = require('./producer.js');

var _producer2 = _interopRequireDefault(_producer);

var _refiner = require('./refiner.js');

var _refiner2 = _interopRequireDefault(_refiner);

var _fabricator = require('./fabricator.js');

var _package = require('../package.json');

var _walker = require('./walker.js');

var _walker2 = _interopRequireDefault(_walker);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function isConfiguration(file) {
  return (0, _common.isPackageJson)(file) || file.endsWith('.config.json');
}

// http://www.openwall.com/lists/musl/2012/12/08/4

var hostArch = _pkgFetch.system.hostArch,
    hostPlatform = _pkgFetch.system.hostPlatform,
    isValidNodeRange = _pkgFetch.system.isValidNodeRange,
    knownArchs = _pkgFetch.system.knownArchs,
    knownPlatforms = _pkgFetch.system.knownPlatforms,
    toFancyArch = _pkgFetch.system.toFancyArch,
    toFancyPlatform = _pkgFetch.system.toFancyPlatform;

var hostNodeRange = 'node' + process.version.match(/^v(\d+)/)[1];

function parseTargets(items) {
  // [ 'node6-macos-x64', 'node6-linux-x64' ]
  var targets = [];
  var _iteratorNormalCompletion = true;
  var _didIteratorError = false;
  var _iteratorError = undefined;

  try {
    for (var _iterator = (0, _getIterator3.default)(items), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
      var item = _step.value;

      var target = {
        nodeRange: hostNodeRange,
        platform: hostPlatform,
        arch: hostArch
      };
      if (item !== 'host') {
        var _iteratorNormalCompletion2 = true;
        var _didIteratorError2 = false;
        var _iteratorError2 = undefined;

        try {
          for (var _iterator2 = (0, _getIterator3.default)(item.split('-')), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
            var token = _step2.value;

            if (!token) continue;
            if (isValidNodeRange(token)) {
              target.nodeRange = token;
              continue;
            }
            var p = toFancyPlatform(token);
            if (knownPlatforms.indexOf(p) >= 0) {
              target.platform = p;
              continue;
            }
            var a = toFancyArch(token);
            if (knownArchs.indexOf(a) >= 0) {
              target.arch = a;
              continue;
            }
            throw (0, _log.wasReported)(`Unknown token '${token}' in '${item}'`);
          }
        } catch (err) {
          _didIteratorError2 = true;
          _iteratorError2 = err;
        } finally {
          try {
            if (!_iteratorNormalCompletion2 && _iterator2.return) {
              _iterator2.return();
            }
          } finally {
            if (_didIteratorError2) {
              throw _iteratorError2;
            }
          }
        }
      }
      targets.push(target);
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

  return targets;
}

function stringifyTarget(target) {
  var nodeRange = target.nodeRange,
      platform = target.platform,
      arch = target.arch;

  return `${nodeRange}-${platform}-${arch}`;
}

function differentParts(targets) {
  var nodeRanges = {};
  var platforms = {};
  var archs = {};
  var _iteratorNormalCompletion3 = true;
  var _didIteratorError3 = false;
  var _iteratorError3 = undefined;

  try {
    for (var _iterator3 = (0, _getIterator3.default)(targets), _step3; !(_iteratorNormalCompletion3 = (_step3 = _iterator3.next()).done); _iteratorNormalCompletion3 = true) {
      var target = _step3.value;

      nodeRanges[target.nodeRange] = true;
      platforms[target.platform] = true;
      archs[target.arch] = true;
    }
  } catch (err) {
    _didIteratorError3 = true;
    _iteratorError3 = err;
  } finally {
    try {
      if (!_iteratorNormalCompletion3 && _iterator3.return) {
        _iterator3.return();
      }
    } finally {
      if (_didIteratorError3) {
        throw _iteratorError3;
      }
    }
  }

  var result = {};
  if ((0, _keys2.default)(nodeRanges).length > 1) {
    result.nodeRange = true;
  }
  if ((0, _keys2.default)(platforms).length > 1) {
    result.platform = true;
  }
  if ((0, _keys2.default)(archs).length > 1) {
    result.arch = true;
  }
  return result;
}

function stringifyTargetForOutput(output, target, different) {
  var a = [output];
  if (different.nodeRange) a.push(target.nodeRange);
  if (different.platform) a.push(target.platform);
  if (different.arch) a.push(target.arch);
  return a.join('-');
}

function fabricatorForTarget(target) {
  var nodeRange = target.nodeRange,
      arch = target.arch;

  return { nodeRange, platform: hostPlatform, arch };
}

var dryRunResults = {};

var targetsCache = {};