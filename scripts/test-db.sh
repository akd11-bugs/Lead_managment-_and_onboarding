#!/usr/bin/env bash
# Stands up a local Postgres for integration tests and loads it with the
# pre-wipe production backup plus a synthetic second org.
#
# Nothing here touches Neon. The integration suite skips itself unless
# TEST_DATABASE_URL is set, so this is opt-in.
set -euo pipefail

CONTAINER=steadfast-test
PORT=5433
URL="postgresql://postgres:test@localhost:${PORT}/steadfast"
BACKUP="${1:-$(ls -t ~/steadfast-backups/*.json 2>/dev/null | head -1)}"

if [ -z "${BACKUP}" ] || [ ! -f "${BACKUP}" ]; then
  echo "No backup found. Pass one: scripts/test-db.sh <path-to-backup.json>" >&2
  exit 1
fi

if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER}$"; then
  if docker ps -a --format '{{.Names}}' | grep -q "^${CONTAINER}$"; then
    docker start "${CONTAINER}" >/dev/null
  else
    docker run -d --name "${CONTAINER}" \
      -e POSTGRES_PASSWORD=test -e POSTGRES_DB=steadfast \
      -p "${PORT}:5432" postgres:16 >/dev/null
  fi
  until docker exec "${CONTAINER}" pg_isready -U postgres >/dev/null 2>&1; do sleep 1; done
fi

echo "Postgres up on ${PORT}. Pushing schema..."
DATABASE_URL="${URL}" npx prisma db push --skip-generate --accept-data-loss >/dev/null

echo "Restoring ${BACKUP}..."
DATABASE_URL="${URL}" node scripts/restore-backup.mjs "${BACKUP}"

echo "Seeding second org..."
DATABASE_URL="${URL}" node scripts/seed-org-b.mjs

echo
echo "Ready. Run the integration suite with:"
echo "  TEST_DATABASE_URL='${URL}' npx vitest run test/integration.test.ts"
