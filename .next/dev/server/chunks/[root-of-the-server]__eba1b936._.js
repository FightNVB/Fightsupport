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
// MATCHCONTROL PARSER – VERSIE 12.7 – HERKENNING -95 VS 95+
// ---------------------------------------------------------
//
// ✅ .xlsx via ExcelJS (styles + waarden)
// ✅ .xls via SheetJS (xlsx lib) fallback (styles/kleur best-effort)
// ✅ Zelfde logica: header detectie + rood/blauw split + VA-only mode
//
// ✅ REGELS:
// - "gewicht" / "kg" = gewicht van 1 vechter (rood of blauw)
// - "max gewicht" / "max kg" = afgesproken bovengrens voor beide vechters
// - "min gewicht" / "min kg" = afgesproken ondergrens voor beide vechters
// - afgesproken gewicht is partijniveau, net als discipline/klasse
// - max/min gewicht mag NOOIT als rood_gewicht of blauw_gewicht worden gelezen
//
// ✅ NIEUW:
// - "-95"  = maximaal / tot en met 95 kilo
// - "95+"  = open klasse / zwaarder dan 95 kilo
// - parser bewaart nu ook de oorspronkelijke notatie zodat weegstation
//   later verschil kan maken tussen -95 en 95+
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
   0. GENERIC HELPERS
