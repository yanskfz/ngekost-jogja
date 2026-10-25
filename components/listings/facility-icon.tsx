import { Bath, Bike, BedDouble, Car, Check, Snowflake, Wifi, type LucideIcon } from 'lucide-react';

const ICONS: [RegExp, LucideIcon][] = [
  [/wi-?fi/i, Wifi],
  [/\bac\b/i, Snowflake],
  [/kamar mandi/i, Bath],
  [/motor/i, Bike],
  [/carport|mobil|parkir/i, Car],
  [/kasur|tempat tidur/i, BedDouble],
];

export function FacilityIcon({ name, size = 16 }: { name: string; size?: number }) {
  const Icon = ICONS.find(([re]) => re.test(name))?.[1] ?? Check;
  return <Icon size={size} aria-hidden="true" />;
}
