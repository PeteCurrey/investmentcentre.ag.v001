/**
 * packages/risk/src/calendar.ts
 *
 * Real economic calendar integration for news blackout checking.
 * Checks whether current time falls within `windowMinutes` either side of a
 * high-impact economic news event affecting the currencies being traded.
 *
 * Per institutional execution safety rules:
 * If the calendar feed is unavailable or unconfigured, it FAILS CLOSED
 * (returns `true`, blocking execution).
 */

export interface CalendarEvent {
  id: string;
  title: string;
  country: string; // e.g. 'USD', 'GBP', 'EUR', 'JPY'
  impact: 'HIGH' | 'MEDIUM' | 'LOW';
  scheduledAt: string; // ISO-8601
}

/**
 * Checks whether now falls within `windowMinutes` before or after a high-impact
 * event affecting any of the specified `currencies`.
 *
 * If feed fetch fails or calendar source is unconfigured, returns `true`
 * (blackout ACTIVE — fail-closed).
 */
export async function checkNewsBlackoutActive(
  currencies: string[],
  windowMinutes = 2
): Promise<boolean> {
  const teKey = process.env.TRADING_ECONOMICS_KEY;
  const calendarUrl = process.env.ECONOMIC_CALENDAR_URL;

  // If no calendar source configured, fail-closed per security brief
  if (!teKey && !calendarUrl) {
    return true;
  }

  try {
    const nowMs = Date.now();
    const windowMs = windowMinutes * 60 * 1000;
    let events: CalendarEvent[] = [];

    if (teKey) {
      const res = await fetch(
        `https://api.tradingeconomics.com/calendar?importance=3&key=${teKey}`,
        { headers: { Accept: 'application/json' } }
      );
      if (!res.ok) return true; // Fail closed on HTTP error
      const data = (await res.json()) as Array<{
        CalendarId?: string;
        Event?: string;
        Country?: string;
        Category?: string;
        Date?: string;
      }>;
      events = (data || []).map((e) => ({
        id: String(e.CalendarId || Math.random()),
        title: e.Event || 'High Impact Event',
        country: e.Country || '',
        impact: 'HIGH',
        scheduledAt: e.Date || new Date().toISOString(),
      }));
    } else if (calendarUrl) {
      const res = await fetch(calendarUrl);
      if (!res.ok) return true;
      events = (await res.json()) as CalendarEvent[];
    }

    // Check if any high-impact event for target currencies is within window
    const targetSet = new Set(currencies.map((c) => c.toUpperCase()));
    for (const evt of events) {
      if (evt.impact !== 'HIGH') continue;
      const evtCountry = evt.country.toUpperCase();
      if (!targetSet.has(evtCountry)) continue;

      const evtMs = new Date(evt.scheduledAt).getTime();
      if (Math.abs(nowMs - evtMs) <= windowMs) {
        return true; // Blackout active
      }
    }

    return false;
  } catch {
    // On any network or parsing error, fail closed
    return true;
  }
}
