module.exports = [
"[externals]/next/dist/compiled/next-server/app-route-turbo.runtime.dev.js [external] (next/dist/compiled/next-server/app-route-turbo.runtime.dev.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/next-server/app-route-turbo.runtime.dev.js", () => require("next/dist/compiled/next-server/app-route-turbo.runtime.dev.js"));

module.exports = mod;
}),
"[externals]/next/dist/compiled/@opentelemetry/api [external] (next/dist/compiled/@opentelemetry/api, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/@opentelemetry/api", () => require("next/dist/compiled/@opentelemetry/api"));

module.exports = mod;
}),
"[externals]/next/dist/compiled/next-server/app-page-turbo.runtime.dev.js [external] (next/dist/compiled/next-server/app-page-turbo.runtime.dev.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js", () => require("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/work-unit-async-storage.external.js [external] (next/dist/server/app-render/work-unit-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/work-unit-async-storage.external.js", () => require("next/dist/server/app-render/work-unit-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/work-async-storage.external.js [external] (next/dist/server/app-render/work-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/work-async-storage.external.js", () => require("next/dist/server/app-render/work-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/shared/lib/no-fallback-error.external.js [external] (next/dist/shared/lib/no-fallback-error.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/shared/lib/no-fallback-error.external.js", () => require("next/dist/shared/lib/no-fallback-error.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/after-task-async-storage.external.js [external] (next/dist/server/app-render/after-task-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/after-task-async-storage.external.js", () => require("next/dist/server/app-render/after-task-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/child_process [external] (child_process, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("child_process", () => require("child_process"));

module.exports = mod;
}),
"[externals]/path [external] (path, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("path", () => require("path"));

module.exports = mod;
}),
"[externals]/fs [external] (fs, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("fs", () => require("fs"));

module.exports = mod;
}),
"[project]/lib/supabaseAdmin.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "supabaseAdmin",
    ()=>supabaseAdmin
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$supabase$2f$supabase$2d$js$2f$dist$2f$index$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/@supabase/supabase-js/dist/index.mjs [app-route] (ecmascript) <locals>");
;
const supabaseUrl = ("TURBOPACK compile-time value", "https://krskuyaqvzloptfndznc.supabase.co");
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAdmin = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$supabase$2f$supabase$2d$js$2f$dist$2f$index$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$locals$3e$__["createClient"])(supabaseUrl, serviceRoleKey, {
    auth: {
        persistSession: false
    }
});
}),
"[project]/lib/recordCalculator.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

// lib/recordCalculator.ts
__turbopack_context__.s([
    "buildClassAwareRecord",
    ()=>buildClassAwareRecord,
    "buildRecordByBucket",
    ()=>buildRecordByBucket,
    "demoToDrawEquivalents",
    ()=>demoToDrawEquivalents,
    "drawsEffective",
    ()=>drawsEffective,
    "getEffectiveTotalForExperience",
    ()=>getEffectiveTotalForExperience,
    "normalizeToBucket",
    ()=>normalizeToBucket,
    "parseUitslag",
    ()=>parseUitslag,
    "totalsToFlat",
    ()=>totalsToFlat
]);
function emptyTotals() {
    return {
        wins: 0,
        losses: 0,
        draws: 0,
        demo: 0,
        ko_losses: 0,
        other: 0,
        total: 0
    };
}
function normalizeToBucket(input) {
    if (!input) return null;
    const s = String(input).trim().toLowerCase();
    // Boksen negeren voor KB/MMA record
    if (s.includes("boks") || s.includes("boxing")) return null;
    // MMA
    if (s.includes("mma")) return "MMA";
    // Alles staand naar KB (KB + MT telt samen als KB)
    if (s.includes("kick") || s.includes("thaib") || s.includes("muay") || s.includes("dutch")) {
        return "KB";
    }
    // onbekend telt niet mee in KB/MMA record
    return null;
}
function includesAny(s, parts) {
    return parts.some((p)=>s.includes(p));
}
function parseUitslag(uitslag) {
    const s = String(uitslag ?? "").trim().toLowerCase();
    if (!s) return {
        kind: "OTHER"
    };
    // demo (apart!)
    if (includesAny(s, [
        "demo",
        "demonstratie",
        "demonstration"
    ])) return {
        kind: "DEMO"
    };
    // win
    if (includesAny(s, [
        "wint",
        "win"
    ])) return {
        kind: "WIN"
    };
    // draw
    if (includesAny(s, [
        "gelijk",
        "draw",
        "onbeslist"
    ])) return {
        kind: "DRAW"
    };
    // loss
    if (includesAny(s, [
        "verliest",
        "lost",
        "verlies"
    ])) {
        const isKo = includesAny(s, [
            "ko",
            "tko",
            "k.o",
            "t.k.o",
            "knock"
        ]);
        return {
            kind: "LOSS",
            isKoLoss: isKo
        };
    }
    // NC/UNKNOWN/etc
    return {
        kind: "OTHER"
    };
}
/* ---------------- helpers voor klasse ---------------- */ function normClass(v) {
    const s = String(v ?? "").trim().toLowerCase();
    return s.length ? s : null;
}
function demoToDrawEquivalents(demoCount) {
    const n = Number.isFinite(Number(demoCount)) ? Number(demoCount) : 0;
    return Math.floor(Math.max(0, n) / 3);
}
function drawsEffective(t) {
    return (t.draws ?? 0) + demoToDrawEquivalents(t.demo ?? 0);
}
function buildRecordByBucket(uitslagenRows) {
    const totalsAll = emptyTotals();
    const totalsKB = emptyTotals();
    const totalsMMA = emptyTotals();
    for (const r of uitslagenRows ?? []){
        const bucket = normalizeToBucket(r?.discipline);
        if (!bucket) continue;
        const parsed = parseUitslag(r?.uitslag);
        const t = bucket === "KB" ? totalsKB : totalsMMA;
        t.total += 1;
        totalsAll.total += 1;
        if (parsed.kind === "WIN") {
            t.wins += 1;
            totalsAll.wins += 1;
        } else if (parsed.kind === "LOSS") {
            t.losses += 1;
            totalsAll.losses += 1;
            if (parsed.isKoLoss) {
                t.ko_losses += 1;
                totalsAll.ko_losses += 1;
            }
        } else if (parsed.kind === "DRAW") {
            t.draws += 1;
            totalsAll.draws += 1;
        } else if (parsed.kind === "DEMO") {
            t.demo += 1;
            totalsAll.demo += 1;
        } else {
            t.other += 1;
            totalsAll.other += 1;
        }
    }
    const out = {
        _all: totalsAll
    };
    if (totalsKB.total > 0) out.KB = totalsKB;
    if (totalsMMA.total > 0) out.MMA = totalsMMA;
    return out;
}
function buildClassAwareRecord(uitslagenRows, currentClass) {
    const curClass = normClass(currentClass);
    const currentRows = [];
    const historicRows = [];
    let otherDisciplineHistoric = 0;
    for (const r of uitslagenRows ?? []){
        const rowClass = normClass(r?.klasse);
        // bepaal of deze regel in "current" valt
        const isCurrent = !curClass ? true : rowClass === curClass;
        // discipline bucket?
        const bucket = normalizeToBucket(r?.discipline);
        if (!bucket) {
            // boksen/unknown => valt onder Overige discipline
            if (!isCurrent) otherDisciplineHistoric += 1;
            else {
            // als currentClass onbekend is, wil je het niet kwijtraken; maar het telt niet mee in record
            // we tellen dit niet in current record, want record = KB/MMA.
            }
            continue;
        }
        if (isCurrent) currentRows.push(r);
        else historicRows.push(r);
    }
    return {
        current: buildRecordByBucket(currentRows),
        historic: buildRecordByBucket(historicRows),
        historic_other_discipline_total: otherDisciplineHistoric
    };
}
function totalsToFlat(t) {
    const demo = t.demo ?? 0;
    const dEff = drawsEffective(t);
    return {
        record_w: t.wins,
        record_l: t.losses,
        // ✅ “record_d” wordt de effectieve draws incl demo/3
        record_d: dEff,
        // ✅ demo apart voor UI: toon record_d met (demo)
        demo_totaal: demo,
        // ✅ overige binnen KB/MMA (NC/UNKNOWN etc)
        record_o: t.other,
        // totaal entries in deze totals (incl demo/other)
        partijen_historie: t.total,
        ko_losses: t.ko_losses
    };
}
function getEffectiveTotalForExperience(total, demo) {
    const t = Number.isFinite(Number(total)) ? Number(total) : 0;
    const d = Number.isFinite(Number(demo)) ? Number(demo) : 0;
    return Math.max(0, t - d + Math.floor(d / 3));
}
}),
"[externals]/crypto [external] (crypto, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("crypto", () => require("crypto"));

