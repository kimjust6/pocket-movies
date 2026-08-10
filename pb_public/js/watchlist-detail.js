/**
 * Alpine.js component for the watchlist detail page.
 * Manages the state of Share and Edit modals, table sorting, and infinite scroll.
 */
function watchlistDetail(initialMovies = null, isOwner = null, listId = null, initialHasMore = null, currentUserId = null) {
    let contextData = {};
    if (initialMovies === null || listId === null) {
        try {
            const contextEl = document.getElementById('watchlist-context');
            if (contextEl && contextEl.textContent) {
                contextData = JSON.parse(contextEl.textContent);
            }
        } catch (e) {
            console.error('[watchlistDetail] Error parsing context:', e);
        }
    }

    const resolvedMovies = initialMovies !== null ? initialMovies : (contextData.movies || []);
    const resolvedIsOwner = isOwner !== null ? isOwner : (contextData.isOwner || false);
    const resolvedListId = listId !== null ? listId : (contextData.listId || '');
    const resolvedHasMore = initialHasMore !== null ? initialHasMore : (contextData.hasMore !== undefined ? contextData.hasMore : true);
    const resolvedCurrentUserId = currentUserId !== null ? currentUserId : (contextData.currentUserId || '');
    const resolvedMembers = contextData.members || [];

    return {
        /**
         * List members with IDs and names.
         * @type {Array}
         */
        members: resolvedMembers,

        /**
         * Movies array for the watchlist.
         * @type {Array}
         */
        movies: resolvedMovies,

        /**
         * Whether the current user is the owner.
         * @type {boolean}
         */
        isOwner: resolvedIsOwner,

        /**
         * The ID of the current logged-in user.
         * @type {string}
         */
        currentUserId: resolvedCurrentUserId,

        /**
         * The watchlist ID for API calls.
         * @type {string}
         */
        listId: resolvedListId,

        /**
         * Current page for pagination.
         * @type {number}
         */
        currentPage: 1,

        /**
         * Whether there are more items to load.
         * @type {boolean}
         */
        hasMore: resolvedHasMore,

        /**
         * Whether we are currently loading more items.
         * @type {boolean}
         */
        isLoading: false,

        /**
         * Items per page for API requests.
         * @type {number}
         */
        pageSize: 30,

        /**
         * Current sort column.
         * @type {string}
         */
        sortColumn: 'watched_at',

        /**
         * Current sort direction: 'asc' or 'desc'.
         * @type {string}
         */
        sortDirection: 'desc',

        /**
         * Whether the rating modal is in read-only mode.
         * @type {boolean}
         */
        isRatingReadOnly: false,

        /**
         * Whether the user has an existing rating for the current movie.
         * @type {boolean}
         */
        hasExistingRating: false,

        /**
         * Controls the visibility of the Share Watchlist modal.
         * @type {boolean}
         */
        showShareModal: false,

        /**
         * Controls the visibility of the Edit Watchlist modal.
         * @type {boolean}
         */
        showEditModal: false,

        /**
         * Controls the visibility of the Delete Confirmation modal.
         * @type {boolean}
         */
        showDeleteModal: false,

        /**
         * Controls the visibility of the Update Date modal.
         * @type {boolean}
         */
        showDateModal: false,

        /**
         * State for ratings sync operation in modal.
         * @type {boolean}
         */
        isSyncingRatings: false,

        /**
         * Poster path for the movie currently being edited in the modal.
         * @type {string}
         */
        editPosterPath: '',

        /**
         * State for the generic confirmation modal.
         * @type {object}
         */
        confirmModal: {
            show: false,
            title: '',
            subtitle: '',
            message: '',
            confirmText: 'Confirm',
            onConfirm: () => { },
            onCancel: null
        },

        /**
         * The ID of the history item being edited.
         * @type {string}
         */
        editHistoryId: '',

        /**
         * The title of the movie being edited.
         * @type {string}
         */
        editMovieTitle: '',

        /**
         * The current watched date value for the edit form.
         * @type {string}
         */
        editDateValue: '',

        /**
         * The current IMDB score for the edit form.
         * @type {string}
         */
        editImdbScore: '',

        /**
         * The current TMDB score for the edit form.
         * @type {string}
         */
        editTmdbScore: '',

        /**
         * The current RT score for the edit form.
         * @type {string}
         */
        editRtScore: '',

        /**
         * Controls the visibility of the User Rating modal.
         * @type {boolean}
         */
        showRatingModal: false,

        /**
         * The user's rating score for the edit form.
         * @type {number|string}
         */
        editUserRating: '',

        /**
         * The current user failed status for the edit form.
         * @type {boolean}
         */
        editUserFailed: false,

        /**
         * The 3-state movie completion status: 'watched' | 'didnt_watch' | 'bailed'.
         * @type {string}
         */
        editWatchStatus: 'didnt_watch',

        /**
         * The current user review for the edit form.
         * @type {string}
         */
        editUserReview: '',

        /**
         * The user ID for the rating modal.
         * @type {string}
         */
        editRatingUserId: '',

        /**
         * The user name for the rating modal.
         * @type {string}
         */
        editRatingUserName: '',

        /**
         * The title for the rating modal.
         * @type {string}
         */
        ratingModalTitle: 'Update My Score',

        init() {
            // Parse URL params for sort
            const urlParams = new URLSearchParams(window.location.search);
            const sortParam = urlParams.get('sort');
            const dirParam = urlParams.get('dir');

            if (sortParam) {
                this.sortColumn = sortParam;
            }
            if (dirParam && (dirParam === 'asc' || dirParam === 'desc')) {
                this.sortDirection = dirParam;
            }

            // Only run client-side sort on init if sort parameter is user-specific (server handles standard columns)
            if (this.sortColumn && this.sortColumn.startsWith('user_')) {
                this.applySort();
            }

            this.updateNavbarHeight();

            // Set up intersection observer for infinite scroll
            this.$nextTick(() => {
                this.setupInfiniteScroll();
            });

            window.addEventListener('resize', () => {
                this.updateNavbarHeight();
            });

            // Set up realtime subscription for watched_history updates
            this.setupRealtimeSubscription();
        },

        /**
         * Sets up PocketBase realtime subscription for watched_history and watch_history_user tables.
         * Subscribes to changes filtered by the current list ID.
         */
        setupRealtimeSubscription() {
            if (!this.listId || typeof PocketBase === 'undefined') {
                console.warn('[Realtime] PocketBase not available or listId missing');
                return;
            }

            // Initialize PocketBase client and load auth from cookie
            const pb = new PocketBase(window.location.origin);

            // Load auth from cookie if available (pb_auth cookie set by server)
            try {
                const cookies = document.cookie.split(';').reduce((acc, cookie) => {
                    const [key, ...rest] = cookie.trim().split('=');
                    acc[key] = rest.join('=');
                    return acc;
                }, {});

                if (cookies.pb_auth) {
                    const authData = JSON.parse(decodeURIComponent(cookies.pb_auth));
                    if (authData.token) {
                        pb.authStore.save(authData.token, authData.record);
                        console.log('[Realtime] Auth loaded, user:', pb.authStore.model?.id);
                    }
                } else {
                    console.log('[Realtime] No pb_auth cookie found, subscribing as anonymous');
                }
            } catch (e) {
                console.log('[Realtime] Error parsing auth cookie:', e);
            }

            // Subscribe to watched_history table changes for this specific list
            pb.collection('watched_history').subscribe('*', (e) => {
                this.handleRealtimeEvent(e);
            }, {
                filter: `list = "${this.listId}"`
            }).then(() => {
                console.log('[Realtime] Subscribed to watched_history for list:', this.listId);
            }).catch((err) => {
                console.error('[Realtime] watched_history subscription error:', err);
            });

            // Subscribe to watch_history_user table changes (ratings/reviews)
            // We subscribe to all changes but filter client-side based on loaded movies
            pb.collection('watch_history_user').subscribe('*', (e) => {
                this.handleRatingRealtimeEvent(e);
            }).then(() => {
                console.log('[Realtime] Subscribed to watch_history_user for ratings');
            }).catch((err) => {
                console.error('[Realtime] watch_history_user subscription error:', err);
            });

            // Store reference for cleanup
            this.pb = pb;

            // Cleanup on page unload
            window.addEventListener('beforeunload', () => {
                if (this.pb) {
                    this.pb.collection('watched_history').unsubscribe('*');
                    this.pb.collection('watch_history_user').unsubscribe('*');
                }
            });
        },

        /**
         * Handles realtime events from PocketBase.
         * @param {object} e - The realtime event object with action and record properties.
         */
        async handleRealtimeEvent(e) {
            const { action, record } = e;
            console.log('[Realtime] Event received:', action, record?.id);

            // For delete action, we don't need to fetch from API
            if (action === 'delete') {
                const historyId = record.id;
                this.movies = this.movies.filter(m => m.history_id !== historyId);
                return;
            }

            // Fetch the updated movie data from the API to get full details with attendance
            try {
                const response = await this.fetchWithRetry(
                    `/api/watchlists/movies?listId=${this.listId}&historyId=${record.id}`
                );
                const data = await response.json();

                if (action === 'create') {
                    // Add new movie to the list if we have the data
                    if (data.success && data.movies && data.movies.length > 0) {
                        const newMovie = data.movies[0];
                        // Check if it already exists (avoid duplicates)
                        const exists = this.movies.some(m => m.history_id === newMovie.history_id);
                        if (!exists) {
                            this.movies.unshift(newMovie);
                            this.applySort();
                        }
                    }
                } else if (action === 'update') {
                    // Update existing movie in the list
                    if (data.success && data.movies && data.movies.length > 0) {
                        const updatedMovie = data.movies[0];
                        const index = this.movies.findIndex(m => m.history_id === updatedMovie.history_id);
                        if (index !== -1) {
                            this.movies[index] = updatedMovie;
                            this.applySort();
                        }
                    }
                }
            } catch (error) {
                console.error('[Realtime] Error handling event:', error);
            }
        },

        /**
         * Handles realtime events for rating/review changes from watch_history_user table.
         * @param {object} e - The realtime event object with action and record properties.
         */
        handleRatingRealtimeEvent(e) {
            const { action, record } = e;

            // Debug: log the full record to see field names
            console.log('[Realtime] Rating raw event:', action, JSON.stringify(record));

            // PocketBase realtime sends field names as defined in schema (snake_case)
            const watchHistoryId = record.watch_history;
            const userId = record.user;

            if (!watchHistoryId) {
                console.log('[Realtime] No watch_history field found in record');
                return;
            }

            // Check if this rating change is for a movie we have loaded
            const movieIndex = this.movies.findIndex(m => m.history_id === watchHistoryId);
            if (movieIndex === -1) {
                console.log('[Realtime] Rating for unloaded movie, ignoring. history_id:', watchHistoryId);
                return;
            }

            console.log('[Realtime] Rating event matched movie at index:', movieIndex, 'action:', action);

            if (action === 'delete') {
                // Remove this user's attendance from the movie
                if (this.movies[movieIndex].attendance && this.movies[movieIndex].attendance[userId]) {
                    delete this.movies[movieIndex].attendance[userId];
                    // Trigger Alpine.js reactivity by creating new array
                    this.movies = [...this.movies];
                    console.log('[Realtime] Deleted rating for user:', userId);
                }
                return;
            }

            // For create or update, update the attendance data
            if (!this.movies[movieIndex].attendance) {
                this.movies[movieIndex].attendance = {};
            }

            const recRating = (record.rating !== undefined && record.rating !== null && record.rating >= 0) ? record.rating : -1;
            this.movies[movieIndex].attendance[userId] = {
                id: record.id,
                rating: recRating,
                review: record.review || '',
                failed: record.failed || false,
                status: record.failed ? 'bailed' : 'watched',
                created: record.created
            };

            console.log('[Realtime] Updated attendance for user:', userId, 'rating:', record.rating);

            // Trigger Alpine.js reactivity by creating new array
            this.movies = [...this.movies];

            // Re-sort if we're sorted by this user's rating
            if (this.sortColumn === 'user_' + userId) {
                this.applySort();
            }
        },

        updateNavbarHeight() {
            const navbar = document.querySelector('.navbar');
            if (navbar) {
                const height = navbar.offsetHeight;
                document.documentElement.style.setProperty('--navbar-height', height + 'px');
            }
        },

        setupInfiniteScroll() {
            const sentinel = document.getElementById('scroll-sentinel');
            if (!sentinel) return;

            const observer = new IntersectionObserver((entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting && this.hasMore && !this.isLoading) {
                        this.loadMore();
                    }
                });
            }, {
                rootMargin: '200px'
            });

            observer.observe(sentinel);
        },

        async loadMore(isReset = false) {
            if (!isReset && (this.isLoading || !this.hasMore)) return;

            this.isLoading = true;
            this.currentPage++;

            try {
                const sortParam = this.getDbSortParam();
                const url = `/api/watchlists/movies?listId=${this.listId}&page=${this.currentPage}&limit=${this.pageSize}&sort=${encodeURIComponent(sortParam)}`;

                // Use fetchWithRetry helper
                const response = await this.fetchWithRetry(url);
                const text = await response.text();

                let data;
                try {
                    data = JSON.parse(text);
                } catch (parseError) {
                    console.error('[Infinite Scroll] JSON parse error:', parseError);
                    this.hasMore = false;
                    return;
                }

                if (data.success && data.movies && data.movies.length > 0) {
                    if (isReset) {
                        this.movies = data.movies;
                    } else {
                        // Filter out duplicates based on history_id
                        const existingIds = new Set(this.movies.map(m => m.history_id));
                        const newMovies = data.movies.filter(m => !existingIds.has(m.history_id));
                        this.movies = [...this.movies, ...newMovies];
                    }

                    this.hasMore = data.hasMore;
                    this.applySort();
                } else {
                    if (isReset) {
                        this.movies = [];
                    }
                    this.hasMore = false;
                }
            } catch (error) {
                console.error('[Infinite Scroll] Failed to load more movies:', error);
                this.hasMore = false;
            } finally {
                this.isLoading = false;
            }
        },

        async fetchWithRetry(url, options = {}, retries = 3, backoff = 300) {
            try {
                const response = await fetch(url, options);
                if (!response.ok) {
                    if (retries > 0 && (response.status >= 500 || response.status === 429)) {
                        await new Promise(resolve => setTimeout(resolve, backoff));
                        return this.fetchWithRetry(url, options, retries - 1, backoff * 2);
                    }
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response;
            } catch (error) {
                if (retries > 0) {
                    await new Promise(resolve => setTimeout(resolve, backoff));
                    return this.fetchWithRetry(url, options, retries - 1, backoff * 2);
                }
                throw error;
            }
        },

        getDbSortParam() {
            const colMap = {
                'watched_at': 'watched',
                'title': 'movie.title',
                'release_date': 'movie.release_date',
                'runtime': 'movie.runtime',
                'tmdb_score': 'tmdb_score',
                'imdb_score': 'imdb_score',
                'rt_score': 'rt_score'
            };
            const col = colMap[this.sortColumn] || 'created';
            const dir = this.sortDirection === 'asc' ? '+' : '-';
            return dir + col;
        },

        sortByUser(userId) {
            if (this.isLoading) return;
            const column = 'user_' + userId;

            if (this.sortColumn === column) {
                this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
            } else {
                this.sortColumn = column;
                this.sortDirection = 'desc'; // Default to desc for ratings (high to low)
            }

            // For user specific sort, we only do client side sort of loaded movies
            this.applySort();
            this.updateUrlParams();
        },

        sortBy(column) {
            if (this.isLoading) return;

            if (this.sortColumn === column) {
                this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
            } else {
                this.sortColumn = column;
                this.sortDirection = 'asc';
            }

            if (this.hasMore) {
                this.isLoading = true;
                this.currentPage = 0;
                this.loadMore(true);
            } else {
                this.applySort();
            }
            this.updateUrlParams();
        },

        applySort() {
            const col = this.sortColumn;
            const dir = this.sortDirection;

            this.movies.sort((a, b) => {
                let valA, valB;

                if (col.startsWith('user_')) {
                    const userId = col.split('_')[1];
                    const hasA = a.attendance && a.attendance[userId] && a.attendance[userId].rating !== undefined && a.attendance[userId].rating !== null && a.attendance[userId].rating >= 0;
                    const hasB = b.attendance && b.attendance[userId] && b.attendance[userId].rating !== undefined && b.attendance[userId].rating !== null && b.attendance[userId].rating >= 0;
                    valA = hasA ? a.attendance[userId].rating : -1;
                    valB = hasB ? b.attendance[userId].rating : -1;
                } else {
                    valA = a[col];
                    valB = b[col];
                }

                if (valA == null) valA = '';
                if (valB == null) valB = '';

                if (typeof valA === 'string' && typeof valB === 'string') {
                    valA = valA.toLowerCase();
                    valB = valB.toLowerCase();
                }

                if (valA < valB) return dir === 'asc' ? -1 : 1;
                if (valA > valB) return dir === 'asc' ? 1 : -1;
                return 0;
            });
        },

        getSortIcon(column) {
            if (this.sortColumn !== column) return '';
            return this.sortDirection === 'asc' ? '↑' : '↓';
        },

        formatDate(dateStr) {
            if (!dateStr) return 'N/A';
            const date = new Date(dateStr);
            return date.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
        },

        formatRating(val) {
            if (val === null || val === undefined || val === '') return '-';
            const num = parseFloat(val);
            if (isNaN(num) || num < 0) return '-';
            if (num % 1 === 0) return num.toFixed(1);
            return num.toString();
        },

        openDeleteModal() {
            this.showEditModal = false;
            this.showDeleteModal = true;
        },

        openItemDeleteModal() {
            this.showDateModal = false;

            // Store context for confirmation
            const historyId = this.editHistoryId;
            const movieTitle = this.editMovieTitle;

            this.confirmModal = {
                show: true,
                title: 'Remove Movie?',
                subtitle: movieTitle,
                message: 'Are you sure you want to remove this movie from your watchlist?',
                confirmText: 'Remove',
                onConfirm: () => this.confirmDeleteMovie(historyId),
                onCancel: () => {
                    this.confirmModal.show = false;
                    this.showDateModal = true;
                }
            };
        },

        async confirmDeleteMovie(historyId) {
            this.confirmModal.show = false;

            const index = this.movies.findIndex(m => m.history_id === historyId);
            if (index === -1) return;

            // Optimistic removal
            const movie = this.movies[index];
            this.movies.splice(index, 1);
            this.movies = [...this.movies]; // Trigger reactivity

            const formData = new FormData();
            formData.append('action', 'delete_history_item');
            formData.append('history_id', historyId);
            formData.append('list_id', this.listId);

            try {
                const response = await fetch('/api/watchlists/movies', {
                    method: 'POST',
                    body: formData
                });
                const result = await response.json();

                if (!result.success) {
                    console.error('Delete failed:', result.error);
                    this.movies.splice(index, 0, movie); // Revert
                    this.movies = [...this.movies];
                    alert(result.error || 'Failed to remove movie.');
                }
            } catch (error) {
                console.error('Delete failed:', error);
                this.movies.splice(index, 0, movie); // Revert
                this.movies = [...this.movies];
                alert('An error occurred. Changes reverted.');
            }
        },

        openEditMovieModal(movie) {
            this.editHistoryId = movie.history_id;
            this.editMovieTitle = movie.title || '';
            this.editPosterPath = movie.poster_path || '';
            this.editDateValue = movie.watched_at ? new Date(movie.watched_at).toISOString().slice(0, 10) : '';
            this.editTmdbScore = (movie.tmdb_score !== undefined && movie.tmdb_score !== null && movie.tmdb_score !== 0) ? Number(movie.tmdb_score).toFixed(1) : '';
            this.editImdbScore = (movie.imdb_score !== undefined && movie.imdb_score !== null && movie.imdb_score !== 0) ? Number(movie.imdb_score).toFixed(1) : '';
            this.editRtScore = (movie.rt_score !== undefined && movie.rt_score !== null && movie.rt_score >= 0) ? movie.rt_score : '';
            this.isSyncingRatings = false;
            this.showDateModal = true;
        },

        async syncRatings() {
            if (!this.editHistoryId) return;

            this.isSyncingRatings = true;

            const formData = new FormData();
            formData.append('action', 'sync_ratings');
            formData.append('history_id', this.editHistoryId);
            formData.append('list_id', this.listId);

            try {
                const response = await fetch('/api/watchlists/movies', {
                    method: 'POST',
                    body: formData
                });
                const result = await response.json();

                if (result.success) {
                    this.editTmdbScore = (result.tmdb_score !== null && result.tmdb_score !== undefined && result.tmdb_score !== 0) ? Number(result.tmdb_score).toFixed(1) : '';
                    this.editImdbScore = (result.imdb_score !== null && result.imdb_score !== undefined && result.imdb_score !== 0) ? Number(result.imdb_score).toFixed(1) : '';
                    this.editRtScore = (result.rt_score !== null && result.rt_score !== undefined && result.rt_score >= 0) ? result.rt_score : '';

                    if (result.poster_path !== undefined) {
                        this.editPosterPath = result.poster_path || '';
                        const index = this.movies.findIndex(m => m.history_id === this.editHistoryId);
                        if (index !== -1) {
                            this.movies[index].poster_path = result.poster_path;
                            this.movies = [...this.movies];
                        }
                    }
                } else {
                    alert(result.error || 'Failed to sync ratings.');
                }
            } catch (error) {
                console.error('Failed to sync ratings:', error);
                alert('An error occurred while syncing ratings.');
            } finally {
                this.isSyncingRatings = false;
            }
        },

        /**
         * Opens the user rating modal for a specific movie and user.
         * @param {object} movie - The movie object.
         * @param {string} userId - The user ID whose rating we are viewing/editing.
         * @param {string} [userName] - Optional display name of the user.
         */
        openRatingModal(movie, userId, userName = '') {
            this.editHistoryId = movie.history_id;
            this.editMovieTitle = movie.title || '';
            this.editRatingUserId = userId;

            if (!userName) {
                const member = this.members ? this.members.find(m => m.id === userId) : null;
                userName = member ? member.name : (userId === this.currentUserId ? 'My' : 'User');
            }
            this.editRatingUserName = userName;

            // Determine if read-only
            this.isRatingReadOnly = (userId !== this.currentUserId);
            if (this.isRatingReadOnly) {
                const possessive = userName ? (userName.endsWith('s') || userName.endsWith('S') ? `${userName}'` : `${userName}'s`) : "User's";
                this.ratingModalTitle = `${possessive} Rating`;
            } else {
                this.ratingModalTitle = 'Update My Score';
            }

            // Get existing attendance if any
            const attendance = movie.attendance && movie.attendance[userId];
            if (attendance) {
                this.editUserRating = (attendance.rating !== undefined && attendance.rating !== null && attendance.rating >= 0) ? attendance.rating : '';
                this.editUserFailed = !!attendance.failed;
                this.editWatchStatus = attendance.failed ? 'bailed' : 'watched';
                this.editUserReview = attendance.review || '';
                this.hasExistingRating = true;
            } else {
                this.editUserRating = '';
                this.editUserFailed = false;
                this.editWatchStatus = 'didnt_watch';
                this.editUserReview = '';
                this.hasExistingRating = false;
            }

            this.showRatingModal = true;
        },

        async updateDate() {
            if (!this.editHistoryId) return;

            // Validation
            if (this.editTmdbScore !== "" && (this.editTmdbScore < 0 || this.editTmdbScore > 10)) {
                alert("TMDB Score must be between 0 and 10");
                return;
            }
            if (this.editImdbScore !== "" && (this.editImdbScore < 0 || this.editImdbScore > 10)) {
                alert("IMDB Score must be between 0 and 10");
                return;
            }
            if (this.editRtScore !== "" && (this.editRtScore < 0 || this.editRtScore > 100)) {
                alert("Rotten Tomatoes Score must be between 0 and 100");
                return;
            }

            // 1. Find the item
            const index = this.movies.findIndex(m => m.history_id === this.editHistoryId);
            if (index === -1) return;

            // 2. Backup original state
            const originalMovie = { ...this.movies[index] };

            // 3. Optimistic Update
            // We construct a temporary movie object merging old data with form values
            this.movies[index] = {
                ...originalMovie,
                watched_at: this.editDateValue ? new Date(this.editDateValue).toISOString() : originalMovie.watched_at,
                tmdb_score: this.editTmdbScore ? parseFloat(this.editTmdbScore) : 0,
                imdb_score: this.editImdbScore ? parseFloat(this.editImdbScore) : 0,
                rt_score: (this.editRtScore !== "" && this.editRtScore !== null && this.editRtScore !== undefined) ? parseInt(this.editRtScore) : -1
            };

            // Re-sort the list immediately
            this.applySort();

            // 4. Close modal immediately
            this.showDateModal = false;

            const formData = new FormData();
            formData.append('action', 'update_history_item');
            formData.append('history_id', this.editHistoryId);
            formData.append('watched_date', this.editDateValue);
            formData.append('tmdb_score', this.editTmdbScore);
            formData.append('imdb_score', this.editImdbScore);
            formData.append('rt_score', this.editRtScore);
            formData.append('list_id', this.listId);

            try {
                const response = await fetch('/api/watchlists/movies', {
                    method: 'POST',
                    body: formData
                });
                const result = await response.json();

                if (result.success) {
                    // 5. Success: Update with canonical server data
                    if (result.movie) {
                        // Re-find index just in case list changed (unlikely but safe)
                        const freshIndex = this.movies.findIndex(m => m.history_id === result.movie.history_id);
                        if (freshIndex !== -1) {
                            this.movies[freshIndex] = result.movie;
                        }
                    }
                } else {
                    // 6. Failure: Revert and Alert
                    console.error('Update failed:', result.error);
                    this.movies[index] = originalMovie;
                    // Optional: re-open modal or simple toast
                    alert(result.error || 'Update failed, changes reverted.');
                }
            } catch (error) {
                console.error('Update failed:', error);
                this.movies[index] = originalMovie;
                alert('An error occurred. Changes reverted.');
            }
        },

        async updateRating() {
            if (!this.editHistoryId) return;

            // If Didn't Watch is selected, remove rating/attendance if existing or close
            if (this.editWatchStatus === 'didnt_watch') {
                this.showRatingModal = false;
                if (this.hasExistingRating) {
                    await this.confirmDeleteRating(this.editHistoryId);
                }
                return;
            }

            this.editUserFailed = (this.editWatchStatus === 'bailed');

            // Validation
            if (this.editUserRating !== "" && this.editUserRating !== null) {
                const num = parseFloat(this.editUserRating);
                if (isNaN(num) || num < 0 || num > 10) {
                    alert("Rating must be between 0 and 10");
                    return;
                }
            }

            const parsedRating = (this.editUserRating !== "" && this.editUserRating !== null && !isNaN(parseFloat(this.editUserRating)) && parseFloat(this.editUserRating) >= 0)
                ? parseFloat(this.editUserRating)
                : -1;

            // 1. Find the item
            const index = this.movies.findIndex(m => m.history_id === this.editHistoryId);
            if (index === -1) return;

            // 2. Backup original state
            const originalMovie = JSON.parse(JSON.stringify(this.movies[index])); // Deep copy for nested objects

            // 3. Optimistic Update
            if (!this.movies[index].attendance) this.movies[index].attendance = {};
            if (!this.movies[index].attendance[this.currentUserId]) this.movies[index].attendance[this.currentUserId] = {};

            this.movies[index].attendance[this.currentUserId] = {
                ...this.movies[index].attendance[this.currentUserId],
                rating: parsedRating,
                review: this.editUserReview,
                failed: this.editUserFailed,
                status: this.editWatchStatus
            };

            // Re-sort the list immediately
            this.applySort();

            // 4. Close modal immediately
            this.showRatingModal = false;

            const formData = new FormData();
            formData.append('action', 'update_attendance');
            formData.append('history_id', this.editHistoryId);
            formData.append('rating', parsedRating >= 0 ? parsedRating.toString() : '-1');
            formData.append('review', this.editUserReview);
            formData.append('status', this.editWatchStatus);
            formData.append('failed', this.editUserFailed ? 'on' : 'off');
            formData.append('list_id', this.listId);

            try {
                const response = await fetch('/api/watchlists/movies', {
                    method: 'POST',
                    body: formData
                });
                const result = await response.json();

                if (result.success) {
                    // 5. Success: Update with canonical server data
                    if (result.movie) {
                        const freshIndex = this.movies.findIndex(m => m.history_id === result.movie.history_id);
                        if (freshIndex !== -1) {
                            this.movies[freshIndex] = result.movie;
                        }
                    }
                } else {
                    // 6. Failure
                    console.error('Update failed:', result.error);
                    this.movies[index] = originalMovie;
                    alert(result.error || 'Update failed, changes reverted.');
                }
            } catch (error) {
                console.error('Update failed:', error);
                this.movies[index] = originalMovie;
                alert('An error occurred. Changes reverted.');
            }
        },

        async deleteRating() {
            if (!this.editHistoryId) return;
            const historyId = this.editHistoryId;
            this.showRatingModal = false;
            await this.confirmDeleteRating(historyId);
        },

        async confirmDeleteRating(historyId) {
            // Close modals
            this.showRatingModal = false;
            if (this.confirmModal) this.confirmModal.show = false;
            this.hasExistingRating = false;

            // 1. Find the item
            const index = this.movies.findIndex(m => m.history_id === historyId);
            if (index === -1) return;

            // 2. Backup original state
            const originalMovie = JSON.parse(JSON.stringify(this.movies[index]));

            // 3. Optimistic Update - remove attendance for current user
            if (this.movies[index].attendance && this.movies[index].attendance[this.currentUserId]) {
                delete this.movies[index].attendance[this.currentUserId];
                // Trigger reactivity
                this.movies = [...this.movies];
            }

            // Re-sort if sorted by this user's rating
            if (this.sortColumn === 'user_' + this.currentUserId) {
                this.applySort();
            }

            const formData = new FormData();
            formData.append('action', 'delete_attendance');
            formData.append('history_id', historyId);
            formData.append('list_id', this.listId);

            try {
                const response = await fetch('/api/watchlists/movies', {
                    method: 'POST',
                    body: formData
                });
                const result = await response.json();

                if (!result.success) {
                    console.error('Delete failed:', result.error);
                    this.movies[index] = originalMovie;
                    this.movies = [...this.movies];
                    alert(result.error || 'Delete failed, changes reverted.');
                }
            } catch (error) {
                console.error('Delete failed:', error);
                this.movies[index] = originalMovie;
                this.movies = [...this.movies];
                alert('An error occurred. Changes reverted.');
            }
        },

        /**
         * State for Watchlist Charts Modal
         */
        showChartsModal: false,
        activeChartTab: 'overview',
        isChartsLoading: false,
        isChartsFullscreen: false,
        selectedUserFilter: 'all',
        selectedTimeMetric: 'movies_month',
        chartInstances: {},
        allMoviesForCharts: [],
        chartStats: {
            totalCount: 0,
            watchedCount: 0,
            bailedCount: 0,
            completionRate: 0,
            totalRuntimeMinutes: 0,
            formattedRuntime: '0h',
            avgRuntime: 0,
            avgTmdb: null,
            avgImdb: null,
            avgRt: null,
            avgMemberScore: null,
            topMovieTitle: '',
            topMovieScore: null,
            longestMovieTitle: '',
            longestMovieRuntime: 0,
            shortestMovieTitle: '',
            shortestMovieRuntime: 0,
            hasMemberRatings: false,
            memberStatusData: { labels: [], watched: [], bailed: [], unrated: [] }
        },

        toggleChartsFullscreen() {
            this.isChartsFullscreen = !this.isChartsFullscreen;
            this.$nextTick(() => {
                this.renderActiveTabCharts();
            });
        },

        onUserFilterChange() {
            const source = this.allMoviesForCharts.length > 0 ? this.allMoviesForCharts : this.movies;
            this.computeWatchlistStats(source);
            this.$nextTick(() => {
                this.renderActiveTabCharts();
            });
        },

        onTimeMetricChange() {
            this.$nextTick(() => {
                this.renderActiveTabCharts();
            });
        },

        getTimeMetricLabel() {
            switch (this.selectedTimeMetric) {
                case 'hours_month': return 'Watch Hours per Month';
                case 'movies_year': return 'Movies Logged per Year';
                case 'hours_year': return 'Watch Hours per Year';
                case 'cumulative_movies': return 'Cumulative Movies Logged';
                case 'cumulative_hours': return 'Cumulative Hours Watched';
                case 'movies_month':
                default: return 'Movies Logged per Month';
            }
        },

        async openChartsModal() {
            this.showChartsModal = true;
            this.isChartsLoading = true;

            let sourceMovies = [...this.movies];

            if (this.hasMore && this.listId) {
                try {
                    const res = await fetch(`/api/watchlists/movies?listId=${this.listId}&page=1&limit=500&sort=${this.sortColumn}`);
                    const data = await res.json();
                    if (data.success && Array.isArray(data.movies)) {
                        sourceMovies = data.movies;
                        this.allMoviesForCharts = data.movies;
                    }
                } catch (e) {
                    console.warn('[Charts] Failed to fetch full dataset, falling back to loaded movies:', e);
                }
            }

            this.computeWatchlistStats(sourceMovies);
            this.isChartsLoading = false;

            this.$nextTick(() => {
                this.renderActiveTabCharts();
            });
        },

        closeChartsModal() {
            this.showChartsModal = false;
            this.isChartsFullscreen = false;
            this.destroyCharts();
        },

        setActiveChartTab(tab) {
            this.activeChartTab = tab;
            this.$nextTick(() => {
                this.renderActiveTabCharts();
            });
        },

        destroyCharts() {
            if (!this.chartInstances) return;
            Object.keys(this.chartInstances).forEach(key => {
                if (this.chartInstances[key] && typeof this.chartInstances[key].destroy === 'function') {
                    this.chartInstances[key].destroy();
                    delete this.chartInstances[key];
                }
            });
        },

        computeWatchlistStats(movieList) {
            if (!Array.isArray(movieList) || movieList.length === 0) {
                this.chartStats = {
                    totalCount: 0,
                    watchedCount: 0,
                    bailedCount: 0,
                    completionRate: 0,
                    totalRuntimeMinutes: 0,
                    formattedRuntime: '0h',
                    avgRuntime: 0,
                    avgTmdb: null,
                    avgImdb: null,
                    avgRt: null,
                    avgMemberScore: null,
                    topMovieTitle: 'N/A',
                    topMovieScore: null,
                    longestMovieTitle: 'N/A',
                    longestMovieRuntime: 0,
                    shortestMovieTitle: 'N/A',
                    shortestMovieRuntime: 0,
                    hasMemberRatings: false,
                    ratingBuckets: [0, 0, 0, 0, 0],
                    decades: {},
                    runtimeBuckets: [0, 0, 0, 0],
                    timeSeriesMonthly: [],
                    timeSeriesYearly: [],
                    memberStats: [],
                    memberStatusData: { labels: [], watched: [], bailed: [], unrated: [] }
                };
                return;
            }

            let filteredList = movieList;
            if (this.selectedUserFilter && this.selectedUserFilter !== 'all') {
                const targetUid = this.selectedUserFilter;
                filteredList = movieList.filter(m => {
                    if (!m.attendance) return false;
                    const att = m.attendance[targetUid];
                    return att && (att.status === 'watched' || att.status === 'bailed' || att.rating > 0);
                });
            }

            let watchedCount = 0;
            let bailedCount = 0;
            let totalRuntime = 0;
            let runtimeMovieCount = 0;

            let tmdbSum = 0, tmdbCount = 0;
            let imdbSum = 0, imdbCount = 0;
            let rtSum = 0, rtCount = 0;
            let memberSumCombined = 0, memberCountCombined = 0;

            let topMovie = null;
            let topScore = -1;
            let longestMovie = null;
            let longestRuntime = -1;
            let shortestMovie = null;
            let shortestRuntime = Infinity;

            const ratingBuckets = [0, 0, 0, 0, 0];
            const decades = {};
            const runtimeBuckets = [0, 0, 0, 0];

            const monthlyMap = {};
            const yearlyMap = {};

            const memberMap = {};
            const memberStatusMap = {};

            (this.members || []).forEach(mem => {
                memberStatusMap[mem.id] = {
                    name: mem.name || mem.email || mem.id,
                    watched: 0,
                    bailed: 0,
                    unrated: 0
                };
            });

            movieList.forEach(m => {
                (this.members || []).forEach(mem => {
                    const statusObj = memberStatusMap[mem.id];
                    if (statusObj) {
                        const att = m.attendance ? m.attendance[mem.id] : null;
                        if (att) {
                            if (att.status === 'bailed') statusObj.bailed++;
                            else statusObj.watched++;
                        } else {
                            statusObj.unrated++;
                        }
                    }
                });
            });

            filteredList.forEach(m => {
                const rt = parseInt(m.runtime, 10);

                if (m.attendance) {
                    if (this.selectedUserFilter !== 'all') {
                        const att = m.attendance[this.selectedUserFilter];
                        if (att && att.status === 'bailed') bailedCount++;
                        else watchedCount++;
                    } else {
                        let hasBailed = false;
                        Object.keys(m.attendance).forEach(uid => {
                            const att = m.attendance[uid];
                            if (att && att.status === 'bailed') hasBailed = true;
                        });
                        if (hasBailed) bailedCount++;
                        else watchedCount++;
                    }

                    Object.keys(m.attendance).forEach(uid => {
                        const att = m.attendance[uid];
                        if (att && typeof att.rating === 'number' && att.rating > 0) {
                            if (this.selectedUserFilter === 'all' || this.selectedUserFilter === uid) {
                                memberSumCombined += att.rating;
                                memberCountCombined++;

                                if (!memberMap[uid]) {
                                    const mem = (this.members || []).find(x => x.id === uid);
                                    memberMap[uid] = {
                                        name: mem ? (mem.name || mem.email || uid) : uid,
                                        sum: 0,
                                        count: 0
                                    };
                                }
                                memberMap[uid].sum += att.rating;
                                memberMap[uid].count += 1;
                            }
                        }
                    });
                } else {
                    watchedCount++;
                }

                if (!isNaN(rt) && rt > 0) {
                    totalRuntime += rt;
                    runtimeMovieCount++;

                    if (rt > longestRuntime) {
                        longestRuntime = rt;
                        longestMovie = m;
                    }
                    if (rt < shortestRuntime) {
                        shortestRuntime = rt;
                        shortestMovie = m;
                    }

                    if (rt < 90) runtimeBuckets[0]++;
                    else if (rt < 120) runtimeBuckets[1]++;
                    else if (rt < 150) runtimeBuckets[2]++;
                    else runtimeBuckets[3]++;
                }

                const tmdb = parseFloat(m.tmdb_score);
                if (!isNaN(tmdb) && tmdb > 0) {
                    tmdbSum += tmdb;
                    tmdbCount++;

                    if (tmdb > topScore) {
                        topScore = tmdb;
                        topMovie = m;
                    }

                    if (tmdb >= 9) ratingBuckets[4]++;
                    else if (tmdb >= 8) ratingBuckets[3]++;
                    else if (tmdb >= 7) ratingBuckets[2]++;
                    else if (tmdb >= 6) ratingBuckets[1]++;
                    else ratingBuckets[0]++;
                }

                const imdb = parseFloat(m.imdb_score);
                if (!isNaN(imdb) && imdb > 0) {
                    imdbSum += imdb;
                    imdbCount++;
                }

                const rts = parseFloat(m.rt_score);
                if (!isNaN(rts) && rts >= 0) {
                    rtSum += rts;
                    rtCount++;
                }

                if (m.release_date) {
                    const year = new Date(m.release_date).getFullYear();
                    if (!isNaN(year) && year > 1900) {
                        const dec = Math.floor(year / 10) * 10 + 's';
                        decades[dec] = (decades[dec] || 0) + 1;
                    }
                }

                const watchDateStr = m.watched_at || m.history_created;
                if (watchDateStr) {
                    const d = new Date(watchDateStr);
                    if (!isNaN(d.getTime())) {
                        const y = d.getFullYear();
                        const monthKey = y + '-' + String(d.getMonth() + 1).padStart(2, '0');
                        const yearKey = String(y);
                        const movieRt = (!isNaN(rt) && rt > 0) ? rt : 0;

                        if (!monthlyMap[monthKey]) monthlyMap[monthKey] = { count: 0, runtimeMinutes: 0 };
                        monthlyMap[monthKey].count++;
                        monthlyMap[monthKey].runtimeMinutes += movieRt;

                        if (!yearlyMap[yearKey]) yearlyMap[yearKey] = { count: 0, runtimeMinutes: 0 };
                        yearlyMap[yearKey].count++;
                        yearlyMap[yearKey].runtimeMinutes += movieRt;
                    }
                }
            });

            const hours = Math.floor(totalRuntime / 60);
            const mins = totalRuntime % 60;
            const days = Math.floor(hours / 24);
            const remainingHours = hours % 24;

            let formattedRuntime = `${hours}h ${mins}m`;
            if (days > 0) {
                formattedRuntime = `${days}d ${remainingHours}h`;
            }

            const avgRuntime = runtimeMovieCount > 0 ? Math.round(totalRuntime / runtimeMovieCount) : 0;
            const avgTmdb = tmdbCount > 0 ? (tmdbSum / tmdbCount).toFixed(1) : null;
            const avgImdb = imdbCount > 0 ? (imdbSum / imdbCount).toFixed(1) : null;
            const avgRt = rtCount > 0 ? Math.round(rtSum / rtCount) : null;
            const avgMemberScore = memberCountCombined > 0 ? (memberSumCombined / memberCountCombined).toFixed(1) : null;
            const completionRate = (watchedCount + bailedCount) > 0 ? Math.round((watchedCount / (watchedCount + bailedCount)) * 100) : 0;

            const memberStats = Object.keys(memberMap).map(uid => ({
                name: memberMap[uid].name,
                avg: (memberMap[uid].sum / memberMap[uid].count).toFixed(1),
                count: memberMap[uid].count
            }));

            const sortedMonths = Object.keys(monthlyMap).sort();
            let runningMovieCount = 0;
            let runningRuntimeMins = 0;

            const timeSeriesMonthly = sortedMonths.map(key => {
                const parts = key.split('-');
                const y = parseInt(parts[0], 10);
                const m = parseInt(parts[1], 10);
                const monthName = new Date(y, m - 1, 1).toLocaleString('default', { month: 'short' });
                const item = monthlyMap[key];
                runningMovieCount += item.count;
                runningRuntimeMins += item.runtimeMinutes;
                return {
                    key,
                    label: `${monthName} ${y}`,
                    count: item.count,
                    hours: Math.round((item.runtimeMinutes / 60) * 10) / 10,
                    cumMovies: runningMovieCount,
                    cumHours: Math.round((runningRuntimeMins / 60) * 10) / 10
                };
            });

            const sortedYears = Object.keys(yearlyMap).sort();
            const timeSeriesYearly = sortedYears.map(key => {
                const item = yearlyMap[key];
                return {
                    key,
                    label: key,
                    count: item.count,
                    hours: Math.round((item.runtimeMinutes / 60) * 10) / 10
                };
            });

            const memberStatusData = {
                labels: Object.keys(memberStatusMap).map(k => memberStatusMap[k].name),
                watched: Object.keys(memberStatusMap).map(k => memberStatusMap[k].watched),
                bailed: Object.keys(memberStatusMap).map(k => memberStatusMap[k].bailed),
                unrated: Object.keys(memberStatusMap).map(k => memberStatusMap[k].unrated)
            };

            this.chartStats = {
                totalCount: filteredList.length,
                watchedCount,
                bailedCount,
                completionRate,
                totalRuntimeMinutes: totalRuntime,
                formattedRuntime,
                avgRuntime,
                avgTmdb,
                avgImdb,
                avgRt,
                avgMemberScore,
                topMovieTitle: topMovie ? topMovie.title : 'N/A',
                topMovieScore: topMovie ? topMovie.tmdb_score : null,
                longestMovieTitle: longestMovie ? longestMovie.title : 'N/A',
                longestMovieRuntime: longestRuntime > 0 ? longestRuntime : 0,
                shortestMovieTitle: shortestMovie && shortestRuntime < Infinity ? shortestMovie.title : 'N/A',
                shortestMovieRuntime: shortestRuntime < Infinity ? shortestRuntime : 0,
                ratingBuckets,
                decades,
                runtimeBuckets,
                timeSeriesMonthly,
                timeSeriesYearly,
                memberStats,
                memberStatusData,
                hasMemberRatings: memberStats.length > 0
            };
        },

        getTimelineConfig() {
            const stats = this.chartStats;
            let labels = [];
            let data = [];
            let labelText = 'Movies Logged';
            let unit = 'movies';

            switch (this.selectedTimeMetric) {
                case 'hours_month':
                    labels = (stats.timeSeriesMonthly || []).map(t => t.label);
                    data = (stats.timeSeriesMonthly || []).map(t => t.hours);
                    labelText = 'Watch Hours';
                    unit = 'hrs';
                    break;
                case 'movies_year':
                    labels = (stats.timeSeriesYearly || []).map(t => t.label);
                    data = (stats.timeSeriesYearly || []).map(t => t.count);
                    labelText = 'Movies Logged';
                    unit = 'movies';
                    break;
                case 'hours_year':
                    labels = (stats.timeSeriesYearly || []).map(t => t.label);
                    data = (stats.timeSeriesYearly || []).map(t => t.hours);
                    labelText = 'Watch Hours';
                    unit = 'hrs';
                    break;
                case 'cumulative_movies':
                    labels = (stats.timeSeriesMonthly || []).map(t => t.label);
                    data = (stats.timeSeriesMonthly || []).map(t => t.cumMovies);
                    labelText = 'Cumulative Movies';
                    unit = 'movies';
                    break;
                case 'cumulative_hours':
                    labels = (stats.timeSeriesMonthly || []).map(t => t.label);
                    data = (stats.timeSeriesMonthly || []).map(t => t.cumHours);
                    labelText = 'Cumulative Hours';
                    unit = 'hrs';
                    break;
                case 'movies_month':
                default:
                    labels = (stats.timeSeriesMonthly || []).map(t => t.label);
                    data = (stats.timeSeriesMonthly || []).map(t => t.count);
                    labelText = 'Movies Logged';
                    unit = 'movies';
                    break;
            }

            return {
                labels: labels.length ? labels : ['Current'],
                data: data.length ? data : [stats.totalCount],
                labelText,
                unit
            };
        },

        renderActiveTabCharts() {
            if (typeof Chart === 'undefined') {
                console.warn('[Charts] Chart.js is not loaded.');
                return;
            }

            this.destroyCharts();

            const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
            const textColor = isDark ? '#9ca3af' : '#4b5563';
            const gridColor = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)';

            const chartDefaults = {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        labels: { color: textColor, font: { family: 'Inter', size: 12, weight: '500' } }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(17, 24, 39, 0.95)',
                        titleColor: '#f9fafb',
                        bodyColor: '#e5e7eb',
                        borderColor: 'rgba(255, 255, 255, 0.1)',
                        borderWidth: 1,
                        padding: 10,
                        cornerRadius: 10
                    }
                }
            };

            const stats = this.chartStats;
            const timelineCfg = this.getTimelineConfig();

            if (this.activeChartTab === 'overview') {
                const ratingCtx = document.getElementById('overviewRatingDistChart');
                if (ratingCtx) {
                    this.chartInstances.overviewRating = new Chart(ratingCtx, {
                        type: 'bar',
                        data: {
                            labels: ['< 6.0', '6.0 - 6.9', '7.0 - 7.9', '8.0 - 8.9', '9.0 - 10'],
                            datasets: [{
                                label: 'Films Count',
                                data: stats.ratingBuckets || [0, 0, 0, 0, 0],
                                backgroundColor: [
                                    'rgba(239, 68, 68, 0.75)',
                                    'rgba(249, 115, 22, 0.75)',
                                    'rgba(234, 179, 8, 0.75)',
                                    'rgba(59, 130, 246, 0.75)',
                                    'rgba(16, 185, 129, 0.75)'
                                ],
                                borderRadius: 8
                            }]
                        },
                        options: {
                            ...chartDefaults,
                            scales: {
                                x: { ticks: { color: textColor }, grid: { display: false } },
                                y: { ticks: { color: textColor, precision: 0 }, grid: { color: gridColor }, beginAtZero: true }
                            }
                        }
                    });
                }

                const decadesCtx = document.getElementById('overviewDecadesChart');
                if (decadesCtx) {
                    const decadeLabels = Object.keys(stats.decades || {}).sort();
                    const decadeCounts = decadeLabels.map(k => stats.decades[k]);

                    this.chartInstances.overviewDecades = new Chart(decadesCtx, {
                        type: 'doughnut',
                        data: {
                            labels: decadeLabels.length ? decadeLabels : ['No Data'],
                            datasets: [{
                                data: decadeCounts.length ? decadeCounts : [1],
                                backgroundColor: [
                                    'rgba(245, 158, 11, 0.8)',
                                    'rgba(59, 130, 246, 0.8)',
                                    'rgba(16, 185, 129, 0.8)',
                                    'rgba(236, 72, 153, 0.8)',
                                    'rgba(139, 92, 246, 0.8)',
                                    'rgba(6, 182, 212, 0.8)'
                                ],
                                borderWidth: 2,
                                borderColor: isDark ? '#1f2937' : '#ffffff'
                            }]
                        },
                        options: {
                            ...chartDefaults,
                            plugins: {
                                ...chartDefaults.plugins,
                                legend: { position: 'right', labels: { color: textColor } }
                            }
                        }
                    });
                }

                const timelineCtx = document.getElementById('overviewTimelineChart');
                if (timelineCtx) {
                    this.chartInstances.overviewTimeline = new Chart(timelineCtx, {
                        type: 'line',
                        data: {
                            labels: timelineCfg.labels,
                            datasets: [{
                                label: timelineCfg.labelText,
                                data: timelineCfg.data,
                                borderColor: 'rgb(245, 158, 11)',
                                backgroundColor: 'rgba(245, 158, 11, 0.15)',
                                fill: true,
                                tension: 0.3,
                                pointBackgroundColor: 'rgb(245, 158, 11)',
                                pointRadius: 4
                            }]
                        },
                        options: {
                            ...chartDefaults,
                            scales: {
                                x: { ticks: { color: textColor }, grid: { color: gridColor } },
                                y: { ticks: { color: textColor }, grid: { color: gridColor }, beginAtZero: true }
                            }
                        }
                    });
                }
            } else if (this.activeChartTab === 'ratings') {
                const statusCtx = document.getElementById('memberStatusChart');
                if (statusCtx && stats.memberStatusData && stats.memberStatusData.labels.length > 0) {
                    this.chartInstances.memberStatus = new Chart(statusCtx, {
                        type: 'bar',
                        data: {
                            labels: stats.memberStatusData.labels,
                            datasets: [
                                {
                                    label: 'Watched',
                                    data: stats.memberStatusData.watched,
                                    backgroundColor: 'rgba(16, 185, 129, 0.8)',
                                    borderRadius: 6
                                },
                                {
                                    label: 'Bailed',
                                    data: stats.memberStatusData.bailed,
                                    backgroundColor: 'rgba(239, 68, 68, 0.8)',
                                    borderRadius: 6
                                },
                                {
                                    label: 'Unrated / Didn\'t Watch',
                                    data: stats.memberStatusData.unrated,
                                    backgroundColor: 'rgba(156, 163, 175, 0.35)',
                                    borderRadius: 6
                                }
                            ]
                        },
                        options: {
                            ...chartDefaults,
                            scales: {
                                x: { stacked: true, ticks: { color: textColor }, grid: { display: false } },
                                y: { stacked: true, ticks: { color: textColor, precision: 0 }, grid: { color: gridColor }, beginAtZero: true }
                            }
                        }
                    });
                }

                const sourcesCtx = document.getElementById('ratingsSourcesChart');
                if (sourcesCtx) {
                    const providerLabels = ['TMDB (0-10)', 'IMDb (0-10)', 'RT (0-10)'];
                    const providerData = [
                        stats.avgTmdb || 0,
                        stats.avgImdb || 0,
                        stats.avgRt ? (stats.avgRt / 10).toFixed(1) : 0
                    ];
                    const bgColors = [
                        'rgba(245, 158, 11, 0.8)',
                        'rgba(234, 179, 8, 0.8)',
                        'rgba(239, 68, 68, 0.8)'
                    ];

                    if (stats.avgMemberScore) {
                        providerLabels.push('Members Avg (0-10)');
                        providerData.push(stats.avgMemberScore);
                        bgColors.push('rgba(59, 130, 246, 0.85)');
                    }

                    this.chartInstances.sourcesChart = new Chart(sourcesCtx, {
                        type: 'bar',
                        data: {
                            labels: providerLabels,
                            datasets: [{
                                label: 'Average Score',
                                data: providerData,
                                backgroundColor: bgColors,
                                borderRadius: 8
                            }]
                        },
                        options: {
                            ...chartDefaults,
                            scales: {
                                x: { ticks: { color: textColor }, grid: { display: false } },
                                y: { ticks: { color: textColor }, grid: { color: gridColor }, min: 0, max: 10 }
                            }
                        }
                    });
                }

                const memberCtx = document.getElementById('memberRatingsChart');
                if (memberCtx && stats.hasMemberRatings) {
                    const memberNames = stats.memberStats.map(m => m.name);
                    const memberAvgs = stats.memberStats.map(m => m.avg);

                    this.chartInstances.memberChart = new Chart(memberCtx, {
                        type: 'bar',
                        data: {
                            labels: memberNames,
                            datasets: [{
                                label: 'Avg Rating Given',
                                data: memberAvgs,
                                backgroundColor: 'rgba(59, 130, 246, 0.8)',
                                borderRadius: 8
                            }]
                        },
                        options: {
                            ...chartDefaults,
                            indexAxis: 'y',
                            scales: {
                                x: { ticks: { color: textColor }, grid: { color: gridColor }, min: 0, max: 10 },
                                y: { ticks: { color: textColor }, grid: { display: false } }
                            }
                        }
                    });
                }
            } else if (this.activeChartTab === 'timeline') {
                const detTimelineCtx = document.getElementById('detailedTimelineChart');
                if (detTimelineCtx) {
                    this.chartInstances.detTimeline = new Chart(detTimelineCtx, {
                        type: 'bar',
                        data: {
                            labels: timelineCfg.labels,
                            datasets: [{
                                label: timelineCfg.labelText,
                                data: timelineCfg.data,
                                backgroundColor: 'rgba(16, 185, 129, 0.8)',
                                borderRadius: 8
                            }]
                        },
                        options: {
                            ...chartDefaults,
                            scales: {
                                x: { ticks: { color: textColor }, grid: { display: false } },
                                y: { ticks: { color: textColor }, grid: { color: gridColor }, beginAtZero: true }
                            }
                        }
                    });
                }

                const detDecadesCtx = document.getElementById('detailedDecadesChart');
                if (detDecadesCtx) {
                    const decadeLabels = Object.keys(stats.decades || {}).sort();
                    const decadeCounts = decadeLabels.map(k => stats.decades[k]);

                    this.chartInstances.detDecades = new Chart(detDecadesCtx, {
                        type: 'bar',
                        data: {
                            labels: decadeLabels.length ? decadeLabels : ['No Data'],
                            datasets: [{
                                label: 'Films Count',
                                data: decadeCounts.length ? decadeCounts : [0],
                                backgroundColor: 'rgba(236, 72, 153, 0.8)',
                                borderRadius: 8
                            }]
                        },
                        options: {
                            ...chartDefaults,
                            scales: {
                                x: { ticks: { color: textColor }, grid: { display: false } },
                                y: { ticks: { color: textColor, precision: 0 }, grid: { color: gridColor }, beginAtZero: true }
                            }
                        }
                    });
                }
            } else if (this.activeChartTab === 'runtime') {
                const runtimeCtx = document.getElementById('runtimeDistChart');
                if (runtimeCtx) {
                    this.chartInstances.runtimeChart = new Chart(runtimeCtx, {
                        type: 'doughnut',
                        data: {
                            labels: ['Quick (< 90m)', 'Standard (90-120m)', 'Feature (120-150m)', 'Epic (150m+)'],
                            datasets: [{
                                data: stats.runtimeBuckets || [0, 0, 0, 0],
                                backgroundColor: [
                                    'rgba(16, 185, 129, 0.8)',
                                    'rgba(59, 130, 246, 0.8)',
                                    'rgba(245, 158, 11, 0.8)',
                                    'rgba(239, 68, 68, 0.8)'
                                ],
                                borderWidth: 2,
                                borderColor: isDark ? '#1f2937' : '#ffffff'
                            }]
                        },
                        options: {
                            ...chartDefaults,
                            plugins: {
                                ...chartDefaults.plugins,
                                legend: { position: 'right', labels: { color: textColor } }
                            }
                        }
                    });
                }
            }
        },

        updateUrlParams() {
            const url = new URL(window.location);
            url.searchParams.set('sort', this.sortColumn);
            url.searchParams.set('dir', this.sortDirection);
            window.history.pushState({}, '', url);
        }
    };
}
