import { getSupabaseServiceClient } from '@meridian/core';

export interface RateLimitCheckResult {
  allowed: boolean;
  attemptCount: number;
  message?: string;
}

/**
 * Checks Supabase meridian.login_attempts for failed attempts in the past 15 minutes for the given IP.
 * Max allowed: 5 failed attempts per 15 min window.
 */
export async function checkLoginRateLimit(ip: string): Promise<RateLimitCheckResult> {
  const db = getSupabaseServiceClient();
  const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();

  const { count, error } = await db
    .from('login_attempts')
    .select('*', { count: 'exact', head: true })
    .eq('ip', ip)
    .eq('success', false)
    .gte('attempted_at', fifteenMinutesAgo);

  if (error) {
    console.error('Rate limit query error:', error);
  }

  const attemptCount = count ?? 0;
  if (attemptCount >= 5) {
    return {
      allowed: false,
      attemptCount,
      message: 'TOO_MANY_ATTEMPTS: Lockout active. Maximum 5 failed login attempts per 15 minutes exceeded.',
    };
  }

  return {
    allowed: true,
    attemptCount,
  };
}

/**
 * Records a login attempt (success or failure) in Supabase.
 */
export async function recordLoginAttempt(ip: string, success: boolean): Promise<void> {
  try {
    const db = getSupabaseServiceClient();
    await db.from('login_attempts').insert({
      ip,
      attempted_at: new Date().toISOString(),
      success,
    });
  } catch (err) {
    console.error('Failed to record login attempt:', err);
  }
}
