module.exports = function (api) {
    return {
        plugins: [
            'pocketpages-plugin-js-sdk',
            'pocketpages-plugin-ejs',
            'pocketpages-plugin-auth',
        ],
        debug: false,
    }
}
