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
"[externals]/crypto [external] (crypto, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("crypto", () => require("crypto"));

module.exports = mod;
}),
"[externals]/fs [external] (fs, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("fs", () => require("fs"));

module.exports = mod;
}),
"[externals]/stream [external] (stream, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("stream", () => require("stream"));

module.exports = mod;
}),
"[externals]/events [external] (events, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("events", () => require("events"));

module.exports = mod;
}),
"[externals]/buffer [external] (buffer, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("buffer", () => require("buffer"));

module.exports = mod;
}),
"[externals]/util [external] (util, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("util", () => require("util"));

module.exports = mod;
}),
"[externals]/string_decoder [external] (string_decoder, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("string_decoder", () => require("string_decoder"));

module.exports = mod;
}),
"[externals]/path [external] (path, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("path", () => require("path"));

module.exports = mod;
}),
"[externals]/constants [external] (constants, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("constants", () => require("constants"));

module.exports = mod;
}),
"[externals]/assert [external] (assert, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("assert", () => require("assert"));

module.exports = mod;
}),
"[externals]/zlib [external] (zlib, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("zlib", () => require("zlib"));

module.exports = mod;
}),
"[externals]/os [external] (os, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("os", () => require("os"));

module.exports = mod;
}),
"[project]/app/api/submit-matchmaking/parse_matchmaking.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "parseExcelToBouts",
    ()=>parseExcelToBouts
]);
// ---------------------------------------------------------
// MATCHCONTROL PARSER â VERSIE 12.2 â .XLS SUPPORT (SheetJS fallback) + KLEUR (best effort)
// ---------------------------------------------------------
//
// â .xlsx via ExcelJS (styles + waarden)
// â .xls via SheetJS (xlsx lib) fallback (styles/kleur best-effort)
// â Zelfde logica: header detectie + rood/blauw split + VA-only mode
//
// â TOEVOEGING (zonder bestaande logica te wijzigen):
// - Max gewicht notatie als "-31" (alleen '-' + getal) wordt herkend als 31
// - Wordt Ã³Ã³k apart opgeslagen in bout.extra.max_gewicht
// - Pauze-rijen worden overgeslagen
// - Toernooi-rijen worden herkend en gemarkeerd (bout.extra.is_toernooi = true) (NIET overslaan)
//
// Dependencies:
// npm i exceljs xlsx
//
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$exceljs$2f$excel$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/exceljs/excel.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$xlsx$2f$xlsx$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/xlsx/xlsx.mjs [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$externals$5d2f$crypto__$5b$external$5d$__$28$crypto$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/crypto [external] (crypto, cjs)");
;
;
;
/* =========================================================
   â TEMPLATE PARSER (Admin upload template met VS/T)
   - VS kolom gevuld => normale partij (Atleet 1 vs Atleet 2)
   - VS kolom gevuld met T/T1/T2/... => toernooi deelnemerslijst
     -> genereert round-robin (iedereen tegen iedereen) binnen dezelfde T-code
========================================================= */ function normCell(v) {
    return String(v ?? "").trim();
}
function normLower(v) {
    return normCell(v).toLowerCase();
}
function isVsMarker(v) {
    const s = normLower(v);
    return s === "vs" || s === "v.s" || s === "v.s." || s === "versus";
}
function parseTCode(v) {
    const s = normCell(v).toUpperCase();
    if (!s) return null;
    // Sta "T" toe (1 toernooi) Ã©n "T1/T2/..." (meerdere toernooien)
    if (s === "T") return "T";
    if (/^T\d{1,3}$/.test(s)) return s;
    return null;
}
function parseMaxKgNumber(v) {
    if (v == null) return null;
    if (typeof v === "number" && Number.isFinite(v)) return v;
    const s = normCell(v);
    if (!s) return null;
    const m = s.replace(",", ".").match(/-?\d+(?:\.\d+)?/);
    if (!m) return null;
    const n = Number(m[0]);
    return Number.isFinite(n) ? Math.abs(n) : null;
}
function detectTemplateCols(headerRow) {
    const h = headerRow.map((x)=>normLower(x));
    const idx = (needles)=>{
        for(let i = 0; i < h.length; i++){
            const v = h[i];
            if (!v) continue;
            if (needles.some((n)=>v === n || v.includes(n))) return i + 1; // 1-based col
        }
        return -1;
    };
    const partijNr = idx([
        "partij nr",
        "partijnr",
        "partij"
    ]);
    const discipline = idx([
        "discipline"
    ]);
    const klasse = idx([
        "klasse"
    ]);
    const naam1 = idx([
        "naam atleet 1",
        "naam 1",
        "atleet 1"
    ]);
    const gym1 = idx([
        "sportschool (1)",
        "gym (1)",
        "sportschool 1",
        "gym 1"
    ]);
    const va1 = idx([
        "fightpaspoort nr (1)",
        "va (1)",
        "va 1",
        "fightpaspoort 1"
    ]);
    const kg1 = idx([
        "kg (1)",
        "gewicht (1)",
        "kg 1",
        "gewicht 1"
    ]);
    const vs = idx([
        "vs",
        "v.s"
    ]);
    const naam2 = idx([
        "naam atleet 2",
        "naam 2",
        "atleet 2"
    ]);
    const gym2 = idx([
        "sportschool (2)",
        "gym (2)",
        "sportschool 2",
        "gym 2"
    ]);
    const va2 = idx([
        "fightpaspoort nr (2)",
        "va (2)",
        "va 2",
        "fightpaspoort 2"
    ]);
    const kg2 = idx([
        "kg (2)",
        "gewicht (2)",
        "kg 2",
        "gewicht 2"
    ]);
    const maxKg = idx([
        "max kg",
        "maxkg",
        "max gewicht"
    ]);
    // In jouw template staat T vaak helemaal rechts (en header kan fout zijn). We bepalen 'm later op basis van waarden.
    if ([
        partijNr,
        discipline,
        klasse,
        naam1,
        gym1,
        va1,
        vs,
        naam2,
        gym2,
        va2
    ].some((x)=>x < 1)) return null;
    return {
        partijNr,
        discipline,
        klasse,
        naam1,
        gym1,
        va1,
        kg1: kg1 > 0 ? kg1 : -1,
        vs,
        naam2,
        gym2,
        va2,
        kg2: kg2 > 0 ? kg2 : -1,
        maxKg: maxKg > 0 ? maxKg : null
    };
}
async function tryParseAdminTemplate(fileBuffer) {
    const wb = new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$exceljs$2f$excel$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["default"].Workbook();
    await wb.xlsx.load(fileBuffer);
    const ws = wb.worksheets?.[0];
    if (!ws) return null;
    // header rij zoeken (eerste 25 rijen)
    let headerRowIndex = -1;
    let cols = null;
    for(let r = 1; r <= Math.min(25, ws.rowCount); r++){
        const row = ws.getRow(r);
        const header = [];
        for(let c = 1; c <= Math.min(40, ws.columnCount); c++)header.push(row.getCell(c).value);
        const detected = detectTemplateCols(header);
        if (detected) {
            headerRowIndex = r;
            cols = detected;
            break;
        }
    }
    if (!cols || headerRowIndex < 1) return null;
    // â Toernooi-code staat in dezelfde kolom als VS (kolom H in jouw template).
    // Waarden: "vs" voor partij, of "T1"/"T2"/... voor toernooi.
    const bouts = [];
    const deelnemersByT = {};
    let maxPartijNr = 0;
    const lastRow = ws.rowCount;
    for(let r = headerRowIndex + 1; r <= lastRow; r++){
        const row = ws.getRow(r);
        const partijNrRaw = row.getCell(cols.partijNr).value;
        const partijNr = typeof partijNrRaw === "number" ? partijNrRaw : Number(normCell(partijNrRaw));
        if (Number.isFinite(partijNr) && partijNr > maxPartijNr) maxPartijNr = partijNr;
        const discipline = normCell(row.getCell(cols.discipline).value) || null;
        const klasse = normCell(row.getCell(cols.klasse).value) || null;
        const naam1 = normCell(row.getCell(cols.naam1).value) || null;
        const gym1 = normCell(row.getCell(cols.gym1).value) || null;
        // ✅ VA: letters/tekens weg + voorloopnullen weg (VA kan nooit met 0 beginnen)
        const va1 = extractVA(row.getCell(cols.va1).value) || null;
        const kg1 = cols.kg1 > 0 ? normCell(row.getCell(cols.kg1).value) || null : null;
        const vsVal = row.getCell(cols.vs).value;
        const naam2 = normCell(row.getCell(cols.naam2).value) || null;
        const gym2 = normCell(row.getCell(cols.gym2).value) || null;
        // ✅ VA: letters/tekens weg + voorloopnullen weg (VA kan nooit met 0 beginnen)
        const va2 = extractVA(row.getCell(cols.va2).value) || null;
        const kg2 = cols.kg2 > 0 ? normCell(row.getCell(cols.kg2).value) || null : null;
        const maxKgVal = cols.maxKg ? row.getCell(cols.maxKg).value : null;
        const maxKgNum = parseMaxKgNumber(maxKgVal);
        const tCode = parseTCode(vsVal);
        const isEmptyLine = !naam1 && !gym1 && !va1 && !naam2 && !gym2 && !va2 && !discipline && !klasse && !tCode;
        if (isEmptyLine) continue;
        // 1) Normale partij
        if (isVsMarker(vsVal) && (naam2 || va2 || gym2)) {
            bouts.push({
                bout_uid: (0, __TURBOPACK__imported__module__$5b$externals$5d2f$crypto__$5b$external$5d$__$28$crypto$2c$__cjs$29$__["randomUUID"])(),
                partij_nr: Number.isFinite(partijNr) ? partijNr : null,
                rood_naam: naam1,
                rood_gym: gym1,
                va_rood: va1,
                rood_geboortedatum: null,
                rood_gewicht: kg1,
                blauw_naam: naam2,
                blauw_gym: gym2,
                va_blauw: va2,
                blauw_geboortedatum: null,
                blauw_gewicht: kg2,
                discipline,
                klasse,
                record_rood_w: 0,
                record_rood_l: 0,
                record_rood_d: 0,
                record_blauw_w: 0,
                record_blauw_l: 0,
                record_blauw_d: 0,
                // â belangrijk: route.ts leest top-level is_toernooi
                is_toernooi: false,
                extra: {
                    max_gewicht: maxKgNum,
                    template: "admin_vs_t",
                    t_code: tCode
                }
            });
            continue;
        }
        // 2) Toernooi deelnemer (T1/T2/...)
        if (tCode) {
            if (!deelnemersByT[tCode]) deelnemersByT[tCode] = [];
            deelnemersByT[tCode].push({
                naam: naam1,
                gym: gym1,
                va: va1,
                kg: kg1,
                discipline,
                klasse,
                max_gewicht: maxKgNum
            });
        }
    }
    // Round-robin genereren per T-code
    let nextPartijNr = maxPartijNr > 0 ? maxPartijNr + 1 : 1;
    for (const [code, deelnemers] of Object.entries(deelnemersByT)){
        const list = (deelnemers ?? []).filter((x)=>x?.naam || x?.va);
        if (list.length < 2) continue;
        // discipline/klasse/maxkg: pak de eerste met waarde
        const d = list.find((x)=>x?.discipline)?.discipline ?? null;
        const k = list.find((x)=>x?.klasse)?.klasse ?? null;
        const mk = list.find((x)=>x?.max_gewicht != null)?.max_gewicht ?? null;
        for(let i = 0; i < list.length; i++){
            for(let j = i + 1; j < list.length; j++){
                const a = list[i];
                const b = list[j];
                bouts.push({
                    bout_uid: (0, __TURBOPACK__imported__module__$5b$externals$5d2f$crypto__$5b$external$5d$__$28$crypto$2c$__cjs$29$__["randomUUID"])(),
                    partij_nr: nextPartijNr++,
                    rood_naam: a?.naam ?? null,
                    rood_gym: a?.gym ?? null,
                    va_rood: a?.va ?? null,
                    rood_geboortedatum: null,
                    rood_gewicht: a?.kg ?? null,
                    blauw_naam: b?.naam ?? null,
                    blauw_gym: b?.gym ?? null,
                    va_blauw: b?.va ?? null,
                    blauw_geboortedatum: null,
                    blauw_gewicht: b?.kg ?? null,
                    discipline: d,
                    klasse: k,
                    record_rood_w: 0,
                    record_rood_l: 0,
                    record_rood_d: 0,
                    record_blauw_w: 0,
                    record_blauw_l: 0,
                    record_blauw_d: 0,
                    is_toernooi: true,
                    extra: {
                        is_toernooi: true,
                        toernooi_code: code,
                        toernooi_format: "roundrobin",
                        max_gewicht: mk,
                        template: "admin_vs_t"
                    }
                });
            }
        }
    }
    return bouts.length ? bouts : null;
}
/* =========================================================
   0. GENERIC HELPERS
========================================================= */ function norm(v) {
    if (v == null) return "";
    return String(v).toLowerCase().trim();
}
function safe(v) {
    return v == null ? "" : String(v).trim();
}
function isProbablyDate(v) {
    return /^\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4}$/.test(v.trim());
}
function extractDate(raw) {
    if (!raw) return null;
    if (raw instanceof Date && !isNaN(raw.getTime())) {
        const yyyy = String(raw.getFullYear());
        const mm = String(raw.getMonth() + 1).padStart(2, "0");
        const dd = String(raw.getDate()).padStart(2, "0");
        return `${yyyy}-${mm}-${dd}`;
    }
    const v = String(raw).trim();
    if (!isProbablyDate(v)) return null;
    const m = v.match(/(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})/);
    if (!m) return null;
    let [_, dd, mm, yyyy] = m;
    if (yyyy.length === 2) yyyy = Number(yyyy) <= 30 ? "20" + yyyy : "19" + yyyy;
    return `${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
}
/**
 * â TOEVOEGING: max gewicht notatie is ALTIJD "-<getal>" (geen andere tekens)
 * - "-31" -> 31
 * - "- 31" -> 31
 */ function extractMaxWeightOnly(raw) {
    if (!raw) return null;
    const s = String(raw).trim();
    const m = s.match(/^\s*-\s*(\d+(?:[.,]\d+)?)\s*$/);
    if (!m) return null;
    const n = Number(m[1].replace(",", "."));
    if (!Number.isFinite(n)) return null;
    // max gewicht komt ook bij jeugd voor, dus lagere grens dan "normaal gewicht"
    if (n >= 10 && n <= 200) return String(n);
    return null;
}
function extractWeight(raw) {
    if (!raw) return null;
    // â TOEVOEGING (bovenaan): eerst kijken naar max-gewicht notatie "-31"
    const maxW = extractMaxWeightOnly(raw);
    if (maxW) return maxW;
    const v = String(raw).toLowerCase().replace(/\s+/g, " ").trim();
    if (v.includes("kg")) {
        const m = v.match(/(\d+(?:[.,]\d+)?)/);
        return m ? m[1].replace(",", ".") : null;
    }
    if (/^\d+[.,]?\d*$/.test(v)) {
        const n = Number(v.replace(",", "."));
        if (Number.isFinite(n) && n >= 20 && n <= 200) return String(n);
    }
    return null;
}
function extractRecord(raw) {
    if (!raw) return null;
    const v = String(raw).trim();
    const m = v.match(/^(\d+)\s*[-/]\s*(\d+)\s*[-/]\s*(\d+)$/);
    if (!m) return null;
    return {
        w: Number(m[1]),
        l: Number(m[2]),
        d: Number(m[3])
    };
}
/**
 * VA-normalisatie:
 * - haalt alle niet-cijfers weg
 * - verwijdert leading zeros
 * - accepteert 2â6 cijfers als geldig
 */ function extractVA(raw) {
    if (!raw) return null;
    const v = String(raw).trim();
    if (!v) return null;
    if (isProbablyDate(v)) return null;
    if (v.toLowerCase().includes("kg")) return null;
    if (extractRecord(v)) return null;
    let digits = v.replace(/\D+/g, "");
    if (!digits) return null;
    digits = digits.replace(/^0+/, "");
    if (!digits) return null;
    if (digits.length < 2 || digits.length > 6) return null;
    return digits;
}
function looksLikeRecord(v) {
    return /^\d+\s*[-/]\s*\d+\s*[-/]\s*\d+$/.test(v.trim());
}
function looksLikeName(v) {
    const s = v.trim();
    if (!s) return false;
    if (looksLikeRecord(s)) return false;
    if (isProbablyDate(s)) return false;
    if (extractVA(s)) return false;
    if (extractWeight(s)) return false;
    return /^[A-Za-zÃ-Ã¿'â. \-]{3,}$/.test(s);
}
function looksLikeGym(v) {
    return /(gym|team|boxing|kickbox|muay|thai|academy|club|fight|mma)/i.test(v);
}
function makeEmptyBout() {
    return {
        bout_uid: (0, __TURBOPACK__imported__module__$5b$externals$5d2f$crypto__$5b$external$5d$__$28$crypto$2c$__cjs$29$__["randomUUID"])(),
        partij_nr: null,
        rood_naam: null,
        rood_gym: null,
        va_rood: null,
        rood_geboortedatum: null,
        rood_gewicht: null,
        blauw_naam: null,
        blauw_gym: null,
        va_blauw: null,
        blauw_geboortedatum: null,
        blauw_gewicht: null,
        discipline: null,
        klasse: null,
        record_rood_w: 0,
        record_rood_l: 0,
        record_rood_d: 0,
        record_blauw_w: 0,
        record_blauw_l: 0,
        record_blauw_d: 0,
        extra: {}
    };
}
function isOleXls(buf) {
    // OLE signature: D0 CF 11 E0 A1 B1 1A E1
    if (!buf || buf.length < 8) return false;
    return buf[0] === 0xd0 && buf[1] === 0xcf && buf[2] === 0x11 && buf[3] === 0xe0 && buf[4] === 0xa1 && buf[5] === 0xb1 && buf[6] === 0x1a && buf[7] === 0xe1;
}
function normalizeARGB(argb) {
    if (!argb) return null;
    const s = String(argb).replace(/^#/, "").toUpperCase();
    if (s.length === 6) return "FF" + s; // RGB -> ARGB
    if (s.length === 8) return s;
    return null;
}
function cornerFromARGB(argb) {
    if (!argb) return null;
    const a = argb.toUpperCase();
    // rood varianten
    if (a.endsWith("FF0000") || a.endsWith("C00000") || a.endsWith("E06666")) return "rood";
    if (a.endsWith("F4CCCC") || a.endsWith("FF9999") || a.endsWith("FF6D01")) return "rood";
    // blauw varianten
    if (a.endsWith("00B0F0") || a.endsWith("0070C0") || a.endsWith("0000FF")) return "blauw";
    if (a.endsWith("CFE2F3") || a.endsWith("CCECFF") || a.endsWith("66FFFF")) return "blauw";
    return null;
}
function getCellCornerFromLike(cell) {
    return cornerFromARGB(cell.fillARGB);
}
function exceljsToSheetLike(ws) {
    const rowCount = ws.rowCount || 0;
    const columnCount = ws.columnCount || 0;
    return {
        rowCount,
        columnCount,
        getRow (r) {
            const row = ws.getRow(r);
            return {
                getCell (c) {
                    const cell = row.getCell(c);
                    const v = cell.value;
                    let text = "";
                    if (v == null) text = "";
                    else if (typeof v === "object" && v.text) text = safe(v.text);
                    else text = safe(v);
                    const fill = cell.fill;
                    const fg = fill?.fgColor?.argb ? String(fill.fgColor.argb).toUpperCase() : null;
                    return {
                        value: v,
                        text,
                        fillARGB: normalizeARGB(fg)
                    };
                }
            };
        }
    };
}
function sheetjsToSheetLike(workbook) {
    const name = workbook.SheetNames[0];
    const sheet = workbook.Sheets[name];
    if (!sheet) {
        return {
            rowCount: 0,
            columnCount: 0,
            getRow: ()=>({
                    getCell: ()=>({
                            value: null,
                            text: "",
                            fillARGB: null
                        })
                })
        };
    }
    const ref = sheet["!ref"] || "A1:A1";
    const range = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$xlsx$2f$xlsx$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["utils"].decode_range(ref);
    const rowCount = range.e.r + 1;
    const columnCount = range.e.c + 1;
    function getCell(r1, c1) {
        const addr = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$xlsx$2f$xlsx$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["utils"].encode_cell({
            r: r1 - 1,
            c: c1 - 1
        });
        const cell = sheet[addr];
        if (!cell) return {
            value: null,
            text: "",
            fillARGB: null
        };
        // value
        let value = cell.v ?? null;
        // dates: SheetJS zet soms Date, soms number
        if (cell.t === "d" && cell.v instanceof Date) value = cell.v;
        // text
        const text = safe(cell.w ?? cell.v ?? "");
        // style best-effort
        // Bij cellStyles:true kan cell.s aanwezig zijn.
        const s = cell.s;
        const rgb = s?.fill?.fgColor?.rgb || s?.fill?.fgColor?.argb || s?.fgColor?.rgb || s?.fgColor?.argb || null;
        return {
            value,
            text,
            fillARGB: normalizeARGB(rgb)
        };
    }
    return {
        rowCount,
        columnCount,
        getRow (r) {
            return {
                getCell (c) {
                    return getCell(r, c);
                }
            };
        }
    };
}
/* =========================================================
   2. HEADER DETECTIE â ROBUUST
========================================================= */ const HEADER_KEYWORDS = [
    "partij",
    "partijnr",
    "partij nr",
    "nr",
    "bout",
    "v.s",
    "vs",
    "rood",
    "blauw",
    "red",
    "blue",
    "hoek",
    "corner",
    "voor",
    "voornaam",
    "ach",
    "achternaam",
    "naam",
    "fighter",
    "vechter",
    "gym",
    "school",
    "sportschool",
    "vereniging",
    "club",
    "team",
    "va",
    "va nr",
    "paspoort",
    "passport",
    "id",
    "nva",
    "gew",
    "gewicht",
    "kg",
    "max kg",
    "kilo",
    "geb",
    "geboorte",
    "dob",
    "birth",
    "leeftijd",
    "age",
    "erv",
    "ervaring",
    "record",
    "rec",
    "exp",
    "stijl",
    "discipline",
    "klasse",
    "class",
    "categorie",
    "cat",
    "duur",
    "rondes"
];
function cellTextLike(cell) {
    return safe(cell.text ?? cell.value ?? "");
}
function rowToStringsLike(row, maxCol) {
    const out = [];
    for(let c = 1; c <= maxCol; c++)out.push(norm(cellTextLike(row.getCell(c))));
    return out;
}
function detectHeaderRow(sheet, maxScanRows = 50, maxCol = 80) {
    let bestRow = 1;
    let bestScore = -1;
    const scanRows = Math.min(sheet.rowCount || 200, maxScanRows);
    for(let r = 1; r <= scanRows; r++){
        const row = sheet.getRow(r);
        const cells = rowToStringsLike(row, maxCol).filter((x)=>x !== "");
        if (cells.length < 3) continue;
        let score = 0;
        for (const c of cells){
            for (const k of HEADER_KEYWORDS){
                if (c.includes(k)) score += 1;
            }
        }
        const joined = cells.join(" | ");
        if (joined.includes("rood") || joined.includes("red")) score += 3;
        if (joined.includes("blauw") || joined.includes("blue")) score += 3;
        if (joined.includes("vs") || joined.includes("v.s")) score += 2;
        let dataLike = 0;
        for (const c of cells){
            if (extractVA(c)) dataLike++;
            if (extractDate(c)) dataLike++;
            if (looksLikeRecord(c)) dataLike++;
        }
        score -= Math.min(6, Math.floor(dataLike / 2));
        if (score > bestScore) {
            bestScore = score;
            bestRow = r;
        }
    }
    return bestRow;
}
/* =========================================================
   3. VA-ONLY PAIRING MODE
========================================================= */ function tryParseVaOnlyPairs(sheet) {
    const maxRows = Math.min(sheet.rowCount || 500, 200);
    const maxCol = Math.min(sheet.columnCount || 50, 10);
    const bouts = [];
    for(let r = 1; r <= maxRows; r++){
        const row = sheet.getRow(r);
        let boutNr = null;
        for(let c = 1; c <= maxCol; c++){
            const txt = cellTextLike(row.getCell(c));
            const m = txt.match(/bout\s*(\d+)/i);
            if (m) {
                boutNr = Number(m[1]);
                break;
            }
        }
        if (!boutNr) continue;
        const leftRaw = cellTextLike(row.getCell(1));
        const rightRaw = cellTextLike(row.getCell(3));
        const vaL = extractVA(leftRaw);
        const vaR = extractVA(rightRaw);
        const hasAny = Boolean(vaL || vaR || leftRaw || rightRaw);
        if (!hasAny) continue;
        const b = makeEmptyBout();
        b.partij_nr = boutNr;
        b.va_rood = vaL;
        b.va_blauw = vaR;
        b.extra.mode = "va_only_pairing";
        b.extra.raw_left = leftRaw || null;
        b.extra.raw_right = rightRaw || null;
        bouts.push(b);
    }
    if (bouts.length >= 3) return bouts;
    return null;
}
function headerCornerFromText(h) {
    const s = norm(h);
    if (!s) return null;
    if (s.includes("rood") || s.includes("red")) return "rood";
    if (s.includes("blauw") || s.includes("blue")) return "blauw";
    return null;
}
function headerLooksLikeName(h) {
    const s = norm(h);
    return s.includes("naam") || s.includes("vechter") || s.includes("fighter") || s.includes("voornaam") || s.includes("voor") && !s.includes("voordeel");
}
function findInRange(headers0, start0, end0, patterns) {
    for(let i = start0; i <= end0 && i < headers0.length; i++){
        const h = headers0[i];
        if (!h) continue;
        if (patterns.some((p)=>h.includes(p))) return i + 1;
    }
    return null;
}
function findNameColInRange(headers0, start0, end0) {
    for(let i = start0; i <= end0 && i < headers0.length; i++){
        const h = headers0[i] || "";
        if (!h) continue;
        if (h.includes("voornaam") || h.includes("achternaam")) continue;
        if (h === "naam" || h.includes("vechter") || h.includes("fighter")) return i + 1;
        if (h.includes("naam") && !h.includes("voor") && !h.includes("ach")) return i + 1;
    }
    return null;
}
function findCornerStartsFromRowAbove(opts) {
    const { sheet, headerRowIndex, maxCol } = opts;
    const r = headerRowIndex - 1;
    if (r < 1) return {};
    const row = sheet.getRow(r);
    let redStart;
    let blueStart;
    for(let c = 1; c <= maxCol; c++){
        const cell = row.getCell(c);
        const txt = norm(cellTextLike(cell));
        const cc = getCellCornerFromLike(cell);
        if (!redStart && (txt.includes("rode hoek") || txt === "rood" || txt.includes("rood") || txt.includes("red"))) {
            redStart = c;
        }
        if (!blueStart && (txt.includes("blauwe hoek") || txt === "blauw" || txt.includes("blauw") || txt.includes("blue"))) {
            blueStart = c;
        }
        if (!redStart && cc === "rood") redStart = c;
        if (!blueStart && cc === "blauw") blueStart = c;
    }
    return {
        redStart,
        blueStart
    };
}
function buildCornerMaps(opts) {
    const { sheet, headerRowIndex, maxCol } = opts;
    const headerRow = sheet.getRow(headerRowIndex);
    const headers0 = [];
    const headerCorners0 = [];
    for(let c = 1; c <= maxCol; c++){
        const cell = headerRow.getCell(c);
        const raw = cellTextLike(cell);
        const h = norm(raw);
        headers0.push(h);
        const byText = headerCornerFromText(h);
        const byColor = getCellCornerFromLike(cell);
        headerCorners0.push(byText || byColor || null);
    }
    const styleColIdx = headers0.findIndex((h)=>h && (h.includes("stijl") || h.includes("discipline")));
    const classColIdx = headers0.findIndex((h)=>h && (h.includes("klasse") || h.includes("class") || h.includes("categorie") || h.includes("cat")));
    const partijColIdx = headers0.findIndex((h)=>h && (h.includes("partij") || h === "nr" || h.includes("partijnr")));
    const styleCol = styleColIdx >= 0 ? styleColIdx + 1 : null;
    const classCol = classColIdx >= 0 ? classColIdx + 1 : null;
    const partijCol = partijColIdx >= 0 ? partijColIdx + 1 : 1;
    // â EXTRA: "vs" kolom als harde splitter (werkt perfect voor jouw GLORY sheet)
    const vsColIdx = headers0.findIndex((h)=>h && (h === "vs" || h.includes("vs") || h.includes("v.s")));
    const vsCol = vsColIdx >= 0 ? vsColIdx + 1 : null;
    const nameCols = [];
    for(let i = 0; i < headers0.length; i++){
        if (headers0[i] && headerLooksLikeName(headers0[i])) nameCols.push(i + 1);
    }
    const above = findCornerStartsFromRowAbove({
        sheet,
        headerRowIndex,
        maxCol
    });
    const voornaamCols = [];
    for(let i = 0; i < headers0.length; i++){
        const h = headers0[i] || "";
        if (!h) continue;
        if (h === "voornaam" || h.includes("voornaam") && !h.includes("achternaam")) {
            voornaamCols.push(i + 1);
        }
    }
    const redStartByDup = voornaamCols[0] || null;
    const blueStartByDup = voornaamCols.length >= 2 ? voornaamCols[1] : null;
    const redNameByCorner = nameCols.find((c)=>headerCorners0[c - 1] === "rood") || null;
    const blueNameByCorner = nameCols.find((c)=>headerCorners0[c - 1] === "blauw") || null;
    const redStart = above.redStart || redStartByDup || redNameByCorner || nameCols[0] || 2;
    let blueStart = above.blueStart || blueStartByDup || blueNameByCorner || null;
    if (!blueStart) blueStart = Math.min(maxCol, redStart + 7);
    if (blueStart <= redStart) {
        const alt = blueStartByDup && blueStartByDup > redStart ? blueStartByDup : null;
        blueStart = alt || Math.min(maxCol, redStart + 7);
    }
    // â FIX: ranges mogen NIET blind op styleCol eindigen als styleCol links staat.
    // Eerst default ranges:
    let redRange = {
        start: Math.max(1, redStart),
        end: Math.max(1, blueStart - 1)
    };
    let blueRange = {
        start: Math.max(1, blueStart),
        end: maxCol
    };
    // â Als we een vs-kolom hebben die tussen rood en blauw zit: gebruik die als splitter.
    if (vsCol && vsCol > redRange.start && vsCol < blueRange.end) {
        redRange = {
            start: redRange.start,
            end: Math.max(redRange.start, vsCol - 1)
        };
        blueRange = {
            start: Math.min(maxCol, vsCol + 1),
            end: maxCol
        };
    }
    // â Alleen als styleCol rechts van blueRange.start ligt, mag hij de blauwe range afkappen.
    if (styleCol && styleCol > blueRange.start) {
        blueRange.end = Math.max(blueRange.start, styleCol - 1);
    }
    const red0s = redRange.start - 1;
    const red0e = redRange.end - 1;
    const blu0s = blueRange.start - 1;
    const blu0e = blueRange.end - 1;
    const pVoor = [
        "voornaam",
        "voor"
    ];
    const pAch = [
        "achternaam",
        "ach",
        "achter"
    ];
    const pGym = [
        "gym",
        "sportschool",
        "school",
        "vereniging",
        "club",
        "team"
    ];
    const pGeb = [
        "geboorte",
        "geboortedatum",
        "geb",
        "dob",
        "birth"
    ];
    const pGew = [
        "gewicht",
        "gew",
        "kg",
        "kilo",
        "max kg"
    ];
    const pVA = [
        "va",
        "va nr",
        "paspoort",
        "passport",
        "id",
        "nva"
    ];
    const pRec = [
        "record",
        "rec",
        "erv",
        "ervaring",
        "exp"
    ];
    const red = {
        start: redRange.start,
        end: redRange.end,
        voor: findInRange(headers0, red0s, red0e, pVoor),
        ach: findInRange(headers0, red0s, red0e, pAch),
        naam: findNameColInRange(headers0, red0s, red0e),
        gym: findInRange(headers0, red0s, red0e, pGym),
        geb: findInRange(headers0, red0s, red0e, pGeb),
        gew: findInRange(headers0, red0s, red0e, pGew),
        va: findInRange(headers0, red0s, red0e, pVA),
        rec: findInRange(headers0, red0s, red0e, pRec)
    };
    const blue = {
        start: blueRange.start,
        end: blueRange.end,
        voor: findInRange(headers0, blu0s, blu0e, pVoor),
        ach: findInRange(headers0, blu0s, blu0e, pAch),
        naam: findNameColInRange(headers0, blu0s, blu0e),
        gym: findInRange(headers0, blu0s, blu0e, pGym),
        geb: findInRange(headers0, blu0s, blu0e, pGeb),
        gew: findInRange(headers0, blu0s, blu0e, pGew),
        va: findInRange(headers0, blu0s, blu0e, pVA),
        rec: findInRange(headers0, blu0s, blu0e, pRec)
    };
    return {
        red,
        blue,
        styleCol,
        classCol,
        partijCol
    };
}
/* =========================================================
   5. NAAM OPHALEN
========================================================= */ function extractNameFromRow(row, map) {
    const vNaam = map.naam ? cellTextLike(row.getCell(map.naam)) : "";
    if (vNaam && looksLikeName(vNaam)) return vNaam.trim();
    const vVoor = map.voor ? cellTextLike(row.getCell(map.voor)) : "";
    const vAch = map.ach ? cellTextLike(row.getCell(map.ach)) : "";
    if (vVoor && vAch) return `${vVoor} ${vAch}`.trim();
    if (vVoor && vVoor.includes(" ")) return vVoor.trim();
    if (vVoor && !vAch && map.voor) {
        const adj = cellTextLike(row.getCell(map.voor + 1));
        if (adj && looksLikeName(adj) && !extractVA(adj) && !extractDate(adj)) {
            return `${vVoor} ${adj}`.trim();
        }
        return vVoor.trim();
    }
    return null;
}
/* =========================================================
   6. ROW COLOR FALLBACK
========================================================= */ function scanRowByColorForCorner(row, maxCol, corner) {
    const out = {};
    for(let c = 1; c <= maxCol; c++){
        const cell = row.getCell(c);
        const v = cellTextLike(cell);
        if (!v) continue;
        const cc = getCellCornerFromLike(cell);
        if (cc !== corner) continue;
        if (!out.name && looksLikeName(v)) out.name = v;
        if (!out.gym && looksLikeGym(v)) out.gym = v;
        if (!out.va) {
            const va = extractVA(v);
            if (va) out.va = va;
        }
    }
    return out;
}
/* =========================================================
   7. MAIN â BUFFER â BOUTS (.xlsx / .xls)
========================================================= */ /** â TOEVOEGING: pauze regels overslaan */ function isPauseRowText(s) {
    const t = norm(s);
    if (!t) return false;
    return t.includes("pauze") || t.includes("break");
}
/** â TOEVOEGING: toernooi regels herkennen (niet overslaan) */ function isToernooiRowText(s) {
    const t = norm(s);
    if (!t) return false;
    return t.includes("toernooi");
}
async function parseExcelToBouts(fileBuffer) {
    // â Eerst proberen: jouw admin template (VS/T)
    try {
        const templ = await tryParseAdminTemplate(fileBuffer);
        if (templ && templ.length) {
            return templ;
        }
    } catch (e) {
        // val terug op de robuuste parser
        console.warn("[parseExcelToBouts] template-parse faalde, fallback naar robuuste parser:", e?.message);
    }
    // --- Kies loader op basis van signature / extensie maakt niet uit ---
    let sheet = null;
    let mode = "exceljs_xlsx";
    if (isOleXls(fileBuffer)) {
        // .xls (OLE)
        const wb = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$xlsx$2f$xlsx$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["read"](fileBuffer, {
            type: "buffer",
            cellDates: true,
            cellStyles: true,
            raw: false
        });
        sheet = sheetjsToSheetLike(wb);
        mode = "sheetjs_xls";
    } else {
        // probeer eerst ExcelJS (.xlsx)
        try {
            const workbook = new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$exceljs$2f$excel$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["default"].Workbook();
            await workbook.xlsx.load(fileBuffer);
            const ws = workbook.worksheets[0];
            if (!ws) return [];
            sheet = exceljsToSheetLike(ws);
            mode = "exceljs_xlsx";
        } catch  {
            // fallback: kan ook xlsx zijn maar ExcelJS struikelt -> SheetJS
            const wb = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$xlsx$2f$xlsx$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["read"](fileBuffer, {
                type: "buffer",
                cellDates: true,
                cellStyles: true,
                raw: false
            });
            sheet = sheetjsToSheetLike(wb);
            mode = "sheetjs_xlsx";
        }
    }
    if (!sheet || sheet.rowCount === 0) return [];
    // VA-only mode
    const vaOnly = tryParseVaOnlyPairs(sheet);
    if (vaOnly) {
        console.log("ð Parsed bouts (VA-only mode):", vaOnly.length, "mode:", mode);
        console.log("VA rood:", vaOnly.filter((b)=>b.va_rood).length);
        console.log("VA blauw:", vaOnly.filter((b)=>b.va_blauw).length);
        return vaOnly;
    }
    const maxCol = Math.min(sheet.columnCount || 80, 120);
    const headerRowIndex = detectHeaderRow(sheet, 50, Math.min(80, maxCol));
    const { red, blue, styleCol, classCol, partijCol } = buildCornerMaps({
        sheet,
        headerRowIndex,
        maxCol
    });
    const bouts = [];
    let autoNr = 1;
    for(let r = headerRowIndex + 1; r <= sheet.rowCount; r++){
        const row = sheet.getRow(r);
        // â TOEVOEGING: pauze regel skip (kijk in eerste paar cellen)
        const t1 = cellTextLike(row.getCell(1));
        const t2 = cellTextLike(row.getCell(2));
        const t3 = cellTextLike(row.getCell(3));
        if (isPauseRowText(t1) || isPauseRowText(t2) || isPauseRowText(t3)) continue;
        let nonEmpty = 0;
        for(let c = 1; c <= Math.min(maxCol, 40); c++){
            if (cellTextLike(row.getCell(c))) nonEmpty++;
        }
        if (nonEmpty < 3) continue;
        const bout = makeEmptyBout();
        bout.extra.parse_mode = mode;
        // â TOEVOEGING: toernooi herkennen (niet overslaan)
        // Check eerste paar cellen + een korte scan (veilig voor layouts zonder vaste kolom)
        let isToernooi = false;
        if (isToernooiRowText(t1) || isToernooiRowText(t2) || isToernooiRowText(t3)) {
            isToernooi = true;
        } else {
            for(let c = 1; c <= Math.min(maxCol, 12); c++){
                const tt = cellTextLike(row.getCell(c));
                if (isToernooiRowText(tt)) {
                    isToernooi = true;
                    break;
                }
            }
        }
        if (isToernooi) bout.extra.is_toernooi = true;
        // â TOEVOEGING: max gewicht "-31" detecteren en opslaan
        // (zonder je bestaande gewicht-mapping te veranderen)
        for(let c = 1; c <= Math.min(maxCol, 40); c++){
            const txt = cellTextLike(row.getCell(c));
            const val = row.getCell(c).value;
            const mw = extractMaxWeightOnly(txt) || extractMaxWeightOnly(val);
            if (mw) {
                bout.extra.max_gewicht = mw; // bijv "31"
                break;
            }
        }
        const pRaw = cellTextLike(row.getCell(partijCol || 1));
        const pFirst = cellTextLike(row.getCell(1));
        if (pRaw && /^\d{1,4}$/.test(pRaw)) {
            bout.partij_nr = Number(pRaw);
            autoNr = bout.partij_nr + 1;
        } else if (pFirst && /^\d{1,4}$/.test(pFirst)) {
            bout.partij_nr = Number(pFirst);
            autoNr = bout.partij_nr + 1;
        } else {
            bout.partij_nr = autoNr++;
        }
        // ROOD
        bout.rood_naam = extractNameFromRow(row, red);
        const roodGym = red.gym ? cellTextLike(row.getCell(red.gym)) : "";
        bout.rood_gym = roodGym || null;
        const roodGebRaw = red.geb ? row.getCell(red.geb).value : null;
        bout.rood_geboortedatum = extractDate(roodGebRaw);
        const roodGew = red.gew ? cellTextLike(row.getCell(red.gew)) : "";
        bout.rood_gewicht = extractWeight(roodGew);
        const roodVaRaw = red.va ? cellTextLike(row.getCell(red.va)) : "";
        bout.va_rood = extractVA(roodVaRaw);
        const roodRecRaw = red.rec ? cellTextLike(row.getCell(red.rec)) : "";
        const recR = extractRecord(roodRecRaw);
        if (recR) {
            bout.record_rood_w = recR.w;
            bout.record_rood_l = recR.l;
            bout.record_rood_d = recR.d;
        }
        // BLAUW
        bout.blauw_naam = extractNameFromRow(row, blue);
        const blauwGym = blue.gym ? cellTextLike(row.getCell(blue.gym)) : "";
        bout.blauw_gym = blauwGym || null;
        const blauwGebRaw = blue.geb ? row.getCell(blue.geb).value : null;
        bout.blauw_geboortedatum = extractDate(blauwGebRaw);
        const blauwGew = blue.gew ? cellTextLike(row.getCell(blue.gew)) : "";
        bout.blauw_gewicht = extractWeight(blauwGew);
        const blauwVaRaw = blue.va ? cellTextLike(row.getCell(blue.va)) : "";
        bout.va_blauw = extractVA(blauwVaRaw);
        const blauwRecRaw = blue.rec ? cellTextLike(row.getCell(blue.rec)) : "";
        const recB = extractRecord(blauwRecRaw);
        if (recB) {
            bout.record_blauw_w = recB.w;
            bout.record_blauw_l = recB.l;
            bout.record_blauw_d = recB.d;
        }
        // stijl/klasse
        if (styleCol) {
            const v = cellTextLike(row.getCell(styleCol));
            bout.discipline = v || null;
        }
        if (classCol) {
            const v = cellTextLike(row.getCell(classCol));
            bout.klasse = v || null;
        }
        // kleur fallback (best effort; bij .xls kan dit null zijn als styles ontbreken)
        if (!bout.rood_naam || !bout.va_rood || !bout.rood_gym) {
            const byColor = scanRowByColorForCorner(row, maxCol, "rood");
            if (!bout.rood_naam && byColor.name) bout.rood_naam = byColor.name;
            if (!bout.rood_gym && byColor.gym) bout.rood_gym = byColor.gym;
            if (!bout.va_rood && byColor.va) bout.va_rood = byColor.va;
        }
        if (!bout.blauw_naam || !bout.va_blauw || !bout.blauw_gym) {
            const byColor = scanRowByColorForCorner(row, maxCol, "blauw");
            if (!bout.blauw_naam && byColor.name) bout.blauw_naam = byColor.name;
            if (!bout.blauw_gym && byColor.gym) bout.blauw_gym = byColor.gym;
            if (!bout.va_blauw && byColor.va) bout.va_blauw = byColor.va;
        }
        if (!bout.va_rood) bout.extra.missing_va_rood = true;
        if (!bout.va_blauw) bout.extra.missing_va_blauw = true;
        const hasAny = bout.rood_naam || bout.blauw_naam || bout.va_rood || bout.va_blauw || bout.rood_gym || bout.blauw_gym;
        if (!hasAny) continue;
        bouts.push(bout);
    }
    console.log("ð Parsed bouts:", bouts.length, "mode:", mode);
    console.log("VA rood:", bouts.filter((b)=>b.va_rood).length);
    console.log("VA blauw:", bouts.filter((b)=>b.va_blauw).length);
    return bouts;
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
"[project]/app/api/submit-matchmaking/route.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "POST",
    ()=>POST,
    "runtime",
    ()=>runtime
]);
// app/api/submit_matchmaking/start/route.ts
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/server.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$supabase$2f$supabase$2d$js$2f$dist$2f$index$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/@supabase/supabase-js/dist/index.mjs [app-route] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$externals$5d2f$crypto__$5b$external$5d$__$28$crypto$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/crypto [external] (crypto, cjs)");
var __TURBOPACK__imported__module__$5b$project$5d2f$app$2f$api$2f$submit$2d$matchmaking$2f$parse_matchmaking$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/app/api/submit-matchmaking/parse_matchmaking.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$app$2f$api$2f$_utils$2f$authz$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/app/api/_utils/authz.ts [app-route] (ecmascript)");
;
;
;
;
;
const supabaseUrl = ("TURBOPACK compile-time value", "https://krskuyaqvzloptfndznc.supabase.co");
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAdmin = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$supabase$2f$supabase$2d$js$2f$dist$2f$index$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$locals$3e$__["createClient"])(supabaseUrl, serviceRoleKey, {
    auth: {
        persistSession: false
    }
});
const runtime = "nodejs";
/* =========================================================
   Content-type helpers
========================================================= */ function ct(req) {
    return (req.headers.get("content-type") ?? "").toLowerCase();
}
function isJson(req) {
    return ct(req).includes("application/json");
}
function isForm(req) {
    const c = ct(req);
    return c.includes("multipart/form-data") || c.includes("application/x-www-form-urlencoded");
}
/* =========================================================
   Storage download (JSON flow)
========================================================= */ async function downloadStorageFile(file_path) {
    const { data, error } = await supabaseAdmin.storage.from("uploads").download(file_path);
    if (error) throw new Error(`Storage download mislukt: ${error.message}`);
    const ab = await data.arrayBuffer();
    return Buffer.from(ab);
}
/* =========================================================
   Fingerprint helpers (order-agnostic VA pair)
========================================================= */ function toVaStrict(v) {
    if (v == null) return null;
    const s = String(v).trim();
    if (/^\d{1,6}$/.test(s)) return s;
    const digits = s.replace(/[^0-9]/g, "");
    if (/^\d{1,6}$/.test(digits)) return digits;
    return null;
}
function normUpper(v) {
    return String(v ?? "").trim().toUpperCase();
}
function canonVaPair(vaR, vaB) {
    if (!vaR || !vaB) return null;
    const a = String(vaR).trim();
    const b = String(vaB).trim();
    if (!a || !b) return null;
    return a < b ? `${a}|${b}` : `${b}|${a}`;
}
function toBoolLoose(v) {
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
function boutFingerprint(opts) {
    const pair = canonVaPair(opts.vaR, opts.vaB);
    if (!pair) return null;
    const d = normUpper(opts.discipline);
    const k = normUpper(opts.klasse);
    // optioneel toernooi meenemen als je 'm hebt
    const tBool = toBoolLoose(opts.is_toernooi);
    const t = tBool == null ? "" : tBool ? "||T" : "||F";
    return `${pair}||${d}||${k}${t}`;
}
async function fetchExistingBoutUidIndex(matchmaking_id) {
    // Map fingerprint -> list of bout_uid(s)
    const index = new Map();
    const { data, error } = await supabaseAdmin.from("matchmaking_bouts_raw").select("bout_uid,va_rood,va_blauw,discipline,klasse,is_toernooi").eq("matchmaking_id", matchmaking_id);
    if (error) throw error;
    for (const r of data ?? []){
        const uid = String(r?.bout_uid ?? "").trim();
        if (!uid) continue;
        const vaR = toVaStrict(r?.va_rood);
        const vaB = toVaStrict(r?.va_blauw);
        const fp = boutFingerprint({
            vaR,
            vaB,
            discipline: r?.discipline,
            klasse: r?.klasse,
            is_toernooi: r?.is_toernooi
        });
        if (!fp) continue;
        if (!index.has(fp)) index.set(fp, []);
        index.get(fp).push(uid);
    }
    return index;
}
const ALLOWED_BONDTEAMS = new Set([
    "IRO",
    "NKF",
    "WPKL",
    "WMTA",
    "VON",
    "UMC",
    "MMAAN",
    "MON"
]);
function bad(error, status = 400) {
    return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
        error
    }, {
        status
    });
}
function roleLower(r) {
    const x = String(r ?? "").trim().toLowerCase();
    if (x === "superadmin" || x === "admin" || x === "matchmaker" || x === "official" || x === "hoofdofficial" || x === "dispensatie_admin") {
        return x;
    }
    return "unknown";
}
async function POST(req) {
    try {
        // ✅ Auth: only authenticated roles can submit
        const auth = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$app$2f$api$2f$_utils$2f$authz$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["requireAnyRole"])(req, [
            "admin",
            "matchmaker",
            "official",
            "hoofdofficial"
        ]);
        const userId = auth.userId;
        const role = roleLower(auth.role);
        let evenement_naam = "";
        let evenement_datum = "";
        let locatie = null;
        let matchmaker = null;
        let bondteam = null;
        let hoofdofficial = null;
        let promotor = null;
        // uploaded_by is ALWAYS enforced server-side from auth
        const uploaded_by = userId;
        let matchmaking_id = null;
        let force_new = false;
        // ✅ event koppeling / auto-create
        let event_id = null;
        // upload token (client-side correlation, not DB id)
        const upload_token = (0, __TURBOPACK__imported__module__$5b$externals$5d2f$crypto__$5b$external$5d$__$28$crypto$2c$__cjs$29$__["randomUUID"])();
        let raw_filename = null;
        let bouts = [];
        // -----------------------
        // A) JSON + file_path
        // -----------------------
        if (isJson(req)) {
            const body = await req.json();
            const file_path = String(body.file_path ?? "").trim();
            raw_filename = body.raw_filename ? String(body.raw_filename) : null;
            evenement_naam = String(body.evenement_naam ?? "").trim();
            evenement_datum = String(body.evenement_datum ?? "").trim();
            locatie = body.locatie ? String(body.locatie).trim() : null;
            matchmaker = body.matchmaker ? String(body.matchmaker).trim() : null;
            const bondteamRaw = body.bondteam ? String(body.bondteam).trim() : null;
            bondteam = bondteamRaw && ALLOWED_BONDTEAMS.has(bondteamRaw) ? bondteamRaw : bondteamRaw; // niet blokkeren, maar wel normaliseren
            hoofdofficial = body.hoofdofficial ? String(body.hoofdofficial).trim() : null;
            promotor = body.promotor ? String(body.promotor).trim() : null;
            // ignore uploaded_by from client (spoofing)
            matchmaking_id = body.matchmaking_id ? String(body.matchmaking_id) : null;
            force_new = Boolean(body.force_new ?? false);
            event_id = body.event_id ? String(body.event_id) : null;
            if (!file_path) return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: "JSON mist file_path."
            }, {
                status: 400
            });
            const buffer = await downloadStorageFile(file_path);
            bouts = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$app$2f$api$2f$submit$2d$matchmaking$2f$parse_matchmaking$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["parseExcelToBouts"])(buffer);
        } else if (isForm(req)) {
            const form = await req.formData();
            const file = form.get("file");
            evenement_naam = String(form.get("evenement_naam") ?? "").trim();
            evenement_datum = String(form.get("evenement_datum") ?? "").trim();
            locatie = String(form.get("locatie") ?? "").trim() || null;
            matchmaker = String(form.get("matchmaker") ?? "").trim() || null;
            const bondteamRaw = String(form.get("bondteam") ?? "").trim() || null;
            bondteam = bondteamRaw && ALLOWED_BONDTEAMS.has(bondteamRaw) ? bondteamRaw : bondteamRaw;
            hoofdofficial = String(form.get("hoofdofficial") ?? "").trim() || null;
            promotor = String(form.get("promotor") ?? "").trim() || null;
            // ignore uploaded_by from client (spoofing)
            matchmaking_id = String(form.get("matchmaking_id") ?? "").trim() || null;
            force_new = String(form.get("force_new") ?? "false") === "true";
            event_id = String(form.get("event_id") ?? "").trim() || null;
            if (!file) return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: "Geen file ontvangen."
            }, {
                status: 400
            });
            raw_filename = file?.name ? String(file.name) : null;
            const ab = await file.arrayBuffer();
            const buffer = Buffer.from(ab);
            bouts = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$app$2f$api$2f$submit$2d$matchmaking$2f$parse_matchmaking$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["parseExcelToBouts"])(buffer);
        } else {
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: "Onjuiste Content-Type. Gebruik application/json of multipart/form-data."
            }, {
                status: 415
            });
        }
        // ✅ Shared validation (after parsing)
        if (!evenement_naam || !evenement_datum) return bad("Vul verplicht in: evenement_naam en evenement_datum.");
        if (!bondteam) return bad("Bondteam is verplicht.");
        if (!ALLOWED_BONDTEAMS.has(String(bondteam))) return bad("Onbekend bondteam.");
        if (role === "official" || role === "hoofdofficial") {
            // official: must stay within own bondteam
            const userBond = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$app$2f$api$2f$_utils$2f$authz$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getUserBondteam"])(userId);
            if (!userBond) return bad("Je profiel mist bondteam.", 403);
            if (String(userBond) !== String(bondteam)) return bad("Bondteam mismatch: je mag alleen uploaden voor je eigen bondteam.", 403);
            const mm = String(matchmaker ?? "").trim();
            const pr = String(promotor ?? "").trim();
            if (!mm && !pr) return bad("Vul matchmaker of promotor in (minimaal één).", 400);
        } else {
            // matchmaker/admin: matchmaker verplicht
            const mm = String(matchmaker ?? "").trim();
            if (!mm) return bad("Matchmaker is verplicht.", 400);
        }
        const now = new Date().toISOString();
        // -----------------------
        // 0) event aanmaken (als niet meegegeven)
        // -----------------------
        let evId = event_id ? String(event_id).trim() : "";
        if (!evId) {
            const { data: ev, error: evErr } = await supabaseAdmin.from("events").insert({
                naam: evenement_naam,
                datum: evenement_datum,
                locatie,
                status: "draft",
                bondteam,
                matchmaker,
                hoofdofficial,
                promotor
            }).select("id").single();
            if (evErr) return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: evErr.message
            }, {
                status: 500
            });
            evId = String(ev?.id ?? "").trim();
        } else {
            // licht check: bestaat event?
            const { data: ex, error: exErr } = await supabaseAdmin.from("events").select("id").eq("id", evId).maybeSingle();
            if (exErr) return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: exErr.message
            }, {
                status: 500
            });
            if (!ex) {
                return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                    error: "event_id bestaat niet (events)."
                }, {
                    status: 400
                });
            }
        }
        // -----------------------
        // 1) matchmaking id bepalen (bigint-safe)
        // -----------------------
        // Let op: sommige installs gebruiken BIGINT ids i.p.v. UUID. Daarom:
        // - Als matchmaking_id wordt meegegeven: moet dit numeriek zijn.
        // - Als nieuw: laat Postgres het id genereren en lees het terug.
        let mmId = "";
        if (!force_new && matchmaking_id) {
            const s = String(matchmaking_id).trim();
            if (!/^\d+$/.test(s)) {
                return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                    error: "matchmaking_id moet een numerieke id zijn (bigint) in deze database."
                }, {
                    status: 400
                });
            }
            mmId = s;
        } else {
            const { data: mm, error: mmError } = await supabaseAdmin.from("matchmakings").insert({
                naam: evenement_naam,
                datum: evenement_datum,
                locatie,
                created_at: now
            }).select("id").single();
            if (mmError) return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: mmError.message
            }, {
                status: 500
            });
            mmId = String(mm?.id ?? "").trim();
            if (!mmId) return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: "Kon matchmaking id niet bepalen."
            }, {
                status: 500
            });
        }
        // -----------------------
        // 2) upload meta opslaan (met event_id!) (bigint-safe)
        // -----------------------
        // Laat ook hier het id door Postgres genereren als de kolom BIGINT is.
        const { data: uploadRow, error: uploadErr } = await supabaseAdmin.from("matchmaking_uploads").insert({
            matchmaking_id: mmId,
            event_id: evId,
            evenement_naam,
            evenement_datum,
            locatie,
            raw_filename,
            matchmaker,
            bondteam,
            hoofdofficial,
            promotor,
            uploaded_by,
            uploaded_at: now,
            created_at: now
        }).select("id").single();
        if (uploadErr) return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            error: uploadErr.message
        }, {
            status: 500
        });
        // Zorg dat response altijd upload_id teruggeeft (string)
        const uploadIdFinal = String(uploadRow?.id ?? "").trim();
        // -----------------------
        // 4) bouts insert met bout_uid herkenning
        // -----------------------
        const existingIndex = await fetchExistingBoutUidIndex(mmId);
        let reused = 0;
        let ambiguous = 0;
        let created = 0;
        const rows = [];
        for (const b of bouts ?? []){
            const vaR = toVaStrict(b?.va_rood ?? b?.rood_va ?? b?.rood_va_mm);
            const vaB = toVaStrict(b?.va_blauw ?? b?.blauw_va ?? b?.blauw_va_mm);
            const discipline = normUpper(b?.discipline ?? "");
            const klasse = normUpper(b?.klasse ?? "");
            // ✅ parser kan is_toernooi of toernooi geven
            const is_toernooi = b?.is_toernooi ?? b?.toernooi ?? null;
            const fp = boutFingerprint({
                vaR,
                vaB,
                discipline,
                klasse,
                is_toernooi
            });
            let bout_uid = b?.bout_uid ? String(b.bout_uid).trim() : (0, __TURBOPACK__imported__module__$5b$externals$5d2f$crypto__$5b$external$5d$__$28$crypto$2c$__cjs$29$__["randomUUID"])();
            if (fp) {
                const list = existingIndex.get(fp) ?? [];
                if (list.length === 1) {
                    bout_uid = list[0];
                    reused++;
                } else if (list.length > 1) {
                    // ambigu: kies niet automatisch
                    ambiguous++;
                    bout_uid = (0, __TURBOPACK__imported__module__$5b$externals$5d2f$crypto__$5b$external$5d$__$28$crypto$2c$__cjs$29$__["randomUUID"])();
                } else {
                    created++;
                }
            } else {
                created++;
            }
            rows.push({
                upload_id: uploadIdFinal,
                matchmaking_id: mmId,
                bout_uid,
                partij_nr: b?.partij_nr ?? null,
                rood_naam: b?.rood_naam ?? null,
                rood_gym: b?.rood_gym ?? null,
                va_rood: vaR,
                rood_geboortedatum: b?.rood_geboortedatum ?? null,
                rood_gewicht: b?.rood_gewicht ?? null,
                blauw_naam: b?.blauw_naam ?? null,
                blauw_gym: b?.blauw_gym ?? null,
                va_blauw: vaB,
                blauw_geboortedatum: b?.blauw_geboortedatum ?? null,
                blauw_gewicht: b?.blauw_gewicht ?? null,
                discipline: discipline || null,
                klasse: klasse || null,
                is_toernooi: toBoolLoose(is_toernooi),
                raw_json: b?.extra ?? null,
                created_at: now
            });
        }
        if (rows.length) {
            const { error: boutErr } = await supabaseAdmin.from("matchmaking_bouts_raw").insert(rows);
            if (boutErr) return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: boutErr.message
            }, {
                status: 500
            });
        }
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            ok: true,
            upload_id: uploadIdFinal,
            upload_token,
            matchmaking_id: mmId,
            event_id: evId,
            stats: {
                total: rows.length,
                reused,
                ambiguous,
                created
            }
        });
    } catch (e) {
        console.error(e);
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            error: e?.message || "Onbekende fout"
        }, {
            status: 500
        });
    }
}
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__eba1b936._.js.map