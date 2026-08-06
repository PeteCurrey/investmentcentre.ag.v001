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
}

/**
 * Calculates the ISO timestamp of the OANDA daily rollover (17:00 America/New_York).
 */
export function getOandaDayResetIso(now = new Date()): string {
  const nyDateStr = now.toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
  const nyHour = parseInt(
    now.toLocaleTimeString('en-US', {
      timeZone: 'America/New_York',
      hour12: false,
      hour: '2-digit',
    }),
    10
  );

  let targetDateStr = nyDateStr;
  if (nyHour < 17) {
    const prev = new Date(now.getTime() - 24 * 3600 * 1000);
    targetDateStr = prev.toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
  }

  const dEst = new Date(`${targetDateStr}T17:00:00-05:00`);
  const estHour = parseInt(
    dEst.toLocaleTimeString('en-US', {
      timeZone: 'America/New_York',
      hour12: false,
      hour: '2-digit',
    }),
    10
  );

  if (estHour === 17) {
    return dEst.toISOString();
  }
  const dEdt = new Date(`${targetDateStr}T17:00:00-04:00`);
  return dEdt.toISOString();
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
  const currentBalance = accountState.balance.price as ScaledInteger;
  const currentEquity = accountState.equity.price as ScaledInteger;

  // 2. Fetch OANDA realized PnL today (since 17:00 ET day rollover)
  const dayResetIso = getOandaDayResetIso();
  const dayDate = dayResetIso.substring(0, 10);
  let realizedPnlToday = 0n as ScaledInteger;

  // Duck-type check: any adapter that implements getRealizedPnlToday is supported.
  // We intentionally avoid importing OandaBrokerAdapter directly to prevent a
  // circular dependency cycle between @meridian/risk and @meridian/execute.
  const adapterWithPnl = adapter as unknown as Record<string, unknown>;
  if (typeof adapterWithPnl['getRealizedPnlToday'] === 'function') {
    const pnlRes = await (adapterWithPnl['getRealizedPnlToday'] as (
      accountId: string,
      sinceIso: string
    ) => Promise<{ success: boolean; value?: ScaledInteger; error?: { message: string } }>)(
      accountId,
      dayResetIso
    );
    if (pnlRes && pnlRes.success && pnlRes.value !== undefined) {
      realizedPnlToday = pnlRes.value;
    }
  }

  // 3. Read/upsert startingDailyBalance and highWaterMark from meridian.account_day
  let startingDailyBalance: ScaledInteger | null = null;
  let storedHwm: ScaledInteger = currentEquity;

  try {
    const sb = getSupabaseServiceClient();

    // Query existing row for today
    const { data: todayRow } = await sb
      .schema('meridian')
      .from('account_day')
      .select('*')
      .eq('day_date', dayDate)
      .maybeSingle();

    // Query max high water mark ever recorded
    const { data: maxRows } = await sb
      .schema('meridian')
      .from('account_day')
      .select('high_water_mark')
      .order('high_water_mark', { ascending: false })
      .limit(1);

    const maxEverHwm =
      maxRows && maxRows.length > 0
        ? (BigInt(maxRows[0].high_water_mark) as ScaledInteger)
        : (0n as ScaledInteger);

    if (todayRow) {
      startingDailyBalance = BigInt(todayRow.opening_balance) as ScaledInteger;
      const rowHwm = BigInt(todayRow.high_water_mark) as ScaledInteger;
      storedHwm = rowHwm > maxEverHwm ? rowHwm : maxEverHwm;

      // Update HWM monotonically if current equity exceeds stored value
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
      // Create new row for today
      storedHwm = currentEquity > maxEverHwm ? currentEquity : maxEverHwm;
      startingDailyBalance = currentBalance;

      const { error: insertErr } = await sb
        .schema('meridian')
        .from('account_day')
        .insert({
          day_date: dayDate,
          opening_balance: String(currentBalance),
          opening_balance_captured_at: new Date().toISOString(),
          high_water_mark: String(storedHwm),
          high_water_mark_updated_at: new Date().toISOString(),
        });

      if (insertErr) {
        log.error('Failed to insert account_day row for today', {
          error: insertErr.message,
        });
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
  //    Maps to OpenPositionRisk[] for aggregate/correlated risk rule evaluation.
  //    Duck-typed via optional method on StateAdapter to avoid circular imports.
  const openPositions: OpenPositionRisk[] = [];
  if (typeof adapter.getPositions === 'function') {
    try {
      const posRes = await adapter.getPositions!(accountId);
      if (posRes?.success && posRes.value) {
        for (const p of posRes.value) {
          // OANDA: negative units = short (SELL), positive = long (BUY)
          const direction: 'BUY' | 'SELL' = p.units < 0n ? 'SELL' : 'BUY';
          // riskAmountInAccountCurrency: absolute unrealizedPnl magnitude as a proxy.
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
    accountCurrency: accountState.currency || 'USD',
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
  };
}
