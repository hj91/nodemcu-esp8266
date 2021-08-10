'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _assign = require('babel-runtime/core-js/object/assign');

var _assign2 = _interopRequireDefault(_assign);

var _stringify = require('babel-runtime/core-js/json/stringify');

var _stringify2 = _interopRequireDefault(_stringify);

exports.default = function (_ref) {
  var records = _ref.records,
      entrypoint = _ref.entrypoint,
      bytecode = _ref.bytecode;

  var stripes = [];

  for (var snap in records) {
    var record = records[snap];
    var file = record.file;

    if (!hasAnyStore(record)) continue;
    (0, _assert2.default)(record[_common.STORE_STAT], 'packer: no STORE_STAT');

    if ((0, _common.isDotNODE)(file)) {
      continue;
    } else {
      (0, _assert2.default)(record[_common.STORE_BLOB] || record[_common.STORE_CONTENT] || record[_common.STORE_LINKS]);
    }

    if (record[_common.STORE_BLOB] && !bytecode) {
      delete record[_common.STORE_BLOB];
      if (!record[_common.STORE_CONTENT]) {
        // TODO make a test for it?
        throw (0, _log.wasReported)('--no-bytecode and no source breaks final executable', [file, 'Please run with "-d" and without "--no-bytecode" first, and make', 'sure that debug log does not contain "was included as bytecode".']);
      }
    }

    var _arr2 = [_common.STORE_BLOB, _common.STORE_CONTENT, _common.STORE_LINKS, _common.STORE_STAT];
    for (var _i2 = 0; _i2 < _arr2.length; _i2++) {
      var store = _arr2[_i2];
      var value = record[store];
      if (!value) continue;

      if (store === _common.STORE_BLOB || store === _common.STORE_CONTENT) {
        if (record.body === undefined) {
          stripes.push({ snap, store, file });
        } else if (Buffer.isBuffer(record.body)) {
          stripes.push({ snap, store, buffer: record.body });
        } else if (typeof record.body === 'string') {
          stripes.push({ snap, store, buffer: Buffer.from(record.body) });
        } else {
          (0, _assert2.default)(false, 'packer: bad STORE_BLOB/STORE_CONTENT');
        }
      } else if (store === _common.STORE_LINKS) {
        if (Array.isArray(value)) {
          var buffer = Buffer.from((0, _stringify2.default)(value));
          stripes.push({ snap, store, buffer });
        } else {
          (0, _assert2.default)(false, 'packer: bad STORE_LINKS');
        }
      } else if (store === _common.STORE_STAT) {
        if (typeof value === 'object') {
          // reproducible
          delete value.atime;
          delete value.atimeMs;
          delete value.mtime;
          delete value.mtimeMs;
          delete value.ctime;
          delete value.ctimeMs;
          delete value.birthtime;
          delete value.birthtimeMs;
          // non-date
          delete value.blksize;
          delete value.blocks;
          delete value.dev;
          delete value.gid;
          delete value.ino;
          delete value.nlink;
          delete value.rdev;
          delete value.uid;
          if (!value.isFile()) value.size = 0;
          // portable
          var newStat = (0, _assign2.default)({}, value);
          newStat.isFileValue = value.isFile();
          newStat.isDirectoryValue = value.isDirectory();
          var _buffer = Buffer.from((0, _stringify2.default)(newStat));
          stripes.push({ snap, store, buffer: _buffer });
        } else {
          (0, _assert2.default)(false, 'packer: bad STORE_STAT');
        }
      } else {
        (0, _assert2.default)(false, 'packer: unknown store');
      }
    }

    if (record[_common.STORE_CONTENT]) {
      var disclosed = (0, _common.isDotJS)(file) || (0, _common.isDotJSON)(file);
      _log.log.debug(disclosed ? 'The file was included as DISCLOSED code (with sources)' : 'The file was included as asset content', file);
    } else if (record[_common.STORE_BLOB]) {
      _log.log.debug('The file was included as bytecode (no sources)', file);
    } else if (record[_common.STORE_LINKS]) {
      var value = record[_common.STORE_LINKS];
      _log.log.debug('The directory files list was included (' + itemsToText(value) + ')', file);
    }
  }

  var prelude = 'return (function (REQUIRE_COMMON, VIRTUAL_FILESYSTEM, DEFAULT_ENTRYPOINT) { ' + bootstrapText + '\n})(function (exports) {\n' + commonText + '\n},\n' + '%VIRTUAL_FILESYSTEM%' + '\n,\n' + '%DEFAULT_ENTRYPOINT%' + '\n);';

  return { prelude, entrypoint, stripes };
};

var _common = require('../prelude/common.js');

var _log = require('./log.js');

var _assert = require('assert');

var _assert2 = _interopRequireDefault(_assert);

var _fsExtra = require('fs-extra');

var _fsExtra2 = _interopRequireDefault(_fsExtra);

var _package = require('../package.json');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var bootstrapText = _fsExtra2.default.readFileSync(require.resolve('../prelude/bootstrap.js'), 'utf8').replace('%VERSION%', _package.version); /* eslint-disable complexity */

var commonText = _fsExtra2.default.readFileSync(require.resolve('../prelude/common.js'), 'utf8');

function itemsToText(items) {
  var len = items.length;
  return len.toString() + (len % 10 === 1 ? ' item' : ' items');
}

function hasAnyStore(record) {
  // discarded records like native addons
  var _arr = [_common.STORE_BLOB, _common.STORE_CONTENT, _common.STORE_LINKS, _common.STORE_STAT];
  for (var _i = 0; _i < _arr.length; _i++) {
    var store = _arr[_i];
    if (record[store]) return true;
  }
  return false;
}