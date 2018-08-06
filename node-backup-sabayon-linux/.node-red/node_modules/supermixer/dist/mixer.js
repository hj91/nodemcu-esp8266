'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});
exports['default'] = mixer;

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _lodashObjectForOwn = require('lodash/object/forOwn');

var _lodashObjectForOwn2 = _interopRequireDefault(_lodashObjectForOwn);

var _lodashObjectForIn = require('lodash/object/forIn');

var _lodashObjectForIn2 = _interopRequireDefault(_lodashObjectForIn);

var _lodashLangCloneDeep = require('lodash/lang/cloneDeep');

var _lodashLangCloneDeep2 = _interopRequireDefault(_lodashLangCloneDeep);

var _lodashLangIsObject = require('lodash/lang/isObject');

var _lodashLangIsObject2 = _interopRequireDefault(_lodashLangIsObject);

var _lodashLangIsUndefined = require('lodash/lang/isUndefined');

var _lodashLangIsUndefined2 = _interopRequireDefault(_lodashLangIsUndefined);

/**
 * Factory for creating mixin functions of all kinds.
 *
 * @param {Object} opts
 * @param {Function} opts.filter Function which filters value and key.
 * @param {Function} opts.transform Function which transforms each value.
 * @param {Boolean} opts.chain Loop through prototype properties too.
 * @param {Boolean} opts.deep Deep looping through the nested properties.
 * @param {Boolean} opts.noOverwrite Do not overwrite any existing data (aka first one wins).
 * @return {Function} A new mix function.
 */

function mixer() {
  var opts = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

  // We will be recursively calling the exact same function when walking deeper.
  if (opts.deep && !opts._innerMixer) {
    opts._innerMixer = true; // avoiding infinite recursion.
    opts._innerMixer = mixer(opts); // create same mixer for recursion purpose.
  }

  /**
   * Combine properties from the passed objects into target. This method mutates target,
   * if you want to create a new Object pass an empty object as first param.
   *
   * @param {Object} target Target Object
   * @param {...Object} objects Objects to be combined (0...n objects).
   * @return {Object} The mixed object.
   */
  return function mix(target) {
    for (var _len = arguments.length, sources = Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
      sources[_key - 1] = arguments[_key];
    }

    // Check if it's us who called the function. See recursion calls are below.
    if ((0, _lodashLangIsUndefined2['default'])(target) || !opts.noOverwrite && !(0, _lodashLangIsObject2['default'])(target)) {
      if (sources.length > 1) {
        // Weird, but someone (not us!) called this mixer with an incorrect first argument.
        return opts._innerMixer.apply(opts, [{}].concat(sources));
      }
      return (0, _lodashLangCloneDeep2['default'])(sources[0]);
    }

    if (opts.noOverwrite) {
      if (!(0, _lodashLangIsObject2['default'])(target) || !(0, _lodashLangIsObject2['default'])(sources[0])) {
        return target;
      }
    }

    function iteratee(sourceValue, key) {
      var targetValue = target[key];
      if (opts.filter && !opts.filter(sourceValue, targetValue, key)) {
        return;
      }

      var result = opts.deep ? opts._innerMixer(targetValue, sourceValue) : sourceValue;
      target[key] = opts.transform ? opts.transform(result, targetValue, key) : result;
    }

    var loop = opts.chain ? _lodashObjectForIn2['default'] : _lodashObjectForOwn2['default'];
    sources.forEach(function (obj) {
      loop(obj, iteratee);
    });

    return target;
  };
}

module.exports = exports['default'];