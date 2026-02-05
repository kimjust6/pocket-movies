module.exports = function (context) {
    try {
        // 1. Fetch recent movies
        const records = $app.findRecordsByFilter(
            "watched_history",
            "",
            "-watched",
            30,
            0
        );
        $app.expandRecords(records, ['movie']);

        const seenMovies = new Set();
        const recentMovies = [];

        for (const r of records) {
            const m = r.expandedOne('movie');
            if (m && !seenMovies.has(m.id)) {
                recentMovies.push({
                    id: m.id,
                    tmdb_id: m.getString('tmdb_id'),
                    title: m.getString('title'),
                    poster_path: m.getString('poster_path'),
                    watched_at: r.getString('watched')
                });
                seenMovies.add(m.id);
                if (recentMovies.length >= 6) break;
            }
        }

        // 2. Fetch top 3 lists with movie counts and posters
        const allHistory = $app.findRecordsByFilter(
            "watched_history",
            "list != ''",
            "-watched",
            300,
            0
        );
        $app.expandRecords(allHistory, ['list', 'movie']);

        // Group by list and collect data
        const listMap = new Map();
        for (const h of allHistory) {
            const list = h.expandedOne('list');
            const movie = h.expandedOne('movie');
            if (!list || list.getBool('is_deleted') || list.getBool('is_private')) continue;

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

        // Sort by count and take top 3
        const topLists = Array.from(listMap.values())
            .sort((a, b) => b.count - a.count)
            .slice(0, 3);

        return {
            recentMovies: recentMovies,
            topLists: topLists
        }
    } catch (e) {
        console.error('Failed to load homepage data:', e);
        return {
            recentMovies: [],
            topLists: []
        }
    }
}
