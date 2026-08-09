# Dank Movies — AI Agent Skills & Playbooks (`skills.md`)

This document defines standardized, repeatable operational recipes ("skills") for AI agents and engineers working on the **Dank Movies** codebase. Each skill provides trigger conditions, required files, step-by-step procedures, code patterns, and common pitfalls.

---

## Skill Index

| # | Skill Name | Intent / Trigger | Target Area |
|---|------------|-------------------|-------------|
| 1 | [PocketPages Route Authoring](#skill-1-pocketpages-route-authoring) | Add/modify SSR pages, layouts, and route loaders | `pb_hooks/pages/` |
| 2 | [PocketBase Goja Database Operations](#skill-2-pocketbase-goja-database-operations) | Query, mutate, or aggregate data in SQLite/PocketBase | `pb_hooks/lib/`, `+load.js` |
| 3 | [DaisyUI & Tailwind Responsive Styling](#skill-3-daisyui--tailwind-responsive-styling) | Style UI components, theme styling, fix responsive layouts | `pb_hooks/pages/`, `app.tailwind.css` |
| 4 | [Alpine.js Reactive Components & Modals](#skill-4-alpinejs-reactive-components--modals) | Add client interactivity, dialogs, dropdowns, events | `_private/`, `.ejs` |
| 5 | [External Movie APIs (TMDB & OMDB)](#skill-5-external-movie-apis-tmdb--omdb) | Search movies, fetch metadata, fetch external ratings | `pb_hooks/lib/tmdb.js`, `omdb.js` |
| 6 | [Watchlist & Access Control Logic](#skill-6-watchlist--access-control-logic) | Manage list CRUD, member permissions, watch history | `pb_hooks/lib/watchlist-actions.js` |
| 7 | [Validation, Debugging & Quality Assurance](#skill-7-validation-debugging--quality-assurance) | Check JS syntax, verify SSR output, test Goja hooks | Scripts, CSS build, server logs |
| 8 | [Deployment & Release Delivery](#skill-8-deployment--release-delivery) | Deploy changes to production (PocketHost) | `.phioconfig`, `npm run push` |

---

## Skill 1: PocketPages Route Authoring

### Trigger
When adding a new page, endpoint, or editing an existing SSR route in `pb_hooks/pages/`.

### Required Conventions
- Place file-based routes inside `pb_hooks/pages/`. Routes wrapped in parentheses like `(navbarlayout)/` share the parent `_layout.ejs` without adding to the URL path.
- Always implement the **PRG (Post-Redirect-Get)** pattern for form submissions to prevent duplicate form resubmissions.

### Step-by-Step Procedure
1. **Create/Update `+load.js`**:
   - Export `module.exports = function(context) { ... }`.
   - Initialize client & auth: `const { client, user } = common.init(context)`.
   - Extract params: `const id = context?.params?.id || context?.query?.id`.
   - Handle `POST` requests, perform mutations, and redirect with `context.response.redirect('/path?message=Success')`.
   - Return a plain JavaScript data object to be passed into the `.ejs` template.
2. **Create/Update `index.ejs`**:
   - Access loader return values via `data.*` or `locals.data.*`.
   - Use `<%- include('../../_private/partial.ejs') %>` for reusable components.
3. **Handle Route Metadata**:
   - If customizing layouts or headers, configure `+config.js` or emit navbar events (e.g. `$dispatch('set-mobile-navbar-title', { title: '...' })`).

### Code Template (`+load.js`)
```javascript
/**
 * Route loader for movie detail view.
 * @type {import('pocketpages').PageDataLoaderFunc}
 */
module.exports = function (context) {
    const common = require('../../../lib/common.js')
    const { client, user } = common.init(context)
    const { request, response } = context

    const movieId = context?.params?.id

    // POST Action (PRG pattern)
    if (request.method === 'POST') {
        const formData = common.parseFormData(context)
        // ... perform action
        response.redirect(`/movies/${movieId}?message=Updated`)
        return
    }

    // GET / SSR Data Loading
    const movie = common.mapMovieFromRecord(/* ... */)

    return {
        movie,
        user,
        message: context.query?.message || null,
        error: context.query?.error || null,
    }
}
```

> [!WARNING]
> In PocketPages loader files (`+load.js`), if you invoke `context.response.redirect(...)`, always execute `return` immediately after to stop subsequent template rendering.

---

## Skill 2: PocketBase Goja Database Operations

### Trigger
When querying collections, saving records, executing batch lookups, or writing raw database queries.

### Runtime Constraints
- **Engine**: Goja (JavaScript VM running inside Go), **not Node.js**.
- **No Node Built-ins**: Never `require('fs')`, `require('http')`, or `require('child_process')` in `pb_hooks/`.
- **Query Batch Limit**: `$app.findRecordsByFilter` accepts a max limit of **500**. Queries exceeding 500 will throw a runtime exception.

### Table & Column Reference (`pb_hooks/lib/common.js`)
Always import and use `TABLES` and `COLS` from `common.js`:
- `TABLES.USERS` (`'users'`), `TABLES.LISTS` (`'lists'`), `TABLES.LIST_USER` (`'list_user'`)
- `TABLES.MOVIES` (`'movies'`), `TABLES.WATCHED_HISTORY` (`'watched_history'`), `TABLES.WATCH_HISTORY_USER` (`'watch_history_user'`)

### Standard Query Recipes

#### 1. Filtered Record Lookup
```javascript
const records = $app.findRecordsByFilter(
    TABLES.LISTS,
    `owner = '${user.id}' && (is_deleted = false || is_deleted = null)`,
    '-created', // sort
    50,         // limit (<= 500)
    0           // offset
)
```

#### 2. Expanding Relational Fields
```javascript
const historyRecords = $app.findRecordsByFilter(TABLES.WATCHED_HISTORY, `list = '${listId}'`, '-watched', 20, 0)
$app.expandRecords(historyRecords, ['movie'])

const movies = historyRecords.map(rec => {
    const movieRecord = rec.expandedOne('movie')
    return common.mapMovieFromRecord(movieRecord, rec)
}).filter(Boolean)
```

#### 3. Creating & Updating Records
```javascript
const collection = $app.findCollectionByNameOrId(TABLES.WATCHED_HISTORY)
const record = new Record(collection)

record.set(COLS.LIST, listId)
record.set(COLS.MOVIE, movieDbId)
record.set(COLS.WATCHED, new Date().toISOString())
$app.save(record)
```

#### 4. Raw SQL Aggregation via Query Builder
```javascript
const resultModel = arrayOf(new DynamicModel({ list: '', count: 0 }))
$app.db()
    .select('wh.list', 'COUNT(*) as count')
    .from(`${TABLES.WATCHED_HISTORY} wh`)
    .innerJoin(`${TABLES.LISTS} w`, $dbx.exp('w.id = wh.list'))
    .where($dbx.exp("wh.list != ''"))
    .andWhere($dbx.hashExp({ [`w.${COLS.IS_DELETED}`]: false }))
    .groupBy('wh.list')
    .orderBy('count DESC')
    .limit(5)
    .all(resultModel)
```

---

## Skill 3: DaisyUI & Tailwind Responsive Styling

### Trigger
When updating UI appearance, fixing alignment/responsiveness, modifying theme colors, or adding DaisyUI components.

### Best-Practice Rules
1. **Semantic DaisyUI Over Heavy Raw Utilities**: Prefer `btn btn-primary`, `input input-bordered`, `card bg-base-100`, `alert alert-success` over lengthy arbitrary CSS class chains.
2. **DaisyUI Theme Tokens**:
   - Dark theme is `yellowdark` (`primary: #FACC15`, `base-100: #000000`, `base-200: #201f1f`).
   - Use `text-base-content`, `bg-base-100`, `bg-base-200`, `border-base-300` to automatically support light/dark modes.
3. **The `.join` Component Rule**:
   - DaisyUI `.join` relies on `:first-child` and `:last-child` pseudo-selectors for border radiuses.
   - **Never** place `<input type="hidden">` or non-visual tags as direct children before the first `.join-item` or after the last `.join-item`. Nest hidden inputs inside `<label>` or wrapper elements.
   - Prevent `.join` overflow on mobile by pairing `flex-1 min-w-0` on inputs with `shrink-0` on action buttons.

### Responsive Breakpoint Sizing Table
| Element | Mobile (`<640px`) | Tablet / Desktop (`≥640px`) |
|---------|-------------------|-----------------------------|
| Hero Title | `text-3xl` | `sm:text-4xl md:text-5xl` |
| Text Input | `input-md text-sm` | `sm:input-lg sm:text-base` |
| Action Button | `btn-md px-4` | `sm:btn-lg sm:px-8` |
| Icon inside Button | `h-5 w-5` | `sm:h-6 sm:w-6` |
| Grid Columns | `grid-cols-1` | `sm:grid-cols-2 lg:grid-cols-4` |

### CSS Rebuilding
When modifying classes, verify they are compiled into both `pb_hooks/pages/app.css` and `pb_public/css/app.css`:
```bash
npx tailwindcss -i ./pb_hooks/pages/app.tailwind.css -o ./pb_hooks/pages/app.css
cp ./pb_hooks/pages/app.css ./pb_public/css/app.css
```

---

## Skill 4: Alpine.js Reactive Components & Modals

### Trigger
When adding client-side state, modal dialogs, search auto-clearing, dropdowns, or tab filtering.

### Standard Modal Pattern (DaisyUI + Alpine.js)
Place reusable modals in `pb_hooks/pages/_private/` and include them via `<%- include(...) %>`.

```html
<!-- Modal Component Partial -->
<div x-data="{ open: false, movieId: null }"
     @open-add-modal.window="open = true; movieId = $event.detail.id"
     @keydown.escape.window="open = false">
    
    <dialog class="modal modal-bottom sm:modal-middle" :class="{ 'modal-open': open }">
        <div class="modal-box bg-base-100 border border-base-content/10 shadow-2xl">
            <h3 class="text-lg font-bold">Add to Watchlist</h3>
            <p class="py-4 text-sm text-base-content/70">Choose which list to add this movie to.</p>
            
            <form method="POST" action="/movies/search" @submit="open = false">
                <input type="hidden" name="tmdb_id" :value="movieId">
                
                <div class="modal-action">
                    <button type="button" class="btn btn-ghost" @click="open = false">Cancel</button>
                    <button type="submit" class="btn btn-primary">Confirm</button>
                </div>
            </form>
        </div>
        <form method="dialog" class="modal-backdrop" @click="open = false">
            <button>close</button>
        </form>
    </dialog>
</div>
```

### Triggering the Modal from Any Element
```html
<button type="button"
        class="btn btn-primary btn-sm"
        @click="$dispatch('open-add-modal', { id: movie.id })">
    Add Movie
</button>
```

---

## Skill 5: External Movie APIs (TMDB & OMDB)

### Trigger
When fetching movie details, credits, search results, or supplementary ratings.

### Key Rules
- Environment variables are accessed via `require('./env.js').getEnv('TMDB_API_KEY')`.
- In the Goja runtime, use `$http.send` for synchronous HTTP requests.
- Do not use `fetch()` or `URLSearchParams` directly without fallback or manual query string serialization.

### Adding an API Call (`pb_hooks/lib/tmdb.js`)
```javascript
function fetchTMDB(endpoint, params = {}) {
    const apiKey = getApiKey()
    if (!apiKey) throw new Error('TMDB_API_KEY is not set')

    const queryParams = Object.assign({}, params, { api_key: apiKey })
    const queryString = Object.keys(queryParams)
        .map(key => encodeURIComponent(key) + '=' + encodeURIComponent(queryParams[key]))
        .join('&')

    const url = `${BASE_URL}${endpoint}?${queryString}`

    if (typeof $http !== 'undefined') {
        const res = $http.send({
            url: url,
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        })
        if (res.statusCode >= 400) {
            throw new Error(`TMDB Error [${res.statusCode}]: ${res.raw}`)
        }
        return res.json
    }
    // Fallback for offline Node scripting
    const stdout = require('child_process').execSync(`curl -s "${url}"`).toString()
    return JSON.parse(stdout)
}
```

---

## Skill 6: Watchlist & Access Control Logic

### Trigger
When handling watchlist ownership, invitations, public/private visibility, or attendance tracking.

### Access Control Rules
1. **Public Lists** (`is_private = false`): Visible to anyone; editable only by owner (or invited users with `edit` permission).
2. **Private Lists** (`is_private = true`): Visible only to the `owner` or users with an active record in `list_user`.
3. **Soft Deletes**: Always check `is_deleted != true` or `(is_deleted = false || is_deleted = null)` when querying lists.

### Helper Usage (`common.js` & `watchlist-actions.js`)
```javascript
const common = require('../../../../lib/common.js')
const watchlistActions = require('../../../../lib/watchlist-actions.js')

// 1. Check access
const { list, hasAccess, isOwner, error } = common.getWatchlistWithAccess(listId, user)
if (!hasAccess) {
    context.response.redirect('/watchlists?error=' + encodeURIComponent(error))
    return
}

// 2. Add movie to watchlist (creates Movie record + WatchedHistory record)
const result = watchlistActions.addMovieToWatchlist(user, tmdbId, listId)

// 3. Attach user ratings & attendance
const movies = common.fetchWatchlistMovies(listId, { limit: 50 })
common.attachAttendance(movies, listId)
```

---

## Skill 7: Validation, Debugging & Quality Assurance

### Trigger
Before completing any task, verify that code runs without syntax errors, template parsing issues, or CSS regressions.

### Quality Assurance Checklist
1. **Server-Side Syntax Validation**:
   - Check modified JS files for syntax errors using `node -c <file.js>` or `node syntax_check.js`.
2. **Tailwind CSS Compilation**:
   - Run `npx tailwindcss -i ./pb_hooks/pages/app.tailwind.css -o ./pb_hooks/pages/app.css` and verify no missing classes.
3. **SSR Rendering Verification**:
   - Verify that the endpoint returns `200 OK` via `curl -s -o /dev/null -w "%{http_code}" http://localhost:8090/...`.
4. **Log Inspection**:
   - Inspect PocketBase logger output: `$app.logger().info(...)` or `$app.logger().error(...)`.

---

## Skill 8: Deployment & Release Delivery

### Trigger
When deploying approved changes to production (`https://movie.jkim.win`).

### Deployment Procedure
1. Ensure all temporary debug logs or seed scripts in `scripts/` are cleaned up.
2. Ensure `app.css` is freshly compiled.
3. Run the deployment command:
   ```bash
   npm run push
   ```
4. Verify deployment output from `phio` / `ftp-deploy`.

> [!CAUTION]
> **Strict Operational Rule**: Never execute `git commit` or create git commits on behalf of the user. Staging, reviewing diffs, and committing are reserved strictly for the user.
