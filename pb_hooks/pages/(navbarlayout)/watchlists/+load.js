/**
 * @type {import('pocketpages').PageDataLoaderFunc}
 */
module.exports = function (api) {
    const user = api.request.auth?.id
    if (!user) {
        return {
            movies: [],
            lists: [],
        }
    }

    if (api.request.method === 'POST') {
        const data = api.formData
        const action = data.action

        if (action === 'delete') {
            const watchlistId = data.watchlist_id
            if (watchlistId) {
                try {
                    const record = $app.findRecordById('watchlist', watchlistId)
                    if (record.getString('user') === user) {
                        $app.delete(record)
                    }
                } catch (e) {
                    // Ignore if not found or other error for now
                }
            }
        }

        if (action === 'create_watchlist') {
            const watchlistName = data.watchlist_name
            if (watchlistName) {
                try {
                    const listsCollection = $app.findCollectionByNameOrId("lists")
                    const record = new Record(listsCollection)
                    record.set("list_title", watchlistName)
                    record.set("owner", user)
                    $app.save(record)

                    // Fetch lists after creating
                    const lists = $app.findRecordsByFilter(
                        'lists',
                        `owner = '${user}'`,
                        '-created',
                        50,
                        0
                    ).map((list) => ({
                        id: list.id,
                        list_title: list.getString('list_title'),
                        created: list.getString('created'),
                    }))

                    return {
                        movies: [],
                        lists,
                        message: "Watchlist created successfully!",
                        showMessage: true
                    }
                } catch (e) {
                    return {
                        movies: [],
                        lists: [],
                        error: e.message
                    }
                }
            }
        }
    }

    const result = {
        movies: [],
        lists: [],
    }

    // 1. Try to fetch movies from 'watchlist' collection
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

    // 2. Try to fetch custom lists from 'lists' collection
    try {
        const listRecords = $app.findRecordsByFilter(
            'lists',
            `owner = '${user}'`,
            '-created',
            50,
            0
        )

        result.lists = listRecords.map((list) => ({
            id: list.id,
            list_title: list.getString('list_title'),
            created: list.getString('created'),
        }))
    } catch (e) {
        console.error('Failed to load custom lists (collection "lists"):', e)
        // Keep result.lists as []
    }

    return result
}

