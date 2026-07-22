#!/usr/bin/env bash
set -euo pipefail

TMP_FILE="$(mktemp)"
trap 'rm -f "$TMP_FILE"' EXIT

# Behoud alle andere cronjobs, maar vervang alleen de FightSupport jobs die door
# deze planning worden beheerd. Hiermee verdwijnt ook de oude /cron/teams job.
(crontab -l 2>/dev/null || true) \
  | grep -v '/api/admin/cron/sportscholen' \
  | grep -v '/api/admin/cron/teams' \
  | grep -v '/api/admin/cron/fightpassport-total/start' \
  | grep -v '/api/admin/cron/fightpassport-total/stop' \
  > "$TMP_FILE"

cat >> "$TMP_FILE" <<'CRON'
0 12,21 * * * cd /root/Fightsupport && CRON_SECRET=$(grep '^CRON_SECRET=' .env.local | cut -d= -f2-) && curl -fsS -X POST -H "Authorization: Bearer $CRON_SECRET" https://fightsupport.nl/api/admin/cron/sportscholen >> /var/log/fightsupport-sportscholen-cron.log 2>&1
0 22 * * * cd /root/Fightsupport && CRON_SECRET=$(grep '^CRON_SECRET=' .env.local | cut -d= -f2-) && curl -fsS -X POST -H "Authorization: Bearer $CRON_SECRET" https://fightsupport.nl/api/admin/cron/fightpassport-total/start >> /var/log/fightsupport-total-cron.log 2>&1
0 8 * * * cd /root/Fightsupport && CRON_SECRET=$(grep '^CRON_SECRET=' .env.local | cut -d= -f2-) && curl -fsS -X POST -H "Authorization: Bearer $CRON_SECRET" https://fightsupport.nl/api/admin/cron/fightpassport-total/stop >> /var/log/fightsupport-total-cron.log 2>&1
CRON

crontab "$TMP_FILE"
echo "FightSupport cron bijgewerkt: sportscholen blijft, teams verwijderd, Total AutoCheck 22:00-08:00 actief."
