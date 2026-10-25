export type PublicEnv = {
  supabaseUrl: string | undefined;
  supabaseAnonKey: string | undefined;
  mapTileUrl: string;
  mapAttribution: string;
};

export const DEFAULT_MAP_TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
export const DEFAULT_MAP_ATTRIBUTION = '© OpenStreetMap contributors';

type Source = Record<string, string | undefined>;

function blankToUndefined(value: string | undefined): string | undefined {
  return value && value.trim() !== '' ? value.trim() : undefined;
}

// NEXT_PUBLIC_* values must be read by literal name so Next.js can inline them in the browser bundle.
export function readPublicEnv(source: Source = {
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  NEXT_PUBLIC_MAP_TILE_URL: process.env.NEXT_PUBLIC_MAP_TILE_URL,
  NEXT_PUBLIC_MAP_ATTRIBUTION: process.env.NEXT_PUBLIC_MAP_ATTRIBUTION,
}): PublicEnv {
  return {
    supabaseUrl: blankToUndefined(source.NEXT_PUBLIC_SUPABASE_URL),
    supabaseAnonKey: blankToUndefined(source.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    mapTileUrl: blankToUndefined(source.NEXT_PUBLIC_MAP_TILE_URL) ?? DEFAULT_MAP_TILE_URL,
    mapAttribution: blankToUndefined(source.NEXT_PUBLIC_MAP_ATTRIBUTION) ?? DEFAULT_MAP_ATTRIBUTION,
  };
}

export function readServiceRoleKey(source: Source = process.env): string | undefined {
  return blankToUndefined(source.SUPABASE_SERVICE_ROLE_KEY);
}
