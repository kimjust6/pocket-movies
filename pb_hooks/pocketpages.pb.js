try {
    const { loadDotEnv } = require('./lib/env.js')
    loadDotEnv()
} catch (_) {}

try {
    const { seedQuarantineList } = require('./lib/quarantine-data.js')
    seedQuarantineList($app, '459akco4pu7oslm')
} catch (e) {
    console.error('[Quarantine Seed Error]:', e)
}

require('pocketpages')
