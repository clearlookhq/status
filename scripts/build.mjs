// The status page: plain HTML from data/ and incidents/, in Clearlook's own design (light and dark).
// Built and deployed by the same Action that runs the checks, so it never depends on the server.
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from 'node:fs'
import { COMPONENTS } from './components.mjs'

const read = (f, d) => (existsSync(f) ? JSON.parse(readFileSync(f, 'utf8')) : d)
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c])
const checks = read('data/checks.json', [])
const days = read('data/days.json', {})
const last = checks.at(-1)
const now = (id) => last?.results.find((r) => r.id === id)?.state ?? 'unknown'

// incidents: incidents/YYYY-MM-DD-name.md with a first line "# Title", a line "Status: resolved|monitoring|investigating", then the story
const incidents = (existsSync('incidents') ? readdirSync('incidents') : []).filter((f) => /^\d{4}-\d{2}-\d{2}.*\.md$/.test(f)).sort().reverse().map((f) => {
  const t = readFileSync('incidents/' + f, 'utf8')
  const title = (t.match(/^# (.+)$/m) ?? [, f])[1]
  const status = ((t.match(/^Status:\s*(\w+)/mi) ?? [, 'resolved'])[1]).toLowerCase()
  const body = t.replace(/^# .+$/m, '').replace(/^Status:.*$/mi, '').trim().split(/\n{2,}/).map((p) => `<p>${esc(p)}</p>`).join('')
  return { date: f.slice(0, 10), title, status, body }
})
const open = incidents.filter((i) => i.status !== 'resolved')

const states = COMPONENTS.map((c) => now(c.id))
const overall = open.length || states.includes('down') ? (states.filter((s) => s === 'down').length > 1 ? 'major' : 'partial') : states.includes('slow') ? 'slow' : last ? 'ok' : 'unknown'
const HEAD = { ok: 'All systems working', slow: 'Working, but slower than usual', partial: 'Part of Clearlook is down', major: 'Clearlook is down', unknown: 'Waiting for the first check' }[overall]

const span = 90
const dayList = Array.from({ length: span }, (_, i) => new Date(Date.now() - (span - 1 - i) * 86400_000).toISOString().slice(0, 10))
function bars(id) {
  let up = 0, total = 0
  const cells = dayList.map((d) => {
    const x = days[id]?.[d]
    if (!x) return `<i class="b none" title="${d}: no data"></i>`
    total += x.checks
    up += x.checks - x.down
    const cls = x.down === 0 ? (x.slow > x.checks / 4 ? 'slow' : 'up') : x.down / x.checks > 0.1 ? 'down' : 'part'
    const mins = x.down * 5
    return `<i class="b ${cls}" title="${d}: ${x.down ? `down about ${mins} minutes` : 'no downtime'}"></i>`
  }).join('')
  const pct = total ? ((up / total) * 100).toFixed(2) + '%' : 'no data yet'
  return { cells, pct }
}

const CSS = `
:root{--n2:oklch(.976 .002 255);--n3:oklch(.958 .003 255);--n5:oklch(.922 .005 255);--n6:oklch(.9 .006 255);--fg1:oklch(.345 .034 255);--fg2:oklch(.475 .02 255);--fg3:oklch(.56 .019 255);--fg4:oklch(.62 .017 255);
--panel:oklch(.991 .001 255);--raised:oklch(1 0 0);--ok:oklch(.68 .15 150);--slow:oklch(.78 .14 85);--part:oklch(.72 .16 55);--bad:oklch(.62 .2 27);--none:oklch(.9 .006 255);--ink:oklch(.2 .02 255);color-scheme:light}
@media (prefers-color-scheme:dark){:root{--n2:oklch(.2 .007 255);--n3:oklch(.228 .007 255);--n5:oklch(.278 .009 255);--n6:oklch(.305 .01 255);--fg1:oklch(.935 .009 255);--fg2:oklch(.77 .011 255);--fg3:oklch(.64 .013 255);--fg4:oklch(.56 .013 255);
--panel:oklch(.175 .005 255);--raised:oklch(.228 .007 255);--none:oklch(.305 .01 255);--ink:oklch(0 0 0);color-scheme:dark}}
*{box-sizing:border-box}body{margin:0;background:var(--panel);color:var(--fg1);font:15px/24px "Figtree",ui-sans-serif,system-ui,sans-serif;-webkit-font-smoothing:antialiased}
a{color:inherit}main{width:min(720px,calc(100% - 32px));margin:0 auto;padding:56px 0 96px}
.top{display:flex;align-items:center;gap:10px;font-weight:600;font-size:16px}.top span{color:var(--fg3);font-weight:400}
.banner{display:flex;align-items:center;gap:12px;margin-top:40px;padding:18px 20px;border-radius:12px;background:var(--raised);box-shadow:0 0 0 1px var(--n5),0 1px 2px oklch(from var(--ink) l c h / .05)}
.dot{width:10px;height:10px;border-radius:99px;flex:none}.dot.ok{background:var(--ok)}.dot.slow{background:var(--slow)}.dot.partial{background:var(--part)}.dot.major,.dot.down{background:var(--bad)}.dot.unknown{background:var(--none)}.dot.up{background:var(--ok)}
.banner b{font-size:17px;font-weight:600}.banner small{margin-left:auto;color:var(--fg3);font-size:13px}
h2{font-size:15px;font-weight:600;margin:48px 0 12px}
.comp{padding:16px 0;border-top:1px solid var(--n5)}.comp:last-child{border-bottom:1px solid var(--n5)}
.row{display:flex;align-items:center;gap:10px}.row b{font-weight:500}.row .says{color:var(--fg3);font-size:14px}.row .st{margin-left:auto;font-size:14px;color:var(--fg2)}
.bars{display:grid;grid-template-columns:repeat(${span},1fr);gap:2px;margin-top:12px;height:28px}.b{border-radius:2px;background:var(--none)}.b.up{background:var(--ok)}.b.slow{background:var(--slow)}.b.part{background:var(--part)}.b.down{background:var(--bad)}
.legend{display:flex;justify-content:space-between;margin-top:6px;font-size:12px;color:var(--fg4)}
.inc{padding:16px 0;border-top:1px solid var(--n5)}.inc h3{margin:0;font-size:15px;font-weight:500}.inc .when{color:var(--fg3);font-size:13px}.inc p{margin:8px 0 0;color:var(--fg2)}
.quiet{color:var(--fg3)}footer{margin-top:56px;color:var(--fg4);font-size:13px}
@media (max-width:560px){.bars{grid-template-columns:repeat(45,1fr)}.bars .b:nth-child(-n+45){display:none}.row .says{display:none}}
`

let comps = ''
for (const c of COMPONENTS) {
  const s = now(c.id)
  const { cells, pct } = bars(c.id)
  comps += `<div class="comp"><div class="row"><span class="dot ${s}"></span><b>${esc(c.name)}</b><span class="says">${esc(c.says)}</span><span class="st">${{ up: 'Working', slow: 'Slow', down: 'Down', unknown: 'No data yet' }[s]}</span></div>
<div class="bars" role="img" aria-label="${esc(c.name)}: last ${span} days, ${pct} up">${cells}</div><div class="legend"><span>${span} days ago</span><span>${pct} up</span><span>Today</span></div></div>`
}
const incHtml = incidents.length ? incidents.slice(0, 20).map((i) => `<div class="inc"><h3>${esc(i.title)}</h3><div class="when">${i.date} · ${esc(i.status[0].toUpperCase() + i.status.slice(1))}</div>${i.body}</div>`).join('') : '<p class="quiet">No incidents yet.</p>'
const checked = last ? new Date(last.at).toUTCString().replace(' GMT', ' UTC') : 'not yet'
const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Clearlook status</title>
<meta name="description" content="Whether Clearlook is working right now, and its last 90 days."><meta http-equiv="refresh" content="120"><link rel="icon" href="https://clearlook.dev/icon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Figtree:wght@400..700&display=swap"><style>${CSS}</style></head><body><main>
<div class="top">Clearlook <span>status</span></div>
<div class="banner" role="status"><span class="dot ${overall}"></span><b>${HEAD}</b><small>Checked ${esc(checked)}</small></div>
${open.length ? `<h2>Now</h2>${open.map((i) => `<div class="inc"><h3>${esc(i.title)}</h3><div class="when">${i.date} · ${esc(i.status)}</div>${i.body}</div>`).join('')}` : ''}
<h2>Components</h2>${comps}
<h2>Incidents</h2>${incHtml}
<footer>Checked every 5 minutes from outside Clearlook's own server, so this page stays up when it doesn't. A down result is checked again 15 seconds later before it counts. <a href="https://clearlook.dev">clearlook.dev</a> · <a href="mailto:hello@clearlook.dev">hello@clearlook.dev</a></footer>
</main></body></html>`
mkdirSync('dist', { recursive: true })
writeFileSync('dist/index.html', html)
writeFileSync('dist/status.json', JSON.stringify({ overall, checked: last?.at ?? null, components: COMPONENTS.map((c) => ({ id: c.id, name: c.name, state: now(c.id) })), open_incidents: open.map((i) => i.title) }, null, 1))
console.log('status page:', overall)
