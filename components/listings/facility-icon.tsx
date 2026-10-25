import { Bath, Bike, BedDouble, Car, Check, House, Snowflake, Wifi, type LucideIcon } from 'lucide-react';

const ICONS: [RegExp, LucideIcon][] = [
  [/wi-?fi/i, Wifi],
  [/\bac\b/i, Snowflake],
  [/kamar mandi/i, Bath],
  [/^\d+\s*kamar$/i, BedDouble],
  [/motor/i, Bike],
  [/carport|mobil|parkir/i, Car],
  [/rumah/i, House],
];

export function FacilityIcon({ name, size = 16 }: { name: string; size?: number }) {
  const Icon = ICONS.find(([re]) => re.test(name))?.[1] ?? Check;
  return <Icon size={size} aria-hidden="true" />;
}
