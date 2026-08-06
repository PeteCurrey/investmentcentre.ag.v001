/**
 * packages/risk/src/calendar.ts
 *
 * Economic calendar integration for news blackout checking.
 * Checks whether current time falls within `windowMinutes` either side of a
 * high-impact economic news event affecting the currencies being traded.
 *
 * TRI-STATE STATUS RESOLUTION:
 *   - 'CLEAR'    : Source checked successfully; no high-impact event in window.
 *   - 'BLACKOUT' : Source checked successfully; high-impact event IS in window.
 *   - 'UNKNOWN'  : Unconfigured, fetch error, or coverage gap (e.g. FRED with non-USD leg).
 *
 * FAIL-CLOSED PRINCIPLE:
 *   Absence of data is NEVER permission to proceed. Both 'BLACKOUT' and 'UNKNOWN'
 *   cause RiskGate to reject trading, with distinct reason codes:
 *     - 'BLACKOUT' $\rightarrow$ 'NEWS_BLACKOUT_ACTIVE'
 *     - 'UNKNOWN'  $\rightarrow$ 'NEWS_CALENDAR_UNAVAILABLE'
 *
 * SOURCE PRIORITY (first configured source wins):
 *   1. Trading Economics  — TRADING_ECONOMICS_KEY — full global coverage
 *   2. FRED release dates — FRED_API_KEY          — US events only (non-USD legs $\rightarrow$ UNKNOWN)
 *   3. Custom URL         — ECONOMIC_CALENDAR_URL  — arbitrary JSON feed
 *   4. No source          — status UNKNOWN (fail-closed)
 *
 * PAPER TESTING EXCEPTION:
 *   If ALLOW_UNCHECKED_NEWS_IN_PAPER === 'true' AND TIER_4_ENABLED !== 'true',
 *   'UNKNOWN' is resolved to 'CLEAR' with a log warning. It is hard-blocked from
 *   running when TIER_4_ENABLED === 'true' (LIVE mode).
 */

import { createLogger } from '@meridian/core';
import type { NewsCalendarStatus } from './types';

const log = createLogger('calendar');

export interface CalendarEvent {
  id: string;
  title: string;
  country: string; // e.g. 'USD', 'GBP', 'EUR', 'JPY'
  impact: 'HIGH' | 'MEDIUM' | 'LOW';
  scheduledAt: string; // ISO-8601
}

/** High-impact FRED release IDs that warrant a news blackout window.
 *  These are US macro releases. Ref: https://fred.stlouisfed.org/releases
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
 */
async function checkFredBlackoutStatus(
  targetCurrencies: string[],
  windowMinutes: number
): Promise<NewsCalendarStatus> {
  const fredApiKey = process.env.FRED_API_KEY!;

  const today = new Date().toISOString().slice(0, 10);
  const nowMs = Date.now();
  const windowMs = windowMinutes * 60 * 1000;

  for (const releaseId of FRED_HIGH_IMPACT_RELEASE_IDS) {
    try {
      const url = `https://api.stlouisfed.org/fred/release/dates?release_id=${releaseId}&api_key=${fredApiKey}&file_type=json&realtime_start=${today}&realtime_end=${today}&include_release_dates_with_no_data=false&sort_order=desc&limit=5`;
      const res = await fetch(url, { headers: { Accept: 'application/json' } });
      if (!res.ok) {
        log.warn('FRED release date fetch non-ok response', { releaseId, status: res.status });
        return 'UNKNOWN';
      }
      const data = (await res.json()) as { release_dates?: Array<{ date: string }> };
      const releaseDates = data.release_dates ?? [];
      for (const rd of releaseDates) {
        if (rd.date === today) {
          const releaseMs = new Date(`${today}T13:30:00Z`).getTime();
          if (Math.abs(nowMs - releaseMs) <= windowMs) {
            log.info('FRED news blackout active', { releaseId, date: rd.date });
            return 'BLACKOUT';
          }
        }
      }
    } catch (e: any) {
      log.warn('FRED release date check threw', { releaseId, error: e.message });
      return 'UNKNOWN';
    }
  }

  // FRED found NO active US release in window.
  // Evaluate currency coverage gap: FRED covers US macro events ONLY.
  // If the instrument includes non-USD legs (e.g. GBP in GBP/USD, EUR in EUR/GBP),
  // FRED has no coverage for those legs -> return UNKNOWN.
  const uncoveredCurrencies = targetCurrencies.filter(
    (c) => !USD_CORRELATED_CURRENCIES.has(c.toUpperCase())
  );

  if (uncoveredCurrencies.length > 0) {
    log.warn(
      'FRED calendar source active but has NO coverage for non-USD currencies: ' +
        `${uncoveredCurrencies.join(', ')}. Calendar status is UNKNOWN for this instrument.`,
      { uncoveredCurrencies }
    );
    return 'UNKNOWN';
  }

  // All legs are USD-correlated (e.g. XAU/USD, SPX500) and no US event is active -> CLEAR
  return 'CLEAR';
}

