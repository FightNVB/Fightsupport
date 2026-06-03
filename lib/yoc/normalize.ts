export function normalizeVa(input: unknown): string | null {
  const raw = String(input ?? '').trim().toUpperCase();
  if (!raw) return null;
  const digits = raw.replace(/^VA/i, '').replace(/[^0-9]/g, '');
  if (!digits) return null;
  return `VA${digits.padStart(5, '0')}`;
}

export function normText(input: unknown): string {
  return String(input ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function namesProbablyMatch(a: unknown, b: unknown): boolean {
  const aa = normText(a);
  const bb = normText(b);
  if (!aa || !bb) return false;
  if (aa === bb) return true;
  return aa.includes(bb) || bb.includes(aa);
}

export function normalizeGender(input: unknown): 'man' | 'vrouw' | null {
  const v = normText(input);
  if (['m', 'man', 'male', 'jongen', 'jongens'].includes(v)) return 'man';
  if (['v', 'vrouw', 'female', 'meisje', 'meisjes'].includes(v)) return 'vrouw';
  return null;
}
