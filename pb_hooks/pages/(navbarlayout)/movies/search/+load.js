/**
 * Loader for the movie search page.
 * Handles search queries, watchlist management, and adding movies to watchlists.
 * @type {import('pocketpages').PageDataLoaderFunc}
 * @returns {{
 *   results: Object[],
 *   q: string,
 *   message: string|null,
 *   error: string|null,
 *   user: import('../../../../lib/pocketbase-types').UsersResponse|null,
 *   lists: Array<{id: string, list_title: string, is_private: boolean}>
 * }}
 */
module.exports = function (context) {
    const { request } = context
    const tmdb = require('../../../../lib/tmdb.js')
    const common = require('../../../../lib/common.js')

    // Initialize using common (gets client and user)
    const { client, user } = common.init(context)

    const q = context?.params?.q || ''

    // Debug logging
    console.log('[Search Debug] Params:', JSON.stringify(context?.params))
    console.log('[Search Debug] Query:', JSON.stringify(context?.query))

    // Check where 'page' is located
    const pageParam = context?.params?.page || context?.query?.page
    const page = parseInt(pageParam) || 1

    console.log('[Search Debug] Extracted Page:', page)

    let results = []
    let totalPages = 1
    let lists = []
    let message = context.query?.message || null
    let error = null

    // Fetch user's watchlists if logged in
    if (user) {
        lists = common.getWatchlists(client, user)
    }

    // Handle POST request - add movie to watchlist
    if (request.method === 'POST') {
        let tmdbId = ''
        let targetListId = ''

        // form extraction
        try {
            const fd = common.parseFormData(context)
            // Handle both map-like (get) and object-like access
            if (typeof fd.get === 'function') {
                tmdbId = fd.get('tmdb_id')
                targetListId = fd.get('watchlist_id')
            } else {
                tmdbId = fd.tmdb_id
                targetListId = fd.watchlist_id
            }
        } catch (err) {
            $app.logger().error('Error processing form data:', err)
        }

        // $app.logger().info(`[ADD_MOVIE] Extracted values: tmdb_id=${tmdbId}, watchlist_id=${targetListId}`)

        targetListId = targetListId || ''

        if (user && tmdbId) {
            try {
                // Get movie details from TMDB
                const movieData = tmdb.getMovie(tmdbId)

                // 1. Find or Create Movie
                let movie = null
                try {
                    movie = client.collection('movies').getFirstListItem(`tmdb_id = "${tmdbId}"`)
                } catch (e) {
                    // Not found, continue to create
                }

                if (!movie) {
                    try {
                        const moviePayload = {
                            tmdb_id: tmdbId,
                            title: movieData.title || 'Unknown',
                            imdb_id: String(movieData.imdb_id || ''),
                            original_title: String(movieData.original_title || ''),
                            original_language: String(movieData.original_language || 'en'),
                            status: String(movieData.status || 'Released'),
                            overview: String(movieData.overview || ''),
                            tagline: String(movieData.tagline || ''),
                            poster_path: String(movieData.poster_path || ''),
                            backdrop_path: String(movieData.backdrop_path || ''),
                            homepage: String(movieData.homepage || ''),
                            runtime: parseInt(movieData.runtime) || 0,
                            adult: !!movieData.adult,
                            release_date: movieData.release_date || undefined
                        }

                        // Create movie using SDK
                        movie = client.collection('movies').create(moviePayload)
                    } catch (createError) {
                        $app.logger().error('[ADD_MOVIE] Creation failed:', createError)
                        throw new Error(`Failed to save movie: ${createError.message}`)
                    }
                }

                // 2. Verify List Access
                let actualListId = targetListId
                if (!actualListId) {
                    // Default List logic: Find or Create "Watchlist"
                    try {
                        const defaultList = client.collection('lists').getFirstListItem(`owner = '${user.id}' && list_title = 'Watchlist'`)
                        actualListId = defaultList.id
                    } catch (e) {
                        // Not found, create it
                        try {
                            const params = {
                                owner: user.id,
                                list_title: 'Watchlist',
                                is_private: false // Default to private
                            }
                            const defaultList = client.collection('lists').create(params)
                            actualListId = defaultList.id
                        } catch (createListError) {
                            throw new Error("Failed to create default watchlist")
                        }
                    }
                } else {
                    // Check access by trying to fetch the list with the user context
                    // The API Rule for 'view' will enforce we only get it if we have access (owned or shared)
                    try {
                        const targetList = client.collection('lists').getOne(actualListId)
                        // If we are here, we have access.
                    } catch (e) {
                        throw new Error("List not found or access denied")
                    }
                }

                // 3. Add to Watched History
                try {
                    const filter = `movie = '${movie.id}' && list = '${actualListId}'`
                    try {
                        // Check if already exists
                        client.collection('watched_history').getFirstListItem(filter)

                        message = `"${movieData.title}" is already in that watchlist!`
                    } catch (e) {
                        // Not found, so add it
                        const watchPayload = {
                            movie: movie.id,
                            list: actualListId,
                            watched: new Date().toISOString()
                        }
                        if (movieData.vote_average) {
                            watchPayload.tmdb_score = movieData.vote_average
                        }

                        const watchEntry = client.collection('watched_history').create(watchPayload)
                        message = `"${movieData.title}" added to watchlist!`
                    }

                    // PRG: Redirect to prevent double submission
                    const redirectUrl = `/movies/search?q=${encodeURIComponent(q)}&message=${encodeURIComponent(message)}`
                    return context.redirect(redirectUrl)

                } catch (err) {
                    $app.logger().error('[ADD_MOVIE] Failed to add to watched_history:', err)
                    if (err.data) {
                        $app.logger().error('[ADD_MOVIE] Watched history validation errors:', JSON.stringify(err.data))
                    }
                    throw new Error("Failed to add to watchlist.")
                }
            } catch (e) {
                // Global error for this flow
                $app.logger().error('[ADD_MOVIE] Process failed:', e)
                error = e.message
            }
        } else if (!user) {
            error = 'You must be logged in to add movies to your watchlist.'
        } else {
            // $app.logger().warn(`[ADD_MOVIE] Skipped: user=${!!user} tmdbId=${tmdbId}`)
        }
    }

    // Perform search if query is provided
    if (q && String(q).trim().length > 0) {
        try {
            const searchData = tmdb.searchMovies(String(q).trim(), page)
            results = searchData.results || []
            totalPages = searchData.total_pages || 1
        } catch (e) {
            error = 'Search failed: ' + e.message
        }
    }

    return {
        results,
        q,
        currentPage: page,
        totalPages,
        message,
        error,
        user,
        lists,
    }
}
