module.exports = function (context) {
    const user = context.request.auth

    if (!user) {
        return context.response.redirect('/login')
    }

    try {
        const freshUser = $app.findRecordById("users", user.id)
        return {
            profile: freshUser
        }
    } catch (e) {
        return {
            profile: user
        }
    }
}
