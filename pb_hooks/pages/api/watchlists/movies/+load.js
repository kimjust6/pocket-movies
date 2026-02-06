/**
 * API endpoint for fetching paginated movies for a watchlist.
 * GET /api/watchlists/movies?listId=xxx&page=1&limit=20&sort=-created
 */
const common = require('../../../../lib/common.js')
const actions = require('../../../../lib/watchlist-actions.js')
const { TABLES, COLS } = common

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
                const historyItem = $app.findRecordById(TABLES.WATCHED_HISTORY, data.history_id)
                const tempArray = [historyItem]
                $app.expandRecords(tempArray, [COLS.MOVIE])

                const m = historyItem.expandedOne(COLS.MOVIE)
                const movieData = common.mapMovieFromRecord(m, historyItem)
                if (movieData) {
                    common.attachAttendance([movieData], listId)
                    return { success: true, message: result.message, movie: movieData }
                }
            } catch (e) {
                console.error("Failed to fetch updated movie", e)
            }
        }

        // Handle update_attendance
        if (data.action === 'update_attendance' && data.history_id) {
            try {
                const historyItem = $app.findRecordById(TABLES.WATCHED_HISTORY, data.history_id)
                const tempArray = [historyItem]
                $app.expandRecords(tempArray, [COLS.MOVIE])

                const m = historyItem.expandedOne(COLS.MOVIE)
                const movieData = common.mapMovieFromRecord(m, historyItem)
                if (movieData) {
                    common.attachAttendance([movieData], listId)
                    return { success: true, message: result.message, movie: movieData }
                }
            } catch (e) {
                console.error("Failed to fetch updated movie for attendance", e)
            }
        }

        return { success: true, message: result.message }
    }

    // GET Handling
    const listId = common.getParam(context, 'listId')
    const page = parseInt(common.getParam(context, 'page') || '1', 10)
    const limit = parseInt(common.getParam(context, 'limit') || '20', 10)
    const sort = common.getParam(context, 'sort') || '-created'

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
