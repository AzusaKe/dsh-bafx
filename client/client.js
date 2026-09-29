window.__ModuleLoader__.load({ id: "dsh-bafx", factory: (require) => {
var module = { exports: {} }; var exports = module.exports;
'use strict'

// dsh-bafx client half — runs inside the page as a DSH client module.
//
// Integration:
//   sidebar.panellist#bafx  vertical sidebar entry (the sidebar owns the row,
//                           its label and the selection)
//   main#bafx               the panel that selection dispatches to. It opens the
//                           dialog and hands the main column straight back to
//                           the Conversation, so the entry behaves like a popup
//                           button and nothing is left "switched over".
//   shell.overlay#bafx-dialog  the dialog itself, on the frame-wide floating
//                           layer, so the app (including the Conversation) stays
//                           visible behind the dimmed backdrop.
//
// The engine is the ba-click-fx library served by this package's host half at
// /dsh-bafx/src/*.js (native ES modules, no build step).

const React = require('react')
const h = React.createElement
const { useCallback, useEffect, useLayoutEffect, useState, useSyncExternalStore } = React

const NS = 'dsh-bafx'
const LIB_URL = '/dsh-bafx/src/fx.js'
const STORAGE_KEY = 'dsh-bafx-settings'
const STYLE_ID = 'dsh-bafx-style'
const CLICK_SIZE_PATHS = [
  'hit.radius',
  'flare.radius',
  'disk.radius',
  'rings.radiusMin',
  'rings.radiusMax',
  'shards.clickRadius',
  'shards.sizeMin',
  'shards.sizeMax',
]
const DEFAULT_SETTINGS = {
  enabled: true,
  clickEnabled: true,
  trailEnabled: true,
  trailAlways: true,
  compositing: 'screen', // screen | plus-lighter | scene
  clickSize: 1,
  trailLength: 300,
  scale: 1,
  opacity: 1,
  themeColor: '#4ca7ff',
}

// ── settings ─────────────────────────────────────────────────────────────
function loadSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...DEFAULT_SETTINGS }
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) }
  } catch (error) {
    return { ...DEFAULT_SETTINGS }
  }
}

function saveSettings() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
  } catch (error) { /* ignore */ }
}

function getPath(obj, path) {
  return path.split('.').reduce((value, key) => (value == null ? undefined : value[key]), obj)
}

let settings = loadSettings()
let fx = null
let baselineClick = {}
let clientCtx = null
let layoutService = null
let overlaySeat = false
let engineState = 'loading' // loading | ready | failed
let engineError = ''
const engineListeners = new Set()

function publishEngine() {
  for (const listener of [...engineListeners]) {
    try { listener() } catch (error) { /* ignore */ }
  }
}

function subscribeEngine(listener) {
  engineListeners.add(listener)
  return () => { engineListeners.delete(listener) }
}

function engineSnapshot() {
  return engineState
}

// ── dialog state (shared by the overlay entry and the main panel) ────────
let dialogOpen = false
const dialogListeners = new Set()

function publishDialog() {
  for (const listener of [...dialogListeners]) {
    try { listener() } catch (error) { /* ignore */ }
  }
}

function subscribeDialog(listener) {
  dialogListeners.add(listener)
  return () => { dialogListeners.delete(listener) }
}

function dialogSnapshot() {
  return dialogOpen
}

function openDialog() {
  if (dialogOpen) return
  dialogOpen = true
  publishDialog()
}

function closeDialog() {
  if (!dialogOpen) return
  dialogOpen = false
  publishDialog()
}

// ── engine control ───────────────────────────────────────────────────────
function applyCompositing() {
  if (!fx) return
  const mode = settings.compositing
  if (mode === 'scene') fx.updateConfig({ outputCompositing: 'scene' })
  else if (mode === 'plus-lighter') {
    fx.updateConfig({ outputCompositing: 'browser-overlay', hostCompositing: 'plus-lighter' })
  } else {
    fx.updateConfig({ outputCompositing: 'browser-overlay', hostCompositing: 'screen' })
  }
}

function applyClickSize() {
  if (!fx) return
  const patch = {}
  for (const path of CLICK_SIZE_PATHS) {
    const base = baselineClick[path]
    if (typeof base === 'number') patch[path] = base * settings.clickSize
  }
  fx.setFxParams(patch, { strict: true })
}