module.exports = mod;
}),
"[project]/lib/control/buildControleBoutContext.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "buildControleBoutContext",
    ()=>buildControleBoutContext
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$dayjs$2f$dayjs$2e$min$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/dayjs/dayjs.min.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabaseAdmin$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/supabaseAdmin.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$recordCalculator$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/recordCalculator.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$externals$5d2f$crypto__$5b$external$5d$__$28$crypto$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/crypto [external] (crypto, cjs)");
;
;
;
;
function toIsoDateOnly(d) {
    if (!d) return null;
    const x = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$dayjs$2f$dayjs$2e$min$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["default"])(d);
    return x.isValid() ? x.format("YYYY-MM-DD") : null;
}
function calcAgeYears(geboorte, eventDate) {
    const g = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$dayjs$2f$dayjs$2e$min$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["default"])(geboorte);
    const e = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$dayjs$2f$dayjs$2e$min$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["default"])(eventDate);
    if (!g.isValid() || !e.isValid()) return null;
    const years = e.diff(g, "year");
    return Number.isFinite(years) ? years : null;
}
function normGender(v) {
    if (!v) return null;
    const s = String(v).trim().toLowerCase();
    if (s.startsWith("m")) return "man";
    if (s.startsWith("v")) return "vrouw";
    if (s.includes("male")) return "man";
    if (s.includes("female")) return "vrouw";
    return String(v);
}
function mapUitslagen(rows) {
    return rows.map((r)=>({
            datum: r.datum ?? null,
            discipline: r.discipline ?? null,
            klasse: r.klasse ?? null,
            uitslag: r.uitslag ?? null
        }));
}
function toNullableStr(v) {
    const s = String(v ?? "").trim();
    return s.length ? s : null;
}
function toNullableNumber(v) {
    if (v == null) return null;
    const raw = String(v).trim();
    if (!raw) return null;
    let s = raw.toLowerCase().replace(/kg/g, "").replace(/\s+/g, "");
    if (/^-\d+([.,]\d+)?$/.test(s)) {
        s = s.slice(1);
    }
    s = s.replace(",", ".");
    const n = Number(s);
    return Number.isFinite(n) ? n : null;
}
function toNullableBool(v) {
    if (v === true || v === false) return v;
    const s = String(v ?? "").trim().toLowerCase();
    if (!s) return null;
    if ([
        "true",
        "1",
        "ja",
        "yes",
        "y"
    ].includes(s)) return true;
    if ([
        "false",
        "0",
        "nee",
        "no",
        "n"
    ].includes(s)) return false;
    return null;
}
function toBoolJaNeeLoose(v) {
    if (v == null) return null;
    const s = String(v).trim().toLowerCase();
    if ([
        "ja",
        "yes",
        "true",
        "1"
    ].includes(s)) return true;
    if ([
        "nee",
        "no",
        "false",
        "0"
    ].includes(s)) return false;
    return null;
}
function toVaStrict(v) {
    if (v == null) return null;
    const s = String(v).trim();
    if (/^\d{3,6}$/.test(s)) return s;
    const digits = s.replace(/[^0-9]/g, "");
    if (/^\d{3,6}$/.test(digits)) return digits;
    return null;
}
function firstValidVa(...values) {
    for (const v of values){
        const parsed = toVaStrict(v);
        if (parsed) return parsed;
    }
    return null;
}
function resolveMaxGewicht(partij) {
    return toNullableNumber(partij?.max_gewicht ?? partij?.max_gewicht_mm ?? partij?.maxgewicht ?? partij?.max_kg ?? partij?.gewicht_max ?? partij?.afgesproken_gewicht ?? partij?.agreed_weight ?? null);
}
function resolveMaxGewichtNotatie(partij) {
    return toNullableStr(partij?.max_gewicht_notatie ?? partij?.max_gewicht_notatie_mm ?? partij?.gewicht_notatie ?? partij?.gewichtsklasse_notatie ?? null);
}
function resolveMaxGewichtType(partij) {
    const s = String(partij?.max_gewicht_type ?? partij?.extra?.max_gewicht_type ?? "").trim().toLowerCase();
    if (!s) return null;
    if (s === "exact" || s === "up_to" || s === "open_above") return s;
    return null;
}
async function fetchEvenementInfo(matchmaking_id) {
    const { data, error } = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabaseAdmin$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["supabaseAdmin"].from("matchmaking_uploads").select("evenement_naam, evenement_datum, event_id").eq("matchmaking_id", matchmaking_id).order("uploaded_at", {
        ascending: false
    }).limit(1);
    if (error) throw error;
    let evenement_naam = toNullableStr(data?.[0]?.evenement_naam ?? null);
    let evenement_datum = toIsoDateOnly(data?.[0]?.evenement_datum ?? null);
    const event_id = toNullableStr(data?.[0]?.event_id ?? null);
    if (event_id && (!evenement_naam || !evenement_datum)) {
        const { data: ev, error: evErr } = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabaseAdmin$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["supabaseAdmin"].from("events").select("naam, datum").eq("id", event_id).maybeSingle();
        if (evErr) throw evErr;
        if (!evenement_naam) evenement_naam = toNullableStr(ev?.naam ?? null);
        if (!evenement_datum) evenement_datum = toIsoDateOnly(ev?.datum ?? null);
    }
    return {
        evenement_naam,
        evenement_datum,
        event_id
    };
}
function parseMmaFromUitslagKlasse(v) {
    const s = String(v ?? "").trim().toUpperCase();
    if (!s) return null;
    if (s === "P" || s === "PRO") return "PRO";
    if (s === "AMA" || s === "AMATEUR") return "AMATEUR";
    return null;
}
function latestUitslagByDatum(uitslagen) {
    if (!Array.isArray(uitslagen) || uitslagen.length === 0) return null;
    const withDate = uitslagen.map((u)=>({
            u,
            d: toIsoDateOnly(u?.datum)
        })).filter((x)=>!!x.d);
    if (withDate.length > 0) {
        withDate.sort((a, b)=>a.d < b.d ? 1 : a.d > b.d ? -1 : 0);
        return withDate[0].u;
    }
    return uitslagen[uitslagen.length - 1] ?? null;
}
function resolveMmaCurrentKlasse(fighter, uitslagen) {
    const direct = fighter?.mma_current_klasse ?? fighter?.mma_klasse ?? fighter?.current_mma_class ?? fighter?.rood_mma_current_klasse ?? fighter?.blauw_mma_current_klasse;
    const directParsed = parseMmaFromUitslagKlasse(direct);
    if (directParsed) return directParsed;
    const last = latestUitslagByDatum(uitslagen);
    const parsed = parseMmaFromUitslagKlasse(last?.klasse);
    return parsed;
}
function getDemoTotaalFromRecord(rec) {
    const flat = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$recordCalculator$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["totalsToFlat"])(rec);
    const candidates = [
        flat?.demo,
        flat?._all_demo,
        rec?.current?._all?.demo,
        rec?._all?.demo
    ];
    for (const v of candidates){
        const n = Number(v);
        if (Number.isFinite(n)) return Math.max(0, n);
    }
    return 0;
}
function newestTimestampValue(row) {
    return String(row?.updated_at ?? row?.created_at ?? row?.scraped_at ?? row?.inserted_at ?? "");
}
function pickNewestByVa(rows) {
    const out = new Map();
    for (const row of rows ?? []){
        const va = String(row?.va_nummer ?? "").trim();
        if (!va) continue;
        const prev = out.get(va);
        if (!prev) {
            out.set(va, row);
            continue;
        }
        const prevTs = newestTimestampValue(prev);
        const rowTs = newestTimestampValue(row);
        if (rowTs > prevTs) {
            out.set(va, row);
        }
    }
    return out;
}
function groupByVa(rows) {
    const out = new Map();
    for (const row of rows ?? []){
        const va = String(row?.va_nummer ?? "").trim();
        if (!va) continue;
        if (!out.has(va)) out.set(va, []);
        out.get(va).push(row);
    }
    return out;
}
function normalizeLooseText(v) {
    return String(v ?? "").trim().toLowerCase().replace(/\s+/g, " ");
}
function dedupeUitslagenRows(rows) {
    const seen = new Set();
    const out = [];
    for (const row of rows ?? []){
        const key = [
            String(row?.va_nummer ?? "").trim(),
            toIsoDateOnly(row?.datum) ?? "",
            normalizeLooseText(row?.discipline),
            normalizeLooseText(row?.klasse),
            normalizeLooseText(row?.uitslag),
            normalizeLooseText(row?.evenement),
            normalizeLooseText(row?.tegenstander),
            toIsoDateOnly(row?.evenement_datum ?? row?.datum) ?? ""
        ].join("|");
        if (seen.has(key)) continue;
        seen.add(key);
        out.push(row);
    }
    return out;
}
function countDemoUitslagen(rows) {
    let total = 0;
    for (const row of rows ?? []){
        const u = normalizeLooseText(row?.uitslag);
        if (u.includes("demo") || u.includes("demonstr")) total += 1;
    }
    return total;
}
async function buildControleBoutContext(matchmaking_id, controle_run_id, opts) {
    if (!matchmaking_id) throw new Error("[buildControleBoutContext] matchmaking_id ontbreekt");
    if (!controle_run_id) throw new Error("[buildControleBoutContext] controle_run_id ontbreekt");
    const scopedPartijNr = opts?.partij_nr != null && Number.isFinite(Number(opts.partij_nr)) ? Number(opts.partij_nr) : null;
    console.log("[buildControleBoutContext] start", {
        matchmaking_id,
        controle_run_id,
        partij_nr: scopedPartijNr
    });
    let boutsQ = __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabaseAdmin$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["supabaseAdmin"].from("matchmaking_bouts_raw").select("*").eq("matchmaking_id", matchmaking_id).order("partij_nr", {
        ascending: true
    });
    if (scopedPartijNr != null) {
        boutsQ = boutsQ.eq("partij_nr", scopedPartijNr);
    }
    const { data: bouts, error: bErr } = await boutsQ;
    if (bErr) throw bErr;
    if (!bouts?.length) return;
    const evInfo = await fetchEvenementInfo(matchmaking_id);
    const evenement_datum = evInfo.evenement_datum;
    const evenement_naam = evInfo.evenement_naam;
    if (!evenement_datum) {
        console.warn("[buildControleBoutContext] evenement_datum is NULL", {
            matchmaking_id
        });
    }
    if (!evenement_naam) {
        console.warn("[buildControleBoutContext] evenement_naam is NULL", {
            matchmaking_id
        });
    }
    const vas = new Set();
    for (const p of bouts){
        const r = toVaStrict(p?.va_rood);
        const b = toVaStrict(p?.va_blauw);
        if (r) vas.add(r);
        if (b) vas.add(b);
    }
    const vaList = [
        ...vas
    ];
    const fighterByVa = new Map();
    if (vaList.length > 0) {
        const { data: fighters, error: fErr } = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabaseAdmin$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["supabaseAdmin"].from("fighters_raw").select("*").eq("matchmaking_id", matchmaking_id).eq("controle_run_id", controle_run_id).in("va_nummer", vaList);
        if (fErr) throw fErr;
        const newestFighters = pickNewestByVa(fighters ?? []);
        for (const [va, row] of newestFighters.entries()){
            fighterByVa.set(va, row);
        }
    }
    const uitslagenByVa = new Map();
    if (vaList.length > 0) {
        const { data: uitslagen, error: uErr } = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabaseAdmin$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["supabaseAdmin"].from("uitslagen_raw").select("*").eq("matchmaking_id", matchmaking_id).eq("controle_run_id", controle_run_id).in("va_nummer", vaList);
        if (uErr) throw uErr;
        const grouped = groupByVa(uitslagen ?? []);
        for (const [va, rows] of grouped.entries()){
            uitslagenByVa.set(va, dedupeUitslagenRows(rows));
        }
    }
    let delCtxQ = __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabaseAdmin$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["supabaseAdmin"].from("controle_bout_context").delete().eq("matchmaking_id", matchmaking_id).eq("controle_run_id", controle_run_id);
    if (scopedPartijNr != null) delCtxQ = delCtxQ.eq("partij_nr", scopedPartijNr);
    const { error: delCtxErr } = await delCtxQ;
    if (delCtxErr) throw delCtxErr;
    let delUitsQ = __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabaseAdmin$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["supabaseAdmin"].from("controle_uitslagen").delete().eq("matchmaking_id", matchmaking_id).eq("controle_run_id", controle_run_id);
    if (scopedPartijNr != null) delUitsQ = delUitsQ.eq("partij_nr", scopedPartijNr);
    const { error: delUitsErr } = await delUitsQ;
    if (delUitsErr) throw delUitsErr;
    const rowsToInsert = [];
    const uitslagenToInsert = [];
    for (const partij of bouts){
        const vaR = toVaStrict(partij?.va_rood ?? null);
        const vaB = toVaStrict(partij?.va_blauw ?? null);
        const vaRPrev = firstValidVa(partij?.rood_va_mm_prev, partij?.va_rood_prev, partij?.rood_va_prev, partij?.rood_va_was);
        const vaBPrev = firstValidVa(partij?.blauw_va_mm_prev, partij?.va_blauw_prev, partij?.blauw_va_prev, partij?.blauw_va_was);
        const uitslagenR = vaR ? uitslagenByVa.get(vaR) ?? [] : [];
        const uitslagenB = vaB ? uitslagenByVa.get(vaB) ?? [] : [];
        const partijNr = partij?.partij_nr ?? null;
        let bout_id = null;
        if (typeof partij?.bout_uid === "string" && partij.bout_uid.trim()) {
            bout_id = partij.bout_uid.trim();
        } else {
            const newUid = __TURBOPACK__imported__module__$5b$externals$5d2f$crypto__$5b$external$5d$__$28$crypto$2c$__cjs$29$__["default"].randomUUID();
            console.error("[buildControleBoutContext] FATAAL: bout_uid ontbreekt -> nieuwe bout_uid", {
                matchmaking_id,
                controle_run_id,
                partij_nr: partijNr,
                upload_id: partij?.upload_id ?? null,
                rood_naam: partij?.rood_naam ?? null,
                blauw_naam: partij?.blauw_naam ?? null,
                bout_uid_type: typeof partij?.bout_uid,
                bout_uid_preview: String(partij?.bout_uid ?? "").slice(0, 120),
                new_uid: newUid
            });
            if (partijNr != null) {
                try {
                    await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabaseAdmin$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["supabaseAdmin"].from("matchmaking_bouts_raw").update({
                        bout_uid: newUid
                    }).eq("matchmaking_id", matchmaking_id).eq("partij_nr", partijNr).is("bout_uid", null);
                } catch (e) {
                    console.warn("[buildControleBoutContext] herstel bout_uid mislukt (non-fatal)", e);
                }
            }
            partij.bout_uid = newUid;
            bout_id = newUid;
        }
        if (partijNr != null) {
            if (vaR) {
                for (const u of uitslagenR){
                    uitslagenToInsert.push({
                        matchmaking_id,
                        controle_run_id,
                        partij_nr: partijNr,
                        bout_id,
                        hoek: "rood",
                        va_nummer: vaR,
                        datum: u?.datum ? toIsoDateOnly(u.datum) : null,
                        discipline: u?.discipline ?? null,
                        klasse: u?.klasse ?? null,
                        uitslag: u?.uitslag ?? null,
                        evenement: u?.evenement ?? null,
                        tegenstander: u?.tegenstander ?? null,
                        evenement_datum: toIsoDateOnly(u?.evenement_datum ?? u?.datum)
                    });
                }
            }
            if (vaB) {
                for (const u of uitslagenB){
                    uitslagenToInsert.push({
                        matchmaking_id,
                        controle_run_id,
                        partij_nr: partijNr,
                        bout_id,
                        hoek: "blauw",
                        va_nummer: vaB,
                        datum: u?.datum ? toIsoDateOnly(u.datum) : null,
                        discipline: u?.discipline ?? null,
                        klasse: u?.klasse ?? null,
                        uitslag: u?.uitslag ?? null,
                        evenement: u?.evenement ?? null,
                        tegenstander: u?.tegenstander ?? null,
                        evenement_datum: toIsoDateOnly(u?.evenement_datum ?? u?.datum)
                    });
                }
            }
        }
        const fr = vaR ? fighterByVa.get(vaR) : null;
        const fb = vaB ? fighterByVa.get(vaB) : null;
        const currentClass = partij?.klasse ?? partij?.klasse_mm ?? null;
        const recRClass = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$recordCalculator$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["buildClassAwareRecord"])(uitslagenR, currentClass);
        const recBClass = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$recordCalculator$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["buildClassAwareRecord"])(uitslagenB, currentClass);
        const rood_leeftijd_event = fr?.geboortedatum && evenement_datum ? calcAgeYears(fr.geboortedatum, evenement_datum) : null;
        const blauw_leeftijd_event = fb?.geboortedatum && evenement_datum ? calcAgeYears(fb.geboortedatum, evenement_datum) : null;
        const rood_mma_current_klasse = resolveMmaCurrentKlasse(fr, uitslagenR);
        const blauw_mma_current_klasse = resolveMmaCurrentKlasse(fb, uitslagenB);
        const max_gewicht = resolveMaxGewicht(partij);
        const max_gewicht_notatie = resolveMaxGewichtNotatie(partij);
        const max_gewicht_type = resolveMaxGewichtType(partij);
        const rood_demo_totaal = Math.max(getDemoTotaalFromRecord(recRClass), countDemoUitslagen(uitslagenR));
        const blauw_demo_totaal = Math.max(getDemoTotaalFromRecord(recBClass), countDemoUitslagen(uitslagenB));
        rowsToInsert.push({
            controle_run_id,
            upload_id: partij?.upload_id ?? null,
            partij_nr: partij?.partij_nr ?? null,
            matchmaking_id: partij?.matchmaking_id ?? matchmaking_id,
            bout_id,
            discipline: partij?.discipline ?? null,
            klasse_mm: partij?.klasse ?? null,
            is_toernooi: toNullableBool(partij?.is_toernooi ?? partij?.toernooi),
            max_gewicht,
            max_gewicht_notatie,
            max_gewicht_type,
            rood_naam_mm: toNullableStr(partij?.rood_naam),
            rood_gym_mm: toNullableStr(partij?.rood_gym),
            rood_gewicht_mm: toNullableNumber(partij?.rood_gewicht),
            rood_va_mm: vaR,
            rood_va_mm_prev: vaRPrev,
            blauw_naam_mm: toNullableStr(partij?.blauw_naam),
            blauw_gym_mm: toNullableStr(partij?.blauw_gym),
            blauw_gewicht_mm: toNullableNumber(partij?.blauw_gewicht),
            blauw_va_mm: vaB,
            blauw_va_mm_prev: vaBPrev,
            evenement_naam: evenement_naam ?? null,
            evenement_datum: evenement_datum ?? null,
            rood_naam_fp: fr?.naam ?? null,
            rood_geboortedatum_fp: fr?.geboortedatum ? toIsoDateOnly(fr.geboortedatum) : null,
            rood_geslacht: normGender(fr?.geslacht),
            rood_leeftijd_event,
            blauw_naam_fp: fb?.naam ?? null,
            blauw_geboortedatum_fp: fb?.geboortedatum ? toIsoDateOnly(fb.geboortedatum) : null,
            blauw_geslacht: normGender(fb?.geslacht),
            blauw_leeftijd_event,
            rood_mma_current_klasse,
            blauw_mma_current_klasse,
            rood_totaal_wedstrijden_scrape: fr?.totaal_wedstrijden ?? fr?.totaal ?? fr?.totaal_wedstrijden_scrape ?? null,
            rood_gewonnen_scrape: fr?.gewonnen ?? fr?.wins ?? fr?.gewonnen_scrape ?? null,
            blauw_totaal_wedstrijden_scrape: fb?.totaal_wedstrijden ?? fb?.totaal ?? fb?.totaal_wedstrijden_scrape ?? null,
            blauw_gewonnen_scrape: fb?.gewonnen ?? fb?.wins ?? fb?.gewonnen_scrape ?? null,
            rood_licentie: fr?.licentie ?? null,
            rood_heeft_startverbod: fr?.heeft_startverbod ?? fr?.startverbod_actief ?? toBoolJaNeeLoose(fr?.heeft_startverbod) ?? null,
            blauw_licentie: fb?.licentie ?? null,
            blauw_heeft_startverbod: fb?.heeft_startverbod ?? fb?.startverbod_actief ?? toBoolJaNeeLoose(fb?.heeft_startverbod) ?? null,
            rood_nulmeting_totaal: fr?.nulmeting_totaal ?? null,
            rood_nulmeting_opmerking: fr?.nulmeting_opmerking ?? null,
            rood_nulmeting_klasse: fr?.nulmeting_klasse ?? null,
            blauw_nulmeting_totaal: fb?.nulmeting_totaal ?? null,
            blauw_nulmeting_opmerking: fb?.nulmeting_opmerking ?? null,
            blauw_nulmeting_klasse: fb?.nulmeting_klasse ?? null,
            rood_uitslagen_per_discipline: recRClass,
            blauw_uitslagen_per_discipline: recBClass,
            rood_demo_totaal,
            blauw_demo_totaal,
            rood_demo: rood_demo_totaal,
            blauw_demo: blauw_demo_totaal
        });
    }
    if (uitslagenToInsert.length > 0) {
        const chunkSize = 500;
        for(let i = 0; i < uitslagenToInsert.length; i += chunkSize){
            const chunk = uitslagenToInsert.slice(i, i + chunkSize);
            const { error: uInsErr } = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabaseAdmin$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["supabaseAdmin"].from("controle_uitslagen").upsert(chunk, {
                onConflict: "controle_run_id,partij_nr,hoek,va_nummer,datum,discipline,klasse,uitslag,evenement,tegenstander,evenement_datum",
                ignoreDuplicates: true
            });
            if (uInsErr) throw uInsErr;
        }
    }
    if (rowsToInsert.length > 0) {
        const { error: insErr } = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabaseAdmin$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["supabaseAdmin"].from("controle_bout_context").upsert(rowsToInsert, {
            onConflict: "controle_run_id,partij_nr"
        });
        if (insErr) throw insErr;
    }
    console.log("[buildControleBoutContext] klaar", {
        matchmaking_id,
        controle_run_id,
        partij_nr: scopedPartijNr,
        rows: rowsToInsert.length,
        uitslagen: uitslagenToInsert.length
    });
}
}),
"[project]/lib/control/enrichControleBoutContext.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "enrichControleBoutContext",
    ()=>enrichControleBoutContext
]);
// lib/control/enrichControleBoutContext.ts
// ✅ Verrijkt controle_bout_context met KEURMERK
// ❌ Doet GEEN inserts / GEEN upserts
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$dayjs$2f$dayjs$2e$min$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/dayjs/dayjs.min.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabaseAdmin$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/supabaseAdmin.ts [app-route] (ecmascript)");
;
;
function norm(s) {
    let x = String(s ?? "").toLowerCase().replace(/\u00a0/g, " ").replace(/\(.*?\)/g, " ").replace(/['’`]/g, " ").replace(/[^a-z0-9à-ÿ\s]/gi, " ").replace(/\s+/g, " ").trim();
    const stop = new Set([
        "kvs",
        "kv",
        "k",
        "team",
        "gym",
        "sport",
        "sports",
        "sportschool",
        "academy",
        "club",
        "center",
        "centre",
        "training",
        "trainings",
        "fight",
        "fighting",
        "fighters",
        "kickboxing",
        "kickbox",
        "kb",
        "muaythai",
        "muay",
        "thai",
        "boxing",
        "box",
        "mma",
        "martial",
        "arts",
        "the",
        "de",
        "het",
        "van",
        "der",
        "den",
        "en",
        "a",
        "an",
        "of"
    ]);
    let toks = x.split(" ").filter(Boolean).filter((t)=>!stop.has(t)).filter((t)=>t !== "s");
    toks = toks.map((t)=>{
        if (t.length >= 6 && t.endsWith("s")) return t.slice(0, -1);
        return t;
    });
    return toks.join(" ").trim();
}
function normStrictName(s) {
    return String(s ?? "").toLowerCase().replace(/\u00a0/g, " ").replace(/['’`]/g, "'").replace(/[()]/g, " ").replace(/[\/|,-]+/g, " ").replace(/\s+/g, " ").trim();
}
function compactStrictName(s) {
    return normStrictName(s).replace(/\s+/g, "");
}
function normPlaats(s) {
    return String(s ?? "").toLowerCase().replace(/\u00a0/g, " ").replace(/\(.*?\)/g, " ").replace(/[^a-z0-9à-ÿ\s]/gi, " ").replace(/\s+/g, " ").trim();
}
function compactNorm(s) {
    return String(s ?? "").replace(/\s+/g, "").trim();
}
function normLand(v) {
    return String(v ?? "").trim().toLowerCase().replace(/\./g, "").replace(/\s+/g, " ");
}
function isNL(v) {
    const s = normLand(v);
    return s === "nl" || s === "nederland" || s === "the netherlands" || s === "netherlands";
}
function isBE(v) {
    const s = normLand(v);
    return s === "be" || s === "belgie" || s === "belgië" || s === "belgium";
}
function isDE(v) {
    const s = normLand(v);
    return s === "de" || s === "duitsland" || s === "germany" || s === "deutschland";
}
function isFR(v) {
    const s = normLand(v);
    return s === "fr" || s === "frankrijk" || s === "france";
}
function isES(v) {
    const s = normLand(v);
    return s === "es" || s === "spanje" || s === "spain" || s === "españa" || s === "espana";
}
function normalizeCountryCodeOrName(raw) {
    const s = String(raw ?? "").trim().toLowerCase();
    if (!s) return null;
    if ([
        "nl",
        "nederland",
        "netherlands",
        "the netherlands"
    ].includes(s)) return "NL";
    if ([
        "be",
        "belgie",
        "belgië",
        "belgium"
    ].includes(s)) return "BE";
    if ([
        "de",
        "duitsland",
        "deutschland",
        "germany"
    ].includes(s)) return "DE";
    if ([
        "fr",
        "frankrijk",
        "france"
    ].includes(s)) return "FR";
    if ([
        "es",
        "spanje",
        "spain",
        "españa",
        "espana"
    ].includes(s)) return "ES";
    return null;
}
function detectLandHintFromGymText(rawGym) {
    const raw = String(rawGym ?? "").trim();
    if (!raw) return null;
    const s = raw.replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
    const lower = s.toLowerCase();
    const parenMatches = [
        ...s.matchAll(/\(([^)]+)\)/g)
    ];
    for (const m of parenMatches){
        const inside = String(m[1] ?? "").trim();
        const hint = normalizeCountryCodeOrName(inside);
        if (hint) return hint;
    }
    const upperTokens = s.match(/\b[A-Z]{2}\b/g) ?? [];
    for (const tok of upperTokens){
        const hint = normalizeCountryCodeOrName(tok);
        if (hint) return hint;
    }
    if (lower.includes("belgie") || lower.includes("belgië") || lower.includes("belgium")) return "BE";
    if (lower.includes("duitsland") || lower.includes("deutschland") || lower.includes("germany")) return "DE";
    if (lower.includes("nederland") || lower.includes("the netherlands") || lower.includes("netherlands")) return "NL";
    if (lower.includes("frankrijk") || lower.includes("france")) return "FR";
    if (lower.includes("spanje") || lower.includes("spain") || lower.includes("españa") || lower.includes("espana")) {
        return "ES";
    }
    return null;
}
function landHintToLabel(hint) {
    if (hint === "NL") return "Nederland";
    if (hint === "BE") return "België";
    if (hint === "DE") return "Duitsland";
    if (hint === "FR") return "Frankrijk";
    if (hint === "ES") return "Spanje";
    return null;
}
function landMatchesHint(landValue, hint) {
    if (!hint) return false;
    if (hint === "NL") return isNL(landValue);
    if (hint === "BE") return isBE(landValue);
    if (hint === "DE") return isDE(landValue);
    if (hint === "FR") return isFR(landValue);
    if (hint === "ES") return isES(landValue);
    return false;
}
function toIsoDateOnly(d) {
    if (!d) return null;
    const x = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$dayjs$2f$dayjs$2e$min$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["default"])(d);
    return x.isValid() ? x.format("YYYY-MM-DD") : null;
}
async function fetchAllSportscholen() {
    const all = [];
    const pageSize = 1000;
    let from = 0;
    while(true){
        const to = from + pageSize - 1;
        const { data, error } = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabaseAdmin$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["supabaseAdmin"].from("sportscholen").select("*").range(from, to);
        if (error) throw error;
        const chunk = data ?? [];
        all.push(...chunk);
        if (chunk.length < pageSize) break;
        from += pageSize;
    }
    return all;
}
async function fetchAllSportschoolAliases() {
    const all = [];
    const pageSize = 1000;
    let from = 0;
    while(true){
        const to = from + pageSize - 1;
        const { data, error } = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabaseAdmin$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["supabaseAdmin"].from("sportschool_aliases").select("alias_text, sportschool_id").range(from, to);
        if (error) throw error;
        const chunk = data ?? [];
        all.push(...chunk);
        if (chunk.length < pageSize) break;
        from += pageSize;
    }
    return all;
}
function levenshtein(a, b) {
    if (a === b) return 0;
    const m = a.length;
    const n = b.length;
    if (m === 0) return n;
    if (n === 0) return m;
    const dp = Array.from({
        length: m + 1
    }, ()=>new Array(n + 1).fill(0));
    for(let i = 0; i <= m; i++)dp[i][0] = i;
    for(let j = 0; j <= n; j++)dp[0][j] = j;
    for(let i = 1; i <= m; i++){
        for(let j = 1; j <= n; j++){
            const cost = a[i - 1] === b[j - 1] ? 0 : 1;
            dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
        }
    }
    return dp[m][n];
}
function tokenSet(s) {
    return new Set(String(s ?? "").split(" ").filter(Boolean));
}
function intersectionCount(a, b) {
    const A = tokenSet(a);
    const B = tokenSet(b);
    let c = 0;
    for (const t of A)if (B.has(t)) c++;
    return c;
}
function overlapScore(a, b) {
    const A = tokenSet(a);
    const B = tokenSet(b);
    const inter = intersectionCount(a, b);
    const denom = Math.max(1, Math.min(A.size, B.size));
    return inter / denom;
}
function isTokenSubset(a, b) {
    const A = tokenSet(a);
    const B = tokenSet(b);
    if (A.size === 0) return false;
    for (const t of A)if (!B.has(t)) return false;
    return true;
}
function findSportschoolBySportschoolId(list, sid) {
    const s = String(sid ?? "").trim();
    if (!s) return null;
    return list.find((x)=>String(x?.sportschool_id) === s) ?? null;
}
function hasPlaatsHint(gRaw, plaatsValue) {
    const input = normPlaats(gRaw);
    const p = normPlaats(plaatsValue);
    return !!p && !!input && input.includes(p);
}
function extractKnownPlaces(sportscholen) {
    const set = new Set();
    for (const s of sportscholen ?? []){
        const p1 = normPlaats(s?.plaats ?? "");
        const p2 = normPlaats(s?.stad ?? "");
        if (p1) set.add(p1);
        if (p2) set.add(p2);
    }
    return Array.from(set).sort((a, b)=>b.length - a.length);
}
function escapeRegex(s) {
    return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function stripCountryHintsFromRaw(raw) {
    let s = String(raw ?? "").trim();
    if (!s) return s;
    s = s.replace(/\((NL|BE|DE|FR|ES)\)/gi, " ");
    s = s.replace(/\((Nederland|België|Belgie|Duitsland|Deutschland|Germany|Frankrijk|France|Spanje|Spain|Espana|España)\)/gi, " ");
    s = s.replace(/\b(NL|BE|DE|FR|ES)\b/g, " ");
    s = s.replace(/\b(Nederland|België|Belgie|Duitsland|Deutschland|Germany|Frankrijk|France|Spanje|Spain|Espana|España)\b/gi, " ");
    s = s.replace(/\s+/g, " ").trim();
    return s;
}
function stripKnownPlaceSuffixes(raw, knownPlaces) {
    let s = String(raw ?? "").trim();
    if (!s) return s;
    let changed = true;
    while(changed){
        changed = false;
        for (const place of knownPlaces){
            if (!place) continue;
            const patterns = [
                new RegExp(`\\b${escapeRegex(place)}\\b$`, "i"),
                new RegExp(`[\\-/,]\\s*${escapeRegex(place)}$`, "i")
            ];
            for (const rx of patterns){
                if (rx.test(s)) {
                    s = s.replace(rx, " ").replace(/\s+/g, " ").trim();
                    changed = true;
                }
            }
        }
    }
    return s.trim();
}
function buildAliasLookupVariants(rawGym, knownPlaces) {
    const raw = String(rawGym ?? "").trim();
    const out = new Set();
    const addVariant = (v)=>{
        const n = norm(v);
        if (n) out.add(n);
        const c = compactNorm(n);
        if (c) out.add(`__compact__:${c}`);
    };
    if (!raw) return out;
    const noCountry = stripCountryHintsFromRaw(raw);
    const noPlace = stripKnownPlaceSuffixes(noCountry, knownPlaces);
    addVariant(raw);
    addVariant(noCountry);
    addVariant(noPlace);
    const slashParts = noPlace.split(/[\/|,-]/g).map((x)=>x.trim()).filter(Boolean);
    for (const part of slashParts)addVariant(part);
    const words = noPlace.split(/\s+/).filter(Boolean);
    for(let i = words.length; i >= 2; i--){
        addVariant(words.slice(0, i).join(" "));
    }
    return out;
}
function tryAliasMatch(sportscholen, gymNaam, aliasMaps, knownPlaces) {
    if (!aliasMaps) return null;
    const variants = buildAliasLookupVariants(gymNaam, knownPlaces);
    for (const key of variants){
        if (key.startsWith("__compact__:")) {
            const c = key.replace("__compact__:", "");
            const sid = aliasMaps.aliasCompactToId.get(c);
            if (sid) {
                const hit = findSportschoolBySportschoolId(sportscholen, sid);
                if (hit) return {
                    row: hit,
                    reason: null
                };
            }
        } else {
            const sid = aliasMaps.aliasNormToId.get(key);
            if (sid) {
                const hit = findSportschoolBySportschoolId(sportscholen, sid);
                if (hit) return {
                    row: hit,
                    reason: null
                };
            }
        }
    }
    return null;
}
function scoreCandidate(x, g, gRaw, key, landHint) {
    const nameN = norm(x?.naam);
    if (!nameN) return -1;
    const ov = overlapScore(g, nameN);
    const d = levenshtein(compactNorm(g), compactNorm(nameN));
    const len = Math.max(1, Math.max(compactNorm(g).length, compactNorm(nameN).length));
    const distScore = 1 - Math.min(1, d / len);
    let score = ov * 0.72 + distScore * 0.28;
    const plaats = x?.plaats ?? x?.stad ?? "";
    if (hasPlaatsHint(gRaw, plaats)) score += 0.22;
    const land = x?.land ?? x?.country ?? null;
    if (landMatchesHint(land, landHint)) score += 0.18;
    if (key && nameN.includes(key)) score += 0.06;
    return score;
}
function chooseBestFromCandidates(candidates, g, gRaw, key, landHint) {
    if (candidates.length === 0) return {
        row: null,
        reason: "Geen match gevonden."
    };
    if (candidates.length === 1) return {
        row: candidates[0],
        reason: null
    };
    const withPlaats = candidates.filter((x)=>hasPlaatsHint(gRaw, x?.plaats ?? x?.stad ?? ""));
    if (withPlaats.length === 1) return {
        row: withPlaats[0],
        reason: null
    };
    const withLand = candidates.filter((x)=>landMatchesHint(x?.land ?? x?.country, landHint));
    if (withLand.length === 1) return {
        row: withLand[0],
        reason: null
    };
    if (withPlaats.length > 1) {
        const withPlaatsAndLand = withPlaats.filter((x)=>landMatchesHint(x?.land ?? x?.country, landHint));
        if (withPlaatsAndLand.length === 1) return {
            row: withPlaatsAndLand[0],
            reason: null
        };
    }
    let best = null;
    let bestScore = -1;
    let secondScore = -1;
    for (const x of candidates){
        const score = scoreCandidate(x, g, gRaw, key, landHint);
        if (score > bestScore) {
            secondScore = bestScore;
            bestScore = score;
            best = x;
        } else if (score > secondScore) {
            secondScore = score;
        }
    }
    if (best && bestScore >= 0.72 && bestScore - secondScore >= 0.04) {
        return {
            row: best,
            reason: null
        };
    }
    return {
        row: null,
        reason: "Meerdere matches (ambigue) — maak alias aan."
    };
}
function findGymMatch(sportscholen, gymNaam, aliasMaps) {
    const gRaw = String(gymNaam ?? "").trim();
    if (!gRaw) return {
        row: null,
        reason: "Lege/ongeldige sportschoolnaam."
    };
    const list = sportscholen ?? [];
    const landHint = detectLandHintFromGymText(gRaw);
    const knownPlaces = extractKnownPlaces(list);
    // 1) ECHTE letterlijke/raw-strict match eerst
    const rawStrict = normStrictName(gRaw);
    const rawCompactStrict = compactStrictName(gRaw);
    const rawExactHits = list.filter((x)=>normStrictName(x?.naam) === rawStrict);
    if (rawExactHits.length > 0) {
        const gLoose = norm(gRaw);
        const key = gLoose.split(" ").filter(Boolean).sort((a, b)=>b.length - a.length)[0] ?? "";
        return chooseBestFromCandidates(rawExactHits, gLoose || rawStrict, gRaw, key, landHint);
    }
    const rawCompactHits = list.filter((x)=>compactStrictName(x?.naam) === rawCompactStrict);
    if (rawCompactHits.length > 0) {
        const gLoose = norm(gRaw);
        const key = gLoose.split(" ").filter(Boolean).sort((a, b)=>b.length - a.length)[0] ?? "";
        return chooseBestFromCandidates(rawCompactHits, gLoose || rawStrict, gRaw, key, landHint);
    }
    // 2) Alias lookup op hele string en basisvarianten
    const aliasHit = tryAliasMatch(list, gRaw, aliasMaps, knownPlaces);
    if (aliasHit?.row) return aliasHit;
    // 3) Loose normalisatie pas daarna
    const g = norm(gRaw);
    if (!g) return {
        row: null,
        reason: "Lege/ongeldige sportschoolnaam."
    };
    const inputPlaatsHint = normPlaats(gRaw);
    const toks = g.split(" ").filter(Boolean).sort((a, b)=>b.length - a.length);
    const key = toks[0] ?? "";
    // 4) Loose exact
    const exactHits = list.filter((x)=>norm(x?.naam) === g);
    if (exactHits.length > 0) return chooseBestFromCandidates(exactHits, g, gRaw, key, landHint);
    const gCompact = compactNorm(g);
    const exactCompactHits = list.filter((x)=>compactNorm(norm(x?.naam)) === gCompact);
    if (exactCompactHits.length > 0) return chooseBestFromCandidates(exactCompactHits, g, gRaw, key, landHint);
    // 5) Basisnaam zonder plaats/land suffixes
    const strippedRaw = stripKnownPlaceSuffixes(stripCountryHintsFromRaw(gRaw), knownPlaces);
    const strippedStrict = normStrictName(strippedRaw);
    const strippedCompactStrict = compactStrictName(strippedRaw);
    const strippedNorm = norm(strippedRaw);
    const strippedCompact = compactNorm(strippedNorm);
    if (strippedStrict && strippedStrict !== rawStrict) {
        const strictBaseHits = list.filter((x)=>normStrictName(x?.naam) === strippedStrict);
        if (strictBaseHits.length > 0) {
            return chooseBestFromCandidates(strictBaseHits, strippedNorm || strippedStrict, gRaw, key, landHint);
        }
        const strictBaseCompactHits = list.filter((x)=>compactStrictName(x?.naam) === strippedCompactStrict);
        if (strictBaseCompactHits.length > 0) {
            return chooseBestFromCandidates(strictBaseCompactHits, strippedNorm || strippedStrict, gRaw, key, landHint);
        }
    }
    if (strippedNorm && strippedNorm !== g) {
        const exactBaseHits = list.filter((x)=>norm(x?.naam) === strippedNorm);
        if (exactBaseHits.length > 0) {
            return chooseBestFromCandidates(exactBaseHits, strippedNorm, gRaw, key, landHint);
        }
        const compactBaseHits = list.filter((x)=>compactNorm(norm(x?.naam)) === strippedCompact);
        if (compactBaseHits.length > 0) {
            return chooseBestFromCandidates(compactBaseHits, strippedNorm, gRaw, key, landHint);
        }
    }
    // 6) Subset
    const subsetHits = list.filter((x)=>{
        const n = norm(x?.naam);
        if (!n) return false;
        const ok = isTokenSubset(n, g) || isTokenSubset(g, n) || (strippedNorm ? isTokenSubset(n, strippedNorm) || isTokenSubset(strippedNorm, n) : false);
        if (!ok) return false;
        const gTokCount = tokenSet(g).size;
        const sTokCount = strippedNorm ? tokenSet(strippedNorm).size : 0;
        const tokCount = Math.max(gTokCount, sTokCount);
        if (tokCount >= 2) {
            const inter = Math.max(intersectionCount(g, n), strippedNorm ? intersectionCount(strippedNorm, n) : 0);
            if (inter < 2) return false;
        }
        if (tokenSet(g).size === 1 && !inputPlaatsHint) return false;
        return true;
    });
    if (subsetHits.length > 0) {
        const chosen = chooseBestFromCandidates(subsetHits, strippedNorm || g, gRaw, key, landHint);
        if (chosen.row) return chosen;
    }
    // 7) Fuzzy fallback
    let best = null;
    let bestScore = -1;
    let bestSecond = null;
    let bestSecondScore = -1;
    const scoreBase = strippedNorm || g;
    for (const x of list){
        const score = scoreCandidate(x, scoreBase, gRaw, key, landHint);
        if (score < 0) continue;
        if (score > bestScore) {
            bestSecond = best;
            bestSecondScore = bestScore;
            best = x;
            bestScore = score;
        } else if (score > bestSecondScore) {
            bestSecond = x;
            bestSecondScore = score;
        }
    }
    if (best && bestScore >= 0.7) {
        if (bestSecond && bestSecondScore >= bestScore - 0.03) {
            return {
                row: null,
                reason: "Meerdere matches (ambigue) — maak alias aan."
            };
        }
        return {
            row: best,
            reason: null
        };
    }
    return {
        row: null,
        reason: "Geen match gevonden."
    };
}
function unwrapUuid(v) {
    if (v == null) return null;
    if (typeof v === "string") {
        const s = v.trim();
        if (!s || s === "[object Object]") return null;
        return s;
    }
    if (typeof v === "object") {
        const cand = typeof v.id === "string" && v.id || typeof v.bout_id === "string" && v.bout_id || typeof v.bout_uid === "string" && v.bout_uid || null;
        return cand ? String(cand).trim() : null;
    }
    return null;
}
function isForeignNonNL(landValue) {
    if (!landValue) return false;
    return !isNL(landValue);
}
async function enrichControleBoutContext(matchmaking_id, controle_run_id, opts) {
    if (!matchmaking_id) throw new Error("matchmaking_id ontbreekt");
    if (!controle_run_id) throw new Error("controle_run_id ontbreekt");
    const scopedPartijNr = opts?.partij_nr != null && Number.isFinite(Number(opts.partij_nr)) ? Number(opts.partij_nr) : null;
    const scopedBoutId = unwrapUuid(opts?.bout_id);
    let ctxQ = __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabaseAdmin$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["supabaseAdmin"].from("controle_bout_context").select("partij_nr, bout_id, rood_gym_mm, blauw_gym_mm, evenement_datum").eq("matchmaking_id", matchmaking_id).eq("controle_run_id", controle_run_id);
    if (scopedPartijNr != null) ctxQ = ctxQ.eq("partij_nr", scopedPartijNr);
    if (scopedBoutId) ctxQ = ctxQ.eq("bout_id", scopedBoutId);
    const { data: ctxRows, error: cErr } = await ctxQ;
    if (cErr) throw cErr;
    if (!ctxRows || ctxRows.length === 0) return;
    const sportscholen = await fetchAllSportscholen();
    const aliases = await fetchAllSportschoolAliases();
    const aliasNormToId = new Map();
    const aliasCompactToId = new Map();
    const aliasRows = [];
    for (const a of aliases ?? []){
        const raw = String(a?.alias_text ?? "").trim();
        const sid = a?.sportschool_id;
        if (!raw || sid == null) continue;
        const n = norm(raw);
        if (!n) continue;
        const c = compactNorm(n);
        if (!aliasNormToId.has(n)) aliasNormToId.set(n, String(sid));
        if (!aliasCompactToId.has(c)) aliasCompactToId.set(c, String(sid));
        aliasRows.push({
            alias_text: raw,
            sportschool_id: String(sid)
        });
    }
    const aliasMaps = {
        aliasNormToId,
        aliasCompactToId,
        aliasRows
    };
    console.log("[enrichControleBoutContext] sportscholen loaded:", sportscholen.length);
    console.log("[enrichControleBoutContext] aliases loaded:", aliases.length);
    console.log("[enrichControleBoutContext] alias keys:", aliasNormToId.size);
    console.log("[enrichControleBoutContext] scope", {
        matchmaking_id,
        controle_run_id,
        partij_nr: scopedPartijNr,
        bout_id: scopedBoutId,
        rows: ctxRows.length
    });
    for (const row of ctxRows){
        const bout_id = unwrapUuid(row.bout_id);
        if (!bout_id) continue;
        const roodGym = String(row.rood_gym_mm ?? "").trim();
        const blauwGym = String(row.blauw_gym_mm ?? "").trim();
        const roodMatch = roodGym ? findGymMatch(sportscholen, roodGym, aliasMaps) : {
            row: null,
            reason: null
        };
        const blauwMatch = blauwGym ? findGymMatch(sportscholen, blauwGym, aliasMaps) : {
            row: null,
            reason: null
        };
        const rood = roodMatch.row;
        const blauw = blauwMatch.row;
        const patch = {};
        const mmLine = (gym)=>gym ? `↳ [MM sportschool:] "${gym}"` : `↳ [MM sportschool:] -`;
        if (!rood) {
            patch.keurmerk_rood = null;
            patch.keurmerk_reden_rood = roodGym ? `${mmLine(roodGym)}\nGeen match in sportscholen. ${roodMatch.reason ?? ""}`.trim() : `${mmLine("")}\nGeen sportschool opgegeven.`.trim();
        } else {
            const hint = detectLandHintFromGymText(roodGym);
            const landDb = rood?.land ?? rood?.country ?? null;
            const land = landDb ?? landHintToLabel(hint);
            const eindeIso = toIsoDateOnly(rood?.keurmerk_eind ?? rood?.keurmerk_einde ?? rood?.einde_keurmerk);
            const matchInfo = `${mmLine(roodGym)}\n` + `↳ gematcht met "${rood.naam}" (${rood.plaats ?? rood.stad ?? "?"}, ${land ?? "?"})`;
            const isForeign = landDb ? isForeignNonNL(landDb) : hint !== null && hint !== "NL";
            if (isForeign) {
                patch.keurmerk_rood = true;
                if (landDb ? isBE(landDb) : hint === "BE") {
                    patch.keurmerk_reden_rood = `⚠️ België — controleer sportschool op BKBMO site + boksboekje. Land: ${land ?? "België"}.\n${matchInfo}`;
                } else if (landDb ? isDE(landDb) : hint === "DE") {
                    patch.keurmerk_reden_rood = `ℹ️ Buitenland (Duitsland) — geen NVB keurmerk vereist. Controleer bond/boekje handmatig.\n${matchInfo}`;
                } else {
                    patch.keurmerk_reden_rood = `ℹ️ Buitenland — geen NVB keurmerk vereist. Controleer bond/boekje handmatig.\n${matchInfo}`;
                }
            } else {
                const geldig = !!eindeIso && eindeIso >= String(row?.evenement_datum ?? "");
                patch.keurmerk_rood = geldig;
                patch.keurmerk_reden_rood = geldig ? `${matchInfo}\nKeurmerk geldig t/m ${eindeIso}.` : `${matchInfo}\nGeen geldig keurmerk op eventdatum. Keurmerk eindigt/eindigde op ${eindeIso ?? "-"}.`;
            }
        }
        if (!blauw) {
            patch.keurmerk_blauw = null;
            patch.keurmerk_reden_blauw = blauwGym ? `${mmLine(blauwGym)}\nGeen match in sportscholen. ${blauwMatch.reason ?? ""}`.trim() : `${mmLine("")}\nGeen sportschool opgegeven.`.trim();
        } else {
            const hint = detectLandHintFromGymText(blauwGym);
            const landDb = blauw?.land ?? blauw?.country ?? null;
            const land = landDb ?? landHintToLabel(hint);
            const eindeIso = toIsoDateOnly(blauw?.keurmerk_eind ?? blauw?.keurmerk_einde ?? blauw?.einde_keurmerk);
            const matchInfo = `${mmLine(blauwGym)}\n` + `↳ gematcht met "${blauw.naam}" (${blauw.plaats ?? blauw.stad ?? "?"}, ${land ?? "?"})`;
            const isForeign = landDb ? isForeignNonNL(landDb) : hint !== null && hint !== "NL";
            if (isForeign) {
                patch.keurmerk_blauw = true;
                if (landDb ? isBE(landDb) : hint === "BE") {
                    patch.keurmerk_reden_blauw = `⚠️ België — controleer sportschool op BKBMO site + boksboekje. Land: ${land ?? "België"}.\n${matchInfo}`;
                } else if (landDb ? isDE(landDb) : hint === "DE") {
                    patch.keurmerk_reden_blauw = `ℹ️ Buitenland (Duitsland) — geen NVB keurmerk vereist. Controleer bond/boekje handmatig.\n${matchInfo}`;
                } else {
                    patch.keurmerk_reden_blauw = `ℹ️ Buitenland — geen NVB keurmerk vereist. Controleer bond/boekje handmatig.\n${matchInfo}`;
                }
            } else {
                const geldig = !!eindeIso && eindeIso >= String(row?.evenement_datum ?? "");
                patch.keurmerk_blauw = geldig;
                patch.keurmerk_reden_blauw = geldig ? `${matchInfo}\nKeurmerk geldig t/m ${eindeIso}.` : `${matchInfo}\nGeen geldig keurmerk op eventdatum. Keurmerk eindigt/eindigde op ${eindeIso ?? "-"}.`;
            }
        }
        const { error: uErr } = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabaseAdmin$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["supabaseAdmin"].from("controle_bout_context").update(patch).eq("matchmaking_id", matchmaking_id).eq("controle_run_id", controle_run_id).eq("bout_id", bout_id);
        if (uErr) throw uErr;
    }
}
}),
"[project]/lib/control/saveControleResultaten.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "saveControleResultaten",
    ()=>saveControleResultaten
]);
// lib/control/saveControleResultaten.ts
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabaseAdmin$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/supabaseAdmin.ts [app-route] (ecmascript)");
;
function asUuid(v) {
    if (v == null) return null;
    if (typeof v === "string") {
        const s = v.trim();
        if (!s || s === "[object Object]") return null;
        return s;
    }
    if (typeof v === "object") {
        const cand = typeof v.bout_id === "string" && v.bout_id || typeof v.bout_uid === "string" && v.bout_uid || typeof v.id === "string" && v.id || null;
        const s = String(cand ?? "").trim();
        if (!s || s === "[object Object]") return null;
        return s;
    }
    const s = String(v ?? "").trim();
    if (!s || s === "[object Object]") return null;
    return s;
}
function asInt(v) {
    if (v == null) return null;
    const s = String(v).trim();
    if (!s) return null;
    const n = Number(s);
    return Number.isFinite(n) ? n : null;
}
function reviewKey(row) {
    const partij = asInt(row.partij_nr) ?? -1;
    const bout = asUuid(row.bout_id) ?? "";
    const code = String(row.rule_code ?? "").trim().toUpperCase();
    const hoek = String(row.hoek ?? "").trim().toLowerCase();
    return `${partij}|${bout}|${code}|${hoek}`;
}
function normalizeReviewStatus(v) {
    const s = String(v ?? "").trim().toLowerCase();
    if (!s) return null;
    if (s === "approved" || s === "goedgekeurd") return "approved";
    if (s === "rejected" || s === "afgekeurd") return "rejected";
    return null;
}
async function saveControleResultaten(opts) {
    const controle_run_id = asUuid(opts?.controle_run_id);
    const matchmaking_id = asUuid(opts?.matchmaking_id);
    const scopedBoutId = asUuid(opts?.bout_id);
    const scopedPartijNr = asInt(opts?.partij_nr);
    if (!controle_run_id) {
        throw new Error("[saveControleResultaten] controle_run_id ontbreekt/ongeldig");
    }
    if (!matchmaking_id) {
        throw new Error("[saveControleResultaten] matchmaking_id ontbreekt/ongeldig");
    }
    const hitsIn = Array.isArray(opts?.hits) ? opts.hits : [];
    // 0) bestaande reviews ophalen vóór delete
    let exQ = __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabaseAdmin$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["supabaseAdmin"].from("controle_resultaten").select("partij_nr,bout_id,rule_code,hoek,review_status,review_note,reviewed_by,reviewed_at,aantekeningen,original_resultaat,resultaat,actie_status").eq("controle_run_id", controle_run_id).eq("matchmaking_id", matchmaking_id);
    if (scopedBoutId) {
        exQ = exQ.eq("bout_id", scopedBoutId);
    } else if (scopedPartijNr != null) {
        exQ = exQ.eq("partij_nr", scopedPartijNr);
    }
    const { data: existing, error: exErr } = await exQ;
    if (exErr) throw exErr;
    const reviewMap = new Map();
    for (const r of existing ?? []){
        const key = reviewKey(r);
        const rs = normalizeReviewStatus(r.review_status);
        const hasReview = !!rs || !!r.reviewed_at || !!String(r.review_note ?? "").trim();
        const hasNotes = !!String(r.aantekeningen ?? "").trim();
        if (hasReview || hasNotes) {
            reviewMap.set(key, {
                ...r,
                _norm: rs
            });
        }
    }
    // 1) oude resultaten scoped verwijderen
    let delQ = __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabaseAdmin$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["supabaseAdmin"].from("controle_resultaten").delete().eq("controle_run_id", controle_run_id).eq("matchmaking_id", matchmaking_id);
    if (scopedBoutId) {
        delQ = delQ.eq("bout_id", scopedBoutId);
    } else if (scopedPartijNr != null) {
        delQ = delQ.eq("partij_nr", scopedPartijNr);
    }
    const { error: delErr } = await delQ;
    if (delErr) throw delErr;
    // 2) rows bouwen + reviews terugzetten
    const rowsToInsert = [];
    for (const hit of hitsIn){
        const partij_nr = asInt(hit?.partij_nr) ?? scopedPartijNr ?? null;
        const hitBoutId = asUuid(hit?.bout_id);
        const bout_id = hitBoutId ?? scopedBoutId ?? null;
        const mmId = asUuid(hit?.matchmaking_id) ?? matchmaking_id;
        // safety:
        // - als we op bout scoped werken en row heeft andere bout -> skip
        if (scopedBoutId && bout_id !== scopedBoutId) continue;
        // - als we op partij scoped werken en row heeft andere partij -> skip
        if (scopedBoutId == null && scopedPartijNr != null && partij_nr !== scopedPartijNr) continue;
        const baseRow = {
            controle_run_id,
            run_id: controle_run_id,
            matchmaking_id: mmId,
            partij_nr,
            bout_id,
            rule_code: hit.rule_code ?? null,
            rule: hit.rule ?? hit.rule_code ?? "RULE",
            severity: hit.severity ?? null,
            resultaat: hit.resultaat ?? null,
            boodschap: hit.boodschap ?? hit.message ?? null,
            hoek: hit.hoek ?? null,
            original_resultaat: hit.resultaat ?? null
        };
        const key = reviewKey({
            partij_nr,
            bout_id,
            rule_code: hit.rule_code,
            hoek: hit.hoek
        });
        const prev = reviewMap.get(key);
        if (prev) {
            const norm = prev._norm;
            baseRow.review_status = norm ?? prev.review_status ?? null;
            baseRow.review_note = prev.review_note ?? null;
            baseRow.reviewed_by = prev.reviewed_by ?? null;
            baseRow.reviewed_at = prev.reviewed_at ?? null;
            baseRow.aantekeningen = prev.aantekeningen ?? null;
            if (norm === "approved") {
                baseRow.resultaat = "OK";
                baseRow.actie_status = "goedgekeurd";
            } else if (norm === "rejected") {
                baseRow.resultaat = "AFKEUR";
                baseRow.actie_status = "afgekeurd";
            }
        }
        rowsToInsert.push(baseRow);
    }
    if (rowsToInsert.length === 0) return;
    const { error: insErr } = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabaseAdmin$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["supabaseAdmin"].from("controle_resultaten").insert(rowsToInsert);
    if (insErr) throw insErr;
}
}),
"[project]/lib/galaTime.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

