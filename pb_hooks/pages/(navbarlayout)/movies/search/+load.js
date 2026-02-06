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
    const watchlistActions = require('../../../../lib/watchlist-actions.js')
    const { TABLES, COLS } = common

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
                const result = watchlistActions.addMovieToWatchlist(user, tmdbId, targetListId)
                message = result.message || `Movie added to watchlist!`

                // PRG: Redirect to prevent double submission
                const redirectUrl = `/movies/search?q=${encodeURIComponent(q)}&message=${encodeURIComponent(message)}`
                return context.redirect(redirectUrl)

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
