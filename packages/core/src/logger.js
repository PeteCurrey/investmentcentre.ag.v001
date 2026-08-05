"use strict";
/**
 * @meridian/core structured logger.
 *
 * Emits newline-delimited JSON records to process.stdout (debug/info) or
 * process.stderr (warn/error). Zero external dependencies.
 *
 * Usage:
 *   const log = createLogger('RiskGate');
 *   log.error('HMAC secret unconfigured', { errorCode: 'HMAC_SECRET_MISSING' });
 *   log.info('Ingestion OK', { sourceId: 'fred', observations: 42 });
 *
 * Level filtering:
 *   Set LOG_LEVEL env var to 'debug' | 'info' | 'warn' | 'error' (default: 'info').
 *   Records below the configured level are suppressed silently.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createLogger = createLogger;
const LEVEL_ORDER = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
};
function resolveMinLevel() {
    const raw = (process.env.LOG_LEVEL ?? 'info').toLowerCase();
    if (raw in LEVEL_ORDER)
        return raw;
    // Unknown value — default to info, do not throw (avoid misconfiguration killing the process).
    return 'info';
}
function emit(level, subsystem, msg, context) {
    const minLevel = resolveMinLevel();
    if (LEVEL_ORDER[level] < LEVEL_ORDER[minLevel])
        return;
    const record = {
        ts: new Date().toISOString(),
        level,
        subsystem,
        msg,
        ...context,
    };
    const line = JSON.stringify(record) + '\n';
    if (level === 'warn' || level === 'error') {
        process.stderr.write(line);
    }
    else {
        process.stdout.write(line);
    }
}
/**
 * Creates a structured logger bound to a named subsystem.
 * @param subsystem - Identifies the package/module in log records (e.g. 'RiskGate', 'IngestionEngine').
 */
function createLogger(subsystem) {
    return {
        debug: (msg, context = {}) => emit('debug', subsystem, msg, context),
        info: (msg, context = {}) => emit('info', subsystem, msg, context),
        warn: (msg, context = {}) => emit('warn', subsystem, msg, context),
        error: (msg, context = {}) => emit('error', subsystem, msg, context),
    };
}
//# sourceMappingURL=logger.js.map