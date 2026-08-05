// ─── MERIDIAN Master Instrument Universe ────────────────────────────────────
// Single source of truth used by: Markets, Edge, Brief, Trade pages, TradeButton

export type AssetClass = 'FX_MAJOR' | 'FX_MINOR' | 'FX_EXOTIC' | 'US_STOCK' | 'UK_STOCK' | 'INDEX' | 'COMMODITY' | 'CRYPTO';

export interface Instrument {
  symbol: string;          // Display: "GBP/USD"
  oandaId: string;         // OANDA v20: "GBP_USD"
  tvSymbol: string;        // TradingView: "OANDA:GBPUSD"
  assetClass: AssetClass;
  description: string;     // "British Pound / US Dollar"
  digits: number;          // Price decimal places
  region?: string;         // For stocks: "US" | "UK"
  sector?: string;         // For stocks: "Technology" etc.
  minUnits?: number;       // Minimum tradeable units
}

export const ASSET_CLASS_LABELS: Record<AssetClass, string> = {
  FX_MAJOR:   'FX Majors',
  FX_MINOR:   'FX Minors',
  FX_EXOTIC:  'FX Exotics',
  US_STOCK:   'US Equities',
  UK_STOCK:   'UK Equities',
  INDEX:      'Indices',
  COMMODITY:  'Commodities',
  CRYPTO:     'Crypto',
};

