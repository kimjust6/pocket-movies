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
                ownedLists = client.collection('lists').getFullList({
                    filter: `owner = '${user.id}' && (is_deleted = false || is_deleted = null)`,
                    sort: '-created',
                })
            } catch (e) {
                // Ignore error
            }

            // 2. Shared lists
            let sharedLists = []
            try {
                const sharedInvites = client.collection('list_user').getFullList({
                    filter: `invited_user = '${user.id}'`,
                    sort: '-created',
                    expand: 'list',
                })

                sharedLists = sharedInvites
                    .map((invite) => invite.expand?.list)
                    .filter(list => list && !list.is_deleted)
            } catch (e) {
                // Ignore error
            }

            // Combine and deduplicate
            const allLists = [...ownedLists, ...sharedLists]
            const seenIds = new Set()

            lists = allLists
                .filter((list) => {
                    if (seenIds.has(list.id)) return false
                    seenIds.add(list.id)
                    return true
                })
                .map((list) => ({
                    id: list.id,
                    list_title: list.list_title,
                    description: list.description,
                    is_private: list.is_private,
                    owner: list.owner,
                    created: list.created,
                    updated: list.updated,
                    is_deleted: list.is_deleted
                }))
        } catch (e) {
            console.error('[common.js] Failed to load watchlists:', e)
        }
        return lists
    }
}
