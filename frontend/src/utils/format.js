// Light formatting helpers — French relative time and a deterministic avatar
// colour from a string. Kept stupid-simple to avoid pulling in date-fns.

export function relativeTimeFr(iso) {
  if (!iso) return '';
  const date = new Date(iso);
  const diff = Math.round((Date.now() - date.getTime()) / 1000);
  if (Number.isNaN(diff)) return '';
  if (diff < 30) return "à l'instant";
  if (diff < 60) return `il y a ${diff} s`;
  const m = Math.round(diff / 60);
  if (m < 60) return `il y a ${m} min`;
  const h = Math.round(m / 60);
  if (h < 24) return `il y a ${h} h`;
  const d = Math.round(h / 24);
  if (d < 7) return `il y a ${d} j`;
  return date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function formatDateFr(iso) {
  if (!iso) return '';
  const date = new Date(iso);
  return date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
}

export function initials(name) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// Deterministic colour from a name — used for avatar backgrounds.
const AVATAR_PALETTE = [
  '#0E5C66', '#14B8A6', '#2563EB', '#7C3AED', '#DB2777',
  '#D97706', '#16A34A', '#0891B2', '#9333EA', '#E11D48',
];
export function colorFromName(name) {
  if (!name) return AVATAR_PALETTE[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return AVATAR_PALETTE[hash % AVATAR_PALETTE.length];
}

export function bytesToHuman(bytes) {
  if (!bytes && bytes !== 0) return '';
  const units = ['o', 'ko', 'Mo', 'Go'];
  let i = 0;
  let v = bytes;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v.toFixed(v < 10 && i > 0 ? 1 : 0)} ${units[i]}`;
}
