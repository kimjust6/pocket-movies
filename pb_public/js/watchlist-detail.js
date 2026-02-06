/**
 * Alpine.js component for the watchlist detail page.
 * Manages the state of Share and Edit modals, table sorting, and infinite scroll.
 */
function watchlistDetail(initialMovies = [], isOwner = false, listId = '', initialHasMore = true, currentUserId = '') {
    return {
        /**
         * Movies array for the watchlist.
         * @type {Array}
         */
        movies: initialMovies,

        /**
         * Whether the current user is the owner.
         * @type {boolean}
         */
        isOwner: isOwner,

        /**
         * The ID of the current logged-in user.
         * @type {string}
         */
        currentUserId: currentUserId,

        /**
         * The watchlist ID for API calls.
         * @type {string}
         */
        listId: listId,

        /**
         * Current page for pagination.
         * @type {number}
         */
        currentPage: 1,

        /**
         * Whether there are more items to load.
         * @type {boolean}
         */
        hasMore: initialHasMore,

        /**
         * Whether we are currently loading more items.
         * @type {boolean}
         */
        isLoading: false,

        /**
         * Items per page for API requests.
         * @type {number}
         */
        pageSize: 20,

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
         * Controls the visibility of the Item Delete modal.
         * @type {boolean}
         */
        showItemDeleteModal: false,

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
         * The current user rating for the edit form.
         * @type {number}
         */
        editUserRating: 0,

        /**
         * The current user failed status for the edit form.
         * @type {boolean}
         */
        editUserFailed: false,

        /**
         * The current user review for the edit form.
         * @type {string}
         */
        editUserReview: '',

        /**
         * The title for the rating modal.
         * @type {string}
         */
        ratingModalTitle: 'Edit Rating',

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

            this.applySort();
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
         * Sets up PocketBase realtime subscription for watched_history table.
         * Subscribes to changes filtered by the current list ID.
         */
        setupRealtimeSubscription() {
            if (!this.listId || typeof PocketBase === 'undefined') {
                console.warn('[Realtime] PocketBase not available or listId missing');
                return;
            }

            // Initialize PocketBase client
            const pb = new PocketBase(window.location.origin);

            // Subscribe to watched_history table changes for this specific list
            pb.collection('watched_history').subscribe('*', (e) => {
                this.handleRealtimeEvent(e);
            }, {
                filter: `list = "${this.listId}"`
            }).then(() => {
                console.log('[Realtime] Subscribed to watched_history for list:', this.listId);
            }).catch((err) => {
                console.error('[Realtime] Subscription error:', err);
            });

            // Store reference for cleanup
            this.pb = pb;

            // Cleanup on page unload
            window.addEventListener('beforeunload', () => {
                if (this.pb) {
                    this.pb.collection('watched_history').unsubscribe('*');
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
                rootMargin: '100px'
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
                    valA = (a.attendance && a.attendance[userId] && a.attendance[userId].rating) ? a.attendance[userId].rating : -1;
                    valB = (b.attendance && b.attendance[userId] && b.attendance[userId].rating) ? b.attendance[userId].rating : -1;
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
            const num = parseFloat(val);
            if (isNaN(num)) return '-';
            if (num % 1 === 0) return num.toFixed(1);
            return num.toString();
        },

        openDeleteModal() {
            this.showEditModal = false;
            this.showDeleteModal = true;
        },

        openItemDeleteModal() {
            this.showDateModal = false;
            this.showItemDeleteModal = true;
        },

        openEditMovieModal(movie) {
            this.editHistoryId = movie.history_id;
            this.editMovieTitle = movie.title || '';
            this.editDateValue = movie.watched_at ? new Date(movie.watched_at).toISOString().slice(0, 10) : '';
            this.editTmdbScore = movie.tmdb_score || '';
            this.editImdbScore = movie.imdb_score || '';
            this.editRtScore = movie.rt_score || '';
            this.showDateModal = true;
        },

        /**
         * Opens the user rating modal for a specific movie and user.
         * @param {object} movie - The movie object.
         * @param {string} userId - The user ID whose rating we are viewing/editing.
         */
        openRatingModal(movie, userId) {
            this.editHistoryId = movie.history_id;
            this.editMovieTitle = movie.title || '';

            // Determine if read-only
            this.isRatingReadOnly = (userId !== this.currentUserId);
            this.ratingModalTitle = this.isRatingReadOnly ? 'View Review' : 'Edit Rating';

            // Get existing attendance if any
            const attendance = movie.attendance && movie.attendance[userId];
            if (attendance) {
                this.editUserRating = attendance.rating || 0;
                this.editUserFailed = attendance.failed || false;
                this.editUserReview = attendance.review || '';
            } else {
                this.editUserRating = 0;
                this.editUserFailed = false;
                this.editUserReview = '';
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
                rt_score: this.editRtScore ? parseInt(this.editRtScore) : 0
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

            // Validation
            if (this.editUserRating !== "" && (this.editUserRating < 0 || this.editUserRating > 10)) {
                alert("Rating must be between 0 and 10");
                return;
            }

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
                rating: this.editUserRating ? parseFloat(this.editUserRating) : 0,
                review: this.editUserReview,
                failed: this.editUserFailed
            };

            // Re-sort the list immediately
            this.applySort();

            // 4. Close modal immediately
            this.showRatingModal = false;

            const formData = new FormData();
            formData.append('action', 'update_attendance');
            formData.append('history_id', this.editHistoryId);
            formData.append('rating', this.editUserRating);
            formData.append('review', this.editUserReview);
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

        updateUrlParams() {
            const url = new URL(window.location);
            url.searchParams.set('sort', this.sortColumn);
            url.searchParams.set('dir', this.sortDirection);
            window.history.pushState({}, '', url);
        }
    };
}