function applyAll() {
  if (!fx) return
  fx.setPaused(!settings.enabled, { clear: true })
  fx.updateConfig({
    clickEnabled: settings.clickEnabled,
    trailEnabled: settings.trailEnabled,
    trailAlways: settings.trailAlways,
    scale: settings.scale,
    opacity: settings.opacity,
    themeColor: settings.themeColor,
  })
  applyCompositing()
  fx.setFxParam('trail.lifetimeMs', settings.trailLength)
  applyClickSize()
}

function startEngine() {
  if (engineState !== 'loading') return
  import(LIB_URL).then((mod) => {
    fx = new mod.BAClickFX({
      outputCompositing: settings.compositing === 'scene' ? 'scene' : 'browser-overlay',
      hostCompositing: settings.compositing === 'plus-lighter' ? 'plus-lighter' : 'screen',
      overlayAlphaPolicy: 'coverage',
      overlayColorCompensation: 'none',
      lightBackgroundContrastAlpha: 0,
      clickEnabled: settings.clickEnabled,
      trailEnabled: settings.trailEnabled,
      trailAlways: settings.trailAlways,
      maxDpr: 1,
      themeColor: settings.themeColor,
    })
    const config = fx.getFxConfig()
    for (const path of CLICK_SIZE_PATHS) baselineClick[path] = getPath(config, path)
    applyAll()
    engineState = 'ready'
    publishEngine()
  }).catch((error) => {
    engineState = 'failed'
    engineError = String((error && error.message) || error)
    console.error('[dsh-bafx] failed to load the effect library:', error)
    publishEngine()
  })
}

// Resolved lazily on every use: capturing the service once at apply time is a
// cold-start race (a late-provided `layout` would leave the plugin permanently
// on the inline fallback, which looks like the old "work area" behaviour).
function layoutServiceNow() {
  if (clientCtx) {
    try {
      const live = clientCtx.get('layout')
      if (live) return live
    } catch (error) { /* fall through to the captured reference */ }
  }
  return layoutService
}

function canReturnToConversation() {
  const service = layoutServiceNow()
  return !!(service && typeof service.selectPanel === 'function')
}

function showConversation() {
  try {
    const service = layoutServiceNow()
    if (service && typeof service.selectPanel === 'function') {
      service.selectPanel(null)
      return true
    }
  } catch (error) {
    console.error('[dsh-bafx] could not return to the conversation:', error)
  }
  return false
}

// The overlay entry is the normal dialog host; without the overlay seat (or the
// layout service) the main panel hosts the controls itself instead.
function usesOverlayDialog() {
  return overlaySeat && canReturnToConversation()
}

