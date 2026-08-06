/**
 * POST /api/autotrader/risk-profile
 *
 * Dedicated endpoint for updating risk profile parameters.
 * Mandates a non-empty `reason` string and appends every change to
 * `meridian.risk_profile_changes` before updating `meridian.autotrader_state`.
 */

import { NextResponse } from 'next/server';
import { requireSession } from '../../../../lib/auth';
import {
  readAutotraderConfig,
  writeAutotraderConfig,
  writeAutotraderConfigResult,
  insertRiskProfileChange,
  RiskProfileOverrides,
} from '@meridian/core';
import { FTMO_STANDARD_PROFILE } from '@meridian/risk';

const ALLOWED_FIELDS = [
  'maxConcurrentPositions',
  'maxDailyLossPct',
  'maxTotalDrawdownPct',
  'maxRiskPerTradePct',
  'maxAggregateRiskPct',
  'maxCorrelatedExposure',
] as const;

type AllowedField = typeof ALLOWED_FIELDS[number];

export async function POST(request: Request) {
  let sessionPayload;
  try {
    sessionPayload = await requireSession();
  } catch {
    return NextResponse.json(
      { success: false, error: 'UNAUTHORIZED: Valid session authentication required.' },
      { status: 401 }
    );
  }

  let body: { field?: string; value?: number; reason?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: 'INVALID_JSON: Request body must be valid JSON.' },
      { status: 400 }
    );
  }

  const { field, value, reason } = body;

  if (!reason || typeof reason !== 'string' || reason.trim().length === 0) {
    return NextResponse.json(
      { success: false, error: 'REASON_REQUIRED: A non-empty reason is mandatory for risk profile modifications.' },
      { status: 400 }
    );
  }

  if (!field || typeof field !== 'string' || !ALLOWED_FIELDS.includes(field as AllowedField)) {
    return NextResponse.json(
      { success: false, error: `INVALID_FIELD: Must be one of [${ALLOWED_FIELDS.join(', ')}].` },
      { status: 400 }
    );
  }

  if (typeof value !== 'number' || isNaN(value) || !isFinite(value)) {
    return NextResponse.json(
      { success: false, error: 'INVALID_VALUE: Value must be a valid finite number.' },
      { status: 400 }
    );
  }

  const targetField = field as AllowedField;

  // Validation limits per field
  if (targetField === 'maxConcurrentPositions') {
    if (!Number.isInteger(value) || value < 1 || value > 20) {
      return NextResponse.json(
        { success: false, error: 'INVALID_VALUE: maxConcurrentPositions must be an integer between 1 and 20 (hard ceiling).' },
        { status: 400 }
      );
    }
  } else if (targetField === 'maxDailyLossPct') {
    if (value <= 0 || value > FTMO_STANDARD_PROFILE.maxDailyLossPct) {
      return NextResponse.json(
        { success: false, error: `INVALID_VALUE: maxDailyLossPct must be > 0 and <= FTMO baseline (${FTMO_STANDARD_PROFILE.maxDailyLossPct}%).` },
        { status: 400 }
      );
    }
  } else if (targetField === 'maxTotalDrawdownPct') {
    if (value <= 0 || value > FTMO_STANDARD_PROFILE.maxTotalDrawdownPct) {
      return NextResponse.json(
        { success: false, error: `INVALID_VALUE: maxTotalDrawdownPct must be > 0 and <= FTMO baseline (${FTMO_STANDARD_PROFILE.maxTotalDrawdownPct}%).` },
        { status: 400 }
      );
    }
  } else if (targetField === 'maxRiskPerTradePct') {
    if (value <= 0 || value > FTMO_STANDARD_PROFILE.maxRiskPerTradePct) {
      return NextResponse.json(
        { success: false, error: `INVALID_VALUE: maxRiskPerTradePct must be > 0 and <= FTMO baseline (${FTMO_STANDARD_PROFILE.maxRiskPerTradePct}%).` },
        { status: 400 }
      );
    }
  } else if (targetField === 'maxAggregateRiskPct') {
    if (value <= 0 || value > (FTMO_STANDARD_PROFILE.maxAggregateRiskPct ?? 5.0)) {
      return NextResponse.json(
        { success: false, error: `INVALID_VALUE: maxAggregateRiskPct must be > 0 and <= FTMO baseline (${FTMO_STANDARD_PROFILE.maxAggregateRiskPct ?? 5.0}%).` },
        { status: 400 }
      );
    }
  } else if (targetField === 'maxCorrelatedExposure') {
    if (!Number.isInteger(value) || value < 1 || value > 10) {
      return NextResponse.json(
        { success: false, error: 'INVALID_VALUE: maxCorrelatedExposure must be an integer between 1 and 10.' },
        { status: 400 }
      );
    }
  }

  const currentConfig = await readAutotraderConfig();
  const oldOverrides = currentConfig?.riskProfileOverrides ?? {};
  const oldValue = oldOverrides[targetField] ?? ((FTMO_STANDARD_PROFILE as unknown as Record<string, unknown>)[targetField]) ?? null;

  const actor = sessionPayload.sub || 'user';

  // 1. Audit log insertion
  const logOk = await insertRiskProfileChange({
    fieldName: targetField,
    oldValue,
    newValue: value,
    actor,
    reason: reason.trim(),
  });

  if (!logOk) {
    return NextResponse.json(
      { success: false, error: 'AUDIT_LOG_FAILED: Failed to record risk profile change in audit log.' },
      { status: 500 }
    );
  }

  // 2. Persist update in autotrader_state
  const newOverrides: RiskProfileOverrides = {
    ...oldOverrides,
    [targetField]: value,
  };

  const writeRes = await writeAutotraderConfigResult({
    riskProfileOverrides: newOverrides,
    updatedBy: actor,
  });

  if (!writeRes.ok) {
    return NextResponse.json(
      { success: false, error: `CONFIG_WRITE_FAILURE: ${writeRes.error}` },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    field: targetField,
    oldValue,
    newValue: value,
    config: updatedConfig,
  });
}
