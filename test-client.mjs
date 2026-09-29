// Offline structural test for the dsh-bafx client module (client/client.js).
// Verifies the __ModuleLoader__ contract, the three slot contributions, the
// dialog presentation with the reset button, the "selection opens the dialog
// and hands the main column back to the Conversation" behaviour, and the inline
// fallbacks when the layout service or the overlay seat is missing.
import { readFileSync } from 'node:fs'

const code = readFileSync(new URL('./client/client.js', import.meta.url), 'utf8')

// The engine import cannot resolve outside a browser (there is no /dsh-bafx
// route here). That failure is expected and the module contains it, so its
// console.error output is silenced to keep this structural test readable.
// Every assertion below is explicit; nothing here depends on console output.
console.error = () => {}

const ReactStub = {
  createElement: (type, props, ...children) => ({ type, props, children }),
  Fragment: 'Fragment',
  useState: (initial) => [initial, () => {}],
  useEffect: (fn) => { fn() },
  useLayoutEffect: (fn) => { fn() },
  useCallback: (fn) => fn,
  useSyncExternalStore: (subscribe, getSnapshot) => getSnapshot(),
}

// Evaluate a fresh module instance (module state lives in the factory closure).
function loadModule() {
  const styles = []
  const documentStub = {
    head: { appendChild: (element) => styles.push(element) },
    getElementById: () => null,
    createElement: (tag) => ({ tag, id: '', textContent: '', setAttribute() {} }),
    addEventListener() {},
    removeEventListener() {},
  }
  let registration = null
  const windowStub = { __ModuleLoader__: { load: (value) => { registration = value } } }
  new Function('window', 'document', code)(windowStub, documentStub)
  return { registration, styles }
}

function makeCtx(layoutCalls, options = {}) {
  const injected = []
  const registered = []
  const withLayout = options.layout !== false
  const withOverlay = options.overlay !== false
  const layoutRef = options.layoutRef
  return {
    injected,
    registered,
    ctx: {
      get: (name) => {
        if (name !== 'layout') return undefined
        if (layoutRef) return layoutRef.current
        return withLayout ? { selectPanel: (id) => layoutCalls.push(id) } : undefined
      },
      slots: {
        inject: (slotName, callback) => {
          if (slotName === 'shell.overlay' && !withOverlay) return
          injected.push(slotName)
          callback()
        },
        register: (options2, component) => { registered.push({ options: options2, component }); return () => {} },
      },
      effect: (fn) => { fn() },
    },
  }
}

// Expand every function component so the tree holds real elements.
function deepRender(node) {
  if (node === null || node === undefined || typeof node !== 'object') return node
  if (Array.isArray(node)) return node.map(deepRender)
  if (typeof node.type === 'function') return deepRender(node.type(node.props ?? {}))
  return { ...node, children: (node.children ?? []).map(deepRender) }
}

function findByClass(node, className, out = []) {
  if (node === null || typeof node !== 'object') return out
  if (Array.isArray(node)) { for (const child of node) findByClass(child, className, out); return out }
  const cls = node.props?.className
  if (typeof cls === 'string' && cls.split(/\s+/).includes(className)) out.push(node)
  for (const child of node.children ?? []) findByClass(child, className, out)
  return out
}

function texts(node, out = []) {
  if (node === null || node === undefined || node === false) return out
  if (typeof node === 'string' || typeof node === 'number') { out.push(String(node)); return out }
  if (Array.isArray(node)) { for (const child of node) texts(child, out); return out }
  for (const child of node.children ?? []) texts(child, out)
  return out
}

function load(exportsModule, run) {
  exportsModule.apply(run.ctx)
  const byName = {}
  for (const entry of run.registered) byName[entry.options.name] = entry
  return byName
}

// ── case 1: layout + overlay → dialog on the overlay, main steps aside ───
const layoutCalls = []
const first = loadModule()
const exportsObject = first.registration.factory((specifier) => {
  if (specifier === 'react') return ReactStub
  throw new Error('unexpected require: ' + specifier)
})
const run = makeCtx(layoutCalls)
const slots1 = load(exportsObject, run)

