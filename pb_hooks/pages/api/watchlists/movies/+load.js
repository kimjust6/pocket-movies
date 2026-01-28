/**
 * API endpoint for fetching paginated movies for a watchlist.
 * GET /api/watchlists/movies?listId=xxx&page=1&limit=20&sort=-created
 */
const common = require('../../../../lib/common.js')

// Helper to get param from various context locations
function getParam(ctx, key) {
    if (ctx.params && ctx.params[key]) return ctx.params[key]
    if (ctx.query && ctx.query[key]) return ctx.query[key]
    if (typeof ctx.queryParam === 'function') return ctx.queryParam(key)
    return null
}

module.exports = function (context) {
    const { user } = common.init(context)

    const listId = getParam(context, 'listId')
    const page = parseInt(getParam(context, 'page') || '1', 10)
    const limit = parseInt(getParam(context, 'limit') || '20', 10)
    const sort = getParam(context, 'sort') || '-created'

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
    try {
        const offset = (page - 1) * limit

        const historyRecords = $app.findRecordsByFilter(
            'watched_history',
            `list = '${listId}'`,
            sort,
            limit + 1, // Fetch one extra to check if there are more
            offset
        )

        $app.expandRecords(historyRecords, ['movie'])

        // Check if there are more items
        const hasMore = historyRecords.length > limit
        const recordsToReturn = hasMore ? historyRecords.slice(0, limit) : historyRecords

        const movies = recordsToReturn.map((item) => {
            const m = item.expandedOne('movie')
            if (m) {
                return {
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
                    history_id: item.id,
                    history_created: item.getString('created'),
                    watched_at: item.getString('watched'),
                    tmdb_score: item.getFloat('tmdb_score'),
                    imdb_score: item.getFloat('imdb_score'),
                    rt_score: item.getInt('rt_score'),
                }
            }
            return null
        }).filter(Boolean)

        return {
            success: true,
            movies,
            page,
            hasMore,
            totalLoaded: offset + movies.length,
            sort
        }
    } catch (e) {
        console.error('[API] Failed to load movies:', e)
        return {
            success: false,
            error: "Failed to load movies.",
            movies: [],
            hasMore: false
        }
    }
}
