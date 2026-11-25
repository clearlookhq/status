# Clearlook status

status.clearlook.dev: whether Clearlook is working, checked every 5 minutes from GitHub's servers
(outside Clearlook's own server), with 90 days of history and plain-words incident notes.

- `scripts/components.mjs`: what is checked and what counts as working
- `scripts/check.mjs`: one round of checks (a down answer is retried after 15 seconds before it counts)
- `scripts/build.mjs`: the page, from `data/` and `incidents/`
- `.github/workflows/status.yml`: every 5 minutes, check, keep the results, publish to Cloudflare Pages
- `incidents/`: one Markdown file per incident (see its README)

Run locally: `node scripts/check.mjs && node scripts/build.mjs`, then open `dist/index.html`.
