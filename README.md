# Daybook

A React and TypeScript Todo and Notes app designed for GitHub Pages, with Google Sheets as its shared data store and Google Apps Script as the API. When no Apps Script URL is configured, the app runs in local-browser mode using `localStorage`.

## Run locally

1. Install Node.js 20 or later.
2. Run `npm install`.
3. Run `npm run dev` and open the local URL Vite prints.

## Connect a Google Sheet

1. Create or choose a Google Sheet. The Apps Script creates `Todos` and `Notes` tabs with headers on the first request.
2. Open **Extensions → Apps Script** in that sheet and paste the contents of `gas/Code.gs` into the script editor.
3. Deploy the script as a **Web app**, executing as yourself and allowing access to **Anyone**. Copy the URL ending in `/exec`.
4. Add a GitHub Actions repository variable named `VITE_APPS_SCRIPT_URL` with that URL. For local integration, copy `.env.example` to `.env.local` and set the same URL.

The deployment is intentionally public and has no authentication yet: anyone who gets the site or API URL can read, create, edit, or delete records in the connected sheet. Do not store sensitive or private information in this version. Google login and per-user data isolation must be added before using this for private data.

## Publish on GitHub Pages

Push the project to the `Todo-Notes-App-Google-Sheet` repository on its `main` branch. In the repository, open **Settings → Pages** and set the build and deployment source to **GitHub Actions**. The workflow in `.github/workflows/deploy.yml` will build and deploy on each push to `main`.

The Pages build uses the `/Todo-Notes-App-Google-Sheet/` base path.

## Reminders

The browser asks for notification permission only when **Enable reminders** is clicked. Notifications run only while the app is open in a supported browser; GitHub Pages and this frontend do not provide server-side or closed-app push notifications. Reminders are checked every 30 seconds.

## Current features

- Create, edit, complete, and delete Todos; optionally set due dates and reminder times.
- Create, edit, delete, and search Notes.
- Responsive layout, browser-local fallback, and API error states.
