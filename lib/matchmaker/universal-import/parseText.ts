export type UniversalImportDraft = {
  temp_id: string;
  source_name: string | null;
  source_va: string | null;
  source_birth_date: string | null;
  source_gender: string | null;
  source_discipline: string | null;
  source_class: string | null;
  trainer_weight: number | null;
  trainer_weight_text: string | null;
  trainer_school: string | null;
  source_email: string | null;
  source_phone: string | null;
  source_record: string | null;
  source_notes: string[];
  raw_block: string;
};

const clean = (v: unknown) => String(v ?? "").replace(/\u00a0/g, " ").trim();
const digits = (v: unknown) => clean(v).replace(/\D/g, "").replace(/^0+(?=\d)/, "");

function normalizeDate(value: string | null): string | null {
  if (!value) return null;
  const m = value.match(/\b(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})\b/);
  if (!m) return null;
  let year = Number(m[3]);
  if (year < 100) year += year >= 40 ? 1900 : 2000;
  return `${year}-${String(Number(m[2])).padStart(2, "0")}-${String(Number(m[1])).padStart(2, "0")}`;
}

function normalizeClass(value: string | null): string | null {
  const x = clean(value).toLowerCase();
  if (!x) return null;
  if (/\bjeugd\b|\byouth\b|\bj\s*(?:kl|klasse|class)?\b/.test(x)) return "J";
  for (const k of ["R", "N", "C", "B", "A"]) {
    if (new RegExp(`\\b${k.toLowerCase()}\\s*(?:kl|klasse|class)?\\b`, "i").test(x)) return k;
  }
  if (/\bamateur\b/.test(x)) return "Amateur";
  if (/\bpro\b/.test(x)) return "Pro";
  return null;
}

function normalizeGender(value: string | null): string | null {
  const x = clean(value).toLowerCase();
  if (/\b(d|dam|dame|vrouw|female|meisje)\b/.test(x)) return "Vrouw";
  if (/\b(h|heer|man|male|jongen)\b/.test(x)) return "Man";
  return null;
}

function weightFrom(block: string) {
  const candidates = [
    ...block.matchAll(/(?:gewicht\s*[:=]?\s*)?(-?\s*\d{2,3}(?:[,.]\d+)?\s*(?:kg|kilo)?(?:\s*\+)?)(?=\s|$)/gi),
  ];
  const rejected = new Set<string>();
  for (const m of candidates) {
    const raw = clean(m[1]);
    const before = block.slice(Math.max(0, (m.index ?? 0) - 18), m.index ?? 0).toLowerCase();
    if (/va\s*(?:nr|nummer)?\s*:?\s*$/.test(before) || /(?:19|20)\d{2}[-/.]$/.test(before)) {
      rejected.add(raw);
      continue;
    }
    const n = Number(raw.replace(/kg|kilo|\s|\+/gi, "").replace(",", "."));
    if (Number.isFinite(n) && Math.abs(n) >= 25 && Math.abs(n) <= 250) {
      return { value: Math.abs(n), text: raw };
    }
  }
  return { value: null, text: null };
}

