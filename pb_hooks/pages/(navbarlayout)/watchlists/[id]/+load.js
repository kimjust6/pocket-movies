/**
 * Loader for the watchlist detail page.
 * Handles:
 * - Fetching list details and movie items.
 * - Checking user permissions (view/edit/owner).
 * - Handling list management actions (Update Title, Delete List, Invite User).
 * @type {import('pocketpages').PageDataLoaderFunc}
 * @returns {{
 *   list: import('../../../../lib/pocketbase-types').ListsResponse,
 *   movies: import('../../../../lib/pocketbase-types').MoviesResponse[],
 *   users: import('../../../../lib/pocketbase-types').UsersResponse[],
 *   error: string|null,
 *   message: string|null
 * }}
 */
module.exports = function (api) {

    /**
     * @type {string|undefined}
     * Logged-in user ID.
     */
    const user = api.request.auth?.id

    // Attempt to get ID from params (likely merged path and query params)
    /**
     * @type {string}
     * The unique ID of the watchlist.
     */
    const listId = api.params?.id || api.pathParams?.id

    if (!listId) {
        return {
            list: null,
            movies: [],
            error: "List ID is missing."
        }
    }


    let list
    let message = null
    let error = null

    try {
        list = $app.findFirstRecordByFilter('lists', `id = '${listId}' && is_deleted != true`)
        if (!list) throw new Error("List not found")

    } catch (e) {
        api.response.redirect('/watchlists')
        return
    }

    /**
     * @type {boolean}
     * Whether the list is private.
     */
    const isPrivate = list.getBool('is_private')

    /**
     * @type {string}
     * The ID of the list owner.
     */
    const owner = list.getString('owner')

    /**
     * @type {boolean}
     * Whether the current user is the owner of the list.
     */
    const isOwner = (user && owner === user)

    /**
     * @type {boolean}
     * Flag indicating if the current user has access to view the list.
     */
    let hasAccess = false

    // 1. check access
    if (!isPrivate) {
        hasAccess = true
    } else if (isOwner) {
        hasAccess = true
    } else if (user) {
        try {
            const invite = $app.findFirstRecordByFilter(
                'list_user',
                `list = '${list.id}' && invited_user = '${user}'`
            )
            if (invite) hasAccess = true
        } catch (ignore) { }
    }

    if (!hasAccess) {
        return {
            list: null,
            movies: [],
            error: "You do not have permission to view this list."
        }
    }

    // Handle POST actions (Invite, Update, Delete)
    if (user && api.request.method === 'POST') {
        const result = handlePostAction(api, list, isOwner, user);
        if (result.message) message = result.message;
        if (result.error) error = result.error;
        if (result.redirect) {
            api.response.redirect(result.redirect);
            return;
        }
    }


    // 2. Fetch movies
    const movies = fetchMovies(listId);

    // 3. Fetch potential users to invite (if owner)
    const potentialUsers = fetchPotentialUsers(user, isOwner);

    const common = require('../../../../lib/common.js')

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

/**
 * Handles POST requests for various actions.
 * @param {import('pocketpages').PocketPagesApi} api 
 * @param {import('pocketbase').Record} list 
 * @param {boolean} isOwner 
 * @param {string} user 
 */
function handlePostAction(api, list, isOwner, user) {
    let message = null;
    let error = null;
    let redirect = null;

    /**
     * @typedef {object} UpdateListData
     * @property {string} action
     * @property {string} [list_title]
     * @property {string} [description]
     */

    /**
     * @typedef {object} InviteUserData
     * @property {string} action
     * @property {string} [email]
     * @property {string} [user_id]
     */

    /**
     * @typedef {object} HistoryItemData
     * @property {string} action
     * @property {string} [history_id]
     * @property {string} [watched_date]
     * @property {string} [tmdb_score]
     * @property {string} [imdb_score]
     * @property {string} [rt_score]
     */

    /**
     * @type {UpdateListData & InviteUserData & HistoryItemData}
     * Parsed form data from the request.
     */
    let data = {}
    try {
        if (typeof api.formData === 'function') {
            data = api.formData()
        } else if (typeof api.body === 'function') {
            data = api.body()
        } else {
            data = api.formData || api.body || {}
        }
    } catch (e) {
        console.error('Error parsing form data:', e)
        return { error: 'Invalid form data' };
    }

    const action = data.action;

    try {
        if (action === 'update_list') {
            message = handleUpdateList(list, data, isOwner);
        } else if (action === 'delete_list') {
            handleDeleteList(list, isOwner);
            redirect = '/watchlists';
        } else if (action === 'invite_user') {
            message = handleInviteUser(list, data, isOwner, user);
        } else if (action === 'update_history_item') {
            message = handleUpdateHistoryItem(list, data, isOwner);
        } else if (action === 'delete_history_item') {
            message = handleDeleteHistoryItem(list, data, isOwner);
        }
    } catch (e) {
        error = e.message;
    }

    return { message, error, redirect };
}

/**
 * @param {import('pocketbase').Record} list
 * @param {UpdateListData} data
 * @param {boolean} isOwner
 */
function handleUpdateList(list, data, isOwner) {
    const newTitle = data.list_title
    if (newTitle) {
        if (!isOwner) throw new Error("Only the owner can update the list.")

        list.set('list_title', newTitle)

        const newDescription = data.description
        if (newDescription !== undefined) {
            list.set('description', newDescription)
        }

        $app.save(list)
        return "List updated successfully!"
    }
    return null;
}

/**
 * @param {import('pocketbase').Record} list
 * @param {boolean} isOwner
 */
function handleDeleteList(list, isOwner) {
    if (!isOwner) throw new Error("Only the owner can delete the list.")

    list.set('is_deleted', true)
    $app.save(list)
}

/**
 * @param {import('pocketbase').Record} list
 * @param {InviteUserData} data
 * @param {boolean} isOwner
 * @param {string} user 
 */
function handleInviteUser(list, data, isOwner, user) {
    const email = data.email
    const targetUserId = data.user_id

    if (email || targetUserId) {
        if (!isOwner) {
            throw new Error("Only the owner can invite users.")
        }

        let invitedUser
        if (targetUserId) {
            invitedUser = $app.findRecordById('users', targetUserId)
        } else {
            invitedUser = $app.findFirstRecordByFilter('users', `email = '${email}'`)
        }

        if (!invitedUser) throw new Error("User not found.")
        if (invitedUser.id === user) throw new Error("You cannot invite yourself.")

        // Check if already invited
        try {
            const existing = $app.findFirstRecordByFilter(
                'list_user',
                `list = '${list.id}' && invited_user = '${invitedUser.id}'`
            )
            if (existing) throw new Error("User is already invited.")
        } catch (e) { /* not found */ }

        const listUserCollection = $app.findCollectionByNameOrId('list_user')
        const invite = new Record(listUserCollection)
        invite.set('list', list.id)
        invite.set('invited_user', invitedUser.id)
        invite.set('user_permission', 'view')
        $app.save(invite)

        return `User ${invitedUser.getString('email')} invited successfully!`
    }
    return null;
}

/**
 * @param {import('pocketbase').Record} list
 * @param {HistoryItemData} data
 * @param {boolean} isOwner
 */
function handleUpdateHistoryItem(list, data, isOwner) {
    const historyId = data.history_id
    const newDate = data.watched_date

    if (historyId) {
        if (!isOwner) throw new Error("Only the owner can update records.")

        const historyItem = $app.findRecordById('watched_history', historyId)

        // Security check: ensure this item belongs to the current list
        if (historyItem.getString('list') !== list.id) {
            throw new Error("Item does not belong to this list.")
        }

        if (newDate) {
            historyItem.set('watched', newDate)
        }

        // Update scores if provided
        if (data.tmdb_score !== undefined && data.tmdb_score !== "") {
            const score = parseFloat(data.tmdb_score)
            if (score < 0 || score > 10) throw new Error("TMDB score must be between 0 and 10.")
            historyItem.set('tmdb_score', score)
        }
        if (data.imdb_score !== undefined && data.imdb_score !== "") {
            const score = parseFloat(data.imdb_score)
            if (score < 0 || score > 10) throw new Error("IMDB score must be between 0 and 10.")
            historyItem.set('imdb_score', score)
        }
        if (data.rt_score !== undefined && data.rt_score !== "") {
            const score = parseInt(data.rt_score)
            if (score < 0 || score > 100) throw new Error("Rotten Tomatoes score must be between 0 and 100.")
            historyItem.set('rt_score', score)
        }

        $app.save(historyItem)
        return "Entry updated successfully!"
    }
    return null;
}

/**
 * @param {import('pocketbase').Record} list
 * @param {HistoryItemData} data
 * @param {boolean} isOwner
 */
function handleDeleteHistoryItem(list, data, isOwner) {
    const historyId = data.history_id
    if (historyId) {
        if (!isOwner) throw new Error("Only the owner can delete items.")

        const historyItem = $app.findRecordById('watched_history', historyId)

        if (historyItem.getString('list') !== list.id) {
            throw new Error("Item does not belong to this list.")
        }

        $app.delete(historyItem)
        return "Movie removed from list."
    }
    return null;
}

function fetchMovies(listId) {
    try {
        const historyRecords = $app.findRecordsByFilter(
            'watched_history',
            `list = '${listId}'`,
            '-created',
            100,
            0
        )

        $app.expandRecords(historyRecords, ['movie'])


        /**
         * @typedef {object} MovieItem
         * @property {string} id - The unique ID of the movie.
         * @property {string} tmdb_id - The TMDB ID of the movie.
         * @property {string} title - The title of the movie.
         * @property {string} release_date - The release date of the movie.
         * @property {number} runtime - The runtime of the movie.
         * @property {string} poster_path - The path to the movie poster.
         * @property {string} backdrop_path - The path to the movie backdrop.
         * @property {string} overview - The overview of the movie.
         * @property {string} tagline - The tagline of the movie.
         * @property {string} imdb_id - The IMDB ID of the movie.
         * @property {string} status - The release status of the movie.
         * @property {string} history_id - The ID of the watched history record.
         * @property {string} history_created - The creation timestamp of the history record.
         * @property {string} watched_at - The timestamp when the movie was watched.
         * @property {number} tmdb_score - The TMDB score of the movie.
         * @property {number} imdb_score - The IMDB score of the movie.
         * @property {number} rt_score - The Rotten Tomatoes score of the movie.
         */

        /** @type {MovieItem[]} */
        const movies = historyRecords.map((item) => {
            const m = item.expandedOne('movie')
            if (m) {
                return {
                    id: m.id,
                    tmdb_id: m.getString('tmdb_id'),
                    title: m.getString('title'),
                    release_date: m.getString('release_date'),
                    runtime: m.getInt('runtime'),
                    poster_path: m.getString('poster_path'),
                    backdrop_path: m.getString('backdrop_path'),
                    overview: m.getString('overview'),
                    tagline: m.getString('tagline'),
                    imdb_id: m.getString('imdb_id'),
                    status: m.getString('status'),
                    history_id: item.id,
                    history_created: item.getString('created'),
                    watched_at: item.getString('watched'),
                    tmdb_score: item.getFloat('tmdb_score'),
                    imdb_score: item.getFloat('imdb_score'),
                    rt_score: item.getInt('rt_score'),
                }
            }
            return null
        }).filter(Boolean)

        return movies;

    } catch (e) {
        console.error('Failed to load list items:', e)
        return []
    }
}

function fetchPotentialUsers(user, isOwner) {
    let potentialUsers = []
    if (isOwner) {
        try {
            potentialUsers = $app.findRecordsByFilter(
                'users',
                `id != '${user}'`,
                'email',
                50,
                0
            ).map(u => ({
                id: u.id,
                email: u.getString('email'),
                // Add checks if already invited? 
                // We'll handle that in the UI or let the backend error if clicked again.
                // For better UI, we should mark them as invited.
            }))
        } catch (e) {
            console.error("Failed to fetch users", e)
        }
    }
    return potentialUsers;
}
