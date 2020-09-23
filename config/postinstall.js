const path = require('path');
const fs = require('fs');

fs.copyFileSync(
	path.join(__dirname, 'jsx-runtime.js'),
	path.join(__dirname, 'jsx-dev-runtime.js')
);
