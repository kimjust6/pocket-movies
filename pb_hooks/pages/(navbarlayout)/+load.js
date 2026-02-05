module.exports = function (context) {
    try {
        // 1. Fetch recent movies (first 6 unique movies)
        const recentHistory = $app.findRecordsByFilter(
            "watched_history",
            "",
            "-watched",
            20,
            0
        );
        $app.expandRecords(recentHistory, ['movie']);

        const seenMovies = new Set();
        const recentMovies = [];

        for (const h of recentHistory) {
            const movie = h.expandedOne('movie');
            if (movie && recentMovies.length < 6 && !seenMovies.has(movie.id)) {
                recentMovies.push({
                    id: movie.id,
                    tmdb_id: movie.getString('tmdb_id'),
                    title: movie.getString('title'),
                    poster_path: movie.getString('poster_path'),
                    watched_at: h.getString('watched')
                });
                seenMovies.add(movie.id);
            }
        }

        // 2. Use query builder to get top 3 lists by movie count
        // SELECT list, COUNT(*) as count FROM watched_history 
        // JOIN watchlists ON watched_history.list = watchlists.id
        // WHERE list != '' AND watchlists.is_deleted = false AND watchlists.is_private = false
        // GROUP BY list ORDER BY count DESC LIMIT 3
        const listCountResult = arrayOf(new DynamicModel({
            "list": "",
            "count": 0
        }));

        $app.db()
            .select("wh.list", "COUNT(*) as count")
            .from("watched_history wh")
            .innerJoin("lists w", $dbx.exp("w.id = wh.list"))
            .where($dbx.exp("wh.list != ''"))
            .andWhere($dbx.hashExp({ "w.is_deleted": false }))
            .andWhere($dbx.hashExp({ "w.is_private": false }))
            .groupBy("wh.list")
            .orderBy("count DESC")
            .limit(3)
            .all(listCountResult);

        // Fetch the list details and posters for each top list
        const topLists = [];
        for (const row of listCountResult) {
            const listId = row.list;
            const count = row.count;

            // Get the list record
            const listRecord = $app.findRecordById("lists", listId);
            if (!listRecord) continue;

            // Get up to 3 movie posters for this list
            const listHistory = $app.findRecordsByFilter(
                "watched_history",
                `list = "${listId}"`,
                "-watched",
                3,
                0
            );
            $app.expandRecords(listHistory, ['movie']);

            const posters = [];
            for (const h of listHistory) {
                const movie = h.expandedOne('movie');
                if (movie) {
                    const posterPath = movie.getString('poster_path');
                    if (posterPath && !posters.includes(posterPath)) {
                        posters.push(posterPath);
                    }
                }
            }

            topLists.push({
                id: listId,
                title: listRecord.getString('list_title'),
                count: count,
                posters: posters
            });
        }

        // 3. Fetch recent activity (last 4 from watched_history + last 4 from watch_history_user)
        const recentActivity = [];

        // 3a. Recent movie adds (watched_history)
        const recentAdds = $app.findRecordsByFilter(
            "watched_history",
            "list != ''",
            "-created",
            4,
            0
        );
        $app.expandRecords(recentAdds, ['movie', 'list']);

        for (const r of recentAdds) {
            const movie = r.expandedOne('movie');
            const list = r.expandedOne('list');
            if (movie && list && !list.getBool('is_deleted') && !list.getBool('is_private')) {
                recentActivity.push({
                    type: 'add',
                    created: r.getString('created'),
                    movieTitle: movie.getString('title'),
                    movieId: movie.getString('tmdb_id'),
                    listTitle: list.getString('list_title'),
                    listId: list.id
                });
            }
        }

        // 3b. Recent reviews (watch_history_user)
        const recentReviews = $app.findRecordsByFilter(
            "watch_history_user",
            "review != '' || rating > 0",
            "-created",
            4,
            0
        );
        $app.expandRecords(recentReviews, ['user', 'watch_history']);

        for (const r of recentReviews) {
            const user = r.expandedOne('user');
            const watchHistory = r.expandedOne('watch_history');
            if (user && watchHistory) {
                // Expand movie from watch_history
                $app.expandRecords([watchHistory], ['movie']);
                const movie = watchHistory.expandedOne('movie');
                if (movie) {
                    const rating = r.getFloat('rating');
                    const review = r.getString('review');
                    recentActivity.push({
                        type: review ? 'review' : 'rating',
                        created: r.getString('created'),
                        userName: user.getString('name') || user.getString('username') || 'User',
                        userInitials: (user.getString('shortHand') || user.getString('name') || 'U').substring(0, 2).toUpperCase(),
                        movieTitle: movie.getString('title'),
                        movieId: movie.getString('tmdb_id'),
                        rating: Math.round(rating) / 2,
                        review: review
                    });
                }
            }
        }

        // Sort by created date and take top 4
        recentActivity.sort((a, b) => new Date(b.created) - new Date(a.created));
        const topActivity = recentActivity.slice(0, 4);

        return {
            recentMovies: recentMovies,
            topLists: topLists,
            recentActivity: topActivity
        }
    } catch (e) {
        console.error('Failed to load homepage data:', e);
        return {
            recentMovies: [],
            topLists: [],
            recentActivity: []
        }
    }
}
