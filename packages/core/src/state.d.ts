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
/**
 * Reads the singleton autotrader config row.
 * Returns null if the row cannot be read — callers must treat null as a hard
 * failure; there are no silent defaults at this layer.
 */
export declare function readAutotraderConfig(): Promise<AutotraderConfig | null>;
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
export declare function writeAutotraderConfig(patch: AutotraderConfigPatch): Promise<AutotraderConfig | null>;
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
export declare function insertModeTransition(t: ModeTransitionRecord): Promise<boolean>;
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
export declare function insertGateDecision(d: GateDecisionRecord): Promise<void>;
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
export declare function insertCycleLog(entry: CycleLogEntry): Promise<void>;
export interface AccountDayRecord {
    dayDate: string;
    openingBalance: bigint;
    openingBalanceCapturedAt: string;
    highWaterMark: bigint;
    highWaterMarkUpdatedAt: string;
}
/**
 * Upserts one account_day row via the service-role client. Fire-and-forget.
 */
export declare function upsertAccountDay(d: AccountDayRecord): Promise<void>;
/**
 * Reads cycle_log rows that have an order_id (executed trades), building a
 * lookup map keyed by order_id in all three formats used by oanda-positions.
 * Returns an empty map on any failure — callers degrade gracefully.
 */
export declare function readCycleLogTradeMap(): Promise<Record<string, {
    action: string;
    reason: string | null;
    instrument: string | null;
}>>;
//# sourceMappingURL=state.d.ts.map