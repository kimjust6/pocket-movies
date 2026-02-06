/**
 * @file Common utility functions and constants for PocketBase hooks.
 * @module common
 */

/**
 * PocketBase Table Name Constants.
 * Use these to avoid hardcoding table names throughout the codebase.
 * @constant {Object<string, string>}
 * @property {string} USERS - The users table
 * @property {string} LISTS - The watchlists/lists table
 * @property {string} LIST_USER - The list-user relationship table for invites
 * @property {string} MOVIES - The movies table
 * @property {string} WATCHED_HISTORY - The watch history table (list-movie relationship)
 * @property {string} WATCH_HISTORY_USER - The user attendance/ratings table
 * @property {string} WATCHLIST - The personal watchlist table
 */
const TABLES = {
    USERS: 'users',
    LISTS: 'lists',
    LIST_USER: 'list_user',
    MOVIES: 'movies',
    WATCHED_HISTORY: 'watched_history',
    WATCH_HISTORY_USER: 'watch_history_user',
    WATCHLIST: 'watchlist'
};

/**
 * PocketBase Column Name Constants.
 * Use these to avoid hardcoding column names throughout the codebase.
 * @constant {Object<string, string>}
 */
const COLS = {
    /** @type {string} Primary key column */
    ID: 'id',
    /** @type {string} List reference column */
    LIST: 'list',
    /** @type {string} Movie reference column */
    MOVIE: 'movie',
    /** @type {string} User reference column */
    USER: 'user',
    /** @type {string} Owner reference column */
    OWNER: 'owner',
    /** @type {string} Created timestamp column */
    CREATED: 'created',
    /** @type {string} Watched date column */
    WATCHED: 'watched',
    /** @type {string} Soft delete flag column */
    IS_DELETED: 'is_deleted',
    /** @type {string} Private flag column */
    IS_PRIVATE: 'is_private',
    /** @type {string} User rating column (0-10 scale) */
    RATING: 'rating',
    /** @type {string} User review text column */
    REVIEW: 'review',
    /** @type {string} Movie title column */
    TITLE: 'title',
    /** @type {string} List title column */
    LIST_TITLE: 'list_title',
    /** @type {string} TMDB ID column */
    TMDB_ID: 'tmdb_id',
    /** @type {string} Poster path column */
    POSTER_PATH: 'poster_path',
    /** @type {string} Backdrop path column */
    BACKDROP_PATH: 'backdrop_path',
    /** @type {string} Release date column */
    RELEASE_DATE: 'release_date',
    /** @type {string} Runtime in minutes column */
    RUNTIME: 'runtime',
    /** @type {string} Movie overview/synopsis column */
    OVERVIEW: 'overview',
    /** @type {string} Movie tagline column */
    TAGLINE: 'tagline',
    /** @type {string} IMDB ID column */
    IMDB_ID: 'imdb_id',
    /** @type {string} Movie status column */
    STATUS: 'status',
    /** @type {string} TMDB score column */
    TMDB_SCORE: 'tmdb_score',
    /** @type {string} IMDB score column */
    IMDB_SCORE: 'imdb_score',
    /** @type {string} Rotten Tomatoes score column */
    RT_SCORE: 'rt_score',
    /** @type {string} User display name column */
    NAME: 'name',
    /** @type {string} Username column */
    USERNAME: 'username',
    /** @type {string} Avatar column */
    AVATAR: 'avatar',
    /** @type {string} User shorthand/initials column */
    SHORTHAND: 'shortHand',
    /** @type {string} Invited user reference column */
    INVITED_USER: 'invited_user',
    /** @type {string} User permission level column */
    USER_PERMISSION: 'user_permission',
    /** @type {string} Failed attendance flag column */
    FAILED: 'failed',
    /** @type {string} Description column */
    DESCRIPTION: 'description',
    /** @type {string} Watch history reference column */
    WATCH_HISTORY: 'watch_history'
};

