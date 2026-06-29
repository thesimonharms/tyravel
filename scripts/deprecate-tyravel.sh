#!/usr/bin/env bash
# Deprecate legacy @tyravel/* packages on npm (interactive passkey auth).
#
# Run from repo root after: npm login
#   ./scripts/deprecate-tyravel.sh
#
# npm will prompt for passkey approval per package. Use this when granular
# tokens still hit EOTP — interactive session auth works with passkeys.

set -u

MIGRATION_URL='https://github.com/pondoknusa/pondoknusa/blob/main/README.md#migrating-from-tyravel'

PACKAGES=(
  '@tyravel/container'
  '@tyravel/collection'
  '@tyravel/support'
  '@tyravel/config'
  '@tyravel/log'
  '@tyravel/locale'
  '@tyravel/http'
  '@tyravel/validation'
  '@tyravel/database'
  '@tyravel/database-mysql'
  '@tyravel/database-pg'
  '@tyravel/redis'
  '@tyravel/redis-node'
  '@tyravel/views'
  '@tyravel/ssr'
  '@tyravel/echo'
  '@tyravel/queue'
  '@tyravel/events'
  '@tyravel/broadcasting'
  '@tyravel/broadcasting-websocket'
  '@tyravel/vector'
  '@tyravel/vector-pg'
  '@tyravel/vector-qdrant'
  '@tyravel/vector-pinecone'
  '@tyravel/rag'
  '@tyravel/graphql'
  '@tyravel/mcp'
  '@tyravel/crypto'
  '@tyravel/auth'
  '@tyravel/cache'
  '@tyravel/storage'
  '@tyravel/storage-aws-s3'
  '@tyravel/storage-r2'
  '@tyravel/storage-supabase'
  '@tyravel/mail'
  '@tyravel/notifications'
  '@tyravel/admin'
  '@tyravel/debug'
  '@tyravel/testing'
  '@tyravel/core'
  '@tyravel/auth-oauth'
  '@tyravel/repl'
  '@tyravel/cli'
)

# Prefer interactive login over any token in the environment.
unset NODE_AUTH_TOKEN
unset NPM_TOKEN

if ! npm whoami &>/dev/null; then
  echo "Not logged in. Run: npm login"
  exit 1
fi

echo "Logged in as: $(npm whoami)"
echo "Deprecating ${#PACKAGES[@]} @tyravel/* packages (passkey prompt per package)."
echo ""

deprecated=0
skipped=0
failed=0
i=0

for pkg in "${PACKAGES[@]}"; do
  i=$((i + 1))
  short="${pkg#@tyravel/}"
  target="@pondoknusa/${short}"
  msg="Renamed to ${target}. Migrate: ${MIGRATION_URL}"

  if ! npm view "$pkg" version &>/dev/null; then
    echo "[$i/${#PACKAGES[@]}] ⏭  $pkg — not on npm, skipping"
    skipped=$((skipped + 1))
    continue
  fi

  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "[$i/${#PACKAGES[@]}] Deprecating $pkg"
  echo "  → $msg"
  echo ""

  if npm deprecate "$pkg" "$msg"; then
    echo "✅ Deprecated $pkg"
    deprecated=$((deprecated + 1))
  else
    echo "✗ Failed $pkg (continuing…)"
    failed=$((failed + 1))
  fi

  echo ""
done

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Done."
echo "  Deprecated: $deprecated"
echo "  Skipped:    $skipped"
echo "  Failed:     $failed"

if [[ "$failed" -gt 0 ]]; then
  exit 1
fi