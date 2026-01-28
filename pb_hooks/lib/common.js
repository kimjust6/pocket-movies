module.exports = {
    formatDateTime: function (date) {
        if (!date) return '-'
        // Ensure we have a Date object
        const d = new Date(date)
        if (isNaN(d.getTime())) return '-'
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
        const month = months[d.getMonth()]
        const day = d.getDate().toString().padStart(2, '0')
        const year = d.getFullYear()
        return `${month} ${day}, ${year}`
    },
    /**
     * Helper to safely extract form data from a PocketBase context.
     * Handles both multipart/form-data and JSON bodies (if parsed).
     * @param {object} context - The pb_hooks context object (request/response)
     * @returns {object} Simple key-value object of the form data
     */
    parseFormData: function (context) {
        let data = {}
        try {
            // Try built-in Context.formData() first (multipart/form-data)
            if (typeof context.formData === 'function') {
                const fd = context.formData()
                // Convert primitives to object
                // If it's a Go map/struct, this might suffice, but if it allows .get(), we use that.
                // context.formData() usually returns a map[string]any in JSVM.
                // Let's assume standard JSVM behavior where it returns a plain object-like structure or map.
                // If it's the standard PB Go hook, `formData()` returns `map[string]any`.
                return fd
            }

            // Try request.formValue if context.request exists (standard net/http wrapper)
            if (context.request && typeof context.request.formValue === 'function') {
                // This is harder to iterate all keys without knowing them.
                // So often we rely on body() if formData() failed.
            }

            // Fallback to body() for JSON payloads
            if (typeof context.body === 'function') {
                // body() returns the raw body or parsed JSON? 
                // In PB JSVM, requestInfo().body is raw. 
                // Usually `context.readBody` or similar is used for JSON.
                // But let's look at the existing code usage: `api.formData()` or `api.body()`.
                // Existing code checks: `api.formData()` then `api.body()`.
                const body = context.body()
                if (body) return body
            }
        } catch (e) {
            console.error('[common.js] Error parsing form data:', e)
        }
        return data
    }
}
