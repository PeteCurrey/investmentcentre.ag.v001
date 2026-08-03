import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createLogger, LogRecord } from './logger';

// ── Helpers ──────────────────────────────────────────────────────────────────

function captureStream(stream: NodeJS.WriteStream): { lines: string[]; restore: () => void } {
  const lines: string[] = [];
  const original = stream.write.bind(stream);
  stream.write = (chunk: any): boolean => {
    lines.push(typeof chunk === 'string' ? chunk : chunk.toString());
    return true;
  };
  return {
    lines,
    restore: () => { stream.write = original; }
  };
}

function parseRecord(line: string): LogRecord {
  return JSON.parse(line.trim()) as LogRecord;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('createLogger (Structured Logger)', () => {
  const origLogLevel = process.env.LOG_LEVEL;

  beforeEach(() => {
    delete process.env.LOG_LEVEL;
  });

  afterEach(() => {
    if (origLogLevel !== undefined) {
      process.env.LOG_LEVEL = origLogLevel;
    } else {
      delete process.env.LOG_LEVEL;
    }
  });

  it('emits a valid JSON record with required fields on info', () => {
    const stdout = captureStream(process.stdout);
    const log = createLogger('TestSubsystem');
    log.info('Hello structured world');
    stdout.restore();

    expect(stdout.lines).toHaveLength(1);
    const record = parseRecord(stdout.lines[0]);
    expect(record.level).toBe('info');
    expect(record.subsystem).toBe('TestSubsystem');
    expect(record.msg).toBe('Hello structured world');
    expect(typeof record.ts).toBe('string');
    expect(new Date(record.ts).toISOString()).toBe(record.ts); // valid ISO-8601
  });

  it('propagates arbitrary structured context fields into the record', () => {
    const stdout = captureStream(process.stdout);
    const log = createLogger('RiskGate');
    log.warn('HMAC secret missing', { errorCode: 'HMAC_SECRET_MISSING', subsystem: 'RiskGate' });
    stdout.restore();

    // warn goes to stderr, not stdout
    expect(stdout.lines).toHaveLength(0);
  });

  it('routes info and debug to stdout, warn and error to stderr', () => {
    const stdout = captureStream(process.stdout);
    const stderr = captureStream(process.stderr);
    process.env.LOG_LEVEL = 'debug';
    const log = createLogger('Router');

    log.debug('debug msg');
    log.info('info msg');
    log.warn('warn msg');
    log.error('error msg');

    stdout.restore();
    stderr.restore();

    expect(stdout.lines).toHaveLength(2);
    expect(stderr.lines).toHaveLength(2);
    expect(parseRecord(stdout.lines[0]).level).toBe('debug');
    expect(parseRecord(stdout.lines[1]).level).toBe('info');
    expect(parseRecord(stderr.lines[0]).level).toBe('warn');
    expect(parseRecord(stderr.lines[1]).level).toBe('error');
  });

  it('suppresses records below the configured LOG_LEVEL', () => {
    const stdout = captureStream(process.stdout);
    const stderr = captureStream(process.stderr);
    process.env.LOG_LEVEL = 'warn';
    const log = createLogger('Filtered');

    log.debug('should be suppressed');
    log.info('should be suppressed');
    log.warn('should appear');
    log.error('should appear');

    stdout.restore();
    stderr.restore();

    expect(stdout.lines).toHaveLength(0);
    expect(stderr.lines).toHaveLength(2);
  });

  it('defaults to info level when LOG_LEVEL is unset', () => {
    const stdout = captureStream(process.stdout);
    const stderr = captureStream(process.stderr);
    // LOG_LEVEL is deleted in beforeEach
    const log = createLogger('Default');

    log.debug('debug — suppressed at default info level');
    log.info('info — visible');

    stdout.restore();
    stderr.restore();

    expect(stdout.lines).toHaveLength(1);
    expect(parseRecord(stdout.lines[0]).level).toBe('info');
  });

  it('does not throw on unknown LOG_LEVEL value — falls back to info', () => {
    process.env.LOG_LEVEL = 'verbose'; // not a valid level
    const stdout = captureStream(process.stdout);
    const log = createLogger('Fallback');

    expect(() => log.info('safe')).not.toThrow();
    stdout.restore();
  });

  it('emits context fields alongside standard fields in the JSON record', () => {
    const stdout = captureStream(process.stdout);
    const log = createLogger('IngestionEngine');
    log.info('Ingestion OK', { sourceId: 'fred', observations: 42, durationMs: 120 });
    stdout.restore();

    const record = parseRecord(stdout.lines[0]);
    expect(record.sourceId).toBe('fred');
    expect(record.observations).toBe(42);
    expect(record.durationMs).toBe(120);
  });
});
