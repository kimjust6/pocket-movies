/**
 * Wedding page Alpine.js data component
 * Handles countdown timer and gallery modal functionality
 */
module.exports = function weddingPageData() {
    return {
        countdown: {
            days: 0,
            hours: 0,
            minutes: 0,
            seconds: 0,
        },
        modalOpen: false,
        currentImageIndex: 0,
        galleryImages: [
            'https://images.unsplash.com/photo-1606800052052-a08af7148866?auto=format&fit=crop&w=1920&q=80',
            'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1920&q=80',
            'https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?auto=format&fit=crop&w=1920&q=80',
            'https://images.unsplash.com/photo-1583939003579-730e3918a45a?auto=format&fit=crop&w=1920&q=80',
            'https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?auto=format&fit=crop&w=1920&q=80',
            'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=1920&q=80',
            'https://images.unsplash.com/photo-1522673607200-164d1b6ce486?auto=format&fit=crop&w=1920&q=80',
            'https://images.unsplash.com/photo-1519225421980-715cb0215aed?auto=format&fit=crop&w=1920&q=80',
        ],

        _openedFromDeepLink: false,

        init() {
            this.updateCountdown()
            this.timer = setInterval(() => this.updateCountdown(), 1000)

            const restored = this._applyModalStateFromUrl()
            this._openedFromDeepLink = restored

            window.addEventListener('popstate', () => {
                this._openedFromDeepLink = false
                this._applyModalStateFromUrl()
            })

            this.$watch('currentImageIndex', () => {
                if (!this.modalOpen) return
                this._syncModalQueryParams('replace')
            })
        },

        _clampImageIndex(index) {
            if (!Number.isFinite(index)) return 0
            const max = Math.max(this.galleryImages.length - 1, 0)
            return Math.min(Math.max(index, 0), max)
        },

        _getModalStateFromUrl() {
            const url = new URL(window.location.href)
            const hasGallery =
                url.searchParams.get('gallery') === '1' ||
                url.searchParams.has('image')

            if (!hasGallery) {
                return { open: false, index: 0 }
            }

            const raw = url.searchParams.get('image')
            const parsed = raw === null ? 0 : parseInt(raw, 10)
            return { open: true, index: this._clampImageIndex(parsed) }
        },

        _applyModalStateFromUrl() {
            const state = this._getModalStateFromUrl()

            if (!state.open) {
                if (this.modalOpen) {
                    this.modalOpen = false
                    document.body.style.overflow = ''
                }
                return false
            }

            this.currentImageIndex = state.index
            if (!this.modalOpen) {
                this.modalOpen = true
                document.body.style.overflow = 'hidden'
            }

            this._syncModalQueryParams('replace')
            return true
        },

        _syncModalQueryParams(mode) {
            const url = new URL(window.location.href)

            if (this.modalOpen) {
                url.searchParams.set('gallery', '1')
                url.searchParams.set(
                    'image',
                    String(this._clampImageIndex(this.currentImageIndex))
                )
            } else {
                url.searchParams.delete('gallery')
                url.searchParams.delete('image')
            }

            const nextUrl = url.pathname + url.search + url.hash

            if (mode === 'push') {
                history.pushState({ galleryModal: true }, '', nextUrl)
            } else {
                history.replaceState(history.state, '', nextUrl)
            }
        },

        openModal(index) {
            this.currentImageIndex = index
            this.modalOpen = true
            document.body.style.overflow = 'hidden'

            this._openedFromDeepLink = false
            this._syncModalQueryParams('push')
        },

        closeModal() {
            this.modalOpen = false
            document.body.style.overflow = ''

            if (this._openedFromDeepLink) {
                this._syncModalQueryParams('replace')
                this._openedFromDeepLink = false
            } else {
                history.back()
            }
        },

        nextImage() {
            this.currentImageIndex =
                (this.currentImageIndex + 1) % this.galleryImages.length
        },

        previousImage() {
            this.currentImageIndex =
                (this.currentImageIndex - 1 + this.galleryImages.length) %
                this.galleryImages.length
        },

        updateCountdown() {
            const weddingDate = new Date('2027-08-01T18:00:00').getTime()
            const now = new Date().getTime()
            const distance = Math.max(weddingDate - now, 0)

            this.countdown.days = Math.floor(
                distance / (1000 * 60 * 60 * 24)
            )
            this.countdown.hours = Math.floor(
                (distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
            )
            this.countdown.minutes = Math.floor(
                (distance % (1000 * 60 * 60)) / (1000 * 60)
            )
            this.countdown.seconds = Math.floor(
                (distance % (1000 * 60)) / 1000
            )
        },
    }
}
