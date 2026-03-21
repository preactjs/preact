#!/bin/bash
set -euo pipefail

pnpm -s build:core >/tmp/preact-build-core.log 2>&1
pnpm -s build:hooks >/tmp/preact-build-hooks.log 2>&1
pnpm -s build:compat >/tmp/preact-build-compat.log 2>&1

node <<'EOF'
const fs = require('fs');
const zlib = require('zlib');

const groups = {
  core_gzip_bytes: [
    'dist/preact.js',
    'dist/preact.module.js',
    'dist/preact.umd.js'
  ],
  hooks_gzip_bytes: [
    'hooks/dist/hooks.js',
    'hooks/dist/hooks.module.js',
    'hooks/dist/hooks.umd.js'
  ],
  compat_gzip_bytes: [
    'compat/dist/compat.js',
    'compat/dist/compat.module.js',
    'compat/dist/compat.umd.js'
  ]
};

const metrics = {};
for (const [name, files] of Object.entries(groups)) {
  metrics[name] = files.reduce((sum, file) => {
    const src = fs.readFileSync(file);
    return sum + zlib.gzipSync(src, { level: 9 }).length;
  }, 0);
}
metrics.total_gzip_bytes =
  metrics.core_gzip_bytes + metrics.hooks_gzip_bytes + metrics.compat_gzip_bytes;

for (const [name, value] of Object.entries(metrics)) {
  console.log(`METRIC ${name}=${value}`);
}
EOF
