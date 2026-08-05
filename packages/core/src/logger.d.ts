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
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';
export interface LogRecord {
    ts: string;
    level: LogLevel;
    subsystem: string;
    msg: string;
    [key: string]: unknown;
}
export interface Logger {
    debug(msg: string, context?: Record<string, unknown>): void;
    info(msg: string, context?: Record<string, unknown>): void;
    warn(msg: string, context?: Record<string, unknown>): void;
    error(msg: string, context?: Record<string, unknown>): void;
}
/**
 * Creates a structured logger bound to a named subsystem.
 * @param subsystem - Identifies the package/module in log records (e.g. 'RiskGate', 'IngestionEngine').
 */
export declare function createLogger(subsystem: string): Logger;
//# sourceMappingURL=logger.d.ts.map