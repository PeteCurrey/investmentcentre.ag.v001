/**
 * packages/risk/src/state.ts
 *
 * Single shared module for constructing AccountRiskState.
 * THIS IS THE ONLY PLACE IN THE CODEBASE WHERE AccountRiskState IS CONSTRUCTED.
 */

/**
 * Minimal broker adapter interface required by buildAccountRiskState.
 * We intentionally do NOT import BrokerAdapter from @meridian/execute here
 * because @meridian/execute depends on @meridian/risk, creating a circular
 * dependency at build time. TypeScript structural typing means any adapter
 * that satisfies this shape will work.
 */
export interface StateAdapter {
  getAccountState(accountId: string): Promise<{
    success: boolean;
    value?: {
      balance: { price: bigint; scale: number; currency: string };
      equity: { price: bigint; scale: number; currency: string };
      unrealizedPnl: { price: bigint; scale: number; currency: string };
      openPositionsCount: number;
      currency: string;
    };
    error?: { message: string };
  }>;
  /** Optional — populate openPositions in AccountRiskState when available.
   *  Return shape is structurally compatible with BrokerPosition from @meridian/execute,
   *  but typed here without importing that package to avoid a circular dependency. */
  getPositions?(accountId: string): Promise<{
    success: boolean;
    value?: Array<{
      id: string;
      instrument: string;
      units: bigint;
      entryPrice: { price: bigint; scale: number; currency: string };
      unrealizedPnl: { price: bigint; scale: number; currency: string };
      openedAt: string;
      source: string;
      fetchedAt: string;
    }>;
    error?: { message: string };
  }>;
}
import { type ScaledInteger, getSupabaseServiceClient, createLogger } from '@meridian/core';
import { type AccountRiskState, type OpenPositionRisk } from './types';
import { checkNewsBlackoutStatus } from './calendar';

const log = createLogger('AccountRiskStateBuilder');

export interface BuildAccountRiskStateOptions {
  instrument?: string;
  quoteToAccountRates?: Record<string, number>;
  currentSpreadPips?: number;
}

export interface TradingDayInfo {
  /** The ISO timestamp of the start of the current trading day (e.g. 2026-08-05T21:00:00.000Z) */
  sinceIso: string;
  /** The YYYY-MM-DD date label for this trading session (e.g. "2026-08-06") */
  dayDate: string;
}

/**
 * Single canonical trading day boundary calculator.
 * Used by BOTH account_day row creation/lookup and realizedPnlToday transaction query.
 *
 * Boundary Choice: OANDA 17:00 America/New_York (21:00 UTC / 22:00 BST).
 * FTMO daily loss limits reset at 00:00 CE(S)T (23:00 UTC). OANDA's 17:00 ET (21:00 UTC)
 * reset occurs 2 hours prior to CE(S)T midnight, making it a safe, conservative anchor
 * that aligns 100% with OANDA broker transaction logs.
 */
export function getTradingDayStart(now = new Date()): TradingDayInfo {
  const nyDateStr = now.toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
  const nyHour = parseInt(
    now.toLocaleTimeString('en-US', {
      timeZone: 'America/New_York',
      hour12: false,
      hour: '2-digit',
    }),
    10
  );

  let sessionStartDateStr = nyDateStr;
  let dayDate = nyDateStr;

  if (nyHour < 17) {
    const prev = new Date(now.getTime() - 24 * 3600 * 1000);
    sessionStartDateStr = prev.toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
  }

  const dEst = new Date(`${sessionStartDateStr}T17:00:00-05:00`);
  const estHour = parseInt(
    dEst.toLocaleTimeString('en-US', {
      timeZone: 'America/New_York',
      hour12: false,
      hour: '2-digit',
    }),
    10
  );

  const sinceIso = estHour === 17
    ? dEst.toISOString()
    : new Date(`${sessionStartDateStr}T17:00:00-04:00`).toISOString();

  return {
    sinceIso,
    dayDate,
  };
}

