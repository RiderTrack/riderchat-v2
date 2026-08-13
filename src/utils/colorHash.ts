/**
 * Utility to generate a consistent color / gradient class or color style based on string hash (client name).
 */

export interface AvatarPalette {
  bg: string;
  text: string;
  border: string;
  hex: string;
}

const AVATAR_PALETTES: AvatarPalette[] = [
  { bg: 'bg-emerald-600', text: 'text-white', border: 'border-emerald-500', hex: '#059669' },
  { bg: 'bg-teal-600', text: 'text-white', border: 'border-teal-500', hex: '#0d9488' },
  { bg: 'bg-indigo-600', text: 'text-white', border: 'border-indigo-500', hex: '#4f46e5' },
  { bg: 'bg-violet-600', text: 'text-white', border: 'border-violet-500', hex: '#7c3aed' },
  { bg: 'bg-purple-600', text: 'text-white', border: 'border-purple-500', hex: '#9333ea' },
  { bg: 'bg-cyan-600', text: 'text-white', border: 'border-cyan-500', hex: '#0891b2' },
  { bg: 'bg-blue-600', text: 'text-white', border: 'border-blue-500', hex: '#2563eb' },
  { bg: 'bg-amber-600', text: 'text-white', border: 'border-amber-500', hex: '#d97706' },
  { bg: 'bg-rose-600', text: 'text-white', border: 'border-rose-500', hex: '#e11d48' },
  { bg: 'bg-sky-600', text: 'text-white', border: 'border-sky-500', hex: '#0284c7' },
];

export function getAvatarPalette(name: string): AvatarPalette {
  if (!name) return AVATAR_PALETTES[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % AVATAR_PALETTES.length;
  return AVATAR_PALETTES[index];
}

export function getAvatarColorHex(name: string): string {
  return getAvatarPalette(name).hex;
}
