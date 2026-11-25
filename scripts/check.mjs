// One round of checks from outside Clearlook's server (go-to-market PRD 6.3): each component's
// answer and time, appended to data/checks.json (the last 48 hours) and rolled into data/days.json
// (90 days). Runs in GitHub Actions every 5 minutes; nothing here touches the server's own data.
import { readFileSync, writeFileSync, existsSync } from 'node:fs'

const BASE = process.env.CLEARLOOK_URL ?? 'https://app.clearlook.dev'
import { COMPONENTS } from './components.mjs'
const SLOW_MS = 4000

async function probe(c) {
  const t = Date.now()
  try {
    const r = await fetch(BASE + c.url, { method: c.method ?? 'GET', headers: c.method === 'POST' ? { 'content-type': 'application/json' } : {}, body: c.method === 'POST' ? '{}' : undefined, signal: AbortSignal.timeout(10_000), redirect: 'manual' })
    const body = await r.text()
    const ms = Date.now() - t
    const up = c.ok(r.status, body)
    return { id: c.id, state: !up ? 'down' : ms > SLOW_MS ? 'slow' : 'up', status: r.status, ms }
  } catch (e) {
    return { id: c.id, state: 'down', status: 0, ms: Date.now() - t, error: String(e.name ?? e) }
  }
}

const read = (f, d) => (existsSync(f) ? JSON.parse(readFileSync(f, 'utf8')) : d)

// a down result is checked once more before it counts, so one lost packet isn't an outage
const results = []
for (const c of COMPONENTS) {
  let r = await probe(c)
  if (r.state === 'down') {
    await new Promise((x) => setTimeout(x, 15_000))
    r = await probe(c)
  }
  results.push(r)
}
const at = new Date().toISOString()
const checks = read('data/checks.json', [])
checks.push({ at, results })
const cut = Date.now() - 48 * 3600_000
writeFileSync('data/checks.json', JSON.stringify(checks.filter((x) => Date.parse(x.at) >= cut)))

const days = read('data/days.json', {})
const day = at.slice(0, 10)
for (const r of results) {
  const d = ((days[r.id] ??= {})[day] ??= { checks: 0, down: 0, slow: 0 })
  d.checks++
  if (r.state === 'down') d.down++
  if (r.state === 'slow') d.slow++
}
for (const id of Object.keys(days)) for (const k of Object.keys(days[id])) if (Date.parse(k) < Date.now() - 91 * 86400_000) delete days[id][k]
writeFileSync('data/days.json', JSON.stringify(days, null, 1))
console.log(at, results.map((r) => `${r.id}:${r.state}:${r.status}:${r.ms}ms`).join(' '))
