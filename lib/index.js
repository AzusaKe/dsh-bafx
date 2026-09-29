// dsh-bafx — Blue Archive click effect & cursor trail for DSH (Web + Desktop).
//
// Host half: serves the ba-click-fx library modules (self-contained copy under
// lib/bafx-src) as native ES modules over the carrier's HTTP server, so the
// client half (client/client.js, a DSH client module) can `import()` them.
//
// Page injection lives ENTIRELY in the client module now: it contributes the
// additive `sidebar.footer.action` entry, which is the only integration that
// behaves identically in the browser shell and in the Electron desktop shell
// (the desktop emits index.html verbatim from its dist, so `tapIndex` never
// runs there, and a floating overlay button would cover shipped UI).
//
// The library copy is ba-click-fx (MIT, https://github.com/CialloKing/ba-click-fx)
// v1.3.1 src modules, unmodified — no build step.

import { readFileSync, readdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const PACKAGE_ROOT = dirname(dirname(fileURLToPath(import.meta.url)))
const SRC_DIR = join(PACKAGE_ROOT, 'lib', 'bafx-src')

// Preload every library module into memory at load time.
const modules = new Map()
for (const fileName of readdirSync(SRC_DIR)) {
  if (!fileName.endsWith('.js')) continue
  modules.set(fileName, readFileSync(join(SRC_DIR, fileName), 'utf8'))
}

const JS_HEADERS = {
  'Content-Type': 'application/javascript; charset=utf-8',
  'Cache-Control': 'no-cache',
}

export const name = 'dsh-bafx'

export function apply(root) {
  root.inject(['webServer'], (ctx) => {
    ctx.effect(() => ctx.webServer.register({
      kind: 'prefix',
      path: '/dsh-bafx',
      handler: (req, res) => {
        try {
          const raw = req.url ?? '/'
          const pathname = raw.split('?')[0]
          const match = /^\/dsh-bafx\/src\/([A-Za-z0-9._-]+\.js)$/.exec(pathname)
          const content = match === null ? undefined : modules.get(match[1])
          if (content === undefined) {
            res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' })
            res.end('not found')
            return
          }
          res.writeHead(200, JS_HEADERS)
          res.end(content)
        } catch (error) {
          res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' })
          res.end('internal error')
        }
      },
    }))
  })
}
