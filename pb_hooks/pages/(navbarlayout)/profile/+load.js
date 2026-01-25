/**
 * Loader for the profile page.
 * Checks authentication and loads the user profile.
 * @type {import('pocketpages').PageDataLoaderFunc}
 */
module.exports = function (context) {
    const user = context.request.auth
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
        profile
    }
}
