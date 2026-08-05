/**
 * auth.ts — Centralised authentication for MERIDIAN terminal.
 *
 * Uses jose with HS256 (HMAC-SHA256) only. No JWE/compression — stays fully
 * Edge-runtime compatible so middleware can call verifySessionToken without
 * Node.js module restrictions.
 *
 * SESSION_SECRET must be ≥ 32 chars. Validated at every call via requireSessionSecret().
 */
import { cookies } from 'next/headers';
import { SignJWT, jwtVerify } from 'jose';
import type { JWTPayload } from 'jose';

export interface SessionPayload extends JWTPayload {
  sub: string;
  jti: string;
  iat: number;
  exp: number;
}

/** Validates and returns SESSION_SECRET. Throws if missing or too short. */
export function requireSessionSecret(): string {
  const secret = process.env.SESSION_SECRET || process.env.RISK_HMAC_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      'Security Exception: SESSION_SECRET or RISK_HMAC_SECRET environment variable is missing or under the minimum required length of 32 characters.'
    );
  }
  return secret;
}

function getSecretKey(): Uint8Array {
  return new TextEncoder().encode(requireSessionSecret());
}

/** Signs a new HS256 JWT. Issued-at = now, expiry = 8 hours. */
export async function createSessionToken(subject = 'operator'): Promise<string> {
  const secret = getSecretKey();
  // Use crypto.randomUUID() — available in both Node.js 18+ and Edge runtime.
  const jti =
    typeof crypto !== 'undefined' && typeof (crypto as Crypto).randomUUID === 'function'
      ? (crypto as Crypto).randomUUID()
      : Math.random().toString(36).slice(2);

  return new SignJWT({ sub: subject })
    .setProtectedHeader({ alg: 'HS256' })
    .setJti(jti)
    .setIssuedAt()
    .setExpirationTime('8h')
    .sign(secret);
}

/**
 * Verifies a compact JWT string (HS256). Returns parsed payload or null.
 * Safe to call from Edge middleware — no Node-only APIs used.
 */
export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecretKey(), {
      algorithms: ['HS256'],
    });
    if (
      typeof payload.sub !== 'string' ||
      typeof payload.jti !== 'string' ||
      typeof payload.iat !== 'number' ||
      typeof payload.exp !== 'number'
    ) {
      return null;
    }
    return payload as SessionPayload;
  } catch {
    return null;
  }
}

/**
 * Reads the `console_session` cookie and verifies its JWT.
 * For use inside Server Components and API Routes (Node runtime).
 */
export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get('console_session')?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

/**
 * requireSession — call at the top of every protected API route or Server Action.
 * Throws Error('UNAUTHORIZED') if the session cookie is missing, invalid, or expired.
 */
export async function requireSession(): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) {
    throw new Error('UNAUTHORIZED');
  }
  return session;
}
