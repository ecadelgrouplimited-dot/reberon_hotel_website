#!/usr/bin/env bash
# Build and (re)start everything on the server. Safe to run again for every release.
#   ./infra/deploy.sh            # deploy the checked-out commit
set -euo pipefail
cd "$(dirname "$0")/.."
[ -f .env.production ] || { echo "Missing .env.production (copy .env.production.example)"; exit 1; }
export TAG=$(git rev-parse --short HEAD)
C="docker compose --env-file .env.production -f infra/docker-compose.prod.yml"

echo "▸ building the API ($TAG)"
$C build api
echo "▸ database, cache, API"
$C up -d postgres redis
$C run --rm migrate
$C up -d api
echo -n "▸ waiting for the API"
for i in $(seq 1 60); do curl -fs http://127.0.0.1:4000/v1/health >/dev/null && break; echo -n .; sleep 2; done; echo
echo "▸ building the website (pre-rendered from the running API) and the House"
$C build web admin
$C up -d web admin caddy
docker image prune -f >/dev/null
echo "✓ deployed $TAG"
$C ps
