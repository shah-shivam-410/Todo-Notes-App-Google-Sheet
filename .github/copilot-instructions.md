# Repository guide

## Commands

- `npm install` installs dependencies; CI uses `npm ci`.
- `npm run dev` starts the Vite development server.
- `npm run build` runs the TypeScript project check and creates the static site in `dist/`.
- `npm run preview` serves the production build locally.
- There is no test runner, test script, or lint script configured in `package.json`; no single-test command is available.

## Architecture

Daybook is a browser-only React and TypeScript app built with Vite. `src/main.tsx` mounts the React app and owns its UI state, interaction handlers, editing flows, and open-tab reminder checks. The shared `Todo`, `Note`, and `AppData` shapes are defined in `src/types.ts`; `src/storage.ts` is the persistence boundary used by the UI.

The storage adapter uses `localStorage` when `VITE_APPS_SCRIPT_URL` is unset, and otherwise sends JSON POST requests to the configured Google Apps Script web app. `gas/Code.gs` handles that API and stores records in the `Todos` and `Notes` tabs. Keep the client and Apps Script field names and request/response shapes aligned. The public deployment currently has no authentication; do not treat the Apps Script URL as a secret or describe this storage as private.

GitHub Pages deployment is configured in `.github/workflows/deploy.yml`. Vite uses `/Todo-App-Google-Sheets-Github/` as the production base path in Actions; if the repository name changes, update `vite.config.ts` accordingly. CI injects the Apps Script URL from the `VITE_APPS_SCRIPT_URL` repository variable at build time.

## Project-specific conventions

- Keep data operations behind `storage` rather than calling `fetch` or `localStorage` from UI handlers. When changing a record shape or API operation, update `src/types.ts`, `src/storage.ts`, and the matching Apps Script schema/handlers together.
- Build UI with React components and typed props in `src/main.tsx`; rely on JSX text escaping and React event handlers rather than constructing HTML strings or rebinding handlers after renders.
- Reminder notifications are browser-side and checked while the page is open. Permission is requested only through the explicit reminder action; there is no service worker or closed-app delivery.
- The Sheet API uses `text/plain` JSON POST bodies to avoid a preflight dependency. Preserve that request style unless the Apps Script deployment/CORS approach is intentionally changed.
- `README.md` documents local setup, Sheet deployment, the public access warning, Pages configuration, and reminder limitations; keep it aligned with behavior changes.

## Copilot instructions

- Always use command prompt to run commands, never use power shell or other shells.
