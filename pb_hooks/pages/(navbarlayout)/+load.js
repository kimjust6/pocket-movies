/**
 * @type {import('pocketpages').PageDataLoaderFunc}
 */
module.exports = function (api) {
    let galleryImages = [];
    try {
        const records = $app.findRecordsByFilter('images', 'is_active = true', '-created', 100, 0);
        galleryImages = records.map(r => {
            const url = `/api/files/${r.collection().id}/${r.id}/${r.getString('field')}`;
            return {
                original: url,
                thumbnail: `${url}?thumb=680x0`
            }
        });
    } catch (e) {
        console.error('Failed to load gallery images:', e);
    }

    return {
        galleryImages
    };
};
