/**
 * Loader for the profile edit page.
 * Checks authentication, loads profile, and handles profile update submissions (including avatar upload).
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

    if (context.request.method === 'POST') {
        try {
            const formData = context.request.formData()

            const name = formData.name
            const bio = formData.bio
            const shortHand = formData.shortHand

            const record = $app.findRecordById("users", user.id)

            if (name) record.set("name", name)
            if (bio) record.set("bio", bio)
            if (shortHand) record.set("shortHand", shortHand)

            // Handle avatar upload
            try {
                let avatar = null

                // Try to access the file via the native request object on the event
                // In PocketBase JS hooks, we often need to use internal helpers for file handling
                if (context.request.event && context.request.event.request) {
                    try {
                        const userFile = context.request.event.request.formFile("avatar")
                        if (userFile && Array.isArray(userFile)) {
                            const header = userFile[1]

                            // Use $filesystem global helper to convert multipart header to File object
                            if (typeof $filesystem !== 'undefined' && $filesystem.fileFromMultipart) {
                                avatar = $filesystem.fileFromMultipart(header)
                            }
                        }
                    } catch (e) {
                        // usage of event.request.formFile might fail if no file provided
                    }
                }

                // Only update avatar if a valid file with content is uploaded
                if (avatar && avatar.size > 0) {
                    record.set("avatar", avatar)
                }
            } catch (e) {
                // Ignore avatar errors, just don't update the field
                console.error("Avatar processing error:", e)
            }

            $app.save(record)

            // Redirect to profile view after save
            context.response.redirect('/profile')
            return {
                profile
            }
        } catch (err) {
            console.error('Profile update error:', err)
        }
    }

    return {
        profile
    }
}
