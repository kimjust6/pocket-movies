/**
 * Loader for the profile page.
 * Checks authentication and loads the user profile.
 * @type {import('pocketpages').PageDataLoaderFunc}
 * @returns {{ profile: import('../../../lib/pocketbase-types').UsersResponse }}
 */
module.exports = function (context) {
    const user = context.request.auth
    const common = require('../../../lib/common.js')
    if (!user) {
        context.response.redirect('/login')
        return
    }

    // Fetch fresh user data
    let profile = user
    try {
        profile = $app.findRecordById("users", user.id)
    } catch (e) {
        console.error("Failed to fetch fresh profile:", e)
    }

    return {
        profile,
        formatDateTime: common.formatDateTime
    }
}
