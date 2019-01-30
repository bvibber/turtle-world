// Stub CJS loader for the Logo interpreter module
require = require('esm')(module);
module.exports = require('./src/logo.js');
