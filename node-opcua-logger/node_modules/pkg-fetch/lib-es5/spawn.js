'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _promise = require('babel-runtime/core-js/promise');

var _promise2 = _interopRequireDefault(_promise);

exports.spawn = spawn;
exports.progress = progress;

var _byline = require('byline');

var _byline2 = _interopRequireDefault(_byline);

var _child_process = require('child_process');

var _child_process2 = _interopRequireDefault(_child_process);

var _fs = require('fs');

var _fs2 = _interopRequireDefault(_fs);

var _log = require('./log.js');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var MAX_LINES = 20;
var DEBUG_THRESHOLDS = false;

function errorLines(lines) {
  return lines.slice(-MAX_LINES).map(function (line) {
    return line[1];
  }).join('\n');
}

function spawn(cmd, args, opts) {
  var child = _child_process2.default.spawn(cmd, args, opts);
  var stdout = (0, _byline2.default)(child.stdout);
  var stderr = (0, _byline2.default)(child.stderr);
  var lines = [];

  var onData = function onData(data) {
    var time = new Date().getTime();
    lines.push([time, data.toString()]); // TODO chalk stdout/stderr?
    var thresholds = this.thresholds; // eslint-disable-line no-invalid-this

    if (thresholds) {
      for (var key in thresholds) {
        if (data.indexOf(key) >= 0) {
          var p = thresholds[key];
          _log.log.showProgress(p);
          if (DEBUG_THRESHOLDS) {
            lines.push([time, '************']);
            lines.push([time, p + ': ' + key]);
            lines.push([time, '************']);
          }
        }
      }
    }
  };

  var promise = new _promise2.default(function (resolve, reject) {
    child.on('error', function (error) {
      console.error(errorLines(lines)); // dont use `log` here
      reject(error);
    });
    child.on('close', function (code) {
      if (code) {
        console.error(errorLines(lines)); // dont use `log` here
        return reject(new Error(cmd + ' failed with code ' + code));
      }
      resolve();
    });
  });

  onData = onData.bind(promise);
  if (stdout) stdout.on('data', onData);
  if (stderr) stderr.on('data', onData);

  promise.child = child;
  promise.lines = lines;
  return promise;
}

function progress(promise, thresholds) {
  promise.thresholds = thresholds;
  var child = promise.child,
      lines = promise.lines;

  _log.log.enableProgress(promise.child.spawnfile);
  _log.log.showProgress(0);
  var start = new Date().getTime();
  child.on('close', function () {
    if (DEBUG_THRESHOLDS) {
      var finish = new Date().getTime();
      var content = lines.map(function (line) {
        return (100 * (line[0] - start) / (finish - start) | 0) + ': ' + line[1];
      }).join('\n');
      _fs2.default.writeFileSync(child.spawnfile + '.debug', content);
    }
    _log.log.showProgress(100);
    _log.log.disableProgress();
  });
}