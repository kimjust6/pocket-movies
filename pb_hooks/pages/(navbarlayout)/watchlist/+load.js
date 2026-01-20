/**
 * @type {import('pocketpages').PageDataLoaderFunc}
 */
module.exports = function (api) {
    const user = api.request.auth.id;
    if (!user) {
        return {
            movies: []
        };
    }

    try {
        const watchlist = $app.findRecordsByFilter(
            'watchlist',
            `user = '${user}'`,
            '-created',
            50,
            0,
            { expand: 'movie' }
        );

        const movies = watchlist.map(item => {
            const m = item.expandedOne('movie');
            if (m) {
                return {
                    id: m.id,
                    tmdb_id: m.getString('tmdb_id'),
                    title: m.getString('title'),
                    release_date: m.getString('release_date'),
                    poster_path: m.getString('poster_path'),
                    overview: m.getString('overview'),
                    watchlist_id: item.id
                };
            }
            return null;
        }).filter(Boolean);

        return {
            movies
        };

    } catch (e) {
        console.error('Failed to load watchlist:', e);
        return {
            movies: [],
            error: e.message
        };
    }
};
