const tmdb = require('../../../../lib/tmdb');

/**
 * @type {import('pocketpages').PageDataLoaderFunc}
 */
module.exports = function (context) {
    const { request, query, formData, redirect } = context;
    const method = request.method;
    const user = request.auth.id;
    let results = [];
    let message = null;
    let error = null;

    // Auth check removed to allow public access


    if (method === 'POST') {
        if (!user) {
            error = "You must be logged in to add to watchlist.";
        } else {
            try {
                // "Add to Watchlist" action
                // Expecting: tmdb_id, title, release_date, poster_path, overview
                // Since we can't trust client data fully, ideally we fetch from TMDB again by ID,
                // but for this task we might accept the form data for simplicity or re-fetch.
                // Let's re-fetch to be safe and ensure data consistency.

                const data = formData; // Assuming formData object is improved or we use helper
                const tmdb_id = data.tmdb_id;

                if (!tmdb_id) throw new Error("Missing TMDB ID");

                // 1. Check if movie exists in 'movies' collection
                let movieRecord;
                try {
                    const records = $app.findRecordsByFilter('movies', `tmdb_id = '${tmdb_id}'`, '', 1, 0);
                    if (records.length > 0) movieRecord = records[0];
                } catch (e) { /* Not found */ }

                if (!movieRecord) {
                    // Fetch details from TMDB
                    const details = tmdb.getMovie(tmdb_id);

                    // Create movie record
                    const moviesCollection = $app.findCollectionByNameOrId("movies");
                    const newRecord = new Record(moviesCollection);

                    newRecord.set('tmdb_id', details.id);
                    newRecord.set('title', details.title);
                    newRecord.set('original_title', details.original_title);
                    newRecord.set('original_language', details.original_language);
                    newRecord.set('release_date', details.release_date);
                    newRecord.set('runtime', details.runtime);
                    newRecord.set('status', details.status);
                    newRecord.set('tagline', details.tagline);
                    newRecord.set('overview', details.overview);
                    newRecord.set('poster_path', details.poster_path);
                    newRecord.set('backdrop_path', details.backdrop_path);

                    $app.save(newRecord);
                    movieRecord = newRecord;
                }

                // 2. Add to watchlist
                // Check if already in watchlist
                const existingWatchlist = $app.findRecordsByFilter(
                    'watchlist',
                    `user = '${user}' && movie = '${movieRecord.id}'`,
                    '', 1, 0
                );

                if (existingWatchlist.length === 0) {
                    const watchlistCollection = $app.findCollectionByNameOrId("watchlist");
                    const wRecord = new Record(watchlistCollection);
                    wRecord.set('user', user);
                    wRecord.set('movie', movieRecord.id);
                    $app.save(wRecord);
                    message = `Added "${movieRecord.getString('title')}" to your watchlist!`;
                } else {
                    message = `"${movieRecord.getString('title')}" is already in your watchlist.`;
                }

            } catch (e) {
                console.error("Add to watchlist error:", e);
                error = "Failed to add movie: " + e.message;
            }
        }
    }

    // Handle Search (GET or after POST if we want to show results again)
    const q = query.q;


    if (q) {

        try {
            const searchRes = tmdb.searchMovies(q);
            if (searchRes && searchRes.results) {
                results = searchRes.results;
            }
        } catch (e) {
            console.error("Search error:", e);
            error = "Search failed: " + e.message;
        }
    }

    return {
        results,
        q,
        message,
        error
    };
};
