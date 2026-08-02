import { NextResponse } from 'next/server';
export declare function GET(): Promise<NextResponse<{
    status: string;
    timestamp: string;
    total_sources: number;
    connected_sources: number;
    sources: ({
        name: string;
        pillar: import("@meridian/core").Pillar;
        licence_class: import("@meridian/core").LicenceClass;
        redistributable: boolean;
        source_id: string;
        state: import("@meridian/core").SourceHealthState;
        last_success_at: string | null;
        expected_cadence: import("@meridian/core").Cadence;
        staleness_seconds: number;
        error_rate_24h: number;
        rows_written_last_window: number;
        quota_consumed_mtd: number;
        cost_mtd_usd: number;
        updated_at: string;
    } | {
        source_id: string;
        name: string;
        pillar: import("@meridian/core").Pillar;
        state: string;
        expected_cadence: import("@meridian/core").Cadence;
        staleness_seconds: number;
        error_rate_24h: number;
        rows_written_last_window: number;
        quota_consumed_mtd: number;
        cost_mtd_usd: number;
        licence_class: import("@meridian/core").LicenceClass;
        redistributable: boolean;
        updated_at: string;
    })[];
}>>;
//# sourceMappingURL=route.d.ts.map