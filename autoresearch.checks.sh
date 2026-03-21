#!/bin/bash
set -euo pipefail
pnpm -s test:unit >/tmp/preact-test-unit.log 2>&1 || {
  tail -80 /tmp/preact-test-unit.log
  exit 1
}
