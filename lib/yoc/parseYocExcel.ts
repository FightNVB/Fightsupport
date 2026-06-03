import * as XLSX from 'xlsx';

export type ParsedYocFighter = {
  row_index: number;
  event_name: string | null;
  geslacht_mm: string | null;
  naam_mm: string | null;
  sportschool_mm: string | null;
  va_nummer_mm: string | null;
  gewicht_mm: number | null;
  naam_trainer: string | null;
  emailadres: string | null;
  telefoonnummer: string | null;
};

function clean(v: unknown): string | null {
  const s = String(v ?? '').trim();
  return s ? s : null;
}

function num(v: unknown): number | null {
  const n = Number(String(v ?? '').replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

function normalizeVa(v: unknown): string | null {
  const digits = String(v ?? '').replace(/\D/g, '');
  const normalized = digits.replace(/^0+/, '');
  return normalized ? normalized : null;
}

export function parseYocExcel(buffer: Buffer): ParsedYocFighter[] {
  const wb = XLSX.read(buffer, { type: 'buffer' });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: null });

  return rows
    .map((r, idx) => ({
      row_index: idx + 2,
      event_name: clean(r['Event Name']),
      geslacht_mm: clean(r['Geslacht']),
      naam_mm: clean(r['Naam vechter ']) ?? clean(r['Naam vechter']),
      sportschool_mm: clean(r['Sportschool']),
      va_nummer_mm: normalizeVa(r['VA nummer '] ?? r['VA nummer']),
      gewicht_mm: num(r['KG']),
      naam_trainer: clean(r['Naam Trainer']),
      emailadres: clean(r['Emailadres']),
      telefoonnummer: clean(r['Telefoonnummer']),
    }))
    .filter((r) => r.naam_mm || r.va_nummer_mm || r.sportschool_mm);
}
