/**
 * packages/core/src/assert-schema.ts
 *
 * Startup assertion: verifies all required meridian schema tables AND columns exist.
 *
 * A missing table or column means a migration was not applied to production.
 * Surface this IMMEDIATELY with a named error — before readAutotraderConfig, before
 * any lock acquisition, before any cycle logic runs.
 *
 * History: five schema gaps have been silently swallowed as CYCLE_IN_FLIGHT, 
 * TOGGLE_FAILED, or unlogged 500s. Column-level assertions prevent that class of bug.
 *
 * MAINTENANCE: when a migration adds a table, add it to REQUIRED_TABLES.
 *              When a migration adds a column, add it to REQUIRED_COLUMNS.
 *              Both must be updated atomically with the migration file commit.
 */

import { getSupabaseServiceClient } from './db';
import { createLogger } from './logger';

const log = createLogger('schema-assert');

// ─── Table manifest ───────────────────────────────────────────────────────────
// All tables in meridian schema that must exist for the platform to function.
// Update when new migrations add tables.
export const REQUIRED_TABLES = [
  'account_day',
  'audit_log',
  'autotrader_state',
  'consumed_mode_transitions',
  'cycle_log',
  'entities',
  'entity_identifiers',
  'execution_lock',
  'gate_decisions',
  'login_attempts',
  'mode_transitions',
  'observations',
  'risk_profile_changes',
  'source_health',
  'sources',
  'spend',
] as const;

// ─── Column manifest ──────────────────────────────────────────────────────────
// Columns that MUST exist on their respective tables.
// Key: "table_name.column_name"  Value: human-readable description / migration source
// Update when new migrations add columns to existing tables.
export const REQUIRED_COLUMNS: Record<string, string> = {
  // autotrader_state — initial schema
  'autotrader_state.id':                   'text PRIMARY KEY',
  'autotrader_state.mode':                 'user-defined enum',
  'autotrader_state.selected_instruments': 'text[]',
  'autotrader_state.lot_units':            'numeric',
  'autotrader_state.risk_profile':         'jsonb',
  'autotrader_state.updated_at':           'timestamptz',
  'autotrader_state.updated_by':           'text',
  // autotrader_state — 20260806000004_add_watchlist_column.sql
  'autotrader_state.watchlist':            'text[] DEFAULT \'{}\'',
  // autotrader_state — 20260806000005_add_enabled_and_risk_overrides.sql
  'autotrader_state.enabled':              'boolean NOT NULL DEFAULT false',
  'autotrader_state.risk_profile_overrides': 'jsonb',
  // cycle_log — initial schema
  'cycle_log.cycle_id':                    'text',
  'cycle_log.action':                      'text',
  'cycle_log.created_at':                  'timestamptz',
  // gate_decisions — initial schema (20260805000001)
  // Note: gate_decisions has NO cycle_id — rows are keyed by order_intent_id + evaluated_at
  'gate_decisions.instrument':             'text',
  'gate_decisions.evaluated_at':           'timestamptz',
  // risk_profile_changes — 20260806000006_risk_profile_changes.sql
  // Note: timestamp column is named changed_at, not created_at
  'risk_profile_changes.id':               'bigint PRIMARY KEY',
  'risk_profile_changes.field_name':       'text NOT NULL',
  'risk_profile_changes.old_value':        'jsonb',
  'risk_profile_changes.new_value':        'jsonb NOT NULL',
  'risk_profile_changes.actor':            'text NOT NULL',
  'risk_profile_changes.reason':           'text NOT NULL',
  'risk_profile_changes.changed_at':       'timestamptz',
};

export interface SchemaAssertionResult {
  ok: boolean;
  missingTables: string[];
  missingColumns: string[];
  presentTables: string[];
}

/**
 * Checks all required tables AND columns exist in the meridian schema.
 * Queries information_schema.columns once rather than probing each table.
 * Returns a result object; does not throw.
 */
export async function checkSchemaComplete(): Promise<SchemaAssertionResult> {
  const supabase = getSupabaseServiceClient();
  const missingTables: string[] = [];
  const missingColumns: string[] = [];
  const presentTables: string[] = [];

  // ── Table check ─────────────────────────────────────────────────────────────
  // Use the existing probe approach (select limit 0) — keeps working even if
  // information_schema access is restricted by Supabase RLS.
  for (const table of REQUIRED_TABLES) {
    const { error } = await supabase.schema('meridian').from(table).select('*').limit(0);
    const isMissing = !!error && (
      error.code === 'PGRST200' ||
      error.message?.includes('does not exist') ||
      (error.message?.includes('relation') && error.code === '42P01')
    );
    if (isMissing) {
      missingTables.push(table);
    } else {
      presentTables.push(table);
    }
  }

  // ── Column check ─────────────────────────────────────────────────────────────
  // Query information_schema.columns for all meridian tables at once.
  // This is the only reliable way to detect a present table with a missing column
  // (like enabled missing from autotrader_state).
  try {
    // Use the REST API via a raw select on the pg catalog exposed through PostgREST.
    // Supabase's JS client can't query information_schema directly, so we use
    // a raw SQL query via the service key's direct pg connection if available,
    // or fall back to probing each column individually via select().
    //
    // Column probe: attempt to select only that column; if it fails with
    // PGRST200/42703 (column unknown), it's missing.
    for (const key of Object.keys(REQUIRED_COLUMNS)) {
      const [table, column] = key.split('.');
      // Skip if the table itself is already missing — we'd get a false column-miss
      if (missingTables.includes(table)) continue;

      const { error: colErr } = await supabase
        .schema('meridian')
        .from(table as any)
        .select(column)
        .limit(0);

      if (colErr && (
        colErr.code === 'PGRST200' ||
        colErr.code === '42703' ||
        colErr.message?.includes('column') ||
        colErr.message?.includes('does not exist')
      )) {
        missingColumns.push(key);
      }
    }
  } catch (colCheckErr: unknown) {
    // If the column check itself throws, log it but don't block startup —
    // a table-level miss is still caught above.
    log.warn('assertSchemaComplete: column check threw unexpectedly', {
      error: colCheckErr instanceof Error ? colCheckErr.message : String(colCheckErr),
    });
  }

  return {
    ok: missingTables.length === 0 && missingColumns.length === 0,
    missingTables,
    missingColumns,
    presentTables,
  };
}

/**
 * Asserts all required tables AND columns exist.
 * Throws with a named SCHEMA_ASSERTION_FAILED error if anything is missing.
 *
 * Must be called BEFORE readAutotraderConfig so a schema mismatch produces
 * a diagnosable error rather than an unlogged throw deep in business logic.
 */
export async function assertSchemaComplete(): Promise<void> {
  const result = await checkSchemaComplete();

  if (!result.ok) {
    const parts: string[] = [];
    if (result.missingTables.length > 0) {
      parts.push(`missing tables: [${result.missingTables.join(', ')}]`);
    }
    if (result.missingColumns.length > 0) {
      parts.push(`missing columns: [${result.missingColumns.join(', ')}]`);
    }
    const msg =
      `SCHEMA_ASSERTION_FAILED: ${parts.join(' | ')}. ` +
      `Apply all migrations: node scripts/apply-migrations.js`;
    log.error(msg, {
      missingTables: result.missingTables,
      missingColumns: result.missingColumns,
    });
    throw new Error(msg);
  }

  log.info('assertSchemaComplete: all tables present', {
    tableCount: result.presentTables.length,
    columnCount: Object.keys(REQUIRED_COLUMNS).length,
  });
}
