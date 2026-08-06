/**
 * packages/core/src/state.ts
 *
 * Typed read/write functions for the five meridian autotrader tables.
 * Server-side only. Uses the service-role client for all database operations.
 */
import { getSupabaseServiceClient } from './db';
import { createLogger } from './logger';

const log = createLogger('state');

// ─── Shared Types ─────────────────────────────────────────────────────────────

export type AutotraderMode = 'OBSERVE' | 'PAPER' | 'LIVE';

export interface RiskProfileConfig {
  slPips: number;
  tpPips: number;
  useTrailingStop: boolean;
  trailingDistancePips: number;
  breakEvenTriggerPips: number;
  sendTpToOanda: boolean;
}

export interface AutotraderConfig {
  mode: AutotraderMode;
  selectedInstruments: string[];
  lotUnits: number;
  autoStopAt: string | null;
  autoStopLabel: string | null;
  riskProfile: RiskProfileConfig;
  updatedAt: string;
  updatedBy: string | null;
}

// ─── Internal DB row shape ────────────────────────────────────────────────────

interface AutotraderStateRow {
  id: string;
  mode: AutotraderMode;
  selected_instruments: string[];
  lot_units: number;
  auto_stop_at: string | null;
  auto_stop_label: string | null;
  risk_profile: unknown; // jsonb — validated on read
  updated_at: string;
  updated_by: string | null;
}

const DEFAULT_RISK_PROFILE: RiskProfileConfig = {
  slPips: 30,
  tpPips: 60,
  useTrailingStop: true,
  trailingDistancePips: 15,
  breakEvenTriggerPips: 20,
  sendTpToOanda: true,
};

function isRiskProfileConfig(v: unknown): v is RiskProfileConfig {
  if (typeof v !== 'object' || v === null) return false;
  const o = v as Record<string, unknown>;
  return (
    typeof o['slPips'] === 'number' &&
    typeof o['tpPips'] === 'number' &&
    typeof o['useTrailingStop'] === 'boolean' &&
    typeof o['trailingDistancePips'] === 'number' &&
    typeof o['breakEvenTriggerPips'] === 'number' &&
    typeof o['sendTpToOanda'] === 'boolean'
  );
}

function rowToConfig(row: AutotraderStateRow): AutotraderConfig {
  return {
    mode: row.mode,
    selectedInstruments: row.selected_instruments ?? [],
    lotUnits: row.lot_units ?? 100,
    autoStopAt: row.auto_stop_at ?? null,
    autoStopLabel: row.auto_stop_label ?? null,
    riskProfile: isRiskProfileConfig(row.risk_profile)
      ? row.risk_profile
      : DEFAULT_RISK_PROFILE,
    updatedAt: row.updated_at,
    updatedBy: row.updated_by ?? null,
  };
}

// ─── autotrader_state ─────────────────────────────────────────────────────────

/**
 * Reads the singleton autotrader config row.
 * Returns null if the row cannot be read — callers must treat null as a hard
 * failure; there are no silent defaults at this layer.
 */
export async function readAutotraderConfig(): Promise<AutotraderConfig | null> {
  try {
    const sb = getSupabaseServiceClient();
    const { data, error } = await sb
      .schema('meridian')
      .from('autotrader_state')
      .select('*')
      .eq('id', 'singleton')
      .single();

    if (error || !data) {
      console.error('readAutotraderConfig query error:', error);
      log.warn('readAutotraderConfig: read failed', { error: error?.message });
      return null;
    }

    return rowToConfig(data as AutotraderStateRow);
  } catch (err: unknown) {
    console.error('readAutotraderConfig caught exception:', err);
    log.error('readAutotraderConfig: unexpected error', { err });
    return null;
  }
}

export interface AutotraderConfigPatch {
  mode?: AutotraderMode;
  selectedInstruments?: string[];
  lotUnits?: number;
  autoStopAt?: string | null;
  autoStopLabel?: string | null;
  riskProfile?: Partial<RiskProfileConfig>;
  updatedBy?: string;
}

