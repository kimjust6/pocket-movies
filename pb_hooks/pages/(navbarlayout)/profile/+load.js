/**
 * Loader for the profile page.
 * Checks authentication and loads the user profile.
 * @type {import('pocketpages').PageDataLoaderFunc}
 * @returns {{ profile: import('../../../lib/pocketbase-types').UsersResponse }}
 */
module.exports = function (context) {
    const common = require('../../../lib/common.js')
    const { client, user } = common.init(context)

    if (!user) {
        return context.redirect('/login')
    }

    // Fetch fresh user data
    let profile = user
    try {
        profile = client.collection('users').getOne(user.id)
    } catch (e) {
        console.error("Failed to fetch fresh profile:", e)
    }

    return {
        profile,
        formatDateTime: common.formatDateTime
    }
}
