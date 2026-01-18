/**
 * @type {import('pocketpages').PageDataLoaderFunc}
 */
module.exports = function (api) {
    let galleryImages = [];
    try {
        const records = $app.findRecordsByFilter('images', 'is_active = true', '-created', 100, 0);
        galleryImages = records.map(r => `/api/files/${r.collection().id}/${r.id}/${r.getString('field')}`);
    } catch (e) {
        console.error('Failed to load gallery images:', e);
    }

    return {
        galleryImages
    };
};
