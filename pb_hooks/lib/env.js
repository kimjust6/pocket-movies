/**
 * Environment variable helper for PocketBase JSVM & Node.js
 */

let cachedEnv = null

function parseDotEnv(content) {
    const env = {}
    if (!content) return env
    const lines = content.split(/\r?\n/)
    for (let i = 0; i < lines.length; i++) {
        let line = lines[i].trim()
        if (!line || line.startsWith('#')) continue
        // Handle export prefix if present
        if (line.startsWith('export ')) {
            line = line.substring(7).trim()
        }
        const eqIdx = line.indexOf('=')
        if (eqIdx > 0) {
            const key = line.slice(0, eqIdx).trim()
            let val = line.slice(eqIdx + 1).trim()
            // Strip surrounding quotes
            if (
                (val.startsWith('"') && val.endsWith('"')) ||
                (val.startsWith("'") && val.endsWith("'"))
            ) {
                val = val.slice(1, -1)
            }
            env[key] = val
        }
    }
    return env
}

function loadDotEnv() {
    if (cachedEnv !== null) {
        return cachedEnv
    }
    cachedEnv = {}

    // 1. Try PocketBase JSVM $os.readFile
    try {
        if (typeof $os !== 'undefined' && $os.readFile) {
            let content = ''
            const pathsToTry = []
            if (typeof $filepath !== 'undefined' && typeof __hooks !== 'undefined') {
                pathsToTry.push($filepath.join(__hooks, '..', '.env'))
                pathsToTry.push($filepath.join(__hooks, '.env'))
            }
            pathsToTry.push('.env')

            for (let i = 0; i < pathsToTry.length; i++) {
                try {
                    const raw = $os.readFile(pathsToTry[i])
                    if (raw) {
                        content = typeof toString === 'function' ? toString(raw) : String(raw)
                        if (content) break
                    }
                } catch (_) {}
            }

            if (content) {
                cachedEnv = parseDotEnv(content)
            }
        }
    } catch (_) {}

    // 2. Try Node fs if in Node environment
    if (Object.keys(cachedEnv).length === 0) {
        try {
            if (typeof require === 'function') {
                const fs = require('fs')
                const path = require('path')
                const paths = [
                    path.resolve(process.cwd(), '.env'),
                    path.resolve(__dirname, '../../.env'),
                    path.resolve(__dirname, '../.env'),
                ]
                for (let i = 0; i < paths.length; i++) {
                    const p = paths[i]
                    if (fs.existsSync && fs.existsSync(p)) {
                        const content = fs.readFileSync(p, 'utf8')
                        cachedEnv = parseDotEnv(content)
                        break
                    }
                }
            }
        } catch (_) {}
    }

    // Populate process.env if available
    if (typeof process !== 'undefined' && process.env) {
        for (const key in cachedEnv) {
            if (Object.prototype.hasOwnProperty.call(cachedEnv, key)) {
                if (!process.env[key]) {
                    process.env[key] = cachedEnv[key]
                }
            }
        }
    }

    return cachedEnv
}

function getEnv(key, defaultValue = '') {
    // 1. Check process.env
    if (typeof process !== 'undefined' && process.env && process.env[key]) {
        return process.env[key]
    }

    // 2. Check $os.getenv in PocketBase JSVM
    if (typeof $os !== 'undefined' && typeof $os.getenv === 'function') {
        const val = $os.getenv(key)
        if (val) return val
    }

    // 3. Check loaded .env
    const env = loadDotEnv()
    if (env && env[key]) {
        return env[key]
    }

    return defaultValue
}

module.exports = {
    getEnv,
    loadDotEnv,
    parseDotEnv,
}
