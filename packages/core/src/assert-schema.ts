/**
 * packages/core/src/assert-schema.ts
 *
 * Startup assertion: verifies all required meridian schema tables exist.
 *
 * A missing table means a migration was not applied. Surface this immediately
 * at server startup rather than as a misreported CYCLE_IN_FLIGHT or silent error.
 *
 * Call assertSchemaComplete() once at the start of any long-lived server process
 * (engine, scheduler) or at the top of the run-cycle handler.
 */

import { getSupabaseServiceClient } from './db';
import { createLogger } from './logger';

const log = createLogger('schema-assert');

// All tables in meridian schema that must exist for the platform to function.
// Update this list when new migrations add tables.
export const REQUIRED_TABLES = [
  'account_day',
  'audit_log',
  'autotrader_state',
  'cycle_log',
  'entities',
  'entity_identifiers',
  'execution_lock',
  'gate_decisions',
  'login_attempts',
  'mode_transitions',
  'observations',
  'source_health',
  'sources',
  'spend',
] as const;

export interface SchemaAssertionResult {
  ok: boolean;
  missing: string[];
  present: string[];
}

/**
 * Checks all required tables exist in the meridian schema.
 * Returns a result object; does not throw.
 */
export async function checkSchemaComplete(): Promise<SchemaAssertionResult> {
  const supabase = getSupabaseServiceClient();

  // Use information_schema via RPC to list existing meridian tables.
  // supabase-js schema option sets the search_path — we need to bypass it
  // to query information_schema directly, so we use a raw query via the
  // service client's pg channel if available, or fall back to checking
  // each table individually.
  const existing = new Set<string>();

  for (const table of REQUIRED_TABLES) {
    const { error } = await supabase.from(table).select('*').limit(0);
    // If the table doesn't exist, error.code = 'PGRST200' or message contains
    // "relation does not exist". Any other error (permissions, etc.) is treated
    // as the table being present — the assertion is specifically for MISSING tables.
    if (error && (
      error.code === 'PGRST200' ||
      error.message?.includes('does not exist') ||
      error.message?.includes('relation') && error.code === '42P01'
    )) {
      // Table is missing
    } else {
      existing.add(table);
    }
  }

  const missing = REQUIRED_TABLES.filter(t => !existing.has(t));
  const present = REQUIRED_TABLES.filter(t => existing.has(t));

  return { ok: missing.length === 0, missing, present };
}

/**
 * Asserts all required tables exist. Throws if any are missing.
 * Call at the start of the cycle handler or server startup.
 */
export async function assertSchemaComplete(): Promise<void> {
  const result = await checkSchemaComplete();

  if (!result.ok) {
    const msg = `SCHEMA ASSERTION FAILED: ${result.missing.length} required table(s) missing from meridian schema: [${result.missing.join(', ')}]. ` +
      `Apply all migrations in infra/supabase/migrations/ using: node scripts/apply-migrations.js`;
    log.error(msg, { missing: result.missing, present: result.present });
    throw new Error(msg);
  }

  log.info('assertSchemaComplete: all tables present', { tableCount: result.present.length });
}
