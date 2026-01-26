/**
 * TMDB API Helper
 */

// We can access environment variables via $os.getenv() or process.env depending on JSVM vs Node.
// In PocketBase JSVM (Go), use $os.getenv(). In Node, process.env.
// Try $os.getenv first if available (Go environment), else process.env (testing).
const apiKey = process.env.TMDB_API_KEY || $os.getenv('TMDB_API_KEY') || ''

const BASE_URL = 'https://api.themoviedb.org/3'

/**
 * Fetches data from the TMDB API.
 * @param {string} endpoint - The API endpoint to fetch (e.g., '/search/movie').
 * @param {Object} [params={}] - Optional query parameters.
 * @returns {Object} The JSON response from the API.
 * @throws {Error} If TMDB_API_KEY is not set or if the API returns an error.
 */
function fetchTMDB(endpoint, params = {}) {
    if (!apiKey) {
        throw new Error('TMDB_API_KEY is not set')
    }

    const query = new URLSearchParams(params)
    query.set('api_key', apiKey)

    const url = `${BASE_URL}${endpoint}?${query.toString()}`

    // Use PocketBase $http.send if available for better integration, or standard fetch
    // $http.send returns { statusCode, headers, raw, json, ... }

    try {
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
    getMovie: (id) => {
        return fetchTMDB(`/movie/${id}`)
    },
}
