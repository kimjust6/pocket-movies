/**
 * @type {import('pocketpages').PageDataLoaderFunc}
 */
module.exports = function (api) {
    const user = api.request.auth?.id

    // NOTE: Removed early return check for user. Authentication is checked per list below.




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

        const isPrivate = list.getBool('is_private')
        const owner = list.getString('owner')

        let hasAccess = false

        // 1. Public list -> Access granted
        if (!isPrivate) {
            hasAccess = true
        }
        // 2. Owner -> Access granted
        else if (user && owner === user) {
            hasAccess = true
        }
        // 3. Shared User -> Access granted
        else if (user) {
            try {
                // Check if there is a record in 'list_user' for this list and user
                const invite = $app.findFirstRecordByFilter(
                    'list_user',
                    `list = '${list.id}' && invited_user = '${user}'`
                )
                if (invite) {
                    hasAccess = true
                }
            } catch (ignore) {
                // No invite found
            }
        }

        if (!hasAccess) {
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