export const INSTRUMENT_UNIVERSE: Instrument[] = [
  // ── FX Majors ──────────────────────────────────────────────────────────────
  { symbol: 'GBP/USD', oandaId: 'GBP_USD', tvSymbol: 'OANDA:GBPUSD', assetClass: 'FX_MAJOR', description: 'British Pound / US Dollar', digits: 5 },
  { symbol: 'EUR/USD', oandaId: 'EUR_USD', tvSymbol: 'OANDA:EURUSD', assetClass: 'FX_MAJOR', description: 'Euro / US Dollar', digits: 5 },
  { symbol: 'USD/JPY', oandaId: 'USD_JPY', tvSymbol: 'OANDA:USDJPY', assetClass: 'FX_MAJOR', description: 'US Dollar / Japanese Yen', digits: 3 },
  { symbol: 'USD/CHF', oandaId: 'USD_CHF', tvSymbol: 'OANDA:USDCHF', assetClass: 'FX_MAJOR', description: 'US Dollar / Swiss Franc', digits: 5 },
  { symbol: 'AUD/USD', oandaId: 'AUD_USD', tvSymbol: 'OANDA:AUDUSD', assetClass: 'FX_MAJOR', description: 'Australian Dollar / US Dollar', digits: 5 },
  { symbol: 'USD/CAD', oandaId: 'USD_CAD', tvSymbol: 'OANDA:USDCAD', assetClass: 'FX_MAJOR', description: 'US Dollar / Canadian Dollar', digits: 5 },
  { symbol: 'NZD/USD', oandaId: 'NZD_USD', tvSymbol: 'OANDA:NZDUSD', assetClass: 'FX_MAJOR', description: 'New Zealand Dollar / US Dollar', digits: 5 },

  // ── FX Minors ──────────────────────────────────────────────────────────────
  { symbol: 'EUR/GBP', oandaId: 'EUR_GBP', tvSymbol: 'OANDA:EURGBP', assetClass: 'FX_MINOR', description: 'Euro / British Pound', digits: 5 },
  { symbol: 'EUR/JPY', oandaId: 'EUR_JPY', tvSymbol: 'OANDA:EURJPY', assetClass: 'FX_MINOR', description: 'Euro / Japanese Yen', digits: 3 },
  { symbol: 'GBP/JPY', oandaId: 'GBP_JPY', tvSymbol: 'OANDA:GBPJPY', assetClass: 'FX_MINOR', description: 'British Pound / Japanese Yen', digits: 3 },
  { symbol: 'EUR/AUD', oandaId: 'EUR_AUD', tvSymbol: 'OANDA:EURAUD', assetClass: 'FX_MINOR', description: 'Euro / Australian Dollar', digits: 5 },
  { symbol: 'GBP/CAD', oandaId: 'GBP_CAD', tvSymbol: 'OANDA:GBPCAD', assetClass: 'FX_MINOR', description: 'British Pound / Canadian Dollar', digits: 5 },
  { symbol: 'AUD/JPY', oandaId: 'AUD_JPY', tvSymbol: 'OANDA:AUDJPY', assetClass: 'FX_MINOR', description: 'Australian Dollar / Japanese Yen', digits: 3 },
  { symbol: 'GBP/AUD', oandaId: 'GBP_AUD', tvSymbol: 'OANDA:GBPAUD', assetClass: 'FX_MINOR', description: 'British Pound / Australian Dollar', digits: 5 },
  { symbol: 'EUR/CAD', oandaId: 'EUR_CAD', tvSymbol: 'OANDA:EURCAD', assetClass: 'FX_MINOR', description: 'Euro / Canadian Dollar', digits: 5 },
  { symbol: 'CAD/JPY', oandaId: 'CAD_JPY', tvSymbol: 'OANDA:CADJPY', assetClass: 'FX_MINOR', description: 'Canadian Dollar / Japanese Yen', digits: 3 },

  // ── FX Exotics ─────────────────────────────────────────────────────────────
  { symbol: 'USD/MXN', oandaId: 'USD_MXN', tvSymbol: 'OANDA:USDMXN', assetClass: 'FX_EXOTIC', description: 'US Dollar / Mexican Peso', digits: 4 },
  { symbol: 'USD/ZAR', oandaId: 'USD_ZAR', tvSymbol: 'OANDA:USDZAR', assetClass: 'FX_EXOTIC', description: 'US Dollar / South African Rand', digits: 4 },
  { symbol: 'USD/SGD', oandaId: 'USD_SGD', tvSymbol: 'OANDA:USDSGD', assetClass: 'FX_EXOTIC', description: 'US Dollar / Singapore Dollar', digits: 5 },
  { symbol: 'USD/HKD', oandaId: 'USD_HKD', tvSymbol: 'OANDA:USDHKD', assetClass: 'FX_EXOTIC', description: 'US Dollar / Hong Kong Dollar', digits: 4 },
  { symbol: 'USD/NOK', oandaId: 'USD_NOK', tvSymbol: 'OANDA:USDNOK', assetClass: 'FX_EXOTIC', description: 'US Dollar / Norwegian Krone', digits: 4 },
  { symbol: 'USD/SEK', oandaId: 'USD_SEK', tvSymbol: 'OANDA:USDSEK', assetClass: 'FX_EXOTIC', description: 'US Dollar / Swedish Krona', digits: 4 },

  // ── Indices ────────────────────────────────────────────────────────────────
  { symbol: 'SPX500', oandaId: 'SPX500_USD', tvSymbol: 'FOREXCOM:SPXUSD', assetClass: 'INDEX', description: 'S&P 500 Index', digits: 1 },
  { symbol: 'NAS100', oandaId: 'NAS100_USD', tvSymbol: 'FOREXCOM:NSXUSD', assetClass: 'INDEX', description: 'NASDAQ 100 Index', digits: 1 },
  { symbol: 'US30',   oandaId: 'US30_USD',   tvSymbol: 'FOREXCOM:DJI',    assetClass: 'INDEX', description: 'Dow Jones Industrial Average', digits: 1 },
  { symbol: 'UK100',  oandaId: 'UK100_GBP',  tvSymbol: 'OANDA:UK100GBP',  assetClass: 'INDEX', description: 'FTSE 100 Index', digits: 1 },
  { symbol: 'GER40',  oandaId: 'DE30_EUR',   tvSymbol: 'OANDA:DE30EUR',   assetClass: 'INDEX', description: 'DAX 40 Index', digits: 1 },
  { symbol: 'JPN225', oandaId: 'JP225_USD',  tvSymbol: 'OANDA:JP225USD',  assetClass: 'INDEX', description: 'Nikkei 225 Index', digits: 0 },
  { symbol: 'AUS200', oandaId: 'AU200_AUD',  tvSymbol: 'OANDA:AU200AUD',  assetClass: 'INDEX', description: 'ASX 200 Index', digits: 1 },
  { symbol: 'HK33',   oandaId: 'HK33_HKD',  tvSymbol: 'OANDA:HK33HKD',  assetClass: 'INDEX', description: 'Hang Seng Index', digits: 1 },
  { symbol: 'EU50',   oandaId: 'EU50_EUR',   tvSymbol: 'OANDA:EU50EUR',   assetClass: 'INDEX', description: 'Euro Stoxx 50', digits: 1 },

  // ── Commodities ────────────────────────────────────────────────────────────
  { symbol: 'XAU/USD', oandaId: 'XAU_USD', tvSymbol: 'OANDA:XAUUSD',  assetClass: 'COMMODITY', description: 'Gold Spot', digits: 2 },
  { symbol: 'XAG/USD', oandaId: 'XAG_USD', tvSymbol: 'OANDA:XAGUSD',  assetClass: 'COMMODITY', description: 'Silver Spot', digits: 3 },
  { symbol: 'WTI Oil', oandaId: 'WTICO_USD', tvSymbol: 'TVC:USOIL',   assetClass: 'COMMODITY', description: 'WTI Crude Oil', digits: 2 },
  { symbol: 'Brent',   oandaId: 'BCO_USD',   tvSymbol: 'TVC:UKOIL',   assetClass: 'COMMODITY', description: 'Brent Crude Oil', digits: 2 },
  { symbol: 'Nat Gas', oandaId: 'NATGAS_USD', tvSymbol: 'TVC:NATURALGAS', assetClass: 'COMMODITY', description: 'Natural Gas', digits: 3 },
  { symbol: 'Copper',  oandaId: 'XCU_USD',   tvSymbol: 'OANDA:XCUUSD', assetClass: 'COMMODITY', description: 'Copper Spot', digits: 4 },
  { symbol: 'XPT/USD', oandaId: 'XPT_USD',   tvSymbol: 'OANDA:XPTUSD', assetClass: 'COMMODITY', description: 'Platinum Spot', digits: 2 },
  { symbol: 'XPD/USD', oandaId: 'XPD_USD',   tvSymbol: 'OANDA:XPDUSD', assetClass: 'COMMODITY', description: 'Palladium Spot', digits: 2 },

  // ── US Equities (CFDs via OANDA) ───────────────────────────────────────────
  { symbol: 'AAPL',   oandaId: 'AAPL_USD',  tvSymbol: 'NASDAQ:AAPL',  assetClass: 'US_STOCK', description: 'Apple Inc.', digits: 2, region: 'US', sector: 'Technology' },
  { symbol: 'MSFT',   oandaId: 'MSFT_USD',  tvSymbol: 'NASDAQ:MSFT',  assetClass: 'US_STOCK', description: 'Microsoft Corp.', digits: 2, region: 'US', sector: 'Technology' },
  { symbol: 'GOOGL',  oandaId: 'GOOGL_USD', tvSymbol: 'NASDAQ:GOOGL', assetClass: 'US_STOCK', description: 'Alphabet Inc.', digits: 2, region: 'US', sector: 'Technology' },
  { symbol: 'AMZN',   oandaId: 'AMZN_USD',  tvSymbol: 'NASDAQ:AMZN',  assetClass: 'US_STOCK', description: 'Amazon.com Inc.', digits: 2, region: 'US', sector: 'Consumer' },
  { symbol: 'NVDA',   oandaId: 'NVDA_USD',  tvSymbol: 'NASDAQ:NVDA',  assetClass: 'US_STOCK', description: 'NVIDIA Corp.', digits: 2, region: 'US', sector: 'Technology' },
  { symbol: 'TSLA',   oandaId: 'TSLA_USD',  tvSymbol: 'NASDAQ:TSLA',  assetClass: 'US_STOCK', description: 'Tesla Inc.', digits: 2, region: 'US', sector: 'Automotive' },
  { symbol: 'META',   oandaId: 'META_USD',  tvSymbol: 'NASDAQ:META',  assetClass: 'US_STOCK', description: 'Meta Platforms', digits: 2, region: 'US', sector: 'Technology' },
  { symbol: 'NFLX',   oandaId: 'NFLX_USD',  tvSymbol: 'NASDAQ:NFLX',  assetClass: 'US_STOCK', description: 'Netflix Inc.', digits: 2, region: 'US', sector: 'Media' },
  { symbol: 'JPM',    oandaId: 'JPM_USD',   tvSymbol: 'NYSE:JPM',     assetClass: 'US_STOCK', description: 'JPMorgan Chase & Co.', digits: 2, region: 'US', sector: 'Finance' },
  { symbol: 'GS',     oandaId: 'GS_USD',    tvSymbol: 'NYSE:GS',      assetClass: 'US_STOCK', description: 'Goldman Sachs Group', digits: 2, region: 'US', sector: 'Finance' },
  { symbol: 'BAC',    oandaId: 'BAC_USD',   tvSymbol: 'NYSE:BAC',     assetClass: 'US_STOCK', description: 'Bank of America Corp.', digits: 2, region: 'US', sector: 'Finance' },
  { symbol: 'V',      oandaId: 'V_USD',     tvSymbol: 'NYSE:V',       assetClass: 'US_STOCK', description: 'Visa Inc.', digits: 2, region: 'US', sector: 'Finance' },

  // ── UK Equities (CFDs via OANDA) ───────────────────────────────────────────
  { symbol: 'BARC',   oandaId: 'BARC_GBP',  tvSymbol: 'LSE:BARC',   assetClass: 'UK_STOCK', description: 'Barclays PLC', digits: 2, region: 'UK', sector: 'Finance' },
  { symbol: 'LLOY',   oandaId: 'LLOY_GBP',  tvSymbol: 'LSE:LLOY',   assetClass: 'UK_STOCK', description: 'Lloyds Banking Group', digits: 2, region: 'UK', sector: 'Finance' },
  { symbol: 'SHEL',   oandaId: 'SHEL_GBP',  tvSymbol: 'LSE:SHEL',   assetClass: 'UK_STOCK', description: 'Shell PLC', digits: 2, region: 'UK', sector: 'Energy' },
  { symbol: 'BP',     oandaId: 'BP_GBP',    tvSymbol: 'LSE:BP',     assetClass: 'UK_STOCK', description: 'BP PLC', digits: 2, region: 'UK', sector: 'Energy' },
  { symbol: 'HSBA',   oandaId: 'HSBA_GBP',  tvSymbol: 'LSE:HSBA',   assetClass: 'UK_STOCK', description: 'HSBC Holdings PLC', digits: 2, region: 'UK', sector: 'Finance' },
  { symbol: 'AZN',    oandaId: 'AZN_GBP',   tvSymbol: 'LSE:AZN',    assetClass: 'UK_STOCK', description: 'AstraZeneca PLC', digits: 2, region: 'UK', sector: 'Healthcare' },
  { symbol: 'GSK',    oandaId: 'GSK_GBP',   tvSymbol: 'LSE:GSK',    assetClass: 'UK_STOCK', description: 'GSK PLC', digits: 2, region: 'UK', sector: 'Healthcare' },
  { symbol: 'RIO',    oandaId: 'RIO_GBP',   tvSymbol: 'LSE:RIO',    assetClass: 'UK_STOCK', description: 'Rio Tinto PLC', digits: 2, region: 'UK', sector: 'Mining' },
  { symbol: 'VOD',    oandaId: 'VOD_GBP',   tvSymbol: 'LSE:VOD',    assetClass: 'UK_STOCK', description: 'Vodafone Group PLC', digits: 2, region: 'UK', sector: 'Telecom' },

  // ── Crypto ─────────────────────────────────────────────────────────────────
  { symbol: 'BTC/USD', oandaId: 'BTC_USD', tvSymbol: 'COINBASE:BTCUSD', assetClass: 'CRYPTO', description: 'Bitcoin / US Dollar', digits: 2 },
  { symbol: 'ETH/USD', oandaId: 'ETH_USD', tvSymbol: 'COINBASE:ETHUSD', assetClass: 'CRYPTO', description: 'Ethereum / US Dollar', digits: 2 },
  { symbol: 'SOL/USD', oandaId: 'SOL_USD', tvSymbol: 'COINBASE:SOLUSD', assetClass: 'CRYPTO', description: 'Solana / US Dollar', digits: 3 },
  { symbol: 'XRP/USD', oandaId: 'XRP_USD', tvSymbol: 'COINBASE:XRPUSD', assetClass: 'CRYPTO', description: 'Ripple / US Dollar', digits: 4 },
  { symbol: 'LTC/USD', oandaId: 'LTC_USD', tvSymbol: 'COINBASE:LTCUSD', assetClass: 'CRYPTO', description: 'Litecoin / US Dollar', digits: 2 },
];

