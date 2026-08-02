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

export const WAVE_1_REGISTRY: SourceRegistryEntry[] = [
  {
    id: 'fred',
    name: 'FRED Macroeconomic Data',
    pillar: Pillar.WORLD,
    category: 'Macroeconomics',
    cadence: 'DAILY',
    licence_class: 'REDISTRIBUTABLE_PUBLIC',
    redistributable: true,
    auth_method: 'API_KEY',
    base_url: 'https://api.stlouisfed.org/fred',
    quota_monthly_requests: 120000,
    cost_model: 'FREE',
    staleness_sla_seconds: 86400,
    wave_number: 1
  },
  {
    id: 'us_treasury_fiscal',
    name: 'US Treasury Fiscal Data',
    pillar: Pillar.WORLD,
    category: 'Rates & Debt',
    cadence: 'DAILY',
    licence_class: 'REDISTRIBUTABLE_PUBLIC',
    redistributable: true,
    auth_method: 'NONE',
    base_url: 'https://api.fiscaldata.treasury.gov/services/api/fiscal_service',
    quota_monthly_requests: null,
    cost_model: 'FREE',
    staleness_sla_seconds: 86400,
    wave_number: 1
  },
  {
    id: 'eia',
    name: 'EIA Energy Inventories',
    pillar: Pillar.WORLD,
    category: 'Energy Commodities',
    cadence: 'WEEKLY',
    licence_class: 'REDISTRIBUTABLE_PUBLIC',
    redistributable: true,
    auth_method: 'API_KEY',
    base_url: 'https://api.eia.gov/v2',
    quota_monthly_requests: 100000,
    cost_model: 'FREE',
    staleness_sla_seconds: 604800,
    wave_number: 1
  },
  {
    id: 'twelve_data',
    name: 'Twelve Data Financial Markets',
    pillar: Pillar.MARKETS,
    category: 'Multi-Asset Prices',
    cadence: 'REALTIME',
    licence_class: 'COMMERCIAL_THIRD_PARTY',
    redistributable: false,
    auth_method: 'API_KEY',
    base_url: 'https://api.twelvedata.com',
    quota_monthly_requests: 24000,
    cost_model: 'FREEMIUM',
    staleness_sla_seconds: 300,
    wave_number: 1
  },
  {
    id: 'finnhub',
    name: 'Finnhub Market Data & Fundamentals',
    pillar: Pillar.MARKETS,
    category: 'Stocks & News',
    cadence: 'REALTIME',
    licence_class: 'COMMERCIAL_THIRD_PARTY',
    redistributable: false,
    auth_method: 'API_KEY',
    base_url: 'https://finnhub.io/api/v1',
    quota_monthly_requests: 180000,
    cost_model: 'FREEMIUM',
    staleness_sla_seconds: 300,
    wave_number: 1
  },
  {
    id: 'cftc_cot',
    name: 'CFTC Commitment of Traders',
    pillar: Pillar.MARKETS,
    category: 'Futures Positioning',
    cadence: 'WEEKLY',
    licence_class: 'REDISTRIBUTABLE_PUBLIC',
    redistributable: true,
    auth_method: 'NONE',
    base_url: 'https://www.cftc.gov/dea/history',
    quota_monthly_requests: null,
    cost_model: 'FREE',
    staleness_sla_seconds: 604800,
    wave_number: 1
  },
  {
    id: 'fca_short_positions',
    name: 'FCA UK Net Short Positions',
    pillar: Pillar.MARKETS,
    category: 'Short Interest',
    cadence: 'DAILY',
    licence_class: 'REDISTRIBUTABLE_PUBLIC',
    redistributable: true,
    auth_method: 'NONE',
    base_url: 'https://www.fca.org.uk/publication/data',
    quota_monthly_requests: null,
    cost_model: 'FREE',
    staleness_sla_seconds: 86400,
    wave_number: 1
  },
  {
    id: 'sec_edgar',
    name: 'SEC EDGAR Filings',
    pillar: Pillar.HORIZON,
    category: 'Corporate Filings & IPOs',
    cadence: 'REALTIME',
    licence_class: 'REDISTRIBUTABLE_PUBLIC',
    redistributable: true,
    auth_method: 'NONE',
    base_url: 'https://data.sec.gov',
    quota_monthly_requests: null,
    cost_model: 'FREE',
    staleness_sla_seconds: 3600,
    wave_number: 1
  },
  {
    id: 'nasdaq_ipo_calendar',
    name: 'Nasdaq IPO Calendar',
    pillar: Pillar.HORIZON,
    category: 'IPO Pipeline',
    cadence: 'DAILY',
    licence_class: 'INTERNAL_ONLY',
    redistributable: false,
    auth_method: 'NONE',
    base_url: 'https://api.nasdaq.com/api/ipo',
    quota_monthly_requests: null,
    cost_model: 'FREE',
    staleness_sla_seconds: 86400,
    wave_number: 1
  },
  {
    id: 'companies_house',
    name: 'UK Companies House',
    pillar: Pillar.HORIZON,
    category: 'UK Corporate Graph',
    cadence: 'DAILY',
    licence_class: 'REDISTRIBUTABLE_PUBLIC',
    redistributable: true,
    auth_method: 'API_KEY',
    base_url: 'https://api.company-information.service.gov.uk',
    quota_monthly_requests: 600000,
    cost_model: 'FREE',
    staleness_sla_seconds: 86400,
    wave_number: 1
  },
  {
    id: 'usaspending',
    name: 'USAspending.gov Federal Contracts',
    pillar: Pillar.UNDERCURRENT,
    category: 'Government Spending',
    cadence: 'DAILY',
    licence_class: 'REDISTRIBUTABLE_PUBLIC',
    redistributable: true,
    auth_method: 'NONE',
    base_url: 'https://api.usaspending.gov/api/v2',
    quota_monthly_requests: null,
    cost_model: 'FREE',
    staleness_sla_seconds: 86400,
    wave_number: 1
  },
  {
    id: 'gleif',
    name: 'GLEIF Legal Entity Identifier (LEI)',
    pillar: Pillar.UNDERCURRENT,
    category: 'Entity Graph',
    cadence: 'MONTHLY',
    licence_class: 'REDISTRIBUTABLE_PUBLIC',
    redistributable: true,
    auth_method: 'NONE',
    base_url: 'https://api.gleif.org/api/v1',
    quota_monthly_requests: null,
    cost_model: 'FREE',
    staleness_sla_seconds: 2592000,
    wave_number: 1
  },
  {
    id: 'opencorporates',
    name: 'OpenCorporates Entity Registry',
    pillar: Pillar.UNDERCURRENT,
    category: 'Entity Graph',
    cadence: 'MONTHLY',
    licence_class: 'COMMERCIAL_THIRD_PARTY',
    redistributable: false,
    auth_method: 'API_KEY',
    base_url: 'https://api.opencorporates.com/v0.4',
    quota_monthly_requests: 1000,
    cost_model: 'FREEMIUM',
    staleness_sla_seconds: 2592000,
    wave_number: 1
  },
  {
    id: 'kalshi',
    name: 'Kalshi Event Contracts',
    pillar: Pillar.ALTERNATIVES,
    category: 'Prediction Markets',
    cadence: 'REALTIME',
    licence_class: 'REDISTRIBUTABLE_PUBLIC',
    redistributable: true,
    auth_method: 'NONE',
    base_url: 'https://api.elections.kalshi.com/trade-api/v2',
    quota_monthly_requests: null,
    cost_model: 'FREE',
    staleness_sla_seconds: 60,
    wave_number: 1
  },
  {
    id: 'polymarket',
    name: 'Polymarket CLOB',
    pillar: Pillar.ALTERNATIVES,
    category: 'Prediction Markets',
    cadence: 'REALTIME',
    licence_class: 'REDISTRIBUTABLE_PUBLIC',
    redistributable: true,
    auth_method: 'NONE',
    base_url: 'https://clob.polymarket.com',
    quota_monthly_requests: null,
    cost_model: 'FREE',
    staleness_sla_seconds: 60,
    wave_number: 1
  },
  {
    id: 'manifold',
    name: 'Manifold Prediction Markets',
    pillar: Pillar.ALTERNATIVES,
    category: 'Prediction Markets Sandbox',
    cadence: 'REALTIME',
    licence_class: 'REDISTRIBUTABLE_PUBLIC',
    redistributable: true,
    auth_method: 'NONE',
    base_url: 'https://api.manifold.markets/v0',
    quota_monthly_requests: null,
    cost_model: 'FREE',
    staleness_sla_seconds: 300,
    wave_number: 1
  }
];

export function getRegistrySource(id: string): SourceRegistryEntry | undefined {
  return WAVE_1_REGISTRY.find(s => s.id === id);
}
