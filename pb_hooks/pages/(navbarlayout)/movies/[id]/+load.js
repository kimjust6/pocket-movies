/**
 * Loader for the movie detail page.
 * Fetches movie details and credits from TMDB.
 * @type {import('pocketpages').PageDataLoaderFunc}
 * @returns {{
 *   movie: Object|null,
 *   credits: Object|null,
 *   user: import('../../../../lib/pocketbase-types').UsersResponse|null,
 *   error?: string
 * }}
 */
module.exports = function (context) {
    // TMDB API helper functions
    // We inline this because we don't have a shared util folder for these scripts easily accessible in JSVM without some setup
    const TMDB_API_KEY = ($os.getenv('TMDB_API_KEY') || process.env.TMDB_API_KEY || '').trim()
    const TMDB_BASE_URL = 'https://api.themoviedb.org/3'

    /**
     * Helper to fetch data from TMDB.
     * @param {string} endpoint - The TMDB endpoint.
     * @param {Object} [queryParams={}] - Query parameters.
     * @returns {Object} JSON response.
     */
    function fetchTMDB(endpoint, queryParams = {}) {
        if (!TMDB_API_KEY) {
            throw new Error('TMDB_API_KEY is not set')
        }

        const params = Object.assign({}, queryParams, { api_key: TMDB_API_KEY })
        const queryString = Object.keys(params)
            .map(key => encodeURIComponent(key) + '=' + encodeURIComponent(params[key]))
            .join('&')

        const url = `${TMDB_BASE_URL}${endpoint}?${queryString}`

        const res = $http.send({
            url: url,
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
        })

        if (res.statusCode >= 400) {
            // Check if 404
            if (res.statusCode === 404) {
                return null
            }
            throw new Error(`TMDB API Error: ${res.statusCode}`)
        }

        return res.json
    }

    const movieId = context.params.id

    if (!movieId) {
        return {
            error: "Movie ID is required",
            movie: null
        }
    }

    try {
        const movie = fetchTMDB(`/movie/${movieId}`)

        if (!movie) {
            return {
                error: "Movie not found",
                movie: null
            }
        }

        const credits = fetchTMDB(`/movie/${movieId}/credits`)

        return {
            movie,
            credits,
            user: context.request.auth
        }
    } catch (e) {
        return {
            error: e.message,
            movie: null
        }
    }
}
