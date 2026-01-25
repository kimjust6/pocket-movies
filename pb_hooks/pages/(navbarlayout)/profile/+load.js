module.exports = function (context) {
    const user = context.request.auth

    if (!user) {
        return context.response.redirect('/login')
    }

    // Always fetch the latest record from the database to ensure we have up-to-date data
    // bypassing any potential stale state in the request.auth object
    try {
        const freshUser = $app.findRecordById("users", user.id)
        return {
            profile: freshUser
        }
    } catch (e) {
        // Fallback to auth record if fetch fails for some reason
        return {
            profile: user
        }
    }
}
