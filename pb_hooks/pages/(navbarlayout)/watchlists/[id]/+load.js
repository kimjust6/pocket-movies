/**
 * Loader for the watchlist detail page.
 * Handles:
 * - Fetching list details and movie items.
 * - Checking user permissions (view/edit/owner).
 * - Handling list management actions via watchlist-actions module.
 * @type {import('pocketpages').PageDataLoaderFunc}
 * @returns {{
 *   list: import('../../../../lib/pocketbase-types').ListsResponse,
 *   movies: import('../../../../lib/pocketbase-types').MoviesResponse[],
 *   users: import('../../../../lib/pocketbase-types').UsersResponse[],
 *   error: string|null,
 *   message: string|null
 * }}
 */
const common = require('../../../../lib/common.js')
const actions = require('../../../../lib/watchlist-actions.js')

module.exports = function (context) {
    const { client, user } = common.init(context)

    // Get list ID from params
    const listId = context.params?.id || context.pathParams?.id

    if (!listId) {
        return {
            list: null,
            movies: [],
            error: "List ID is missing."
        }
    }

    // 1. Fetch list and check access
    const { list, hasAccess, isOwner, error: accessError } = common.getWatchlistWithAccess(listId, user)

    if (!list) {
        context.response.redirect('/watchlists')
        return
    }

    if (!hasAccess) {
        return {
            list: null,
            movies: [],
            error: accessError || "You do not have permission to view this list."
        }
    }

    // 2. Handle POST actions
    let message = null
    let error = null

    if (user && context.request.method === 'POST') {
        const result = actions.handlePostAction(context, list, isOwner, user.id)
        message = result.message
        error = result.error
        if (result.redirect) {
            context.response.redirect(result.redirect)
            return
        }
    }

    // 3. Fetch movies
    const movies = common.fetchWatchlistMovies(listId)

    // 4. Fetch potential users to invite (if owner)
    const potentialUsers = common.fetchPotentialInviteUsers(user?.id, isOwner)

    return {
        list: {
            id: list.id,
            title: list.getString('list_title'),
            description: list.getString('description'),
            created: list.getString('created'),
            is_owner: isOwner
        },
        movies,
        users: potentialUsers,
        error,
        message,
        formatDateTime: common.formatDateTime
    }
}
