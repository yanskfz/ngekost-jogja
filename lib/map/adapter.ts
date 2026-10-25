import { readPublicEnv, type PublicEnv } from '@/lib/env';

export type LatLng = { latitude: number; longitude: number };

export type MapAdapterConfig = {
  tileUrlTemplate: string;
  attribution: string;
  /** Default view covering the MVP service area (Sleman and Kota Jogja). */
  defaultCenter: LatLng;
  defaultZoom: number;
};

export const JOGJA_CENTER: LatLng = { latitude: -7.7956, longitude: 110.3695 };

export function getMapAdapterConfig(env: PublicEnv = readPublicEnv()): MapAdapterConfig {
  return {
    tileUrlTemplate: env.mapTileUrl,
    attribution: env.mapAttribution,
    defaultCenter: JOGJA_CENTER,
    defaultZoom: 12,
  };
}

export function tileUrl(config: MapAdapterConfig, z: number, x: number, y: number): string {
  return config.tileUrlTemplate
    .replace('{z}', String(z))
    .replace('{x}', String(x))
    .replace('{y}', String(y));
}
