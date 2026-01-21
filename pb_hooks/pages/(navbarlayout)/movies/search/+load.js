/**
 * @type {import('pocketpages').PageDataLoaderFunc}
 */
module.exports = function (api) {
    // Simple test - just return hardcoded data first
    return {
        results: [],
        q: 'hardcoded-test',
        message: null,
        error: null,
        user: null,
        debug: 'Loader is working!'
    };
};