========================================================= */ function norm(v) {
    if (v == null) return "";
    return String(v).toLowerCase().trim();
}
function safe(v) {
    return v == null ? "" : String(v).trim();
}
function normCell(v) {
    return String(v ?? "").trim();
}
function normLower(v) {
    return normCell(v).toLowerCase();
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
function formatWeightNumber(n) {
    if (!Number.isFinite(n)) return "";
    if (Number.isInteger(n)) return String(n);
    return String(n).replace(/\.0+$/, "").replace(/(\.\d*?)0+$/, "$1");
}
/**
 * Parseert gewicht/notatie.
 *
 * exact:
 * - 56
 * - 56kg
 * - 56 kg
 * - KG 56
 * - Gewicht 56 kg
 *
 * klasse-notatie:
 * - -95
 * - - 95 kg
 * - 95+
 * - 95 + kg
 * - +95
 */ function extractWeightMeta(raw, opts) {
    const allowClassNotation = Boolean(opts?.allowClassNotation);
    if (raw == null) return null;
    if (typeof raw === "number" && Number.isFinite(raw)) {
        if (raw >= 10 && raw <= 200) {
            const label = formatWeightNumber(raw);
            return {
                value: raw,
                label,
                type: "exact"
            };
        }
        return null;
    }
    const v = String(raw).toLowerCase().replace(",", ".").trim();
    if (!v) return null;
    if (isProbablyDate(v)) return null;
    if (allowClassNotation) {
        const plusAfter = v.match(/^\s*(\d+(?:\.\d+)?)\s*\+\s*(kg)?\s*$/i);
        if (plusAfter) {
            const n = Number(plusAfter[1]);
            if (Number.isFinite(n) && n >= 10 && n <= 200) {
                return {
                    value: n,
                    label: `${formatWeightNumber(n)}+`,
                    type: "open_above"
                };
            }
        }
        const plusBefore = v.match(/^\s*\+\s*(\d+(?:\.\d+)?)\s*(kg)?\s*$/i);
        if (plusBefore) {
            const n = Number(plusBefore[1]);
            if (Number.isFinite(n) && n >= 10 && n <= 200) {
                return {
                    value: n,
                    label: `${formatWeightNumber(n)}+`,
                    type: "open_above"
                };
            }
        }
        const minusPrefix = v.match(/^\s*-\s*(\d+(?:\.\d+)?)\s*(kg)?\s*$/i);
        if (minusPrefix) {
            const n = Number(minusPrefix[1]);
            if (Number.isFinite(n) && n >= 10 && n <= 200) {
                return {
                    value: n,
                    label: `-${formatWeightNumber(n)}`,
                    type: "up_to"
                };
            }
        }
    } else {
        // In echte vechtergewichten willen we 95+ of -95 NIET als exact 95 lezen.
        if (/^\s*-\s*\d/.test(v)) return null;
        if (/^\s*\+\s*\d/.test(v)) return null;
        if (/\d\s*\+\s*(kg)?\s*$/i.test(v)) return null;
    }
    const m = v.match(/(\d+(?:\.\d+)?)/);
    if (!m) return null;
    const n = Number(m[1]);
    if (!Number.isFinite(n)) return null;
    if (n < 10 || n > 200) return null;
    return {
        value: n,
        label: formatWeightNumber(n),
        type: "exact"
    };
}
/**
 * Alleen class-achtige notaties:
 * - -60
 * - - 60 kg
 * - 95+
 * - +95
 */ function extractClassWeightMetaOnly(raw) {
    if (raw == null) return null;
    const v = String(raw).toLowerCase().replace(",", ".").trim();
    if (!v) return null;
    if (isProbablyDate(v)) return null;
    const plusAfter = v.match(/^\s*(\d+(?:\.\d+)?)\s*\+\s*(kg)?\s*$/i);
    if (plusAfter) {
        const n = Number(plusAfter[1]);
        if (Number.isFinite(n) && n >= 10 && n <= 200) {
            return {
                value: n,
                label: `${formatWeightNumber(n)}+`,
                type: "open_above"
            };
        }
    }
    const plusBefore = v.match(/^\s*\+\s*(\d+(?:\.\d+)?)\s*(kg)?\s*$/i);
    if (plusBefore) {
        const n = Number(plusBefore[1]);
        if (Number.isFinite(n) && n >= 10 && n <= 200) {
            return {
                value: n,
                label: `${formatWeightNumber(n)}+`,
                type: "open_above"
            };
        }
    }
    const minusPrefix = v.match(/^\s*-\s*(\d+(?:\.\d+)?)\s*(kg)?\s*$/i);
    if (minusPrefix) {
        const n = Number(minusPrefix[1]);
        if (Number.isFinite(n) && n >= 10 && n <= 200) {
            return {
                value: n,
                label: `-${formatWeightNumber(n)}`,
                type: "up_to"
            };
        }
    }
    return null;
}
/**
 * Alleen exacte gewichten voor echte vechter-gewichten.
 */ function extractWeight(raw) {
    const meta = extractWeightMeta(raw, {
        allowClassNotation: false
    });
    if (!meta) return null;
    return meta.type === "exact" ? meta.label : null;
}
function parseWeightNumber(v) {
    const meta = extractWeightMeta(v, {
        allowClassNotation: false
    });
    if (!meta || meta.type !== "exact") return null;
    return Number.isFinite(meta.value) ? meta.value : null;
}
function parseAgreedWeightMeta(v) {
    return extractWeightMeta(v, {
        allowClassNotation: true
    });
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
 * - accepteert 2–6 cijfers als geldig
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
    if (extractWeightMeta(s, {
        allowClassNotation: true
    })) return false;
    return /^[A-Za-zÀ-ÿ'’.\- ]{3,}$/.test(s);
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
        rood_gewicht_notatie: null,
        blauw_naam: null,
        blauw_gym: null,
        va_blauw: null,
        blauw_geboortedatum: null,
        blauw_gewicht: null,
        blauw_gewicht_notatie: null,
        discipline: null,
        klasse: null,
        max_gewicht: null,
        max_gewicht_notatie: null,
        min_gewicht: null,
        min_gewicht_notatie: null,
        record_rood_w: 0,
        record_rood_l: 0,
        record_rood_d: 0,
        record_blauw_w: 0,
        record_blauw_l: 0,
        record_blauw_d: 0,
        is_toernooi: false,
        extra: {}
    };
}
function applyCornerWeightMeta(bout, corner, meta) {
    if (!meta) return;
    if (corner === "rood") {
        if (meta.type === "exact") {
            bout.rood_gewicht = meta.label;
            bout.rood_gewicht_notatie = meta.label;
        } else {
            bout.rood_gewicht = null;
            bout.rood_gewicht_notatie = meta.label;
            bout.extra.rood_gewicht_type = meta.type;
        }
        return;
    }
    if (meta.type === "exact") {
        bout.blauw_gewicht = meta.label;
        bout.blauw_gewicht_notatie = meta.label;
    } else {
        bout.blauw_gewicht = null;
        bout.blauw_gewicht_notatie = meta.label;
        bout.extra.blauw_gewicht_type = meta.type;
    }
}
function applyAgreedWeightMeta(bout, kind, meta) {
    if (!meta) return;
    if (kind === "max") {
        bout.max_gewicht = meta.value;
        bout.max_gewicht_notatie = meta.label;
        bout.extra.max_gewicht_type = meta.type;
        return;
    }
    bout.min_gewicht = meta.value;
    bout.min_gewicht_notatie = meta.label;
    bout.extra.min_gewicht_type = meta.type;
}
function isVsMarker(v) {
    const s = normLower(v);
    return s === "vs" || s === "v.s" || s === "v.s." || s === "versus";
}
function parseTCode(v) {
    const s = normCell(v).toUpperCase();
    if (!s) return null;
    if (s === "T") return "T";
    if (/^T\d{1,3}$/.test(s)) return s;
    return null;
}
function detectTemplateCols(headerRow) {
    const h = headerRow.map((x)=>normLower(x));
    const at = (col1)=>h[col1 - 1] ?? "";
    const fixedTemplateMatch = at(1).includes("partij") && at(2).includes("discipline") && at(3).includes("klasse") && at(4).includes("naam atleet 1") && at(5).includes("sportschool") && at(6).includes("fightpaspoort") && (at(7) === "kg (1)" || at(7) === "gewicht (1)" || at(7).includes("kg (1)") || at(7).includes("gewicht (1)")) && (at(8) === "vs" || at(8) === "v.s" || at(8).includes("vs")) && at(9).includes("naam atleet 2") && at(10).includes("sportschool") && at(11).includes("fightpaspoort") && (at(12) === "kg (2)" || at(12) === "gewicht (2)" || at(12).includes("kg (2)") || at(12).includes("gewicht (2)")) && (at(13).includes("max kg") || at(13).includes("max gewicht"));
    if (fixedTemplateMatch) {
        return {
            partijNr: 1,
            discipline: 2,
            klasse: 3,
            naam1: 4,
            gym1: 5,
            va1: 6,
            kg1: 7,
            vs: 8,
            naam2: 9,
            gym2: 10,
            va2: 11,
            kg2: 12,
            maxKg: 13,
            minKg: null
        };
    }
    const idx = (needles)=>{
        for(let i = 0; i < h.length; i++){
            const v = h[i];
            if (!v) continue;
            if (needles.some((n)=>v === n || v.includes(n))) return i + 1;
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
    const minKg = idx([
        "min kg",
        "minkg",
        "min gewicht"
    ]);
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
    ].some((x)=>x < 1)) {
        return null;
    }
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
        maxKg: maxKg > 0 ? maxKg : null,
        minKg: minKg > 0 ? minKg : null
    };
}
async function tryParseAdminTemplate(fileBuffer) {
    const wb = new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$exceljs$2f$excel$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["default"].Workbook();
    await wb.xlsx.load(fileBuffer);
    const ws = wb.worksheets?.[0];
    if (!ws) return null;
    let headerRowIndex = -1;
    let cols = null;
    for(let r = 1; r <= Math.min(25, ws.rowCount); r++){
        const row = ws.getRow(r);
        const header = [];
        for(let c = 1; c <= Math.min(40, ws.columnCount); c++){
            header.push(row.getCell(c).value);
        }
        const detected = detectTemplateCols(header);
        if (detected) {
            headerRowIndex = r;
            cols = detected;
            break;
        }
    }
    if (!cols || headerRowIndex < 1) return null;
    const bouts = [];
    const deelnemersByT = {};
    let maxPartijNr = 0;
    const lastRow = ws.rowCount;
    for(let r = headerRowIndex + 1; r <= lastRow; r++){
        const row = ws.getRow(r);
        const partijNrRaw = row.getCell(cols.partijNr).value;
        const partijNr = typeof partijNrRaw === "number" ? partijNrRaw : Number(normCell(partijNrRaw));
        if (Number.isFinite(partijNr) && partijNr > maxPartijNr) {
            maxPartijNr = partijNr;
        }
        const discipline = normCell(row.getCell(cols.discipline).value) || null;
        const klasse = normCell(row.getCell(cols.klasse).value) || null;
        const naam1 = normCell(row.getCell(cols.naam1).value) || null;
        const gym1 = normCell(row.getCell(cols.gym1).value) || null;
        const va1 = extractVA(row.getCell(cols.va1).value) || null;
        const kg1Meta = cols.kg1 > 0 ? extractWeightMeta(row.getCell(cols.kg1).value, {
            allowClassNotation: true
        }) : null;
        const vsVal = row.getCell(cols.vs).value;
        const naam2 = normCell(row.getCell(cols.naam2).value) || null;
        const gym2 = normCell(row.getCell(cols.gym2).value) || null;
        const va2 = extractVA(row.getCell(cols.va2).value) || null;
        const kg2Meta = cols.kg2 > 0 ? extractWeightMeta(row.getCell(cols.kg2).value, {
            allowClassNotation: true
        }) : null;
        const maxKgVal = cols.maxKg ? row.getCell(cols.maxKg).value : null;
        const minKgVal = cols.minKg ? row.getCell(cols.minKg).value : null;
        const maxKgMeta = parseAgreedWeightMeta(maxKgVal);
        const minKgMeta = parseAgreedWeightMeta(minKgVal);
        const tCode = parseTCode(vsVal);
        const isEmptyLine = !naam1 && !gym1 && !va1 && !kg1Meta && !naam2 && !gym2 && !va2 && !kg2Meta && !discipline && !klasse && !tCode && !maxKgMeta && !minKgMeta;
        if (isEmptyLine) continue;
        if (isVsMarker(vsVal) && (naam2 || va2 || gym2 || kg2Meta)) {
            const bout = {
                bout_uid: (0, __TURBOPACK__imported__module__$5b$externals$5d2f$crypto__$5b$external$5d$__$28$crypto$2c$__cjs$29$__["randomUUID"])(),
                partij_nr: Number.isFinite(partijNr) ? partijNr : null,
                rood_naam: naam1,
                rood_gym: gym1,
                va_rood: va1,
                rood_geboortedatum: null,
                rood_gewicht: kg1Meta?.type === "exact" ? kg1Meta.label : null,
                rood_gewicht_notatie: kg1Meta?.label ?? null,
                blauw_naam: naam2,
                blauw_gym: gym2,
                va_blauw: va2,
                blauw_geboortedatum: null,
                blauw_gewicht: kg2Meta?.type === "exact" ? kg2Meta.label : null,
                blauw_gewicht_notatie: kg2Meta?.label ?? null,
                discipline,
                klasse,
                max_gewicht: maxKgMeta?.value ?? null,
                max_gewicht_notatie: maxKgMeta?.label ?? null,
                min_gewicht: minKgMeta?.value ?? null,
                min_gewicht_notatie: minKgMeta?.label ?? null,
                record_rood_w: 0,
                record_rood_l: 0,
                record_rood_d: 0,
                record_blauw_w: 0,
                record_blauw_l: 0,
                record_blauw_d: 0,
                is_toernooi: false,
                extra: {
                    template: "admin_vs_t",
                    t_code: tCode,
                    rood_gewicht_type: kg1Meta?.type ?? null,
                    blauw_gewicht_type: kg2Meta?.type ?? null,
                    max_gewicht_type: maxKgMeta?.type ?? null,
                    min_gewicht_type: minKgMeta?.type ?? null
                }
            };
            bouts.push(bout);
            continue;
        }
        if (tCode) {
            if (!deelnemersByT[tCode]) deelnemersByT[tCode] = [];
            deelnemersByT[tCode].push({
                naam: naam1,
                gym: gym1,
                va: va1,
                kg_meta: kg1Meta,
                discipline,
                klasse,
                max_gewicht_meta: maxKgMeta,
                min_gewicht_meta: minKgMeta
            });
        }
    }
    let nextPartijNr = maxPartijNr > 0 ? maxPartijNr + 1 : 1;
    for (const [code, deelnemers] of Object.entries(deelnemersByT)){
        const list = (deelnemers ?? []).filter((x)=>x?.naam || x?.va);
        if (list.length < 2) continue;
        const d = list.find((x)=>x?.discipline)?.discipline ?? null;
        const k = list.find((x)=>x?.klasse)?.klasse ?? null;
        const mk = list.find((x)=>x?.max_gewicht_meta != null)?.max_gewicht_meta ?? null;
        const nk = list.find((x)=>x?.min_gewicht_meta != null)?.min_gewicht_meta ?? null;
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
                    rood_gewicht: a?.kg_meta?.type === "exact" ? a.kg_meta.label : null,
                    rood_gewicht_notatie: a?.kg_meta?.label ?? null,
                    blauw_naam: b?.naam ?? null,
                    blauw_gym: b?.gym ?? null,
                    va_blauw: b?.va ?? null,
                    blauw_geboortedatum: null,
                    blauw_gewicht: b?.kg_meta?.type === "exact" ? b.kg_meta.label : null,
                    blauw_gewicht_notatie: b?.kg_meta?.label ?? null,
                    discipline: d,
                    klasse: k,
                    max_gewicht: mk?.value ?? null,
                    max_gewicht_notatie: mk?.label ?? null,
                    min_gewicht: nk?.value ?? null,
                    min_gewicht_notatie: nk?.label ?? null,
                    record_rood_w: 0,
                    record_rood_l: 0,
                    record_rood_d: 0,
                    record_blauw_w: 0,
                    record_blauw_l: 0,
                    record_blauw_d: 0,
                    is_toernooi: true,
                    extra: {
                        toernooi_code: code,
                        toernooi_format: "roundrobin",
                        template: "admin_vs_t",
                        rood_gewicht_type: a?.kg_meta?.type ?? null,
                        blauw_gewicht_type: b?.kg_meta?.type ?? null,
                        max_gewicht_type: mk?.type ?? null,
                        min_gewicht_type: nk?.type ?? null
                    }
                });
            }
        }
    }
    return bouts.length ? bouts : null;
}
function isOleXls(buf) {
    if (!buf || buf.length < 8) return false;
    return buf[0] === 0xd0 && buf[1] === 0xcf && buf[2] === 0x11 && buf[3] === 0xe0 && buf[4] === 0xa1 && buf[5] === 0xb1 && buf[6] === 0x1a && buf[7] === 0xe1;
}
function normalizeARGB(argb) {
    if (!argb) return null;
    const s = String(argb).replace(/^#/, "").toUpperCase();
    if (s.length === 6) return "FF" + s;
    if (s.length === 8) return s;
    return null;
}
function cornerFromARGB(argb) {
    if (!argb) return null;
    const a = argb.toUpperCase();
    if (a.endsWith("FF0000") || a.endsWith("C00000") || a.endsWith("E06666")) return "rood";
    if (a.endsWith("F4CCCC") || a.endsWith("FF9999") || a.endsWith("FF6D01")) return "rood";
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
        let value = cell.v ?? null;
        if (cell.t === "d" && cell.v instanceof Date) value = cell.v;
        const text = safe(cell.w ?? cell.v ?? "");
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
   3. HEADER DETECTIE – ROBUUST
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
    "max gewicht",
    "min kg",
    "min gewicht",
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
   4. VA-ONLY PAIRING MODE
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
function isMaxWeightHeader(h) {
    const s = norm(h);
    if (!s) return false;
    return s.includes("max gewicht") || s.includes("maxkg") || s.includes("max kg") || s.includes("maximum gewicht") || s.includes("maximum kg");
}
function isMinWeightHeader(h) {
    const s = norm(h);
    if (!s) return false;
    return s.includes("min gewicht") || s.includes("minkg") || s.includes("min kg") || s.includes("minimum gewicht") || s.includes("minimum kg");
}
function isAgreedWeightHeader(h) {
    const s = norm(h);
    if (!s) return false;
    return isMaxWeightHeader(s) || isMinWeightHeader(s) || s.includes("afgesproken gewicht") || s.includes("afgesproken kg") || s.includes("matchmaker gewicht");
}
function isFighterWeightHeader(h) {
    const s = norm(h);
    if (!s) return false;
    if (isAgreedWeightHeader(s)) return false;
    return s === "gewicht" || s === "kg" || s === "gew" || s === "kilo" || s === "gewicht rood" || s === "gewicht blauw" || s === "kg rood" || s === "kg blauw" || s === "rood gewicht" || s === "blauw gewicht" || s === "rood kg" || s === "blauw kg";
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
function findWeightColInRange(headers0, start0, end0) {
    for(let i = start0; i <= end0 && i < headers0.length; i++){
        const h = headers0[i] || "";
        if (!h) continue;
        if (isFighterWeightHeader(h)) return i + 1;
    }
    return null;
}
function findGlobalMaxWeightCol(headers0) {
    for(let i = 0; i < headers0.length; i++){
        const h = headers0[i] || "";
        if (isMaxWeightHeader(h)) return i + 1;
    }
    return null;
}
function findGlobalMinWeightCol(headers0) {
    for(let i = 0; i < headers0.length; i++){
        const h = headers0[i] || "";
        if (isMinWeightHeader(h)) return i + 1;
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
    const maxGewCol = findGlobalMaxWeightCol(headers0);
    const minGewCol = findGlobalMinWeightCol(headers0);
    const styleCol = styleColIdx >= 0 ? styleColIdx + 1 : null;
    const classCol = classColIdx >= 0 ? classColIdx + 1 : null;
    const partijCol = partijColIdx >= 0 ? partijColIdx + 1 : 1;
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
    let redRange = {
        start: Math.max(1, redStart),
        end: Math.max(1, blueStart - 1)
    };
    let blueRange = {
        start: Math.max(1, blueStart),
        end: maxCol
    };
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
    const agreedCols = [
        maxGewCol,
        minGewCol
    ].filter((x)=>typeof x === "number" && x >= blueRange.start && x <= blueRange.end);
    if (agreedCols.length) {
        const firstAgreedCol = Math.min(...agreedCols);
        blueRange.end = Math.max(blueRange.start, firstAgreedCol - 1);
    }
    if (styleCol && styleCol >= blueRange.start && styleCol <= blueRange.end) {
        blueRange.end = Math.max(blueRange.start, styleCol - 1);
    }
    if (classCol && classCol >= blueRange.start && classCol <= blueRange.end) {
        blueRange.end = Math.max(blueRange.start, classCol - 1);
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
        gew: findWeightColInRange(headers0, red0s, red0e),
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
        gew: findWeightColInRange(headers0, blu0s, blu0e),
        va: findInRange(headers0, blu0s, blu0e, pVA),
        rec: findInRange(headers0, blu0s, blu0e, pRec)
    };
    return {
        red,
        blue,
        styleCol,
        classCol,
        partijCol,
        maxGewCol,
        minGewCol
    };
}
/* =========================================================
   6. NAAM OPHALEN
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
   7. ROW COLOR FALLBACK
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
   8. GEWICHT FALLBACK IN RANGE
========================================================= */ function extractWeightMetaFromCornerRange(row, map, skipCols = []) {
    const start = map.start ?? 1;
    const end = map.end ?? start;
    const skip = new Set(skipCols.filter((x)=>Number.isFinite(x)));
    for(let c = start; c <= end; c++){
        if (skip.has(c)) continue;
        const cell = row.getCell(c);
        const txt = cellTextLike(cell);
        const lower = norm(txt);
        if (!txt) continue;
        if (isProbablyDate(txt)) continue;
        if (extractVA(txt)) continue;
        if (looksLikeRecord(txt)) continue;
        if (looksLikeName(txt)) continue;
        if (looksLikeGym(txt)) continue;
        if (isAgreedWeightHeader(lower)) continue;
        const meta = extractWeightMeta(cell.value ?? txt, {
            allowClassNotation: true
        });
        if (meta) return meta;
    }
    return null;
}
/* =========================================================
   9. MAIN – BUFFER → BOUTS (.xlsx / .xls)
========================================================= */ function isPauseRowText(s) {
    const t = norm(s);
    if (!t) return false;
    return t.includes("pauze") || t.includes("break");
}
function isToernooiRowText(s) {
    const t = norm(s);
    if (!t) return false;
    return t.includes("toernooi");
}
async function parseExcelToBouts(fileBuffer) {
    try {
        const templ = await tryParseAdminTemplate(fileBuffer);
        if (templ && templ.length) {
            return templ;
        }
    } catch (e) {
        console.warn("[parseExcelToBouts] template-parse faalde, fallback naar robuuste parser:", e?.message);
    }
    let sheet = null;
    let mode = "exceljs_xlsx";
    if (isOleXls(fileBuffer)) {
        const wb = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$xlsx$2f$xlsx$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["read"](fileBuffer, {
            type: "buffer",
            cellDates: true,
            cellStyles: true,
            raw: false
        });
        sheet = sheetjsToSheetLike(wb);
        mode = "sheetjs_xls";
    } else {
        try {
            const workbook = new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$exceljs$2f$excel$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["default"].Workbook();
            await workbook.xlsx.load(fileBuffer);
            const ws = workbook.worksheets[0];
            if (!ws) return [];
            sheet = exceljsToSheetLike(ws);
            mode = "exceljs_xlsx";
        } catch  {
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
    const vaOnly = tryParseVaOnlyPairs(sheet);
    if (vaOnly) {
        console.log("📘 Parsed bouts (VA-only mode):", vaOnly.length, "mode:", mode);
        console.log("VA rood:", vaOnly.filter((b)=>b.va_rood).length);
        console.log("VA blauw:", vaOnly.filter((b)=>b.va_blauw).length);
        return vaOnly;
    }
    const maxCol = Math.min(sheet.columnCount || 80, 120);
    const headerRowIndex = detectHeaderRow(sheet, 50, Math.min(80, maxCol));
    const { red, blue, styleCol, classCol, partijCol, maxGewCol, minGewCol } = buildCornerMaps({
        sheet,
        headerRowIndex,
        maxCol
    });
    const skipWeightCols = [
        maxGewCol,
        minGewCol
    ].filter((x)=>typeof x === "number");
    const bouts = [];
    let autoNr = 1;
    for(let r = headerRowIndex + 1; r <= sheet.rowCount; r++){
        const row = sheet.getRow(r);
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
        bout.is_toernooi = isToernooi;
        if (isToernooi) bout.extra.is_toernooi = true;
        // afgesproken gewicht apart lezen
        if (maxGewCol) {
            const raw = row.getCell(maxGewCol).value;
            const txt = cellTextLike(row.getCell(maxGewCol));
            const meta = parseAgreedWeightMeta(raw ?? txt);
            applyAgreedWeightMeta(bout, "max", meta);
        }
        if (minGewCol) {
            const raw = row.getCell(minGewCol).value;
            const txt = cellTextLike(row.getCell(minGewCol));
            const meta = parseAgreedWeightMeta(raw ?? txt);
            applyAgreedWeightMeta(bout, "min", meta);
        }
        // fallback alleen voor klasse-notaties zoals -60 / -95 / 95+
        if (bout.max_gewicht == null) {
            for(let c = 1; c <= Math.min(maxCol, 40); c++){
                const txt = cellTextLike(row.getCell(c));
                const val = row.getCell(c).value;
                const meta = extractClassWeightMetaOnly(txt) || extractClassWeightMetaOnly(val);
                if (meta) {
                    applyAgreedWeightMeta(bout, "max", meta);
                    break;
                }
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
        bout.rood_naam = extractNameFromRow(row, red);
        const roodGym = red.gym ? cellTextLike(row.getCell(red.gym)) : "";
        bout.rood_gym = roodGym || null;
        const roodGebRaw = red.geb ? row.getCell(red.geb).value : null;
        bout.rood_geboortedatum = extractDate(roodGebRaw);
        const roodGewRaw = red.gew ? row.getCell(red.gew).value : null;
        const roodGewMetaDirect = extractWeightMeta(roodGewRaw, {
            allowClassNotation: true
        });
        applyCornerWeightMeta(bout, "rood", roodGewMetaDirect);
        if (!bout.rood_gewicht && !bout.rood_gewicht_notatie) {
            const fallbackMeta = extractWeightMetaFromCornerRange(row, red, skipWeightCols);
            applyCornerWeightMeta(bout, "rood", fallbackMeta);
        }
        const roodVaRaw = red.va ? cellTextLike(row.getCell(red.va)) : "";
        bout.va_rood = extractVA(roodVaRaw);
        const roodRecRaw = red.rec ? cellTextLike(row.getCell(red.rec)) : "";
        const recR = extractRecord(roodRecRaw);
        if (recR) {
            bout.record_rood_w = recR.w;
            bout.record_rood_l = recR.l;
            bout.record_rood_d = recR.d;
        }
        bout.blauw_naam = extractNameFromRow(row, blue);
        const blauwGym = blue.gym ? cellTextLike(row.getCell(blue.gym)) : "";
        bout.blauw_gym = blauwGym || null;
        const blauwGebRaw = blue.geb ? row.getCell(blue.geb).value : null;
        bout.blauw_geboortedatum = extractDate(blauwGebRaw);
        const blauwGewRaw = blue.gew ? row.getCell(blue.gew).value : null;
        const blauwGewMetaDirect = extractWeightMeta(blauwGewRaw, {
            allowClassNotation: true
        });
        applyCornerWeightMeta(bout, "blauw", blauwGewMetaDirect);
        if (!bout.blauw_gewicht && !bout.blauw_gewicht_notatie) {
            const fallbackMeta = extractWeightMetaFromCornerRange(row, blue, skipWeightCols);
            applyCornerWeightMeta(bout, "blauw", fallbackMeta);
        }
        const blauwVaRaw = blue.va ? cellTextLike(row.getCell(blue.va)) : "";
        bout.va_blauw = extractVA(blauwVaRaw);
        const blauwRecRaw = blue.rec ? cellTextLike(row.getCell(blue.rec)) : "";
        const recB = extractRecord(blauwRecRaw);
        if (recB) {
            bout.record_blauw_w = recB.w;
            bout.record_blauw_l = recB.l;
            bout.record_blauw_d = recB.d;
        }
        if (styleCol) {
            const v = cellTextLike(row.getCell(styleCol));
            bout.discipline = v || null;
        }
        if (classCol) {
            const v = cellTextLike(row.getCell(classCol));
            bout.klasse = v || null;
        }
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
        const hasAny = bout.rood_naam || bout.blauw_naam || bout.va_rood || bout.va_blauw || bout.rood_gym || bout.blauw_gym || bout.rood_gewicht || bout.rood_gewicht_notatie || bout.blauw_gewicht || bout.blauw_gewicht_notatie || bout.max_gewicht != null || bout.min_gewicht != null;
        if (!hasAny) continue;
        bouts.push(bout);
    }
    console.log("📘 Parsed bouts:", bouts.length, "mode:", mode);
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
function normalizeMaxGewicht(v) {
    if (v == null) return null;
    const raw = String(v).trim();
    if (!raw) return null;
    const cleaned = raw.replace(",", ".").replace(/\s+/g, "");
    const numeric = cleaned.replace(/[^0-9.\-]/g, "");
    if (!numeric) return null;
    const n = Number(numeric);
    if (!Number.isFinite(n)) return null;
    return Math.abs(n);
}
function normalizeWeightNotation(v) {
    const s = String(v ?? "").trim();
    return s.length ? s : null;
}
function normalizeWeightType(v) {
    const s = String(v ?? "").trim().toLowerCase();
    if (!s) return null;
    if (s === "exact" || s === "up_to" || s === "open_above") {
        return s;
    }
    return null;
}
function boutFingerprint(opts) {
    const pair = canonVaPair(opts.vaR, opts.vaB);
    if (!pair) return null;
    const d = normUpper(opts.discipline);
    const k = normUpper(opts.klasse);
    const tBool = toBoolLoose(opts.is_toernooi);
    const t = tBool == null ? "" : tBool ? "||T" : "||F";
    return `${pair}||${d}||${k}${t}`;
}
async function fetchExistingBoutUidIndex(matchmaking_id) {
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
        const uploaded_by = userId;
        let matchmaking_id = null;
        let force_new = false;
        let event_id = null;
        const upload_token = (0, __TURBOPACK__imported__module__$5b$externals$5d2f$crypto__$5b$external$5d$__$28$crypto$2c$__cjs$29$__["randomUUID"])();
        let raw_filename = null;
        let bouts = [];
        if (isJson(req)) {
            const body = await req.json();
            const file_path = String(body.file_path ?? "").trim();
            raw_filename = body.raw_filename ? String(body.raw_filename) : null;
            evenement_naam = String(body.evenement_naam ?? "").trim();
            evenement_datum = String(body.evenement_datum ?? "").trim();
            locatie = body.locatie ? String(body.locatie).trim() : null;
            matchmaker = body.matchmaker ? String(body.matchmaker).trim() : null;
            const bondteamRaw = body.bondteam ? String(body.bondteam).trim() : null;
            bondteam = bondteamRaw && ALLOWED_BONDTEAMS.has(bondteamRaw) ? bondteamRaw : bondteamRaw;
            hoofdofficial = body.hoofdofficial ? String(body.hoofdofficial).trim() : null;
            promotor = body.promotor ? String(body.promotor).trim() : null;
            matchmaking_id = body.matchmaking_id ? String(body.matchmaking_id) : null;
            force_new = Boolean(body.force_new ?? false);
            event_id = body.event_id ? String(body.event_id) : null;
            if (!file_path) {
                return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                    error: "JSON mist file_path."
                }, {
                    status: 400
                });
            }
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
            matchmaking_id = String(form.get("matchmaking_id") ?? "").trim() || null;
            force_new = String(form.get("force_new") ?? "false") === "true";
            event_id = String(form.get("event_id") ?? "").trim() || null;
            if (!file) {
                return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                    error: "Geen file ontvangen."
                }, {
                    status: 400
                });
            }
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
        if (!evenement_naam || !evenement_datum) {
            return bad("Vul verplicht in: evenement_naam en evenement_datum.");
        }
        if (!bondteam) {
            return bad("Bondteam is verplicht.");
        }
        if (!ALLOWED_BONDTEAMS.has(String(bondteam))) {
            return bad("Onbekend bondteam.");
        }
        if (role === "official" || role === "hoofdofficial") {
            const userBond = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$app$2f$api$2f$_utils$2f$authz$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getUserBondteam"])(userId);
            if (!userBond) return bad("Je profiel mist bondteam.", 403);
            if (String(userBond) !== String(bondteam)) {
                return bad("Bondteam mismatch: je mag alleen uploaden voor je eigen bondteam.", 403);
            }
            const mm = String(matchmaker ?? "").trim();
            const pr = String(promotor ?? "").trim();
            if (!mm && !pr) {
                return bad("Vul matchmaker of promotor in (minimaal één).", 400);
            }
        } else {
            const mm = String(matchmaker ?? "").trim();
            if (!mm) {
                return bad("Matchmaker is verplicht.", 400);
            }
        }
        const now = new Date().toISOString();
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
            if (evErr) {
                return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                    error: evErr.message
                }, {
                    status: 500
                });
            }
            evId = String(ev?.id ?? "").trim();
        } else {
            const { data: ex, error: exErr } = await supabaseAdmin.from("events").select("id").eq("id", evId).maybeSingle();
            if (exErr) {
                return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                    error: exErr.message
                }, {
                    status: 500
                });
            }
            if (!ex) {
                return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                    error: "event_id bestaat niet (events)."
                }, {
                    status: 400
                });
            }
        }
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
            if (mmError) {
                return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                    error: mmError.message
                }, {
                    status: 500
                });
            }
            mmId = String(mm?.id ?? "").trim();
            if (!mmId) {
                return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                    error: "Kon matchmaking id niet bepalen."
                }, {
                    status: 500
                });
            }
        }
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
        if (uploadErr) {
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: uploadErr.message
            }, {
                status: 500
            });
        }
        const uploadIdFinal = String(uploadRow?.id ?? "").trim();
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
                max_gewicht: normalizeMaxGewicht(b?.max_gewicht),
                max_gewicht_notatie: normalizeWeightNotation(b?.max_gewicht_notatie),
                max_gewicht_type: normalizeWeightType(b?.extra?.max_gewicht_type),
                raw_json: b?.extra ?? null,
                created_at: now
            });
        }
        if (rows.length) {
            const { error: boutErr } = await supabaseAdmin.from("matchmaking_bouts_raw").insert(rows);
            if (boutErr) {
                return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                    error: boutErr.message
                }, {
                    status: 500
                });
            }
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