import { Pillar, Cadence, LicenceClass } from '@meridian/core';
export interface SourceRegistryEntry {
    id: string;
    name: string;
    pillar: Pillar;
    category: string;
    cadence: Cadence;
    licence_class: LicenceClass;
    redistributable: boolean;
    auth_method: 'API_KEY' | 'OAUTH2' | 'BEARER' | 'NONE' | 'MUTUAL_TLS';
    base_url: string;
    quota_monthly_requests: number | null;
    cost_model: 'FREE' | 'FREEMIUM' | 'FLAT_MONTHLY' | 'USAGE_METERED';
    staleness_sla_seconds: number;
    wave_number: number;
}
export declare const WAVE_1_REGISTRY: SourceRegistryEntry[];
export declare function getRegistrySource(id: string): SourceRegistryEntry | undefined;
//# sourceMappingURL=index.d.ts.map