/**
 * Upserts the singleton autotrader config row.
 * Reads current state first so partial patches compose correctly.
 * Returns the updated config, or null on failure.
 */
export async function writeAutotraderConfig(
  patch: AutotraderConfigPatch
): Promise<AutotraderConfig | null> {
  try {
    const current = await readAutotraderConfig();

    const mergedRiskProfile: RiskProfileConfig = {
      ...(current?.riskProfile ?? DEFAULT_RISK_PROFILE),
      ...(patch.riskProfile ?? {}),
    };

    const upsertPayload: Omit<AutotraderStateRow, 'id'> & { id: string } = {
      id: 'singleton',
      mode: patch.mode ?? current?.mode ?? 'OBSERVE',
      selected_instruments:
        patch.selectedInstruments ?? current?.selectedInstruments ?? [],
      lot_units: patch.lotUnits ?? current?.lotUnits ?? 100,
      auto_stop_at:
        patch.autoStopAt !== undefined
          ? patch.autoStopAt
          : (current?.autoStopAt ?? null),
      auto_stop_label:
        patch.autoStopLabel !== undefined
          ? patch.autoStopLabel
          : (current?.autoStopLabel ?? null),
      risk_profile: mergedRiskProfile,
      updated_at: new Date().toISOString(),
      updated_by: patch.updatedBy ?? 'system',
    };

    const sb = getSupabaseServiceClient();
    const { data, error } = await sb
      .schema('meridian')
      .from('autotrader_state')
      .upsert(upsertPayload, { onConflict: 'id' })
      .select()
      .single();

    if (error || !data) {
      log.error('writeAutotraderConfig: upsert failed', { error: error?.message });
      return null;
    }

    return rowToConfig(data as AutotraderStateRow);
  } catch (err: unknown) {
    log.error('writeAutotraderConfig: unexpected error', { err });
    return null;
  }
}

// ─── mode_transitions ─────────────────────────────────────────────────────────

export interface ModeTransitionRecord {
  fromMode: AutotraderMode;
  toMode: AutotraderMode;
  actor: string;
  reason: string;
}

/**
 * Inserts one mode transition row via the service-role client.
 * The CHECK constraint at the database level enforces OBSERVE→LIVE is impossible.
 * Returns true on success, false on failure.
 */
export async function insertModeTransition(
  t: ModeTransitionRecord
): Promise<boolean> {
  try {
    const sb = getSupabaseServiceClient();
    const { error } = await sb
      .schema('meridian')
      .from('mode_transitions')
      .insert({
        from_mode: t.fromMode,
        to_mode: t.toMode,
        actor: t.actor,
        reason: t.reason,
        requested_at: new Date().toISOString(),
      });

    if (error) {
      log.error('insertModeTransition: insert failed', { error: error.message });
      return false;
    }
    return true;
  } catch (err: unknown) {
    log.error('insertModeTransition: unexpected error', { err });
    return false;
  }
}

// ─── gate_decisions ───────────────────────────────────────────────────────────

export interface GateDecisionRecord {
  orderIntentId: string;
  instrument: string;
  direction: 'BUY' | 'SELL';
  units: bigint;
  entryPrice: string;
  stopLossPrice: string;
  takeProfitPrice: string | null;
  profileId: string;
  profileSnapshot: Record<string, unknown>;
  accountState: Record<string, unknown>;
  approved: boolean;
  reasonCode: string | null;
  tokenId: string | null;
}

/**
 * Inserts one gate decision row (approval or rejection) via the service-role
 * client. Fire-and-forget — logs on failure but does not throw.
 */
