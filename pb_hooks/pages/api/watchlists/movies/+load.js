/**
 * API endpoint for fetching paginated movies for a watchlist.
 * GET /api/watchlists/movies?listId=xxx&page=1&limit=20&sort=-created
 */
const common = require('../../../../lib/common.js')
const actions = require('../../../../lib/watchlist-actions.js')

module.exports = function (context) {
    const { user } = common.init(context)

    // Handle POST actions (updates, etc.)
    if (context.request.method === 'POST') {
        if (!user) {
            return { success: false, error: "Authentication required." }
        }

        const data = common.parseFormData(context)
        const listId = data.list_id || common.getParam(context, 'listId')

        if (!listId) {
            return { success: false, error: "List ID is missing." }
        }

        const { list, hasAccess, "isOwner": isOwner, error: accessError } = common.getWatchlistWithAccess(listId, user)

        if (!hasAccess) {
            return { success: false, error: accessError || "Access denied." }
        }

        // Delegate to actions handler (passing explicit data)
        const result = actions.handlePostAction(context, list, isOwner, user.id, data)

        if (result.error) {
            return { success: false, error: result.error }
        }

        // If successful update, fetch the single updated movie to return
        if (data.action === 'update_history_item' && data.history_id) {
            try {
                // We use findRecordById directly for efficiency, then manual cleanup if needed
                // OR duplicate logic from common.fetchWatchlistMovies to get expanded movie
                const historyItem = $app.findRecordById('watched_history', data.history_id)

                // Mock array for common formatter
                const tempArray = [historyItem]
                $app.expandRecords(tempArray, ['movie'])

                // Manual mapping (duplicate of common.fetchWatchlistMovies logic for single item)
                let movieData = null
                const m = historyItem.expandedOne('movie')
                if (m) {
                    movieData = {
                        id: m.id,
                        tmdb_id: m.getString('tmdb_id'),
                        title: m.getString('title'),
                        release_date: m.getString('release_date'),
                        runtime: m.getInt('runtime'),
                        poster_path: m.getString('poster_path'),
                        backdrop_path: m.getString('backdrop_path'),
                        overview: m.getString('overview'),
                        tagline: m.getString('tagline'),
                        imdb_id: m.getString('imdb_id'),
                        status: m.getString('status'),
                        history_id: historyItem.id,
                        history_created: historyItem.getString('created'),
                        watched_at: historyItem.getString('watched'),
                        tmdb_score: historyItem.getFloat('tmdb_score'),
                        imdb_score: historyItem.getFloat('imdb_score'),
                        rt_score: historyItem.getInt('rt_score'),
                    }
                    // Attach attendance
                    common.attachAttendance([movieData], listId)

                    return { success: true, message: result.message, movie: movieData }
                }
            } catch (e) {
                console.error("Failed to fetch updated movie", e)
            }
        }

        return { success: true, message: result.message }
    }

    // GET Handling
    const listId = common.getParam(context, 'listId')
    const page = parseInt(common.getParam(context, 'page') || '1', 10)
    const limit = parseInt(common.getParam(context, 'limit') || '20', 10)
    const sort = common.getParam(context, 'sort') || '-created'

    console.log('[API movies] listId:', listId, 'page:', page, 'limit:', limit, 'sort:', sort)

    if (!listId) {
        return {
            success: false,
            error: "List ID is required.",
            movies: [],
            hasMore: false
        }
    }

    // Check access
    const { list, hasAccess, error: accessError } = common.getWatchlistWithAccess(listId, user)

    if (!hasAccess) {
        return {
            success: false,
            error: accessError || "Access denied.",
            movies: [],
            hasMore: false
        }
    }

    // Fetch paginated movies
    const offset = (page - 1) * limit

    // Fetch one extra to determine hasMore
    const allMovies = common.fetchWatchlistMovies(listId, {
        limit: limit + 1,
        offset: offset,
        sort: sort
    })

    const hasMore = (allMovies.totalFetched !== undefined ? allMovies.totalFetched : allMovies.length) > limit
    const movies = hasMore ? allMovies.slice(0, limit) : allMovies

    // Attach Attendance Data
    common.attachAttendance(movies, listId)

    return {
        success: true,
        movies,
        page,
        hasMore,
        totalLoaded: offset + movies.length,
        sort
    }
}
