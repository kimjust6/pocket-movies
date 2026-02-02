/**
 * Alpine.js component for the watchlist detail page.
 * Manages the state of Share and Edit modals, table sorting, and infinite scroll.
 */
document.addEventListener('alpine:init', () => {
    Alpine.data('watchlistDetail', (initialMovies = [], isOwner = false, listId = '', initialHasMore = true, currentUserId = '') => ({
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
            this.applySort();
            this.updateNavbarHeight();

            // Set up intersection observer for infinite scroll
            this.$nextTick(() => {
                this.setupInfiniteScroll();
            });

            window.addEventListener('resize', () => {
                this.updateNavbarHeight();
            });
        },

        updateNavbarHeight() {
            const navbar = document.querySelector('.navbar');
            if (navbar) {
                const height = navbar.offsetHeight;
                document.documentElement.style.setProperty('--navbar-height', height + 'px');
                console.log('[WatchlistDetail] Navbar height set to:', height);
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
                console.log('[Infinite Scroll] Fetching:', url);

                const response = await fetch(url);
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
                        this.movies = [...this.movies, ...data.movies];
                    }

                    this.hasMore = data.hasMore;
                    this.applySort();
                    console.log('[Infinite Scroll] Added', data.movies.length, 'movies. hasMore:', data.hasMore);
                } else {
                    console.log('[Infinite Scroll] No more movies or error:', data);
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
            console.log('[Sort] Sorting by user rating client-side');
            this.applySort();
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
                console.log('[Sort] Reloading from server due to incomplete list');
                this.isLoading = true;
                this.currentPage = 0;
                this.loadMore(true);
            } else {
                console.log('[Sort] Sorting client-side');
                this.applySort();
            }
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
        }
    }));
});
