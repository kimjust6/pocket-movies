module.exports = function (context) {
    // If already logged in, redirect to watchlists
    if (context.request.auth) {
        context.response.redirect('/watchlists')
        return
    }

    return {}
}
