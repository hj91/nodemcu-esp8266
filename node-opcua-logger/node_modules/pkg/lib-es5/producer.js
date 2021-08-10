'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _getIterator2 = require('babel-runtime/core-js/get-iterator');

var _getIterator3 = _interopRequireDefault(_getIterator2);

var _stringify = require('babel-runtime/core-js/json/stringify');

var _stringify2 = _interopRequireDefault(_stringify);

var _assign = require('babel-runtime/core-js/object/assign');

var _assign2 = _interopRequireDefault(_assign);

var _promise = require('babel-runtime/core-js/promise');

var _promise2 = _interopRequireDefault(_promise);

exports.default = function (_ref) {
  var backpack = _ref.backpack,
      bakes = _ref.bakes,
      slash = _ref.slash,
      target = _ref.target;

  return new _promise2.default(function (resolve, reject) {
    if (!Buffer.alloc) {
      throw (0, _log.wasReported)('Your node.js does not have Buffer.alloc. Please upgrade!');
    }

    var prelude = backpack.prelude,
        entrypoint = backpack.entrypoint,
        stripes = backpack.stripes;

    entrypoint = (0, _common.snapshotify)(entrypoint, slash);
    stripes = stripes.slice();

    var vfs = {};
    var _iteratorNormalCompletion = true;
    var _didIteratorError = false;
    var _iteratorError = undefined;

    try {
      for (var _iterator = (0, _getIterator3.default)(stripes), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
        var stripe = _step.value;
        var snap = stripe.snap;

        snap = (0, _common.snapshotify)(snap, slash);
        if (!vfs[snap]) vfs[snap] = {};
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

    var meter = void 0;
    var count = 0;

    function pipeToNewMeter(s) {
      meter = (0, _streamMeter2.default)();
      return s.pipe(meter);
    }

    function next(s) {
      count += 1;
      return pipeToNewMeter(s);
    }

    var binaryBuffer = _fs2.default.readFileSync(target.binaryPath);
    var placeholders = discoverPlaceholders(binaryBuffer);

    var track = 0;
    var prevStripe = void 0;

    var payloadPosition = void 0;
    var payloadSize = void 0;
    var preludePosition = void 0;
    var preludeSize = void 0;

    (0, _multistream2.default)(function (cb) {
      if (count === 0) {
        return cb(undefined, next((0, _intoStream2.default)(binaryBuffer)));
      } else if (count === 1) {
        payloadPosition = meter.bytes;
        return cb(undefined, next((0, _intoStream2.default)(Buffer.alloc(0))));
      } else if (count === 2) {
        if (prevStripe && !prevStripe.skip) {
          var _prevStripe = prevStripe,
              snap = _prevStripe.snap,
              store = _prevStripe.store;

          snap = (0, _common.snapshotify)(snap, slash);
          vfs[snap][store] = [track, meter.bytes];
          track += meter.bytes;
        }

        if (stripes.length) {
          // clone to prevent 'skip' propagate
          // to other targets, since same stripe
          // is used for several targets
          var _stripe = (0, _assign2.default)({}, stripes.shift());
          prevStripe = _stripe;

          if (_stripe.buffer) {
            if (_stripe.store === _common.STORE_BLOB) {
              var _snap = (0, _common.snapshotify)(_stripe.snap, slash);
              return (0, _fabricator.fabricateTwice)(bakes, target.fabricator, _snap, _stripe.buffer, function (error, buffer) {
                if (error) {
                  _log.log.warn(error.message);
                  _stripe.skip = true;
                  return cb(undefined, (0, _intoStream2.default)(Buffer.alloc(0)));
                }

                cb(undefined, pipeToNewMeter((0, _intoStream2.default)(buffer)));
              });
            } else {
              return cb(undefined, pipeToNewMeter((0, _intoStream2.default)(_stripe.buffer)));
            }
          } else if (_stripe.file) {
            if (_stripe.file === target.output) {
              return cb((0, _log.wasReported)('Trying to take executable into executable', _stripe.file));
            }

            _assert2.default.equal(_stripe.store, _common.STORE_CONTENT); // others must be buffers from walker
            return cb(undefined, pipeToNewMeter(_fs2.default.createReadStream(_stripe.file)));
          } else {
            (0, _assert2.default)(false, 'producer: bad stripe');
          }
        } else {
          payloadSize = track;
          preludePosition = payloadPosition + payloadSize;
          return cb(undefined, next((0, _intoStream2.default)(makePreludeBufferFromPrelude(replaceDollarWise(replaceDollarWise(prelude, '%VIRTUAL_FILESYSTEM%', (0, _stringify2.default)(vfs)), '%DEFAULT_ENTRYPOINT%', (0, _stringify2.default)(entrypoint))))));
        }
      } else {
        return cb();
      }
    }).on('error', function (error) {
      reject(error);
    }).pipe(_fs2.default.createWriteStream(target.output)).on('error', function (error) {
      reject(error);
    }).on('close', function () {
      preludeSize = meter.bytes;
      _fs2.default.open(target.output, 'r+', function (error, fd) {
        if (error) return reject(error);
        injectPlaceholders(fd, placeholders, {
          BAKERY: makeBakeryValueFromBakes(bakes),
          PAYLOAD_POSITION: payloadPosition,
          PAYLOAD_SIZE: payloadSize,
          PRELUDE_POSITION: preludePosition,
          PRELUDE_SIZE: preludeSize
        }, function (error2) {
          if (error2) return reject(error2);
          _fs2.default.close(fd, function (error3) {
            if (error3) return reject(error3);
            resolve();
          });
        });
      });
    });
  });
};

var _common = require('../prelude/common.js');

var _log = require('./log.js');

var _assert = require('assert');

var _assert2 = _interopRequireDefault(_assert);

var _fabricator = require('./fabricator.js');

var _fs = require('fs');

var _fs2 = _interopRequireDefault(_fs);

var _intoStream = require('into-stream');

var _intoStream2 = _interopRequireDefault(_intoStream);

var _multistream = require('multistream');

var _multistream2 = _interopRequireDefault(_multistream);

var _streamMeter = require('stream-meter');

var _streamMeter2 = _interopRequireDefault(_streamMeter);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function discoverPlaceholder(binaryBuffer, searchString, padder) {
  var placeholder = Buffer.from(searchString);
  var position = binaryBuffer.indexOf(placeholder);
  if (position === -1) return { notFound: true };
  return { position, size: placeholder.length, padder };
}

function injectPlaceholder(fd, placeholder, value, cb) {
  var notFound = placeholder.notFound,
      position = placeholder.position,
      size = placeholder.size,
      padder = placeholder.padder;

  if (notFound) (0, _assert2.default)(false, 'Placeholder for not found');
  if (typeof value === 'number') value = value.toString();
  if (typeof value === 'string') value = Buffer.from(value);
  var padding = Buffer.from(padder.repeat(size - value.length));
  value = Buffer.concat([value, padding]);
  _fs2.default.write(fd, value, 0, value.length, position, cb);
}

function discoverPlaceholders(binaryBuffer) {
  return {
    BAKERY: discoverPlaceholder(binaryBuffer, '\0' + '// BAKERY '.repeat(20), '\0'),
    PAYLOAD_POSITION: discoverPlaceholder(binaryBuffer, '// PAYLOAD_POSITION //', ' '),
    PAYLOAD_SIZE: discoverPlaceholder(binaryBuffer, '// PAYLOAD_SIZE //', ' '),
    PRELUDE_POSITION: discoverPlaceholder(binaryBuffer, '// PRELUDE_POSITION //', ' '),
    PRELUDE_SIZE: discoverPlaceholder(binaryBuffer, '// PRELUDE_SIZE //', ' ')
  };
}

function injectPlaceholders(fd, placeholders, values, cb) {
  injectPlaceholder(fd, placeholders.BAKERY, values.BAKERY, function (error) {
    if (error) return cb(error);
    injectPlaceholder(fd, placeholders.PAYLOAD_POSITION, values.PAYLOAD_POSITION, function (error2) {
      if (error2) return cb(error2);
      injectPlaceholder(fd, placeholders.PAYLOAD_SIZE, values.PAYLOAD_SIZE, function (error3) {
        if (error3) return cb(error3);
        injectPlaceholder(fd, placeholders.PRELUDE_POSITION, values.PRELUDE_POSITION, function (error4) {
          if (error4) return cb(error4);
          injectPlaceholder(fd, placeholders.PRELUDE_SIZE, values.PRELUDE_SIZE, cb);
        });
      });
    });
  });
}

function makeBakeryValueFromBakes(bakes) {
  var parts = [];
  if (bakes.length) {
    for (var i = 0; i < bakes.length; i += 1) {
      parts.push(Buffer.from(bakes[i]));
      parts.push(Buffer.alloc(1));
    }
    parts.push(Buffer.alloc(1));
  }
  return Buffer.concat(parts);
}

function replaceDollarWise(s, sf, st) {
  return s.replace(sf, function () {
    return st;
  });
}

function makePreludeBufferFromPrelude(prelude) {
  return Buffer.from('(function(process, require, console, EXECPATH_FD, PAYLOAD_POSITION, PAYLOAD_SIZE) { ' + prelude + '\n})' // dont remove \n
  );
}