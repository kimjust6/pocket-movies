module.exports = function (context) {
    try {
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

        return {
            recentMovies: recentMovies
        }
    } catch (e) {
        console.error('Failed to load recent movies:', e);
        return {
            recentMovies: []
        }
    }
}
