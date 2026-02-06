/**
 * API Endpoint: POST /api/watchlists/add
 * Adds a movie to a watchlist.
 * Expects JSON or FormData: { tmdb_id, watchlist_id }
 */
const common = require('../../../../lib/common.js')
const watchlistActions = require('../../../../lib/watchlist-actions.js')

module.exports = function (context) {
    console.log('[api/add] Request method:', context.request.method)
    const { user } = common.init(context)
    console.log('[api/add] User:', user ? user.id : 'null')

    if (context.request.method !== 'POST') {
        console.log('[api/add] Method not allowed')
        return { success: false, error: "Method not allowed" }
    }

    if (!user) {
        console.log('[api/add] No user authenticated')
        return { success: false, error: "Authentication required" }
    }

    try {
        const data = common.parseFormData(context)
        console.log('[api/add] Parsed data:', JSON.stringify(data))

        let tmdbId = '', watchlistId = ''

        // Handle map-like access if needed (though common.parseFormData usually returns object or map)
        if (typeof data.get === 'function') {
            tmdbId = data.get('tmdb_id')
            watchlistId = data.get('watchlist_id')
        } else {
            tmdbId = data.tmdb_id
            watchlistId = data.watchlist_id
        }

        console.log('[api/add] tmdbId:', tmdbId, 'watchlistId:', watchlistId)

        if (!tmdbId) {
            console.log('[api/add] Missing movie ID')
            return { success: false, error: "Movie ID is required" }
        }

        const result = watchlistActions.addMovieToWatchlist(user, tmdbId, watchlistId)
        console.log('[api/add] Result:', JSON.stringify(result))

        return {
            success: true,
            message: result.message || "Added to watchlist"
        }

    } catch (e) {
        console.log('[api/add] Error:', e.message)
        return { success: false, error: e.message }
    }
}
