/**
 * Converts an image file to WebP format using HTML5 Canvas.
 * @param {File} file - The original image file.
 * @param {number} [quality=0.85] - WebP compression quality (0 to 1).
 * @param {number} [maxDimension=1024] - Maximum width or height.
 * @returns {Promise<File>} Converted WebP file.
 */
function convertImageToWebP(file, quality = 0.85, maxDimension = 1024) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = reject;
        reader.onload = function (e) {
            const img = new Image();
            img.onerror = reject;
            img.onload = function () {
                let width = img.naturalWidth || img.width;
                let height = img.naturalHeight || img.height;

                // Scale down if larger than maxDimension
                if (width > maxDimension || height > maxDimension) {
                    if (width > height) {
                        height = Math.round((height * maxDimension) / width);
                        width = maxDimension;
                    } else {
                        width = Math.round((width * maxDimension) / height);
                        height = maxDimension;
                    }
                }

                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                canvas.toBlob((blob) => {
                    if (!blob) {
                        resolve(file);
                        return;
                    }
                    const baseName = file.name.replace(/\.[^/.]+$/, '') || 'avatar';
                    const webpFile = new File([blob], `${baseName}.webp`, {
                        type: 'image/webp',
                        lastModified: Date.now()
                    });
                    resolve(webpFile);
                }, 'image/webp', quality);
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    });
}

let isAvatarConverting = false;

/**
 * Handles avatar input change, converts the file to WebP, and updates preview immediately.
 * @param {HTMLInputElement} input - The file input element.
 */
async function previewAvatar(input) {
    if (!input.files || !input.files[0]) return;

    const originalFile = input.files[0];
    const preview = document.getElementById('avatar-preview');
    const placeholder = document.getElementById('avatar-placeholder');
    const removeBtn = document.getElementById('remove-avatar-btn');
    const removeInput = document.getElementById('remove-avatar-input');
    const submitBtn = document.querySelector('button[type="submit"]');

    // Reset removal flag
    if (removeInput) removeInput.value = '0';

    // Show instant initial preview using object URL
    const tempUrl = URL.createObjectURL(originalFile);
    if (preview) {
        preview.src = tempUrl;
        preview.classList.remove('hidden');
        preview.style.display = 'block';
    }
    if (placeholder) {
        placeholder.classList.add('hidden');
        placeholder.style.display = 'none';
    }
    if (removeBtn) {
        removeBtn.classList.remove('hidden');
        removeBtn.style.display = '';
    }

    isAvatarConverting = true;
    if (submitBtn) submitBtn.disabled = true;

    try {
        const webpFile = await convertImageToWebP(originalFile);

        // Replace the input's file with the WebP file using DataTransfer
        if (window.DataTransfer) {
            const dt = new DataTransfer();
            dt.items.add(webpFile);
            input.files = dt.files;
        }

        // Update preview with WebP URL
        const previewUrl = URL.createObjectURL(webpFile);
        if (preview) {
            preview.src = previewUrl;
            preview.classList.remove('hidden');
            preview.style.display = 'block';
        }
    } catch (err) {
        console.error('Failed to convert avatar to WebP:', err);
    } finally {
        isAvatarConverting = false;
        if (submitBtn) submitBtn.disabled = false;
    }
}

/**
 * Removes the avatar: immediately clears input, sets remove_avatar flag, hides preview, and shows placeholder.
 * @param {Event} [event] - Click event
 */
function removeAvatar(event) {
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }

    const removeInput = document.getElementById('remove-avatar-input');
    const avatarInput = document.getElementById('avatar-input');
    const preview = document.getElementById('avatar-preview');
    const placeholder = document.getElementById('avatar-placeholder');
    const removeBtn = document.getElementById('remove-avatar-btn');

    // Flag for removal on form submission
    if (removeInput) removeInput.value = '1';

    // Clear any selected file
    if (avatarInput) avatarInput.value = '';

    // Immediately hide preview and remove image source
    if (preview) {
        preview.removeAttribute('src');
        preview.src = '';
        preview.classList.add('hidden');
        preview.style.display = 'none';
    }

    // Immediately show placeholder with initial
    if (placeholder) {
        placeholder.classList.remove('hidden');
        placeholder.style.display = 'flex';
    }

    // Hide remove button
    if (removeBtn) {
        removeBtn.classList.add('hidden');
        removeBtn.style.display = 'none';
    }
}
