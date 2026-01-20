module.exports = function (context) {
    try {
        const authCookie = context.request.cookies('wedding_auth');
        const currentPath = context.request.url.pathname;

        // Check for 'pw' query parameter for auto-login
        const queryPw = context?.params?.pw;
        if (queryPw) {
            try {
                // Find record with this password
                const records = $app.findRecordsByFilter('pw', 'password = {:p}', '-created', 1, 0, { p: queryPw });

                if (records.length > 0) {
                    // Valid password, set cookie
                    context.response.cookie('wedding_auth', 'true', {
                        path: '/',
                        secure: true,
                        httpOnly: true,
                        maxAge: 31536000
                    });

                    // Redirect to clean URL (strip pw param)
                    // If on /login, redirect to /
                    const redirectPath = currentPath === '/login' ? '/' : currentPath;
                    return context.redirect(redirectPath, { status: 303 });
                }
            } catch (authErr) {
                // Ignore, fall through to normal check
            }
        }

        // Check if we are already on the login page to avoid infinite loop
        if (currentPath === '/login') {
            return {};
        }

        if (!authCookie) {
            // Preserve query parameters (like pw) when redirecting
            const search = context.request.url.search || '';
            const loginUrl = '/login' + search;

            // Signature: redirect(path, options)
            return context.redirect(loginUrl, { status: 303 });
        }
    } catch (e) {
        return context.redirect('/login', { status: 303 });
    }

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
            { name: 'og:image:width', content: '637' },
            { name: 'og:image:height', content: '425' },
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
