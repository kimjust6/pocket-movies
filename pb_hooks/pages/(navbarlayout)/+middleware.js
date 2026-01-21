module.exports = function (context) {
    // Auth logic removed.
    // Returning metadata required by head.ejs

    return {
        metadata: [
            // Basic metadata
            {
                name: 'title',
                content:
                    "Dank Movies",
            },
            {
                name: 'description',
                content:
                    'Personal movie watchlist application.',
            },
            { name: 'url', content: 'https://www.jkim.win/' },

            // Open Graph metadata
            {
                name: 'og:title',
                content:
                    "Dank Movies",
            },
            { name: 'og:type', content: 'website' },
            { name: 'og:url', content: 'https://www.jkim.win/' },
            {
                name: 'og:image',
                content: 'https://ylam.jkim.win/og-image.webp',
            },
            { name: 'og:image:alt', content: 'Dank Movies' },
            { name: 'og:image:width', content: '637' },
            { name: 'og:image:height', content: '425' },
            {
                name: 'og:description',
                content:
                    'Personal movie watchlist application.',
            },
            { name: 'og:site_name', content: "Dank Movies" },
            { name: 'og:locale', content: 'en_CA' },

            // Twitter Card metadata (optional, but helpful)
            { name: 'twitter:card', content: 'summary_large_image' },
            { name: 'twitter:site', content: '@MatchaLatteTea' },
            {
                name: 'twitter:title',
                content:
                    "Dank Movies",
            },
            {
                name: 'twitter:description',
                content:
                    'Personal movie watchlist application.',
            },
            {
                name: 'twitter:image',
                content: 'https://www.jkim.win/og-image.webp',
            },
        ],
    }
}