module.exports = {
    // Export constants
    TABLES,
    COLS,

    /**
     * Format a date string or Date object to a human-readable format.
     * @param {string|Date|null} date - The date to format
     * @returns {string} Formatted date string (e.g., "Jan 01, 2024") or '-' if invalid
     * @example
     * formatDateTime('2024-01-15') // "Jan 15, 2024"
     * formatDateTime(new Date()) // "Feb 05, 2026"
     * formatDateTime(null) // "-"
     */
    formatDateTime: function (date) {
        if (!date) return '-'
        const d = new Date(date)
        if (isNaN(d.getTime())) return '-'
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
        const month = months[d.getMonth()]
        const day = d.getDate().toString().padStart(2, '0')
        const year = d.getFullYear()
        return `${month} ${day}, ${year}`
    },
    /**
     * Helper to get param from various context locations
     * @param {object} context - The pb_hooks context object
     * @param {string} key - The parameter key
     * @returns {string|null} The parameter value or null
     */
    getParam: function (context, key) {
        if (context.params && context.params[key]) return context.params[key]
        if (context.query && context.query[key]) return context.query[key]
        if (typeof context.queryParam === 'function') return context.queryParam(key)
        return null
    },

    /**
     * Helper to safely extract form data from a PocketBase context.
     * Handles both multipart/form-data and JSON bodies (if parsed).
     * @param {object} context - The pb_hooks context object (request/response)
     * @returns {object} Simple key-value object of the form data
     */
    parseFormData: function (context) {
        let data = {}
        try {
            // Try built-in Context.formData() first (multipart/form-data)
            if (typeof context.formData === 'function') {
                const fd = context.formData()
                return fd
            }

            // Try request.formValue if context.request exists (standard net/http wrapper)
            if (context.request && typeof context.request.formValue === 'function') {
                // This is harder to iterate all keys without knowing them.
                // So often we rely on body() if formData() failed.
            }

            // Fallback to body() for JSON payloads
            if (typeof context.body === 'function') {
                const body = context.body()
                if (body) return body
            }
        } catch (e) {
            console.error('[common.js] Error parsing form data:', e)
        }
        return data
    },
    /**
     * Initialize PocketBase client and get authenticated user.
     * @param {object} context - The pb_hooks context object
     * @returns {{client: any, user: any}} Object containing the initialized client and user model (or null)
     */
    init: function (context) {
        const { request } = context
        const client = context.pb({ request })
        const user = client.authStore.model
        return { client, user }
    },

    /**
     * Fetch all watchlists (owned and shared) for a user.
     * @param {any} client - The initialized PocketBase client
     * @param {any} user - The user object
     * @returns {Array<{id: string, title: string, is_private: boolean}>} Array of watchlist objects
     */
    getWatchlists: function (client, user) {
        if (!user) return []

        let lists = []
        try {
            // 1. Owned lists
            let ownedLists = []
            try {
                // Use server-side search to bypass API rules
                const records = $app.findRecordsByFilter(
                    'lists',
                    `owner = '${user.id}' && (is_deleted = false || is_deleted = null)`,
                    '-created'
                )
                ownedLists = records.map(r => ({
                    id: r.id,
                    list_title: r.getString('list_title'),
                    description: r.getString('description'),
                    is_private: r.getBool('is_private'),
                    owner: r.getString('owner'),
                    created: r.getString('created'),
                    updated: r.getString('updated'),
                    is_deleted: r.getBool('is_deleted')
                }))
            } catch (e) {
                console.error('[common.js] Failed to fetch owned lists:', e)
            }

            // 2. Shared lists
            let sharedLists = []
            try {
                const sharedInvites = $app.findRecordsByFilter(
                    'list_user',
                    `invited_user = '${user.id}'`,
                    '-created'
                )
                $app.expandRecords(sharedInvites, ['list'])

                sharedLists = sharedInvites
                    .map((invite) => {
                        const list = invite.expandedOne('list')
                        if (list && !list.getBool('is_deleted')) {
                            return {
                                id: list.id,
                                list_title: list.getString('list_title'),
                                description: list.getString('description'),
                                is_private: list.getBool('is_private'),
                                owner: list.getString('owner'),
                                created: list.getString('created'),
                                updated: list.getString('updated'),
                                is_deleted: list.getBool('is_deleted')
                            }
                        }
                        return null
                    })
                    .filter(Boolean)
            } catch (e) {
                console.error('[common.js] Failed to fetch shared lists:', e)
            }

            // Combine and deduplicate
            const allLists = [...ownedLists, ...sharedLists]
            const seenIds = new Set()

            lists = allLists.filter((list) => {
                if (seenIds.has(list.id)) return false
                seenIds.add(list.id)
                return true
            })
        } catch (e) {
            console.error('[common.js] Failed to load watchlists:', e)
        }
        return lists
    },

    /**
     * Fetch a watchlist by ID and check access permissions.
     * @param {string} listId - The watchlist ID
     * @param {any} user - The user object (or null)
     * @returns {{list: any, hasAccess: boolean, isOwner: boolean, error: string|null}}
     */
    getWatchlistWithAccess: function (listId, user) {
        let list = null
        let hasAccess = false
        let isOwner = false
        let error = null

        try {
            list = $app.findFirstRecordByFilter('lists', `id = '${listId}' && is_deleted != true`)
            if (!list) {
                return { list: null, hasAccess: false, isOwner: false, error: "List not found" }
            }
        } catch (e) {
            return { list: null, hasAccess: false, isOwner: false, error: "List not found" }
        }

        const isPrivate = list.getBool('is_private')
        const owner = list.getString('owner')
        isOwner = (user && owner === user.id)

        // Check access
        if (!isPrivate) {
            hasAccess = true
        } else if (isOwner) {
            hasAccess = true
        } else if (user) {
            try {
                const invite = $app.findFirstRecordByFilter(
                    'list_user',
                    `list = '${list.id}' && invited_user = '${user.id}'`
                )
                if (invite) hasAccess = true
            } catch (ignore) { }
        }

        if (!hasAccess) {
            error = "You do not have permission to view this list."
        }

        return { list, hasAccess, isOwner, error }
    },

    /**
     * Fetch movies for a watchlist.
     * @param {string} listId - The watchlist ID
     * @param {object} options - Fetch options { limit: 20, offset: 0, sort: '-created' }
     * @returns {Array} Array of movie objects with history data
     */
    fetchWatchlistMovies: function (listId, options = {}) {
        const limit = options.limit || 20
        const offset = options.offset || 0
        const sort = options.sort || '-created'

        try {
            const historyRecords = $app.findRecordsByFilter(
                'watched_history',
                `list = '${listId}'`,
                sort,
                limit,
                offset
            )

            $app.expandRecords(historyRecords, ['movie'])

            const results = historyRecords.map((item) => {
                const m = item.expandedOne('movie')
                if (m) {
                    return {
                        id: m.id,
                        tmdb_id: m.getString('tmdb_id'),
                        title: m.getString('title'),
                        release_date: m.getString('release_date'),
                        runtime: m.getInt('runtime'),
                        poster_path: m.getString('poster_path'),
                        backdrop_path: m.getString('backdrop_path'),
                        overview: m.getString('overview'),
                        tagline: m.getString('tagline'),
                        imdb_id: m.getString('imdb_id'),
                        status: m.getString('status'),
                        history_id: item.id,
                        history_created: item.getString('created'),
                        watched_at: item.getString('watched'),
                        tmdb_score: item.getFloat('tmdb_score'),
                        imdb_score: item.getFloat('imdb_score'),
                        rt_score: item.getInt('rt_score'),
                    }
                }
                return null
            }).filter(Boolean)

            // Attach metadata to the array to help with pagination
            results.totalFetched = historyRecords.length
            return results
        } catch (e) {
            console.error('[common.js] Failed to load list items:', e)
            return []
        }
    },

    /**
     * Fetch potential users to invite to a watchlist.
     * @param {string} excludeUserId - User ID to exclude (current user)
     * @param {boolean} isOwner - Whether current user is owner
     * @param {string} listId - The list ID to check for existing invites
     * @returns {Array} Array of users with is_invited flag and current_permission
     */
    fetchPotentialInviteUsers: function (excludeUserId, isOwner, listId) {
        if (!isOwner || !excludeUserId) return []

        try {
            // 1. Fetch potential users
            const users = $app.findRecordsByFilter(
                'users',
                `id != '${excludeUserId}'`,
                'email',
                50,
                0
            )

            // 2. If listId is provided, check who is already added and their permission
            const invitedUserMap = new Map() // userId -> permission
            if (listId) {
                try {
                    const existingInvites = $app.findRecordsByFilter(
                        'list_user',
                        `list = '${listId}'`,
                        '-created',
                        100,
                        0
                    )
                    existingInvites.forEach(invite => {
                        invitedUserMap.set(invite.getString('invited_user'), invite.getString('user_permission'))
                    })
                } catch (ignore) {
                    // Ignore errors if list_user fetch fails
                }
            }

            return users.map(u => ({
                id: u.id,
                email: u.getString('email'),
                is_invited: invitedUserMap.has(u.id),
                current_permission: invitedUserMap.get(u.id) || 'view' // Default to view if not found
            }))
        } catch (e) {
            console.error("[common.js] Failed to fetch users", e)
            return []
        }
    },
    /**
     * Fetch all members of a list (owner + invited users).
     * @param {string} listId - The list ID
     * @param {string} ownerId - The owner's User ID
     * @returns {Array<{id: string, name: string, avatar: string, is_owner: boolean}>}
     */
    fetchListMembers: function (listId, ownerId) {
        const members = []
        const seenIds = new Set()

        // 1. Add Owner
        if (ownerId) {
            try {
                const owner = $app.findRecordById("users", ownerId)
                members.push({
                    id: owner.id,
                    name: owner.getString('name') || owner.getString('username'),
                    avatar: owner.getString('avatar'),
                    is_owner: true
                })
                seenIds.add(ownerId)
            } catch (e) { }
        }

        // 2. Add Invited Users
        try {
            const invites = $app.findRecordsByFilter("list_user", `list = '${listId}'`)
            invites.forEach(invite => {
                const uid = invite.getString('invited_user')
                if (!seenIds.has(uid)) {
                    try {
                        const u = $app.findRecordById("users", uid)
                        members.push({
                            id: u.id,
                            name: u.getString('name') || u.getString('username'),
                            avatar: u.getString('avatar'),
                            is_owner: false
                        })
                        seenIds.add(uid)
                    } catch (e) { }
                }
            })
        } catch (e) { }

        return members
    },

    /**
     * Attach attendance data to movies.
     * @param {Array} movies - Array of movie objects (must have history_id)
     * @param {string} listId - The list ID (for optimization if needed, currently unused as we filter by history IDs)
     */
    attachAttendance: function (movies, listId) {
        if (!movies || movies.length === 0) return

        const historyIds = movies.map(m => m.history_id).filter(Boolean)
        if (historyIds.length === 0) return

        // Construct filter: watch_history = 'id1' || watch_history = 'id2' ...
        const filter = historyIds.map(id => `watch_history = '${id}'`).join(' || ')

        const attendanceMap = {} // history_id -> { user_id: { ... } }

        try {
            const records = $app.findRecordsByFilter("watch_history_user", filter)
            records.forEach(rec => {
                const hid = rec.getString('watch_history')
                const uid = rec.getString('user')

                if (!attendanceMap[hid]) attendanceMap[hid] = {}

                attendanceMap[hid][uid] = {
                    id: rec.id,
                    rating: rec.getFloat('rating'),
                    review: rec.getString('review'),
                    failed: rec.getBool('failed'),
                    created: rec.getString('created')
                }
            })
        } catch (e) {
            console.error('[common.js] Failed to fetch attendance:', e)
        }

        // Attach to movies
        movies.forEach(m => {
            m.attendance = attendanceMap[m.history_id] || {}
        })
    },

    /**
     * Map a PocketBase movie record to a standardized movie object.
     * Creates a consistent movie data structure from raw PocketBase records.
     * @param {any} movieRecord - The expanded movie record from PocketBase
     * @param {any} [historyRecord=null] - Optional history record for additional data like scores
     * @returns {MovieObject|null} Standardized movie object or null if movieRecord is falsy
     * @typedef {Object} MovieObject
     * @property {string} id - PocketBase record ID
     * @property {string} tmdb_id - TMDB movie ID
     * @property {string} title - Movie title
     * @property {string} release_date - Release date string
     * @property {number} runtime - Runtime in minutes
     * @property {string} poster_path - TMDB poster path
     * @property {string} backdrop_path - TMDB backdrop path
     * @property {string} overview - Movie synopsis
     * @property {string} tagline - Movie tagline
     * @property {string} imdb_id - IMDB ID
     * @property {string} status - Movie status
     * @property {string} [history_id] - Watch history record ID (if historyRecord provided)
     * @property {string} [watched_at] - Watch date (if historyRecord provided)
     * @property {number} [tmdb_score] - TMDB score (if historyRecord provided)
     * @property {number} [imdb_score] - IMDB score (if historyRecord provided)
     * @property {number} [rt_score] - Rotten Tomatoes score (if historyRecord provided)
     */
    mapMovieFromRecord: function (movieRecord, historyRecord = null) {
        if (!movieRecord) return null

        const movie = {
            id: movieRecord.id,
            tmdb_id: movieRecord.getString(COLS.TMDB_ID),
            title: movieRecord.getString(COLS.TITLE),
            release_date: movieRecord.getString(COLS.RELEASE_DATE),
            runtime: movieRecord.getInt(COLS.RUNTIME),
            poster_path: movieRecord.getString(COLS.POSTER_PATH),
            backdrop_path: movieRecord.getString(COLS.BACKDROP_PATH),
            overview: movieRecord.getString(COLS.OVERVIEW),
            tagline: movieRecord.getString(COLS.TAGLINE),
            imdb_id: movieRecord.getString(COLS.IMDB_ID),
            status: movieRecord.getString(COLS.STATUS)
        }

        // Add history data if provided
        if (historyRecord) {
            movie.history_id = historyRecord.id
            movie.history_created = historyRecord.getString(COLS.CREATED)
            movie.watched_at = historyRecord.getString(COLS.WATCHED)
            movie.tmdb_score = historyRecord.getFloat(COLS.TMDB_SCORE)
            movie.imdb_score = historyRecord.getFloat(COLS.IMDB_SCORE)
            movie.rt_score = historyRecord.getInt(COLS.RT_SCORE)
        }

        return movie
    },

    /**
     * Get top lists by movie count using the PocketBase query builder.
     * Uses SQL GROUP BY and COUNT for efficient aggregation.
     * @param {number} [limit=3] - Maximum number of top lists to return
     * @returns {Array<TopListObject>} Array of list objects sorted by movie count descending
     * @typedef {Object} TopListObject
     * @property {string} id - List ID
     * @property {string} title - List title
     * @property {number} count - Number of movies in the list
     * @property {string[]} posters - Array of up to 3 poster paths from the list's movies
     * @example
     * const topLists = common.getTopListsByMovieCount(4)
     * // Returns: [{ id: 'abc', title: 'Best Comedies', count: 25, posters: [...] }, ...]
     */
    getTopListsByMovieCount: function (limit = 3) {
        try {
            const listCountResult = arrayOf(new DynamicModel({
                "list": "",
                "count": 0
            }))

            $app.db()
                .select("wh.list", "COUNT(*) as count")
                .from(`${TABLES.WATCHED_HISTORY} wh`)
                .innerJoin(`${TABLES.LISTS} w`, $dbx.exp("w.id = wh.list"))
                .where($dbx.exp("wh.list != ''"))
                .andWhere($dbx.hashExp({ [`w.${COLS.IS_DELETED}`]: false }))
                .andWhere($dbx.hashExp({ [`w.${COLS.IS_PRIVATE}`]: false }))
                .groupBy("wh.list")
                .orderBy("count DESC")
                .limit(limit)
                .all(listCountResult)

            const topLists = []
            for (const row of listCountResult) {
                const listId = row.list
                const count = row.count

                const listRecord = $app.findRecordById(TABLES.LISTS, listId)
                if (!listRecord) continue

                // Get up to 3 movie posters for this list
                const listHistory = $app.findRecordsByFilter(
                    TABLES.WATCHED_HISTORY,
                    `${COLS.LIST} = "${listId}"`,
                    `-${COLS.WATCHED}`,
                    3,
                    0
                )
                $app.expandRecords(listHistory, [COLS.MOVIE])

                const posters = []
                for (const h of listHistory) {
                    const movie = h.expandedOne(COLS.MOVIE)
                    if (movie) {
                        const posterPath = movie.getString(COLS.POSTER_PATH)
                        if (posterPath && !posters.includes(posterPath)) {
                            posters.push(posterPath)
                        }
                    }
                }

                topLists.push({
                    id: listId,
                    title: listRecord.getString(COLS.LIST_TITLE),
                    description: listRecord.getString(COLS.DESCRIPTION),
                    count: count,
                    posters: posters
                })
            }

            return topLists
        } catch (e) {
            console.error('[common.js] Failed to get top lists:', e)
            return []
        }
    },

    /**
     * Get recent unique movies from the watch history.
     * Fetches recent additions and deduplicates by movie ID.
     * @param {number} [limit=6] - Maximum number of unique movies to return
     * @returns {Array<RecentMovieObject>} Array of recent movie objects sorted by watch date
     * @typedef {Object} RecentMovieObject
     * @property {string} id - PocketBase movie record ID
     * @property {string} tmdb_id - TMDB movie ID
     * @property {string} title - Movie title
     * @property {string} poster_path - TMDB poster path
     * @property {string} watched_at - Watch date timestamp
     * @example
     * const recentMovies = common.getRecentMovies(6)
     * // Returns: [{ id: 'abc', tmdb_id: '123', title: 'Movie', poster_path: '/path.jpg', watched_at: '2026-02-01' }, ...]
     */
    getRecentMovies: function (limit = 6) {
        try {
            // Fetch more records than limit to account for duplicates
            const recentHistory = $app.findRecordsByFilter(
                TABLES.WATCHED_HISTORY,
                "",
                `-${COLS.WATCHED}`,
                limit * 4,
                0
            )
            $app.expandRecords(recentHistory, [COLS.MOVIE])

            const seenMovies = new Set()
            const recentMovies = []

            for (const h of recentHistory) {
                const movie = h.expandedOne(COLS.MOVIE)
                if (movie && recentMovies.length < limit && !seenMovies.has(movie.id)) {
                    recentMovies.push({
                        id: movie.id,
                        tmdb_id: movie.getString(COLS.TMDB_ID),
                        title: movie.getString(COLS.TITLE),
                        poster_path: movie.getString(COLS.POSTER_PATH),
                        watched_at: h.getString(COLS.WATCHED)
                    })
                    seenMovies.add(movie.id)
                }
            }

            return recentMovies
        } catch (e) {
            console.error('[common.js] Failed to get recent movies:', e)
            return []
        }
    },

    /**
     * Get recent activity (movie adds and reviews/ratings).
     * Combines recent list additions and user ratings into a single activity feed.
     * @param {number} [limit=4] - Maximum number of activity items to return
     * @returns {Array<ActivityObject>} Array of activity objects sorted by created date
     * @typedef {Object} ActivityObject
     * @property {'add'|'review'|'rating'} type - Type of activity
     * @property {string} created - Creation timestamp
     * @property {string} movieTitle - Title of the movie
     * @property {string} movieId - TMDB ID of the movie
     * @property {string} [listTitle] - List title (for 'add' type)
     * @property {string} [listId] - List ID (for 'add' type)
     * @property {string} [userName] - User's display name (for 'review'/'rating' type)
     * @property {string} [userInitials] - User's initials (for 'review'/'rating' type)
     * @property {number} [rating] - Rating on 0-5 scale (for 'review'/'rating' type)
     * @property {string} [review] - Review text (for 'review' type)
     * @example
     * const activity = common.getRecentActivity(4)
     * // Returns: [{ type: 'add', movieTitle: 'Movie', listTitle: 'List', ... }, ...]
     */
    getRecentActivity: function (limit = 4) {
        const recentActivity = []

        try {
            // Recent movie adds
            const recentAdds = $app.findRecordsByFilter(
                TABLES.WATCHED_HISTORY,
                `${COLS.LIST} != ''`,
                `-${COLS.CREATED}`,
                limit,
                0
            )
            $app.expandRecords(recentAdds, [COLS.MOVIE, COLS.LIST])

            for (const r of recentAdds) {
                const movie = r.expandedOne(COLS.MOVIE)
                const list = r.expandedOne(COLS.LIST)
                if (movie && list && !list.getBool(COLS.IS_DELETED) && !list.getBool(COLS.IS_PRIVATE)) {
                    recentActivity.push({
                        type: 'add',
                        created: r.getString(COLS.CREATED),
                        movieTitle: movie.getString(COLS.TITLE),
                        movieId: movie.getString(COLS.TMDB_ID),
                        listTitle: list.getString(COLS.LIST_TITLE),
                        listId: list.id
                    })
                }
            }
        } catch (e) {
            console.error('[common.js] Failed to get recent adds:', e)
        }

        try {
            // Recent reviews
            const recentReviews = $app.findRecordsByFilter(
                TABLES.WATCH_HISTORY_USER,
                `${COLS.REVIEW} != '' || ${COLS.RATING} > 0`,
                `-${COLS.CREATED}`,
                limit,
                0
            )
            $app.expandRecords(recentReviews, [COLS.USER, COLS.WATCH_HISTORY])

            for (const r of recentReviews) {
                const user = r.expandedOne(COLS.USER)
                const watchHistory = r.expandedOne(COLS.WATCH_HISTORY)
                if (user && watchHistory) {
                    $app.expandRecords([watchHistory], [COLS.MOVIE])
                    const movie = watchHistory.expandedOne(COLS.MOVIE)
                    if (movie) {
                        const rating = r.getFloat(COLS.RATING)
                        const review = r.getString(COLS.REVIEW)
                        recentActivity.push({
                            type: review ? 'review' : 'rating',
                            created: r.getString(COLS.CREATED),
                            userName: user.getString(COLS.NAME) || user.getString(COLS.USERNAME) || 'User',
                            userInitials: (user.getString(COLS.SHORTHAND) || user.getString(COLS.NAME) || 'U').substring(0, 2).toUpperCase(),
                            movieTitle: movie.getString(COLS.TITLE),
                            movieId: movie.getString(COLS.TMDB_ID),
                            rating: Math.round(rating) / 2,
                            review: review
                        })
                    }
                }
            }
        } catch (e) {
            console.error('[common.js] Failed to get recent reviews:', e)
        }

        // Sort by created date and take top items
        recentActivity.sort((a, b) => new Date(b.created) - new Date(a.created))
        return recentActivity.slice(0, limit)
    }
}
