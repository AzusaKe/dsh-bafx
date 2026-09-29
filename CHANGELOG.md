# Changelog

All notable changes to `dsh-bafx` are documented here.

## 2.2.1

- **Fixed** a cold-start race: `layout` was resolved once at `apply()` time, so
  when the service was not yet provided the plugin permanently fell back to the
  inline page (the entry appeared to "open in the work area" again). `layout` is
  now a declared hard dependency and is also re-resolved on every use.
- Regression test added for the exact scenario (service arrives after `apply`).

## 2.2.0

- Control UI became a **dialog**: the sidebar entry opens a centred modal on the
  `shell.overlay` layer while the main column returns to the Conversation, so the
  app stays visible behind the dimmed backdrop and closing the dialog is the only
  "go back" step (✕ / backdrop / Esc).
- Two-level fallback: without the `layout` service the controls stay inline;
  without the `shell.overlay` seat the main panel hosts the dialog itself.

## 2.1.0

- **Added** a "reset to defaults" button (restores all nine settings live).
- Sidebar entry moved from the horizontal `sidebar.footer.action` strip to the
  vertical `sidebar.panellist` list, paired with a keyed `main` panel.

## 2.0.0

- Replaced the injected bootstrap script (`webserver/index-inject` row /
  `tapIndex`) with a proper **client module** (`dsh.client`, `platform: web`).
  The Electron desktop shell never applies `tapIndex` (its index.html is emitted
  verbatim from the installed dist), and a floating overlay button covered
  shipped UI.
- Host half reduced to serving the library modules at `/dsh-bafx/src/*.js`.

## 1.0.0

- First working integration: DSH bundle plugin that serves the vendored
  ba-click-fx sources from the host half and starts the engine in the browser.
