/**
 * @type {import('pocketpages').PageDataLoaderFunc}
 */
module.exports = function (context) {
    const { request } = context
    const user = context.request.auth

    // TMDB API helper functions (inlined to avoid module resolution issues)
    const TMDB_API_KEY = ($os.getenv('TMDB_API_KEY') || process.env.TMDB_API_KEY || '').trim()

    const TMDB_BASE_URL = 'https://api.themoviedb.org/3'

    function fetchTMDB(endpoint, queryParams = {}) {
        if (!TMDB_API_KEY) {
            throw new Error('TMDB_API_KEY is not set')
        }

        // Build query string manually (URLSearchParams not available in JSVM)
        const params = Object.assign({}, queryParams, { api_key: TMDB_API_KEY })
        const queryString = Object.keys(params)
            .map(
                (key) =>
                    encodeURIComponent(key) +
                    '=' +
                    encodeURIComponent(params[key])
            )
            .join('&')

        const url = `${TMDB_BASE_URL}${endpoint}?${queryString}`

        const res = $http.send({
            url: url,
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
        })

        if (res.statusCode >= 400) {
            throw new Error(`TMDB API Error: ${res.statusCode}`)
        }

        return res.json
    }

    function searchMovies(query, page = 1) {
        return fetchTMDB('/search/movie', { query, page })
    }

    function getMovie(id) {
        return fetchTMDB(`/movie/${id}`)
    }

    const watchlistId = context?.params?.watchlistId || ''
    const q = context?.params?.q || ''

    let results = []
    let lists = []
    let message = null
    let error = null

    // Fetch user's watchlists if logged in
    if (user) {
        try {
            // 1. Owned lists
            const ownedLists = $app.findRecordsByFilter(
                'lists',
                `owner = '${user.id}'`,
                '-created'
            )

            // 2. Shared lists (via list_user)
            const sharedInvites = $app.findRecordsByFilter(
                'list_user',
                `invited_user = '${user.id}'`,
                '-created',
                100,
                0,
                { expand: 'list' }
            )

            const sharedLists = sharedInvites.map(invite => invite.expandedOne('list')).filter(Boolean)

            // Combine and deduplicate
            // Use Array.from() to safely convert Go slices to JS arrays avoid Goja panics on spread
            const allLists = Array.from(ownedLists).concat(sharedLists)
            const seenIds = new Set()

            lists = allLists.filter(list => {
                if (seenIds.has(list.id)) return false
                seenIds.add(list.id)
                return true
            }).map(list => ({
                id: list.id,
                title: list.getString('list_title'),
                is_private: list.getBool('is_private')
            }))

        } catch (e) {
            console.error('Failed to load user lists:', e)
        }
    }

    // Handle POST request - add movie to watchlist
    if (request.method === 'POST') {
        let tmdbId = ''
        let targetListId = ''

        try {
            // Use request.formValue() which is the standard way to get form values in PB JSVM (wrapping Echo)
            tmdbId = request.formValue('tmdb_id')
            targetListId = request.formValue('watchlist_id')

            // Fallback for JSON body if needed (though form submission matches formValue)
            if (!tmdbId && context.formData) {
                tmdbId = context.formData.tmdb_id
                targetListId = context.formData.watchlist_id
            }
        } catch (err) {
            $app.logger().error('Error parsing form data:', err)
        }

        $app.logger().info(`[ADD_MOVIE] Extracted values: tmdb_id=${tmdbId}, watchlist_id=${targetListId}`)

        targetListId = targetListId || ''

        if (user && tmdbId) {
            try {
                // Get movie details from TMDB
                const movieData = getMovie(tmdbId)
                $app.logger().info(`[ADD_MOVIE] TMDB Data: ${JSON.stringify(movieData).slice(0, 100)}`)

                // Check if movie already exists in our database
                let movie
                try {
                    $app.logger().info(`[ADD_MOVIE] Searching for existing movie with tmdb_id: ${tmdbId}`)
                    movie = $app.findFirstRecordByFilter(
                        'movies',
                        `tmdb_id = "${tmdbId}"`
                    )
                    $app.logger().info(`[ADD_MOVIE] Found existing movie: ${movie.id}`)
                } catch (e) {
                    $app.logger().info('[ADD_MOVIE] Movie not found, creating new record...')
                    // Movie doesn't exist, create it
                    const moviesCollection =
                        $app.findCollectionByNameOrId('movies')
                    movie = new Record(moviesCollection)
                    movie.set('tmdb_id', tmdbId) // kept as string as per schema
                    movie.set('title', movieData.title)
                    movie.set('overview', movieData.overview || '')
                    movie.set('poster_path', movieData.poster_path || '')
                    movie.set('release_date', movieData.release_date || '')
                    // movie.set('vote_average', movieData.vote_average || 0) // Field not in movies schema
                    $app.save(movie)
                }

                // Verify List Access or Get Default
                let actualListId = targetListId;

                if (!actualListId) {
                    // Default List logic: Find or Create "Watchlist"
                    try {
                        const defaultList = $app.findFirstRecordByFilter(
                            'lists',
                            `owner = '${user.id}' && list_title = 'Watchlist'`
                        );
                        actualListId = defaultList.id;
                    } catch (e) {
                        // Not found, create it
                        const listsCollection = $app.findCollectionByNameOrId('lists');
                        const defaultList = new Record(listsCollection);
                        defaultList.set('owner', user.id);
                        defaultList.set('list_title', 'Watchlist');
                        defaultList.set('is_private', false); // Default to private
                        $app.save(defaultList);
                        actualListId = defaultList.id;
                    }
                } else {
                    // Check if user owns or is invited to this list
                    let hasAccess = false
                    try {
                        const targetList = $app.findRecordById('lists', actualListId)
                        if (targetList.getString('owner') === user.id) {
                            hasAccess = true
                        } else {
                            // Check invite
                            const invite = $app.findFirstRecordByFilter(
                                'list_user',
                                `list = '${actualListId}' && invited_user = '${user.id}'`
                            )
                            if (invite) hasAccess = true
                        }
                    } catch (e) {
                        throw new Error("Watchlist not found.")
                    }

                    if (!hasAccess) {
                        throw new Error("You do not have permission to add to this watchlist.")
                    }
                }

                // Add to user's watched_history
                // Check if already in THIS specific list
                try {
                    const filter = `movie = '${movie.id}' && list = '${actualListId}'`
                    // $app.logger().info('Checking watched_history with filter:', filter)

                    $app.findFirstRecordByFilter('watched_history', filter)

                    message = `"${movieData.title}" is already in that watchlist!`
                    $app.logger().info('[ADD_MOVIE] Movie already in watchlist')
                } catch (e) {
                    // Not found, so add it
                    const watchedCollection = $app.findCollectionByNameOrId('watched_history')
                    const watchEntry = new Record(watchedCollection)
                    watchEntry.set('movie', movie.id)
                    watchEntry.set('list', actualListId)
                    if (movieData.vote_average) {
                        watchEntry.set('tmdb_score', movieData.vote_average)
                    }
                    $app.save(watchEntry)
                    $app.logger().info(`[ADD_MOVIE] Successfully saved to watched_history: ${watchEntry.id}`)
                    message = `"${movieData.title}" added to watchlist!`
                }
            } catch (e) {
                $app.logger().error('[ADD_MOVIE] Error adding movie:', e)
                error = 'Failed to add movie: ' + e.message
            }
        } else if (!user) {
            error = 'You must be logged in to add movies to your watchlist.'
        } else {
            $app.logger().warn(`[ADD_MOVIE] Skipped: user=${!!user} tmdbId=${tmdbId}`)
        }
    }

    // Perform search if query is provided
    if (q && q.trim().length > 0) {
        try {
            const searchData = searchMovies(q.trim())
            results = searchData.results || []
        } catch (e) {
            error = 'Search failed: ' + e.message
        }
    }

    return {
        results,
        q,
        message,
        error,
        user,
        lists,
    }
}
