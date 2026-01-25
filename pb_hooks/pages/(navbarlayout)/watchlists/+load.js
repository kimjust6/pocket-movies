/**
 * Loader for the watchlists index page.
 * Handles display of user's watchlists and public lists.
 * @type {import('pocketpages').PageDataLoaderFunc}
 * @returns {{
 *   movies: import('../../../lib/pocketbase-types').MoviesResponse[],
 *   lists: import('../../../lib/pocketbase-types').ListsResponse[],
 *   user: string
 * }}
 */
module.exports = function (api) {
    const user = api.request.auth?.id

    // Only allow modifications if logged in
    // Only allow modifications if logged in

    if (user && api.request.method === 'POST') {
        let data = {}
        try {
            if (typeof api.formData === 'function') {
                data = api.formData()
            } else if (typeof api.body === 'function') {
                data = api.body()
            } else {
                data = api.formData || api.body || {}
            }
        } catch (e) {
            console.error('Error parsing form data:', e)
        }

        console.log('Processed Data:', JSON.stringify(data))
        const action = data?.action

        if (action === 'delete') {
            const watchlistId = data.watchlist_id
            if (watchlistId) {
                try {
                    const record = $app.findRecordById('lists', watchlistId) // Correct collection name 'lists' not 'watchlist'
                    if (record.getString('owner') === user) {
                        $app.delete(record)
                        return api.redirect('/watchlists?message=Watchlist+deleted+successfully')
                    }
                } catch (e) {
                    // Ignore if not found
                }
            }
        }

        if (action === 'create_watchlist') {
            const watchlistName = data.watchlist_name
            if (watchlistName) {
                try {
                    const listsCollection = $app.findCollectionByNameOrId("lists")
                    if (!listsCollection) {
                        throw new Error("Lists collection not found")
                    }

                    const record = new Record(listsCollection)
                    record.set("list_title", watchlistName)
                    record.set("owner", user)

                    if (data.description) {
                        record.set("description", data.description)
                    }

                    // Validate before saving if possible, or just save
                    $app.save(record)

                    return api.redirect('/watchlists?message=Watchlist+created+successfully')

                } catch (e) {
                    console.error("Error creating watchlist:", e)
                    // If error, we might want to return it to show in UI,
                    // but for consistency let's redirect with error param or fallback
                    // ideally we pass error in query but it's ugly.
                    // Let's just fall through to GET and maybe show error?
                    // But falling through allows re-submit.
                    // For now, let's fall through so the user can see the error in the modal (if we supported it).
                    // Actually, the previous code returned an object with 'error'.
                    return {
                        movies: [],
                        lists: [],
                        error: e.message || "Failed to create watchlist"
                    }
                }
            }
        }
    }

    const result = {
        movies: [],
        lists: [],
        message: api.query?.message || null
    }

    // 1. Try to fetch movies from 'watchlist' collection (only if logged in)
    if (user) {
        try {
            const watchlistRecords = $app.findRecordsByFilter(
                'watchlist',
                `user = '${user}'`,
                '-created',
                50,
                0,
                { expand: 'movie' }
            )

            result.movies = watchlistRecords
                .map((item) => {
                    const m = item.expandedOne('movie')
                    if (m) {
                        return {
                            id: m.id,
                            tmdb_id: m.getString('tmdb_id'),
                            title: m.getString('title'),
                            release_date: m.getString('release_date'),
                            poster_path: m.getString('poster_path'),
                            overview: m.getString('overview'),
                            watchlist_id: item.id,
                        }
                    }
                    return null
                })
                .filter(Boolean)
        } catch (e) {
            console.error('Failed to load watchlist movies (collection "watchlist"):', e)
            // Keep result.movies as []
        }
    }

    // 2. Try to fetch custom lists from 'lists' collection
    try {
        let listRecords = []

        if (user) {
            // A. Fetch OWNED lists
            const ownedLists = $app.findRecordsByFilter(
                'lists',
                `owner = '${user}' && is_deleted != true`,
                '-created',
                50,
                0
            )

            // B. Fetch SHARED lists (where I am invited)
            // 1. Get list_user records
            const sharedReferences = $app.findRecordsByFilter(
                'list_user',
                `invited_user = '${user}'`,
                '-created',
                50,
                0
            )

            // 2. Extract unique List IDs
            const sharedListIds = sharedReferences.map(ref => ref.getString('list')).filter(Boolean)

            // 3. Fetch the actual List records if we have any IDs
            let sharedLists = []
            if (sharedListIds.length > 0) {
                // Build a filter string like: id='id1' || id='id2' ...
                // Add check that they are not deleted
                const idFilter = '(' + sharedListIds.map(id => `id='${id}'`).join(' || ') + ')'
                sharedLists = $app.findRecordsByFilter(
                    'lists',
                    `${idFilter} && is_deleted != true`,
                    '-created',
                    50,
                    0
                )
            }

            // Combine and deduplicate (by ID) just in case
            const allLists = [...ownedLists, ...sharedLists]
            const seenIds = new Set()
            listRecords = allLists.filter(list => {
                if (seenIds.has(list.id)) return false
                seenIds.add(list.id)
                return true
            })

        } else {
            // NOT logged in: Fetch PUBLIC lists
            listRecords = $app.findRecordsByFilter(
                'lists',
                'is_private = false && is_deleted != true',
                '-created',
                50,
                0
            )
        }

        result.lists = listRecords.map((list) => ({
            id: list.id,
            list_title: list.getString('list_title'),
            description: list.getString('description'),
            created: list.getString('created'),
            is_owner: list.getString('owner') === user // Helper for UI if needed
        }))
    } catch (e) {
        console.error('Failed to load custom lists (collection "lists"):', e)
        // Keep result.lists as []
    }

    return {
        ...result,
        user
    }
}

