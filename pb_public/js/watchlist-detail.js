/**
 * Alpine.js component for the watchlist detail page.
 * Manages the state of Share and Edit modals.
 */
document.addEventListener('alpine:init', () => {
    Alpine.data('watchlistDetail', () => ({
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
         * Initializes the component.
         */
        init() {
            // value initialization if needed
        },

        /**
         * Opens the Delete Confirmation modal and optionally closes the Edit modal.
         */
        openDeleteModal() {
            this.showEditModal = false
            this.showDeleteModal = true
        },

        /**
         * Opens the Delete Item Confirmation modal and closes the Date modal.
         */
        openItemDeleteModal() {
            this.showDateModal = false
            this.showItemDeleteModal = true
        }
    }))
})
