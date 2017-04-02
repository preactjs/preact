#!/bin/sh

java -jar $CLOSURE_PATH --externs=externs.js --language_in=ECMASCRIPT6 --js=dist/preact.dev.js --compilation_level ADVANCED_OPTIMIZATIONS
