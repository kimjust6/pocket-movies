/**
 * @type {import('pocketpages').PageDataLoaderFunc}
 */
module.exports = function (api) {
    const user = api.request.auth?.id
    if (!user) {
        return {
            list: null,
            movies: [],
            error: "You must be logged in to view this list."
        }
    }



    // Attempt to get ID from params (likely merged path and query params)
    const listId = api.params?.id || api.pathParams?.id

    if (!listId) {
        return {
            list: null,
            movies: [],
            error: "List ID is missing."
        }
    }

    // 1. Fetch the list details
    let list
    try {
        list = $app.findRecordById('lists', listId)

        // Check ownership (optional, depending on requirements, assuming private lists for now)
        if (list.getString('owner') !== user) {
            return {
                list: null,
                movies: [],
                error: "You do not have permission to view this list."
            }
        }
    } catch (e) {
        return {
            list: null,
            movies: [],
            error: "List not found."
        }
    }

    // 2. Fetch movies in this list from watched_history
    try {
        const historyRecords = $app.findRecordsByFilter(
            'watched_history',
            `list = '${listId}'`,
            '-created',
            100, // Reasonable limit
            0,
            { expand: 'movie' }
        )

        const movies = historyRecords.map((item) => {
            const m = item.expandedOne('movie')
            if (m) {
                return {
                    id: m.id,
                    tmdb_id: m.getString('tmdb_id'),
                    title: m.getString('title'),
                    release_date: m.getString('release_date'),
                    poster_path: m.getString('poster_path'),
                    overview: m.getString('overview'),
                    history_id: item.id,
                }
            }
            return null
        }).filter(Boolean)

        return {
            list: {
                id: list.id,
                title: list.getString('list_title'),
                created: list.getString('created'),
            },
            movies,
        }

    } catch (e) {
        console.error('Failed to load list items:', e)
        return {
            list: {
                id: list.id,
                title: list.getString('list_title'),
                created: list.getString('created'),
            },
            movies: [],
            error: "Failed to load movies for this list."
        }
    }
}
