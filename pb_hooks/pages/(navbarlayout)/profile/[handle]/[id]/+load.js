/**
 * Loader for the public user profile page with handle and ID (/profile/@handle/:id).
 * Loads user by ID, validates the canonical @handle slug in the URL,
 * and fetches the user's public watchlists and community reviews.
 * @type {import('pocketpages').PageDataLoaderFunc}
 */
const common = require('../../../../../lib/common.js')

module.exports = function (context) {
    const { client, user } = common.init(context)
    const targetUserId = context.params?.id || context.pathParams?.id
    const handleParam = context.params?.handle || context.pathParams?.handle

    if (!targetUserId) {
        context.response.redirect('/profile')
        return
    }

    let profile = null
    try {
        profile = $app.findRecordById(common.TABLES.USERS, targetUserId)
    } catch (e) {
        console.error('Failed to find user for profile ' + targetUserId, e)
        return {
            error: 'User not found',
            profile: null,
            user,
            isOwner: false,
            watchlists: [],
            reviews: [],
            formatDateTime: common.formatDateTime
        }
    }

    // Canonical @handle validation and redirect
    const userHandle = common.getUserHandle(profile)
    const expectedHandle = `@${userHandle}`

    if (handleParam !== expectedHandle) {
        const canonicalUrl = `/profile/${expectedHandle}/${targetUserId}`
        const queryString = context.request?.url?.rawQuery ? `?${context.request.url.rawQuery}` : ''
        context.response.redirect(canonicalUrl + queryString)
        return
    }

    const isOwner = !!(user && user.id === profile.id)

    // Fetch public watchlists for this user
    let userWatchlists = []
    try {
        const filter = isOwner
            ? `owner = '${profile.id}' && (is_deleted = false || is_deleted = null)`
            : `owner = '${profile.id}' && is_private = false && (is_deleted = false || is_deleted = null)`

        const lists = $app.findRecordsByFilter(common.TABLES.LISTS, filter, '-created', 10, 0)
        userWatchlists = lists.map(l => ({
            id: l.id,
            title: l.getString(common.COLS.LIST_TITLE),
            description: l.getString('description'),
            isPrivate: l.getBool(common.COLS.IS_PRIVATE),
            url: common.getWatchlistUrl(l)
        }))
    } catch (e) {
        console.error('Failed to load user watchlists:', e)
    }

    // Fetch user reviews
    let userReviews = []
    try {
        const reviewRecords = $app.findRecordsByFilter(
            common.TABLES.WATCH_HISTORY_USER,
            `user = '${profile.id}' && (${common.COLS.REVIEW} != '' || ${common.COLS.RATING} >= 0)`,
            `-${common.COLS.CREATED}`,
            15,
            0
        )
        $app.expandRecords(reviewRecords, [common.COLS.WATCH_HISTORY])

        const watchHistories = []
        for (const r of reviewRecords) {
            const wh = r.expandedOne(common.COLS.WATCH_HISTORY)
            if (wh) watchHistories.push(wh)
        }
        if (watchHistories.length > 0) {
            $app.expandRecords(watchHistories, [common.COLS.MOVIE, common.COLS.LIST])
        }

        for (const r of reviewRecords) {
            const wh = r.expandedOne(common.COLS.WATCH_HISTORY)
            if (!wh) continue
            const movie = wh.expandedOne(common.COLS.MOVIE)
            const list = wh.expandedOne(common.COLS.LIST)
            if (!movie) continue
            if (list && list.getBool(common.COLS.IS_PRIVATE) && !isOwner) continue

            const ratingVal = r.getFloat(common.COLS.RATING)
            const hasRating = (ratingVal !== null && ratingVal !== undefined && ratingVal >= 0)
            userReviews.push({
                id: r.id,
                created: r.getString(common.COLS.CREATED),
                formattedDate: common.formatDateTime(r.getString(common.COLS.CREATED)),
                rating: hasRating ? ratingVal : null,
                review: r.getString(common.COLS.REVIEW),
                failed: r.getBool(common.COLS.FAILED),
                movie: {
                    id: movie.id,
                    tmdbId: movie.getString(common.COLS.TMDB_ID),
                    title: movie.getString(common.COLS.TITLE),
                    posterPath: movie.getString(common.COLS.POSTER_PATH),
                    releaseYear: (movie.getString(common.COLS.RELEASE_DATE) || '').substring(0, 4)
                },
                list: list ? {
                    id: list.id,
                    title: list.getString(common.COLS.LIST_TITLE),
                    url: common.getWatchlistUrl(list)
                } : null
            })
        }
    } catch (e) {
        console.error('Failed to load user reviews:', e)
    }

    return {
        profile,
        user,
        isOwner,
        userHandle,
        canonicalUrl: `/profile/${expectedHandle}/${targetUserId}`,
        watchlists: userWatchlists,
        reviews: userReviews,
        formatDateTime: common.formatDateTime
    }
}
