const common = require('../../lib/common.js')

// Configure your site URL here (no trailing slash)
const BASE_URL = 'https://movie.jkim.win';

/**
 * Middleware function to provide site metadata and global data.
 * @param {import('pocketpages').MiddlewareContext} context - The middleware context.
 * @returns {Object} The metadata and data object.
 */
module.exports = function (context) {
    const { client, user } = common.init(context)

    let userWatchlists = []

    if (user) {
        // Fetch all lists where user is owner or invited
        const allLists = common.getWatchlists(client, user)

        userWatchlists = allLists
            .sort((a, b) => {
                const dateA = new Date(a.updated || a.created)
                const dateB = new Date(b.updated || b.created)
                return dateB - dateA
            })
            .slice(0, 5)

        console.log('[Middleware] User:', user ? user.id : 'none');
        console.log('[Middleware] Watchlists found:', userWatchlists.length);

        // Assign to locals for view access
        if (context.locals) {
            context.locals.userWatchlists = userWatchlists;
        }
    } else {
        console.log('[Middleware] No user logged in');
    }

    return {
        userWatchlists,
        metadata: [
            // Basic metadata
            {
                name: 'title',
                content: 'Dank Movies',
            },
            {
                name: 'description',
                content: "Track films you've watched. Share films you love.",
            },
            { name: 'url', content: BASE_URL },

            // Open Graph metadata
            {
                name: 'og:title',
                content: 'Dank Movies',
            },
            { name: 'og:type', content: 'website' },
            { name: 'og:url', content: BASE_URL },
            {
                name: 'og:image',
                content: `${BASE_URL}/og-image.webp`,
            },
            { name: 'og:image:alt', content: 'Dank Movies' },
            { name: 'og:image:width', content: '637' },
            { name: 'og:image:height', content: '425' },
            {
                name: 'og:description',
                content: "Track films you've watched and share films you love",
            },
            { name: 'og:site_name', content: 'Dank Movies' },
            { name: 'og:locale', content: 'en_CA' },

            // Twitter Card metadata (optional, but helpful)
            { name: 'twitter:card', content: 'summary_large_image' },
            { name: 'twitter:site', content: '@MatchaLatteTea' },
            {
                name: 'twitter:title',
                content: 'Dank Movies',
            },
            {
                name: 'twitter:description',
                content: "Track films you've watched and share films you love",
            },
            {
                name: 'twitter:image',
                content: `${BASE_URL}/og-image.webp`,
            },
        ],
    }
}
