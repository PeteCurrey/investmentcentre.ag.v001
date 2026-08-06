/**
 * packages/risk/src/calendar.ts
 *
 * Economic calendar integration for news blackout checking.
 * Checks whether current time falls within `windowMinutes` either side of a
 * high-impact economic news event affecting the currencies being traded.
 *
 * SOURCE PRIORITY (first configured source wins):
 *   1. Trading Economics  — TRADING_ECONOMICS_KEY — full global coverage
 *   2. FRED release dates — FRED_API_KEY          — US events only (see WARNING below)
 *   3. Custom URL         — ECONOMIC_CALENDAR_URL  — arbitrary JSON feed
 *   4. No source          — warning logged; blackout check DISABLED (returns false)
 *
 * ⚠️  WARNING — FRED covers US events only (CPI, FOMC, NFP, PPI, Retail Sales, PCE,
 * GDP, JOLTS, ISM Manufacturing, Core PCE). BoE and ECB events are NOT covered.
 * For GBP and EUR instruments, TRADING_ECONOMICS_KEY is required before LIVE mode.
 *
 * FAIL BEHAVIOUR:
 *   - If a configured source returns an HTTP error or throws, we log a warning and
 *     return false (allow trading). We do NOT fail-closed silently on every cycle.
 *   - If no source is configured, we log a warning and return false.
 *
 * The old behaviour (fail-closed when unconfigured) permanently blocked all trading
 * since Finnhub's /calendar/economic returns 403 on the current plan and no fallback
 * was available. The new behaviour is: caller is warned, trading is NOT blocked.
 */

import { createLogger } from '@meridian/core';

const log = createLogger('calendar');

export interface CalendarEvent {
  id: string;
  title: string;
  country: string; // e.g. 'USD', 'GBP', 'EUR', 'JPY'
  impact: 'HIGH' | 'MEDIUM' | 'LOW';
  scheduledAt: string; // ISO-8601
}

/** High-impact FRED release IDs that warrant a news blackout window.
 *  These are US macro releases. Covers USD-correlated pairs.
 *  Ref: https://fred.stlouisfed.org/releases
 */
const FRED_HIGH_IMPACT_RELEASE_IDS: number[] = [
  10,  // Employment Situation (NFP)
  21,  // CPI
  55,  // PPI
  53,  // PCE (Personal Consumption Expenditures Price Index)
  175, // FOMC press releases
  33,  // Retail Sales
  17,  // Industrial Production
  14,  // GDP
  46,  // ISM Manufacturing PMI
  367, // JOLTS
];

/**
 * Currencies that are correlated with USD macro releases.
 * EUR/GBP is excluded intentionally — it is a cross pair with no USD leg.
 */
const USD_CORRELATED_CURRENCIES = new Set(['USD', 'XAU', 'XAG']);

/**
 * Fetch FRED release dates for today and check whether any high-impact release
 * falls within `windowMinutes` of now.
 *
 * @param targetCurrencies - currencies involved in the instrument being traded
 * @param windowMinutes    - blackout window in minutes either side of release
 * @returns true if a high-impact release is within the window; false otherwise
 */
async function checkFredBlackout(targetCurrencies: string[], windowMinutes: number): Promise<boolean> {
  const fredApiKey = process.env.FRED_API_KEY!;

  // FRED only covers USD macro events. Only check if the instrument has USD exposure.
  const hasUsdExposure = targetCurrencies.some(c => USD_CORRELATED_CURRENCIES.has(c.toUpperCase()));
  if (!hasUsdExposure) {
    return false;
  }

  const today = new Date().toISOString().slice(0, 10);
  const nowMs = Date.now();
  const windowMs = windowMinutes * 60 * 1000;

  for (const releaseId of FRED_HIGH_IMPACT_RELEASE_IDS) {
    try {
      const url = `https://api.stlouisfed.org/fred/release/dates?release_id=${releaseId}&api_key=${fredApiKey}&file_type=json&realtime_start=${today}&realtime_end=${today}&include_release_dates_with_no_data=false&sort_order=desc&limit=5`;
      const res = await fetch(url, { headers: { Accept: 'application/json' } });
      if (!res.ok) {
        // FRED API error for a single release — skip it, don't abort entire check
        log.warn('FRED release date fetch failed', { releaseId, status: res.status });
        continue;
      }
      const data = await res.json() as { release_dates?: Array<{ date: string }> };
      const releaseDates = data.release_dates ?? [];
      for (const rd of releaseDates) {
        // FRED release dates are date-only (YYYY-MM-DD); treat as market open (13:30 UTC ~ NYSE open)
        // We check relative to today's date rather than exact time since FRED doesn't publish intraday times
        if (rd.date === today) {
          // Release is today — check if we're within the window
          // Use 13:30 UTC as the proxy release time (US market open / typical macro release time)
          const releaseMs = new Date(`${today}T13:30:00Z`).getTime();
          if (Math.abs(nowMs - releaseMs) <= windowMs) {
            log.info('FRED news blackout active', { releaseId, date: rd.date });
            return true;
          }
        }
      }
    } catch (e: any) {
      log.warn('FRED release date check threw', { releaseId, error: e.message });
    }
  }

  return false;
}

