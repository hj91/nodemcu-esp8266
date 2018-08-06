[![Build Status](https://travis-ci.org/stampit-org/supermixer.svg?branch=master)](https://travis-ci.org/stampit-org/supermixer)
# Super Mixer

Mixes/merges/extends your object in multiple ways.

Unlike underscore/lodash utility methods this module allows you to:
* mix or deep merge objects' **prototype chain**. Regular mixin/extend/assign implementations can't do that.
* mix or deep merge **unique** properties only. I.e. data will **not be overwritten** if a property already exists.
* filter each individual property by **target value**, **source value**, and **key**. See API.
* transform each value by **resulting value**, **source value**, and **key**. See API.

## Install
```sh
$ npm install supermixer
```

```js
var mixer = require('supermixer');
```


## API

_**NB! All functions always mutate the first argument.**_

### supermixer(opts = {})
The `opts`:
```
 * @param {Object} opts
 * @param {Function} opts.filter Function which filters value and key.
 * @param {Function} opts.transform Function which transforms each value.
 * @param {Boolean} opts.chain Loop through prototype properties too.
 * @param {Boolean} opts.deep Deep looping through the nested properties.
 * @param {Boolean} opts.noOverwrite Do not overwrite any existing data (aka first one wins).
```

Usage:
```js
const mix = supermixer({
  filter(sourceValue, targetValue, key) { return key[0] !== '_'; }, // do not copy "private" values
  transform(resultValue, targetValue, key) { console.log(key); return resultValue; }, // log each key which gets set
  chain: true,
  deep: true,
  noOverwrite: true
});

const johnStream = mix({}, new Stream(), { name: "John Stream"; })
```

### Regular mixin, aka `Object.assign`, aka `$.extend`.
```js
 // the regular Object.assign function
var extend = supermixer();
// OR
extend = supermixer.mixin;

extend({}, { a: 1 }, { b: 2 });
// { a: 1, b: 2 }
```

### Mixin functions only.
```js
// assigns own functions only
var functionMixer = supermixer({
  filter: function (sourceValue) { return typeof sourceValue === 'function'; }
});
// OR
functionMixer = supermixer.mixinFunctions;

functionMixer({}, { a: "x" },  { b: function(){} });
// { b() }
```

### Mixin functions including prototype chain.
```js
// assigns functions only, but traverse through the prototype chain
var chainFunctionMixer = supermixer({
  filter: function (sourceValue) { return typeof sourceValue === 'function'; },
  chain: true
});
// OR
chainFunctionMixer = supermixer.mixinChainFunctions;

chainFunctionMixer({}, new EventEmitter());
// { on(), off(), emit(), ... }
```

### Deep merge
```js
// deep merge own properties
var mergeDeep = supermixer({
  deep: true
});
// OR
mergeDeep = supermixer.merge;

mergeDeep({ url: { host: "example.com" } }, { url: { port: 81 } });
// { url: { host: "example.com", port: 81 } }
```

### Deep merge but do not overwrite existing values.
```js
// deep merge own properties
var mergeDeep = supermixer({
  deep: true,
  noOverwrite: true
});
// OR
mergeUnique = supermixer.mergeUnique;

mergeUnique({ url: { host: "example.com" } }, { url: { host: "evil.com" } });
// { url: { host: "example.com" } }
```

### Deep merge non functions including prototype chain.
```js
// deeply merges data properties, traversing through prototype chain
var mergeChainData =  supermixer({
  filter: function (sourceValue) { return typeof sourceValue !== 'function'; },
  deep: true,
  chain: true
});
// OR
mergeChainData = supermixer.mergeChainNonFunctions;

EventEmitter.prototype.hello = "world";
mergeChainData({}, new EventEmitter());
// { hello: "world" }
```

## Want to contribute?
This project is Open Open Source. This means whoever submits an accepted PR will receive write permissions to the project.
