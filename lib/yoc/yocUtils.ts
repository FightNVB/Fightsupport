// lib/yoc/yocUtils.ts
export type AnyRow = Record<string, any>;

export type SupabaseLike = {
  from: (table: string) => any;
};

export function s(v: any): string {
  return String(v ?? "").trim();
}

export function normLower(v: any): string {
  return s(v).toLowerCase();
}

export function normalizeVa(v: any): string | null {
  const digits = s(v).replace(/[^0-9]/g, "");
  return /^\d{3,6}$/.test(digits) ? digits : null;
}

export function missingColumnName(error: any): string | null {
  const msg = String(error?.message ?? error ?? "");
  const m = msg.match(/Could not find the ['\"]([^'\"]+)['\"] column/i);
  return m?.[1] ?? null;
}

export function pick(row: AnyRow | null | undefined, keys: string[]) {
  for (const key of keys) {
    const value = row?.[key];
    if (value !== undefined && value !== null && String(value).trim() !== "") return value;
  }
  return null;
}

export function fullName(row: AnyRow | null | undefined) {
  const direct = pick(row, ["naam", "naam_fp", "fighter_naam", "full_name", "naam_input"]);
  if (direct) return s(direct);
  return [pick(row, ["voornaam"]), pick(row, ["achternaam"])].filter(Boolean).join(" ").trim();
}

export function toNumberOrNull(v: any): number | null {
  if (v === null || v === undefined || String(v).trim() === "") return null;
  const n = Number(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

export function boolish(v: any): boolean | null {
  const value = s(v).toLowerCase();
  if (!value) return null;
  if (["true", "1", "ja", "yes", "y", "geldig", "ok", "actief"].includes(value)) return true;
  if (["false", "0", "nee", "no", "n", "ongeldig", "geen", "niet geldig", "verlopen"].includes(value)) return false;
  return null;
}

export function calcAge(geboortedatum: any, eventDate: any): number | null {
  const birth = s(geboortedatum);
  const event = s(eventDate);
  if (!birth || !event) return null;
  const b = new Date(birth);
  const e = new Date(event);
  if (Number.isNaN(b.getTime()) || Number.isNaN(e.getTime())) return null;
  let age = e.getFullYear() - b.getFullYear();
  const m = e.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && e.getDate() < b.getDate())) age--;
  return age >= 0 && age < 120 ? age : null;
}

export function normalizeKlasse(v: any): string | null {
  const x = s(v).toUpperCase();
  if (!x) return null;
  if (x.includes("JEUGD") || x === "J" || x.startsWith("J-") || x.startsWith("J+")) return x;
  if (x.includes("NIEUW") || x.includes("NEWCOM") || x === "N") return "N";
  if (x.includes("VETER") || x === "R" || x.includes("R-KLASSE")) return "R";
  if (x.includes("C")) return "C";
  if (x.includes("B")) return "B";
  if (x.includes("A")) return "A";
  if (x.includes("MMA") && x.includes("PRO")) return "MMA PRO";
  if (x.includes("MMA")) return "MMA AMATEUR";
  return x;
}

export async function safeInsert(supabase: SupabaseLike, table: string, rows: AnyRow[]) {
  if (!rows.length) return { data: [] as AnyRow[], error: null as any, usedRows: rows };
  let body = rows.map((row) => ({ ...row }));

  for (let attempt = 0; attempt < 40; attempt++) {
    const { data, error } = await supabase.from(table).insert(body).select("*");
    if (!error) return { data: data ?? [], error: null as any, usedRows: body };

    const col = missingColumnName(error);
    if (col && body.some((row) => Object.prototype.hasOwnProperty.call(row, col))) {
      body = body.map((row) => {
        const next = { ...row };
        delete next[col];
        return next;
      });
      continue;
    }

    return { data: null as any, error, usedRows: body };
  }

  return { data: null as any, error: new Error(`${table}: te veel schema-aanpassingen nodig`), usedRows: body };
}

export async function safeDeleteByIds(
  supabase: SupabaseLike,
  table: string,
  matchmakingId: string,
  idColumn: string,
  ids: any[]
) {
  const clean = Array.from(new Set(ids.map((x) => s(x)).filter(Boolean)));
  if (!clean.length) return null;

  const { error } = await supabase
    .from(table)
    .delete()
    .eq("matchmaking_id", matchmakingId)
    .in(idColumn, clean);

  return error ?? null;
}

export async function safeUpdateIn(
  supabase: SupabaseLike,
  table: string,
  patch: AnyRow,
  column: string,
  values: string[],
  extraEq: AnyRow = {}
) {
  if (!values.length) return null;
  let body = { ...patch };

  for (let attempt = 0; attempt < 30; attempt++) {
    let q = supabase.from(table).update(body).in(column, values);
    for (const [key, value] of Object.entries(extraEq)) q = q.eq(key, value);
    const { error } = await q;
    if (!error) return null;

    const col = missingColumnName(error);
    if (col && Object.prototype.hasOwnProperty.call(body, col)) {
      delete body[col];
      continue;
    }

    return error;
  }

  return new Error(`${table}: update past niet op schema`);
}
