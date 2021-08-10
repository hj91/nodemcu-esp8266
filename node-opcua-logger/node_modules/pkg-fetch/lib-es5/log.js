'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.log = undefined;

var _getIterator2 = require('babel-runtime/core-js/get-iterator');

var _getIterator3 = _interopRequireDefault(_getIterator2);

var _classCallCheck2 = require('babel-runtime/helpers/classCallCheck');

var _classCallCheck3 = _interopRequireDefault(_classCallCheck2);

var _createClass2 = require('babel-runtime/helpers/createClass');

var _createClass3 = _interopRequireDefault(_createClass2);

exports.wasReported = wasReported;

var _progress = require('progress');

var _progress2 = _interopRequireDefault(_progress);

var _assert = require('assert');

var _assert2 = _interopRequireDefault(_assert);

var _chalk = require('chalk');

var _chalk2 = _interopRequireDefault(_chalk);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var Log = function () {
  function Log() {
    (0, _classCallCheck3.default)(this, Log);
  }

  (0, _createClass3.default)(Log, [{
    key: '_lines',
    value: function _lines(lines) {
      if (lines === undefined) return;
      if (!Array.isArray(lines)) {
        console.log('  ' + lines);
        return;
      }
      var _iteratorNormalCompletion = true;
      var _didIteratorError = false;
      var _iteratorError = undefined;

      try {
        for (var _iterator = (0, _getIterator3.default)(lines), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
          var line = _step.value;

          console.log('  ' + line);
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
    }
  }, {
    key: 'debug',
    value: function debug(text, lines) {
      if (!this.debugMode) return;
      console.log('> ' + _chalk2.default.green('[debug]') + ' ' + text);
      this._lines(lines);
    }
  }, {
    key: 'info',
    value: function info(text, lines) {
      console.log('> ' + text);
      this._lines(lines);
    }
  }, {
    key: 'warn',
    value: function warn(text, lines) {
      console.log('> ' + _chalk2.default.blue('Warning') + ' ' + text);
      this._lines(lines);
    }
  }, {
    key: 'error',
    value: function error(text, lines) {
      if (text.stack) text = text.stack;
      console.log('> ' + _chalk2.default.red('Error!') + ' ' + text);
      this._lines(lines);
    }
  }, {
    key: 'enableProgress',
    value: function enableProgress(text) {
      (0, _assert2.default)(!this.bar);
      text += ' '.repeat(28 - text.length);
      this.bar = new _progress2.default('  ' + text + ' [:bar] :percent', {
        stream: process.stdout,
        width: 20,
        complete: '=',
        incomplete: ' ',
        total: 100
      });
    }
  }, {
    key: 'showProgress',
    value: function showProgress(percentage) {
      if (!this.bar) return;
      this.bar.update(percentage / 100);
    }
  }, {
    key: 'disableProgress',
    value: function disableProgress() {
      if (!this.bar) return;
      // avoid empty line
      if (!this.bar.complete) {
        this.bar.terminate();
      }
      delete this.bar;
    }
  }]);
  return Log;
}();

var log = exports.log = new Log();

function wasReported(error, lines) {
  if (error === undefined) {
    error = new Error('No message');
  } else if (typeof error === 'string') {
    log.error(error, lines);
    error = new Error(error);
  }
  error.wasReported = true;
  return error;
}