export async function insertGateDecision(d: GateDecisionRecord): Promise<void> {
  try {
    const sb = getSupabaseServiceClient();
    const { error } = await sb
      .schema('meridian')
      .from('gate_decisions')
      .insert({
        order_intent_id: d.orderIntentId,
        instrument: d.instrument,
        direction: d.direction,
        units: String(d.units),
        entry_price: d.entryPrice,
        stop_loss_price: d.stopLossPrice,
        take_profit_price: d.takeProfitPrice,
        profile_id: d.profileId,
        profile_snapshot: d.profileSnapshot,
        account_state: d.accountState,
        approved: d.approved,
        reason_code: d.reasonCode,
        token_id: d.tokenId,
        evaluated_at: new Date().toISOString(),
      });

    if (error) {
      log.error('insertGateDecision: insert failed', { error: error.message });
    }
  } catch (err: unknown) {
    log.error('insertGateDecision: unexpected error', { err });
  }
}

// ─── cycle_log ────────────────────────────────────────────────────────────────

export interface CycleLogEntry {
  cycleId: string;
  instrument: string | null;
  action: string;
  reason: string | null;
  orderId: string | null;
}

/**
 * Inserts one cycle log row via the service-role client. Fire-and-forget.
 */
export async function insertCycleLog(entry: CycleLogEntry): Promise<void> {
  try {
    const sb = getSupabaseServiceClient();
    const { error } = await sb
      .schema('meridian')
      .from('cycle_log')
      .insert({
        cycle_id: entry.cycleId,
        instrument: entry.instrument,
        action: entry.action,
        reason: entry.reason,
        order_id: entry.orderId,
        created_at: new Date().toISOString(),
      });

    if (error) {
      log.error('insertCycleLog: insert failed', { error: error.message });
    }
  } catch (err: unknown) {
    log.error('insertCycleLog: unexpected error', { err });
  }
}

// ─── account_day ──────────────────────────────────────────────────────────────

export interface AccountDayRecord {
  dayDate: string; // YYYY-MM-DD
  openingBalance: bigint;
  openingBalanceCapturedAt: string;
  highWaterMark: bigint;
  highWaterMarkUpdatedAt: string;
}

/**
 * Upserts one account_day row via the service-role client. Fire-and-forget.
 */
export async function upsertAccountDay(d: AccountDayRecord): Promise<void> {
  try {
    const sb = getSupabaseServiceClient();
    const { error } = await sb
      .schema('meridian')
      .from('account_day')
      .upsert(
        {
          day_date: d.dayDate,
          opening_balance: String(d.openingBalance),
          opening_balance_captured_at: d.openingBalanceCapturedAt,
          high_water_mark: String(d.highWaterMark),
          high_water_mark_updated_at: d.highWaterMarkUpdatedAt,
        },
        { onConflict: 'day_date' }
      );

    if (error) {
      log.error('upsertAccountDay: upsert failed', { error: error.message });
    }
  } catch (err: unknown) {
    log.error('upsertAccountDay: unexpected error', { err });
  }
}

// ─── Trade map for OANDA position reconciliation ──────────────────────────────

interface CycleLogTradeRow {
  order_id: string;
  action: string;
  reason: string | null;
  instrument: string | null;
}

/**
 * Reads cycle_log rows that have an order_id (executed trades), building a
 * lookup map keyed by the raw OANDA order ID as stored in cycle_log.
 * Returns an empty map on any failure — callers degrade gracefully.
 */
export async function readCycleLogTradeMap(): Promise<
  Record<string, { action: string; reason: string | null; instrument: string | null }>
> {
  const map: Record<
    string,
    { action: string; reason: string | null; instrument: string | null }
  > = {};

  try {
    const sb = getSupabaseServiceClient();
    const { data, error } = await sb
      .schema('meridian')
      .from('cycle_log')
      .select('order_id, action, reason, instrument')
      .not('order_id', 'is', null)
      .order('created_at', { ascending: false })
      .limit(500);

    if (error || !data) {
      log.warn('readCycleLogTradeMap: query failed', { error: error?.message });
      return map;
    }

    for (const row of data as CycleLogTradeRow[]) {
      if (!row.order_id) continue;
      const entry = { action: row.action, reason: row.reason, instrument: row.instrument };
      map[row.order_id] = entry;
    }
  } catch (err: unknown) {
    log.error('readCycleLogTradeMap: unexpected error', { err });
  }

  return map;
}
