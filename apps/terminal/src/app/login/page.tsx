import React from 'react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

async function handleLogin(formData: FormData) {
  'use server';

  const password = formData.get('password');
  const expectedPassword = process.env.ADMIN_PASSWORD || 'meridian_terminal_2026';

  if (password === expectedPassword) {
    const cookieStore = await cookies();
    cookieStore.set('console_session', 'active_session', {
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 86400, // 24 hours
    });
    redirect('/brief');
  } else {
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

  return (
    <div style={{
      display: 'flex',
      minHeight: '100vh',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#F8FAFC',
      fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      <div style={{
        width: '400px',
        border: '1px solid #E2E8F0',
        padding: '40px',
        backgroundColor: '#FFFFFF'
      }}>
        {/* Logo / Brand */}
        <div style={{ marginBottom: '32px' }}>
          <div style={{
            fontFamily: '"DM Mono", monospace',
            fontSize: '11px',
            color: '#64748B',
            marginBottom: '10px',
            letterSpacing: '2px',
            textTransform: 'uppercase'
          }}>
            MERIDIAN &nbsp;•&nbsp; MASTER CONSOLE
          </div>
          <h1 style={{
            fontSize: '22px',
            fontWeight: 700,
            color: '#0F172A',
            letterSpacing: '-0.5px'
          }}>
            Operator Authentication
          </h1>
          <p style={{ fontSize: '13px', color: '#64748B', marginTop: '8px', lineHeight: '1.5' }}>
            Enter your console access code to proceed.
          </p>
        </div>

        <form action={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label htmlFor="password" style={{
              fontSize: '12px',
              fontWeight: 600,
              color: '#0F172A',
              letterSpacing: '0.3px'
            }}>
              Console Access Code
            </label>
            <input
              type="password"
              id="password"
              name="password"
              required
              autoFocus
              style={{
                padding: '10px 14px',
                border: '1px solid #E2E8F0',
                fontFamily: '"DM Mono", monospace',
                fontSize: '14px',
                color: '#0F172A',
                outline: 'none',
                backgroundColor: '#F8FAFC',
                width: '100%'
              }}
            />
          </div>

          {error && (
            <div style={{
              fontSize: '13px',
              color: '#DC2626',
              fontFamily: '"DM Mono", monospace',
              border: '1px solid #FCA5A5',
              padding: '10px 14px',
              backgroundColor: '#FEF2F2'
            }}>
              AUTHENTICATION FAILED: ACCESS CODE INVALID
            </div>
          )}

          <button
            type="submit"
            style={{
              backgroundColor: '#1E3A5F',
              color: '#FFFFFF',
              border: 'none',
              padding: '12px',
              fontWeight: 600,
              fontSize: '13px',
              fontFamily: 'Inter, sans-serif',
              cursor: 'pointer',
              letterSpacing: '0.3px'
            }}
          >
            Sign In to Console
          </button>
        </form>

        <div style={{ marginTop: '24px', textAlign: 'center', fontSize: '12px', borderTop: '1px solid #E2E8F0', paddingTop: '20px' }}>
          <a href="/landing" style={{ color: '#64748B', textDecoration: 'none', fontWeight: 500 }}>
            ← View Product Overview
          </a>
        </div>
      </div>
    </div>
  );
}
