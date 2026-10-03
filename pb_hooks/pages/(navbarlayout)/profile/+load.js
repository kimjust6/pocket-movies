/**
 * Route loader for /profile
 * Redirects to the user's canonical profile URL: /profile/:id
 * @type {import('pocketpages').PageDataLoaderFunc}
 */
const common = require('../../../lib/common.js')

module.exports = function (context) {
    const { user } = common.init(context)

    const targetUserId = context.query?.id

    if (targetUserId) {
        context.response.redirect('/profile/' + encodeURIComponent(targetUserId))
        return
    }

    if (!user) {
        context.response.redirect('/login')
        return
    }

    context.response.redirect('/profile/' + user.id)
}
