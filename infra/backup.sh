#!/usr/bin/env bash
# Nightly backup: database dump + media. Add to cron:
#   15 2 * * * /opt/reberon/infra/backup.sh >> /var/log/reberon-backup.log 2>&1
# Copy /var/backups/reberon off the server (rclone, rsync) — a backup on the same disk is not a backup.
set -euo pipefail
cd "$(dirname "$0")/.."
DEST=${BACKUP_DIR:-/var/backups/reberon}
KEEP_DAYS=${KEEP_DAYS:-14}
STAMP=$(date +%Y%m%d-%H%M)
mkdir -p "$DEST"
C="docker compose --env-file .env.production -f infra/docker-compose.prod.yml"
$C exec -T postgres pg_dump -U reberon -Fc reberon > "$DEST/db-$STAMP.dump"
$C exec -T api tar -C /data -czf - storage > "$DEST/media-$STAMP.tgz"
find "$DEST" -type f -mtime +"$KEEP_DAYS" -delete
echo "$(date -Is) backup ok: $(du -sh "$DEST" | cut -f1) in $DEST"
# Restore: docker compose … exec -T postgres pg_restore -U reberon -d reberon --clean < db-XXXX.dump
