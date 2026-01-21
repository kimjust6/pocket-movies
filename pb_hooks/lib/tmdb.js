/**
 * TMDB API Helper
 */

// We can access environment variables via $os.getenv() or process.env depending on JSVM vs Node.
// In PocketBase JSVM (Go), use $os.getenv(). In Node, process.env.
// Try $os.getenv first if available (Go environment), else process.env (testing).
const apiKey = process.env.TMDB_API_KEY || $os.getenv('TMDB_API_KEY') || ''

const BASE_URL = 'https://api.themoviedb.org/3'

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
    searchMovies: (query, page = 1) => {
        return fetchTMDB('/search/movie', { query, page })
    },
    getMovie: (id) => {
        return fetchTMDB(`/movie/${id}`)
    },
}
