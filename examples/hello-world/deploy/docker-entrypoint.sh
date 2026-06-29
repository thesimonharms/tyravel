#!/bin/sh
set -e

echo "Running migrations..."
npx pondoknusa migrate

echo "Starting Pondoknusa..."
exec npx pondoknusa start