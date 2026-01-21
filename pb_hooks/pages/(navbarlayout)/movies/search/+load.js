/**
 * @type {import('pocketpages').PageDataLoaderFunc}
 */
module.exports = function (context) {
    const { request, user } = context;

    // TMDB API helper functions (inlined to avoid module resolution issues)
    const TMDB_API_KEY = $os.getenv('TMDB_API_KEY') || '';
    const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

    function fetchTMDB(endpoint, queryParams = {}) {
        if (!TMDB_API_KEY) {
            throw new Error('TMDB_API_KEY is not set');
        }

        // Build query string manually (URLSearchParams not available in JSVM)
        const params = Object.assign({}, queryParams, { api_key: TMDB_API_KEY });
        const queryString = Object.keys(params)
            .map(key => encodeURIComponent(key) + '=' + encodeURIComponent(params[key]))
            .join('&');

        const url = `${TMDB_BASE_URL}${endpoint}?${queryString}`;

        const res = $http.send({
            url: url,
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        });

        if (res.statusCode >= 400) {
            throw new Error(`TMDB API Error: ${res.statusCode}`);
        }

        return res.json;
    }

    function searchMovies(query, page = 1) {
        return fetchTMDB('/search/movie', { query, page });
    }

    function getMovie(id) {
        return fetchTMDB(`/movie/${id}`);
    }

    // Get query from URL query string (e.g., /movies/search?q=batman)
    const q = context?.params?.q || '';

    let results = [];
    let message = null;
    let error = null;

    // Handle POST request - add movie to watchlist
    if (request.method === 'POST') {
        const body = context.formData || {};
        const tmdbId = body.tmdb_id;

        if (user && tmdbId) {
            try {
                // Get movie details from TMDB
                const movieData = getMovie(tmdbId);

                // Check if movie already exists in our database
                let movie;
                try {
                    movie = $app.findFirstRecordByFilter('movies', `tmdb_id = "${tmdbId}"`);
                } catch (e) {
                    // Movie doesn't exist, create it
                    const moviesCollection = $app.findCollectionByNameOrId('movies');
                    movie = new Record(moviesCollection);
                    movie.set('tmdb_id', parseInt(tmdbId));
                    movie.set('title', movieData.title);
                    movie.set('overview', movieData.overview || '');
                    movie.set('poster_path', movieData.poster_path || '');
                    movie.set('release_date', movieData.release_date || '');
                    movie.set('vote_average', movieData.vote_average || 0);
                    $app.save(movie);
                }

                // Add to user's watched_history or watchlist collection
                try {
                    const watchedCollection = $app.findCollectionByNameOrId('watched_history');
                    const watchEntry = new Record(watchedCollection);
                    watchEntry.set('user', user.id);
                    watchEntry.set('movie', movie.id);
                    $app.save(watchEntry);
                    message = `"${movieData.title}" added to your watchlist!`;
                } catch (e) {
                    // May already be in watchlist
                    message = `"${movieData.title}" is already in your watchlist!`;
                }
            } catch (e) {
                error = 'Failed to add movie: ' + e.message;
            }
        } else if (!user) {
            error = 'You must be logged in to add movies to your watchlist.';
        }
    }

    // Perform search if query is provided
    if (q && q.trim().length > 0) {
        try {
            const searchData = searchMovies(q.trim());
            results = searchData.results || [];
        } catch (e) {
            error = 'Search failed: ' + e.message;
        }
    }

    return {
        results,
        q,
        message,
        error,
        user
    };
};

