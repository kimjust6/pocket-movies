/**
 * @type {import('pocketpages').PageDataLoaderFunc}
 */
module.exports = function (api) {
    let galleryImages = [];
    try {
        console.log("Attempting to fetch with fixed arguments...");
        const records = $app.findRecordsByFilter('images', 'is_active = true', '-created', 100, 0);

        if (records.length > 0) {
            // Debug log to confirm methods
            try {
                console.log("Debug Record:", {
                    id: records[0].id,
                    collectionId: records[0].collection().id,
                    field: records[0].getString('field')
                });
            } catch (e) { console.log("Debug error", e); }
        }

        // Use PocketBase Record methods to access fields
        galleryImages = records.map(r => `/api/files/${r.collection().id}/${r.id}/${r.getString('field')}`);
        console.log({ galleryImages });
    } catch (e) {
        console.error('Failed to load gallery images:', e);
    }

    return {
        galleryImages
    };
};