function looksLikeName(line: string) {
  const x = clean(line);
  if (!x || x.length < 3 || x.length > 70) return false;
  if (/[@\d:]/.test(x)) return false;
  if (/^(naam|geboorte|geslacht|categorie|record|gewicht|jeugd|ervaren|nieuweling|talentstatus|salam|hi |hoi |gr\.?|verstuurd|dame|heren|heer|sportschool|gym)\b/i.test(x)) return false;
  const words = x.replace(/[()]/g, " ").split(/\s+/).filter(Boolean);
  return words.length >= 2 && words.every((w) => /^[A-Za-zÀ-ÿ'’-]+$/.test(w));
}


function trailingNameBeforeDate(value: string): string | null {
  let x = clean(value)
    .replace(/[,:;|]+$/g, "")
    .replace(/\s+/g, " ");
  if (!x) return null;

  // Verwijder een eventuele inleidende zin en pak het laatste naamachtige deel.
  const parts = x.split(/[.!?;:,]|\b(?:aanmelden|opgeven|volgende|vechters?|voor\s+sportmani|ruimte\s+voor)\b/i)
    .map(clean)
    .filter(Boolean);
  x = parts.at(-1) || x;

  const words = x.split(/\s+/).filter(Boolean);
  const picked: string[] = [];
  for (let i = words.length - 1; i >= 0 && picked.length < 6; i--) {
    const word = words[i].replace(/^[^A-Za-zÀ-ÿ'’-]+|[^A-Za-zÀ-ÿ'’-]+$/g, "");
    if (!word || !/^[A-Za-zÀ-ÿ'’-]+$/.test(word)) break;
    if (/^(hey|hoi|hi|renate|ik|wil|graag|voor|de|het|een|nog|wat|bij|komen|mag|die|dan|alsnog)$/i.test(word) && picked.length >= 2) break;
    picked.unshift(word);
  }
  const candidate = picked.join(" ").replace(/\s*-\s*/g, "-").trim();
  return looksLikeName(candidate) ? candidate : null;
}

function parseInlineDrafts(text: string, school: string | null): UniversalImportDraft[] {
  const drafts: UniversalImportDraft[] = [];
  const dates = [...text.matchAll(/\b\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4}\b/g)];
  let previousVaEnd = 0;

  for (let i = 0; i < dates.length; i++) {
    const dateMatch = dates[i];
    const dateStart = dateMatch.index ?? 0;
    const nextDateStart = dates[i + 1]?.index ?? text.length;
    const afterDate = text.slice(dateStart, nextDateStart);
    const vaMatch = afterDate.match(/\bva\s*(?:nr|nummer)?\s*[:=-]?\s*0*(\d{3,8})\b/i);
    if (!vaMatch || vaMatch.index == null) continue;

    const absoluteVaEnd = dateStart + vaMatch.index + vaMatch[0].length;
    const beforeDate = text.slice(Math.max(previousVaEnd, dateStart - 180), dateStart);
    const name = trailingNameBeforeDate(beforeDate);
    if (!name) continue;

    const block = `${name} ${text.slice(dateStart, absoluteVaEnd)}`.trim();
    const emailMatch = block.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
    const phoneMatch = block.match(/(?:\+31|0)\s*6(?:[\s-]*\d){8}\b/);
    const recordMatch = block.match(/\b(\d{1,3})\s*[-/]\s*(\d{1,3})\s*[-/]\s*(\d{1,3})(?:\s*\((\d+)\))?\b/);
    const weight = weightFrom(block);

    drafts.push({
      temp_id: `${Date.now()}-inline-${dateStart}-${i}`,
      source_name: name,
      source_va: digits(vaMatch[1]),
      source_birth_date: normalizeDate(dateMatch[0]),
      source_gender: normalizeGender(block),
      source_discipline: /mma/i.test(block) ? "MMA" : /thai/i.test(block) ? "THAIBOKSEN" : null,
      source_class: normalizeClass(block),
      trainer_weight: weight.value,
      trainer_weight_text: weight.text,
      trainer_school: school,
      source_email: emailMatch?.[0] ?? null,
      source_phone: phoneMatch?.[0] ?? null,
      source_record: recordMatch ? `${recordMatch[1]}-${recordMatch[2]}-${recordMatch[3]}${recordMatch[4] ? ` (${recordMatch[4]})` : ""}` : null,
      source_notes: [],
      raw_block: block,
    });
    previousVaEnd = absoluteVaEnd;
  }

  return drafts;
}

function inferSchool(text: string, senderName?: string | null) {
  const lines = text.split(/\r?\n/).map(clean).filter(Boolean);
  for (const line of lines.slice(0, 15)) {
    const m = line.match(/(?:namens?|namen)\s+(?:van\s+)?(.+?)(?:\s+wil\b|\s+meld\b|\s+geef\b|$)/i);
    if (m) return clean(m[1]);
    const g = line.match(/\b(gym|sportschool|dojo|team)\s+[A-Za-zÀ-ÿ0-9'’& -]{2,50}/i);
    if (g) return clean(g[0]);
  }
  return senderName ? clean(senderName) : null;
}

export function parseUniversalText(input: { text: string; sender_name?: string | null; source_type?: string | null }) {
  const text = String(input.text ?? "").replace(/\r/g, "");
  const lines = text.split("\n").map((line) => clean(line));
  const nameIndexes = lines.map((line, index) => looksLikeName(line) ? index : -1).filter((i) => i >= 0);
  const school = inferSchool(text, input.sender_name);
  const drafts: UniversalImportDraft[] = [];

  for (let p = 0; p < nameIndexes.length; p++) {
    const start = nameIndexes[p];
    const end = nameIndexes[p + 1] ?? lines.length;
    const blockLines = lines.slice(start, end).filter(Boolean);
    const block = blockLines.join("\n");
    const name = blockLines[0].replace(/^naam\s*[:=-]?\s*/i, "").trim();
    const vaMatch = block.match(/\bva\s*(?:nr|nummer)?\s*[:=-]?\s*0*(\d{3,8})\b/i);
    const dateMatch = block.match(/\b\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4}\b/);
    const emailMatch = block.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
    const phoneMatch = block.match(/(?:\+31|0)\s*6(?:[\s-]*\d){8}\b/);
    const recordMatch = block.match(/\b(\d{1,3})\s*[-/]\s*(\d{1,3})\s*[-/]\s*(\d{1,3})(?:\s*\((\d+)\))?\b/);
    const weight = weightFrom(block);
    const sourceClass = normalizeClass(block);
    const gender = normalizeGender(block);

    drafts.push({
      temp_id: `${Date.now()}-${start}-${p}`,
      source_name: name || null,
      source_va: vaMatch ? digits(vaMatch[1]) : null,
      source_birth_date: normalizeDate(dateMatch?.[0] ?? null),
      source_gender: gender,
      source_discipline: /mma/i.test(block) ? "MMA" : /thai/i.test(block) ? "THAIBOKSEN" : null,
      source_class: sourceClass,
      trainer_weight: weight.value,
      trainer_weight_text: weight.text,
      trainer_school: school,
      source_email: emailMatch?.[0] ?? null,
      source_phone: phoneMatch?.[0] ?? null,
      source_record: recordMatch ? `${recordMatch[1]}-${recordMatch[2]}-${recordMatch[3]}${recordMatch[4] ? ` (${recordMatch[4]})` : ""}` : null,
      source_notes: blockLines.filter((line) => /talentstatus|ervaren|nieuweling|verl\b|wijzig|opmerking/i.test(line)),
      raw_block: block,
    });
  }

  // WhatsApp-berichten staan vaak volledig op één regel. Vul daarom aan met
  // datum/VA-geankerde herkenning en voorkom dubbele VA-nummers.
  const inlineDrafts = parseInlineDrafts(text, school);
  const seen = new Set(drafts.map((draft) => draft.source_va).filter(Boolean));
  for (const draft of inlineDrafts) {
    if (draft.source_va && seen.has(draft.source_va)) continue;
    drafts.push(draft);
    if (draft.source_va) seen.add(draft.source_va);
  }

  return { trainer_school: school, drafts };
}
