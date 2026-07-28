# AGENTS.md

## Cursor Cloud specific instructions

### Overview
This is **Sporr**, a French-language sports/workout tracker. It is a pure static
front-end app: HTML + CSS + vanilla JavaScript (ES6). See `README.md` for the
feature list. There is **no backend, no database, and no build step**. Data is
persisted in the browser's `localStorage` (key `sporrSessions`). `Chart.js` is
loaded from a CDN (`cdn.jsdelivr.net`) at page load, so rendering the pie chart
requires network access.

### Dependencies / setup
There is no package manager, lockfile, or build tooling — nothing to install.
The startup update script is a no-op.

### Running the app (dev)
Serve the repository root as static files and open it in a browser, e.g.:

```
python3 -m http.server 8000
```

Then browse to `http://localhost:8000/`. Opening `index.html` via `file://`
also works for everything except that the CDN pie chart still needs network.

### Lint / test / build
There is no linter, no automated test suite, and no build. Verification is
manual: add a session via the "Ajouter une séance" form and confirm the pie
chart updates.
