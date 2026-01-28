/**
 * Alpine.js component for the watchlist detail page.
 * Manages the state of Share and Edit modals, table sorting, and infinite scroll.
 */
document.addEventListener('alpine:init', () => {
    Alpine.data('watchlistDetail', (initialMovies = [], isOwner = false, listId = '', initialHasMore = true) => ({
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
         * The ID of the history item being edited.
         * @type {string}
         */
        editHistoryId: '',

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
         * Controls the visibility of the Item Delete Confirmation modal.
         * @type {boolean}
         */
        showItemDeleteModal: false,

        /**
         * Initializes the component and sets up infinite scroll.
         */
        init() {
            this.applySort();

            // Set up intersection observer for infinite scroll
            this.$nextTick(() => {
                this.setupInfiniteScroll();
            });
        },

        /**
         * Sets up the intersection observer for infinite scroll.
         */
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

        /**
         * Loads more movies from the API.
         */
        async loadMore() {
            if (this.isLoading || !this.hasMore) return;

            this.isLoading = true;
            this.currentPage++;

            try {
                const sortParam = this.getDbSortParam();
                const url = `/api/watchlists/movies?listId=${this.listId}&page=${this.currentPage}&limit=${this.pageSize}&sort=${encodeURIComponent(sortParam)}`;
                console.log('[Infinite Scroll] Fetching:', url);

                const response = await fetch(url);
                const text = await response.text();
                // console.log('[Infinite Scroll] Raw response:', text.substring(0, 200));

                let data;
                try {
                    data = JSON.parse(text);
                } catch (parseError) {
                    console.error('[Infinite Scroll] JSON parse error:', parseError);
                    this.hasMore = false;
                    return;
                }

                // console.log('[Infinite Scroll] Parsed data:', data);

                if (data.success && data.movies && data.movies.length > 0) {
                    // Add new movies to the array
                    this.movies = [...this.movies, ...data.movies];
                    this.hasMore = data.hasMore;
                    // Re-apply sort after adding new items (just in case)
                    this.applySort();
                    console.log('[Infinite Scroll] Added', data.movies.length, 'movies. hasMore:', data.hasMore);
                } else {
                    console.log('[Infinite Scroll] No more movies or error:', data);
                    this.hasMore = false;
                }
            } catch (error) {
                console.error('[Infinite Scroll] Failed to load more movies:', error);
                this.hasMore = false;
            } finally {
                this.isLoading = false;
            }
        },

        /**
         * Get the database sort parameter based on current column and direction.
         * @returns {string} - The sort string (e.g. "+movie.title").
         */
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

        /**
         * Sort by a specific column. Toggles direction if same column.
         * @param {string} column - The column name to sort by.
         */
        sortBy(column) {
            if (this.sortColumn === column) {
                this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
            } else {
                this.sortColumn = column;
                this.sortDirection = 'asc';
            }

            // Hybrid Sort Logic:
            // If we have more items to load, we must query the database to get the correct sorted order.
            // If we have fully loaded the list, we can just sort client-side.
            if (this.hasMore) {
                console.log('[Sort] Reloading from server due to incomplete list');
                this.movies = [];
                this.currentPage = 0; // Will be incremented to 1 in loadMore
                this.hasMore = true;
                this.loadMore();
            } else {
                console.log('[Sort] Sorting client-side');
                this.applySort();
            }
        },

        /**
         * Applies the current sort to the movies array.
         */
        applySort() {
            const col = this.sortColumn;
            const dir = this.sortDirection;

            this.movies.sort((a, b) => {
                let valA = a[col];
                let valB = b[col];

                // Handle null/undefined
                if (valA == null) valA = '';
                if (valB == null) valB = '';

                // String comparison (case-insensitive)
                if (typeof valA === 'string' && typeof valB === 'string') {
                    valA = valA.toLowerCase();
                    valB = valB.toLowerCase();
                }

                if (valA < valB) return dir === 'asc' ? -1 : 1;
                if (valA > valB) return dir === 'asc' ? 1 : -1;
                return 0;
            });
        },

        /**
         * Get sort icon for a column.
         * @param {string} column - The column name.
         * @returns {string} - The sort icon (↑, ↓, or empty).
         */
        getSortIcon(column) {
            if (this.sortColumn !== column) return '';
            return this.sortDirection === 'asc' ? '↑' : '↓';
        },

        /**
         * Format a date string to a readable format.
         * @param {string} dateStr - The date string.
         * @returns {string} - Formatted date.
         */
        formatDate(dateStr) {
            if (!dateStr) return 'N/A';
            const date = new Date(dateStr);
            return date.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
        },

        /**
         * Opens the Delete Confirmation modal and optionally closes the Edit modal.
         */
        openDeleteModal() {
            this.showEditModal = false;
            this.showDeleteModal = true;
        },

        /**
         * Opens the Delete Item Confirmation modal and closes the Date modal.
         */
        openItemDeleteModal() {
            this.showDateModal = false;
            this.showItemDeleteModal = true;
        },

        /**
         * Opens the edit modal for a specific movie.
         * @param {object} movie - The movie object.
         */
        openEditMovieModal(movie) {
            this.editHistoryId = movie.history_id;
            this.editDateValue = movie.watched_at ? new Date(movie.watched_at).toISOString().slice(0, 10) : '';
            this.editTmdbScore = movie.tmdb_score || '';
            this.editImdbScore = movie.imdb_score || '';
            this.editRtScore = movie.rt_score || '';
            this.showDateModal = true;
        }
    }));
});
