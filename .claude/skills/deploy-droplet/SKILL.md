---
name: deploy-droplet
description: >
  Deploy the scraper service to the DigitalOcean droplet. Load this whenever
  you need to push code changes to the VM — after merging a branch that touches
  anything in src/scrapers/, scripts/scraper-service.ts, or package.json.
  Next.js page changes go to Vercel automatically on merge; only scraper-side
  changes need this skill.
---

# Skill: deploy-droplet

The scraper service runs on a DigitalOcean droplet managed by PM2. The Next.js
app deploys automatically to Vercel on merge to main. This skill covers the
manual droplet deploy that's needed whenever scraper or service code changes.

## Connection details

- **Host:** `46.101.53.17` (public IPv4)
- **User:** `root`
- **App path:** `/opt/carraffleodds`
- **PM2 process name:** `scraper`
- **SSH key:** uses the key already in the SSH agent (same key used for git commit signing)

## When to deploy to the droplet

Deploy to the droplet any time a merged PR touches:
- `src/scrapers/**` — any scraper or base logic
- `scripts/scraper-service.ts` — the PM2 service itself
- `package.json` / `package-lock.json` — dependency changes

Do NOT deploy to the droplet for:
- `src/app/**` — Next.js pages (Vercel handles these)
- `src/components/**`, `src/lib/**` — frontend only
- `docs/**`, `.claude/**` — no runtime impact

## Deploy procedure

Always merge to main before deploying. The droplet pulls from main.

**Step 1: Verify the merge landed**
```bash
ssh root@46.101.53.17 "cd /opt/carraffleodds && git fetch && git log --oneline -3 origin/main"
```

**Step 2: Pull and install**
```bash
ssh root@46.101.53.17 "cd /opt/carraffleodds && git pull && npm install"
```
Always use plain `npm install` — never `--omit=dev` or `--omit=optional`. The
esbuild Linux binary is an optional dependency and will be dropped otherwise,
crashing the service on startup.

**Step 3: Restart**
```bash
ssh root@46.101.53.17 "pm2 restart scraper"
```

**Step 4: Verify startup**
```bash
ssh root@46.101.53.17 "sleep 5 && pm2 logs scraper --nostream --lines 30 --no-color 2>/dev/null"
```

Expected startup sequence:
```
[Service] CarRaffleOdds Scraper Service starting...
[Service] Chromium ready
[Service] Running startup cleanup...
[Cleanup] Running raffle cleanup...
[Cleanup] Saved N snapshots
[Cleanup] Marked X raffles as drawn
[Cleanup] Promoted Y raffles to ending_soon
[Service] Running initial full scrape...
[Orchestrator] Running 8 scraper(s): ...
```

If you see `esbuild` errors in the error log, run `npm install` again (without flags) and restart.

## Useful monitoring commands

```bash
# Live log tail
ssh root@46.101.53.17 "pm2 logs scraper --no-color"

# Last 50 lines of error log
ssh root@46.101.53.17 "pm2 logs scraper --nostream --lines 50 --no-color 2>/dev/null | grep err"

# PM2 status
ssh root@46.101.53.17 "pm2 list --no-color"

# Run cleanup manually (without full scrape)
ssh root@46.101.53.17 "cd /opt/carraffleodds && npx tsx src/scrapers/run-all.ts --cleanup"
```
