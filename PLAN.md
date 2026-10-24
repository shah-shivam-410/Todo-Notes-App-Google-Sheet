# Todo and Notes App Plan

## Goal

Build a TypeScript-based Todo and Notes web app hosted as a static site on GitHub Pages. Google Sheets will store the app's data, and Todo tasks will support reminders/notifications.

## Proposed architecture

- **Frontend:** TypeScript with a lightweight static-site toolchain (Vite), deployed to GitHub Pages through GitHub Actions.
- **Data store/API:** A Google Apps Script web app connected to the Google Sheet the user will provide. The browser calls the script for Todo and Note operations; the sheet ID and script deployment URL will be configured as deployment settings rather than committed credentials.
- **Notifications:** Browser notifications and in-app reminders for Todo due dates. Notification permission is requested only after a user action. Because GitHub Pages cannot run a server, reminder behavior will be client-side; reliable delivery when the app is closed may require a separately hosted push-notification service and is not assumed in the initial version.

## Initial data model

- **Todo:** ID, title, optional description, completion status, due date/time, created timestamp, updated timestamp.
- **Note:** ID, title, content, created timestamp, updated timestamp.

The Google Sheet will use separate tabs for Todos and Notes, with a header row for each model's fields. The Apps Script API will validate requests and expose only the operations the frontend needs.

## Implementation phases

1. **Confirm setup details:** Get the Google Sheet and decide whether it should be publicly readable/writable or protected behind Google sign-in. Confirm the desired reminder behavior (in-app only, browser notifications while the app is open, or push notifications).
2. **Create the app foundation:** Set up the TypeScript frontend, responsive layout, app navigation, and GitHub Pages-compatible build configuration.
3. **Connect Google Sheets:** Add the Apps Script API and sheet schema, then implement typed frontend data access with loading and error states.
4. **Build Todo features:** Create, view, edit, complete, delete, and filter tasks; add due dates and reminder settings.
5. **Build Notes features:** Create, view, edit, delete, and search notes.
6. **Add notifications:** Request browser permission with clear UX and schedule client-side reminders according to the agreed behavior. Handle unsupported or denied notification permission gracefully.
7. **Verify and deploy:** Test core CRUD flows and failure cases, build the static site, configure GitHub Pages deployment, and document how to configure the Sheet and Apps Script deployment.

## Decisions and constraints

- The app is static on GitHub Pages; no private server-side credentials can be safely stored in frontend code.
- A Google Apps Script web app is the proposed bridge between the static frontend and Google Sheets. Its access settings must be chosen carefully because an endpoint accessible to anyone can permit unwanted reads or writes.
- Browser notifications require user permission and may be limited by browser settings, device power policies, and whether the app is open. Background delivery is not guaranteed without push infrastructure.
- The actual Sheet, deployment URL, and access policy are not yet available; use placeholders until provided.
