module.exports = function (context) {
    try {
        // 1. Fetch watched_history (covers both Recent Movies and Top Lists)
        // We fetch 300 to get enough data for top lists, which also covers recent movies
        const allHistory = $app.findRecordsByFilter(
            "watched_history",
            "",
            "-watched",
            300,
            0
        );
        $app.expandRecords(allHistory, ['movie', 'list']);

        const seenMovies = new Set();
        const recentMovies = [];
        const listMap = new Map();

        for (const h of allHistory) {
            const movie = h.expandedOne('movie');
            const list = h.expandedOne('list');

            // Process for Recent Movies (first 6 unique movies)
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

            // Process for Top Lists
            if (list && !list.getBool('is_deleted') && !list.getBool('is_private')) {
                const listId = list.id;
                if (!listMap.has(listId)) {
                    listMap.set(listId, {
                        id: listId,
                        title: list.getString('list_title'),
                        count: 0,
                        posters: []
                    });
                }

                const entry = listMap.get(listId);
                entry.count++;
                if (movie && entry.posters.length < 3) {
                    const posterPath = movie.getString('poster_path');
                    if (posterPath && !entry.posters.includes(posterPath)) {
                        entry.posters.push(posterPath);
                    }
                }
            }
        }

        // Sort Top Lists by count and take top 3
        const topLists = Array.from(listMap.values())
            .sort((a, b) => b.count - a.count)
            .slice(0, 3);

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
                        rating: rating,
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
