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
        }
    }))
})
