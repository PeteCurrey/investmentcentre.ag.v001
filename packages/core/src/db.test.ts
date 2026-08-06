import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getSupabaseClient, getSupabaseServiceClient, resetSupabaseClient } from './db';

describe('packages/core/db', () => {
  const origUrl = process.env.SUPABASE_URL;
  const origKey = process.env.SUPABASE_ANON_KEY;
  const origSecretKey = process.env.SUPABASE_SECRET_KEY;
  const origNextUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const origNextKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  beforeEach(() => {
    resetSupabaseClient();
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_ANON_KEY;
    delete process.env.SUPABASE_SECRET_KEY;
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  });

  afterEach(() => {
    if (origUrl) process.env.SUPABASE_URL = origUrl;
    else delete process.env.SUPABASE_URL;

    if (origKey) process.env.SUPABASE_ANON_KEY = origKey;
    else delete process.env.SUPABASE_ANON_KEY;

    if (origSecretKey) process.env.SUPABASE_SECRET_KEY = origSecretKey;
    else delete process.env.SUPABASE_SECRET_KEY;

    if (origNextUrl) process.env.NEXT_PUBLIC_SUPABASE_URL = origNextUrl;
    else delete process.env.NEXT_PUBLIC_SUPABASE_URL;

    if (origNextKey) process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = origNextKey;
    else delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    resetSupabaseClient();
  });

  it('getSupabaseClient throws security exception unconditionally', () => {
    expect(() => getSupabaseClient()).toThrow(
      'SECURITY EXCEPTION: getSupabaseClient() is prohibited. All database access must use getSupabaseServiceClient().'
    );
  });

  it('getSupabaseServiceClient returns service client when SUPABASE_SECRET_KEY is set', () => {
    process.env.SUPABASE_URL = 'https://valid-supabase-url.supabase.co';
    process.env.SUPABASE_SECRET_KEY = 'valid-secret-key-12345';
    const client = getSupabaseServiceClient();
    expect(client).toBeDefined();
    expect(typeof client.from).toBe('function');
  });
});
