/**
 * API endpoint for fetching paginated movies for a watchlist.
 * GET /api/watchlists/movies?listId=xxx&page=1&limit=20&sort=-created
 */
const common = require('../../../../lib/common.js')

module.exports = function (context) {
    const { user } = common.init(context)

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
