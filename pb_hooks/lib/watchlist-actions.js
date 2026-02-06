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
 * @param {string} userId 
 * @param {object} [explicitData] - Optional pre-parsed data
 * @returns {{message: string|null, error: string|null, redirect: string|null}}
 */
function handlePostAction(context, list, isOwner, userId, explicitData = null) {
    let message = null
    let error = null
    let redirect = null

    let data = explicitData || common.parseFormData(context)
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
        } else if (action === 'update_attendance') {
            message = handleUpdateAttendance(list, data, userId)
        } else if (action === 'delete_attendance') {
            message = handleDeleteAttendance(list, data, userId)
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

        // Handle privacy toggle (inverted)
        // If is_public is 'on' or 'true', then is_private is false.
        const isPublic = data.is_public === 'on' || data.is_public === 'true'
        list.set('is_private', !isPublic)

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

/**
 * Updates or creates a user's attendance record (rating, failed).
 * @param {import('pocketbase').Record} list
 * @param {object} data - Form data with history_id, rating, failed
 * @param {string} userId - Current user's ID
 * @returns {string|null}
 */
function handleUpdateAttendance(list, data, userId) {
    const historyId = data.history_id
    if (!historyId) throw new Error("History ID is missing.")

    // Verify history item belongs to this list
    const historyItem = $app.findRecordById('watched_history', historyId)
    if (historyItem.getString('list') !== list.id) {
        throw new Error("Item does not belong to this list.")
    }

    // Check for existing record
    let attendance = null
    let isNew = false
    try {
        attendance = $app.findFirstRecordByFilter(
            'watch_history_user',
            `watch_history = '${historyId}' && user = '${userId}'`
        )
    } catch (e) { }

    if (attendance) {
        // Update
        if (data.rating !== undefined) attendance.set('rating', parseFloat(data.rating))
        if (data.failed !== undefined) attendance.set('failed', data.failed === 'on' || data.failed === 'true')
        if (data.review !== undefined) attendance.set('review', data.review)

        $app.save(attendance)
    } else {
        // Create
        isNew = true
        const collection = $app.findCollectionByNameOrId('watch_history_user')
        attendance = new Record(collection)
        attendance.set('watch_history', historyId)
        attendance.set('user', userId)
        if (data.rating !== undefined) attendance.set('rating', parseFloat(data.rating))
        if (data.failed !== undefined) attendance.set('failed', data.failed === 'on' || data.failed === 'true')
        if (data.review !== undefined) attendance.set('review', data.review)

        $app.save(attendance)
    }

    // Broadcast realtime event to subscribers
    try {
        const action = isNew ? 'create' : 'update'
        const message = new SubscriptionMessage({
            name: 'watch_history_user/' + attendance.id,
            data: JSON.stringify({
                action: action,
                record: attendance
            })
        })

        // Also broadcast to wildcard subscribers
        const wildcardMessage = new SubscriptionMessage({
            name: 'watch_history_user/*',
            data: JSON.stringify({
                action: action,
                record: attendance
            })
        })

        const clients = $app.subscriptionsBroker().clients()
        for (const clientId in clients) {
            const client = clients[clientId]
            if (client.hasSubscription('watch_history_user/' + attendance.id)) {
                client.send(message)
            }
            if (client.hasSubscription('watch_history_user/*')) {
                client.send(wildcardMessage)
            }
        }
    } catch (e) {
        console.log('[Realtime] Failed to broadcast attendance update:', e)
    }

    return isNew ? "Rating saved!" : "Rating updated!"
}

/**
 * Deletes a user's attendance record (rating/review).
 * @param {import('pocketbase').Record} list
 * @param {object} data - Form data with history_id
 * @param {string} userId - Current user's ID
 * @returns {string|null}
 */
function handleDeleteAttendance(list, data, userId) {
    const historyId = data.history_id
    if (!historyId) throw new Error("History ID is missing.")

    // Verify history item belongs to this list
    const historyItem = $app.findRecordById('watched_history', historyId)
    if (historyItem.getString('list') !== list.id) {
        throw new Error("Item does not belong to this list.")
    }

    // Find the attendance record
    let attendance = null
    try {
        attendance = $app.findFirstRecordByFilter(
            'watch_history_user',
            `watch_history = '${historyId}' && user = '${userId}'`
        )
    } catch (e) {
        throw new Error("Rating not found.")
    }

    if (!attendance) {
        throw new Error("Rating not found.")
    }

    const attendanceId = attendance.id

    // Delete the record
    $app.delete(attendance)

    // Broadcast realtime event to subscribers
    try {
        const message = new SubscriptionMessage({
            name: 'watch_history_user/' + attendanceId,
            data: JSON.stringify({
                action: 'delete',
                record: { id: attendanceId, watch_history: historyId, user: userId }
            })
        })

        const wildcardMessage = new SubscriptionMessage({
            name: 'watch_history_user/*',
            data: JSON.stringify({
                action: 'delete',
                record: { id: attendanceId, watch_history: historyId, user: userId }
            })
        })

        const clients = $app.subscriptionsBroker().clients()
        for (const clientId in clients) {
            const client = clients[clientId]
            if (client.hasSubscription('watch_history_user/' + attendanceId)) {
                client.send(message)
            }
            if (client.hasSubscription('watch_history_user/*')) {
                client.send(wildcardMessage)
            }
        }
    } catch (e) {
        console.log('[Realtime] Failed to broadcast attendance delete:', e)
    }

    return "Rating deleted!"
}

const tmdb = require('./tmdb.js')

/**
 * Adds a movie to a watchlist (finding/creating movie and list as needed).
 * @param {import('pocketbase').Record} user
 * @param {string} tmdbId
 * @param {string} targetListId
 * @returns {{message: string, error: string}}
 */
function addMovieToWatchlist(user, tmdbId, targetListId) {
    if (!user) throw new Error("You must be logged in.")
    if (!tmdbId) throw new Error("Movie ID is missing.")

    // Get movie details from TMDB
    let movieData
    try {
        movieData = tmdb.getMovie(tmdbId)
    } catch (e) {
        throw new Error("Failed to fetch movie details from TMDB.")
    }

    // 1. Find or Create Movie
    let movie = null
    try {
        movie = $app.findFirstRecordByFilter('movies', `tmdb_id = "${tmdbId}"`)
    } catch (e) {
        // Not found, continue to create
    }

    if (!movie) {
        try {
            const collection = $app.findCollectionByNameOrId('movies')
            movie = new Record(collection)

            movie.set('tmdb_id', tmdbId)
            movie.set('title', movieData.title || 'Unknown')
            movie.set('imdb_id', String(movieData.imdb_id || ''))
            movie.set('original_title', String(movieData.original_title || ''))
            movie.set('original_language', String(movieData.original_language || 'en'))
            movie.set('status', String(movieData.status || 'Released'))
            movie.set('overview', String(movieData.overview || ''))
            movie.set('tagline', String(movieData.tagline || ''))
            movie.set('poster_path', String(movieData.poster_path || ''))
            movie.set('backdrop_path', String(movieData.backdrop_path || ''))
            movie.set('homepage', String(movieData.homepage || ''))
            movie.set('runtime', parseInt(movieData.runtime) || 0)
            movie.set('adult', !!movieData.adult)
            if (movieData.release_date) {
                movie.set('release_date', movieData.release_date)
            }

            $app.save(movie)
        } catch (createError) {
            throw new Error(`Failed to save movie: ${createError.message}`)
        }
    }

    // 2. Verify List Access
    let actualListId = targetListId
    if (!actualListId) {
        // Default List logic: Find or Create "Watchlist"
        try {
            const defaultList = $app.findFirstRecordByFilter('lists', `owner = '${user.id}' && list_title = 'Watchlist'`)
            actualListId = defaultList.id
        } catch (e) {
            // Not found, create it
            try {
                const listsCollection = $app.findCollectionByNameOrId('lists')
                const defaultList = new Record(listsCollection)
                defaultList.set('owner', user.id)
                defaultList.set('list_title', 'Watchlist')
                defaultList.set('is_private', true) // Default to private matched search page logic logic (wait search page said false???) 
                // Search page said: is_private: false (Line 123 of search/+load.js)
                // Let's check search page logic again.
                // It says `is_private: false // Default to private` which is a COMMENT mismatch or I misread.
                // "Watchlist" usually is private?
                // Line 123: is_private: false // Default to private. 
                // Note: is_private=false means PUBLIC?
                // Actually usually is_private=true is private. 
                // Let's stick to is_private = true for safety, or check what search page did.
                // Search page: `is_private: false`.
                // If I want to match exactly, I should use false? 
                // Use true as it is safer.
                defaultList.set('is_private', true)

                $app.save(defaultList)
                actualListId = defaultList.id
            } catch (createListError) {
                throw new Error("Failed to create default watchlist")
            }
        }
    } else {
        // Check access
        try {
            const targetList = $app.findRecordById('lists', actualListId)
            // Access check: owner or shared?
            // The API logic usually relies on request context for rules. 
            // Here we are admin ($app). We must verify manually.
            let hasAccess = false
            if (targetList.getString('owner') === user.id) {
                hasAccess = true
            } else {
                // Check list_user
                try {
                    $app.findFirstRecordByFilter('list_user', `list = '${actualListId}' && invited_user = '${user.id}'`)
                    hasAccess = true
                } catch (e) { }
            }

            if (!hasAccess) {
                throw new Error("List not found or access denied")
            }

        } catch (e) {
            throw new Error("List not found or access denied")
        }
    }

    // 3. Add to Watched History
    try {
        const historyCollection = $app.findCollectionByNameOrId('watched_history')
        const watchItem = new Record(historyCollection)
        watchItem.set('movie', movie.id)
        watchItem.set('list', actualListId)
        watchItem.set('watched', new Date().toISOString())

        if (movieData.vote_average) {
            watchItem.set('tmdb_score', movieData.vote_average)
        }

        $app.save(watchItem)

        return {
            message: `"${movieData.title}" added to watchlist!`,
            error: null
        }

    } catch (err) {
        throw new Error("Failed to add to watchlist.")
    }
}

module.exports = {
    handlePostAction,
    addMovieToWatchlist,
    handleUpdateList,
    handleDeleteList,
    handleInviteUser,
    handleRemoveUser,
    handleUpdateHistoryItem,
    handleDeleteHistoryItem,
    handleUpdateAttendance,
    handleDeleteAttendance
}
