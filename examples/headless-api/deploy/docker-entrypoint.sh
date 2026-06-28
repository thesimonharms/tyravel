#!/bin/sh
set -e

echo "Running migrations..."
npx tyravel migrate

echo "Starting Tyravel..."
exec npx tyravel start
