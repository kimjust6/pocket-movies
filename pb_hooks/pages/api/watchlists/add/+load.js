/**
 * API Endpoint: POST /api/watchlists/add
 * Adds a movie to a watchlist.
 * Expects JSON or FormData: { tmdb_id, watchlist_id }
 */
const common = require('../../../../lib/common.js')
const watchlistActions = require('../../../../lib/watchlist-actions.js')

module.exports = function (context) {
    const { user } = common.init(context)

    if (context.request.method !== 'POST') {
        return { success: false, error: "Method not allowed" }
    }

    if (!user) {
        return { success: false, error: "Authentication required" }
    }

    try {
        const data = common.parseFormData(context)

        let tmdbId = '', watchlistId = ''

        // Handle map-like access if needed
        if (typeof data.get === 'function') {
            tmdbId = data.get('tmdb_id')
            watchlistId = data.get('watchlist_id')
        } else {
            tmdbId = data.tmdb_id
            watchlistId = data.watchlist_id
        }

        if (!tmdbId) {
            return { success: false, error: "Movie ID is required" }
        }

        const result = watchlistActions.addMovieToWatchlist(user, tmdbId, watchlistId)

        return {
            success: true,
            message: result.message || "Added to watchlist"
        }

    } catch (e) {
        return { success: false, error: e.message }
    }
}
