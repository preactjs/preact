'use strict';

module.exports = function () {};

if (process.env.NODE_ENV === 'development') {
  module.exports = require('./debug.js').setConfig;
  require('../devtools');
}
//# sourceMappingURL=index.js.map