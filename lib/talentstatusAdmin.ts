import { createClient } from "@supabase/supabase-js";

export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

export function cleanVa(value: unknown) {
  const v = String(value ?? "").trim();
  if (!v) return "";
  return v.replace(/^VA/i, "").replace(/\D/g, "").replace(/^0+/, "");
}

export function normLand(value: unknown) {
  const v = String(value ?? "NL").trim().toUpperCase();
  if (!v) return "NL";
  if (["NEDERLAND", "NETHERLANDS", "NL"].includes(v)) return "NL";
  if (["BELGIE", "BELGIË", "BELGIUM", "BE"].includes(v)) return "BE";
  if (["DUITSLAND", "GERMANY", "DE"].includes(v)) return "DE";
  if (["FRANKRIJK", "FRANCE", "FR"].includes(v)) return "FR";
  return v;
}

export function needsTalentstatus(land: unknown) {
  return normLand(land) === "NL";
}
