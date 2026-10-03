/**
 * Loader for the latest reviews page.
 * Fetches recent community reviews and ratings.
 * @type {import('pocketpages').PageDataLoaderFunc}
 */
const common = require('../../../lib/common.js')

module.exports = function (context) {
    try {
        const { client, user } = common.init(context)

        const filter = (context.query && context.query.filter) || 'all'
        const sort = (context.query && context.query.sort) || '-created'

        const onlyWithText = filter === 'text_only'

        // Determine sort field for DB query
        let sortParam = '-created'
        if (sort === 'created') {
            sortParam = '+created'
        } else if (sort === '-rating') {
            sortParam = '-rating'
        } else if (sort === 'rating') {
            sortParam = '+rating'
        }

        const reviews = common.getLatestReviews({
            limit: 100,
            onlyWithText: onlyWithText,
            sort: sortParam,
            user: user
        })

        // Compute quick stats
        const totalReviews = reviews.length
        let totalScoreSum = 0
        let ratedCount = 0
        const movieIds = new Set()

        for (const rev of reviews) {
            if (rev.rating !== null && rev.rating !== undefined && rev.rating >= 0) {
                totalScoreSum += rev.rating
                ratedCount++
            }
            if (rev.movie && rev.movie.id) {
                movieIds.add(rev.movie.id)
            }
        }

        const avgScore = ratedCount > 0 ? (totalScoreSum / ratedCount).toFixed(1) : '-'
        const uniqueMoviesCount = movieIds.size

        return {
            reviews,
            stats: {
                total: totalReviews,
                avgScore,
                uniqueMovies: uniqueMoviesCount
            },
            currentFilter: filter,
            currentSort: sort,
            user
        }
    } catch (e) {
        console.error('Failed to load reviews page data:', e)
        return {
            reviews: [],
            stats: { total: 0, avgScore: '-', uniqueMovies: 0 },
            currentFilter: 'all',
            currentSort: '-created',
            user: null,
            error: e.message
        }
    }
}
