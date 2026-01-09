# Wedding Website (PocketPages + DaisyUI)

Wedding website built on **PocketBase** using **PocketPages** for server-rendered pages (EJS), styled with **Tailwind CSS** + **DaisyUI**.

## Tech

- **PocketBase** (local server + embedded DB)
- **PocketPages** (pages, layouts, middleware under `pb_hooks/pages/`)
- **EJS** templates (`.ejs`)
- **Tailwind CSS** + **DaisyUI** (themes: `nord`, `dark`)

## Project structure

- `pb_hooks/pocketpages.pb.js` enables PocketPages
- `pb_hooks/pages/` contains routes/pages, layouts, partials, and page CSS
- `pb_data/` is the PocketBase data directory (local DB, migrations, storage)
- `pb_public/` static public assets

## Prerequisites

- Node.js (LTS recommended)
- PocketBase binary available as `pocketbase` on your PATH
    - Download PocketBase for your OS and add it to PATH, or place the binary somewhere your shell can find it.

## Getting started

Install dependencies:

```bash
npm install
```

Run Tailwind (watch) + PocketBase (dev) together:

```bash
npm run dev
```

If you only want to run the PocketBase server:

```bash
npm run start
```

## Common commands

- `npm run dev` – Tailwind watch + `pocketbase serve --dev`
- `npm run start` – run PocketBase only
- `npm run login` – login for deployment (uses `phio`)
- `npm run push` – deploy to the configured instance
- `npm run update` – update the PocketBase binary (if supported by your setup)

## Styling

- Tailwind entry: `pb_hooks/pages/app.tailwind.css`
- Output CSS: `pb_hooks/pages/app.css`
- Tailwind scans templates in `pb_hooks/pages/**/*.{ejs,md}` (see `tailwind.config.js`)

## Deployment

This repo is configured to deploy via `phio`:

```bash
npm run login
npm run push
```

The target instance name is set in `package.json` under `pockethost.instanceName`.