// lib/galaTime.ts
// ------------------------------------------------------------
// - Telt aantal partijen per categorie (obv ctxRows)
// - Vermenigvuldigt met minutes_per_bout (Excel kolom S / jouw totalen)
// - Rondt uren omhoog op kwartieren (Excel W16)
__turbopack_context__.s([
    "DEFAULT_GALA_TIME_CONFIG",
    ()=>DEFAULT_GALA_TIME_CONFIG,
    "ceilToQuarter",
    ()=>ceilToQuarter,
    "estimateGalaTimeFromContextRows",
    ()=>estimateGalaTimeFromContextRows,
    "formatHoursQuarterNL",
    ()=>formatHoursQuarterNL,
    "formatMinutesNL",
    ()=>formatMinutesNL,
    "resolveCategorie",
    ()=>resolveCategorie
]);
const DEFAULT_GALA_TIME_CONFIG = {
    minutes_per_bout: {
        A_TITEL: 31.0,
        A: 21.0,
        B: 14.0,
        C: 13.0,
        N: 11.5,
        JEUGD_16_17: 10.5,
        JEUGD_LT_16: 8.5,
        DEMO: 6.0,
        MMA_PRO: 17.0,
        MMA_AM: 17.0,
        ONBEKEND: 13.0
    },
    warning_over_minutes: 390,
    max_with_hoofdofficial_minutes: 480,
    round_to_quarter_hours: true
};
function up(v) {
    return String(v ?? "").trim().toUpperCase();
}
function parseISODateOnly(d) {
    if (!d) return null;
    const s = String(d).trim();
    const dt = new Date(s.length === 10 ? `${s}T00:00:00` : s);
    return isNaN(dt.getTime()) ? null : dt;
}
function calcAgeYearsOnDate(eventDate, birthDate) {
    let years = eventDate.getFullYear() - birthDate.getFullYear();
    const m = eventDate.getMonth() - birthDate.getMonth();
    if (m < 0 || m === 0 && eventDate.getDate() < birthDate.getDate()) years -= 1;
    if (!Number.isFinite(years) || years < 0) return null;
    return years;
}
function getAgeAtEvent(ctx, side) {
    // ✅ eerst: gebruik je al berekende leeftijd_event (snel + betrouwbaar)
    const ageEvent = side === "rood" ? Number(ctx?.rood_leeftijd_event) : Number(ctx?.blauw_leeftijd_event);
    if (Number.isFinite(ageEvent)) return ageEvent;
    // fallback: berekenen uit eventdatum + geboortedatum
    const ev = parseISODateOnly(ctx?.evenement_datum);
    const bd = parseISODateOnly(ctx?.[`${side}_geboortedatum_fp`]) ?? parseISODateOnly(ctx?.[`${side}_geboortedatum_mm`]);
    if (!ev || !bd) return null;
    return calcAgeYearsOnDate(ev, bd);
}
/** Parse letterklasse R/N/C/B/A uit allerlei vormen (zonder CLASS→A bug) */ function parseStandingLetterClass(input) {
    const s = up(input);
    if (!s) return null;
    // expliciet jeugd/newcomer negeren
    if (s.includes("JEUGD") || s.includes("YOUTH") || s.includes("NIEUWELING") || s.includes("NEWCOMER") || s.startsWith("J") || s.includes("J-KLASSE")) {
        return null;
    }
    // letter als los token
    const m1 = s.match(/\b(R|N|C|B|A)\b/);
    if (m1) return m1[1];
    // begin "C-" etc
    const m2 = s.match(/^(R|N|C|B|A)[- ]/);
    if (m2) return m2[1];
    // "C-KLASSE" "C-CLASS"
    const m3 = s.match(/\b(R|N|C|B|A)\b\s*[- ]?\s*(KLASSE|CLASS)\b/);
    if (m3) return m3[1];
    return null;
}
function resolveCategorie(ctx) {
    const klasse = up(ctx?.klasse_mm ?? ctx?.klasse ?? "");
    const disc = up(ctx?.discipline ?? "");
    // 1) Demo
    if (klasse.includes("DEMO")) return "DEMO";
    // 2) MMA
    if (disc.includes("MMA") || klasse.includes("MMA")) {
        if (klasse.includes("PRO")) return "MMA_PRO";
        return "MMA_AM";
    }
    // 3) Jeugd split op leeftijd
    const ar = getAgeAtEvent(ctx, "rood");
    const ab = getAgeAtEvent(ctx, "blauw");
    const bothKnown = Number.isFinite(ar) && Number.isFinite(ab);
    if (bothKnown) {
        const r = ar;
        const b = ab;
        if (r < 18 && b < 18) {
            if (r >= 16 || b >= 16) return "JEUGD_16_17";
            return "JEUGD_LT_16";
        }
    } else {
        // fallback hints
        if (klasse.includes("16/17") || klasse.includes("16-17")) return "JEUGD_16_17";
        if (klasse.includes("JEUGD") || klasse.startsWith("J")) return "JEUGD_LT_16";
    }
    // 4) Staand letterklasse
    if (klasse.includes("TITEL") && klasse.includes("A")) return "A_TITEL";
    const letter = parseStandingLetterClass(klasse);
    if (letter === "A") return "A";
    if (letter === "B") return "B";
    if (letter === "C") return "C";
    if (letter === "N") return "N";
    if (letter === "R") return "N"; // R optioneel; voor tijd tellen we dit als N (pas aan als Excel aparte R rij heeft)
    return "ONBEKEND";
}
function estimateGalaTimeFromContextRows(ctxRows, config = DEFAULT_GALA_TIME_CONFIG) {
    const by_category = {};
    const allCats = [
        "A_TITEL",
        "A",
        "B",
        "C",
        "N",
        "JEUGD_16_17",
        "JEUGD_LT_16",
        "DEMO",
        "MMA_PRO",
        "MMA_AM",
        "ONBEKEND"
    ];
    for (const c of allCats){
        by_category[c] = {
            count: 0,
            minutes_per_bout: config.minutes_per_bout[c],
            total_minutes: 0
        };
    }
    for (const ctx of ctxRows ?? []){
        const cat = resolveCategorie(ctx);
        const per = config.minutes_per_bout[cat] ?? config.minutes_per_bout.ONBEKEND;
        by_category[cat].count += 1;
        by_category[cat].minutes_per_bout = per;
        by_category[cat].total_minutes += per;
    }
    const total_minutes = Object.values(by_category).reduce((s, x)=>s + (x.total_minutes ?? 0), 0);
    const total_hours_raw = total_minutes / 60;
    const total_hours_quarter_ceil = config.round_to_quarter_hours ? ceilToQuarter(total_hours_raw) : total_hours_raw;
    return {
        total_minutes,
        total_hours_raw,
        total_hours_quarter_ceil,
        warning_over_minutes: config.warning_over_minutes,
        max_with_hoofdofficial_minutes: config.max_with_hoofdofficial_minutes,
        by_category
    };
}
function ceilToQuarter(hours) {
    const h = Number(hours);
    if (!Number.isFinite(h) || h <= 0) return 0;
    return Math.ceil(h * 4) / 4;
}
function formatMinutesNL(totalMinutes) {
    const m = Number(totalMinutes);
    if (!Number.isFinite(m) || m <= 0) return "-";
    const h = Math.floor(m / 60);
    const r = Math.round(m % 60);
    if (h <= 0) return `${r} min`;
    if (r === 0) return `${h} u`;
    return `${h} u ${r} min`;
}
function formatHoursQuarterNL(hours) {
    const h = Number(hours);
    if (!Number.isFinite(h) || h <= 0) return "-";
    const whole = Math.floor(h);
    const frac = Math.round((h - whole) * 4) / 4;
    const q = Math.round(frac * 4);
    if (q === 0) return `${whole}`;
    if (q === 1) return `${whole} 1/4`;
    if (q === 2) return `${whole} 1/2`;
    if (q === 3) return `${whole} 3/4`;
    return `${h}`;
}
}),
"[project]/lib/rulesEngine.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "rulesEngine",
    ()=>rulesEngine
]);
// lib/rulesEngine.ts
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$dayjs$2f$dayjs$2e$min$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/dayjs/dayjs.min.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabaseAdmin$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/supabaseAdmin.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$control$2f$saveControleResultaten$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/control/saveControleResultaten.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$galaTime$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/galaTime.ts [app-route] (ecmascript)");
;
;
;
;
function asInt(v) {
    const n = Number(String(v ?? "").trim());
    return Number.isFinite(n) ? n : null;
}
function unwrapUuid(v) {
    if (v == null) return null;
    const s = String(v).trim();
    if (!s || s === "[object Object]") return null;
    return s;
}
function normLower(v) {
    return String(v ?? "").toLowerCase().trim();
}
function parseIsoDateOnly(v) {
    if (!v) return null;
    const s = String(v).trim();
    if (!s) return null;
    const d = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$dayjs$2f$dayjs$2e$min$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["default"])(s);
    return d.isValid() ? d : null;
}
function parseEventDateFromCtx(ctx) {
    const candidates = [
        ctx?.event_date,
        ctx?.event_datum,
        ctx?.evenement_datum,
        ctx?.gala_date,
        ctx?.gala_datum,
        ctx?.datum,
        ctx?.match_date,
        ctx?.match_datum,
        ctx?.wedstrijd_datum,
        ctx?.created_at
    ];
    for (const v of candidates){
        const d = parseIsoDateOnly(v);
        if (d) return d;
    }
    return null;
}
function ageOnReferenceDate(dob, ref) {
    if (!dob || !ref) return null;
    if (!dob.isValid() || !ref.isValid()) return null;
    return ref.diff(dob, "year");
}
function ageOnEventFromCtx(ctx, hoek) {
    const dob = hoek === "rood" ? parseIsoDateOnly(ctx?.rood_geboortedatum_fp ?? ctx?.rood_geboortedatum) : parseIsoDateOnly(ctx?.blauw_geboortedatum_fp ?? ctx?.blauw_geboortedatum);
    const eventDate = parseEventDateFromCtx(ctx);
    return ageOnReferenceDate(dob, eventDate);
}
/* ==========================================================
   Basis: jeugd/volwassen + "jongste regel geldt"
   LET OP: leeftijd altijd afleiden uit geboortedatum, niet uit matchmaking-leeftijd.
   ========================================================== */ function isJeugdFromCtx(ctx) {
    const r = ageOnEventFromCtx(ctx, "rood");
    const b = ageOnEventFromCtx(ctx, "blauw");
    if (typeof r === "number" && r < 18 || typeof b === "number" && b < 18) {
        return true;
    }
    const k = String(ctx?.klasse_mm ?? "").toUpperCase().replace(/\s+/g, " ").trim();
    if (k.includes("J+")) return true;
    if (k.includes("JEUGD")) return true;
    if (k === "J") return true;
    if (k.startsWith("J ")) return true;
    if (k.startsWith("J-")) return true;
    return false;
}
function isVolwassenePair(ctx) {
    const r = ageOnEventFromCtx(ctx, "rood");
    const b = ageOnEventFromCtx(ctx, "blauw");
    return typeof r === "number" && r >= 18 && typeof b === "number" && b >= 18;
}
function minAgeEvent(ctx) {
    const r = ageOnEventFromCtx(ctx, "rood");
    const b = ageOnEventFromCtx(ctx, "blauw");
    if (typeof r === "number" && typeof b === "number") return Math.min(r, b);
    if (typeof r === "number") return r;
    if (typeof b === "number") return b;
    return null;
}
/* ==========================================================
   Discipline: MMA herkennen
   ========================================================== */ function isMmaBout(ctx) {
    const d = String(ctx?.discipline ?? "").toUpperCase();
    const sd = String(ctx?.sub_discipline ?? "").toUpperCase();
    const km = String(ctx?.klasse_mm ?? "").toUpperCase();
    const mmaToken = km === "P" || km === "PRO" || km === "AMA" || km === "AMATEUR";
    return d.includes("MMA") || sd.includes("MMA") || km.includes("MMA") || mmaToken;
}
function isKickboksMuayThai(ctx) {
    const d = String(ctx?.discipline ?? "").toUpperCase();
    const sd = String(ctx?.sub_discipline ?? "").toUpperCase();
    const s = `${d} ${sd}`;
    return s.includes("KICK") || s.includes("K1") || s.includes("MUAY") || s.includes("THAI") || s.includes("MT");
}
/* ==========================================================
   Naam mismatch (ACTIE) — tolerant
   ========================================================== */ function normNameSoft(v) {
    return String(v ?? "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();
}
function levenshtein(a, b) {
    if (a === b) return 0;
    if (!a) return b.length;
    if (!b) return a.length;
    const n = b.length;
    const dp = new Array(n + 1);
    for(let j = 0; j <= n; j++)dp[j] = j;
    for(let i = 1; i <= a.length; i++){
        let prev = dp[0];
        dp[0] = i;
        for(let j = 1; j <= n; j++){
            const tmp = dp[j];
            const cost = a[i - 1] === b[j - 1] ? 0 : 1;
            dp[j] = Math.min(dp[j] + 1, dp[j - 1] + 1, prev + cost);
            prev = tmp;
        }
    }
    return dp[n];
}
function toInt(value) {
    if (value === null || value === undefined) return 0;
    const n = parseInt(String(value), 10);
    return isNaN(n) ? 0 : n;
}
function tokenSimilarity(a, b) {
    const dist = levenshtein(a, b);
    const maxLen = Math.max(a.length, b.length);
    return maxLen ? 1 - dist / maxLen : 1;
}
function splitTokens(v) {
    const s = normNameSoft(v);
    if (!s) return [];
    return s.split(" ").map((x)=>x.trim()).filter((x)=>x.length >= 2).filter((x)=>x !== "el" && x !== "al" && x !== "de" && x !== "van");
}
function nameSimilar(aRaw, bRaw) {
    const aTokens = splitTokens(aRaw);
    const bTokens = splitTokens(bRaw);
    if (!aTokens.length || !bTokens.length) return true;
    const aLast = aTokens[aTokens.length - 1];
    const bLast = bTokens[bTokens.length - 1];
    if (tokenSimilarity(aLast, bLast) < 0.78) return false;
    const aFirsts = aTokens.slice(0, -1);
    const bFirsts = bTokens.slice(0, -1);
    if (!aFirsts.length || !bFirsts.length) return true;
    let bestFirst = 0;
    for (const af of aFirsts){
        for (const bf of bFirsts){
            bestFirst = Math.max(bestFirst, tokenSimilarity(af, bf));
        }
    }
    return bestFirst >= 0.72;
}
/* ==========================================================
   Geslacht
   ========================================================== */ function parseGender(v) {
    const s = normLower(v);
    if (!s) return null;
    if (s === "m" || s.includes("man")) return "M";
    if (s === "v" || s.includes("vrouw")) return "V";
    return null;
}
/* ==========================================================
   Jeugd (niet-MMA): leeftijdsverschil maandenregel
   ========================================================== */ function leeftijdsVerschilJeugd(dobR, dobB) {
    if (!dobR || !dobB) {
        return {
            type: "ACTIE",
            diffDaysTotal: null,
            diffMonths: null,
            diffDaysRemainder: null
        };
    }
    const older = dobR.isBefore(dobB) ? dobR : dobB;
    const younger = dobR.isBefore(dobB) ? dobB : dobR;
    const diffMonths = Math.abs(younger.diff(older, "month"));
    const afterMonths = older.add(diffMonths, "month");
    const diffDaysRemainder = Math.abs(younger.diff(afterMonths, "day"));
    const diffDaysTotal = Math.abs(younger.diff(older, "day"));
    const dispThreshold = older.add(18, "month").add(1, "day");
    const verbodThreshold = older.add(24, "month");
    const isVerbod = younger.isSame(verbodThreshold, "day") || younger.isAfter(verbodThreshold, "day");
    const isDisp = younger.isAfter(dispThreshold, "day") && !isVerbod;
    if (isVerbod) {
        return {
            type: "VERBOD",
            diffDaysTotal,
            diffMonths,
            diffDaysRemainder
        };
    }
    if (isDisp) {
        return {
            type: "DISPENSATIE",
            diffDaysTotal,
            diffMonths,
            diffDaysRemainder
        };
    }
    return {
        type: "OK",
        diffDaysTotal,
        diffMonths,
        diffDaysRemainder
    };
}
/* ==========================================================
   MMA jeugd: leeftijdscategorie bands
   ========================================================== */ const MMA_JEUGD_AGE_BANDS = [
    {
        min: 0,
        max: 11,
        label: "TE JONG"
    },
    {
        min: 12,
        max: 13,
        label: "CAT-13"
    },
    {
        min: 14,
        max: 15,
        label: "CAT-15"
    },
    {
        min: 16,
        max: 17,
        label: "CAT-17"
    }
];
function mmaJeugdAgeBand(age) {
    if (typeof age !== "number") return null;
    for (const b of MMA_JEUGD_AGE_BANDS){
        if (age >= b.min && age <= b.max) return b;
    }
    return null;
}
/* ==========================================================
   Jeugd party diff via ctx totals (snel)
   ========================================================== */ function getCurrentTotalsAll(uitslagenPerDiscipline) {
    if (!uitslagenPerDiscipline) return null;
    const obj = typeof uitslagenPerDiscipline === "string" ? (()=>{
        try {
            return JSON.parse(uitslagenPerDiscipline);
        } catch  {
            return null;
        }
    })() : uitslagenPerDiscipline;
    return obj?.current?._all ?? null;
}
function demoToPartijEquivalent(demo) {
    return Math.floor(Math.max(0, demo) / 3);
}
function effectiveFromTotals(t) {
    if (!t) return null;
    const total = Number(t.total ?? 0);
    const demo = Number(t.demo ?? 0);
    if (!Number.isFinite(total) || !Number.isFinite(demo)) return null;
    return Math.max(0, total - demo + demoToPartijEquivalent(demo));
}
const VOLGORDE = [
    "R",
    "N",
    "C",
    "B",
    "A"
];
function idxKlasse(k) {
    return k ? VOLGORDE.indexOf(k) : -1;
}
function asKlasseLetter(v) {
    const s = String(v ?? "").trim().toUpperCase();
    return VOLGORDE.includes(s) ? s : null;
}
function maxKlasse(a, b) {
    if (!a) return b;
    if (!b) return a;
    return idxKlasse(a) >= idxKlasse(b) ? a : b;
}
function parseKbMmKlasseToLetter(mm) {
    const raw = String(mm ?? "").trim();
    if (!raw) return null;
    const up = raw.toUpperCase();
    if (up.includes("JEUGD") || up.includes("YOUTH") || up.includes("NIEUWELING") || up.includes("NEWCOMER") || up.startsWith("J") || up.includes("J-KLASSE")) {
        return null;
    }
    const m1 = up.match(/\b(R|N|C|B|A)\b/);
    if (m1) return m1[1];
    const m2 = up.match(/^(R|N|C|B|A)[- ]/);
    if (m2) return m2[1];
    const m3 = up.match(/\b(R|N|C|B|A)\b\s*[- ]?\s*(KLASSE|CLASS)\b/);
    if (m3) return m3[1];
    const m4 = up.match(/\b(KLASSE|CLASS)\b\s*[- ]?\s*\b(R|N|C|B|A)\b/);
    if (m4) return m4[2];
    return null;
}
function parseOutcome(uitslag) {
    const s = String(uitslag ?? "").toLowerCase();
    if (!s) return "OTHER";
    if (s.includes("demo") || s.includes("demonstr")) return "DEMO";
    if (s.includes("wint") || s.includes("win")) return "WIN";
    if (s.includes("verliest") || s.includes("verlies") || s.includes("lost")) return "LOSS";
    if (s.includes("onbeslist") || s.includes("draw") || s.includes("gelijk")) return "DRAW";
    return "OTHER";
}
function isRelevantStandingDiscipline(d) {
    const s = String(d ?? "").toLowerCase();
    if (!s) return false;
    if (s.includes("kick")) return true;
    if (s.includes("muay")) return true;
    if (s.includes("thai")) return true;
    return false;
}
async function fetchUitslagenByVa(opts) {
    const { matchmaking_id, controle_run_id, vaList } = opts;
    const map = new Map();
    if (!vaList.length) return map;
    const chunkSize = 500;
    for(let i = 0; i < vaList.length; i += chunkSize){
        const chunk = vaList.slice(i, i + chunkSize);
        const { data, error } = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabaseAdmin$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["supabaseAdmin"].from("uitslagen_raw").select("va_nummer, discipline, klasse, uitslag").eq("matchmaking_id", matchmaking_id).eq("controle_run_id", controle_run_id).in("va_nummer", chunk);
        if (error) throw error;
        for (const r of data ?? []){
            const va = String(r?.va_nummer ?? "").trim();
            if (!va) continue;
            if (!map.has(va)) map.set(va, []);
            map.get(va).push(r);
        }
    }
    return map;
}
function hoogsteKlasseUitUitslagen(rows) {
    let best = null;
    for (const r of rows ?? []){
        if (!isRelevantStandingDiscipline(r?.discipline)) continue;
        const k = asKlasseLetter(r?.klasse);
        if (!k) continue;
        best = maxKlasse(best, k);
    }
    return best;
}
function recordInKlasse(rows, k) {
    let wins = 0;
    let total = 0;
    for (const r of rows ?? []){
        if (!isRelevantStandingDiscipline(r?.discipline)) continue;
        const rk = asKlasseLetter(r?.klasse);
        if (rk !== k) continue;
        const o = parseOutcome(r?.uitslag);
        if (o === "DEMO") continue;
        total += 1;
        if (o === "WIN") wins += 1;
    }
    return {
        wins,
        total
    };
}
function promoteFrom(k, wins, total) {
    if (k === "R") {
        if (wins >= 2 || total >= 3) return "N";
        return "R";
    }
    if (k === "N") {
        if (wins >= 3 || total >= 6) return "C";
        return "N";
    }
    if (k === "C") {
        if (wins >= 6 || total >= 8) return "B";
        return "C";
    }
    if (k === "B") {
        if (wins >= 8 || total >= 10) return "A";
        return "B";
    }
    return "A";
}
function canFightAdultKbMtBoutClass(fighterMax, boutK) {
    if (!fighterMax || !boutK) return true;
    if (idxKlasse(boutK) <= idxKlasse(fighterMax)) return true;
    if (fighterMax === "R" && boutK === "N") return true;
    return false;
}
function parseMmaLevel(v) {
    const s = String(v ?? "").toUpperCase().trim();
    if (!s) return null;
    if (s === "P" || s === "PRO" || s.includes("PROFESSIONAL") || s.includes("PROF")) return "PRO";
    if (s === "AMA" || s === "AMATEUR" || s.includes("AMATEUR")) return "AMATEUR";
    return null;
}
function getMmaLevelFromCtx(ctx, hoek) {
    const cand = hoek === "rood" ? ctx?.rood_mma_current_klasse ?? ctx?.rood_mma_klasse ?? ctx?.rood_klasse_mma ?? ctx?.rood_fp_mma_klasse : ctx?.blauw_mma_current_klasse ?? ctx?.blauw_mma_klasse ?? ctx?.blauw_klasse_mma ?? ctx?.blauw_fp_mma_klasse;
    return parseMmaLevel(cand);
}
async function rulesEngine(opts) {
    const { controle_run_id, matchmaking_id, ctxRows } = opts;
    const scopedBoutId = unwrapUuid(opts?.scoped_bout_id);
    const scopedPartijNr = opts?.scoped_partij_nr != null && Number.isFinite(Number(opts.scoped_partij_nr)) ? Number(opts.scoped_partij_nr) : null;
    const rowsRaw = Array.isArray(ctxRows) ? ctxRows : ctxRows ? [
        ctxRows
    ] : [];
    // Alleen de bedoelde partij verwerken.
    // Eerst op bout_id als die aanwezig is, anders fallback op partij_nr.
    const rows = rowsRaw.filter((ctx)=>{
        const ctxBoutId = unwrapUuid(ctx?.bout_id);
        const ctxPartijNr = asInt(ctx?.partij_nr);
        if (scopedBoutId) {
            return ctxBoutId === scopedBoutId;
        }
        if (scopedPartijNr != null) {
            return ctxPartijNr === scopedPartijNr;
        }
        return true;
    });
    const hits = [];
    const pushHit = (h)=>hits.push(h);
    // 1) VA list verzamelen
    const vaSet = new Set();
    for (const ctx of rows){
        const vr = String(ctx?.rood_va_mm ?? "").trim();
        const vb = String(ctx?.blauw_va_mm ?? "").trim();
        if (vr) vaSet.add(vr);
        if (vb) vaSet.add(vb);
    }
    const vaList = [
        ...vaSet
    ];
    // 2) uitslagen_raw 1x ophalen
    const uitslagenByVa = await fetchUitslagenByVa({
        matchmaking_id,
        controle_run_id,
        vaList
    });
    for (const ctx of rows){
        const partij_nr = asInt(ctx?.partij_nr);
        const bout_id = unwrapUuid(ctx?.bout_id);
        // VA ontbreekt
        const vaRood = String(ctx?.rood_va_mm ?? ctx?.va_rood ?? ctx?.va_rood_mm ?? "").trim();
        const vaBlauw = String(ctx?.blauw_va_mm ?? ctx?.va_blauw ?? ctx?.va_blauw_mm ?? "").trim();
        if (!vaRood) {
            pushHit({
                matchmaking_id,
                partij_nr,
                bout_id,
                rule: "Fightpaspoort nummer ontbreekt (rood)",
                rule_code: "FIGHTPASPOORT_ONTBREEKT_ROOD",
                resultaat: "AFKEUR",
                severity: "error",
                boodschap: "Geen Fightpaspoort nummer gevonden voor rood. Zonder Fightpaspoort nummer is er geen deelname mogelijk",
                hoek: "rood"
            });
        }
        if (!vaBlauw) {
            pushHit({
                matchmaking_id,
                partij_nr,
                bout_id,
                rule: "Fightpaspoort nummer ontbreekt (blauw)",
                rule_code: "FIGHTPASPOORT_ONTBREEKT_BLAUW",
                resultaat: "AFKEUR",
                severity: "error",
                boodschap: "Geen Fightpaspoort nummer gevonden voor blauw. Zonder Fightpaspoort nummer is er geen deelname mogelijk",
                hoek: "blauw"
            });
        }
        const jeugd = isJeugdFromCtx(ctx);
        const volwassenen = isVolwassenePair(ctx);
        const mma = isMmaBout(ctx);
        const mmaJeugd = jeugd && mma;
        // jeugd vs volwassen mix
        {
            const ageR = ageOnEventFromCtx(ctx, "rood");
            const ageB = ageOnEventFromCtx(ctx, "blauw");
            if (typeof ageR === "number" && typeof ageB === "number") {
                const mix = ageR < 18 && ageB >= 18 || ageB < 18 && ageR >= 18;
                if (mix) {
                    pushHit({
                        matchmaking_id,
                        partij_nr,
                        bout_id,
                        rule: "Jeugd vs volwassen verboden",
                        rule_code: "JEUGD_vs_VOLWASSEN_AFKEUR",
                        resultaat: "VERBOD",
                        severity: "error",
                        boodschap: `Rood leeftijd (event): ${ageR} • Blauw leeftijd (event): ${ageB} — mix jeugd/volwassen is niet toegestaan (VERBOD).`
                    });
                }
            } else {
                pushHit({
                    matchmaking_id,
                    partij_nr,
                    bout_id,
                    rule: "Jeugd vs volwassen niet controleerbaar",
                    rule_code: "JEUGD_vs_VOLWASSEN_GEEN_DATA_ACTIE",
                    resultaat: "ACTIE",
                    severity: "warning",
                    boodschap: "Geboortedatum en/of event-datum ontbreekt — kan niet bepalen of het een jeugd/volwassen partij is."
                });
            }
        }
        // naam mismatch
        {
            const roodNaamMM = ctx?.rood_naam_mm;
            const roodNaamFP = ctx?.rood_naam_fp ?? ctx?.rood_naam_scrape;
            const blauwNaamMM = ctx?.blauw_naam_mm;
            const blauwNaamFP = ctx?.blauw_naam_fp ?? ctx?.blauw_naam_scrape;
            if (!nameSimilar(roodNaamMM, roodNaamFP)) {
                pushHit({
                    matchmaking_id,
                    partij_nr,
                    bout_id,
                    rule: "Naam klopt niet met FightPassport (rood)",
                    rule_code: "NAAM_KLOPT_NIET_MET_FIGHTPASSPORT_ROOD",
                    resultaat: "ACTIE",
                    severity: "warning",
                    boodschap: `Rood naam matchmaker ("${roodNaamMM ?? "-"}") wijkt af van FightPassport ("${roodNaamFP ?? "-"}"). Controleer VA/vechter.`,
                    hoek: "rood"
                });
            }
            if (!nameSimilar(blauwNaamMM, blauwNaamFP)) {
                pushHit({
                    matchmaking_id,
                    partij_nr,
                    bout_id,
                    rule: "Naam klopt niet met FightPassport (blauw)",
                    rule_code: "NAAM_KLOPT_NIET_MET_FIGHTPASSPORT_BLAUW",
                    resultaat: "ACTIE",
                    severity: "warning",
                    boodschap: `Blauw naam matchmaker ("${blauwNaamMM ?? "-"}") wijkt af van FightPassport ("${blauwNaamFP ?? "-"}"). Controleer VA/vechter.`,
                    hoek: "blauw"
                });
            }
        }
        // keurmerk sportschool
        {
            const kR = ctx?.keurmerk_rood;
            const kB = ctx?.keurmerk_blauw;
            const redenR = String(ctx?.keurmerk_reden_rood ?? "").trim();
            const redenB = String(ctx?.keurmerk_reden_blauw ?? "").trim();
            if (redenR.startsWith("⚠️ België")) {
                pushHit({
                    matchmaking_id,
                    partij_nr,
                    bout_id,
                    rule: "Belgische sportschool (check BKBMO)",
                    rule_code: "KEURMERK_BE_ROOD_INFO",
                    resultaat: "INFO",
                    severity: "info",
                    boodschap: redenR,
                    hoek: "rood"
                });
            }
            if (redenB.startsWith("⚠️ België")) {
                pushHit({
                    matchmaking_id,
                    partij_nr,
                    bout_id,
                    rule: "Belgische sportschool (check BKBMO)",
                    rule_code: "KEURMERK_BE_BLAUW_INFO",
                    resultaat: "INFO",
                    severity: "info",
                    boodschap: redenB,
                    hoek: "blauw"
                });
            }
            if (kR == null) {
                pushHit({
                    matchmaking_id,
                    partij_nr,
                    bout_id,
                    rule: "Sportschool niet gevonden (rood)",
                    rule_code: "SPORTSCHOOL_NIET_GEVONDEN_ROOD",
                    resultaat: "ACTIE",
                    severity: "warning",
                    boodschap: redenR || "NL gym: Gym match onzeker.",
                    hoek: "rood"
                });
            } else if (kR === false) {
                pushHit({
                    matchmaking_id,
                    partij_nr,
                    bout_id,
                    rule: "Keurmerk NL Sportschool ongeldig (rood)",
                    rule_code: "KEURMERK_ONGELDIG_ROOD",
                    resultaat: "AFKEUR",
                    severity: "error",
                    boodschap: redenR || "NL gym: geen geldig keurmerk (ontbreekt/verlopen).",
                    hoek: "rood"
                });
            }
            if (kB == null) {
                pushHit({
                    matchmaking_id,
                    partij_nr,
                    bout_id,
                    rule: "Sportschool niet gevonden (blauw)",
                    rule_code: "SPORTSCHOOL_NIET_GEVONDEN_BLAUW",
                    resultaat: "ACTIE",
                    severity: "warning",
                    boodschap: redenB || "NL gym: Gym match onzeker.",
                    hoek: "blauw"
                });
            } else if (kB === false) {
                pushHit({
                    matchmaking_id,
                    partij_nr,
                    bout_id,
                    rule: "Keurmerk NL Sportschool ongeldig (blauw)",
                    rule_code: "KEURMERK_ONGELDIG_BLAUW",
                    resultaat: "AFKEUR",
                    severity: "error",
                    boodschap: redenB || "NL gym: geen geldig keurmerk (ontbreekt/verlopen).",
                    hoek: "blauw"
                });
            }
        }
        // man vs vrouw
        {
            const gR = parseGender(ctx?.rood_geslacht);
            const gB = parseGender(ctx?.blauw_geslacht);
            if (gR && gB && gR !== gB) {
                pushHit({
                    matchmaking_id,
                    partij_nr,
                    bout_id,
                    rule: "Man tegen vrouw niet toegestaan",
                    rule_code: "GESLACHT_AFKEUR",
                    resultaat: "VERBOD",
                    severity: "error",
                    boodschap: `Rood is ${gR === "M" ? "man" : "vrouw"} en Blauw is ${gB === "M" ? "man" : "vrouw"} — VERBOD.`
                });
            }
        }
        // startverbod
        {
            const sbR = normLower(ctx?.rood_heeft_startverbod);
            const sbB = normLower(ctx?.blauw_heeft_startverbod);
            const sbR_has = sbR === "ja" || sbR === "true" || sbR === "1";
            const sbB_has = sbB === "ja" || sbB === "true" || sbB === "1";
            if (sbR_has || sbB_has) {
                pushHit({
                    matchmaking_id,
                    partij_nr,
                    bout_id,
                    rule: "Vechter heeft startverbod",
                    rule_code: "STARTVERBOD_AFKEUR",
                    resultaat: "VERBOD",
                    severity: "error",
                    boodschap: `Rood: ${sbR_has ? "STARTVERBOD" : "OK"} • Blauw: ${sbB_has ? "STARTVERBOD" : "OK"} — VERBOD.`
                });
            }
        }
        // licentie
        {
            const licR = normLower(ctx?.rood_licentie);
            const licB = normLower(ctx?.blauw_licentie);
            const licR_ok = licR === "ja" || licR === "j" || licR === "true" || licR === "1" || licR === "geldig";
            const licB_ok = licB === "ja" || licB === "j" || licB === "true" || licB === "1" || licB === "geldig";
            if (!licR_ok) {
                pushHit({
                    matchmaking_id,
                    partij_nr,
                    bout_id,
                    hoek: "rood",
                    rule: "Licentie ontbreekt/ongeldig (rood)",
                    rule_code: "LICENTIE_ONGELDIG_ROOD",
                    resultaat: "AFKEUR",
                    severity: "error",
                    boodschap: `Rood heeft GEEN/ONGELDIGE licentie (waarde: "${String(ctx?.rood_licentie ?? "").trim() || "leeg"}").`
                });
            }
            if (!licB_ok) {
                pushHit({
                    matchmaking_id,
                    partij_nr,
                    bout_id,
                    hoek: "blauw",
                    rule: "Licentie ontbreekt/ongeldig (blauw)",
                    rule_code: "LICENTIE_ONGELDIG_BLAUW",
                    resultaat: "AFKEUR",
                    severity: "error",
                    boodschap: `Blauw heeft GEEN/ONGELDIGE licentie (waarde: "${String(ctx?.blauw_licentie ?? "").trim() || "leeg"}").`
                });
            }
        }
        // MMA < 12
        if (mma) {
            const minAge = minAgeEvent(ctx);
            if (typeof minAge === "number" && minAge < 12) {
                pushHit({
                    matchmaking_id,
                    partij_nr,
                    bout_id,
                    rule: "MMA onder 12 jaar verboden",
                    rule_code: "MMA_LEEFTIJD_AFKEUR",
                    resultaat: "AFKEUR",
                    severity: "error",
                    boodschap: `Minimale leeftijd in de partij is ${minAge} — MMA wedstrijden zijn verboden onder 12 jaar — AFKEUR.`
                });
            }
        }
        // MMA: Pro vs Amateur mismatch
        if (mma && volwassenen) {
            const mmaLevelR = getMmaLevelFromCtx(ctx, "rood");
            const mmaLevelB = getMmaLevelFromCtx(ctx, "blauw");
            void mmaLevelR;
            void mmaLevelB;
            const vaR = String(ctx?.rood_va_mm ?? "").trim();
            const vaB = String(ctx?.blauw_va_mm ?? "").trim();
            const rowsR = vaR ? uitslagenByVa.get(vaR) ?? [] : [];
            const rowsB = vaB ? uitslagenByVa.get(vaB) ?? [] : [];
            let proCountR = 0;
            let amaCountR = 0;
            let proCountB = 0;
            let amaCountB = 0;
            for (const r of rowsR){
                const level = parseMmaLevel(r?.klasse);
                if (level === "PRO") proCountR++;
                if (level === "AMATEUR") amaCountR++;
            }
            for (const r of rowsB){
                const level = parseMmaLevel(r?.klasse);
                if (level === "PRO") proCountB++;
                if (level === "AMATEUR") amaCountB++;
            }
            const proFighterR = proCountR >= 3 && amaCountR === 0;
            const proFighterB = proCountB >= 3 && amaCountB === 0;
            const amateurNewR = amaCountR > 0 && proCountR === 0 && amaCountR < 3;
            const amateurNewB = amaCountB > 0 && proCountB === 0 && amaCountB < 3;
            if (proFighterR && amateurNewB || proFighterB && amateurNewR) {
                const proSide = proFighterR ? "rood" : "blauw";
                const amateurSide = proFighterR ? "blauw" : "rood";
                const proCount = proFighterR ? proCountR : proCountB;
                const amaCount = proFighterR ? amaCountB : amaCountR;
                pushHit({
                    matchmaking_id,
                    partij_nr,
                    bout_id,
                    rule: "MMA: Pro vs Amateur",
                    rule_code: "MMA_PRO_VS_AMATEUR",
                    resultaat: "DISPENSATIE",
                    severity: "warning",
                    boodschap: `${proSide.toUpperCase()} is Pro fighter (${proCount} pro wedstrijden) en ${amateurSide.toUpperCase()} is nieuweling Amateur (${amaCount} amateur wedstrijd${amaCount > 1 ? "en" : ""}) — DISPENSATIE vereist.`
                });
            }
        }
        // jeugdregels
        if (jeugd) {
            if (mmaJeugd) {
                const ageR = ageOnEventFromCtx(ctx, "rood");
                const ageB = ageOnEventFromCtx(ctx, "blauw");
                const bandR = mmaJeugdAgeBand(ageR);
                const bandB = mmaJeugdAgeBand(ageB);
                if (!bandR || !bandB) {
                    pushHit({
                        matchmaking_id,
                        partij_nr,
                        bout_id,
                        rule: "MMA jeugd: leeftijdscategorie niet controleerbaar",
                        rule_code: "MMA_JEUGD_GEEN_INFO",
                        resultaat: "ACTIE",
                        severity: "warning",
                        boodschap: "Geboortedatum en/of event-datum ontbreekt — MMA-jeugd leeftijdscategorie kan niet gecontroleerd worden."
                    });
                } else if (bandR.label !== bandB.label) {
                    pushHit({
                        matchmaking_id,
                        partij_nr,
                        bout_id,
                        rule: "MMA jeugd: verschillende leeftijdscategorie",
                        rule_code: "MMA_JEUGD_CAT_AFKEUR",
                        resultaat: "AFKEUR",
                        severity: "error",
                        boodschap: `Rood valt in categorie ${bandR.label} (leeftijd ${ageR}) en Blauw in ${bandB.label} (leeftijd ${ageB}) — AFKEUR.`
                    });
                }
            } else {
                const dobR = parseIsoDateOnly(ctx?.rood_geboortedatum_fp);
                const dobB = parseIsoDateOnly(ctx?.blauw_geboortedatum_fp);
                const lv = leeftijdsVerschilJeugd(dobR, dobB);
                if (lv.type === "ACTIE") {
                    pushHit({
                        matchmaking_id,
                        partij_nr,
                        bout_id,
                        rule: "Leeftijdsverschil niet controleerbaar (jeugd)",
                        rule_code: "LEEFTIJDSVERSCHIL_JEUGD_GEEN_DATA",
                        resultaat: "ACTIE",
                        severity: "warning",
                        boodschap: "Geboortedatum ontbreekt bij rood en/of blauw — jeugd-leeftijdsverschil kan niet gecontroleerd worden."
                    });
                } else if (lv.type === "DISPENSATIE") {
                    pushHit({
                        matchmaking_id,
                        partij_nr,
                        bout_id,
                        rule: "Leeftijdsverschil 18-24 maanden (jeugd)",
                        rule_code: "LEEFTIJD_VERSCHIL_JEUGD_DISPENSATIE",
                        resultaat: "DISPENSATIE",
                        severity: "warning",
                        boodschap: `Leeftijdsverschil: ${lv.diffMonths} maanden en ${lv.diffDaysRemainder} dagen — vanaf 18 maanden verschil is DISPENSATIE vereist.`
                    });
                } else if (lv.type === "VERBOD") {
                    pushHit({
                        matchmaking_id,
                        partij_nr,
                        bout_id,
                        rule: "Leeftijdsverschil te groot (jeugd)",
                        rule_code: "LEEFTIJD_VERSCHIL_JEUGD_AFKEUR",
                        resultaat: "VERBOD",
                        severity: "error",
                        boodschap: `Leeftijdsverschil: ${lv.diffMonths} maanden en ${lv.diffDaysRemainder} dagen — vanaf 24 maanden verschil is dit een VERBOD.`
                    });
                }
            }
        }
        // jeugd partijverschil
        if (jeugd) {
            const countDemo = (rows)=>(rows ?? []).reduce((acc, r)=>{
                    const s = String(r?.uitslag ?? "").toLowerCase();
                    return acc + (s.includes("demo") || s.includes("demonstr") ? 1 : 0);
                }, 0);
            const totalR = toInt(ctx?.rood_totaal_wedstrijden_scrape);
            const totalB = toInt(ctx?.blauw_totaal_wedstrijden_scrape);
            const vaR = String(ctx?.rood_va_mm ?? ctx?.va_rood ?? ctx?.va_rood_mm ?? "").trim();
            const vaB = String(ctx?.blauw_va_mm ?? ctx?.va_blauw ?? ctx?.va_blauw_mm ?? "").trim();
            const rowsR = vaR ? uitslagenByVa.get(vaR) ?? [] : [];
            const rowsB = vaB ? uitslagenByVa.get(vaB) ?? [] : [];
            const demoR = ctx?.rood_demo_totaal !== null && ctx?.rood_demo_totaal !== undefined ? toInt(ctx?.rood_demo_totaal) : countDemo(rowsR);
            const demoB = ctx?.blauw_demo_totaal !== null && ctx?.blauw_demo_totaal !== undefined ? toInt(ctx?.blauw_demo_totaal) : countDemo(rowsB);
            const effR = Math.max(0, totalR - demoR + Math.floor(demoR / 3));
            const effB = Math.max(0, totalB - demoB + Math.floor(demoB / 3));
            const hasPrimaryTotals = ctx?.rood_totaal_wedstrijden_scrape !== null && ctx?.rood_totaal_wedstrijden_scrape !== undefined && ctx?.blauw_totaal_wedstrijden_scrape !== null && ctx?.blauw_totaal_wedstrijden_scrape !== undefined;
            if (!hasPrimaryTotals) {
                const tR = getCurrentTotalsAll(ctx?.rood_uitslagen_per_discipline);
                const tB = getCurrentTotalsAll(ctx?.blauw_uitslagen_per_discipline);
                const effR2 = effectiveFromTotals(tR);
                const effB2 = effectiveFromTotals(tB);
                if (effR2 == null || effB2 == null) {
                    pushHit({
                        matchmaking_id,
                        partij_nr,
                        bout_id,
                        rule: "Jeugd: partijverschil niet controleerbaar",
                        rule_code: "JEUGD_PARTIJVERSCHIL_GEEN_INFO",
                        resultaat: "ACTIE",
                        severity: "warning",
                        boodschap: "Geen (bruikbare) totalen gevonden voor rood en/of blauw — jeugd partijverschil-regel kan niet worden toegepast."
                    });
                } else {
                    const verschil2 = Math.abs(effR2 - effB2);
                    const minEff2 = Math.min(effR2, effB2);
                    if (minEff2 < 15 && verschil2 > 4) {
                        pushHit({
                            matchmaking_id,
                            partij_nr,
                            bout_id,
                            rule: "Jeugd: partijverschil te groot",
                            rule_code: "PARTIJVERSCHIL_DISPENSATIE",
                            resultaat: "DISPENSATIE",
                            severity: "warning",
                            boodschap: `Jeugd partijverschil: Rood ${effR2} partijen • Blauw ${effB2} partijen • Verschil ${verschil2}. Regel: zolang één van beide minder dan 15 partijen heeft, is maximaal 4 verschil toegestaan — DISPENSATIE vereist.`
                        });
                    }
                }
            } else {
                const verschil = Math.abs(effR - effB);
                const minEff = Math.min(effR, effB);
                if (minEff < 15 && verschil > 4) {
                    pushHit({
                        matchmaking_id,
                        partij_nr,
                        bout_id,
                        rule: "Jeugd: partijverschil te groot",
                        rule_code: "PARTIJVERSCHIL_DISPENSATIE",
                        resultaat: "DISPENSATIE",
                        severity: "warning",
                        boodschap: `Jeugd partijverschil: Rood ${effR} partijen • Blauw ${effB} partijen • Verschil ${verschil}. Regel: zolang één van beide minder dan 15 partijen heeft, is maximaal 4 verschil toegestaan — DISPENSATIE vereist.`
                    });
                }
            }
        }
        // volwassen KB/MT klasse
        if (volwassenen && isKickboksMuayThai(ctx)) {
            const boutK = parseKbMmKlasseToLetter(ctx?.klasse_mm);
            const vaR = String(ctx?.rood_va_mm ?? "").trim();
            const vaB = String(ctx?.blauw_va_mm ?? "").trim();
            const rowsR = vaR ? uitslagenByVa.get(vaR) ?? [] : [];
            const rowsB = vaB ? uitslagenByVa.get(vaB) ?? [] : [];
            const histRowsR = hoogsteKlasseUitUitslagen(rowsR);
            const histRowsB = hoogsteKlasseUitUitslagen(rowsB);
            const baseR = histRowsR ?? "N";
            const baseB = histRowsB ?? "N";
            const recR = recordInKlasse(rowsR, baseR);
            const recB = recordInKlasse(rowsB, baseB);
            const roodK = promoteFrom(baseR, recR.wins, recR.total);
            const blauwK = promoteFrom(baseB, recB.wins, recB.total);
            const roodOk = canFightAdultKbMtBoutClass(roodK, boutK);
            const blauwOk = canFightAdultKbMtBoutClass(blauwK, boutK);
            if (boutK && (!roodOk || !blauwOk)) {
                pushHit({
                    matchmaking_id,
                    partij_nr,
                    bout_id,
                    rule: "Volwassen: verkeerde klasse",
                    rule_code: "VOLWASSEN_VERKEERDE_KLASSE",
                    resultaat: "DISPENSATIE",
                    severity: "warning",
                    boodschap: `Boutklasse klopt niet: ingevoerd ${boutK}. Advies op basis van uitslagen: Rood mag maximaal ${roodK}, Blauw mag maximaal ${blauwK}. Let op: DISPENSATIE verplicht.`
                });
            }
        }
    }
    // gala tijd alleen bij full-run
    if (!scopedBoutId && scopedPartijNr == null) {
        const bt = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$galaTime$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["estimateGalaTimeFromContextRows"])(rows);
        if (bt.total_minutes > bt.warning_over_minutes) {
            const overMax = bt.total_minutes > bt.max_with_hoofdofficial_minutes;
            hits.push({
                matchmaking_id,
                partij_nr: null,
                bout_id: null,
                rule: "Gala tijdsduur",
                rule_code: overMax ? "GALA_DUUR_AFKEUR" : "GALA_DUUR_WAARSCHUWING",
                resultaat: overMax ? "AFKEUR" : "ACTIE",
                severity: overMax ? "error" : "warning",
                boodschap: `Geschatte gala-duur: ${(0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$galaTime$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["formatMinutesNL"])(bt.total_minutes)} (≈ ${(0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$galaTime$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["formatHoursQuarterNL"])(bt.total_hours_quarter_ceil)} uur, kwartier-afronding). ${overMax ? `Boven maximum (${(0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$galaTime$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["formatMinutesNL"])(bt.max_with_hoofdofficial_minutes)}) — AFKEUR.` : `Boven 6.5 uur (${(0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$galaTime$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["formatMinutesNL"])(bt.warning_over_minutes)}) — Hoofdofficial akkoord nodig.`}`
            });
        }
    }
    await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$control$2f$saveControleResultaten$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["saveControleResultaten"])({
        controle_run_id,
        matchmaking_id,
        hits,
        ...scopedBoutId ? {
            bout_id: scopedBoutId
        } : {},
        ...scopedBoutId == null && scopedPartijNr != null ? {
            partij_nr: scopedPartijNr
        } : {}
    });
    return hits;
}
}),
"[project]/app/api/_utils/authz.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "assertCanAccessMatchmaking",
    ()=>assertCanAccessMatchmaking,
    "getMatchmakingMeta",
    ()=>getMatchmakingMeta,
    "getMatchmakingOwner",
    ()=>getMatchmakingOwner,
    "getUserBondteam",
    ()=>getUserBondteam,
    "getUserRole",
    ()=>getUserRole,
    "requireAdmin",
    ()=>requireAdmin,
    "requireAnyRole",
    ()=>requireAnyRole,
    "requireUserWithRole",
    ()=>requireUserWithRole,
    "supabaseAdmin",
    ()=>supabaseAdmin
]);
// app/api/_utils/authz.ts
// Auth + authorization helpers for API routes.
// Uses service role to verify bearer tokens and to read roles / ownership.
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$supabase$2f$supabase$2d$js$2f$dist$2f$index$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/@supabase/supabase-js/dist/index.mjs [app-route] (ecmascript) <locals>");
;
const supabaseAdmin = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$supabase$2f$supabase$2d$js$2f$dist$2f$index$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$locals$3e$__["createClient"])(("TURBOPACK compile-time value", "https://krskuyaqvzloptfndznc.supabase.co"), process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
        persistSession: false
    }
});
function getBearerToken(req) {
    const h = req.headers.get("authorization") || req.headers.get("Authorization") || "";
    const token = h.toLowerCase().startsWith("bearer ") ? h.slice(7).trim() : null;
    return token && token.length ? token : null;
}
function normalizeRole(v) {
    const r = String(v ?? "").trim().toLowerCase();
    if (r === "superadmin" || r === "admin" || r === "matchmaker" || r === "official" || r === "hoofdofficial" || r === "dispensatie_admin") {
        return r;
    }
    return "unknown";
}
async function getUserRole(userId) {
    // 1) user_profiles.role
    const { data: prof, error: pErr } = await supabaseAdmin.from("user_profiles").select("role").eq("id", userId).maybeSingle();
    if (!pErr) {
        const r = normalizeRole(prof?.role);
        if (r !== "unknown") return r;
    }
    // 2) legacy: user_roles + roles
    const { data, error } = await supabaseAdmin.from("user_roles").select(`
      role_id,
      roles:roles ( name )
    `).eq("user_id", userId).maybeSingle();
    if (error) {
        console.error("[authz:getUserRole]", error);
        return "unknown";
    }
    const roleName = data?.roles?.name;
    return normalizeRole(roleName);
}
async function requireUserWithRole(req) {
    const token = getBearerToken(req);
    if (!token) throw new Response("Unauthorized", {
        status: 401
    });
    const { data: userData, error: userErr } = await supabaseAdmin.auth.getUser(token);
    if (userErr || !userData?.user?.id) throw new Response("Unauthorized", {
        status: 401
    });
    const userId = userData.user.id;
    const role = await getUserRole(userId);
    return {
        userId,
        role
    };
}
async function requireAdmin(req) {
    const { userId, role } = await requireUserWithRole(req);
    if (role !== "admin" && role !== "superadmin") throw new Response("Forbidden", {
        status: 403
    });
    return {
        userId,
        role
    };
}
async function requireAnyRole(req, allowed) {
    const { userId, role } = await requireUserWithRole(req);
    if (role === "superadmin") return {
        userId,
        role
    };
    if (!allowed.includes(role)) throw new Response("Forbidden", {
        status: 403
    });
    return {
        userId,
        role
    };
}
async function getUserBondteam(userId) {
    const { data, error } = await supabaseAdmin.from("user_profiles").select("bondteam").eq("id", userId).maybeSingle();
    if (error) {
        console.error("[authz:getUserBondteam]", error);
        return null;
    }
    const bt = data?.bondteam;
    return bt ? String(bt) : null;
}
async function getMatchmakingMeta(matchmaking_id) {
    const { data, error } = await supabaseAdmin.from("matchmaking_uploads").select("uploaded_by, bondteam").eq("matchmaking_id", matchmaking_id).order("uploaded_at", {
        ascending: false
    }).limit(1).maybeSingle();
    if (error) {
        console.error("[authz:getMatchmakingMeta]", error);
        return null;
    }
    return {
        uploaded_by: data?.uploaded_by ? String(data.uploaded_by) : null,
        bondteam: data?.bondteam ? String(data.bondteam) : null
    };
}
async function getMatchmakingOwner(matchmaking_id) {
    const meta = await getMatchmakingMeta(matchmaking_id);
    return meta?.uploaded_by ?? null;
}
async function assertCanAccessMatchmaking(opts) {
    const { matchmaking_id, userId, role } = opts;
    if (role === "admin" || role === "superadmin") return;
    const meta = await getMatchmakingMeta(matchmaking_id);
    const owner = meta?.uploaded_by ?? null;
    const mmBond = meta?.bondteam ?? null;
    if (role === "matchmaker") {
        if (!owner || owner !== userId) throw new Response("Forbidden", {
            status: 403
        });
        return;
    }
    if (role === "official" || role === "hoofdofficial") {
        const userBond = await getUserBondteam(userId);
        if (!userBond || !mmBond || String(userBond) !== String(mmBond)) {
            throw new Response("Forbidden", {
                status: 403
            });
        }
        return;
    }
    throw new Response("Forbidden", {
        status: 403
    });
}
;
}),
"[project]/app/api/control-engine/start/route.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "POST",
    ()=>POST,
    "runtime",
    ()=>runtime
]);
// app/api/control-engine/start/route.ts
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/server.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$externals$5d2f$child_process__$5b$external$5d$__$28$child_process$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/child_process [external] (child_process, cjs)");
var __TURBOPACK__imported__module__$5b$externals$5d2f$path__$5b$external$5d$__$28$path$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/path [external] (path, cjs)");
var __TURBOPACK__imported__module__$5b$externals$5d2f$fs__$5b$external$5d$__$28$fs$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/fs [external] (fs, cjs)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$supabase$2f$supabase$2d$js$2f$dist$2f$index$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/@supabase/supabase-js/dist/index.mjs [app-route] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$control$2f$buildControleBoutContext$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/control/buildControleBoutContext.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$control$2f$enrichControleBoutContext$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/control/enrichControleBoutContext.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$rulesEngine$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/rulesEngine.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$app$2f$api$2f$_utils$2f$authz$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/app/api/_utils/authz.ts [app-route] (ecmascript)");
;
;
;
;
;
;
;
;
;
const runtime = "nodejs";
const supabase = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$supabase$2f$supabase$2d$js$2f$dist$2f$index$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$locals$3e$__["createClient"])(("TURBOPACK compile-time value", "https://krskuyaqvzloptfndznc.supabase.co"), process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
        persistSession: false
    }
});
const DEBUG = process.env.CONTROL_ENGINE_DEBUG === "1";
function dlog(...args) {
    if (DEBUG) console.log(...args);
}
function toVaStrict(v) {
    if (v == null) return null;
    const s = String(v).trim();
    const digits = s.replace(/[^0-9]/g, "");
    return /^\d{3,5}$/.test(digits) ? digits : null;
}
function pickVA(b, side) {
    if (side === "rood") {
        return toVaStrict(b.rood_va) ?? toVaStrict(b.va_rood) ?? toVaStrict(b.rood_va_mm) ?? null;
    }
    return toVaStrict(b.blauw_va) ?? toVaStrict(b.va_blauw) ?? toVaStrict(b.blauw_va_mm) ?? null;
}
function resolveScriptPath(...parts) {
    const root = process.cwd();
    const candidates = [
        __TURBOPACK__imported__module__$5b$externals$5d2f$path__$5b$external$5d$__$28$path$2c$__cjs$29$__["default"].join(root, ...parts),
        __TURBOPACK__imported__module__$5b$externals$5d2f$path__$5b$external$5d$__$28$path$2c$__cjs$29$__["default"].join(root, "ControlEngine", ...parts),
        __TURBOPACK__imported__module__$5b$externals$5d2f$path__$5b$external$5d$__$28$path$2c$__cjs$29$__["default"].join(root, "ControlEngine", "ControlEngine", ...parts)
    ];
    for (const p of candidates){
        if (__TURBOPACK__imported__module__$5b$externals$5d2f$fs__$5b$external$5d$__$28$fs$2c$__cjs$29$__["default"].existsSync(p)) return p;
    }
    throw new Error(`Script niet gevonden:\n- ${candidates.join("\n- ")}`);
}
function clampInt(n, def, min, max) {
    const num = Number(n);
    if (!Number.isFinite(num)) return def;
    const v = Math.floor(num);
    return Math.max(min, Math.min(max, v));
}
function runNodeScript(scriptPath, args, envExtra, logPrefix) {
    return new Promise((resolve, reject)=>{
        const t0 = Date.now();
        const proc = (0, __TURBOPACK__imported__module__$5b$externals$5d2f$child_process__$5b$external$5d$__$28$child_process$2c$__cjs$29$__["spawn"])("node", [
            scriptPath,
            ...args
        ], {
            stdio: [
                "ignore",
                "pipe",
                "pipe"
            ],
            shell: false,
            cwd: __TURBOPACK__imported__module__$5b$externals$5d2f$path__$5b$external$5d$__$28$path$2c$__cjs$29$__["default"].dirname(scriptPath),
            windowsHide: true,
            env: {
                ...process.env,
                ...envExtra
            }
        });
        let stdout = "";
        let stderr = "";
        proc.stdout.on("data", (d)=>{
            const s = d.toString();
            stdout += s;
            process.stdout.write(logPrefix ? `[${logPrefix}] ${s}` : s);
        });
        proc.stderr.on("data", (d)=>{
            const s = d.toString();
            stderr += s;
            process.stderr.write(logPrefix ? `[${logPrefix}] ${s}` : s);
        });
        proc.on("error", (err)=>{
            const ms = Date.now() - t0;
            reject(new Error(`Script spawn error: ${err?.message ?? err}\n(ms=${ms})\n\nSTDERR:\n${stderr}\n\nSTDOUT:\n${stdout}`));
        });
        proc.on("close", (code)=>{
            const ms = Date.now() - t0;
            if (code === 0) {
                resolve({
                    stdout,
                    stderr,
                    ms
                });
            } else {
                reject(new Error(`Script failed: ${scriptPath} (exit code ${code})\n(ms=${ms})\n\nSTDERR:\n${stderr}\n\nSTDOUT:\n${stdout}`));
            }
        });
    });
}
function uniqueBy(arr, getKey) {
    const seen = new Set();
    const out = [];
    for (const row of arr){
        const key = getKey(row);
        if (!key) continue;
        if (seen.has(key)) continue;
        seen.add(key);
        out.push(row);
    }
    return out;
}
async function POST(req) {
    let controle_run_id = null;
    try {
        const body = await req.json();
        const matchmaking_id = body?.matchmaking_id;
        const do_scrape = body?.do_scrape !== false;
        const workers = clampInt(body?.workers ?? 8, 8, 1, 20);
        const stagger_ms = clampInt(body?.stagger_ms ?? 250, 250, 0, 5000);
        const tab_attempts = clampInt(body?.tab_attempts ?? 8, 8, 1, 30);
        const soft_wait_ms = clampInt(body?.soft_wait_ms ?? 900, 900, 200, 5000);
        const between_attempts_ms = clampInt(body?.between_attempts_ms ?? 450, 450, 0, 5000);
        const fullfighter_timeout_ms = clampInt(body?.fullfighter_timeout_ms ?? 35000, 35000, 5000, 180000);
        const uitslagen_timeout_ms = clampInt(body?.uitslagen_timeout_ms ?? 90000, 90000, 5000, 240000);
        const uitslagen_tries = clampInt(body?.uitslagen_tries ?? 1, 1, 1, 5);
        if (!matchmaking_id) {
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: "matchmaking_id ontbreekt"
            }, {
                status: 400
            });
        }
        const { userId, role } = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$app$2f$api$2f$_utils$2f$authz$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["requireUserWithRole"])(req);
        await (0, __TURBOPACK__imported__module__$5b$project$5d2f$app$2f$api$2f$_utils$2f$authz$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["assertCanAccessMatchmaking"])({
            matchmaking_id,
            userId,
            role
        });
        const { data: runRows, error: runErr } = await supabase.from("controle_runs").insert({
            matchmaking_id,
            status: "running",
            gestart_op: new Date().toISOString(),
            run_type: "control-engine"
        }).select("id").limit(1);
        if (runErr) throw runErr;
        controle_run_id = runRows?.[0]?.id ?? null;
        if (!controle_run_id) {
            throw new Error("controle_run insert gaf geen id terug");
        }
        // Eerst oude werkdata van deze matchmaking opruimen,
        // zodat een nieuwe controle geen dubbele/oude context en resultaten laat zien.
        console.log("[control-engine/start] ▶ cleanup oude context/resultaten...", {
            matchmaking_id,
            controle_run_id
        });
        const { error: delResErr } = await supabase.from("controle_resultaten").delete().eq("matchmaking_id", matchmaking_id);
        if (delResErr) throw delResErr;
        const { error: delCtxErr } = await supabase.from("controle_bout_context").delete().eq("matchmaking_id", matchmaking_id);
        if (delCtxErr) throw delCtxErr;
        console.log("[control-engine/start] ✅ cleanup klaar");
        const { data: bouts, error: boutsErr } = await supabase.from("matchmaking_bouts_raw").select("*").eq("matchmaking_id", matchmaking_id).order("partij_nr", {
            ascending: true
        });
        if (boutsErr) throw boutsErr;
        const vaSet = new Set();
        (bouts ?? []).forEach((b)=>{
            const r = pickVA(b, "rood");
            const bl = pickVA(b, "blauw");
            if (r) vaSet.add(r);
            if (bl) vaSet.add(bl);
        });
        const va_nummers = [
            ...vaSet
        ].filter(Boolean);
        console.log("[control-engine/start] run", {
            matchmaking_id,
            controle_run_id,
            do_scrape,
            bouts: (bouts ?? []).length,
            va_count: va_nummers.length,
            workers,
            stagger_ms,
            tab_attempts,
            soft_wait_ms,
            between_attempts_ms,
            fullfighter_timeout_ms,
            uitslagen_timeout_ms,
            uitslagen_tries
        });
        dlog("[control-engine/start] va_sample", va_nummers.slice(0, 12));
        const fpBundlePath = resolveScriptPath("scrapers", "fp_bundle", "scraper_fp_bundle.js");
        dlog("[control-engine/start] fpBundlePath =", fpBundlePath);
        if (do_scrape && va_nummers.length > 0) {
            console.log("[control-engine/start] ▶ fp_bundle start", {
                va_count: va_nummers.length
            });
            try {
                const res = await runNodeScript(fpBundlePath, [
                    matchmaking_id,
                    controle_run_id,
                    ...va_nummers
                ], {
                    WORKERS: String(workers),
                    STAGGER_MS: String(stagger_ms),
                    TAB_ATTEMPTS: String(tab_attempts),
                    SOFT_WAIT_MS: String(soft_wait_ms),
                    BETWEEN_ATTEMPTS_MS: String(between_attempts_ms),
                    FULLFIGHTER_TIMEOUT_MS: String(fullfighter_timeout_ms),
                    UITSLAGEN_TIMEOUT_MS: String(uitslagen_timeout_ms),
                    UITSLAGEN_TRIES: String(uitslagen_tries)
                }, "fp_bundle");
                console.log("[control-engine/start] ✅ fp_bundle klaar", {
                    ms: res.ms,
                    va_count: va_nummers.length
                });
            } catch (e) {
                console.log("[control-engine/start] ❌ fp_bundle failed (continuing)", {
                    error: e?.message ?? String(e)
                });
            }
        } else {
            console.log("[control-engine/start] scrape skipped", {
                do_scrape,
                va_count: va_nummers.length
            });
        }
        console.log("[control-engine/start] ▶ buildControleBoutContext...");
        await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$control$2f$buildControleBoutContext$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["buildControleBoutContext"])(matchmaking_id, controle_run_id);
        console.log("[control-engine/start] ✅ buildControleBoutContext klaar");
        console.log("[control-engine/start] ▶ enrichControleBoutContext...");
        await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$control$2f$enrichControleBoutContext$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["enrichControleBoutContext"])(matchmaking_id, controle_run_id);
        console.log("[control-engine/start] ✅ enrichControleBoutContext klaar");
        console.log("[control-engine/start] ▶ load ctxRows for rulesEngine...");
        const { data: rawCtxRows, error: ctxErr } = await supabase.from("controle_bout_context").select("*").eq("matchmaking_id", matchmaking_id).order("partij_nr", {
            ascending: true
        }).order("created_at", {
            ascending: false
        });
        if (ctxErr) throw ctxErr;
        const ctxRowsCurrentRun = (rawCtxRows ?? []).filter((r)=>String(r?.controle_run_id ?? "") === String(controle_run_id));
        const ctxRows = ctxRowsCurrentRun.length > 0 ? ctxRowsCurrentRun : uniqueBy(rawCtxRows ?? [], (r)=>String(r?.bout_id ?? r?.bout_uid ?? `${r?.partij_nr ?? ""}-${r?.rood_va_mm ?? ""}-${r?.blauw_va_mm ?? ""}`));
        console.log("[control-engine/start] ✅ ctxRows loaded", {
            matchmaking_rows: rawCtxRows?.length ?? 0,
            current_run_rows: ctxRowsCurrentRun.length,
            rows_used_for_rules: ctxRows.length
        });
        if ((bouts?.length ?? 0) > 0 && (ctxRows?.length ?? 0) === 0) {
            throw new Error(`Geen controle_bout_context rows gevonden voor matchmaking ${matchmaking_id} na build/enrich. Bouts=${bouts?.length ?? 0}.`);
        }
        console.log("[control-engine/start] ▶ rulesEngine...");
        const hits = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$rulesEngine$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["rulesEngine"])({
            matchmaking_id,
            controle_run_id,
            ctxRows: ctxRows ?? []
        });
        console.log("[control-engine/start] ✅ rulesEngine klaar", {
            hits: Array.isArray(hits) ? hits.length : 0
        });
        console.log("[control-engine/start] ℹ️ saveControleResultaten gebeurt in rulesEngine zelf");
        if (DEBUG && Array.isArray(hits) && hits[0]) {
            console.log("[control-engine/start] hit_sample", hits[0]);
        }
        try {
            const { count } = await supabase.from("controle_resultaten").select("id", {
                count: "exact",
                head: true
            }).eq("controle_run_id", controle_run_id);
            console.log("[control-engine/start] controle_resultaten count", {
                count: count ?? null
            });
        } catch  {}
        await supabase.from("controle_runs").update({
            status: "klaar",
            afgerond_op: new Date().toISOString()
        }).eq("id", controle_run_id);
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            ok: true,
            matchmaking_id,
            controle_run_id,
            do_scrape,
            bouts: bouts?.length ?? 0,
            va_count: va_nummers.length,
            ctx_rows_used: ctxRows.length,
            workers,
            stagger_ms,
            tab_attempts,
            soft_wait_ms,
            between_attempts_ms,
            fullfighter_timeout_ms,
            uitslagen_timeout_ms,
            uitslagen_tries
        });
    } catch (err) {
        console.error("❌ ControlEngine fout:", err);
        if (controle_run_id) {
            await supabase.from("controle_runs").update({
                status: "failed",
                foutmelding: err?.message ?? "Onbekende fout",
                afgerond_op: new Date().toISOString()
            }).eq("id", controle_run_id);
        }
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            error: err?.message ?? "Onbekende fout",
            controle_run_id
        }, {
            status: 500
        });
    }
}
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__bab23062._.js.map