/**
 * Checks economic calendar and returns tri-state status:
 *   - 'CLEAR': checked successfully; no high-impact event in window
 *   - 'BLACKOUT': checked successfully; high-impact event in window
 *   - 'UNKNOWN': unconfigured, fetch error, or coverage gap (e.g. FRED with non-USD leg)
 */
export async function checkNewsBlackoutStatus(
  currencies: string[],
  windowMinutes = 2
): Promise<NewsCalendarStatus> {
  const teKey = process.env.TRADING_ECONOMICS_KEY;
  const fredApiKey = process.env.FRED_API_KEY;
  const calendarUrl = process.env.ECONOMIC_CALENDAR_URL;

  const allowUncheckedInPaper = process.env.ALLOW_UNCHECKED_NEWS_IN_PAPER === 'true';

  let status: NewsCalendarStatus = 'UNKNOWN';

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
        log.warn('Trading Economics calendar fetch failed — status UNKNOWN', { status: res.status });
        status = 'UNKNOWN';
      } else {
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
        let foundBlackout = false;
        for (const evt of events) {
          if (evt.impact !== 'HIGH') continue;
          if (!targetSet.has(evt.country.toUpperCase())) continue;
          const evtMs = new Date(evt.scheduledAt).getTime();
          if (Math.abs(nowMs - evtMs) <= windowMs) {
            log.info('TE news blackout active', { event: evt.title, country: evt.country });
            foundBlackout = true;
            break;
          }
        }
        status = foundBlackout ? 'BLACKOUT' : 'CLEAR';
      }
    }
    // ── Source 2: FRED (US-only) ───────────────────────────────────────────────
    else if (fredApiKey) {
      status = await checkFredBlackoutStatus(currencies, windowMinutes);
    }
    // ── Source 3: Custom URL ───────────────────────────────────────────────────
    else if (calendarUrl) {
      const res = await fetch(calendarUrl);
      if (!res.ok) {
        log.warn('Custom calendar URL fetch failed — status UNKNOWN', { url: calendarUrl, status: res.status });
        status = 'UNKNOWN';
      } else {
        const events = (await res.json()) as CalendarEvent[];
        const targetSet = new Set(currencies.map((c) => c.toUpperCase()));
        let foundBlackout = false;
        for (const evt of events) {
          if (evt.impact !== 'HIGH') continue;
          if (!targetSet.has(evt.country.toUpperCase())) continue;
          const evtMs = new Date(evt.scheduledAt).getTime();
          if (Math.abs(nowMs - evtMs) <= windowMs) {
            foundBlackout = true;
            break;
          }
        }
        status = foundBlackout ? 'BLACKOUT' : 'CLEAR';
      }
    }
    // ── Source 4: No source configured ────────────────────────────────────────
    else {
      log.warn(
        'No economic calendar source configured (TRADING_ECONOMICS_KEY, FRED_API_KEY, or ' +
          'ECONOMIC_CALENDAR_URL). Calendar status is UNKNOWN.'
      );
      status = 'UNKNOWN';
    }
  } catch (e: any) {
    log.warn('checkNewsBlackoutStatus threw unexpectedly — status UNKNOWN', { error: e.message });
    status = 'UNKNOWN';
  }

  // Handle ALLOW_UNCHECKED_NEWS_IN_PAPER flag
  if (status === 'UNKNOWN' && allowUncheckedInPaper) {
    if (process.env.TIER_4_ENABLED === 'true') {
      throw new Error(
        'Security Exception: ALLOW_UNCHECKED_NEWS_IN_PAPER is strictly forbidden when TIER_4_ENABLED=true (LIVE mode).'
      );
    }
    log.warn('ALLOW_UNCHECKED_NEWS_IN_PAPER active in paper mode — resolving UNKNOWN status to CLEAR');
    return 'CLEAR';
  }

  return status;
}

/**
 * Legacy boolean helper. Returns true if status !== 'CLEAR' (fail-closed).
 */
export async function checkNewsBlackoutActive(
  currencies: string[],
  windowMinutes = 2
): Promise<boolean> {
  const status = await checkNewsBlackoutStatus(currencies, windowMinutes);
  return status !== 'CLEAR';
}
