const fs = require('fs');
const path = require('path');

const src = path.join(__dirname, '..', 'node_modules', 'csstype', 'index.d.ts');
const dest = path.join(__dirname, '..', 'src', 'jsx-csstype.d.ts');
fs.copyFileSync(src, dest);