// ── Convenience helpers ────────────────────────────────────────────────────

export function getByOandaId(oandaId: string): Instrument | undefined {
  return INSTRUMENT_UNIVERSE.find(i => i.oandaId === oandaId);
}

export function getBySymbol(symbol: string): Instrument | undefined {
  return INSTRUMENT_UNIVERSE.find(i => i.symbol === symbol);
}

export function getByAssetClass(cls: AssetClass): Instrument[] {
  return INSTRUMENT_UNIVERSE.filter(i => i.assetClass === cls);
}

export const ALL_ASSET_CLASSES: AssetClass[] = [
  'FX_MAJOR', 'FX_MINOR', 'FX_EXOTIC', 'INDEX', 'COMMODITY', 'CRYPTO', 'US_STOCK', 'UK_STOCK'
];

// Asset class colour tokens for UI
export const ASSET_CLASS_COLORS: Record<AssetClass, { bg: string; text: string; border: string }> = {
  FX_MAJOR:  { bg: '#EFF6FF', text: '#1D4ED8', border: '#BFDBFE' },
  FX_MINOR:  { bg: '#F0F9FF', text: '#0369A1', border: '#BAE6FD' },
  FX_EXOTIC: { bg: '#FDF4FF', text: '#7E22CE', border: '#E9D5FF' },
  US_STOCK:  { bg: '#F0FDF4', text: '#15803D', border: '#BBF7D0' },
  UK_STOCK:  { bg: '#ECFDF5', text: '#065F46', border: '#A7F3D0' },
  INDEX:     { bg: '#FFFBEB', text: '#B45309', border: '#FDE68A' },
  COMMODITY: { bg: '#FFF7ED', text: '#C2410C', border: '#FED7AA' },
  CRYPTO:    { bg: '#FEF9C3', text: '#854D0E', border: '#FEF08A' },
};
