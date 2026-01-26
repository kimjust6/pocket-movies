/**
 * Previews the selected image file in the avatar img element.
 * @param {HTMLInputElement} input - The file input element.
 */
function previewAvatar(input) {
    if (input.files && input.files[0]) {
        const reader = new FileReader()
        const preview = document.getElementById('avatar-preview')
        const placeholder = document.getElementById('avatar-placeholder')

        reader.onload = function (e) {
            preview.src = e.target.result
            preview.classList.remove('hidden')
            if (placeholder) placeholder.classList.add('hidden')
        }

        reader.readAsDataURL(input.files[0])
    }
}