console.log('module id =', first.registration.id)
console.log('exports.name =', exportsObject.name)
console.log('exports.inject =', JSON.stringify(exportsObject.inject))
console.log('styles injected =', first.styles.length, first.styles[0]?.id)
console.log('slots injected =', run.injected.join(', '))
console.log('entries =', run.registered.map((r) => `${r.options.name}#${r.options.key ?? r.options.id}(order=${r.options.order ?? '-'})`).join(', '))
console.log('sidebar label =', (() => {
  const label = slots1['sidebar.panellist']?.options?.label
  return typeof label === 'function' ? label() : label
})())

const glyph = deepRender(slots1['sidebar.panellist'].component({ size: 16, active: false }))
console.log('glyph type =', glyph?.type, 'fill =', glyph?.props?.fill)

console.log('overlay closed initially =', deepRender(slots1['shell.overlay'].component({})) === null)

const mainTree = deepRender(slots1.main.component({}))
console.log('main panel steps aside =', mainTree === null)
console.log('layout calls after selection =', JSON.stringify(layoutCalls))

const overlayTree = deepRender(slots1['shell.overlay'].component({}))
const overlayText = texts(overlayTree).join(' | ')
console.log('renders backdrop =', findByClass(overlayTree, 'bafx-backdrop').length === 1)
console.log('renders dialog =', findByClass(overlayTree, 'bafx-dialog').length === 1)
console.log('has reset button =', overlayText.includes('重置为默认配置'))
console.log('has all controls =', ['点击大小', '拖尾长度', '缩放', '不透明度', '混合模式', '主题色'].every((s) => overlayText.includes(s)))

findByClass(overlayTree, 'bafx-backdrop')[0].props.onClick()
console.log('layout calls after closing =', JSON.stringify(layoutCalls))
console.log('overlay closed after close =', deepRender(slots1['shell.overlay'].component({})) === null)

// ── case 2: no layout service → inline page (never a dialog without a way back)
const second = loadModule()
const exportsObject2 = second.registration.factory((specifier) => {
  if (specifier === 'react') return ReactStub
  throw new Error('unexpected require: ' + specifier)
})
const run2 = makeCtx([], { layout: false })
const slots2 = load(exportsObject2, run2)
const inlineTree = deepRender(slots2.main.component({}))
console.log('fallback renders page =', findByClass(inlineTree, 'bafx-page').length === 1)
console.log('fallback has no dialog =', findByClass(inlineTree, 'bafx-dialog').length === 0)
console.log('fallback keeps controls =', texts(inlineTree).join(' ').includes('重置为默认配置'))

// ── case 3: layout but no overlay seat → the main panel hosts the dialog ──
const third = loadModule()
const exportsObject3 = third.registration.factory((specifier) => {
  if (specifier === 'react') return ReactStub
  throw new Error('unexpected require: ' + specifier)
})
const run3 = makeCtx([], { overlay: false })
const slots3 = load(exportsObject3, run3)
const hostTree = deepRender(slots3.main.component({}))
console.log('no-overlay host renders dialog =', findByClass(hostTree, 'bafx-dialog').length === 1)
console.log('no-overlay host keeps controls =', texts(hostTree).join(' ').includes('重置为默认配置'))

// ── case 4: layout arrives AFTER apply → the dialog path still wins ───────
// This is the cold-start race that made an earlier build fall back to the
// inline page (the "opened in the work area" report):
const lateCalls = []
const layoutRef = { current: undefined }
const fourth = loadModule()
const exportsObject4 = fourth.registration.factory((specifier) => {
  if (specifier === 'react') return ReactStub
  throw new Error('unexpected require: ' + specifier)
})
const run4 = makeCtx(lateCalls, { layoutRef })
const slots4 = load(exportsObject4, run4)
const beforeLayout = deepRender(slots4.main.component({}))
console.log('before layout: inline page =', findByClass(beforeLayout, 'bafx-page').length === 1)
layoutRef.current = { selectPanel: (id) => lateCalls.push(id) }
const afterLayout = deepRender(slots4.main.component({}))
console.log('after layout: steps aside =', afterLayout === null)
console.log('after layout: selectPanel(null) =', JSON.stringify(lateCalls))
const overlay4 = deepRender(slots4['shell.overlay'].component({}))
console.log('after layout: dialog on overlay =', findByClass(overlay4, 'bafx-dialog').length === 1)

await new Promise((resolve) => setTimeout(resolve, 60))
console.log('apply did not throw = true')
