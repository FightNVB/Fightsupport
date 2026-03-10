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
"[project]/lib/shared/makeBoutId.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

// lib/shared/makeBoutId.ts
/**
 * Bout-ID (stabiel / immutable) op basis van bout_uid (uuid).
 *
 * Waarom:
 * - partij_nr kan wijzigen (hernummering)
 * - dispensatie status moet aan dezelfde bout-slot blijven hangen
 * - VA-paar kan wijzigen door vervanging en kan botsen bij rematch/toernooi
 *
 * Daarom is bout_uid (uuid) in matchmaking_bouts_raw de waarheid.
 */ __turbopack_context__.s([
    "makeBoutId",
    ()=>makeBoutId
]);
function makeBoutId(bout_uid) {
    const id = String(bout_uid ?? "").trim();
    if (!id) return null;
    // simpele uuid-check (laat ook bestaande strings toe)
    const uuidLike = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
    // Als het geen uuid lijkt: toch teruggeven (soms gebruik je tijdelijk een andere sleutel)
    // Wil je dit strict maken? vervang de return door: return uuidLike ? id : null;
    return uuidLike ? id : id;
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
// lib/control/buildControleBoutContext.ts
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$dayjs$2f$dayjs$2e$min$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/dayjs/dayjs.min.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabaseAdmin$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/supabaseAdmin.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$recordCalculator$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/recordCalculator.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$shared$2f$makeBoutId$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/shared/makeBoutId.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$externals$5d2f$crypto__$5b$external$5d$__$28$crypto$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/crypto [external] (crypto, cjs)");
;
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
    const s = String(v).trim().replace(",", ".");
    if (!s) return null;
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
    if (/^\d{1,5}$/.test(s)) return s;
    const digits = s.replace(/[^0-9]/g, "");
    if (/^\d{1,5}$/.test(digits)) return digits;
    return null;
}
async function fetchEvenementInfo(matchmaking_id) {
    // Primair: nieuwste matchmaking_uploads rij
    const { data, error } = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabaseAdmin$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["supabaseAdmin"].from("matchmaking_uploads").select("evenement_naam, evenement_datum, event_id").eq("matchmaking_id", matchmaking_id).order("uploaded_at", {
        ascending: false
    }).limit(1);
    if (error) throw error;
    let evenement_naam = toNullableStr(data?.[0]?.evenement_naam ?? null);
    let evenement_datum = toIsoDateOnly(data?.[0]?.evenement_datum ?? null);
    const event_id = toNullableStr(data?.[0]?.event_id ?? null);
    // Fallback: events tabel (als event_id bestaat en info (deels) ontbreekt)
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
// ✅ MMA: afleiden huidige klasse uit uitslagen (laatste partij)
function parseMmaFromUitslagKlasse(v) {
    const s = String(v ?? "").trim().toUpperCase();
    if (!s) return null;
    if (s === "P" || s === "PRO") return "PRO";
    if (s === "AMA" || s === "AMATEUR") return "AMATEUR";
    return null;
}
function latestUitslagByDatum(uitslagen) {
    if (!Array.isArray(uitslagen) || uitslagen.length === 0) return null;
    // probeer te sorteren op datum (YYYY-MM-DD). Als datum ontbreekt: laat originele volgorde staan.
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
    // 1) direct uit fighters_raw (als aanwezig)
    const direct = fighter?.mma_current_klasse ?? fighter?.mma_klasse ?? fighter?.current_mma_class ?? fighter?.rood_mma_current_klasse ?? fighter?.blauw_mma_current_klasse;
    const directParsed = parseMmaFromUitslagKlasse(direct);
    if (directParsed) return directParsed;
    // 2) anders: laatste partij in uitslagen_raw
    const last = latestUitslagByDatum(uitslagen);
    const parsed = parseMmaFromUitslagKlasse(last?.klasse);
    return parsed;
}
async function buildControleBoutContext(matchmaking_id, controle_run_id) {
    if (!matchmaking_id) throw new Error("[buildControleBoutContext] matchmaking_id ontbreekt");
    if (!controle_run_id) throw new Error("[buildControleBoutContext] controle_run_id ontbreekt");
    console.log("[buildControleBoutContext] start", {
        matchmaking_id,
        controle_run_id
    });
    // 1) bouts ophalen
    const { data: bouts, error: bErr } = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabaseAdmin$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["supabaseAdmin"].from("matchmaking_bouts_raw").select("*") // moet bout_uid bevatten
    .eq("matchmaking_id", matchmaking_id).order("partij_nr", {
        ascending: true
    });
    if (bErr) throw bErr;
    if (!bouts?.length) return;
    // 2) event info (naam + datum) waarheid
    const evInfo = await fetchEvenementInfo(matchmaking_id);
    const evenement_datum = evInfo.evenement_datum;
    const evenement_naam = evInfo.evenement_naam;
    if (!evenement_datum) console.warn("[buildControleBoutContext] evenement_datum is NULL", {
        matchmaking_id
    });
    if (!evenement_naam) console.warn("[buildControleBoutContext] evenement_naam is NULL", {
        matchmaking_id
    });
    // 3) VA’s verzamelen
    const vas = new Set();
    for (const p of bouts){
        const r = toVaStrict(p?.va_rood);
        const b = toVaStrict(p?.va_blauw);
        if (r) vas.add(r);
        if (b) vas.add(b);
    }
    // 4) fighters_raw bulk
    const fighterByVa = new Map();
    if (vas.size > 0) {
        const { data: fighters, error: fErr } = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabaseAdmin$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["supabaseAdmin"].from("fighters_raw").select("*").eq("matchmaking_id", matchmaking_id).eq("controle_run_id", controle_run_id).in("va_nummer", [
            ...vas
        ]);
        if (fErr) throw fErr;
        for (const f of fighters ?? [])fighterByVa.set(String(f.va_nummer), f);
    }
    // 5) uitslagen_raw bulk
    const uitslagenByVa = new Map();
    if (vas.size > 0) {
        const { data: uitslagen, error: uErr } = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabaseAdmin$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["supabaseAdmin"].from("uitslagen_raw").select("*").eq("matchmaking_id", matchmaking_id).eq("controle_run_id", controle_run_id).in("va_nummer", [
            ...vas
        ]);
        if (uErr) throw uErr;
        for (const r of uitslagen ?? []){
            const va = String(r.va_nummer);
            if (!uitslagenByVa.has(va)) uitslagenByVa.set(va, []);
            uitslagenByVa.get(va).push(r);
        }
    }
    // 6) oude context weg
    const { error: delCtxErr } = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabaseAdmin$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["supabaseAdmin"].from("controle_bout_context").delete().eq("matchmaking_id", matchmaking_id).eq("controle_run_id", controle_run_id);
    if (delCtxErr) throw delCtxErr;
    const { error: delUitsErr } = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabaseAdmin$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["supabaseAdmin"].from("controle_uitslagen").delete().eq("matchmaking_id", matchmaking_id).eq("controle_run_id", controle_run_id);
    if (delUitsErr) throw delUitsErr;
    // 7) rows bouwen
    const rowsToInsert = [];
    const uitslagenToInsert = [];
    for (const partij of bouts){
        const vaR = toVaStrict(partij?.va_rood);
        const vaB = toVaStrict(partij?.va_blauw);
        // ✅ VA wijziging (persistente bron): probeer 'oude MM VA' uit matchmaking_bouts_raw te lezen.
        // Belangrijk: controle_bout_context wordt per run opnieuw opgebouwd, dus 'prev' moet uit raw/audit komen.
        const vaRPrev = toVaStrict(partij?.rood_va_mm_prev ?? partij?.va_rood_prev ?? partij?.rood_va_prev ?? null);
        const vaBPrev = toVaStrict(partij?.blauw_va_mm_prev ?? partij?.va_blauw_prev ?? partij?.blauw_va_prev ?? null);
        const uitslagenR = vaR ? uitslagenByVa.get(vaR) ?? [] : [];
        const uitslagenB = vaB ? uitslagenByVa.get(vaB) ?? [] : [];
        const partijNr = partij?.partij_nr ?? null;
        // ✅ bout_id = immutable (uuid uit matchmaking_bouts_raw.bout_uid)
        let bout_id = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$shared$2f$makeBoutId$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["makeBoutId"])(partij?.bout_uid);
        if (!bout_id) {
            // ❗ Dit mag eigenlijk nooit meer gebeuren als de parser altijd bout_uid zet.
            // Maar: liever NIET een hele partij verliezen. We maken dan een nieuwe uuid, loggen hard,
            // en schrijven hem meteen terug naar matchmaking_bouts_raw zodat het vanaf nu stabiel is.
            const newUid = __TURBOPACK__imported__module__$5b$externals$5d2f$crypto__$5b$external$5d$__$28$crypto$2c$__cjs$29$__["default"].randomUUID();
            console.error("[buildControleBoutContext] FATAAL: bout_uid ontbreekt/ongeldig -> maak nieuwe bout_uid", {
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
            // probeer te herstellen in raw-tabel (beste effort)
            if (partijNr != null) {
                try {
                    await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabaseAdmin$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["supabaseAdmin"].from("matchmaking_bouts_raw").update({
                        bout_uid: newUid
                    }).eq("matchmaking_id", matchmaking_id).eq("partij_nr", partijNr).is("bout_uid", null);
                } catch (e) {
                    console.warn("[buildControleBoutContext] herstel bout_uid mislukt (non-fatal)", e);
                }
            }
            // gebruik nieuwe uid als bout_id
            // (makeBoutId accepteert uuid-string)
            partij.bout_uid = newUid;
        }
        bout_id = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$shared$2f$makeBoutId$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["makeBoutId"])(partij.bout_uid);
        // ✅ uitslagen klaarzetten voor controle_uitslagen (met bout_id)
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
                        uitslag: u?.uitslag ?? null
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
                        uitslag: u?.uitslag ?? null
                    });
                }
            }
        }
        const fr = vaR ? fighterByVa.get(vaR) : null;
        const fb = vaB ? fighterByVa.get(vaB) : null;
        const currentClass = partij?.klasse ?? partij?.klasse_mm ?? null;
        const recRClass = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$recordCalculator$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["buildClassAwareRecord"])(uitslagenR, currentClass);
        const recBClass = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$recordCalculator$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["buildClassAwareRecord"])(uitslagenB, currentClass);
        const flatR = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$recordCalculator$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["totalsToFlat"])(recRClass.current._all);
        const flatB = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$recordCalculator$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["totalsToFlat"])(recBClass.current._all);
        const histR = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$recordCalculator$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["totalsToFlat"])(recRClass.historic._all);
        const histB = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$recordCalculator$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["totalsToFlat"])(recBClass.historic._all);
        const rood_leeftijd_event = fr?.geboortedatum && evenement_datum ? calcAgeYears(fr.geboortedatum, evenement_datum) : null;
        const blauw_leeftijd_event = fb?.geboortedatum && evenement_datum ? calcAgeYears(fb.geboortedatum, evenement_datum) : null;
        // ✅ MMA: current klasse uit fighters_raw of laatste uitslag (P=PRO, AMA=AMATEUR)
        const rood_mma_current_klasse = resolveMmaCurrentKlasse(fr, uitslagenR);
        const blauw_mma_current_klasse = resolveMmaCurrentKlasse(fb, uitslagenB);
        rowsToInsert.push({
            controle_run_id,
            upload_id: partij?.upload_id ?? null,
            partij_nr: partij?.partij_nr ?? null,
            matchmaking_id: partij?.matchmaking_id ?? matchmaking_id,
            // ✅ stabiele bout sleutel (uuid)
            bout_id,
            discipline: partij?.discipline ?? null,
            klasse_mm: partij?.klasse ?? null,
            is_toernooi: toNullableBool(partij?.is_toernooi ?? partij?.toernooi),
            max_gewicht: toNullableNumber(partij?.max_gewicht),
            rood_naam_mm: toNullableStr(partij?.rood_naam),
            rood_gym_mm: toNullableStr(partij?.rood_gym),
            rood_gewicht_mm: toNullableNumber(partij?.rood_gewicht),
            rood_va_mm: vaR,
            // ✅ Als matchmaker VA is gecorrigeerd: toon zowel oude (MM) als nieuwe (huidig)
            // (prev blijft leeg als er nooit een wijziging is geweest)
            rood_va_mm_prev: vaRPrev,
            blauw_naam_mm: toNullableStr(partij?.blauw_naam),
            blauw_gym_mm: toNullableStr(partij?.blauw_gym),
            blauw_gewicht_mm: toNullableNumber(partij?.blauw_gewicht),
            blauw_va_mm: vaB,
            blauw_va_mm_prev: vaBPrev,
            evenement_naam: evenement_naam ?? null,
            evenement_datum: evenement_datum ?? null,
            // fighters_raw
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
            rood_record_w: flatR.record_w,
            rood_record_l: flatR.record_l,
            rood_record_d: flatR.record_d,
            rood_record_o: flatR.record_o,
            blauw_record_w: flatB.record_w,
            blauw_record_l: flatB.record_l,
            blauw_record_d: flatB.record_d,
            blauw_record_o: flatB.record_o,
            rood_demo: flatR.demo_totaal,
            blauw_demo: flatB.demo_totaal,
            rood_historisch_w: histR.record_w,
            rood_historisch_l: histR.record_l,
            rood_historisch_d: histR.record_d,
            rood_historisch_o: histR.record_o,
            rood_historisch_demo: histR.demo_totaal,
            rood_historisch_totaal: histR.partijen_historie,
            rood_historisch_overige_discipline: recRClass.historic_other_discipline_total,
            blauw_historisch_w: histB.record_w,
            blauw_historisch_l: histB.record_l,
            blauw_historisch_d: histB.record_d,
            blauw_historisch_o: histB.record_o,
            blauw_historisch_demo: histB.demo_totaal,
            blauw_historisch_totaal: histB.partijen_historie,
            blauw_historisch_overige_discipline: recBClass.historic_other_discipline_total,
            rood_uitslagen_per_discipline: recRClass,
            blauw_uitslagen_per_discipline: recBClass
        });
    }
    // 8) insert controle_uitslagen (chunks)
    if (uitslagenToInsert.length > 0) {
        const chunkSize = 500;
        for(let i = 0; i < uitslagenToInsert.length; i += chunkSize){
            const chunk = uitslagenToInsert.slice(i, i + chunkSize);
            const { error: uInsErr } = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabaseAdmin$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["supabaseAdmin"].from("controle_uitslagen").insert(chunk);
            if (uInsErr) throw uInsErr;
        }
    }
    // 9) insert controle_bout_context
    if (rowsToInsert.length > 0) {
        const { error: insErr } = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabaseAdmin$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["supabaseAdmin"].from("controle_bout_context").upsert(rowsToInsert, {
            onConflict: "controle_run_id,partij_nr"
        });
        if (insErr) throw insErr;
    }
    console.log("[buildControleBoutContext] klaar", {
        matchmaking_id,
        controle_run_id,
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
/**
 * ============================================================
 * 🔎 NORMALISATIE & MATCHING HELPERS — SPORTSCHOOL ZOEKER
 * ============================================================
 */ function norm(s) {
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
function normPlaats(s) {
    const x = String(s ?? "").toLowerCase().replace(/\u00a0/g, " ").replace(/\(.*?\)/g, " ").replace(/[^a-z0-9à-ÿ\s]/gi, " ").replace(/\s+/g, " ").trim();
    return x;
}
function compactNorm(s) {
    return String(s ?? "").replace(/\s+/g, "").trim();
}
function normLand(v) {
    return String(v ?? "").trim().toLowerCase().replace(/\./g, "");
}
function isNL(v) {
    const s = normLand(v);
    return s === "nl" || s === "nederland" || s === "the netherlands";
}
function isBE(v) {
    const s = normLand(v);
    return s === "be" || s === "belgie" || s === "belgië" || s === "belgium";
}
function isDE(v) {
    const s = normLand(v);
    return s === "de" || s === "duitsland" || s === "germany" || s === "deutschland";
}
function detectLandHintFromGymText(rawGym) {
    const s = String(rawGym ?? "").toLowerCase().replace(/\u00a0/g, " ").replace(/\(.*?\)/g, " ").replace(/[^a-z0-9à-ÿ\s]/gi, " ").replace(/\s+/g, " ").trim();
    if (s.includes("belgie") || s.includes("belgië") || s.includes("belgium") || /\bbe\b/.test(s)) return "BE";
    if (s.includes("duitsland") || s.includes("germany") || s.includes("deutschland") || /\bde\b/.test(s)) return "DE";
    if (s.includes("nederland") || /\bnl\b/.test(s)) return "NL";
    return null;
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
function findGymMatch(sportscholen, gymNaam, aliasMaps) {
    const gRaw = String(gymNaam ?? "").trim();
    const g = norm(gRaw);
    if (!g) return {
        row: null,
        reason: "Lege/ongeldige sportschoolnaam."
    };
    const list = sportscholen ?? [];
    const inputPlaatsHint = normPlaats(gRaw);
    if (aliasMaps) {
        const gNorm = g;
        const gCompact = compactNorm(gNorm);
        const id1 = aliasMaps.aliasNormToId.get(gNorm);
        const id2 = aliasMaps.aliasCompactToId.get(gCompact);
        const sid = id1 ?? id2;
        if (sid) {
            const hit = findSportschoolBySportschoolId(list, sid);
            if (hit) return {
                row: hit,
                reason: null
            };
            return {
                row: null,
                reason: `Alias gevonden maar sportschool_id ${String(sid)} bestaat niet in sportscholen.sportschool_id (controleer data).`
            };
        }
    }
    const toks = g.split(" ").filter(Boolean).sort((a, b)=>b.length - a.length);
    const key = toks[0] ?? "";
    const exactHits = list.filter((x)=>norm(x?.naam) === g);
    if (exactHits.length === 1) return {
        row: exactHits[0],
        reason: null
    };
    if (exactHits.length > 1) {
        const withPlaats = exactHits.filter((x)=>{
            const p = normPlaats(x?.plaats ?? x?.stad ?? "");
            return p && inputPlaatsHint.includes(p);
        });
        if (withPlaats.length === 1) return {
            row: withPlaats[0],
            reason: null
        };
        const nl = exactHits.find((x)=>isNL(x?.land ?? x?.country));
        return {
            row: nl ?? exactHits[0],
            reason: null
        };
    }
    const gCompact = compactNorm(g);
    const exactCompactHits = list.filter((x)=>compactNorm(norm(x?.naam)) === gCompact);
    if (exactCompactHits.length === 1) return {
        row: exactCompactHits[0],
        reason: null
    };
    if (exactCompactHits.length > 1) {
        const nl = exactCompactHits.find((x)=>isNL(x?.land ?? x?.country));
        return {
            row: nl ?? exactCompactHits[0],
            reason: null
        };
    }
    const subsetHits = list.filter((x)=>{
        const n = norm(x?.naam);
        if (!n) return false;
        const ok = isTokenSubset(n, g) || isTokenSubset(g, n);
        if (!ok) return false;
        const gTokCount = tokenSet(g).size;
        if (gTokCount >= 2) {
            const inter = intersectionCount(g, n);
            if (inter < 2) return false;
        }
        if (tokenSet(g).size === 1 && !inputPlaatsHint) return false;
        return true;
    });
    if (subsetHits.length === 1) return {
        row: subsetHits[0],
        reason: null
    };
    if (subsetHits.length > 1) {
        const nl = subsetHits.find((x)=>isNL(x?.land ?? x?.country));
        return {
            row: nl ?? subsetHits[0],
            reason: null
        };
    }
    let best = null;
    let bestScore = -1;
    let bestSecond = null;
    let bestSecondScore = -1;
    for (const x of list){
        const nameN = norm(x?.naam);
        if (!nameN) continue;
        const ov = overlapScore(g, nameN);
        const d = levenshtein(compactNorm(g), compactNorm(nameN));
        const len = Math.max(1, Math.max(compactNorm(g).length, compactNorm(nameN).length));
        const distScore = 1 - Math.min(1, d / len);
        let score = ov * 0.75 + distScore * 0.25;
        const p = normPlaats(x?.plaats ?? x?.stad ?? "");
        if (p && inputPlaatsHint.includes(p)) score += 0.12;
        if (key && nameN.includes(key)) score += 0.06;
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
    if (best && bestScore >= 0.68) {
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
async function enrichControleBoutContext(matchmaking_id, controle_run_id) {
    if (!matchmaking_id) throw new Error("matchmaking_id ontbreekt");
    if (!controle_run_id) throw new Error("controle_run_id ontbreekt");
    const { data: ctxRows, error: cErr } = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabaseAdmin$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["supabaseAdmin"].from("controle_bout_context").select("bout_id, rood_gym_mm, blauw_gym_mm, evenement_datum").eq("matchmaking_id", matchmaking_id).eq("controle_run_id", controle_run_id);
    if (cErr) throw cErr;
    if (!ctxRows || ctxRows.length === 0) return;
    const sportscholen = await fetchAllSportscholen();
    const aliases = await fetchAllSportschoolAliases();
    const aliasNormToId = new Map();
    const aliasCompactToId = new Map();
    for (const a of aliases ?? []){
        const raw = String(a?.alias_text ?? "").trim();
        const sid = a?.sportschool_id;
        if (!raw || sid == null) continue;
        const n = norm(raw);
        if (!n) continue;
        const c = compactNorm(n);
        if (!aliasNormToId.has(n)) aliasNormToId.set(n, String(sid));
        if (!aliasCompactToId.has(c)) aliasCompactToId.set(c, String(sid));
    }
    const aliasMaps = {
        aliasNormToId,
        aliasCompactToId
    };
    console.log("[enrichControleBoutContext] sportscholen loaded:", sportscholen.length);
    console.log("[enrichControleBoutContext] aliases loaded:", aliases.length);
    console.log("[enrichControleBoutContext] alias keys:", aliasNormToId.size);
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
        // ✅ altijd MM sportschool in tekst, met marker om in UI oranje te maken
        const mmLine = (gym)=>gym ? `↳ [MM sportschool:] "${gym}"` : `↳ [MM sportschool:] -`;
        // ---- ROOD ----
        if (!rood) {
            patch.keurmerk_rood = null;
            patch.keurmerk_reden_rood = roodGym ? `${mmLine(roodGym)}\nGeen match in sportscholen. ${roodMatch.reason ?? ""}`.trim() : `${mmLine("")}\nGeen sportschool opgegeven.`.trim();
        } else {
            const hint = detectLandHintFromGymText(roodGym);
            const landDb = rood?.land ?? rood?.country ?? null;
            const land = landDb ?? (hint === "BE" ? "België" : hint === "DE" ? "Duitsland" : hint === "NL" ? "Nederland" : null);
            const eindeIso = toIsoDateOnly(rood?.keurmerk_eind ?? rood?.keurmerk_einde ?? rood?.einde_keurmerk);
            const matchInfo = `${mmLine(roodGym)}\n` + `↳ gematcht met "${rood.naam}" (${rood.plaats ?? rood.stad ?? "?"}, ${land ?? "?"})`;
            const isForeign = land && !isNL(land) || hint === "BE" || hint === "DE";
            if (isForeign) {
                patch.keurmerk_rood = true;
                const be = land && isBE(land) || hint === "BE";
                if (be) {
                    patch.keurmerk_reden_rood = `⚠️ België — controleer sportschool op BKMO/BKBMO site + boksboekje. Land: ${land ?? "België"}.\n` + matchInfo;
                } else {
                    patch.keurmerk_reden_rood = `✅ Buitenland (${land ?? "onbekend"}) — NL keurmerk niet vereist.\n` + matchInfo;
                }
            } else {
                const eventDate = toIsoDateOnly(row.evenement_datum);
                if (!eindeIso) {
                    patch.keurmerk_rood = false;
                    patch.keurmerk_reden_rood = `❌ Geen keurmerk data.\n${matchInfo}`;
                } else if (!eventDate) {
                    patch.keurmerk_rood = false;
                    patch.keurmerk_reden_rood = `❌ Geen evenement datum bekend om keurmerk te valideren. Keurmerk eindigt op ${eindeIso}.\n${matchInfo}`;
                } else if ((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$dayjs$2f$dayjs$2e$min$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["default"])(eindeIso).isBefore((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$dayjs$2f$dayjs$2e$min$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["default"])(eventDate), "day")) {
                    patch.keurmerk_rood = false;
                    patch.keurmerk_reden_rood = `❌ Geen geldig keurmerk op evenement (einde ${eindeIso}, event ${eventDate}).\n${matchInfo}`;
                } else {
                    patch.keurmerk_rood = true;
                    patch.keurmerk_reden_rood = `✅ Geldig keurmerk op evenement (einde ${eindeIso}, event ${eventDate}).\n${matchInfo}`;
                }
            }
        }
        // ---- BLAUW ----
        if (!blauw) {
            patch.keurmerk_blauw = null;
            patch.keurmerk_reden_blauw = blauwGym ? `${mmLine(blauwGym)}\nGeen match in sportscholen. ${blauwMatch.reason ?? ""}`.trim() : `${mmLine("")}\nGeen sportschool opgegeven.`.trim();
        } else {
            const hint = detectLandHintFromGymText(blauwGym);
            const landDb = blauw?.land ?? blauw?.country ?? null;
            const land = landDb ?? (hint === "BE" ? "België" : hint === "DE" ? "Duitsland" : hint === "NL" ? "Nederland" : null);
            const eindeIso = toIsoDateOnly(blauw?.keurmerk_eind ?? blauw?.keurmerk_einde ?? blauw?.einde_keurmerk);
            const matchInfo = `${mmLine(blauwGym)}\n` + `↳ gematcht met "${blauw.naam}" (${blauw.plaats ?? blauw.stad ?? "?"}, ${land ?? "?"})`;
            const isForeign = land && !isNL(land) || hint === "BE" || hint === "DE";
            if (isForeign) {
                patch.keurmerk_blauw = true;
                const be = land && isBE(land) || hint === "BE";
                if (be) {
                    patch.keurmerk_reden_blauw = `⚠️ België — controleer sportschool op BKBMO site + boksboekje. Land: ${land ?? "België"}.\n` + matchInfo;
                } else {
                    patch.keurmerk_reden_blauw = `✅ Buitenland (${land ?? "onbekend"}) — NL keurmerk niet vereist.\n` + matchInfo;
                }
            } else {
                const eventDate = toIsoDateOnly(row.evenement_datum);
                if (!eindeIso) {
                    patch.keurmerk_blauw = false;
                    patch.keurmerk_reden_blauw = `❌ Geen keurmerk data.\n${matchInfo}`;
                } else if (!eventDate) {
                    patch.keurmerk_blauw = false;
                    patch.keurmerk_reden_blauw = `❌ Geen evenement datum bekend om keurmerk te valideren. Keurmerk eindigt op ${eindeIso}.\n${matchInfo}`;
                } else if ((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$dayjs$2f$dayjs$2e$min$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["default"])(eindeIso).isBefore((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$dayjs$2f$dayjs$2e$min$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["default"])(eventDate), "day")) {
                    patch.keurmerk_blauw = false;
                    patch.keurmerk_reden_blauw = `❌ Geen geldig keurmerk op evenement (einde ${eindeIso}, event ${eventDate}).\n${matchInfo}`;
                } else {
                    patch.keurmerk_blauw = true;
                    patch.keurmerk_reden_blauw = `✅ Geldig keurmerk op evenement (einde ${eindeIso}, event ${eventDate}).\n${matchInfo}`;
                }
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
    const n = Number(String(v ?? "").trim());
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
    if (!controle_run_id) throw new Error("[saveControleResultaten] controle_run_id ontbreekt/ongeldig");
    if (!matchmaking_id) throw new Error("[saveControleResultaten] matchmaking_id ontbreekt/ongeldig");
    const hitsIn = Array.isArray(opts?.hits) ? opts.hits : [];
    // ✅ 0) bestaande reviews ophalen (voordat we deleten) — scoped indien bout_id
    let exQ = __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabaseAdmin$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["supabaseAdmin"].from("controle_resultaten").select("partij_nr,bout_id,rule_code,hoek,review_status,review_note,reviewed_by,reviewed_at,aantekeningen,original_resultaat,resultaat,actie_status").eq("controle_run_id", controle_run_id);
    if (scopedBoutId) exQ = exQ.eq("bout_id", scopedBoutId);
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
    // ✅ 1) oude resultaten weg — scoped indien bout_id
    let delQ = __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabaseAdmin$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["supabaseAdmin"].from("controle_resultaten").delete().eq("controle_run_id", controle_run_id);
    if (scopedBoutId) delQ = delQ.eq("bout_id", scopedBoutId);
    const { error: delErr } = await delQ;
    if (delErr) throw delErr;
    // ✅ 2) rows bouwen + review terugplakken
    const rowsToInsert = [];
    for (const hit of hitsIn){
        const partij_nr = asInt(hit?.partij_nr);
        // als hit geen bout_id meegeeft maar we werken scoped: forceer scopedBoutId
        const bout_id = asUuid(hit?.bout_id) ?? scopedBoutId ?? null;
        // safety: bij scoped opslaan MÓET bout_id bestaan
        if (scopedBoutId && !bout_id) continue;
        const mmId = asUuid(hit?.matchmaking_id) ?? matchmaking_id;
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
        // ✅ als admin ooit reviewed heeft: behoud review + override resultaat
        if (prev) {
            const norm = prev._norm;
            baseRow.review_status = norm ?? prev.review_status ?? null;
            baseRow.review_note = prev.review_note ?? null;
            baseRow.reviewed_by = prev.reviewed_by ?? null;
            baseRow.reviewed_at = prev.reviewed_at ?? null;
            // behoud aantekeningen altijd
            baseRow.aantekeningen = prev.aantekeningen ?? null;
            // admin decision wint van rule-hit
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
/* ==========================================================
   Basis: jeugd/volwassen + “jongste regel geldt”
========================================================== */ function isJeugdFromCtx(ctx) {
    // Primair: leeftijd op event-datum
    const r = asInt(ctx?.rood_leeftijd_event);
    const b = asInt(ctx?.blauw_leeftijd_event);
    if (typeof r === "number" && r < 18 || typeof b === "number" && b < 18) return true;
    // Secundair/fallback: klasse-indicatie uit matchmaking.
    // ✅ J+ = Jeugd met talentstatus, maar valt onder de JEUGD-regels.
    const k = String(ctx?.klasse_mm ?? "").toUpperCase().replace(/\s+/g, " ").trim();
    if (k.includes("J+")) return true;
    // Extra: als matchmaker expliciet "Jeugd" in klasse zet
    if (k.includes("JEUGD")) return true;
    return false;
}
function isVolwassenePair(ctx) {
    const r = asInt(ctx?.rood_leeftijd_event);
    const b = asInt(ctx?.blauw_leeftijd_event);
    return typeof r === "number" && r >= 18 && typeof b === "number" && b >= 18;
}
function minAgeEvent(ctx) {
    const r = asInt(ctx?.rood_leeftijd_event);
    const b = asInt(ctx?.blauw_leeftijd_event);
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
    // ✅ We willen zowel 'maanden' als 'dagen' tonen (rapport/UI).
    const diffMonths = Math.abs(younger.diff(older, "month"));
    const afterMonths = older.add(diffMonths, "month");
    const diffDaysRemainder = Math.abs(younger.diff(afterMonths, "day"));
    const diffDaysTotal = Math.abs(younger.diff(older, "day"));
    const dispThreshold = older.add(18, "month").add(1, "day");
    const afkeurThreshold = older.add(24, "month");
    const isAfkeur = younger.isSame(afkeurThreshold, "day") || younger.isAfter(afkeurThreshold, "day");
    const isDisp = younger.isAfter(dispThreshold, "day") && !isAfkeur;
    // ✅ NVB: ≥24 maanden is VERBOD (zwaarder dan AFKEUR)
    if (isAfkeur) return {
        type: "VERBOD",
        diffDaysTotal,
        diffMonths,
        diffDaysRemainder
    };
    if (isDisp) return {
        type: "DISPENSATIE",
        diffDaysTotal,
        diffMonths,
        diffDaysRemainder
    };
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
    // ✅ NVB: Demo is een uitslag, telt mee als 1/3 partij (afgerond naar beneden).
    // Voorbeeld: total=25, demo=10 → (25-10) + floor(10/3)=15+3=18
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
/** Alleen KB/MT/standing uitslagen tellen voor volwassen klasse */ function isRelevantStandingDiscipline(d) {
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
function parseMmaLevel(v) {
    const s = String(v ?? "").toUpperCase().trim();
    if (!s) return null;
    if (s === "P" || s === "PRO" || s.includes("PROFESSIONAL") || s.includes("PROF")) return "PRO";
    if (s === "AMA" || s === "AMATEUR" || s.includes("AMATEUR")) return "AMATEUR";
    return null;
}
function getMmaLevelFromMm(ctx) {
    return parseMmaLevel(ctx?.klasse_mm);
}
function getMmaLevelFromCtx(ctx, hoek) {
    const cand = hoek === "rood" ? ctx?.rood_mma_current_klasse ?? ctx?.rood_mma_klasse ?? ctx?.rood_klasse_mma ?? ctx?.rood_fp_mma_klasse : ctx?.blauw_mma_current_klasse ?? ctx?.blauw_mma_klasse ?? ctx?.blauw_klasse_mma ?? ctx?.blauw_fp_mma_klasse;
    return parseMmaLevel(cand);
}
async function rulesEngine(opts) {
    const { controle_run_id, matchmaking_id, ctxRows } = opts;
    const rows = Array.isArray(ctxRows) ? ctxRows : ctxRows ? [
        ctxRows
    ] : [];
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
    // 2) uitslagen_raw 1x ophalen (voor volwassen klasse-check)
    const uitslagenByVa = await fetchUitslagenByVa({
        matchmaking_id,
        controle_run_id,
        vaList
    });
    for (const ctx of rows){
        const partij_nr = asInt(ctx?.partij_nr);
        const bout_id = unwrapUuid(ctx?.bout_id);
        // ✅ VA ontbreekt => AFKEUR (voor beide hoeken apart)
        const vaRood = String(ctx?.rood_va_mm ?? ctx?.va_rood ?? ctx?.va_rood_mm ?? "").trim();
        const vaBlauw = String(ctx?.blauw_va_mm ?? ctx?.va_blauw ?? ctx?.va_blauw_mm ?? "").trim();
        if (!vaRood) {
            pushHit({
                matchmaking_id,
                partij_nr,
                bout_id,
                rule: "VA nummer ontbreekt (rood)",
                rule_code: "VA_ONTBREEKT_ROOD",
                resultaat: "AFKEUR",
                severity: "error",
                boodschap: "Geen VA nummer gevonden voor rood. Zonder VA kan FightPassport niet betrouwbaar geverifieerd worden.",
                hoek: "rood"
            });
        }
        if (!vaBlauw) {
            pushHit({
                matchmaking_id,
                partij_nr,
                bout_id,
                rule: "VA nummer ontbreekt (blauw)",
                rule_code: "VA_ONTBREEKT_BLAUW",
                resultaat: "AFKEUR",
                severity: "error",
                boodschap: "Geen VA nummer gevonden voor blauw. Zonder VA kan FightPassport niet betrouwbaar geverifieerd worden.",
                hoek: "blauw"
            });
        }
        const jeugd = isJeugdFromCtx(ctx);
        const volwassenen = isVolwassenePair(ctx);
        const mma = isMmaBout(ctx);
        const mmaJeugd = jeugd && mma;
        // ✅ jeugd vs volwassen mix is VERBOD (1 vechter < 18 en de ander ≥ 18)
        {
            const ageR = asInt(ctx?.rood_leeftijd_event);
            const ageB = asInt(ctx?.blauw_leeftijd_event);
            if (typeof ageR === "number" && typeof ageB === "number") {
                const mix = ageR < 18 && ageB >= 18 || ageB < 18 && ageR >= 18;
                if (mix) {
                    pushHit({
                        matchmaking_id,
                        partij_nr,
                        bout_id,
                        rule: "Jeugd vs volwassen (mix) verboden",
                        rule_code: "JEUGD_VOLWASSEN_MIX_AFKEUR",
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
                    rule: "Jeugd vs volwassen (mix) niet controleerbaar",
                    rule_code: "JEUGD_VOLWASSEN_MIX_GEEN_DATA_ACTIE",
                    resultaat: "ACTIE",
                    severity: "warning",
                    boodschap: "Leeftijd (op event) ontbreekt bij rood en/of blauw — kan niet bepalen of het een jeugd/volwassen mix is."
                });
            }
        }
        // 0) NAAM mismatch
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
                    rule: "Vechter mismatch (naam)",
                    rule_code: "VECHTER_NAAM_MISMATCH_ROOD",
                    resultaat: "ACTIE",
                    severity: "warning",
                    boodschap: `Rood naam matchmaker (“${roodNaamMM ?? "-"}”) wijkt af van FightPassport (“${roodNaamFP ?? "-"}”). Controleer VA/vechter.`,
                    hoek: "rood"
                });
            }
            if (!nameSimilar(blauwNaamMM, blauwNaamFP)) {
                pushHit({
                    matchmaking_id,
                    partij_nr,
                    bout_id,
                    rule: "Vechter mismatch (naam)",
                    rule_code: "VECHTER_NAAM_MISMATCH_BLAUW",
                    resultaat: "ACTIE",
                    severity: "warning",
                    boodschap: `Blauw naam matchmaker (“${blauwNaamMM ?? "-"}”) wijkt af van FightPassport (“${blauwNaamFP ?? "-"}”). Controleer VA/vechter.`,
                    hoek: "blauw"
                });
            }
        }
        // ✅ KEURMERK sportschool
        {
            const kR = ctx?.keurmerk_rood; // boolean | null
            const kB = ctx?.keurmerk_blauw; // boolean | null
            const redenR = String(ctx?.keurmerk_reden_rood ?? "").trim();
            const redenB = String(ctx?.keurmerk_reden_blauw ?? "").trim();
            // ✅ België: alleen informatief (geen afkeur)
            if (redenR.startsWith("⚠️ België")) {
                pushHit({
                    matchmaking_id,
                    partij_nr,
                    bout_id,
                    rule: "Belgische sportschool (check later)",
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
                    rule: "Belgische sportschool (check later)",
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
                    rule: "Keurmerk NL sportschool (rood) ontbreekt",
                    rule_code: "KEURMERK_GEEN_DATA_ROOD",
                    resultaat: "ACTIE",
                    severity: "warning",
                    boodschap: redenR || "NL gym: keurmerk-data ontbreekt of gym match onzeker.",
                    hoek: "rood"
                });
            } else if (kR === false) {
                pushHit({
                    matchmaking_id,
                    partij_nr,
                    bout_id,
                    rule: "Keurmerk NL sportschool (rood) ongeldig",
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
                    rule: "Keurmerk NL sportschool (blauw) ontbreekt",
                    rule_code: "KEURMERK_GEEN_DATA_BLAUW",
                    resultaat: "ACTIE",
                    severity: "warning",
                    boodschap: redenB || "NL gym: keurmerk-data ontbreekt of gym match onzeker.",
                    hoek: "blauw"
                });
            } else if (kB === false) {
                pushHit({
                    matchmaking_id,
                    partij_nr,
                    bout_id,
                    rule: "Keurmerk NL sportschool (blauw) ongeldig",
                    rule_code: "KEURMERK_ONGELDIG_BLAUW",
                    resultaat: "AFKEUR",
                    severity: "error",
                    boodschap: redenB || "NL gym: geen geldig keurmerk (ontbreekt/verlopen).",
                    hoek: "blauw"
                });
            }
        }
        // 1) man vs vrouw -> VERBOD
        {
            const gR = parseGender(ctx?.rood_geslacht);
            const gB = parseGender(ctx?.blauw_geslacht);
            if (gR && gB && gR !== gB) {
                pushHit({
                    matchmaking_id,
                    partij_nr,
                    bout_id,
                    rule: "Man vs vrouw niet toegestaan",
                    rule_code: "GESLACHT_MISMATCH_AFKEUR",
                    resultaat: "VERBOD",
                    severity: "error",
                    boodschap: `Rood is ${gR === "M" ? "man" : "vrouw"} en Blauw is ${gB === "M" ? "man" : "vrouw"} — VERBOD.`
                });
            }
        }
        // 2) startverbod -> VERBOD
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
                    rule: "Startverbod actief",
                    rule_code: "STARTVERBOD_AFKEUR",
                    resultaat: "VERBOD",
                    severity: "error",
                    boodschap: `Rood: ${sbR_has ? "STARTVERBOD" : "OK"} • Blauw: ${sbB_has ? "STARTVERBOD" : "OK"} — VERBOD.`
                });
            }
        }
        // 3) licentie (per hoek)
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
                    rule_code: "LICENTIE_ONGELDIG_AFKEUR_ROOD",
                    resultaat: "AFKEUR",
                    severity: "error",
                    boodschap: `Rood heeft GEEN/ONGELDIGE licentie (waarde: “${String(ctx?.rood_licentie ?? "").trim() || "leeg"}”).`
                });
            }
            if (!licB_ok) {
                pushHit({
                    matchmaking_id,
                    partij_nr,
                    bout_id,
                    hoek: "blauw",
                    rule: "Licentie ontbreekt/ongeldig (blauw)",
                    rule_code: "LICENTIE_ONGELDIG_AFKEUR_BLAUW",
                    resultaat: "AFKEUR",
                    severity: "error",
                    boodschap: `Blauw heeft GEEN/ONGELDIGE licentie (waarde: “${String(ctx?.blauw_licentie ?? "").trim() || "leeg"}”).`
                });
            }
        }
        // 4) MMA < 12
        if (mma) {
            const minAge = minAgeEvent(ctx);
            if (typeof minAge === "number" && minAge < 12) {
                pushHit({
                    matchmaking_id,
                    partij_nr,
                    bout_id,
                    rule: "MMA onder 12 jaar verboden",
                    rule_code: "MMA_U12_AFKEUR",
                    resultaat: "AFKEUR",
                    severity: "error",
                    boodschap: `Minimale leeftijd in de partij is ${minAge} — MMA wedstrijden zijn verboden onder 12 jaar — AFKEUR.`
                });
            }
        }
        // 5) MMA flow (amateur/pro) -> door jou verwijderd (geen hits meer)
        // 6) JEUGD regels (MMA youth agecat / niet-MMA leeftijdsverschil)
        if (jeugd) {
            if (mmaJeugd) {
                const ageR = asInt(ctx?.rood_leeftijd_event);
                const ageB = asInt(ctx?.blauw_leeftijd_event);
                const bandR = mmaJeugdAgeBand(ageR);
                const bandB = mmaJeugdAgeBand(ageB);
                if (!bandR || !bandB) {
                    pushHit({
                        matchmaking_id,
                        partij_nr,
                        bout_id,
                        rule: "MMA jeugd: leeftijdscategorie niet controleerbaar",
                        rule_code: "MMA_JEUGD_AGECAT_GEEN_DATA_ACTIE",
                        resultaat: "ACTIE",
                        severity: "warning",
                        boodschap: "Leeftijd (op event) ontbreekt bij rood en/of blauw — MMA-jeugd leeftijdscategorie kan niet gecontroleerd worden."
                    });
                } else if (bandR.label !== bandB.label) {
                    pushHit({
                        matchmaking_id,
                        partij_nr,
                        bout_id,
                        rule: "MMA jeugd: verschillende leeftijdscategorie",
                        rule_code: "MMA_JEUGD_AGECAT_AFKEUR",
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
                        rule_code: "LEEFTIJD_VERSCHIL_GEEN_DATA_ACTIE",
                        resultaat: "ACTIE",
                        severity: "warning",
                        boodschap: "Geboortedatum ontbreekt bij rood en/of blauw — jeugd-leeftijdsverschil kan niet gecontroleerd worden."
                    });
                } else if (lv.type === "DISPENSATIE") {
                    pushHit({
                        matchmaking_id,
                        partij_nr,
                        bout_id,
                        rule: "Leeftijdsverschil te groot (jeugd)",
                        rule_code: "LEEFTIJD_VERSCHIL_DISPENSATIE",
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
                        rule_code: "LEEFTIJD_VERSCHIL_AFKEUR",
                        resultaat: "VERBOD",
                        severity: "error",
                        boodschap: `Leeftijdsverschil: ${lv.diffMonths} maanden en ${lv.diffDaysRemainder} dagen — vanaf 24 maanden verschil is dit een VERBOD.`
                    });
                }
            }
        }
        // 7) JEUGD partijverschil (zelfde berekening als UI onder “Verschillen”)
        if (jeugd) {
            const countDemo = (rows)=>(rows ?? []).reduce((acc, r)=>{
                    const s = String(r?.uitslag ?? "").toLowerCase();
                    return acc + (s.includes("demo") || s.includes("demonstr") ? 1 : 0);
                }, 0);
            // primair: scraped totals (zoals UI)
            const totalR = toInt(ctx?.rood_totaal_wedstrijden_scrape);
            const totalB = toInt(ctx?.blauw_totaal_wedstrijden_scrape);
            // demo: eerst ctx demo_totaal, anders tellen uit controle_uitslagen
            const vaR = String(ctx?.rood_va_mm ?? ctx?.va_rood ?? ctx?.va_rood_mm ?? "").trim();
            const vaB = String(ctx?.blauw_va_mm ?? ctx?.va_blauw ?? ctx?.va_blauw_mm ?? "").trim();
            const rowsR = vaR ? uitslagenByVa.get(vaR) ?? [] : [];
            const rowsB = vaB ? uitslagenByVa.get(vaB) ?? [] : [];
            const demoR = toInt(ctx?.rood_demo_totaal) ?? countDemo(rowsR);
            const demoB = toInt(ctx?.blauw_demo_totaal) ?? countDemo(rowsB);
            const effR = totalR != null ? totalR - (demoR ?? 0) + Math.floor((demoR ?? 0) / 3) : null;
            const effB = totalB != null ? totalB - (demoB ?? 0) + Math.floor((demoB ?? 0) / 3) : null;
            if (effR == null || effB == null) {
                // fallback: oude totals-json (kan helpen bij oudere runs)
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
                        rule_code: "JEUGD_PARTIJVERSCHIL_GEEN_DATA_ACTIE",
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
                            rule_code: "JEUGD_PARTIJVERSCHIL_>_4_DISPENSATIE",
                            resultaat: "DISPENSATIE",
                            severity: "warning",
                            boodschap: `Jeugd partijverschil: Rood ${effR2} partijen • Blauw ${effB2} partijen • Verschil ${verschil2}. Regel: zolang één van beide minder dan 15 partijen heeft, is maximaal 4 verschil toegestaan — DISPENSATIE vereist.`
                        });
                    }
                }
            } else {
                const verschil = Math.abs(effR - effB);
                const minEff = Math.min(effR, effB);
                // ✅ jouw regel: zolang 1 van beide < 15 effectieve partijen, is max verschil 4
                if (minEff < 15 && verschil > 4) {
                    pushHit({
                        matchmaking_id,
                        partij_nr,
                        bout_id,
                        rule: "Jeugd: partijverschil te groot",
                        rule_code: "JEUGD_PARTIJVERSCHIL_>_4_DISPENSATIE",
                        resultaat: "DISPENSATIE",
                        severity: "warning",
                        boodschap: `Jeugd partijverschil: Rood ${effR} partijen • Blauw ${effB} partijen • Verschil ${verschil}. Regel: zolang één van beide minder dan 15 partijen heeft, is maximaal 4 verschil toegestaan — DISPENSATIE vereist.`
                    });
                }
            }
        }
        // 8) VOLWASSEN KB/MT klasse: alleen voor Kickboksen/Muay Thai.
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
            // ✅ door jou: geen "boutklasse niet leesbaar" melding meer
            if (boutK && (boutK !== roodK || boutK !== blauwK)) {
                pushHit({
                    matchmaking_id,
                    partij_nr,
                    bout_id,
                    rule: "Volwassen bout: verkeerde klasse",
                    rule_code: "VOLWASSEN_BOUT_VERKEERDE_KLASSE",
                    resultaat: "AFKEUR",
                    severity: "error",
                    boodschap: `Boutklasse klopt niet: ingevoerd ${boutK}. Advies op basis van uitslagen: Rood ${roodK}, Blauw ${blauwK} — AFKEUR (dispensatie mogelijk).`
                });
            }
        }
    }
    // ✅ gala tijd (matchmaking-level hit)
    {
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
                boodschap: `Geschatte gala-duur: ${(0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$galaTime$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["formatMinutesNL"])(bt.total_minutes)} ` + `(≈ ${(0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$galaTime$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["formatHoursQuarterNL"])(bt.total_hours_quarter_ceil)} uur, kwartier-afronding). ` + (overMax ? `Boven maximum (${(0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$galaTime$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["formatMinutesNL"])(bt.max_with_hoofdofficial_minutes)}) — AFKEUR.` : `Boven 6.5 uur (${(0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$galaTime$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["formatMinutesNL"])(bt.warning_over_minutes)}) — Hoofdofficial nodig / actie.`)
            });
        }
    }
    await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$control$2f$saveControleResultaten$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["saveControleResultaten"])({
        controle_run_id,
        matchmaking_id,
        hits
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
            // fp_bundle logs kunnen gigantisch zijn; laat ze wel door, maar zonder extra object dumps hier
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
            if (code === 0) resolve({
                stdout,
                stderr,
                ms
            });
            else {
                reject(new Error(`Script failed: ${scriptPath} (exit code ${code})\n(ms=${ms})\n\nSTDERR:\n${stderr}\n\nSTDOUT:\n${stdout}`));
            }
        });
    });
}
async function POST(req) {
    let controle_run_id = null;
    try {
        const body = await req.json();
        const matchmaking_id = body?.matchmaking_id;
        const do_scrape = body?.do_scrape !== false;
        // bundle settings
        const workers = clampInt(body?.workers ?? 8, 8, 1, 20);
        const stagger_ms = clampInt(body?.stagger_ms ?? 250, 250, 0, 5000);
        const tab_attempts = clampInt(body?.tab_attempts ?? 8, 8, 1, 30);
        const soft_wait_ms = clampInt(body?.soft_wait_ms ?? 900, 900, 200, 5000);
        const between_attempts_ms = clampInt(body?.between_attempts_ms ?? 450, 450, 0, 5000);
        // (optioneel) timeouts voor bundle via body (worden env vars)
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
        // ✅ AuthZ: matchmaker alleen eigen uploads, officials alleen eigen bondteam, (super)admin overal
        const { userId, role } = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$app$2f$api$2f$_utils$2f$authz$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["requireUserWithRole"])(req);
        await (0, __TURBOPACK__imported__module__$5b$project$5d2f$app$2f$api$2f$_utils$2f$authz$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["assertCanAccessMatchmaking"])({
            matchmaking_id,
            userId,
            role
        });
        // 1) run aanmaken
        const { data: runRows, error: runErr } = await supabase.from("controle_runs").insert({
            matchmaking_id,
            status: "running",
            gestart_op: new Date().toISOString(),
            run_type: "control-engine"
        }).select("id").limit(1);
        if (runErr) throw runErr;
        controle_run_id = runRows?.[0]?.id ?? null;
        if (!controle_run_id) throw new Error("controle_run insert gaf geen id terug");
        // 2) bouts ophalen
        const { data: bouts, error: boutsErr } = await supabase.from("matchmaking_bouts_raw").select("*").eq("matchmaking_id", matchmaking_id);
        if (boutsErr) throw boutsErr;
        // 3) VA’s verzamelen
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
            // compact config
            stagger_ms,
            tab_attempts,
            soft_wait_ms,
            between_attempts_ms,
            fullfighter_timeout_ms,
            uitslagen_timeout_ms,
            uitslagen_tries
        });
        dlog("[control-engine/start] va_sample", va_nummers.slice(0, 12));
        // 4) script path
        const fpBundlePath = resolveScriptPath("scrapers", "fp_bundle", "scraper_fp_bundle.js");
        dlog("[control-engine/start] fpBundlePath =", fpBundlePath);
        // 5) scrape (bundle)
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
                    // timeouts + tries naar bundle
                    FULLFIGHTER_TIMEOUT_MS: String(fullfighter_timeout_ms),
                    UITSLAGEN_TIMEOUT_MS: String(uitslagen_timeout_ms),
                    UITSLAGEN_TRIES: String(uitslagen_tries)
                }, "fp_bundle");
                console.log("[control-engine/start] ✅ fp_bundle klaar", {
                    ms: res.ms,
                    va_count: va_nummers.length
                });
            } catch (e) {
                // Niet hard stoppen: build/enrich/rules mogen doorlopen op bestaande data
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
        // 6) build/enrich
        console.log("[control-engine/start] ▶ buildControleBoutContext...");
        await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$control$2f$buildControleBoutContext$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["buildControleBoutContext"])(matchmaking_id, controle_run_id);
        console.log("[control-engine/start] ✅ buildControleBoutContext klaar");
        console.log("[control-engine/start] ▶ enrichControleBoutContext...");
        await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$control$2f$enrichControleBoutContext$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["enrichControleBoutContext"])(matchmaking_id, controle_run_id);
        console.log("[control-engine/start] ✅ enrichControleBoutContext klaar");
        // 7) ctxRows ophalen (NA enrich)
        console.log("[control-engine/start] ▶ load ctxRows for rulesEngine...");
        const { data: ctxRows, error: ctxErr } = await supabase.from("controle_bout_context").select("*").eq("controle_run_id", controle_run_id);
        if (ctxErr) throw ctxErr;
        console.log("[control-engine/start] ✅ ctxRows loaded", {
            rows: ctxRows?.length ?? 0
        });
        // 8) rulesEngine
        console.log("[control-engine/start] ▶ rulesEngine...");
        const hits = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$rulesEngine$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["rulesEngine"])({
            matchmaking_id,
            controle_run_id,
            ctxRows: ctxRows ?? []
        });
        // ✅ geen hit_sample meer
        console.log("[control-engine/start] ✅ rulesEngine klaar", {
            hits: Array.isArray(hits) ? hits.length : 0
        });
        // (optioneel) debug-only: 1 sample
        if (DEBUG && Array.isArray(hits) && hits[0]) {
            console.log("[control-engine/start] hit_sample", hits[0]);
        }
        // (optioneel) check hoeveel in controle_resultaten staat
        if (DEBUG) {
            try {
                const { count } = await supabase.from("controle_resultaten").select("id", {
                    count: "exact",
                    head: true
                }).eq("controle_run_id", controle_run_id);
                console.log("[control-engine/start] controle_resultaten count", {
                    count: count ?? null
                });
            } catch  {}
        }
        // 9) afronden
        await supabase.from("controle_runs").update({
            status: "klaar",
            afgerond_op: new Date().toISOString()
        }).eq("id", controle_run_id);
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            ok: true,
            matchmaking_id,
            controle_run_id,
            do_scrape,
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

//# sourceMappingURL=%5Broot-of-the-server%5D__422f1e5a._.js.map