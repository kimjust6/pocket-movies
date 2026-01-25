/**
 * Loader for the login page.
 * Redirects to watchlists if already authenticated.
 * @type {import('pocketpages').PageDataLoaderFunc}
 */
module.exports = function (context) {
    // If already logged in, redirect to watchlists
    if (context.request.auth) {
        context.response.redirect('/watchlists')
        return
    }

    return {}
}
