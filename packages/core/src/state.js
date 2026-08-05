"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.readAutotraderConfig = readAutotraderConfig;
exports.writeAutotraderConfig = writeAutotraderConfig;
exports.insertModeTransition = insertModeTransition;
exports.insertGateDecision = insertGateDecision;
exports.insertCycleLog = insertCycleLog;
exports.upsertAccountDay = upsertAccountDay;
exports.readCycleLogTradeMap = readCycleLogTradeMap;
/**
 * packages/core/src/state.ts
 *
 * Typed read/write functions for the five meridian autotrader tables.
 * Server-side only. Uses the service-role client for writes to gate_decisions
 * and mode_transitions; the anon client for all reads and config upserts.
 */
const db_1 = require("./db");
const logger_1 = require("./logger");
const log = (0, logger_1.createLogger)('state');
const DEFAULT_RISK_PROFILE = {
    slPips: 30,
    tpPips: 60,
    useTrailingStop: true,
    trailingDistancePips: 15,
    breakEvenTriggerPips: 20,
    sendTpToOanda: true,
};
function isRiskProfileConfig(v) {
    if (typeof v !== 'object' || v === null)
        return false;
    const o = v;
    return (typeof o['slPips'] === 'number' &&
        typeof o['tpPips'] === 'number' &&
        typeof o['useTrailingStop'] === 'boolean' &&
        typeof o['trailingDistancePips'] === 'number' &&
        typeof o['breakEvenTriggerPips'] === 'number' &&
        typeof o['sendTpToOanda'] === 'boolean');
}
function rowToConfig(row) {
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
async function readAutotraderConfig() {
    try {
        const sb = (0, db_1.getSupabaseClient)();
        const { data, error } = await sb
            .schema('meridian')
            .from('autotrader_state')
            .select('*')
            .eq('id', 'singleton')
            .single();
        if (error || !data) {
            log.warn('readAutotraderConfig: read failed', { error: error?.message });
            return null;
        }
        return rowToConfig(data);
    }
    catch (err) {
        log.error('readAutotraderConfig: unexpected error', { err });
        return null;
    }
}
/**
 * Upserts the singleton autotrader config row.
 * Reads current state first so partial patches compose correctly.
 * Returns the updated config, or null on failure.
 */
async function writeAutotraderConfig(patch) {
    try {
        const current = await readAutotraderConfig();
        const mergedRiskProfile = {
            ...(current?.riskProfile ?? DEFAULT_RISK_PROFILE),
            ...(patch.riskProfile ?? {}),
        };
        const upsertPayload = {
            id: 'singleton',
            mode: patch.mode ?? current?.mode ?? 'OBSERVE',
            selected_instruments: patch.selectedInstruments ?? current?.selectedInstruments ?? [],
            lot_units: patch.lotUnits ?? current?.lotUnits ?? 100,
            auto_stop_at: patch.autoStopAt !== undefined
                ? patch.autoStopAt
                : (current?.autoStopAt ?? null),
            auto_stop_label: patch.autoStopLabel !== undefined
                ? patch.autoStopLabel
                : (current?.autoStopLabel ?? null),
            risk_profile: mergedRiskProfile,
            updated_at: new Date().toISOString(),
            updated_by: patch.updatedBy ?? 'system',
        };
        const sb = (0, db_1.getSupabaseClient)();
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
        return rowToConfig(data);
    }
    catch (err) {
        log.error('writeAutotraderConfig: unexpected error', { err });
        return null;
    }
}
/**
 * Inserts one mode transition row via the service-role client.
 * The CHECK constraint at the database level enforces OBSERVE→LIVE is impossible.
 * Returns true on success, false on failure.
 */
async function insertModeTransition(t) {
    try {
        const sb = (0, db_1.getSupabaseServiceClient)();
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
    }
    catch (err) {
        log.error('insertModeTransition: unexpected error', { err });
        return false;
    }
}
/**
 * Inserts one gate decision row (approval or rejection) via the service-role
 * client. Fire-and-forget — logs on failure but does not throw.
 */
async function insertGateDecision(d) {
    try {
        const sb = (0, db_1.getSupabaseServiceClient)();
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
    }
    catch (err) {
        log.error('insertGateDecision: unexpected error', { err });
    }
}
/**
 * Inserts one cycle log row via the service-role client. Fire-and-forget.
 */
async function insertCycleLog(entry) {
    try {
        const sb = (0, db_1.getSupabaseServiceClient)();
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
    }
    catch (err) {
        log.error('insertCycleLog: unexpected error', { err });
    }
}
/**
 * Upserts one account_day row via the service-role client. Fire-and-forget.
 */
async function upsertAccountDay(d) {
    try {
        const sb = (0, db_1.getSupabaseServiceClient)();
        const { error } = await sb
            .schema('meridian')
            .from('account_day')
            .upsert({
            day_date: d.dayDate,
            opening_balance: String(d.openingBalance),
            opening_balance_captured_at: d.openingBalanceCapturedAt,
            high_water_mark: String(d.highWaterMark),
            high_water_mark_updated_at: d.highWaterMarkUpdatedAt,
        }, { onConflict: 'day_date' });
        if (error) {
            log.error('upsertAccountDay: upsert failed', { error: error.message });
        }
    }
    catch (err) {
        log.error('upsertAccountDay: unexpected error', { err });
    }
}
/**
 * Reads cycle_log rows that have an order_id (executed trades), building a
 * lookup map keyed by order_id in all three formats used by oanda-positions.
 * Returns an empty map on any failure — callers degrade gracefully.
 */
async function readCycleLogTradeMap() {
    const map = {};
    try {
        const sb = (0, db_1.getSupabaseClient)();
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
        for (const row of data) {
            if (!row.order_id)
                continue;
            const entry = { action: row.action, reason: row.reason, instrument: row.instrument };
            map[row.order_id] = entry;
            map[`OANDA-${row.order_id}`] = entry;
            map[`oanda_${row.order_id}`] = entry;
        }
    }
    catch (err) {
        log.error('readCycleLogTradeMap: unexpected error', { err });
    }
    return map;
}
//# sourceMappingURL=state.js.map