// ── styles ───────────────────────────────────────────────────────────────
const CSS = `
.bafx-page{align-items:flex-start;display:flex;height:100%;justify-content:center;overflow:auto;padding:28px 20px}
.bafx-backdrop{background:rgba(15,18,24,.34);inset:0;pointer-events:auto;position:fixed;z-index:2147483000}
.bafx-dialog{align-items:center;display:flex;inset:0;justify-content:center;overflow:auto;padding:24px;pointer-events:auto;position:fixed;z-index:2147483001}
.bafx-card{background:var(--dsw-alias-bg-layer-1);border:1px solid var(--dsw-alias-border-l2);border-radius:12px;color:var(--dsw-alias-label-primary);display:flex;flex-direction:column;gap:12px;max-height:100%;padding:18px 20px;width:min(560px,100%)}
.bafx-dialog .bafx-card{box-shadow:0 24px 70px rgba(0,0,0,.38)}
.bafx-page-head{display:flex;flex-direction:column;gap:5px}
.bafx-title{align-items:center;display:flex;font-size:15px;font-weight:700;gap:9px}
.bafx-badge{border-radius:999px;font-size:11px;font-weight:500;line-height:1.7;padding:1px 9px;background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-secondary)}
.bafx-badge[data-state=ready]{background:color-mix(in srgb,#22a06b 24%,transparent);color:var(--dsw-alias-label-primary)}
.bafx-badge[data-state=failed]{background:color-mix(in srgb,var(--dsw-alias-state-error-primary) 24%,transparent)}
.bafx-close{appearance:none;background:none;border:0;border-radius:6px;color:var(--dsw-alias-label-secondary);cursor:pointer;font:inherit;font-size:15px;line-height:1;margin-left:auto;padding:3px 7px}
.bafx-close:hover{background:var(--dsw-alias-button-ghost-active-fill);color:var(--dsw-alias-label-primary)}
.bafx-desc{color:var(--dsw-alias-label-secondary);font-size:12px;line-height:1.6}
.bafx-sep{border-top:1px solid var(--dsw-alias-border-l1);margin:1px 0}
.bafx-row{align-items:center;display:flex;gap:10px}
.bafx-grid{display:flex;flex-wrap:wrap;gap:18px}
.bafx-grid label{align-items:center;cursor:pointer;display:flex;gap:6px;white-space:nowrap}
.bafx-label{color:var(--dsw-alias-label-secondary);flex:0 0 auto;min-width:66px}
.bafx-value{color:var(--dsw-alias-label-tertiary);font-variant-numeric:tabular-nums;min-width:54px;text-align:right}
.bafx-card input[type=range]{accent-color:var(--dsw-alias-brand-primary);flex:1;min-width:0}
.bafx-card input[type=checkbox]{accent-color:var(--dsw-alias-brand-primary);cursor:pointer}
.bafx-card input[type=color]{background:transparent;border:1px solid var(--dsw-alias-border-l2);border-radius:6px;cursor:pointer;height:24px;padding:0;width:36px}
.bafx-card select{background:var(--dsw-alias-bg-layer-2);border:1px solid var(--dsw-alias-border-l2);border-radius:6px;color:var(--dsw-alias-label-primary);flex:1;font:inherit;min-width:0;padding:4px 7px}
.bafx-foot{align-items:center;display:flex;gap:10px;justify-content:space-between}
.bafx-btn{appearance:none;background:transparent;border:1px solid var(--dsw-alias-border-l2);border-radius:7px;color:var(--dsw-alias-label-primary);cursor:pointer;font:inherit;font-size:12px;min-height:30px;padding:0 12px;white-space:nowrap}
.bafx-btn:hover{background:var(--dsw-alias-button-ghost-active-fill)}
.bafx-note{color:var(--dsw-alias-label-tertiary);font-size:11px;line-height:1.5}
.bafx-error{color:var(--dsw-alias-state-error-primary);font-size:12px;line-height:1.55;overflow-wrap:anywhere}
`

function injectStyles() {
  if (typeof document === 'undefined') return
  if (document.getElementById(STYLE_ID) !== null) return
  const style = document.createElement('style')
  style.id = STYLE_ID
  style.setAttribute('data-plugin', NS)
  style.textContent = CSS
  document.head.appendChild(style)
}

// ── sidebar glyph (the sidebar owns the row and its label) ───────────────
function BafxGlyph(props) {
  const size = typeof props?.size === 'number' ? props.size : 16
  return h('svg', {
    width: size, height: size, viewBox: '0 0 16 16',
    'aria-hidden': true, focusable: 'false', fill: 'currentColor',
  }, h('path', { d: 'M8 1.1 9.6 6.4 14.9 8 9.6 9.6 8 14.9 6.4 9.6 1.1 8 6.4 6.4Z' }))
}

