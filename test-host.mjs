// Offline smoke test for the dsh-bafx host half (v2: routes only).
// Page injection moved to the client module, so this half must register NO
// index injection and NO tapIndex transform.
import * as hostModule from './lib/index.js'

const { name, apply } = hostModule

const routes = []
const taps = []
const listeners = new Map()
const ctx = {
  webServer: {
    register: (route) => { routes.push(route); return () => {} },
    tapIndex: (fn) => { taps.push(fn); return () => {} },
  },
  effect: (fn) => { fn(); return () => {} },
}
const root = {
  on: (event, listener) => { listeners.set(event, listener); return () => {} },
  inject: (deps, callback) => { callback(ctx) },
  effect: (fn) => { fn(); return () => {} },
}

apply(root)

console.log('name =', name)
console.log('object-level inject export =', hostModule.inject)
console.log('index-inject listeners =', listeners.size, '(must be 0)')
console.log('tapIndex registrations =', taps.length, '(must be 0)')
console.log('routes =', routes.map((r) => `${r.kind}:${r.path}`).join(', '))

function serve(path) {
  const res = {
    writeHead: (s, h) => { res.status = s; res.headers = h },
    end: (b) => { res.body = b },
  }
  routes[0].handler({ url: path }, res)
  return res
}
for (const p of [
  '/dsh-bafx/src/fx.js',
  '/dsh-bafx/src/config.js',
  '/dsh-bafx/src/webgpu-effect.js',
  '/dsh-bafx/effect.js',
  '/dsh-bafx/src/../secret.js',
  '/dsh-other/x.js',
]) {
  const r = serve(p)
  console.log(p, '->', r.status, r.status === 200 ? `len=${r.body.length} ${r.headers['Content-Type']}` : '')
}
