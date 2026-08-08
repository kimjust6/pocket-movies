# AGENTS.md

Welcome to **Dank Movies** (Pocket Movies). This document provides architectural context, development guidelines, runtime conventions, and operational best practices for AI agents and developers working on this codebase.

---

## 1. Tech Stack & Architecture

- **Backend & Database**: [PocketBase](https://pocketbase.io/) (Go + SQLite embedded database).
  - Data directory: `pb_data/data.db` (local development SQLite DB).
  - Server-side runtime: **Goja** JavaScript engine inside PocketBase.
- **Frontend / SSR**: [PocketPages](https://github.com/pocketpages/pocketpages) (Server-Side Rendering with EJS templates).
  - Page routes & templates: `pb_hooks/pages/`
  - Shared server utilities: `pb_hooks/lib/`
  - Global hooks: `pb_hooks/*.pb.js`
- **Client-Side Interactivity**: [Alpine.js](https://alpinejs.dev/) for client-side reactive components (modals, search dropdowns, sorting).
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) + [DaisyUI](https://daisyui.com/).
  - Source CSS: `pb_hooks/pages/app.tailwind.css`
  - Compiled CSS: `pb_hooks/pages/app.css` and `pb_public/css/app.css`
- **APIs**:
  - **TMDB API**: Movie details, posters, backdrop images, overviews, release dates, TMDB vote averages.
  - **OMDB API**: Supplementary IMDb IDs, IMDb scores, and Rotten Tomatoes ratings.

---

## 2. Directory Structure

```text
pocket-movies/
├── pb_hooks/                  # Server-side logic and SSR templates
│   ├── lib/                   # Shared JS helpers (common.js, env.js, etc.)
│   ├── pages/                 # PocketPages file-based routing
│   │   ├── (navbarlayout)/    # Pages sharing the main navigation bar
│   │   │   ├── watchlists/    # Watchlist list & detail views ([id]/)
│   │   │   ├── movies/        # Movie search & detail views
│   │   │   └── _layout.ejs    # Navbar layout template
│   │   ├── _private/          # Reusable EJS partials & modals
│   │   ├── api/               # API endpoints
│   │   └── +config.js         # PocketPages route configuration
│   └── pocketpages.pb.js      # PocketPages hook initialization
├── pb_public/                 # Static assets (favicons, images, compiled bundles)
├── pb_data/                   # Local database files (ignored in git)
├── scripts/                   # Helper CLI scripts & type generation
├── .env                       # Environment variables (TMDB_API_KEY, OMDB_API_KEY)
└── package.json               # Scripts & dependencies
```

---

## 3. PocketPages & PocketBase Conventions

### Page Loaders (`+load.js`)
- Each page directory in `pb_hooks/pages/` can include a `+load.js` file exporting a function `module.exports = function(context) { ... }`.
- **`context` Object**:
  - `context.params` / `context.pathParams`: Route parameters (e.g. `[id]`).
  - `context.request`: Incoming HTTP request.
  - `context.response`: Response helper (`context.response.redirect('/path')`, `context.response.json({ ... })`).
  - `context.pb({ request })`: Initialized PocketBase JS SDK client bound to the current auth state.

### Goja JSVM Runtime Rules
- The server-side code runs inside Goja (Go's JavaScript VM), **not Node.js**:
  - Node-specific modules (`fs`, `child_process`, `net`, `http`) are **not available** in standard hooks.
  - Globals available: `$app` (PocketBase core application instance), `Record`, `Collection`, `DynamicModel`, `arrayOf`.
  - Max batch limit for `$app.findRecordsByFilter` is **500** (values above 500 will throw an error).
  - Relation fields (like `watched_history.list`) enforce relational constraints to existing records in the target collection.

### Common Utilities (`pb_hooks/lib/common.js`)
- Always use `common.init(context)` to retrieve `{ client, user }`.
- Use table and column constants from `TABLES` and `COLS` exported by `common.js` rather than hardcoded table name strings.
- Helper functions available:
  - `common.fetchWatchlistMovies(listId, options)`
  - `common.getWatchlistWithAccess(listId, user)`
  - `common.formatDateTime(date)`
  - `common.attachAttendance(movies, listId)`

---

## 4. Key Developer Commands

```bash
# 1. Start development server (Tailwind watcher + PocketBase dev server)
npm run dev

# 2. Rebuild/watch Tailwind CSS
npm run css

# 3. Deploy to production (PocketHost / SFTP)
npm run push

# 4. Generate JSDoc / schema types
npm run typegen

# 5. Update PocketBase binary
npm run update
```

---

## 5. Deployment Guidelines (`npm run push`)

- Deployment uses `phio` / `ftp-deploy` configured in `.phioconfig` (`instanceName: "dank-movies"`).
- Target instance: `https://movie.jkim.win`.
- Do not commit large scratch scripts, raw dump text files, or temporary seed JSON files to git.
- Keep `.ftp-deploy-sync-state.json` intact or let the deployment pipeline manage sync hashes.

---

## 6. Code Style & Best Practices

1. **EJS Templates**:
   - Keep templates clean by handling complex logic in `+load.js` and passing structured data to `.ejs`.
   - Use `<%- include(...) %>` with proper relative paths for partials in `_private/`.
2. **Alpine.js Components**:
   - Structure reactive logic into clean controller functions (e.g. `watchlistDetail(...)` in `/js/watchlist-detail.js`).
   - Prefer Alpine directives (`x-data`, `x-show`, `x-if`, `@click`) over manual DOM manipulation.
3. **Tailwind & DaisyUI**:
   - Use semantic DaisyUI classes (`btn`, `badge`, `alert`, `modal`, `avatar`, `card`, `bg-base-100`, `text-primary`).
   - Support dark mode out of the box using DaisyUI theme tokens.
4. **Documentation**:
   - Document any new loaders, route hooks, and helper functions with JSDoc annotations.

---

## 7. Operational Rules for AI Agents

- **No Automated Git Commits**:
  - The AI agent must **never** run `git commit`, create git commits, or commit changes on behalf of the user.
  - All staging, reviewing, and committing must be left entirely to the user.

