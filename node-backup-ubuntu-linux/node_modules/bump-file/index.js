'use strict';
const fs = require('fs');
const path = require('path');
const semver = require('semver');
const detectIndent = require('detect-indent');

class BumpError extends Error {
  constructor(message) {
    super(message);
    this.name = 'BumpError';
  }
}

const readFile = (filePath, cb) => {
  fs.readFile(filePath, 'utf8', function(err, data) {
    if (err) return cb(err);
    let json = null;
    let indent;
    try {
      indent = detectIndent(data).indent || '  ';
      json = JSON.parse(data);
    } catch (e) {
      err = e;
    }
    cb(err, json, indent);
  });
};

const incrementVersion = (version, increment, preId) => {
  increment = increment || 'patch';
  let incVersion = semver.valid(increment);
  if (!incVersion) incVersion = semver.inc(version, increment, preId);
  return incVersion;
};

const incrementFile = (filePath, options) => {
  if (!filePath) return Promise.reject(new BumpError('`filePath` is required'));
  options = typeof options === 'string' ? { increment: options } : options || {};
  const increment = options.increment || 'patch';
  const preId = options.preId;
  const get = options.get || (json => json.version);
  const set = options.set || ((json, version) => (json.version = version));
  return new Promise((resolve, reject) => {
    readFile(filePath, (err, json, indent) => {
      if (err) return reject(new BumpError(err.message));
      const incVersion = incrementVersion(get(json), increment, preId);
      if (!incVersion) return reject(new BumpError(`Invalid increment value: ${increment}`));
      set(json, incVersion);
      fs.writeFile(filePath, new Buffer(JSON.stringify(json, null, indent) + '\n'), err => {
        if (err) return reject(new BumpError(err.message));
        resolve(json);
      });
    });
  });
};

module.exports = incrementFile;
module.exports.inc = incrementVersion;