// ── controls card ────────────────────────────────────────────────────────
function BafxControls(props) {
  const engine = useSyncExternalStore(subscribeEngine, engineSnapshot)
  const [view, setView] = useState(settings)

  const commit = useCallback((patch, apply) => {
    settings = { ...settings, ...patch }
    saveSettings()
    setView(settings)
    if (apply) apply()
  }, [])

  const reset = useCallback(() => {
    settings = { ...DEFAULT_SETTINGS }
    saveSettings()
    setView(settings)
    applyAll()
  }, [])

  const status = engine === 'ready'
    ? (view.enabled ? '运行中' : '已暂停')
    : engine === 'failed' ? '加载失败' : '加载中…'

  const check = (label, key, apply) => h('label', null,
    h('input', {
      type: 'checkbox', checked: view[key] === true,
      onChange: (event) => commit({ [key]: event.target.checked }, apply),
    }), ' ' + label)

  return h('div', { className: 'bafx-card', role: 'dialog', 'aria-modal': true, 'aria-label': '蔚蓝档案 鼠标特效' },
    h('div', { className: 'bafx-page-head' },
      h('div', { className: 'bafx-title' },
        h('span', null, '蔚蓝档案 鼠标特效'),
        h('span', { className: 'bafx-badge', 'data-state': engine }, status),
        props.onClose && h('button', {
          className: 'bafx-close', type: 'button', title: '关闭', 'aria-label': '关闭',
          onClick: props.onClose,
        }, '✕')),
      h('div', { className: 'bafx-desc' },
        '点击鼠标产生蔚蓝档案风格特效，移动鼠标产生光标拖尾。设置自动保存，重启后保留。')),

    engine === 'failed' && h('div', { className: 'bafx-error' }, '特效库加载失败：' + engineError),

    h('div', { className: 'bafx-sep' }),

    h('div', { className: 'bafx-row' },
      h('label', { className: 'bafx-grid' },
        h('input', {
          type: 'checkbox', checked: view.enabled === true,
          onChange: (event) => commit({ enabled: event.target.checked },
            () => { if (fx) fx.setPaused(!settings.enabled, { clear: true }) }),
        }),
        h('span', null, '启用特效'))),

    h('div', { className: 'bafx-grid' },
      check('点击特效', 'clickEnabled', () => fx && fx.updateConfig({ clickEnabled: settings.clickEnabled })),
      check('拖尾', 'trailEnabled', () => fx && fx.updateConfig({ trailEnabled: settings.trailEnabled })),
      check('拖尾常显', 'trailAlways', () => fx && fx.updateConfig({ trailAlways: settings.trailAlways }))),

    h('div', { className: 'bafx-sep' }),

    h('div', { className: 'bafx-row' },
      h('span', { className: 'bafx-label' }, '点击大小'),
      h('input', {
        type: 'range', min: '0.5', max: '2', step: '0.05', value: String(view.clickSize),
        onChange: (event) => commit({ clickSize: Number(event.target.value) }, applyClickSize),
      }),
      h('span', { className: 'bafx-value' }, Number(view.clickSize).toFixed(2) + '×')),

    h('div', { className: 'bafx-row' },
      h('span', { className: 'bafx-label' }, '拖尾长度'),
      h('input', {
        type: 'range', min: '50', max: '2000', step: '10', value: String(view.trailLength),
        onChange: (event) => commit({ trailLength: Number(event.target.value) },
          () => fx && fx.setFxParam('trail.lifetimeMs', settings.trailLength)),
      }),
      h('span', { className: 'bafx-value' }, String(view.trailLength) + 'ms')),

    h('div', { className: 'bafx-row' },
      h('span', { className: 'bafx-label' }, '缩放'),
      h('input', {
        type: 'range', min: '0.5', max: '2', step: '0.05', value: String(view.scale),
        onChange: (event) => commit({ scale: Number(event.target.value) },
          () => fx && fx.updateConfig({ scale: settings.scale })),
      }),
      h('span', { className: 'bafx-value' }, Number(view.scale).toFixed(2))),

    h('div', { className: 'bafx-row' },
      h('span', { className: 'bafx-label' }, '不透明度'),
      h('input', {
        type: 'range', min: '0', max: '1', step: '0.05', value: String(view.opacity),
        onChange: (event) => commit({ opacity: Number(event.target.value) },
          () => fx && fx.updateConfig({ opacity: settings.opacity })),
      }),
      h('span', { className: 'bafx-value' }, Number(view.opacity).toFixed(2))),

    h('div', { className: 'bafx-row' },
      h('span', { className: 'bafx-label' }, '混合模式'),
      h('select', {
        value: view.compositing,
        onChange: (event) => commit({ compositing: event.target.value }, applyCompositing),
      },
        h('option', { value: 'screen' }, '屏幕混合 screen（明暗背景通用）'),
        h('option', { value: 'plus-lighter' }, '加色 plus-lighter（暗色背景更亮）'),
        h('option', { value: 'scene' }, '场景 scene（严格加色语义）'))),

    h('div', { className: 'bafx-row' },
      h('span', { className: 'bafx-label' }, '主题色'),
      h('input', {
        type: 'color', value: view.themeColor,
        onChange: (event) => commit({ themeColor: event.target.value },
          () => fx && fx.updateConfig({ themeColor: settings.themeColor })),
      }),
      h('span', { className: 'bafx-note' }, '默认 #4ca7ff 蔚蓝档案蓝')),

    h('div', { className: 'bafx-sep' }),

    h('div', { className: 'bafx-foot' },
      h('span', { className: 'bafx-note' }, '重置会恢复全部默认值并立即生效'),
      h('button', { className: 'bafx-btn', type: 'button', onClick: reset }, '重置为默认配置')))
}

