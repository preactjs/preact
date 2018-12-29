/* eslint-disable */
var compat = dep(require('../dist/compat'));
var server = dep(require('./server'));

function dep(obj) { return obj['default'] || obj; }

for (var i in compat) module.exports[i] = compat[i];
for (var i in server) module.exports[i] = server[i];
