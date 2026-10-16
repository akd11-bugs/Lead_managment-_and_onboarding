#!/usr/bin/env bash
# Points local development at the Docker Postgres instead of Neon.
#
# Why: .env currently holds the Neon URL, which Render also uses. Every
# `prisma db push` and every destructive script run locally therefore hits
# production — which is how the 2026-10-16 wipe deleted live data.
#
# Next.js loads .env.local in preference to .env, and .env* is gitignored, so
# this overrides the connection for local work only. Nothing in .env changes,
# and Render is unaffected.
set -euo pipefail

URL="postgresql://postgres:test@localhost:5433/steadfast"
TARGET=".env.local"

if [ -f "${TARGET}" ] && grep -q "DATABASE_URL" "${TARGET}"; then
  echo "${TARGET} already sets DATABASE_URL:"
  grep "DATABASE_URL" "${TARGET}"
  echo "Edit or delete it manually rather than overwriting."
  exit 1
fi

cat >> "${TARGET}" <<EOF
# Local development database (Docker, scripts/test-db.sh).
# Overrides the Neon URL in .env so local work cannot touch production.
# Delete this file to go back to Neon.
DATABASE_URL="${URL}"
EOF

echo "Local dev now points at ${URL}"
echo
echo "  Start it:   ./scripts/test-db.sh"
echo "  Back to Neon:  rm ${TARGET}"
