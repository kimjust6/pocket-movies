try {
    const { loadDotEnv } = require('./lib/env.js')
    loadDotEnv()
} catch (_) {}

require('pocketpages')
