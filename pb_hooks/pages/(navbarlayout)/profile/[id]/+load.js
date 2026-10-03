/**
 * Legacy route loader for /profile/:id and /profile/@handle
 * Redirects to the canonical URL format: /profile/@handle/:id
 * @type {import('pocketpages').PageDataLoaderFunc}
 */
const common = require('../../../../lib/common.js')

module.exports = function (context) {
    const { client, user } = common.init(context)

    let rawParam = context.params?.id || context.pathParams?.id || ''
    try {
        rawParam = decodeURIComponent(rawParam)
    } catch (_) { }

    if (!rawParam) {
        context.response.redirect('/profile')
        return
    }

    let targetUser = null

    // 1. If param starts with @ (e.g. /profile/@mlt), lookup by handle/username/shorthand
    if (rawParam.startsWith('@')) {
        const cleanHandle = rawParam.substring(1).trim()
        try {
            const matches = $app.findRecordsByFilter(
                common.TABLES.USERS,
                `username = '${cleanHandle}'`,
                '-created',
                1,
                0
            )
            if (matches && matches.length > 0) {
                targetUser = matches[0]
            }
        } catch (_) { }

        if (!targetUser) {
            try {
                const matches = $app.findRecordsByFilter(
                    common.TABLES.USERS,
                    `shortHand = '${cleanHandle}'`,
                    '-created',
                    1,
                    0
                )
                if (matches && matches.length > 0) {
                    targetUser = matches[0]
                }
            } catch (_) { }
        }
    }

    // 2. Lookup by user ID
    if (!targetUser) {
        try {
            targetUser = $app.findRecordById(common.TABLES.USERS, rawParam)
        } catch (_) { }
    }

    // 3. Fallback: Lookup by shorthand or username even if @ was omitted
    if (!targetUser) {
        try {
            const matches = $app.findRecordsByFilter(
                common.TABLES.USERS,
                `shortHand = '${rawParam}' || username = '${rawParam}'`,
                '-created',
                1,
                0
            )
            if (matches && matches.length > 0) {
                targetUser = matches[0]
            }
        } catch (_) { }
    }

    if (!targetUser) {
        context.response.redirect('/reviews')
        return
    }

    // Redirect to canonical @handle URL
    const targetUrl = common.getProfileUrl(targetUser)
    const queryString = context.request?.url?.rawQuery ? `?${context.request.url.rawQuery}` : ''
    context.response.redirect(targetUrl + queryString)
}
