/**
 * Loader for the single review detail page (/reviews/:id).
 * Fetches review record, movie info, author profile, and related reviews.
 * @type {import('pocketpages').PageDataLoaderFunc}
 */
const common = require('../../../../lib/common.js')

module.exports = function (context) {
    const { client, user } = common.init(context)
    const reviewId = context.params?.id || context.pathParams?.id

    if (!reviewId) {
        context.response.redirect('/reviews')
        return
    }

    const review = common.getReviewById(reviewId, user)

    if (!review) {
        return {
            review: null,
            error: "Review not found or you do not have permission to view it.",
            user
        }
    }

    return {
        review,
        user
    }
}
