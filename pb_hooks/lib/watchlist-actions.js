/**
 * Watchlist action handlers for POST requests.
 * Handles update, delete, invite, and history item operations.
 * @module watchlist-actions
 */

const common = require('./common.js')

/**
 * Handles POST requests for various watchlist actions.
 * @param {import('pocketpages').PocketPagesApi} context 
 * @param {import('pocketbase').Record} list 
 * @param {boolean} isOwner 
 * @param {string} userId 
 * @returns {{message: string|null, error: string|null, redirect: string|null}}
 */
function handlePostAction(context, list, isOwner, userId) {
    let message = null
    let error = null
    let redirect = null

    let data = common.parseFormData(context)
    // Compatibility: handle map-like access
    if (typeof data.get === 'function') {
        const fd = data
        data = {}
        fd.forEach((v, k) => { data[k] = v })
    }

    const action = data.action

    try {
        if (action === 'update_list') {
            message = handleUpdateList(list, data, isOwner)
        } else if (action === 'delete_list') {
            handleDeleteList(list, isOwner)
            redirect = '/watchlists'
        } else if (action === 'invite_user') {
            message = handleInviteUser(list, data, isOwner, userId)
        } else if (action === 'remove_user') {
            message = handleRemoveUser(list, data, isOwner)
        } else if (action === 'update_history_item') {
            message = handleUpdateHistoryItem(list, data, isOwner)
        } else if (action === 'delete_history_item') {
            message = handleDeleteHistoryItem(list, data, isOwner)
        }
    } catch (e) {
        error = e.message
    }

    return { message, error, redirect }
}

/**
 * Updates list title and description.
 * @param {import('pocketbase').Record} list
 * @param {object} data - Form data with list_title and description
 * @param {boolean} isOwner
 * @returns {string|null}
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
    return null
}

/**
 * Soft-deletes a watchlist.
 * @param {import('pocketbase').Record} list
 * @param {boolean} isOwner
 */
function handleDeleteList(list, isOwner) {
    if (!isOwner) throw new Error("Only the owner can delete the list.")

    list.set('is_deleted', true)
    $app.save(list)
}

/**
 * Invites a user to a watchlist.
 * @param {import('pocketbase').Record} list
 * @param {object} data - Form data with email or user_id
 * @param {boolean} isOwner
 * @param {string} userId - Current user's ID
 * @returns {string|null}
 */
function handleInviteUser(list, data, isOwner, userId) {
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
        if (invitedUser.id === userId) throw new Error("You cannot invite yourself.")

        // Determine permission from form data, default to 'view'
        const permission = data.permission || 'view'

        // Delegate to remove handler if permission is 'remove'
        if (permission === 'remove') {
            return handleRemoveUser(list, { user_id: invitedUser.id }, isOwner)
        }

        // Check if already invited
        let existing = null
        try {
            existing = $app.findFirstRecordByFilter(
                'list_user',
                `list = '${list.id}' && invited_user = '${invitedUser.id}'`
            )
        } catch (e) { /* not found */ }

        if (existing) {
            // Update existing permission
            existing.set('user_permission', permission)
            $app.save(existing)
            return `User ${invitedUser.getString('email')} permissions updated to ${permission}.`
        }

        // Create new invite
        const listUserCollection = $app.findCollectionByNameOrId('list_user')
        const invite = new Record(listUserCollection)
        invite.set('list', list.id)
        invite.set('invited_user', invitedUser.id)
        invite.set('user_permission', permission)
        $app.save(invite)

        return `User ${invitedUser.getString('email')} invited with ${permission} access!`
    }
    return null
}

/**
 * Updates a watch history item (date and scores).
 * @param {import('pocketbase').Record} list
 * @param {object} data - Form data with history_id, watched_date, scores
 * @param {boolean} isOwner
 * @returns {string|null}
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
    return null
}

/**
 * Deletes a watch history item.
 * @param {import('pocketbase').Record} list
 * @param {object} data - Form data with history_id
 * @param {boolean} isOwner
 * @returns {string|null}
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
    return null
}

/**
 * Removes a user from the watchlist.
 * @param {import('pocketbase').Record} list
 * @param {object} data - Form data with user_id
 * @param {boolean} isOwner
 * @returns {string|null}
 */
function handleRemoveUser(list, data, isOwner) {
    const targetUserId = data.user_id

    if (targetUserId) {
        if (!isOwner) throw new Error("Only the owner can remove users.")

        try {
            const invite = $app.findFirstRecordByFilter(
                'list_user',
                `list = '${list.id}' && invited_user = '${targetUserId}'`
            )

            if (invite) {
                // Get user email for message before deleting
                let email = "User"
                try {
                    const u = $app.findRecordById('users', targetUserId)
                    email = u.getString('email')
                } catch (ignore) { }

                $app.delete(invite)
                return `${email} removed from the list.`
            } else {
                throw new Error("User is not on the list.")
            }
        } catch (e) {
            // Re-throw if it's our error, otherwise generic not found
            if (e.message === "User is not on the list.") throw e
            throw new Error("User not found on this list.")
        }
    }
    return null
}

module.exports = {
    handlePostAction,
    handleUpdateList,
    handleDeleteList,
    handleInviteUser,
    handleRemoveUser,
    handleUpdateHistoryItem,
    handleDeleteHistoryItem
}
