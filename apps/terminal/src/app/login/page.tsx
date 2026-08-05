import React from 'react';
import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import crypto from 'crypto';
import { createSessionToken } from '../../lib/auth';
import { checkLoginRateLimit, recordLoginAttempt } from '../../lib/rateLimit';

function constantTimeCompare(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  if (bufA.length !== bufB.length) {
    crypto.timingSafeEqual(bufA, bufA);
    return false;
  }
  return crypto.timingSafeEqual(bufA, bufB);
}

async function handleLogin(formData: FormData) {
  'use server';

  const headerStore = await headers();
  const clientIp =
    headerStore.get('x-forwarded-for')?.split(',')[0].trim() ||
    headerStore.get('x-real-ip') ||
    '127.0.0.1';

  // 1. Rate limit check: 5 attempts per 15 minutes per IP
  const rateLimit = await checkLoginRateLimit(clientIp);
  if (!rateLimit.allowed) {
    redirect('/login?error=rate_limited');
  }

  // 2. ADMIN_PASSWORD validation — MUST throw 500 configuration error if unset. Never fall back to default.
  const expectedPassword = process.env.ADMIN_PASSWORD;
  if (!expectedPassword) {
    throw new Error('500: Server Configuration Error — ADMIN_PASSWORD environment variable is missing.');
  }

  const password = formData.get('password');
  if (typeof password !== 'string' || !password) {
    await recordLoginAttempt(clientIp, false);
    redirect('/login?error=invalid_credentials');
  }

  // 3. Constant-time password comparison
  const isMatch = constantTimeCompare(password, expectedPassword);

  if (isMatch) {
    await recordLoginAttempt(clientIp, true);
    // 4. Issue signed JWT session token (8h expiry)
    const token = await createSessionToken('operator');
    const cookieStore = await cookies();
    cookieStore.set('console_session', token, {
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 28800, // 8 hours max
    });
    redirect('/brief');
  } else {
    await recordLoginAttempt(clientIp, false);
    redirect('/login?error=invalid_credentials');
  }
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const error = params.error;

  let errorMessage = '';
  if (error === 'rate_limited') {
    errorMessage = 'AUTHENTICATION FAILED: TOO MANY ATTEMPTS. LOCKOUT ACTIVE (MAX 5 PER 15 MINS).';
  } else if (error === 'config_error') {
    errorMessage = 'CONFIGURATION ERROR: ADMIN_PASSWORD UNSET ON SERVER.';
  } else if (error === 'invalid_credentials') {
    errorMessage = 'AUTHENTICATION FAILED: ACCESS CODE INVALID';
  }

  return (
    <div style={{
      display: 'flex',
      minHeight: '100vh',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#F8FAFC',
      fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    }}>
      <div style={{
        width: '360px',
        border: '1px solid #E2E8F0',
        padding: '32px',
        backgroundColor: '#FFFFFF'
      }}>
        <div style={{
          fontFamily: '"DM Mono", monospace',
          fontSize: '11px',
          color: '#64748B',
          marginBottom: '8px',
          letterSpacing: '1px'
        }}>
          MERIDIAN // MASTER CONSOLE
        </div>
        <h1 style={{
          fontSize: '20px',
          fontWeight: 700,
          color: '#0F172A',
          marginBottom: '24px',
          letterSpacing: '-0.5px'
        }}>
          Gatekeeper Authentication
        </h1>

        <form action={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label htmlFor="password" style={{
              fontSize: '11px',
              fontWeight: 600,
              color: '#0F172A',
              fontFamily: '"DM Mono", monospace'
            }}>
              CONSOLE ACCESS CODE:
            </label>
            <input
              type="password"
              id="password"
              name="password"
              required
              autoFocus
              style={{
                padding: '8px 12px',
                border: '1px solid #E2E8F0',
                fontFamily: '"DM Mono", monospace',
                fontSize: '14px',
                color: '#0F172A',
                outline: 'none',
                backgroundColor: '#F8FAFC'
              }}
            />
          </div>

          {errorMessage && (
            <div style={{
              fontSize: '12px',
              color: '#DC2626',
              fontFamily: '"DM Mono", monospace',
              border: '1px solid #FCA5A5',
              padding: '8px',
              backgroundColor: '#FEF2F2'
            }}>
              {errorMessage}
            </div>
          )}

          <button
            type="submit"
            style={{
              backgroundColor: '#1E3A5F',
              color: '#FFFFFF',
              border: 'none',
              padding: '10px',
              fontWeight: 600,
              fontSize: '12px',
              fontFamily: '"DM Mono", monospace',
              cursor: 'pointer',
              marginTop: '8px',
              textAlign: 'center'
            }}
          >
            VERIFY KEY &amp; DECRYPT
          </button>
        </form>

        <div style={{ marginTop: '20px', textAlign: 'center', fontSize: '10px', color: '#94A3B8', fontFamily: '"DM Mono", monospace' }}>
          RESTRICTED ACCESS // AUTHORIZED OPERATORS ONLY
        </div>
      </div>
    </div>
  );
}
