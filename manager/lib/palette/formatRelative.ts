/**
 * Compact relative-time labels used in the « Récents » group of the
 * command palette.
 *
 * - < 60 s        → « à l'instant »
 * - < 60 min      → « il y a N min »
 * - < 24 h        → « il y a N h »
 * - same day - 1  → « hier »
 * - < 7 days      → « il y a N j »
 * - older         → date courte « 12 juin »
 */

const MONTHS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];

export function formatRelative(ts: number, now: number = Date.now()): string {
  const delta = Math.max(0, now - ts);
  const secs = Math.floor(delta / 1000);
  if (secs < 60) return "à l'instant";
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `il y a ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `il y a ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'hier';
  if (days < 7) return `il y a ${days} j`;
  const d = new Date(ts);
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
}
