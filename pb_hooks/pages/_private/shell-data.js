/**
 * Shell Alpine.js component for navigation and theme management.
 * @returns {Object} The Alpine.js component data.
 */
module.exports = function shellData() {
    return {
        navOpen: false,
        searchOpen: false,
        darkMode: localStorage.getItem('theme') === 'dark',
        navigation: [
            { title: 'Search', href: '/movies/search', desktop: false, mobile: true },
            { title: 'Watchlists', href: '/watchlists', desktop: true, mobile: true },
        ],

        init() { },

        toggleTheme() {
            this.darkMode = !this.darkMode
            const theme = this.darkMode ? 'dark' : 'light'
            const themeToken = this.darkMode ? 'business' : 'corporate'
            localStorage.setItem('theme', theme)
            document.documentElement.setAttribute('data-theme', themeToken)
            document.documentElement.classList.toggle('dark', this.darkMode)
        },

        scrollTo(target) {
            const el = document.getElementById(target)
            if (el) {
                const headerOffset = 80
                const elementPosition = el.getBoundingClientRect().top
                const offsetPosition =
                    elementPosition + window.pageYOffset - headerOffset

                window.scrollTo({
                    top: offsetPosition,
                    behavior: 'smooth',
                })
                this.navOpen = false
            }
        },
    }
}
