/**
 * Legacy route loader for /watchlists/:id
 * Redirects to the canonical URL format: /watchlists/:slug/:id
 * @type {import('pocketpages').PageDataLoaderFunc}
 */
const common = require('../../../../lib/common.js')

module.exports = function (context) {
    const { client, user } = common.init(context)

    const listId = context.params?.id || context.pathParams?.id

    if (!listId) {
        context.response.redirect('/watchlists')
        return
    }

    // Fetch list
    const { list } = common.getWatchlistWithAccess(listId, user)

    if (!list) {
        context.response.redirect('/watchlists')
        return
    }

    // Redirect to canonical slug URL
    const targetUrl = common.getWatchlistUrl(list)
    const queryString = context.request?.url?.rawQuery ? `?${context.request.url.rawQuery}` : ''
    context.response.redirect(targetUrl + queryString)
}
