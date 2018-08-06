# KNX Datapoint library
[![npm version](https://badge.fury.io/js/knx-dpt.svg)](https://badge.fury.io/js/knx-dpt)
[![Build Status](https://travis-ci.org/rubenoost/knx-dpt.svg?branch=master)](https://travis-ci.org/rubenoost/knx-dpt)
[![Build Status](https://travis-ci.org/rubenoost/knx-dpt.svg?branch=development)](https://travis-ci.org/rubenoost/knx-dpt)

## Supported datatypes
For a full overview of supported datapoints, see [here](doc/supported-datapoints.md)

## Installation

```
$ npm install knx-dpt
```

## Usage

### Including the library

```javascript
const dptlib = require('knx-dpt');
```

### Getting a datapoint

#### By name

```javascript
var dpt = dptlib.resolve('DPT6');
```

#### By name and subid

```javascript
var dpt = dptlib.resolve('DPT6.020');
```

#### As property

```javascript
var dpt = dptlib.dpt6
```

## Testing

The tests run using [tape](https://www.npmjs.com/package/tape) and use [faucet](https://www.npmjs.com/package/faucet)
to present the results in a human-readable format. Make sure you've got all required modules installed:
```
$ npm install
```

### Running the local test suite

You can run local unit tests:
```
$ npm test
```

## Credits

This library is based on the work of:
* Elias Karakoulakis and his KNX library.

## License

This code is free to use under the terms of the MIT license.