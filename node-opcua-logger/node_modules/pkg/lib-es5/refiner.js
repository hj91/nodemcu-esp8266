'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _keys = require('babel-runtime/core-js/object/keys');

var _keys2 = _interopRequireDefault(_keys);

exports.default = function (records, entrypoint) {
  purgeTopDirectories(records);
  var denominator = (0, _common.retrieveDenominator)((0, _keys2.default)(records));
  return denominate(records, entrypoint, denominator);
};

var _common = require('../prelude/common.js');

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function hasParent(file, records) {
  var dirname = _path2.default.dirname(file);
  if (dirname === file) return false; // root directory
  return Boolean(records[dirname]);
}

function purgeTopDirectories(records) {
  while (true) {
    var found = false;

    for (var file in records) {
      var record = records[file];
      var links = record[_common.STORE_LINKS];
      if (links && links.length === 1) {
        if (!hasParent(file, records)) {
          var file2 = _path2.default.join(file, links[0]);
          var record2 = records[file2];
          var links2 = record2[_common.STORE_LINKS];
          if (links2 && links2.length === 1) {
            var file3 = _path2.default.join(file2, links2[0]);
            var record3 = records[file3];
            var links3 = record3[_common.STORE_LINKS];
            if (links3) {
              delete records[file];
              found = true;
            }
          }
        }
      }
    }

    if (!found) break;
  }
}

var win32 = process.platform === 'win32';

function denominate(records, entrypoint, denominator) {
  var newRecords = {};

  for (var file in records) {
    var snap = (0, _common.substituteDenominator)(file, denominator);

    if (win32) {
      if (snap.slice(1) === ':') snap += '\\';
    } else {
      if (snap === '') snap = '/';
    }

    newRecords[snap] = records[file];
  }

  return {
    records: newRecords,
    entrypoint: (0, _common.substituteDenominator)(entrypoint, denominator)
  };
}