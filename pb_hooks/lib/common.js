module.exports = {
    formatDateTime: function (date) {
        if (!date) return '-'
        // Ensure we have a Date object
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

            return historyRecords.map((item) => {
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
    }
}
