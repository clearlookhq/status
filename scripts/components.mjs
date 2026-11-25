// What the status page checks, and what each answer means. Shared by check.mjs and build.mjs.
export const COMPONENTS = [
  { id: 'app', name: 'App', says: 'Signing in and the dashboard', url: '/api/signup/v1/state', ok: (s) => s === 200 },
  { id: 'ingest', name: 'Ingest', says: 'Receiving visits, events and errors', url: '/v1/health', ok: (s, b) => s === 200 && b.includes('"ok"') },
  { id: 'script', name: 'Tracking script', says: 'The script your site loads', url: '/s/latest/w.js', ok: (s) => s === 200 },
  { id: 'mcp', name: 'AI connection', says: 'The MCP server AI apps talk to', url: '/mcp', method: 'POST', ok: (s) => s === 401 || s === 200 },
]
