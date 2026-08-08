/**
 * OMDB API Helper
 */

const { getEnv } = require('./env.js')

const BASE_URL = 'https://www.omdbapi.com'

function getApiKey() {
    return getEnv('OMDB_API_KEY')
}

/**
 * Fetches data from the OMDB API.
 * @param {Object} [params={}] - Query parameters (e.g. { i: 'tt1375666' } or { t: 'Inception', y: 2010 }).
 * @returns {Object} The JSON response from the API.
 * @throws {Error} If OMDB_API_KEY is not set or if the API returns an error.
 */
function fetchOMDB(params = {}) {
    const apiKey = getApiKey()
    if (!apiKey) {
        throw new Error('OMDB_API_KEY is not set')
    }

    // Build query string manually (URLSearchParams not available in JSVM)
    const queryParams = Object.assign({}, params, { apikey: apiKey })
    const queryString = Object.keys(queryParams)
        .map(key => encodeURIComponent(key) + '=' + encodeURIComponent(queryParams[key]))
        .join('&')

    const url = `${BASE_URL}/?${queryString}`

    try {
        let resData
        if (typeof $http !== 'undefined') {
            const res = $http.send({
                url: url,
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            })

            if (res.statusCode >= 400) {
                throw new Error(`OMDB API Error: ${res.statusCode} ${res.raw}`)
            }
            resData = res.json
        } else {
            // Fallback for Node environment
            const syncFetch = require('child_process').execSync
            const stdout = syncFetch(`curl -s "${url}"`).toString()
            resData = JSON.parse(stdout)
        }

        return resData
    } catch (e) {
        console.error('OMDB Fetch Error:', e)
        throw e
    }
}

/**
 * Parses IMDb score and Rotten Tomatoes score from an OMDB response object.
 * @param {Object} omdbData - OMDB API response JSON object.
 * @returns {{ imdb_score: number|null, rt_score: number|null }}
 */
function parseScores(omdbData) {
    if (!omdbData || omdbData.Response === 'False') {
        return { imdb_score: null, rt_score: null }
    }

    let imdb_score = null
    let rt_score = null

    // 1. Parse IMDb score from imdbRating
    if (omdbData.imdbRating && omdbData.imdbRating !== 'N/A') {
        const parsed = parseFloat(omdbData.imdbRating)
        if (!isNaN(parsed)) {
            imdb_score = parsed
        }
    }

    // 2. Parse from Ratings array if present
    if (Array.isArray(omdbData.Ratings)) {
        for (let i = 0; i < omdbData.Ratings.length; i++) {
            const rating = omdbData.Ratings[i]
            if (!rating || !rating.Source || !rating.Value) continue

            if (!imdb_score && rating.Source === 'Internet Movie Database') {
                const match = rating.Value.match(/([0-9.]+)\/10/)
                if (match) {
                    const parsed = parseFloat(match[1])
                    if (!isNaN(parsed)) imdb_score = parsed
                }
            }

            if (!rt_score && rating.Source === 'Rotten Tomatoes') {
                const match = rating.Value.match(/([0-9]+)%/)
                if (match) {
                    const parsed = parseInt(match[1], 10)
                    if (!isNaN(parsed)) rt_score = parsed
                }
            }
        }
    }

    return { imdb_score, rt_score }
}

module.exports = {
    /**
     * Retrieves details for a specific movie by IMDb ID.
     * @param {string} imdbId - The IMDb movie ID (e.g. 'tt1375666').
     * @returns {Object} The movie details.
     */
    getMovieByImdbId: (imdbId) => {
        return fetchOMDB({ i: imdbId })
    },

    /**
     * Retrieves details for a specific movie by title and optional year.
     * @param {string} title - The movie title.
     * @param {string|number} [year] - Release year.
     * @returns {Object} The movie details.
     */
    getMovieByTitle: (title, year) => {
        const params = { t: title }
        if (year) params.y = year
        return fetchOMDB(params)
    },

    /**
     * Searches for movies by query string.
     * @param {string} query - Search string.
     * @param {number} [page=1] - Page number.
     * @returns {Object} Search results.
     */
    searchMovies: (query, page = 1) => {
        return fetchOMDB({ s: query, page })
    },

    /**
     * Helper to parse scores from an OMDB JSON response.
     */
    parseScores,

    /**
     * Fetches IMDb & Rotten Tomatoes scores by IMDb ID.
     * @param {string} imdbId
     * @returns {{ imdb_score: number|null, rt_score: number|null }}
     */
    getScoresByImdbId: (imdbId) => {
        const data = fetchOMDB({ i: imdbId })
        return parseScores(data)
    },

    /**
     * Fetches IMDb & Rotten Tomatoes scores by Title and optional release year.
     * @param {string} title
     * @param {string|number} [year]
     * @returns {{ imdb_score: number|null, rt_score: number|null }}
     */
    getScoresByTitle: (title, year) => {
        const params = { t: title }
        if (year) params.y = year
        const data = fetchOMDB(params)
        return parseScores(data)
    },
}