/**
 * Backward compatibility wrapper for getTradingDayStart().sinceIso
 */
export function getOandaDayResetIso(now = new Date()): string {
  return getTradingDayStart(now).sinceIso;
}

/**
 * Build a single, authoritative AccountRiskState object for RiskGate evaluation.
 * THIS IS THE ONLY PLACE IN THE CODEBASE THAT CONSTRUCTS THIS OBJECT.
 */
export async function buildAccountRiskState(
  adapter: StateAdapter,
  accountId: string,
  options?: BuildAccountRiskStateOptions
): Promise<AccountRiskState> {
  const stateRes = await adapter.getAccountState(accountId);
  if (!stateRes.success || !stateRes.value) {
    throw new Error(`BROKER_ACCOUNT_SYNC_FAILED: ${stateRes.error?.message ?? 'Unknown error'}`);
  }
  const accountState = stateRes.value;
  if (!accountState.currency || typeof accountState.currency !== 'string') {
    throw new Error('ACCOUNT_CURRENCY_MISSING: OANDA broker account state is missing required currency field.');
  }
  const accountCurrency = accountState.currency.toUpperCase();
  const currentBalance = accountState.balance.price as ScaledInteger;
  const currentEquity = accountState.equity.price as ScaledInteger;

  // 2. Fetch OANDA realized PnL today using canonical getTradingDayStart()
  const tradingDay = getTradingDayStart();
  let realizedPnlToday = 0n as ScaledInteger;

  // Duck-type check: any adapter that implements getRealizedPnlToday is supported.
  const adapterWithPnl = adapter as unknown as Record<string, unknown>;
  if (typeof adapterWithPnl['getRealizedPnlToday'] === 'function') {
    const pnlRes = await (adapterWithPnl['getRealizedPnlToday'] as (
      accountId: string,
      sinceIso: string
    ) => Promise<{ success: boolean; value?: ScaledInteger; error?: { message: string } }>)(
      accountId,
      tradingDay.sinceIso
    );
    if (pnlRes && pnlRes.success && pnlRes.value !== undefined) {
      realizedPnlToday = pnlRes.value;
    }
  }

  // 3. Read/upsert startingDailyBalance and highWaterMark from meridian.account_day
  //
  // CANONICAL TRADING DAY BOUNDARY
  // Both startingDailyBalance and realizedPnlToday are anchored to tradingDay (OANDA 17:00 ET).
  //
  // TWO DISTINCT QUERIES (intentional):
  //   Query A  — current trading day row  →  startingDailyBalance  (must exist or be created)
  //   Query B  — MAX over all rows         →  highWaterMark          (all-time peak)
  let startingDailyBalance: ScaledInteger | null = null;
  let storedHwm: ScaledInteger = currentEquity;
  const dayDate = tradingDay.dayDate;

  try {
    const sb = getSupabaseServiceClient();

    // Query A: today's row for startingDailyBalance
    const { data: todayRow, error: todayErr } = await sb
      .schema('meridian')
      .from('account_day')
      .select('opening_balance, high_water_mark')
      .eq('day_date', dayDate)
      .maybeSingle();

    if (todayErr) {
      log.error('account_day today-row query failed', { error: todayErr.message });
    }

    // Query B: all-time high water mark across every day (independent of today)
    const { data: maxRows, error: maxErr } = await sb
      .schema('meridian')
      .from('account_day')
      .select('high_water_mark')
      .order('high_water_mark', { ascending: false })
      .limit(1);

    if (maxErr) {
      log.error('account_day hwm-max query failed', { error: maxErr.message });
    }

    const maxEverHwm =
      maxRows && maxRows.length > 0
        ? (BigInt(maxRows[0].high_water_mark) as ScaledInteger)
        : (0n as ScaledInteger);

    if (todayRow) {
      // Today's row exists — use its opening_balance as the daily-loss baseline.
      startingDailyBalance = BigInt(todayRow.opening_balance) as ScaledInteger;
      const rowHwm = BigInt(todayRow.high_water_mark) as ScaledInteger;
      // storedHwm = max(today's stored hwm, all-time max across all days)
      storedHwm = rowHwm > maxEverHwm ? rowHwm : maxEverHwm;

      // Monotonically advance HWM if current equity exceeds both stored values
      if (currentEquity > storedHwm) {
        storedHwm = currentEquity;
        await sb
          .schema('meridian')
          .from('account_day')
          .update({
            high_water_mark: String(currentEquity),
            high_water_mark_updated_at: new Date().toISOString(),
          })
          .eq('day_date', dayDate);
      }
    } else {
      // No row for today yet — create one.
      // Derives opening_balance as (currentBalance - realizedPnlToday) so mid-session deploys
      // accurately reconstruct the exact balance as of the 17:00 ET rollover timestamp!
      storedHwm = currentEquity > maxEverHwm ? currentEquity : maxEverHwm;
      startingDailyBalance = (currentBalance - realizedPnlToday) as ScaledInteger;

      const { error: insertErr } = await sb
        .schema('meridian')
        .from('account_day')
        .insert({
          day_date: dayDate,
          opening_balance: String(startingDailyBalance),
          opening_balance_captured_at: new Date().toISOString(),
          high_water_mark: String(storedHwm),
          high_water_mark_updated_at: new Date().toISOString(),
        });

      if (insertErr) {
        log.error('Failed to insert account_day row for today — will reject this cycle', {
          error: insertErr.message,
          dayDate,
        });
        // Null out so the guard below rejects rather than trading on a stale baseline.
        startingDailyBalance = null;
      }
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    log.error('account_day database operations failed', { error: message });
  }

  // If startingDailyBalance cannot be read or established, the gate MUST reject (fail closed)
  if (startingDailyBalance === null) {
    throw new Error(
      'ACCOUNT_DAY_MISSING: Unable to read or create starting daily balance record in meridian.account_day.'
    );
  }

  // 4. Check news blackout status
  const symbol = options?.instrument || 'GBP/USD';
  const parts = symbol.split('/');
  const currencies = parts.length === 2 ? parts : ['USD', 'GBP'];
  const newsStatus = await checkNewsBlackoutStatus(currencies);
  const isNewsBlackoutActive = newsStatus !== 'CLEAR';

  // 5. Fetch open positions from broker adapter if supported
  const openPositions: OpenPositionRisk[] = [];
  if (typeof adapter.getPositions === 'function') {
    try {
      const posRes = await adapter.getPositions!(accountId);
      if (posRes?.success && posRes.value) {
        for (const p of posRes.value) {
          const direction: 'BUY' | 'SELL' = p.units < 0n ? 'SELL' : 'BUY';
          const absUnrealised = p.unrealizedPnl.price < 0n
            ? -p.unrealizedPnl.price
            : p.unrealizedPnl.price;
          openPositions.push({
            instrument: p.instrument,
            direction,
            riskAmountInAccountCurrency: absUnrealised as ScaledInteger,
          });
        }
      }
    } catch (e: any) {
      log.warn('buildAccountRiskState: getPositions failed — openPositions will be empty', { error: e.message });
    }
  }

  return {
    accountId,
    accountCurrency,
    startingDailyBalance,
    currentEquity,
    highWaterMark: storedHwm,
    openPositionCount: accountState.openPositionsCount,
    realizedPnlToday,
    unrealizedPnl: accountState.unrealizedPnl.price as ScaledInteger,
    isNewsBlackoutActive,
    newsStatus,
    quoteToAccountRates: options?.quoteToAccountRates,
    openPositions: openPositions.length > 0 ? openPositions : undefined,
    currentSpreadPips: options?.currentSpreadPips,
  };
}
