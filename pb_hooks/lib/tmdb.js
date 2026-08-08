/**
 * TMDB API Helper
 */

const { getEnv } = require('./env.js')

const BASE_URL = 'https://api.themoviedb.org/3'

function getApiKey() {
    return getEnv('TMDB_API_KEY')
}

/**
 * Fetches data from the TMDB API.
 * @param {string} endpoint - The API endpoint to fetch (e.g., '/search/movie').
 * @param {Object} [params={}] - Optional query parameters.
 * @returns {Object} The JSON response from the API.
 * @throws {Error} If TMDB_API_KEY is not set or if the API returns an error.
 */
function fetchTMDB(endpoint, params = {}) {
    const apiKey = getApiKey()
    if (!apiKey) {
        throw new Error('TMDB_API_KEY is not set')
    }

    // Build query string manually (URLSearchParams not available in JSVM)
    const queryParams = Object.assign({}, params, { api_key: apiKey })
    const queryString = Object.keys(queryParams)
        .map(key => encodeURIComponent(key) + '=' + encodeURIComponent(queryParams[key]))
        .join('&')

    const url = `${BASE_URL}${endpoint}?${queryString}`

    // Use PocketBase $http.send if available for better integration, or standard fetch
    // $http.send returns { statusCode, headers, raw, json, ... }

    try {
        if (typeof $http !== 'undefined') {
            const res = $http.send({
                url: url,
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            })

            if (res.statusCode >= 400) {
                throw new Error(`TMDB API Error: ${res.statusCode} ${res.raw}`)
            }

            return res.json
        } else {
            // Fallback for Node environment
            const syncFetch = require('child_process').execSync
            const stdout = syncFetch(`curl -s "${url}"`).toString()
            return JSON.parse(stdout)
        }
    } catch (e) {
        console.error('TMDB Fetch Error:', e)
        throw e
    }
}

module.exports = {
    /**
     * Searches for movies by query string.
     * @param {string} query - The search query.
     * @param {number} [page=1] - The page number to fetch.
     * @returns {Object} The search results from TMDB.
     */
    searchMovies: (query, page = 1) => {
        return fetchTMDB('/search/movie', { query, page })
    },

    /**
     * Retrieves details for a specific movie by ID.
     * @param {string|number} id - The TMDB movie ID.
     * @returns {Object} The movie details.
     */
    /**
     * Retrieves details for a specific movie by ID.
     * @param {string|number} id - The TMDB movie ID.
     * @returns {Object} The movie details.
     */
    getMovie: (id) => {
        return fetchTMDB(`/movie/${id}`)
    },

    /**
     * Retrieves credits for a specific movie by ID.
     * @param {string|number} id - The TMDB movie ID.
     * @returns {Object} The movie credits.
     */
    getCredits: (id) => {
        return fetchTMDB(`/movie/${id}/credits`)
    },
}

