export declare enum Pillar {
    WORLD = "WORLD",
    MARKETS = "MARKETS",
    HORIZON = "HORIZON",
    UNDERCURRENT = "UNDERCURRENT",
    ALTERNATIVES = "ALTERNATIVES"
}
export type LicenceClass = 'INTERNAL_ONLY' | 'REDISTRIBUTABLE_PUBLIC' | 'COMMERCIAL_THIRD_PARTY';
export type Cadence = 'REALTIME' | 'HOURLY' | 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'ON_EVENT';
export type EntityType = 'COMPANY' | 'INSTRUMENT' | 'PERSON' | 'GOVERNMENT_BODY' | 'THEME' | 'COMMODITY' | 'LOCATION' | 'EVENT';
export interface EntityIdentifier {
    type: 'LEI' | 'CIK' | 'ISIN' | 'TICKER' | 'COMPANIES_HOUSE' | 'EXCHANGE_SYMBOL' | 'INTERNAL';
    value: string;
    source: string;
    confidence: number;
}
export interface Entity {
    id: string;
    type: EntityType;
    name: string;
    identifiers: EntityIdentifier[];
    created_at: string;
    updated_at: string;
}
export interface Observation {
    id: string;
    source_id: string;
    entity_id: string | null;
    pillar: Pillar;
    metric: string;
    value_numeric: bigint | null;
    value_scale: number | null;
    value_text: string | null;
    unit: string | null;
    source_timestamp: string;
    captured_at: string;
    staleness_seconds: number;
    confidence: number;
    licence_class: LicenceClass;
    redistributable: boolean;
    raw_ref: string;
}
export type SourceHealthState = 'HEALTHY' | 'DEGRADED' | 'OFFLINE' | 'NOT_CONNECTED';
export interface SourceHealth {
    source_id: string;
    state: SourceHealthState;
    last_success_at: string | null;
    expected_cadence: Cadence;
    staleness_seconds: number;
    error_rate_24h: number;
    rows_written_last_window: number;
    quota_consumed_mtd: number;
    cost_mtd_usd: number;
    updated_at: string;
}
export interface TimeWindow {
    start: string;
    end: string;
}
export interface RawPayload {
    source_id: string;
    ref: string;
    payload: unknown;
    captured_at: string;
}
export type Result<T, E = Error> = {
    success: true;
    value: T;
} | {
    success: false;
    error: E;
};
export declare function ok<T>(value: T): Result<T, never>;
export declare function err<E>(error: E): Result<never, E>;
//# sourceMappingURL=types.d.ts.map