/**
 * Checks whether now falls within `windowMinutes` before or after a high-impact
 * event affecting any of the specified `currencies`.
 *
 * Source cascade (first configured wins):
 *   1. TRADING_ECONOMICS_KEY → full global coverage
 *   2. FRED_API_KEY          → US events only (USD-correlated pairs)
 *   3. ECONOMIC_CALENDAR_URL → custom JSON feed
 *   4. None                  → warn + return false (blackout NOT active)
 *
 * See module docstring for LIVE-mode requirements.
 */
export async function checkNewsBlackoutActive(
  currencies: string[],
  windowMinutes = 2
): Promise<boolean> {
  const teKey = process.env.TRADING_ECONOMICS_KEY;
  const fredApiKey = process.env.FRED_API_KEY;
  const calendarUrl = process.env.ECONOMIC_CALENDAR_URL;

  try {
    const nowMs = Date.now();
    const windowMs = windowMinutes * 60 * 1000;

    // ── Source 1: Trading Economics ────────────────────────────────────────────
    if (teKey) {
      const res = await fetch(
        `https://api.tradingeconomics.com/calendar?importance=3&key=${teKey}`,
        { headers: { Accept: 'application/json' } }
      );
      if (!res.ok) {
        log.warn('Trading Economics calendar fetch failed — skipping blackout check', { status: res.status });
        return false;
      }
      const data = (await res.json()) as Array<{
        CalendarId?: string;
        Event?: string;
        Country?: string;
        Date?: string;
      }>;
      const events: CalendarEvent[] = (data || []).map((e) => ({
        id: String(e.CalendarId || Math.random()),
        title: e.Event || 'High Impact Event',
        country: e.Country || '',
        impact: 'HIGH',
        scheduledAt: e.Date || new Date().toISOString(),
      }));

      const targetSet = new Set(currencies.map((c) => c.toUpperCase()));
      for (const evt of events) {
        if (evt.impact !== 'HIGH') continue;
        if (!targetSet.has(evt.country.toUpperCase())) continue;
        const evtMs = new Date(evt.scheduledAt).getTime();
        if (Math.abs(nowMs - evtMs) <= windowMs) {
          log.info('TE news blackout active', { event: evt.title, country: evt.country });
          return true;
        }
      }
      return false;
    }

    // ── Source 2: FRED (US-only) ───────────────────────────────────────────────
    if (fredApiKey) {
      const nonUsdCurrencies = currencies.filter(c => !USD_CORRELATED_CURRENCIES.has(c.toUpperCase()));
      if (nonUsdCurrencies.length > 0) {
        log.warn(
          'FRED calendar source is active but covers US events ONLY. ' +
          `Non-USD currencies ${nonUsdCurrencies.join(', ')} have NO coverage. ` +
          'Add TRADING_ECONOMICS_KEY for full coverage before LIVE mode.',
          { currencies: nonUsdCurrencies }
        );
      }
      return checkFredBlackout(currencies, windowMinutes);
    }

    // ── Source 3: Custom URL ───────────────────────────────────────────────────
    if (calendarUrl) {
      const res = await fetch(calendarUrl);
      if (!res.ok) {
        log.warn('Custom calendar URL fetch failed — skipping blackout check', { url: calendarUrl, status: res.status });
        return false;
      }
      const events = (await res.json()) as CalendarEvent[];
      const targetSet = new Set(currencies.map((c) => c.toUpperCase()));
      for (const evt of events) {
        if (evt.impact !== 'HIGH') continue;
        if (!targetSet.has(evt.country.toUpperCase())) continue;
        const evtMs = new Date(evt.scheduledAt).getTime();
        if (Math.abs(nowMs - evtMs) <= windowMs) {
          return true;
        }
      }
      return false;
    }

    // ── Source 4: No source configured ────────────────────────────────────────
    log.warn(
      'No economic calendar source configured (TRADING_ECONOMICS_KEY, FRED_API_KEY, or ' +
      'ECONOMIC_CALENDAR_URL). News blackout check is DISABLED. ' +
      'Add FRED_API_KEY for US event coverage, or TRADING_ECONOMICS_KEY for full global ' +
      'coverage, before transitioning to LIVE mode.'
    );
    return false;

  } catch (e: any) {
    // On unexpected error, log and allow trading (do not silently block every cycle)
    log.warn('checkNewsBlackoutActive threw unexpectedly — returning false', { error: e.message });
    return false;
  }
}
