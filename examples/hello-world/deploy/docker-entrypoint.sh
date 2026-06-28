#!/bin/sh
set -e

echo "Running migrations..."
node --experimental-strip-types node_modules/@tyravel/cli/dist/bin/tyravel.js migrate

echo "Starting Tyravel..."
exec node --experimental-strip-types src/main.ts