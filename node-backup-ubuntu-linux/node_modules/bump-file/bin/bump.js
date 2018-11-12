#!/usr/bin/env node
'use strict';

const bump = require('../index');

const args = process.argv.slice(2);

bump(args[0], {
  increment: args[1],
  preId: args[2]
}).catch(err => {
  if (err.name === 'BumpError') {
    console.error(err.message);
    process.exit(1);
  } else {
    throw err;
  }
});
