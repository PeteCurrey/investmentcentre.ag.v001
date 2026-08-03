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

const LEVEL_ORDER: Record<LogLevel, number> = {
  debug: 0,
  info:  1,
  warn:  2,
  error: 3,
};

function resolveMinLevel(): LogLevel {
  const raw = (process.env.LOG_LEVEL ?? 'info').toLowerCase();
  if (raw in LEVEL_ORDER) return raw as LogLevel;
  // Unknown value — default to info, do not throw (avoid misconfiguration killing the process).
  return 'info';
}

function emit(level: LogLevel, subsystem: string, msg: string, context: Record<string, unknown>): void {
  const minLevel = resolveMinLevel();
  if (LEVEL_ORDER[level] < LEVEL_ORDER[minLevel]) return;

  const record: LogRecord = {
    ts: new Date().toISOString(),
    level,
    subsystem,
    msg,
    ...context,
  };

  const line = JSON.stringify(record) + '\n';

  if (level === 'warn' || level === 'error') {
    process.stderr.write(line);
  } else {
    process.stdout.write(line);
  }
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
export function createLogger(subsystem: string): Logger {
  return {
    debug: (msg, context = {}) => emit('debug', subsystem, msg, context),
    info:  (msg, context = {}) => emit('info',  subsystem, msg, context),
    warn:  (msg, context = {}) => emit('warn',  subsystem, msg, context),
    error: (msg, context = {}) => emit('error', subsystem, msg, context),
  };
}
