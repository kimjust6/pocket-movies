/**
 * Alpine.js component for the watchlists page.
 * Manages the state of the "New Watchlist" modal and form inputs.
 */
document.addEventListener('alpine:init', () => {
    Alpine.data('watchlists', () => ({
        /**
         * Search query string.
         * @type {string}
         */
        query: '',

        /**
         * Controls the visibility of the "New Watchlist" modal.
         * @type {boolean}
         */
        showNewWatchlistModal: false,

        /**
         * The name of the new watchlist to be created.
         * @type {string}
         */
        newWatchlistName: '',

        /**
         * Initializes the component.
         */
        init() {
            // value initialization if needed
        },

        /**
         * Opens the "New Watchlist" modal and resets the name input.
         */
        openNewWatchlistModal() {
            this.showNewWatchlistModal = true
            this.newWatchlistName = ''
            // slight delay to focus input if desired, or let x-trap handle it
        },

        /**
         * Closes the "New Watchlist" modal.
         */
        closeNewWatchlistModal() {
            this.showNewWatchlistModal = false
        }
    }))
})
