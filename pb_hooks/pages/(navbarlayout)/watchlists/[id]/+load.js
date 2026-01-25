/**
 * @type {import('pocketpages').PageDataLoaderFunc}
 */
module.exports = function (api) {
    const user = api.request.auth?.id

    // Attempt to get ID from params (likely merged path and query params)
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
        list = $app.findRecordById('lists', listId)
        if (list.getBool('is_deleted')) {
            throw new Error("List deleted")
        }
    } catch (e) {
        return {
            list: null,
            movies: [],
            error: "List not found."
        }
    }

    const isPrivate = list.getBool('is_private')
    const owner = list.getString('owner')
    const isOwner = (user && owner === user)

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
        }

        const action = data.action

        if (action === 'update_list') {
            const newTitle = data.list_title
            if (newTitle) {
                try {
                    if (!isOwner) throw new Error("Only the owner can update the list.")

                    list.set('list_title', newTitle)
                    $app.save(list)

                    message = "List updated successfully!"
                } catch (e) {
                    error = e.message
                }
            }
        }
        else if (action === 'delete_list') {
            try {
                if (!isOwner) throw new Error("Only the owner can delete the list.")

                list.set('is_deleted', true)
                $app.save(list)

                // Redirect to watchlists page since this one is now "gone"
                return {
                    redirect: '/watchlists'
                }
            } catch (e) {
                error = e.message
            }
        }
        else if (action === 'invite_user') {
            const email = data.email
            const targetUserId = data.user_id

            if (email || targetUserId) {
                try {
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

                    message = `User ${invitedUser.getString('email')} invited successfully!`
                } catch (e) {
                    error = e.message
                }
            }
        }
    }

    // 2. Fetch movies
    try {
        const historyRecords = $app.findRecordsByFilter(
            'watched_history',
            `list = '${listId}'`,
            '-created',
            100,
            0,
            { expand: 'movie' }
        )

        const movies = historyRecords.map((item) => {
            const m = item.expandedOne('movie')
            if (m) {
                return {
                    id: m.id,
                    tmdb_id: m.getString('tmdb_id'),
                    title: m.getString('title'),
                    release_date: m.getString('release_date'),
                    poster_path: m.getString('poster_path'),
                    overview: m.getString('overview'),
                    history_id: item.id,
                }
            }
            return null
        }).filter(Boolean)


        // 3. Fetch potential users to invite (if owner)
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

        return {
            list: {
                id: list.id,
                title: list.getString('list_title'),
                created: list.getString('created'),
                is_owner: isOwner
            },
            movies,
            users: potentialUsers,
            error,
            message
        }

    } catch (e) {
        console.error('Failed to load list items:', e)
        return {
            list: {
                id: list.id,
                title: list.getString('list_title'),
                created: list.getString('created'),
                is_owner: isOwner
            },
            movies: [],
            error: "Failed to load movies for this list.",
            message,
            users: [] // Ensure users is always present, even on error
        }
    }
}
