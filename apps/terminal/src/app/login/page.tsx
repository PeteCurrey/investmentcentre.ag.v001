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
    redirect('/');
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
      backgroundColor: '#FFFFFF',
      fontFamily: 'Inter, sans-serif'
    }}>
      <div style={{
        width: '360px',
        border: '1px solid #E4E4DF',
        padding: '32px',
        backgroundColor: '#FFFFFF'
      }}>
        <div style={{
          fontFamily: '"DM Mono", monospace',
          fontSize: '11px',
          color: '#6B7280',
          marginBottom: '8px',
          letterSpacing: '1px'
        }}>
          MERIDIAN // MASTER CONSOLE
        </div>
        <h1 style={{
          fontSize: '20px',
          fontWeight: 700,
          color: '#14181B',
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
              color: '#14181B',
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
                border: '1px solid #E4E4DF',
                fontFamily: '"DM Mono", monospace',
                fontSize: '14px',
                color: '#14181B',
                outline: 'none',
                backgroundColor: '#F7F7F5'
              }}
            />
          </div>

          {error && (
            <div style={{
              fontSize: '12px',
              color: '#DC2626',
              fontFamily: '"DM Mono", monospace',
              border: '1px solid #FCA5A5',
              padding: '8px',
              backgroundColor: '#FEF2F2'
            }}>
              AUTHENTICATION FAILED: ACCESS CODE INVALID
            </div>
          )}

          <button
            type="submit"
            style={{
              backgroundColor: '#1C3A5E',
              color: '#FFFFFF',
              border: 'none',
              padding: '10px',
              fontWeight: 700,
              fontSize: '12px',
              fontFamily: '"DM Mono", monospace',
              cursor: 'pointer',
              marginTop: '8px',
              textAlign: 'center'
            }}
          >
            VERIFY KEY & DECRYPT
          </button>
        </form>
      </div>
    </div>
  );
}
