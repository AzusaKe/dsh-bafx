// Retired in dsh-bafx v2.0.0.
//
// The effect bootstrap used to live here as a classic script injected through
// `tapIndex` (browser shell) / a structured index row (desktop shell). That
// approach produced a floating overlay button that could not be moved and
// covered shipped UI, and the desktop shell never applies `tapIndex` anyway.
//
// The engine now starts from the client module (client/client.js), which also
// contributes the additive `sidebar.footer.action` entry and its control
// popover. This file is kept only so older installs that still reference
// /dsh-bafx/effect.js do not 404 the page.
export {}
