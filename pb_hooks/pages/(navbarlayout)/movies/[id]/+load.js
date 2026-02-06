/**
 * Loader for the movie detail page.
 * Fetches movie details and credits from TMDB.
 * @type {import('pocketpages').PageDataLoaderFunc}
 * @returns {{
 *   movie: Object|null,
 *   credits: Object|null,
 *   user: import('../../../../lib/pocketbase-types').UsersResponse|null,
 *   lists: Array<{id: string, list_title: string, is_private: boolean}>,
 *   error?: string
 * }}
 */
module.exports = function (context) {
    const tmdb = require('../../../../lib/tmdb.js')
    const common = require('../../../../lib/common.js')
    const watchlistActions = require('../../../../lib/watchlist-actions.js')

    const { client, user } = common.init(context)

    const movieId = context.params.id
    let message = context.query?.message || null

    // Handle POST (Add to Watchlist)
    if (context.request.method === 'POST') {
        if (!user) {
            return context.redirect(`/login`)
        }

        try {
            const fd = common.parseFormData(context)
            let tmdbId = '', targetListId = ''
            if (typeof fd.get === 'function') {
                tmdbId = fd.get('tmdb_id')
                targetListId = fd.get('watchlist_id')
            } else {
                tmdbId = fd.tmdb_id
                targetListId = fd.watchlist_id
            }

            if (tmdbId) {
                const res = watchlistActions.addMovieToWatchlist(user, tmdbId, targetListId)

                // Redirect to self to show message
                return context.redirect(`/movies/${movieId}?message=${encodeURIComponent(res.message)}`)
            }
        } catch (e) {
            return {
                error: e.message,
                movie: null,
                user,
                lists: [],
                message: null
            }
        }
    }

    if (!movieId) {
        return {
            error: "Movie ID is required",
            movie: null,
            user,
            lists: [],
            message
        }
    }

    try {
        const movie = tmdb.getMovie(movieId)

        if (!movie) {
            return {
                error: "Movie not found",
                movie: null,
                user,
                lists: [],
                message
            }
        }

        const credits = tmdb.getCredits(movieId)

        let lists = []
        if (user) {
            lists = common.getWatchlists(client, user)
        }

        return {
            movie,
            credits,
            user,
            lists,
            message
        }
    } catch (e) {
        return {
            error: e.message,
            movie: null,
            user,
            lists: [],
            message
        }
    }
}
