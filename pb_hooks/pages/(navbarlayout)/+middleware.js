/** @type {import('pocketpages').MiddlewareLoaderFunc} */
module.exports = function (api) {
    return {
        metadata: [
            // Basic metadata
            {
                name: 'title',
                content:
                    "Yvonne & Justin's Wedding",
            },
            {
                name: 'description',
                content:
                    'Join us in celebrating the wedding of Yvonne Lam and Justin Kim. RSVP and find all the details for our special day.',
            },
            { name: 'url', content: 'https://www.jkim.win/' },

            // Open Graph metadata
            {
                name: 'og:title',
                content:
                    "Yvonne & Justin's Wedding",
            },
            { name: 'og:type', content: 'website' },
            { name: 'og:url', content: 'https://www.jkim.win/' },
            {
                name: 'og:image',
                content: 'https://ylam.jkim.win/og-image.webp',
            },
            { name: 'og:image:alt', content: 'Yvonne and Justin Wedding Photo' },
            { name: 'og:image:width', content: '1200' },
            { name: 'og:image:height', content: '630' },
            {
                name: 'og:description',
                content:
                    'Join us in celebrating the wedding of Yvonne Lam and Justin Kim. RSVP and find all the details for our special day.',
            },
            { name: 'og:site_name', content: "Yvonne & Justin's Wedding" },
            { name: 'og:locale', content: 'en_CA' },

            // Wedding event details
            { name: 'author', content: 'Yvonne Lam & Justin Kim' },
            { name: 'event:type', content: 'wedding' },
            { name: 'event:hosts', content: 'Yvonne Lam and Justin Kim' },

            // Twitter Card metadata (optional, but helpful)
            { name: 'twitter:card', content: 'summary_large_image' },
            { name: 'twitter:site', content: '@MatchaLatteTea' },
            {
                name: 'twitter:title',
                content:
                    "Yvonne & Justin's Wedding",
            },
            {
                name: 'twitter:description',
                content:
                    'Join us in celebrating the wedding of Yvonne Lam and Justin Kim. RSVP and find all the details for our special day.',
            },
            {
                name: 'twitter:image',
                content: 'https://www.jkim.win/og-image.webp',
            },
        ],
    }
}
