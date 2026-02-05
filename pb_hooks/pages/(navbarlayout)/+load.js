/**
 * Loader for the homepage.
 * Fetches recent movies, top lists, and recent activity.
 * @type {import('pocketpages').PageDataLoaderFunc}
 */
const common = require('../../lib/common.js')

module.exports = function (context) {
    try {
        // Use common helper functions for homepage data
        const recentMovies = common.getRecentMovies(6)
        const topLists = common.getTopListsByMovieCount(4)
        const recentActivity = common.getRecentActivity(4)

        return {
            recentMovies,
            topLists,
            recentActivity
        }
    } catch (e) {
        console.error('Failed to load homepage data:', e)
        return {
            recentMovies: [],
            topLists: [],
            recentActivity: []
        }
    }
}
