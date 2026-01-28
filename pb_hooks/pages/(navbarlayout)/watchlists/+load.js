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
module.exports = function (context) {
    const common = require('../../../lib/common.js')
    const { client, user } = common.init(context)
    const userId = user?.id

    // Only allow modifications if logged in
    if (userId && context.request.method === 'POST') {
        let data = common.parseFormData(context)
        // Compatibility: handle map-like access
        if (typeof data.get === 'function') {
            const fd = data
            data = {}
            fd.forEach((v, k) => { data[k] = v })
        }

        console.log('Processed Data:', JSON.stringify(data))
        const action = data?.action

        if (action === 'delete') {
            const watchlistId = data.watchlist_id
            if (watchlistId) {
                try {
                    const record = client.collection('lists').getOne(watchlistId)
                    if (record.owner === userId) {
                        client.collection('lists').delete(watchlistId)
                        return context.redirect('/watchlists?message=Watchlist+deleted+successfully')
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
                    const record = {
                        list_title: watchlistName,
                        owner: userId,
                        description: data.description || ''
                    }

                    client.collection('lists').create(record)

                    return context.redirect('/watchlists?message=Watchlist+created+successfully')

                } catch (e) {
                    console.error("Error creating watchlist:", e)
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
        message: context.query?.message || null
    }

    // 1. Try to fetch movies from 'watchlist' collection (only if logged in)
    if (userId) {
        try {
            // NOTE: sticking to legacy $app for 'watchlist' collection if it's special or just direct DB access?
            // If 'watchlist' is a view or collection, we can use SDK too ideally.
            // But let's keep existing logic if it works, just swapping $app where easy.
            // Actually 'watchlist' collection seems to be a view or regular collection.
            // Let's use SDK for consistency if possible, but finding records with filter and expand is same.

            const watchlistRecords = client.collection('watchlist').getList(1, 50, {
                filter: `user = '${userId}'`,
                sort: '-created',
                expand: 'movie'
            })

            result.movies = watchlistRecords.items
                .map((item) => {
                    const m = item.expand?.movie
                    if (m) {
                        return {
                            id: m.id,
                            tmdb_id: m.tmdb_id,
                            title: m.title,
                            release_date: m.release_date,
                            poster_path: m.poster_path,
                            overview: m.overview,
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

        if (userId) {
            // Use common function
            const allLists = common.getWatchlists(client, user)

            // Map to required format (adding is_owner)
            listRecords = allLists.map(list => ({
                id: list.id,
                list_title: list.list_title,
                description: list.description,
                created: list.created,
                is_owner: list.owner === userId
            }))

        } else {
            // NOT logged in: Fetch PUBLIC lists
            // We can use SDK here too
            const publicLists = client.collection('lists').getList(1, 50, {
                filter: 'is_private = false && (is_deleted = false || is_deleted = null)',
                sort: '-created'
            })

            listRecords = publicLists.items.map((list) => ({
                id: list.id,
                list_title: list.list_title,
                description: list.description,
                created: list.created,
                is_owner: false
            }))
        }

        result.lists = listRecords
    } catch (e) {
        console.error('Failed to load custom lists (collection "lists"):', e)
        // Keep result.lists as []
    }

    return {
        ...result,
        user: userId,
        formatDateTime: common.formatDateTime
    }
}

