import { describe, expect, it } from 'vitest';
import { DEFAULT_MAP_TILE_URL, readPublicEnv, readServiceRoleKey } from '@/lib/env';
import { getMapAdapterConfig, tileUrl } from '@/lib/map/adapter';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';

describe('env', () => {
  it('treats blank values as unset and falls back to OSM defaults', () => {
    const env = readPublicEnv({ NEXT_PUBLIC_SUPABASE_URL: ' ', NEXT_PUBLIC_MAP_TILE_URL: '' });
    expect(env.supabaseUrl).toBeUndefined();
    expect(env.mapTileUrl).toBe(DEFAULT_MAP_TILE_URL);
  });

  it('reads the service role key only from the provided source', () => {
    expect(readServiceRoleKey({})).toBeUndefined();
    expect(readServiceRoleKey({ SUPABASE_SERVICE_ROLE_KEY: 'k' })).toBe('k');
  });
});

describe('map adapter', () => {
  it('builds tile URLs from the configured template', () => {
    const config = getMapAdapterConfig(readPublicEnv({}));
    expect(tileUrl(config, 12, 3, 4)).toBe('https://tile.openstreetmap.org/12/3/4.png');
  });
});

describe('supabase client boundary', () => {
  it('fails clearly when Supabase is not configured', () => {
    expect(() => createBrowserSupabaseClient(readPublicEnv({}))).toThrow(/not configured/);
  });
});
