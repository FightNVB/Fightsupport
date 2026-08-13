#!/usr/bin/env bash
set -euo pipefail

TMP_FILE="$(mktemp)"
trap 'rm -f "$TMP_FILE"' EXIT

# Behoud alle andere cronjobs, maar vervang alleen de FightSupport jobs
# die door deze planning worden beheerd.
(crontab -l 2>/dev/null || true) \
  | grep -v '/api/admin/cron/sportscholen' \
  | grep -v '/api/admin/cron/fightpassport-total/start' \
  | grep -v '/api/admin/cron/fightpassport-total/stop' \
  | grep -v '/api/admin/cron/startverbod' \
  | grep -v '/api/admin/fightpassport-sync/start-team' \
  > "$TMP_FILE"

cat >> "$TMP_FILE" <<'CRON'
# FightSupport geplande jobs

# Startverboden: maandag t/m vrijdag om 19:00
0 19 * * 1-5 cd /root/Fightsupport && CRON_SECRET=$(grep '^CRON_SECRET=' .env.local | cut -d= -f2-) && curl -fsS -X POST -H "Authorization: Bearer $CRON_SECRET" https://fightsupport.nl/api/admin/cron/startverbod >> /var/log/fightsupport-startverbod-cron.log 2>&1

# Sportscholen: iedere dag om 12:00 en 20:00
0 12,20 * * * cd /root/Fightsupport && CRON_SECRET=$(grep '^CRON_SECRET=' .env.local | cut -d= -f2-) && curl -fsS -X POST -H "Authorization: Bearer $CRON_SECRET" https://fightsupport.nl/api/admin/cron/sportscholen >> /var/log/fightsupport-sportscholen-cron.log 2>&1

# Total AutoCheck: iedere dag om 21:00 starten/hervatten
0 21 * * * cd /root/Fightsupport && CRON_SECRET=$(grep '^CRON_SECRET=' .env.local | cut -d= -f2-) && curl -fsS -X POST -H "Authorization: Bearer $CRON_SECRET" https://fightsupport.nl/api/admin/cron/fightpassport-total/start >> /var/log/fightsupport-total-cron.log 2>&1

# Teams: iedere woensdag om 13:00
0 13 * * 3 cd /root/Fightsupport && CRON_SECRET=$(grep '^CRON_SECRET=' .env.local | cut -d= -f2-) && curl -fsS -X POST -H "Authorization: Bearer $CRON_SECRET" https://fightsupport.nl/api/admin/fightpassport-sync/start-team >> /var/log/fightsupport-team-cron.log 2>&1
CRON

crontab "$TMP_FILE"
echo "FightSupport cron bijgewerkt:"
echo "  - Startverboden ma-vr 19:00"
echo "  - Sportscholen dagelijks 12:00 en 20:00"
echo "  - Total dagelijks 21:00 starten/hervatten"
echo "  - Teams woensdag 13:00"
echo "  - Geen Total stop-job"
