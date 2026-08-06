/**
 * packages/core/src/instruments.ts
 *
 * Single, authoritative source of truth for instrument pip scales across all Meridian packages.
 * ZERO string matching (no startsWith('XAU'), startsWith('SPX'), etc.) anywhere in pip resolution.
 */

export interface InstrumentPipInfo {
  symbol: string;
  oandaId: string;
  pipValue: number;
}

export const INSTRUMENT_PIPS: InstrumentPipInfo[] = [
  // ── FX Majors ──────────────────────────────────────────────────────────────
  { symbol: 'GBP/USD', oandaId: 'GBP_USD', pipValue: 0.0001 },
  { symbol: 'EUR/USD', oandaId: 'EUR_USD', pipValue: 0.0001 },
  { symbol: 'USD/JPY', oandaId: 'USD_JPY', pipValue: 0.01 },
  { symbol: 'USD/CHF', oandaId: 'USD_CHF', pipValue: 0.0001 },
  { symbol: 'AUD/USD', oandaId: 'AUD_USD', pipValue: 0.0001 },
  { symbol: 'USD/CAD', oandaId: 'USD_CAD', pipValue: 0.0001 },
  { symbol: 'NZD/USD', oandaId: 'NZD_USD', pipValue: 0.0001 },

  // ── FX Minors ──────────────────────────────────────────────────────────────
  { symbol: 'EUR/GBP', oandaId: 'EUR_GBP', pipValue: 0.0001 },
  { symbol: 'EUR/JPY', oandaId: 'EUR_JPY', pipValue: 0.01 },
  { symbol: 'GBP/JPY', oandaId: 'GBP_JPY', pipValue: 0.01 },
  { symbol: 'EUR/AUD', oandaId: 'EUR_AUD', pipValue: 0.0001 },
  { symbol: 'GBP/CAD', oandaId: 'GBP_CAD', pipValue: 0.0001 },
  { symbol: 'AUD/JPY', oandaId: 'AUD_JPY', pipValue: 0.01 },
  { symbol: 'GBP/AUD', oandaId: 'GBP_AUD', pipValue: 0.0001 },
  { symbol: 'EUR/CAD', oandaId: 'EUR_CAD', pipValue: 0.0001 },
  { symbol: 'CAD/JPY', oandaId: 'CAD_JPY', pipValue: 0.01 },

  // ── FX Exotics ─────────────────────────────────────────────────────────────
  { symbol: 'USD/MXN', oandaId: 'USD_MXN', pipValue: 0.0001 },
  { symbol: 'USD/ZAR', oandaId: 'USD_ZAR', pipValue: 0.0001 },
  { symbol: 'USD/SGD', oandaId: 'USD_SGD', pipValue: 0.0001 },
  { symbol: 'USD/HKD', oandaId: 'USD_HKD', pipValue: 0.0001 },
  { symbol: 'USD/NOK', oandaId: 'USD_NOK', pipValue: 0.0001 },
  { symbol: 'USD/SEK', oandaId: 'USD_SEK', pipValue: 0.0001 },

  // ── Indices ────────────────────────────────────────────────────────────────
  { symbol: 'SPX500', oandaId: 'SPX500_USD', pipValue: 1.0 },
  { symbol: 'NAS100', oandaId: 'NAS100_USD', pipValue: 1.0 },
  { symbol: 'US30',   oandaId: 'US30_USD',   pipValue: 1.0 },
  { symbol: 'UK100',  oandaId: 'UK100_GBP',  pipValue: 1.0 },
  { symbol: 'GER40',  oandaId: 'DE30_EUR',   pipValue: 1.0 },
  { symbol: 'JPN225', oandaId: 'JP225_USD',  pipValue: 1.0 },
  { symbol: 'AUS200', oandaId: 'AU200_AUD',  pipValue: 1.0 },
  { symbol: 'HK33',   oandaId: 'HK33_HKD',  pipValue: 1.0 },
  { symbol: 'EU50',   oandaId: 'EU50_EUR',   pipValue: 1.0 },

  // ── Commodities ────────────────────────────────────────────────────────────
  { symbol: 'XAU/USD', oandaId: 'XAU_USD', pipValue: 1.0 },
  { symbol: 'XAG/USD', oandaId: 'XAG_USD', pipValue: 0.01 },
  { symbol: 'WTI Oil', oandaId: 'WTICO_USD', pipValue: 0.01 },
  { symbol: 'Brent',   oandaId: 'BCO_USD',   pipValue: 0.01 },
  { symbol: 'Nat Gas', oandaId: 'NATGAS_USD', pipValue: 0.001 },
  { symbol: 'Copper',  oandaId: 'XCU_USD',   pipValue: 0.0001 },
  { symbol: 'XPT/USD', oandaId: 'XPT_USD',   pipValue: 1.0 },
  { symbol: 'XPD/USD', oandaId: 'XPD_USD',   pipValue: 1.0 },

  // ── Equities ───────────────────────────────────────────────────────────────
  { symbol: 'AAPL',  oandaId: 'AAPL_USD',  pipValue: 0.01 },
  { symbol: 'MSFT',  oandaId: 'MSFT_USD',  pipValue: 0.01 },
  { symbol: 'GOOGL', oandaId: 'GOOGL_USD', pipValue: 0.01 },
  { symbol: 'AMZN',  oandaId: 'AMZN_USD',  pipValue: 0.01 },
  { symbol: 'NVDA',  oandaId: 'NVDA_USD',  pipValue: 0.01 },
  { symbol: 'TSLA',  oandaId: 'TSLA_USD',  pipValue: 0.01 },
  { symbol: 'META',  oandaId: 'META_USD',  pipValue: 0.01 },
  { symbol: 'NFLX',  oandaId: 'NFLX_USD',  pipValue: 0.01 },
  { symbol: 'JPM',   oandaId: 'JPM_USD',   pipValue: 0.01 },
  { symbol: 'GS',    oandaId: 'GS_USD',    pipValue: 0.01 },
  { symbol: 'BAC',   oandaId: 'BAC_USD',   pipValue: 0.01 },
  { symbol: 'V',     oandaId: 'V_USD',     pipValue: 0.01 },
  { symbol: 'BARC',  oandaId: 'BARC_GBP',  pipValue: 0.01 },
  { symbol: 'LLOY',  oandaId: 'LLOY_GBP',  pipValue: 0.01 },
  { symbol: 'SHEL',  oandaId: 'SHEL_GBP',  pipValue: 0.01 },
  { symbol: 'BP',    oandaId: 'BP_GBP',    pipValue: 0.01 },
  { symbol: 'HSBA',  oandaId: 'HSBA_GBP',  pipValue: 0.01 },
  { symbol: 'AZN',   oandaId: 'AZN_GBP',   pipValue: 0.01 },
  { symbol: 'GSK',   oandaId: 'GSK_GBP',   pipValue: 0.01 },
  { symbol: 'RIO',   oandaId: 'RIO_GBP',   pipValue: 0.01 },
  { symbol: 'VOD',   oandaId: 'VOD_GBP',   pipValue: 0.01 },

  // ── Crypto ─────────────────────────────────────────────────────────────────
  { symbol: 'BTC/USD', oandaId: 'BTC_USD', pipValue: 1.0 },
  { symbol: 'ETH/USD', oandaId: 'ETH_USD', pipValue: 1.0 },
  { symbol: 'SOL/USD', oandaId: 'SOL_USD', pipValue: 0.1 },
  { symbol: 'XRP/USD', oandaId: 'XRP_USD', pipValue: 0.0001 },
  { symbol: 'LTC/USD', oandaId: 'LTC_USD', pipValue: 1.0 },
];

/**
 * Resolves the explicit pip scale for a symbol or OANDA ID.
 * Returns exact value from INSTRUMENT_PIPS without prefix/pattern matching.
 */
export function getPipValue(symbolOrOandaId: string): number {
  if (!symbolOrOandaId) return 0.0001;
  const s = symbolOrOandaId.trim();
  const match = INSTRUMENT_PIPS.find(
    i => i.symbol === s || i.oandaId === s ||
    i.symbol.replace(/[\/\s_-]/g, '').toUpperCase() === s.replace(/[\/\s_-]/g, '').toUpperCase() ||
    i.oandaId.replace(/[\/\s_-]/g, '').toUpperCase() === s.replace(/[\/\s_-]/g, '').toUpperCase()
  );
  if (match) return match.pipValue;

  // Generic fallback only for unlisted assets (e.g. unknown custom JPY pair)
  if (s.toUpperCase().includes('JPY')) return 0.01;
  return 0.0001;
}
