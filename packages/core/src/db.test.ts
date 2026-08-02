import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getSupabaseClient, resetSupabaseClient } from './db';

describe('packages/core/db', () => {
  const origUrl = process.env.SUPABASE_URL;
  const origKey = process.env.SUPABASE_ANON_KEY;
  const origNextUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const origNextKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  beforeEach(() => {
    resetSupabaseClient();
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_ANON_KEY;
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  });

  afterEach(() => {
    if (origUrl) process.env.SUPABASE_URL = origUrl;
    else delete process.env.SUPABASE_URL;

    if (origKey) process.env.SUPABASE_ANON_KEY = origKey;
    else delete process.env.SUPABASE_ANON_KEY;

    if (origNextUrl) process.env.NEXT_PUBLIC_SUPABASE_URL = origNextUrl;
    else delete process.env.NEXT_PUBLIC_SUPABASE_URL;

    if (origNextKey) process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = origNextKey;
    else delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    resetSupabaseClient();
  });

  it('throws when both URL and Key are missing', () => {
    expect(() => getSupabaseClient()).toThrow(
      'Database Initialization Error: Missing SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) or SUPABASE_ANON_KEY (or NEXT_PUBLIC_SUPABASE_ANON_KEY) environment variables.'
    );
  });

  it('throws when URL is set but Key is missing', () => {
    process.env.SUPABASE_URL = 'https://valid-supabase-url.supabase.co';
    expect(() => getSupabaseClient()).toThrow(
      'Database Initialization Error: Missing SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) or SUPABASE_ANON_KEY (or NEXT_PUBLIC_SUPABASE_ANON_KEY) environment variables.'
    );
  });

  it('throws when Key is set but URL is missing', () => {
    process.env.SUPABASE_ANON_KEY = 'valid-anon-key-12345';
    expect(() => getSupabaseClient()).toThrow(
      'Database Initialization Error: Missing SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) or SUPABASE_ANON_KEY (or NEXT_PUBLIC_SUPABASE_ANON_KEY) environment variables.'
    );
  });

  it('returns initialized SupabaseClient when both URL and Key are set', () => {
    process.env.SUPABASE_URL = 'https://valid-supabase-url.supabase.co';
    process.env.SUPABASE_ANON_KEY = 'valid-anon-key-12345';
    const client = getSupabaseClient();
    expect(client).toBeDefined();
    expect(typeof client.from).toBe('function');
  });
});