// ── the dialog surface (backdrop + card) ─────────────────────────────────
function BafxModal(props) {
  return h(React.Fragment, null,
    h('div', { className: 'bafx-backdrop', onClick: props.onClose }),
    h('div', {
      className: 'bafx-dialog',
      onClick: (event) => { if (event.target === event.currentTarget) props.onClose() },
    }, h(BafxControls, { onClose: props.onClose })))
}

// ── overlay entry: the usual dialog host ─────────────────────────────────
function BafxOverlay() {
  const open = useSyncExternalStore(subscribeDialog, dialogSnapshot)
  const close = useCallback(() => {
    closeDialog()
    showConversation()
  }, [])

  useEffect(() => {
    if (!open) return undefined
    const onKeyDown = (event) => { if (event.key === 'Escape') close() }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open, close])

  if (!open) return null
  return h(BafxModal, { onClose: close })
}

// ── main panel: opens the dialog, then steps aside ───────────────────────
function BafxMain() {
  const viaOverlay = usesOverlayDialog()
  const canReturn = canReturnToConversation()
  const [inlineOpen, setInlineOpen] = useState(true)

  const closeInline = useCallback(() => {
    setInlineOpen(false)
    showConversation()
  }, [])

  // Runs before paint, so the main column never visibly switches over.
  useLayoutEffect(() => {
    if (!viaOverlay) return
    openDialog()
    showConversation()
  }, [viaOverlay])

  useEffect(() => {
    if (viaOverlay || !canReturn || !inlineOpen) return undefined
    const onKeyDown = (event) => { if (event.key === 'Escape') closeInline() }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [viaOverlay, canReturn, inlineOpen, closeInline])

  // The dialog lives on the overlay layer; this panel has nothing to draw.
  if (viaOverlay) return null

  // No way back to the Conversation: keep the controls inline as a plain page.
  if (!canReturn) return h('div', { className: 'bafx-page' }, h(BafxControls, {}))

  return inlineOpen ? h(BafxModal, { onClose: closeInline }) : null
}

// ── plugin ───────────────────────────────────────────────────────────────
exports.name = 'dsh-bafx/client'
// Both are hard dependencies: `slots` carries the entries, `layout` is how the
// dialog retires its main panel back to the Conversation.
exports.inject = ['slots', 'layout']
exports.apply = function apply(ctx) {
  injectStyles()
  clientCtx = ctx
  layoutService = ctx.get('layout') || null
  startEngine()

  // Vertical sidebar entry: the sidebar renders the row (glyph + label) and
  // selects the `main` panel of the same id.
  ctx.slots.inject('sidebar.panellist', () => ctx.slots.register({
    name: 'sidebar.panellist', id: 'bafx', order: 30,
    label: () => '点击特效',
  }, (props) => h(BafxGlyph, props)))

  // Paired main panel: opens the dialog and returns to the Conversation.
  ctx.slots.inject('main', () => ctx.slots.register({
    name: 'main', key: 'bafx',
  }, () => h(BafxMain)))

  // The dialog's home: the frame-wide floating layer, above every column.
  ctx.slots.inject('shell.overlay', () => {
    overlaySeat = true
    return ctx.slots.register({
      name: 'shell.overlay', id: 'bafx-dialog', order: 40,
    }, () => h(BafxOverlay))
  })

  // The engine owns a full-screen overlay; keep it in step with the fiber.
  ctx.effect(() => () => {
    try { if (fx) fx.destroy() } catch (error) { /* ignore */ }
    fx = null
  })
}

return module.exports; } });
