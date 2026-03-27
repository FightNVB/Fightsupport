module.exports = [
"[externals]/next/dist/server/app-render/action-async-storage.external.js [external] (next/dist/server/app-render/action-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/action-async-storage.external.js", () => require("next/dist/server/app-render/action-async-storage.external.js"));

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
"[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>RapportPage
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$styled$2d$jsx$2f$style$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/styled-jsx/style.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/client/app-dir/link.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/navigation.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabaseClient$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/supabaseClient.ts [app-ssr] (ecmascript)");
"use client";
;
;
;
;
;
;
function safe(v, fallback = "-") {
    const s = String(v ?? "").trim();
    return s ? s : fallback;
}
function safeRaw(v) {
    return String(v ?? "").trim();
}
function normalizeVa(v) {
    return String(v ?? "").trim().replace(/\s+/g, "").replace(/[-–—]/g, "").toUpperCase();
}
function fmtNlDateOnly(v) {
    if (!v) return "-";
    const s = String(v).trim();
    const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) return `${m[3]}-${m[2]}-${m[1]}`;
    const d = new Date(s);
    if (Number.isNaN(d.getTime())) return s;
    return d.toLocaleDateString("nl-NL", {
        timeZone: "Europe/Amsterdam"
    });
}
function fmtDateTime(v) {
    if (!v) return "-";
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return String(v);
    return d.toLocaleString("nl-NL", {
        timeZone: "Europe/Amsterdam"
    });
}
function normCode(v) {
    return String(v ?? "").trim().toUpperCase();
}
function normResultaatLower(v) {
    const s = String(v ?? "").trim().toLowerCase();
    if (s === "afkeur" || s === "afgekeurd" || s === "afkeuren") return "afgekeurd";
    if (s === "dispensatie" || s === "disp") return "dispensatie";
    if (s === "actie" || s === "waarschuwing") return "actie";
    if (s === "ok" || s === "goedgekeurd" || s === "info") return "ok";
    if (s === "verbod") return "verbod";
    return s;
}
function isApprovedOrClosed(review_status) {
    if (review_status == null) return false;
    const raw = String(review_status).trim().toLowerCase();
    if (!raw) return false;
    const tokens = raw.replace(/[^a-z0-9]+/g, " ").trim().split(/\s+/g).filter(Boolean);
    const tset = new Set(tokens);
    const hasAny = (...t)=>t.some((x)=>tset.has(x));
    if (hasAny("approved", "approve", "accepted", "ok", "akkoord", "done", "closed", "resolved", "complete", "completed")) {
        return true;
    }
    if (hasAny("goedgekeurd", "afgehandeld")) return true;
    if (tset.has("goed") && !tset.has("niet")) return true;
    if (raw.includes("goedgekeurd") || raw.includes("afgehandeld")) return true;
    return false;
}
function rowHaystack(row) {
    return `${row.rule_code ?? ""} ${row.rule ?? ""} ${row.boodschap ?? ""} ${row.aantekeningen ?? ""}`.toLowerCase();
}
function isNameMismatch(row) {
    const c = normCode(row.rule_code);
    return c.startsWith("VECHTER_NAAM_MISMATCH") || c.startsWith("VECHTER_NAAM_ANDERS");
}
function isVARow(row) {
    const hay = rowHaystack(row);
    const c = normCode(row.rule_code);
    return c.includes("VA") || hay.includes("fightpaspoort") || hay.includes("va nummer") || hay.includes("va-nummer") || hay.includes("v.a.") || hay.includes("passport nummer");
}
function isMissingVARow(row) {
    const hay = rowHaystack(row);
    const c = normCode(row.rule_code);
    return c.includes("VA_ONTBREEKT") || c.includes("VA_MISSING") || c.includes("FIGHTPASPOORT_ONTBREEKT") || c.includes("FIGHTPASPOORT_MISSING") || c.includes("GEEN_VA") || isVARow(row) && (hay.includes("ontbreekt") || hay.includes("missing") || hay.includes("geen va") || hay.includes("geen fightpaspoort") || hay.includes("leeg va") || hay.includes("va ontbreekt") || hay.includes("fightpaspoort ontbreekt") || hay.includes("geen nummer") || hay.includes("nummer ontbreekt"));
}
function isGenericMissingVARow(row) {
    const text = `${row.rule ?? ""} ${row.boodschap ?? ""}`.trim().toLowerCase().replace(/\s+/g, " ");
    return text === "fightpaspoortnummer ontbreekt" || text === "fightpaspoort nummer ontbreekt" || text === "va nummer ontbreekt" || text === "fight passport nummer ontbreekt" || text === "fightpaspoort ontbreekt";
}
function missingVARowSpecificity(row) {
    const msg = safeRaw(row.boodschap ?? row.rule);
    let score = 0;
    if (!isGenericMissingVARow(row)) score += 100;
    if (msg) score += Math.min(msg.length, 80);
    if (safeRaw(row.aantekeningen)) score += 10;
    if (safeRaw(row.rule_code)) score += 5;
    return score;
}
function dedupeRows(rows) {
    const missingVaBest = new Map();
    const otherRows = [];
    for (const row of rows){
        if (isMissingVARow(row)) {
            const pn = Number(row.partij_nr);
            const hoek = inferHoek(row) ?? "onbekend";
            const key = `${Number.isFinite(pn) ? pn : "x"}-${hoek}-missing-va`;
            const prev = missingVaBest.get(key);
            if (!prev) {
                missingVaBest.set(key, row);
                continue;
            }
            const prevScore = missingVARowSpecificity(prev);
            const nextScore = missingVARowSpecificity(row);
            if (nextScore > prevScore) {
                missingVaBest.set(key, row);
                continue;
            }
            if (nextScore === prevScore) {
                const prevTime = prev.created_at ? new Date(prev.created_at).getTime() : 0;
                const nextTime = row.created_at ? new Date(row.created_at).getTime() : 0;
                if (nextTime > prevTime) {
                    missingVaBest.set(key, row);
                }
            }
            continue;
        }
        otherRows.push(row);
    }
    return [
        ...otherRows,
        ...Array.from(missingVaBest.values())
    ];
}
function isFightpaspoortGewijzigd(row) {
    const c = normCode(row.rule_code);
    if (c.startsWith("VA_NUMMER_AANGEPAST") || c.includes("VA_CHANGED") || c.includes("VA_WIJZIG") || c.includes("VA_UPDATED") || c.includes("FIGHTPASPOORT_GEWIJZIGD") || c.includes("FIGHTPASPOORT_AANGEPAST")) {
        return true;
    }
    const hay = rowHaystack(row);
    return hay.includes("fightpaspoort nummer gewijzigd") || hay.includes("va nummer gewijzigd") || hay.includes("va aangepast") || hay.includes("fightpaspoort aangepast") || hay.includes("gewijzigd van") || hay.includes("aangepast van") || hay.includes("oude va") || hay.includes("nieuwe va");
}
function isBelgischeContextRow(row) {
    const hay = rowHaystack(row);
    return hay.includes("belgië") || hay.includes("belgie") || hay.includes("belgische") || hay.includes("bkbmo") || hay.includes("boksboekje");
}
function isBelgischeManualCheckRow(row) {
    const hay = rowHaystack(row);
    return isBelgischeContextRow(row) && (hay.includes("bkbmo") || hay.includes("boksboekje") || hay.includes("belgië") || hay.includes("belgie") || hay.includes("belgische sportschool") || hay.includes("controleer sportschool op bkbmo") || hay.includes("land: belgië") || hay.includes("land: belgie"));
}
function isKeurmerkRow(row) {
    const c = String(row.rule_code ?? "").toLowerCase();
    const r = String(row.rule ?? "").toLowerCase();
    const b = String(row.boodschap ?? "").toLowerCase();
    const hay = `${c} ${r} ${b}`;
    return hay.includes("keurmerk") || hay.includes("gym keurmerk") || hay.includes("sportschool keurmerk");
}
function isSportschoolMatchRow(row) {
    const c = String(row.rule_code ?? "").toLowerCase();
    const r = String(row.rule ?? "").toLowerCase();
    const b = String(row.boodschap ?? "").toLowerCase();
    const hay = `${c} ${r} ${b}`;
    return hay.includes("sportschool_niet_gevonden") || hay.includes("geen match in sportscholen") || hay.includes("sportschool niet gevonden") || hay.includes("lege/ongeldige sportschoolnaam") || hay.includes("ongeldige sportschoolnaam") || hay.includes("leeg sportschool") || hay.includes("geen sportschool match");
}
function isLicentieRow(row) {
    const c = String(row.rule_code ?? "").toLowerCase();
    const r = String(row.rule ?? "").toLowerCase();
    const b = String(row.boodschap ?? "").toLowerCase();
    const hay = `${c} ${r} ${b}`;
    return hay.includes("licentie") || hay.includes("license");
}
function inferHoek(row) {
    if (row.hoek === "rood" || row.hoek === "blauw") return row.hoek;
    const c = String(row.rule_code ?? "").toLowerCase();
    const r = String(row.rule ?? "").toLowerCase();
    const b = String(row.boodschap ?? "").toLowerCase();
    const hay = `${c} ${r} ${b}`;
    if (hay.includes("_rood") || hay.includes(" rood") || hay.includes("rode hoek") || hay.includes("hoek rood")) {
        return "rood";
    }
    if (hay.includes("_blauw") || hay.includes(" blauw") || hay.includes("blauwe hoek") || hay.includes("hoek blauw")) {
        return "blauw";
    }
    return null;
}
function isVerbodRow(row) {
    const c = normCode(row.rule_code ?? row.rule);
    if (c.includes("STARTVERBOD")) return false;
    if (c.startsWith("VERBOD_")) return true;
    if (c.startsWith("VERBODZONDER") || c.startsWith("VERBOD_ZONDER")) return true;
    if (c.includes("JEUGD_VOLWASSEN_MIX")) return true;
    if (c.includes("LEEFTIJD_VERSCHIL") && c.includes("AFKEUR")) return true;
    const r = String(row.rule ?? "").toUpperCase();
    const b = String(row.boodschap ?? "").toUpperCase();
    return r.includes("VERBOD") || b.includes("VERBOD");
}
function isStartverbodRow(row) {
    const c = normCode(row.rule_code ?? row.rule);
    return c.includes("STARTVERBOD");
}
function isVaAuditEventType(v) {
    const c = normCode(v);
    return c === "VA_CHANGED" || c === "VA_UPDATED" || c === "VA_NUMMER_AANGEPAST" || c === "FIGHTPASPOORT_GEWIJZIGD" || c === "FIGHTPASPOORT_AANGEPAST";
}
function getCurrentVaFromCtx(ctx, hoek) {
    if (hoek === "rood") {
        return safeRaw(ctx?.rood_va_mm ?? ctx?.va_rood ?? ctx?.rood_va);
    }
    return safeRaw(ctx?.blauw_va_mm ?? ctx?.va_blauw ?? ctx?.blauw_va);
}
function getPrevVaFromCtx(ctx, hoek) {
    if (hoek === "rood") {
        return safeRaw(ctx?.rood_va_mm_prev);
    }
    return safeRaw(ctx?.blauw_va_mm_prev);
}
function hasPrevVaField(ctx, hoek) {
    if (hoek === "rood") {
        return ctx?.rood_va_mm_prev !== undefined && ctx?.rood_va_mm_prev !== null;
    }
    return ctx?.blauw_va_mm_prev !== undefined && ctx?.blauw_va_mm_prev !== null;
}
function statusFromResultaat(resultaat, rule_code) {
    if (rule_code) {
        const c = String(rule_code ?? "").toUpperCase();
        if (c.includes("JEUGD_VOLWASSEN_MIX")) return "VERBOD";
        if (c.includes("LEEFTIJD_VERSCHIL") && c.includes("AFKEUR")) return "VERBOD";
        if (c.includes("VERBOD")) return "VERBOD";
        if (c.includes("AFKEUR")) return "AFKEUR";
    }
    const s = String(resultaat ?? "").trim().toLowerCase();
    if (s === "verbod") return "VERBOD";
    if (s === "afkeur" || s === "afgekeurd") return "AFKEUR";
    if (s === "dispensatie") return "DISPENSATIE";
    if (s === "actie") return "ACTIE";
    return "OK";
}
function statusPrio(s) {
    return s === "VERBOD" ? 0 : s === "AFKEUR" ? 1 : s === "DISPENSATIE" ? 2 : s === "ACTIE" ? 3 : 9;
}
function partyStatusVoorMeldingen(meldingen) {
    if (!meldingen?.length) return "OK";
    let best = "OK";
    let bestP = 999;
    for (const m of meldingen){
        const st = statusFromResultaat(m.resultaat, m.rule_code);
        const p = statusPrio(st);
        if (p < bestP) {
            bestP = p;
            best = st;
        }
    }
    return best;
}
function licentieIsProbleem(v) {
    const s = String(v ?? "").trim().toLowerCase();
    return s !== "ja";
}
function licentieLabel(v) {
    const s = String(v ?? "").trim().toLowerCase();
    return s || "onbekend";
}
function maxGewichtLabel(p) {
    const raw = p.max_gewicht ?? p.maxgewicht ?? p.max_kg ?? null;
    if (raw == null || raw === "") return "-";
    return String(raw).replace(".", ",");
}
function Badge({ status }) {
    const base = "inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-extrabold tracking-wide";
    if (status === "VERBOD") return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
        className: `${base} bg-purple-700 text-white`,
        children: "VERBOD"
    }, void 0, false, {
        fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
        lineNumber: 474,
        columnNumber: 35
    }, this);
    if (status === "AFKEUR") return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
        className: `${base} bg-red-600 text-white`,
        children: "AFKEUR"
    }, void 0, false, {
        fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
        lineNumber: 475,
        columnNumber: 35
    }, this);
    if (status === "DISPENSATIE") return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
        className: `${base} bg-yellow-400 text-black`,
        children: "DISPENSATIE"
    }, void 0, false, {
        fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
        lineNumber: 476,
        columnNumber: 40
    }, this);
    if (status === "ACTIE") return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
        className: `${base} bg-orange-500 text-black`,
        children: "ACTIE"
    }, void 0, false, {
        fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
        lineNumber: 477,
        columnNumber: 34
    }, this);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
        className: `${base} bg-green-600 text-white`,
        children: "OK"
    }, void 0, false, {
        fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
        lineNumber: 478,
        columnNumber: 10
    }, this);
}
function SectionTitle({ children, right }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "mb-3 flex items-center justify-between gap-3 rounded-t-xl bg-[#ff4d00] px-4 py-2 text-sm font-black text-black",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                children: children
            }, void 0, false, {
                fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                lineNumber: 484,
                columnNumber: 7
            }, this),
            right ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "text-xs font-bold text-black/80",
                children: right
            }, void 0, false, {
                fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                lineNumber: 485,
                columnNumber: 16
            }, this) : null
        ]
    }, void 0, true, {
        fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
        lineNumber: 483,
        columnNumber: 5
    }, this);
}
function FsLogo() {
    const candidates = [
        "/branding/fightsupport/excel-logo.png",
        "/branding/fightsupport/logo-header.png",
        "/branding/fightsupport/logo.png"
    ];
    const [src, setSrc] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(candidates[0]);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        let alive = true;
        (async ()=>{
            for (const c of candidates){
                try {
                    const r = await fetch(c, {
                        method: "HEAD"
                    });
                    if (!alive) return;
                    if (r.ok) {
                        setSrc(c);
                        return;
                    }
                } catch  {
                // ignore
                }
            }
        })();
        return ()=>{
            alive = false;
        };
    }, []);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("img", {
        src: src,
        alt: "FightSupport",
        className: "mx-auto h-auto max-h-[86px] w-auto object-contain",
        onError: ()=>setSrc(candidates[candidates.length - 1])
    }, void 0, false, {
        fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
        lineNumber: 523,
        columnNumber: 5
    }, this);
}
function rowBg(idx) {
    return idx % 2 === 0 ? "bg-white text-black" : "bg-[#eef1f4] text-black";
}
function keurmerkTekst(row) {
    return `${row.rule_code ?? ""} ${row.rule ?? ""} ${row.boodschap ?? ""} ${row.aantekeningen ?? ""}`.toLowerCase();
}
function isKeurmerkOpenIssue(row) {
    if (!isKeurmerkRow(row)) return false;
    if (isBelgischeManualCheckRow(row)) return false;
    const tekst = keurmerkTekst(row);
    if (!isApprovedOrClosed(row.review_status)) {
        return true;
    }
    if (normResultaatLower(row.resultaat) !== "ok") {
        return true;
    }
    if (tekst.includes("geen match") || tekst.includes("geen match gevonden") || tekst.includes("niet gevonden") || tekst.includes("geen data") || tekst.includes("onvoldoende data") || tekst.includes("meerdere matches") || tekst.includes("ambigue") || tekst.includes("verlopen") || tekst.includes("expiry") || tekst.includes("expired") || tekst.includes("geen keurmerk") || tekst.includes("zonder keurmerk") || tekst.includes("ongeldig keurmerk") || tekst.includes("keurmerk datum ontbreekt") || tekst.includes("geen keurmerkdatum") || tekst.includes("geen datum") || tekst.includes("datum ontbreekt")) {
        return true;
    }
    return false;
}
async function getEventMeta(matchmaking_id) {
    try {
        const { data: up, error: upErr } = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabaseClient$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["supabase"].from("matchmaking_uploads").select("event_id, evenement_naam, evenement_datum, matchmaking_id, bondteam").or(`id.eq.${matchmaking_id},matchmaking_id.eq.${matchmaking_id}`).order("uploaded_at", {
            ascending: false
        }).limit(1).maybeSingle();
        if (upErr) throw upErr;
        const uploadEventId = up?.event_id ? String(up.event_id) : null;
        if (uploadEventId) {
            const { data: ev, error: evErr } = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabaseClient$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["supabase"].from("events").select("id, naam, datum").eq("id", uploadEventId).maybeSingle();
            if (!evErr && ev) {
                return {
                    id: String(ev?.id ?? uploadEventId),
                    event_id: uploadEventId,
                    naam: ev?.naam ?? up?.evenement_naam ?? null,
                    datum: ev?.datum ?? up?.evenement_datum ?? null,
                    bondteam: up?.bondteam ?? null,
                    source: "events"
                };
            }
        }
        return {
            id: String(up?.matchmaking_id ?? matchmaking_id),
            event_id: uploadEventId,
            naam: up?.evenement_naam ?? null,
            datum: up?.evenement_datum ?? null,
            bondteam: up?.bondteam ?? null,
            source: "matchmaking_uploads"
        };
    } catch  {
        return {
            id: null,
            naam: null,
            datum: null,
            bondteam: null,
            source: null
        };
    }
}
function RapportPage() {
    const params = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useParams"])();
    const matchmakingId = String(params?.matchmakingId ?? "");
    const [loading, setLoading] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(true);
    const [error, setError] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(null);
    const [run, setRun] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(null);
    const [eventMeta, setEventMeta] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(null);
    const [ctxRows, setCtxRows] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])([]);
    const [resultaten, setResultaten] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])([]);
    const [auditEvents, setAuditEvents] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])([]);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        if (!matchmakingId) return;
        (async ()=>{
            setLoading(true);
            setError(null);
            try {
                const { data: runRows, error: runErr } = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabaseClient$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["supabase"].from("controle_runs").select("id, matchmaking_id, status, gestart_op, afgerond_op, run_type").eq("matchmaking_id", matchmakingId).order("gestart_op", {
                    ascending: false
                }).limit(1);
                if (runErr) throw runErr;
                const lastRun = (runRows ?? [])[0] ?? null;
                setRun(lastRun);
                const em = await getEventMeta(matchmakingId);
                setEventMeta(em);
                if (!lastRun?.id) {
                    setCtxRows([]);
                    setResultaten([]);
                    setAuditEvents([]);
                    setLoading(false);
                    return;
                }
                const { data: ctx, error: ctxErr } = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabaseClient$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["supabase"].from("controle_bout_context").select("*").eq("matchmaking_id", matchmakingId).eq("controle_run_id", lastRun.id).order("partij_nr", {
                    ascending: true
                });
                if (ctxErr) throw ctxErr;
                setCtxRows(ctx ?? []);
                const { data: res, error: resErr } = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabaseClient$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["supabase"].from("controle_resultaten").select("partij_nr, rule, rule_code, resultaat, boodschap, aantekeningen, created_at, review_status, hoek").eq("controle_run_id", lastRun.id);
                if (resErr) throw resErr;
                setResultaten(res ?? []);
                const { data: aud, error: audErr } = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabaseClient$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["supabase"].from("controle_audit_events").select("partij_nr, hoek, event_type, old_va, new_va, actor_email, created_at, reason").eq("controle_run_id", lastRun.id).eq("matchmaking_id", matchmakingId).order("created_at", {
                    ascending: false
                });
                if (audErr) {
                    console.warn("audit load failed:", audErr.message);
                    setAuditEvents([]);
                } else {
                    setAuditEvents(aud ?? []);
                }
            } catch (e) {
                setError(e?.message ?? String(e));
            } finally{
                setLoading(false);
            }
        })();
    }, [
        matchmakingId
    ]);
    const openMeldingen = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useMemo"])(()=>{
        const filtered = (resultaten ?? []).filter((r)=>{
            if (isNameMismatch(r) && !isFightpaspoortGewijzigd(r)) return false;
            if (isMissingVARow(r)) {
                if (isApprovedOrClosed(r.review_status)) return false;
                return true;
            }
            if (isFightpaspoortGewijzigd(r)) {
                return true;
            }
            if (isBelgischeManualCheckRow(r)) {
                if (isApprovedOrClosed(r.review_status)) return false;
                if (normResultaatLower(r.resultaat) === "ok") return false;
                return true;
            }
            if (isKeurmerkOpenIssue(r)) return true;
            if (isSportschoolMatchRow(r) && !isApprovedOrClosed(r.review_status)) {
                return true;
            }
            if (isApprovedOrClosed(r.review_status)) return false;
            if (normResultaatLower(r.resultaat) === "ok") return false;
            return true;
        });
        return dedupeRows(filtered);
    }, [
        resultaten
    ]);
    const openKeurmerkRows = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useMemo"])(()=>{
        return (resultaten ?? []).filter((r)=>isKeurmerkOpenIssue(r) && !isBelgischeManualCheckRow(r));
    }, [
        resultaten
    ]);
    const ctxByPartij = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useMemo"])(()=>{
        const map = new Map();
        for (const p of ctxRows ?? []){
            const pn = Number(p.partij_nr);
            if (!Number.isFinite(pn)) continue;
            map.set(pn, p);
        }
        return map;
    }, [
        ctxRows
    ]);
    const verbodStartverbodIssues = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useMemo"])(()=>{
        const items = [];
        const seen = new Set();
        for (const r of resultaten ?? []){
            const resultaat = normResultaatLower(r.resultaat);
            let type = null;
            if (isStartverbodRow(r)) {
                if (resultaat === "ok") continue;
                type = "STARTVERBOD";
            } else if (isVerbodRow(r)) {
                if (isApprovedOrClosed(r.review_status)) continue;
                if (resultaat === "ok") continue;
                type = "VERBOD";
            } else {
                continue;
            }
            const pn = Number(r.partij_nr);
            const hoek = inferHoek(r);
            if (!Number.isFinite(pn) || !hoek) continue;
            const ctx = ctxByPartij.get(pn);
            const naam = hoek === "rood" ? safe(ctx?.rood_naam_fp ?? ctx?.rood_naam_mm) : safe(ctx?.blauw_naam_fp ?? ctx?.blauw_naam_mm);
            const gym = hoek === "rood" ? safe(ctx?.rood_gym_fp ?? ctx?.rood_gym_mm ?? ctx?.rood_gym) : safe(ctx?.blauw_gym_fp ?? ctx?.blauw_gym_mm ?? ctx?.blauw_gym);
            const detail = safe(r.boodschap ?? r.rule ?? r.rule_code ?? type);
            const key = `${type}-${pn}-${hoek}-${detail}`;
            if (seen.has(key)) continue;
            seen.add(key);
            items.push({
                partij_nr: pn,
                partij: safe(ctx?.partij_label ?? pn),
                hoek,
                naam,
                gym,
                type,
                detail
            });
        }
        return items.sort((a, b)=>{
            if (a.partij_nr !== b.partij_nr) return a.partij_nr - b.partij_nr;
            if (a.type !== b.type) return a.type === "STARTVERBOD" ? -1 : 1;
            if (a.hoek !== b.hoek) return a.hoek.localeCompare(b.hoek);
            return a.naam.localeCompare(b.naam, "nl");
        });
    }, [
        resultaten,
        ctxByPartij
    ]);
    const meldByPartij = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useMemo"])(()=>{
        const m = new Map();
        for (const r of openMeldingen){
            const pn = Number(r.partij_nr);
            if (!Number.isFinite(pn)) continue;
            const arr = m.get(pn) ?? [];
            arr.push(r);
            m.set(pn, arr);
        }
        for (const [pn, arr] of m.entries()){
            arr.sort((a, b)=>statusPrio(statusFromResultaat(a.resultaat, a.rule_code)) - statusPrio(statusFromResultaat(b.resultaat, b.rule_code)));
            m.set(pn, arr);
        }
        return m;
    }, [
        openMeldingen
    ]);
    const licentieMetaByPartijHoek = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useMemo"])(()=>{
        const map = new Map();
        for (const r of resultaten ?? []){
            if (!isLicentieRow(r)) continue;
            const pn = Number(r.partij_nr);
            const hoek = inferHoek(r);
            if (!Number.isFinite(pn) || !hoek) continue;
            const key = `${pn}-${hoek}`;
            const prev = map.get(key) ?? {
                hasRow: false,
                state: null
            };
            prev.hasRow = true;
            if (isApprovedOrClosed(r.review_status) || normResultaatLower(r.resultaat) === "ok") {
                prev.state = "ok";
            } else {
                if (prev.state !== "ok") prev.state = "issue";
            }
            map.set(key, prev);
        }
        return map;
    }, [
        resultaten
    ]);
    const partijenCompact = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useMemo"])(()=>{
        return (ctxRows ?? []).map((p)=>{
            const pn = Number(p.partij_nr);
            const meldingen = Number.isFinite(pn) ? meldByPartij.get(pn) ?? [] : [];
            return {
                partij_nr: pn,
                partij_label: safe(p.partij_label ?? p.partij_nr),
                discipline: safe(p.discipline),
                klasse: safe(p.klasse_mm ?? p.klasse),
                max_gewicht: maxGewichtLabel(p),
                rood: safe(p.rood_naam_fp ?? p.rood_naam_mm),
                rood_gym: safe(p.rood_gym_fp ?? p.rood_gym_mm ?? p.rood_gym),
                blauw: safe(p.blauw_naam_fp ?? p.blauw_naam_mm),
                blauw_gym: safe(p.blauw_gym_fp ?? p.blauw_gym_mm ?? p.blauw_gym),
                status: partyStatusVoorMeldingen(meldingen)
            };
        });
    }, [
        ctxRows,
        meldByPartij
    ]);
    const licentieIssues = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useMemo"])(()=>{
        const items = [];
        for (const p of ctxRows ?? []){
            const pn = Number(p.partij_nr);
            if (!Number.isFinite(pn)) continue;
            const partij = safe(p.partij_label ?? p.partij_nr);
            const add = (hoek, naam, gym, detail)=>{
                items.push({
                    partij_nr: pn,
                    partij,
                    hoek,
                    naam,
                    gym,
                    label: "Licentie",
                    detail
                });
            };
            const roodKey = `${pn}-rood`;
            const blauwKey = `${pn}-blauw`;
            const roodMeta = licentieMetaByPartijHoek.get(roodKey);
            const blauwMeta = licentieMetaByPartijHoek.get(blauwKey);
            const roodIssue = roodMeta?.state === "ok" ? false : roodMeta?.state === "issue" ? true : roodMeta?.hasRow ? false : licentieIsProbleem(p.rood_licentie);
            const blauwIssue = blauwMeta?.state === "ok" ? false : blauwMeta?.state === "issue" ? true : blauwMeta?.hasRow ? false : licentieIsProbleem(p.blauw_licentie);
            if (roodIssue) {
                add("rood", safe(p.rood_naam_fp ?? p.rood_naam_mm), safe(p.rood_gym_fp ?? p.rood_gym_mm ?? p.rood_gym), `licentie: ${licentieLabel(p.rood_licentie)}`);
            }
            if (blauwIssue) {
                add("blauw", safe(p.blauw_naam_fp ?? p.blauw_naam_mm), safe(p.blauw_gym_fp ?? p.blauw_gym_mm ?? p.blauw_gym), `licentie: ${licentieLabel(p.blauw_licentie)}`);
            }
        }
        return items.sort((a, b)=>{
            if (a.partij_nr !== b.partij_nr) return a.partij_nr - b.partij_nr;
            if (a.hoek !== b.hoek) return a.hoek.localeCompare(b.hoek);
            return a.naam.localeCompare(b.naam, "nl");
        });
    }, [
        ctxRows,
        licentieMetaByPartijHoek
    ]);
    const missingVaIssues = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useMemo"])(()=>{
        const items = [];
        const missingRows = dedupeRows((resultaten ?? []).filter((r)=>{
            if (!isMissingVARow(r)) return false;
            if (isApprovedOrClosed(r.review_status)) return false;
            return true;
        }));
        for (const r of missingRows){
            const pn = Number(r.partij_nr);
            const hoek = inferHoek(r);
            if (!Number.isFinite(pn) || !hoek) continue;
            const ctx = ctxByPartij.get(pn);
            items.push({
                partij_nr: pn,
                partij: safe(ctx?.partij_label ?? pn),
                hoek,
                naam: hoek === "rood" ? safe(ctx?.rood_naam_fp ?? ctx?.rood_naam_mm) : safe(ctx?.blauw_naam_fp ?? ctx?.blauw_naam_mm),
                gym: hoek === "rood" ? safe(ctx?.rood_gym_fp ?? ctx?.rood_gym_mm ?? ctx?.rood_gym) : safe(ctx?.blauw_gym_fp ?? ctx?.blauw_gym_mm ?? ctx?.blauw_gym),
                label: "VA ontbreekt",
                detail: safe(r.boodschap ?? r.rule ?? "Fightpaspoortnummer ontbreekt")
            });
        }
        return items.sort((a, b)=>{
            if (a.partij_nr !== b.partij_nr) return a.partij_nr - b.partij_nr;
            if (a.hoek !== b.hoek) return a.hoek.localeCompare(b.hoek);
            return a.naam.localeCompare(b.naam, "nl");
        });
    }, [
        resultaten,
        ctxByPartij
    ]);
    const keurmerkIssues = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useMemo"])(()=>{
        const items = [];
        const seen = new Set();
        for (const r of openKeurmerkRows){
            const pn = Number(r.partij_nr);
            const hoek = inferHoek(r);
            if (!Number.isFinite(pn) || !hoek) continue;
            const ctx = ctxByPartij.get(pn);
            const naam = hoek === "rood" ? safe(ctx?.rood_naam_fp ?? ctx?.rood_naam_mm) : safe(ctx?.blauw_naam_fp ?? ctx?.blauw_naam_mm);
            const gym = hoek === "rood" ? safe(ctx?.rood_gym_fp ?? ctx?.rood_gym_mm ?? ctx?.rood_gym) : safe(ctx?.blauw_gym_fp ?? ctx?.blauw_gym_mm ?? ctx?.blauw_gym);
            const detail = safe(r.boodschap ?? r.rule ?? "geen geldig of geen herkend keurmerk");
            const key = `${pn}-${hoek}-${detail}`;
            if (seen.has(key)) continue;
            seen.add(key);
            items.push({
                partij_nr: pn,
                partij: safe(ctx?.partij_label ?? pn),
                hoek,
                naam,
                gym,
                label: "Keurmerk",
                detail
            });
        }
        return items.sort((a, b)=>{
            if (a.partij_nr !== b.partij_nr) return a.partij_nr - b.partij_nr;
            if (a.hoek !== b.hoek) return a.hoek.localeCompare(b.hoek);
            return a.naam.localeCompare(b.naam, "nl");
        });
    }, [
        openKeurmerkRows,
        ctxByPartij
    ]);
    const fightpaspoortGewijzigd = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useMemo"])(()=>{
        const items = [];
        const seen = new Set();
        for (const p of ctxRows ?? []){
            const pn = Number(p.partij_nr);
            if (!Number.isFinite(pn)) continue;
            const partij = safe(p.partij_label ?? p.partij_nr);
            const roodPrevRaw = getPrevVaFromCtx(p, "rood");
            const roodCurrentRaw = getCurrentVaFromCtx(p, "rood");
            const roodPrev = normalizeVa(roodPrevRaw);
            const roodCurrent = normalizeVa(roodCurrentRaw);
            const roodHasPrevField = hasPrevVaField(p, "rood");
            if (roodHasPrevField && roodPrev !== roodCurrent) {
                const naam = safe(p.rood_naam_fp ?? p.rood_naam_mm);
                items.push({
                    partij_nr: pn,
                    partij,
                    hoek: "rood",
                    naam,
                    gym: safe(p.rood_gym_fp ?? p.rood_gym_mm ?? p.rood_gym),
                    label: "Fightpaspoort gewijzigd",
                    detail: `${naam}: ${roodPrevRaw || "-"} → ${roodCurrentRaw || "-"}`
                });
                seen.add(`${pn}-rood`);
            }
            const blauwPrevRaw = getPrevVaFromCtx(p, "blauw");
            const blauwCurrentRaw = getCurrentVaFromCtx(p, "blauw");
            const blauwPrev = normalizeVa(blauwPrevRaw);
            const blauwCurrent = normalizeVa(blauwCurrentRaw);
            const blauwHasPrevField = hasPrevVaField(p, "blauw");
            if (blauwHasPrevField && blauwPrev !== blauwCurrent) {
                const naam = safe(p.blauw_naam_fp ?? p.blauw_naam_mm);
                items.push({
                    partij_nr: pn,
                    partij,
                    hoek: "blauw",
                    naam,
                    gym: safe(p.blauw_gym_fp ?? p.blauw_gym_mm ?? p.blauw_gym),
                    label: "Fightpaspoort gewijzigd",
                    detail: `${naam}: ${blauwPrevRaw || "-"} → ${blauwCurrentRaw || "-"}`
                });
                seen.add(`${pn}-blauw`);
            }
        }
        for (const ev of auditEvents ?? []){
            if (!isVaAuditEventType(ev.event_type)) continue;
            const pn = Number(ev.partij_nr);
            if (!Number.isFinite(pn)) continue;
            const hoek = ev.hoek ?? "rood";
            const key = `${pn}-${hoek}`;
            if (seen.has(key)) continue;
            const oldNorm = normalizeVa(ev.old_va);
            const newNorm = normalizeVa(ev.new_va);
            if (oldNorm === newNorm) continue;
            const ctx = ctxByPartij.get(pn);
            const naam = hoek === "rood" ? safe(ctx?.rood_naam_fp ?? ctx?.rood_naam_mm) : safe(ctx?.blauw_naam_fp ?? ctx?.blauw_naam_mm);
            items.push({
                partij_nr: pn,
                partij: safe(ctx?.partij_label ?? pn),
                hoek,
                naam,
                gym: hoek === "rood" ? safe(ctx?.rood_gym_fp ?? ctx?.rood_gym_mm ?? ctx?.rood_gym) : safe(ctx?.blauw_gym_fp ?? ctx?.blauw_gym_mm ?? ctx?.blauw_gym),
                label: "Fightpaspoort gewijzigd",
                detail: `${naam}: ${safe(ev.old_va, "-")} → ${safe(ev.new_va, "-")}`
            });
            seen.add(key);
        }
        for (const r of resultaten ?? []){
            if (!isFightpaspoortGewijzigd(r)) continue;
            const pn = Number(r.partij_nr);
            const hoek = inferHoek(r);
            if (!Number.isFinite(pn) || !hoek) continue;
            const key = `${pn}-${hoek}`;
            if (seen.has(key)) continue;
            const ctx = ctxByPartij.get(pn);
            const naam = hoek === "rood" ? safe(ctx?.rood_naam_fp ?? ctx?.rood_naam_mm) : safe(ctx?.blauw_naam_fp ?? ctx?.blauw_naam_mm);
            items.push({
                partij_nr: pn,
                partij: safe(ctx?.partij_label ?? pn),
                hoek,
                naam,
                gym: hoek === "rood" ? safe(ctx?.rood_gym_fp ?? ctx?.rood_gym_mm ?? ctx?.rood_gym) : safe(ctx?.blauw_gym_fp ?? ctx?.blauw_gym_mm ?? ctx?.blauw_gym),
                label: "Fightpaspoort gewijzigd",
                detail: `${naam}: ${safe(r.boodschap ?? r.rule ?? "Fightpaspoortnummer gewijzigd")}`
            });
            seen.add(key);
        }
        return items.sort((a, b)=>{
            if (a.partij_nr !== b.partij_nr) return a.partij_nr - b.partij_nr;
            return a.hoek.localeCompare(b.hoek);
        });
    }, [
        auditEvents,
        ctxByPartij,
        ctxRows,
        resultaten
    ]);
    const sportschoolIssues = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useMemo"])(()=>{
        const geenKeurmerk = new Set();
        const geenData = new Set();
        const verlopen = new Set();
        const datumOntbreekt = new Set();
        const nietGevonden = new Set();
        const belgischeCheck = new Set();
        for (const r of resultaten ?? []){
            const isRelevant = isBelgischeManualCheckRow(r) || isKeurmerkOpenIssue(r) || isSportschoolMatchRow(r) && !isApprovedOrClosed(r.review_status);
            if (!isRelevant) continue;
            const tekst = `${r.rule_code ?? ""} ${r.rule ?? ""} ${r.boodschap ?? ""} ${r.aantekeningen ?? ""}`.toLowerCase();
            const quoted = String(r.boodschap ?? "").match(/"([^"]+)"/);
            const pn = Number(r.partij_nr);
            const hoek = inferHoek(r);
            const ctx = Number.isFinite(pn) ? ctxByPartij.get(pn) : null;
            const gymFromCtx = hoek === "rood" ? safe(ctx?.rood_gym_fp ?? ctx?.rood_gym_mm ?? ctx?.rood_gym, "") : hoek === "blauw" ? safe(ctx?.blauw_gym_fp ?? ctx?.blauw_gym_mm ?? ctx?.blauw_gym, "") : "";
            const gym = quoted?.[1]?.trim() || gymFromCtx || "-";
            if (!gym) continue;
            if (isBelgischeManualCheckRow(r)) {
                belgischeCheck.add(gym);
                continue;
            }
            const isNietGevonden = tekst.includes("sportschool_niet_gevonden") || tekst.includes("geen match in sportscholen") || tekst.includes("sportschool niet gevonden") || tekst.includes("lege/ongeldige sportschoolnaam") || tekst.includes("ongeldige sportschoolnaam");
            const isGeenData = tekst.includes("geen match gevonden") || tekst.includes("niet gevonden op bkbmo") || tekst.includes("geen data") || tekst.includes("onvoldoende data") || tekst.includes("meerdere matches") || tekst.includes("ambigue");
            const isDatumOntbreekt = tekst.includes("keurmerk datum ontbreekt") || tekst.includes("geen keurmerkdatum") || tekst.includes("keurmerk") && tekst.includes("datum ontbreekt") || tekst.includes("expiry") && tekst.includes("missing") || tekst.includes("vervaldatum") && tekst.includes("ontbreekt");
            const isVerlopen = tekst.includes("verlopen") || tekst.includes("expired") || tekst.includes("expiry verlopen") || tekst.includes("keurmerk") && tekst.includes("niet meer geldig");
            const isGeenKeurmerk = tekst.includes("geen keurmerk") || tekst.includes("zonder keurmerk") || tekst.includes("ongeldig keurmerk") || tekst.includes("heeft geen geldig keurmerk") || tekst.includes("niet geldig keurmerk");
            if (isNietGevonden) {
                nietGevonden.add(gym);
                continue;
            }
            if (isGeenData) {
                geenData.add(gym);
                continue;
            }
            if (isDatumOntbreekt) {
                datumOntbreekt.add(gym);
                continue;
            }
            if (isVerlopen) {
                verlopen.add(gym);
                continue;
            }
            if (isGeenKeurmerk || !isApprovedOrClosed(r.review_status) || normResultaatLower(r.resultaat) !== "ok") {
                geenKeurmerk.add(gym);
            }
        }
        for (const gym of belgischeCheck){
            nietGevonden.delete(gym);
            geenData.delete(gym);
            geenKeurmerk.delete(gym);
            verlopen.delete(gym);
            datumOntbreekt.delete(gym);
        }
        for (const gym of nietGevonden){
            geenData.delete(gym);
            geenKeurmerk.delete(gym);
            verlopen.delete(gym);
            datumOntbreekt.delete(gym);
        }
        for (const gym of geenData){
            geenKeurmerk.delete(gym);
            verlopen.delete(gym);
            datumOntbreekt.delete(gym);
        }
        for (const gym of datumOntbreekt){
            geenKeurmerk.delete(gym);
            verlopen.delete(gym);
        }
        for (const gym of verlopen){
            geenKeurmerk.delete(gym);
        }
        return {
            belgischeCheck: Array.from(belgischeCheck).sort((a, b)=>a.localeCompare(b, "nl")),
            nietGevonden: Array.from(nietGevonden).sort((a, b)=>a.localeCompare(b, "nl")),
            geenKeurmerk: Array.from(geenKeurmerk).sort((a, b)=>a.localeCompare(b, "nl")),
            geenData: Array.from(geenData).sort((a, b)=>a.localeCompare(b, "nl")),
            verlopen: Array.from(verlopen).sort((a, b)=>a.localeCompare(b, "nl")),
            datumOntbreekt: Array.from(datumOntbreekt).sort((a, b)=>a.localeCompare(b, "nl"))
        };
    }, [
        resultaten,
        ctxByPartij
    ]);
    const partijMetOpenMeldingen = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useMemo"])(()=>{
        return (ctxRows ?? []).map((p)=>{
            const pn = Number(p.partij_nr);
            if (!Number.isFinite(pn)) return null;
            const meldingen = meldByPartij.get(pn) ?? [];
            if (!meldingen.length) return null;
            return {
                partij_nr: pn,
                partij_label: safe(p.partij_label ?? p.partij_nr),
                status: partyStatusVoorMeldingen(meldingen),
                discipline: safe(p.discipline),
                klasse: safe(p.klasse_mm ?? p.klasse),
                max_gewicht: maxGewichtLabel(p),
                roodNaam: safe(p.rood_naam_fp ?? p.rood_naam_mm),
                roodGym: safe(p.rood_gym_fp ?? p.rood_gym_mm ?? p.rood_gym),
                roodVa: safe(p.rood_va_mm ?? p.va_rood ?? p.rood_va),
                blauwNaam: safe(p.blauw_naam_fp ?? p.blauw_naam_mm),
                blauwGym: safe(p.blauw_gym_fp ?? p.blauw_gym_mm ?? p.blauw_gym),
                blauwVa: safe(p.blauw_va_mm ?? p.va_blauw ?? p.blauw_va),
                meldingen
            };
        }).filter(Boolean);
    }, [
        ctxRows,
        meldByPartij
    ]);
    if (loading) {
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "p-6 text-sm",
            children: "Rapport laden…"
        }, void 0, false, {
            fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
            lineNumber: 1326,
            columnNumber: 12
        }, this);
    }
    if (error) {
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "p-6 text-sm text-red-700",
            children: [
                "Fout: ",
                error
            ]
        }, void 0, true, {
            fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
            lineNumber: 1330,
            columnNumber: 12
        }, this);
    }
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "jsx-ff900f9018a9c936" + " " + "fs-report min-h-screen bg-[#eceff3] text-[#111827]",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$styled$2d$jsx$2f$style$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"], {
                id: "ff900f9018a9c936",
                children: "@page{size:A4;margin:10mm}@media print{*{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}html,body{background:#fff!important}.no-print{display:none!important}.print-max{max-width:none!important;margin:0!important;padding:0!important}.page-break{page-break-before:always!important;break-before:page!important}.avoid-break{break-inside:avoid!important;page-break-inside:avoid!important}.compact-first-page{break-after:page;page-break-after:always}}"
            }, void 0, false, void 0, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "jsx-ff900f9018a9c936" + " " + "print-max mx-auto max-w-6xl px-4 py-5",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "jsx-ff900f9018a9c936" + " " + "no-print mb-4 flex items-center justify-between gap-3",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"], {
                                href: `/dashboard/admin/controle/${matchmakingId}`,
                                className: "inline-flex items-center rounded-lg bg-black px-4 py-2 text-sm font-bold text-white hover:opacity-90",
                                children: "← Terug"
                            }, void 0, false, {
                                fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                lineNumber: 1381,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                type: "button",
                                onClick: ()=>window.print(),
                                className: "jsx-ff900f9018a9c936" + " " + "inline-flex items-center rounded-lg bg-[#ff4d00] px-4 py-2 text-sm font-black text-black hover:brightness-105",
                                children: "Print / PDF"
                            }, void 0, false, {
                                fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                lineNumber: 1387,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                        lineNumber: 1380,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("section", {
                        className: "jsx-ff900f9018a9c936" + " " + "compact-first-page avoid-break rounded-[24px] border border-black/10 bg-white p-5 shadow-[0_12px_30px_rgba(0,0,0,0.08)]",
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "jsx-ff900f9018a9c936" + " " + "rounded-[18px] border border-black/10 bg-[linear-gradient(180deg,#f7f7f7_0%,#ececec_100%)] px-5 py-4",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "jsx-ff900f9018a9c936" + " " + "mb-4 text-center",
                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(FsLogo, {}, void 0, false, {
                                        fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                        lineNumber: 1399,
                                        columnNumber: 15
                                    }, this)
                                }, void 0, false, {
                                    fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                    lineNumber: 1398,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "jsx-ff900f9018a9c936" + " " + "grid gap-3 md:grid-cols-[1.3fr,1fr,1fr,1.5fr]",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "jsx-ff900f9018a9c936",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "jsx-ff900f9018a9c936" + " " + "text-[11px] font-black uppercase tracking-[0.18em] text-[#ff4d00]",
                                                    children: "Evenement"
                                                }, void 0, false, {
                                                    fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                    lineNumber: 1404,
                                                    columnNumber: 17
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "jsx-ff900f9018a9c936" + " " + "text-xl font-black leading-tight",
                                                    children: safe(eventMeta?.naam)
                                                }, void 0, false, {
                                                    fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                    lineNumber: 1405,
                                                    columnNumber: 17
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                            lineNumber: 1403,
                                            columnNumber: 15
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "jsx-ff900f9018a9c936",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "jsx-ff900f9018a9c936" + " " + "text-[11px] font-black uppercase tracking-[0.18em] text-[#ff4d00]",
                                                    children: "Datum"
                                                }, void 0, false, {
                                                    fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                    lineNumber: 1408,
                                                    columnNumber: 17
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "jsx-ff900f9018a9c936" + " " + "text-base font-black",
                                                    children: fmtNlDateOnly(eventMeta?.datum)
                                                }, void 0, false, {
                                                    fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                    lineNumber: 1409,
                                                    columnNumber: 17
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                            lineNumber: 1407,
                                            columnNumber: 15
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "jsx-ff900f9018a9c936",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "jsx-ff900f9018a9c936" + " " + "text-[11px] font-black uppercase tracking-[0.18em] text-[#ff4d00]",
                                                    children: "Bond"
                                                }, void 0, false, {
                                                    fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                    lineNumber: 1412,
                                                    columnNumber: 17
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "jsx-ff900f9018a9c936" + " " + "text-base font-black",
                                                    children: safe(eventMeta?.bondteam)
                                                }, void 0, false, {
                                                    fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                    lineNumber: 1413,
                                                    columnNumber: 17
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                            lineNumber: 1411,
                                            columnNumber: 15
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "jsx-ff900f9018a9c936",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "jsx-ff900f9018a9c936" + " " + "text-[11px] font-black uppercase tracking-[0.18em] text-[#ff4d00]",
                                                    children: "Controle run"
                                                }, void 0, false, {
                                                    fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                    lineNumber: 1416,
                                                    columnNumber: 17
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "jsx-ff900f9018a9c936" + " " + "text-sm font-bold",
                                                    children: [
                                                        safe(run?.status),
                                                        " • gestart: ",
                                                        fmtDateTime(run?.gestart_op)
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                    lineNumber: 1417,
                                                    columnNumber: 17
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "jsx-ff900f9018a9c936" + " " + "text-sm font-bold",
                                                    children: [
                                                        "afgerond: ",
                                                        fmtDateTime(run?.afgerond_op)
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                    lineNumber: 1420,
                                                    columnNumber: 17
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                            lineNumber: 1415,
                                            columnNumber: 15
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                    lineNumber: 1402,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "jsx-ff900f9018a9c936" + " " + "mt-3 text-xs font-semibold text-black/70",
                                    children: [
                                        "Matchmaking ID: ",
                                        matchmakingId
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                    lineNumber: 1424,
                                    columnNumber: 13
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                            lineNumber: 1397,
                            columnNumber: 11
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                        lineNumber: 1396,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("section", {
                        className: "jsx-ff900f9018a9c936" + " " + "page-break rounded-[24px] border border-black/10 bg-white p-4 shadow-[0_12px_30px_rgba(0,0,0,0.08)]",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "jsx-ff900f9018a9c936" + " " + "space-y-4",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "jsx-ff900f9018a9c936" + " " + "overflow-hidden rounded-[18px] border border-black/10",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(SectionTitle, {
                                                right: `${verbodStartverbodIssues.length}`,
                                                children: "VERBOD / STARTVERBOD"
                                            }, void 0, false, {
                                                fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                lineNumber: 1431,
                                                columnNumber: 15
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "jsx-ff900f9018a9c936" + " " + "overflow-x-auto px-3 pb-3",
                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("table", {
                                                    className: "jsx-ff900f9018a9c936" + " " + "w-full border-separate border-spacing-y-[2px] text-xs",
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("thead", {
                                                            className: "jsx-ff900f9018a9c936",
                                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("tr", {
                                                                className: "jsx-ff900f9018a9c936",
                                                                children: [
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                                        className: "jsx-ff900f9018a9c936" + " " + "rounded-l-md bg-[#3a3f46] px-2 py-1 text-left font-black text-white",
                                                                        children: "Partij"
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                                        lineNumber: 1436,
                                                                        columnNumber: 23
                                                                    }, this),
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                                        className: "jsx-ff900f9018a9c936" + " " + "bg-[#3a3f46] px-2 py-1 text-left font-black text-white",
                                                                        children: "Type"
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                                        lineNumber: 1437,
                                                                        columnNumber: 23
                                                                    }, this),
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                                        className: "jsx-ff900f9018a9c936" + " " + "bg-[#3a3f46] px-2 py-1 text-left font-black text-white",
                                                                        children: "Hoek"
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                                        lineNumber: 1438,
                                                                        columnNumber: 23
                                                                    }, this),
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                                        className: "jsx-ff900f9018a9c936" + " " + "bg-[#3a3f46] px-2 py-1 text-left font-black text-white",
                                                                        children: "Naam"
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                                        lineNumber: 1439,
                                                                        columnNumber: 23
                                                                    }, this),
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                                        className: "jsx-ff900f9018a9c936" + " " + "bg-[#3a3f46] px-2 py-1 text-left font-black text-white",
                                                                        children: "Gym"
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                                        lineNumber: 1440,
                                                                        columnNumber: 23
                                                                    }, this),
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                                        className: "jsx-ff900f9018a9c936" + " " + "rounded-r-md bg-[#3a3f46] px-2 py-1 text-left font-black text-white",
                                                                        children: "Detail"
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                                        lineNumber: 1441,
                                                                        columnNumber: 23
                                                                    }, this)
                                                                ]
                                                            }, void 0, true, {
                                                                fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                                lineNumber: 1435,
                                                                columnNumber: 21
                                                            }, this)
                                                        }, void 0, false, {
                                                            fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                            lineNumber: 1434,
                                                            columnNumber: 19
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("tbody", {
                                                            className: "jsx-ff900f9018a9c936",
                                                            children: verbodStartverbodIssues.length ? verbodStartverbodIssues.map((item, idx)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("tr", {
                                                                    className: "jsx-ff900f9018a9c936",
                                                                    children: [
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                                            className: "jsx-ff900f9018a9c936" + " " + `rounded-l-md px-2 py-1.5 font-bold ${rowBg(idx)}`,
                                                                            children: item.partij
                                                                        }, void 0, false, {
                                                                            fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                                            lineNumber: 1448,
                                                                            columnNumber: 27
                                                                        }, this),
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                                            className: "jsx-ff900f9018a9c936" + " " + `px-2 py-1.5 font-black ${rowBg(idx)}`,
                                                                            children: item.type
                                                                        }, void 0, false, {
                                                                            fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                                            lineNumber: 1449,
                                                                            columnNumber: 27
                                                                        }, this),
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                                            className: "jsx-ff900f9018a9c936" + " " + `px-2 py-1.5 capitalize ${rowBg(idx)}`,
                                                                            children: item.hoek
                                                                        }, void 0, false, {
                                                                            fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                                            lineNumber: 1450,
                                                                            columnNumber: 27
                                                                        }, this),
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                                            className: "jsx-ff900f9018a9c936" + " " + `px-2 py-1.5 font-semibold ${rowBg(idx)}`,
                                                                            children: item.naam
                                                                        }, void 0, false, {
                                                                            fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                                            lineNumber: 1451,
                                                                            columnNumber: 27
                                                                        }, this),
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                                            className: "jsx-ff900f9018a9c936" + " " + `px-2 py-1.5 ${rowBg(idx)}`,
                                                                            children: item.gym
                                                                        }, void 0, false, {
                                                                            fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                                            lineNumber: 1452,
                                                                            columnNumber: 27
                                                                        }, this),
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                                            className: "jsx-ff900f9018a9c936" + " " + `rounded-r-md px-2 py-1.5 ${rowBg(idx)}`,
                                                                            children: item.detail
                                                                        }, void 0, false, {
                                                                            fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                                            lineNumber: 1453,
                                                                            columnNumber: 27
                                                                        }, this)
                                                                    ]
                                                                }, `${item.type}-${item.partij_nr}-${item.hoek}-${idx}`, true, {
                                                                    fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                                    lineNumber: 1447,
                                                                    columnNumber: 25
                                                                }, this)) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("tr", {
                                                                className: "jsx-ff900f9018a9c936",
                                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                                    colSpan: 6,
                                                                    className: "jsx-ff900f9018a9c936" + " " + "rounded-md bg-white px-3 py-3 text-sm text-black/70",
                                                                    children: "Geen open verboden of startverboden."
                                                                }, void 0, false, {
                                                                    fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                                    lineNumber: 1458,
                                                                    columnNumber: 25
                                                                }, this)
                                                            }, void 0, false, {
                                                                fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                                lineNumber: 1457,
                                                                columnNumber: 23
                                                            }, this)
                                                        }, void 0, false, {
                                                            fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                            lineNumber: 1444,
                                                            columnNumber: 19
                                                        }, this)
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                    lineNumber: 1433,
                                                    columnNumber: 17
                                                }, this)
                                            }, void 0, false, {
                                                fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                lineNumber: 1432,
                                                columnNumber: 15
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                        lineNumber: 1430,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "jsx-ff900f9018a9c936" + " " + "overflow-hidden rounded-[18px] border border-black/10",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(SectionTitle, {
                                                right: `${licentieIssues.length}`,
                                                children: "GEEN LICENTIE"
                                            }, void 0, false, {
                                                fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                lineNumber: 1469,
                                                columnNumber: 15
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "jsx-ff900f9018a9c936" + " " + "overflow-x-auto px-3 pb-3",
                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("table", {
                                                    className: "jsx-ff900f9018a9c936" + " " + "w-full border-separate border-spacing-y-[2px] text-xs",
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("thead", {
                                                            className: "jsx-ff900f9018a9c936",
                                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("tr", {
                                                                className: "jsx-ff900f9018a9c936",
                                                                children: [
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                                        className: "jsx-ff900f9018a9c936" + " " + "rounded-l-md bg-[#3a3f46] px-2 py-1 text-left font-black text-white",
                                                                        children: "Partij"
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                                        lineNumber: 1474,
                                                                        columnNumber: 23
                                                                    }, this),
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                                        className: "jsx-ff900f9018a9c936" + " " + "bg-[#3a3f46] px-2 py-1 text-left font-black text-white",
                                                                        children: "Hoek"
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                                        lineNumber: 1475,
                                                                        columnNumber: 23
                                                                    }, this),
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                                        className: "jsx-ff900f9018a9c936" + " " + "bg-[#3a3f46] px-2 py-1 text-left font-black text-white",
                                                                        children: "Naam"
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                                        lineNumber: 1476,
                                                                        columnNumber: 23
                                                                    }, this),
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                                        className: "jsx-ff900f9018a9c936" + " " + "bg-[#3a3f46] px-2 py-1 text-left font-black text-white",
                                                                        children: "Gym"
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                                        lineNumber: 1477,
                                                                        columnNumber: 23
                                                                    }, this),
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                                        className: "jsx-ff900f9018a9c936" + " " + "bg-[#3a3f46] px-2 py-1 text-left font-black text-white",
                                                                        children: "Soort"
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                                        lineNumber: 1478,
                                                                        columnNumber: 23
                                                                    }, this),
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                                        className: "jsx-ff900f9018a9c936" + " " + "rounded-r-md bg-[#3a3f46] px-2 py-1 text-left font-black text-white",
                                                                        children: "Detail"
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                                        lineNumber: 1479,
                                                                        columnNumber: 23
                                                                    }, this)
                                                                ]
                                                            }, void 0, true, {
                                                                fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                                lineNumber: 1473,
                                                                columnNumber: 21
                                                            }, this)
                                                        }, void 0, false, {
                                                            fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                            lineNumber: 1472,
                                                            columnNumber: 19
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("tbody", {
                                                            className: "jsx-ff900f9018a9c936",
                                                            children: licentieIssues.length ? licentieIssues.map((item, idx)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("tr", {
                                                                    className: "jsx-ff900f9018a9c936",
                                                                    children: [
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                                            className: "jsx-ff900f9018a9c936" + " " + `rounded-l-md px-2 py-1.5 font-bold ${rowBg(idx)}`,
                                                                            children: item.partij
                                                                        }, void 0, false, {
                                                                            fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                                            lineNumber: 1486,
                                                                            columnNumber: 27
                                                                        }, this),
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                                            className: "jsx-ff900f9018a9c936" + " " + `px-2 py-1.5 capitalize ${rowBg(idx)}`,
                                                                            children: item.hoek
                                                                        }, void 0, false, {
                                                                            fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                                            lineNumber: 1487,
                                                                            columnNumber: 27
                                                                        }, this),
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                                            className: "jsx-ff900f9018a9c936" + " " + `px-2 py-1.5 font-semibold ${rowBg(idx)}`,
                                                                            children: item.naam
                                                                        }, void 0, false, {
                                                                            fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                                            lineNumber: 1488,
                                                                            columnNumber: 27
                                                                        }, this),
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                                            className: "jsx-ff900f9018a9c936" + " " + `px-2 py-1.5 ${rowBg(idx)}`,
                                                                            children: item.gym
                                                                        }, void 0, false, {
                                                                            fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                                            lineNumber: 1489,
                                                                            columnNumber: 27
                                                                        }, this),
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                                            className: "jsx-ff900f9018a9c936" + " " + `px-2 py-1.5 font-bold ${rowBg(idx)}`,
                                                                            children: item.label
                                                                        }, void 0, false, {
                                                                            fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                                            lineNumber: 1490,
                                                                            columnNumber: 27
                                                                        }, this),
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                                            className: "jsx-ff900f9018a9c936" + " " + `rounded-r-md px-2 py-1.5 ${rowBg(idx)}`,
                                                                            children: item.detail
                                                                        }, void 0, false, {
                                                                            fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                                            lineNumber: 1491,
                                                                            columnNumber: 27
                                                                        }, this)
                                                                    ]
                                                                }, `${item.partij_nr}-${item.hoek}-${item.label}-${idx}`, true, {
                                                                    fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                                    lineNumber: 1485,
                                                                    columnNumber: 25
                                                                }, this)) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("tr", {
                                                                className: "jsx-ff900f9018a9c936",
                                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                                    colSpan: 6,
                                                                    className: "jsx-ff900f9018a9c936" + " " + "rounded-md bg-white px-3 py-3 text-sm text-black/70",
                                                                    children: "Geen open licentieproblemen."
                                                                }, void 0, false, {
                                                                    fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                                    lineNumber: 1496,
                                                                    columnNumber: 25
                                                                }, this)
                                                            }, void 0, false, {
                                                                fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                                lineNumber: 1495,
                                                                columnNumber: 23
                                                            }, this)
                                                        }, void 0, false, {
                                                            fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                            lineNumber: 1482,
                                                            columnNumber: 19
                                                        }, this)
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                    lineNumber: 1471,
                                                    columnNumber: 17
                                                }, this)
                                            }, void 0, false, {
                                                fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                lineNumber: 1470,
                                                columnNumber: 15
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                        lineNumber: 1468,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "jsx-ff900f9018a9c936" + " " + "overflow-hidden rounded-[18px] border border-black/10",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(SectionTitle, {
                                                right: missingVaIssues.length,
                                                children: "ONTBREKENDE VA NUMMERS"
                                            }, void 0, false, {
                                                fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                lineNumber: 1507,
                                                columnNumber: 15
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "jsx-ff900f9018a9c936" + " " + "overflow-x-auto px-3 pb-3",
                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("table", {
                                                    className: "jsx-ff900f9018a9c936" + " " + "w-full border-separate border-spacing-y-[2px] text-xs",
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("thead", {
                                                            className: "jsx-ff900f9018a9c936",
                                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("tr", {
                                                                className: "jsx-ff900f9018a9c936",
                                                                children: [
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                                        className: "jsx-ff900f9018a9c936" + " " + "rounded-l-md bg-[#3a3f46] px-2 py-1 text-left font-black text-white",
                                                                        children: "Partij"
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                                        lineNumber: 1512,
                                                                        columnNumber: 23
                                                                    }, this),
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                                        className: "jsx-ff900f9018a9c936" + " " + "bg-[#3a3f46] px-2 py-1 text-left font-black text-white",
                                                                        children: "Hoek"
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                                        lineNumber: 1513,
                                                                        columnNumber: 23
                                                                    }, this),
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                                        className: "jsx-ff900f9018a9c936" + " " + "bg-[#3a3f46] px-2 py-1 text-left font-black text-white",
                                                                        children: "Naam"
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                                        lineNumber: 1514,
                                                                        columnNumber: 23
                                                                    }, this),
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                                        className: "jsx-ff900f9018a9c936" + " " + "bg-[#3a3f46] px-2 py-1 text-left font-black text-white",
                                                                        children: "Gym"
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                                        lineNumber: 1515,
                                                                        columnNumber: 23
                                                                    }, this),
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                                        className: "jsx-ff900f9018a9c936" + " " + "rounded-r-md bg-[#3a3f46] px-2 py-1 text-left font-black text-white",
                                                                        children: "Detail"
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                                        lineNumber: 1516,
                                                                        columnNumber: 23
                                                                    }, this)
                                                                ]
                                                            }, void 0, true, {
                                                                fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                                lineNumber: 1511,
                                                                columnNumber: 21
                                                            }, this)
                                                        }, void 0, false, {
                                                            fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                            lineNumber: 1510,
                                                            columnNumber: 19
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("tbody", {
                                                            className: "jsx-ff900f9018a9c936",
                                                            children: missingVaIssues.length ? missingVaIssues.map((item, idx)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("tr", {
                                                                    className: "jsx-ff900f9018a9c936",
                                                                    children: [
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                                            className: "jsx-ff900f9018a9c936" + " " + `rounded-l-md px-2 py-1.5 font-bold ${rowBg(idx)}`,
                                                                            children: item.partij
                                                                        }, void 0, false, {
                                                                            fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                                            lineNumber: 1523,
                                                                            columnNumber: 27
                                                                        }, this),
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                                            className: "jsx-ff900f9018a9c936" + " " + `px-2 py-1.5 capitalize ${rowBg(idx)}`,
                                                                            children: item.hoek
                                                                        }, void 0, false, {
                                                                            fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                                            lineNumber: 1524,
                                                                            columnNumber: 27
                                                                        }, this),
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                                            className: "jsx-ff900f9018a9c936" + " " + `px-2 py-1.5 font-semibold ${rowBg(idx)}`,
                                                                            children: item.naam
                                                                        }, void 0, false, {
                                                                            fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                                            lineNumber: 1525,
                                                                            columnNumber: 27
                                                                        }, this),
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                                            className: "jsx-ff900f9018a9c936" + " " + `px-2 py-1.5 ${rowBg(idx)}`,
                                                                            children: item.gym
                                                                        }, void 0, false, {
                                                                            fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                                            lineNumber: 1526,
                                                                            columnNumber: 27
                                                                        }, this),
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                                            className: "jsx-ff900f9018a9c936" + " " + `rounded-r-md px-2 py-1.5 ${rowBg(idx)}`,
                                                                            children: item.detail
                                                                        }, void 0, false, {
                                                                            fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                                            lineNumber: 1527,
                                                                            columnNumber: 27
                                                                        }, this)
                                                                    ]
                                                                }, `${item.partij_nr}-${item.hoek}-missing-va-${idx}`, true, {
                                                                    fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                                    lineNumber: 1522,
                                                                    columnNumber: 25
                                                                }, this)) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("tr", {
                                                                className: "jsx-ff900f9018a9c936",
                                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                                    colSpan: 5,
                                                                    className: "jsx-ff900f9018a9c936" + " " + "rounded-md bg-white px-3 py-3 text-sm text-black/70",
                                                                    children: "Geen."
                                                                }, void 0, false, {
                                                                    fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                                    lineNumber: 1532,
                                                                    columnNumber: 25
                                                                }, this)
                                                            }, void 0, false, {
                                                                fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                                lineNumber: 1531,
                                                                columnNumber: 23
                                                            }, this)
                                                        }, void 0, false, {
                                                            fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                            lineNumber: 1519,
                                                            columnNumber: 19
                                                        }, this)
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                    lineNumber: 1509,
                                                    columnNumber: 17
                                                }, this)
                                            }, void 0, false, {
                                                fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                lineNumber: 1508,
                                                columnNumber: 15
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                        lineNumber: 1506,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "jsx-ff900f9018a9c936" + " " + "overflow-hidden rounded-[18px] border border-black/10",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(SectionTitle, {
                                                right: fightpaspoortGewijzigd.length,
                                                children: "FIGHTPASPOORT NUMMER GEWIJZIGD"
                                            }, void 0, false, {
                                                fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                lineNumber: 1543,
                                                columnNumber: 15
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "jsx-ff900f9018a9c936" + " " + "overflow-x-auto px-3 pb-3",
                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("table", {
                                                    className: "jsx-ff900f9018a9c936" + " " + "w-full border-separate border-spacing-y-[2px] text-xs",
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("thead", {
                                                            className: "jsx-ff900f9018a9c936",
                                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("tr", {
                                                                className: "jsx-ff900f9018a9c936",
                                                                children: [
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                                        className: "jsx-ff900f9018a9c936" + " " + "rounded-l-md bg-[#3a3f46] px-2 py-1 text-left font-black text-white",
                                                                        children: "Partij"
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                                        lineNumber: 1548,
                                                                        columnNumber: 23
                                                                    }, this),
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                                        className: "jsx-ff900f9018a9c936" + " " + "bg-[#3a3f46] px-2 py-1 text-left font-black text-white",
                                                                        children: "Hoek"
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                                        lineNumber: 1549,
                                                                        columnNumber: 23
                                                                    }, this),
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                                        className: "jsx-ff900f9018a9c936" + " " + "bg-[#3a3f46] px-2 py-1 text-left font-black text-white",
                                                                        children: "Naam"
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                                        lineNumber: 1550,
                                                                        columnNumber: 23
                                                                    }, this),
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                                        className: "jsx-ff900f9018a9c936" + " " + "bg-[#3a3f46] px-2 py-1 text-left font-black text-white",
                                                                        children: "Gym"
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                                        lineNumber: 1551,
                                                                        columnNumber: 23
                                                                    }, this),
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                                        className: "jsx-ff900f9018a9c936" + " " + "rounded-r-md bg-[#3a3f46] px-2 py-1 text-left font-black text-white",
                                                                        children: "Wijziging"
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                                        lineNumber: 1552,
                                                                        columnNumber: 23
                                                                    }, this)
                                                                ]
                                                            }, void 0, true, {
                                                                fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                                lineNumber: 1547,
                                                                columnNumber: 21
                                                            }, this)
                                                        }, void 0, false, {
                                                            fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                            lineNumber: 1546,
                                                            columnNumber: 19
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("tbody", {
                                                            className: "jsx-ff900f9018a9c936",
                                                            children: fightpaspoortGewijzigd.length ? fightpaspoortGewijzigd.map((item, idx)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("tr", {
                                                                    className: "jsx-ff900f9018a9c936",
                                                                    children: [
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                                            className: "jsx-ff900f9018a9c936" + " " + `rounded-l-md px-2 py-1.5 font-bold ${rowBg(idx)}`,
                                                                            children: item.partij
                                                                        }, void 0, false, {
                                                                            fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                                            lineNumber: 1559,
                                                                            columnNumber: 27
                                                                        }, this),
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                                            className: "jsx-ff900f9018a9c936" + " " + `px-2 py-1.5 capitalize ${rowBg(idx)}`,
                                                                            children: item.hoek
                                                                        }, void 0, false, {
                                                                            fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                                            lineNumber: 1560,
                                                                            columnNumber: 27
                                                                        }, this),
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                                            className: "jsx-ff900f9018a9c936" + " " + `px-2 py-1.5 font-semibold ${rowBg(idx)}`,
                                                                            children: item.naam
                                                                        }, void 0, false, {
                                                                            fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                                            lineNumber: 1561,
                                                                            columnNumber: 27
                                                                        }, this),
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                                            className: "jsx-ff900f9018a9c936" + " " + `px-2 py-1.5 ${rowBg(idx)}`,
                                                                            children: item.gym
                                                                        }, void 0, false, {
                                                                            fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                                            lineNumber: 1562,
                                                                            columnNumber: 27
                                                                        }, this),
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                                            className: "jsx-ff900f9018a9c936" + " " + `rounded-r-md px-2 py-1.5 font-bold ${rowBg(idx)}`,
                                                                            children: item.detail
                                                                        }, void 0, false, {
                                                                            fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                                            lineNumber: 1563,
                                                                            columnNumber: 27
                                                                        }, this)
                                                                    ]
                                                                }, `${item.partij_nr}-${item.hoek}-${idx}`, true, {
                                                                    fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                                    lineNumber: 1558,
                                                                    columnNumber: 25
                                                                }, this)) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("tr", {
                                                                className: "jsx-ff900f9018a9c936",
                                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                                    colSpan: 5,
                                                                    className: "jsx-ff900f9018a9c936" + " " + "rounded-md bg-white px-3 py-3 text-sm text-black/70",
                                                                    children: "Geen."
                                                                }, void 0, false, {
                                                                    fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                                    lineNumber: 1568,
                                                                    columnNumber: 25
                                                                }, this)
                                                            }, void 0, false, {
                                                                fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                                lineNumber: 1567,
                                                                columnNumber: 23
                                                            }, this)
                                                        }, void 0, false, {
                                                            fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                            lineNumber: 1555,
                                                            columnNumber: 19
                                                        }, this)
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                    lineNumber: 1545,
                                                    columnNumber: 17
                                                }, this)
                                            }, void 0, false, {
                                                fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                lineNumber: 1544,
                                                columnNumber: 15
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                        lineNumber: 1542,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "jsx-ff900f9018a9c936" + " " + "overflow-hidden rounded-[18px] border border-black/10",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(SectionTitle, {
                                                right: `${sportschoolIssues.belgischeCheck.length}`,
                                                children: "BELGIË / BKBMO / BOKSBOEKJE CONTROLE"
                                            }, void 0, false, {
                                                fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                lineNumber: 1579,
                                                columnNumber: 15
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "jsx-ff900f9018a9c936" + " " + "overflow-x-auto px-3 pb-3",
                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("table", {
                                                    className: "jsx-ff900f9018a9c936" + " " + "w-full border-separate border-spacing-y-[2px] text-xs",
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("thead", {
                                                            className: "jsx-ff900f9018a9c936",
                                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("tr", {
                                                                className: "jsx-ff900f9018a9c936",
                                                                children: [
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                                        className: "jsx-ff900f9018a9c936" + " " + "rounded-l-md bg-[#3a3f46] px-2 py-1 text-left font-black text-white",
                                                                        children: "Soort"
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                                        lineNumber: 1586,
                                                                        columnNumber: 23
                                                                    }, this),
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                                        className: "jsx-ff900f9018a9c936" + " " + "bg-[#3a3f46] px-2 py-1 text-left font-black text-white",
                                                                        children: "Waarde"
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                                        lineNumber: 1587,
                                                                        columnNumber: 23
                                                                    }, this),
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                                        className: "jsx-ff900f9018a9c936" + " " + "rounded-r-md bg-[#3a3f46] px-2 py-1 text-left font-black text-white",
                                                                        children: "Detail"
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                                        lineNumber: 1588,
                                                                        columnNumber: 23
                                                                    }, this)
                                                                ]
                                                            }, void 0, true, {
                                                                fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                                lineNumber: 1585,
                                                                columnNumber: 21
                                                            }, this)
                                                        }, void 0, false, {
                                                            fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                            lineNumber: 1584,
                                                            columnNumber: 19
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("tbody", {
                                                            className: "jsx-ff900f9018a9c936",
                                                            children: sportschoolIssues.belgischeCheck.length ? sportschoolIssues.belgischeCheck.map((gym, idx)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("tr", {
                                                                    className: "jsx-ff900f9018a9c936",
                                                                    children: [
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                                            className: "jsx-ff900f9018a9c936" + " " + `rounded-l-md px-2 py-1.5 font-bold ${rowBg(idx)}`,
                                                                            children: "België / BKBMO check"
                                                                        }, void 0, false, {
                                                                            fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                                            lineNumber: 1595,
                                                                            columnNumber: 27
                                                                        }, this),
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                                            className: "jsx-ff900f9018a9c936" + " " + `px-2 py-1.5 font-semibold ${rowBg(idx)}`,
                                                                            children: gym
                                                                        }, void 0, false, {
                                                                            fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                                            lineNumber: 1596,
                                                                            columnNumber: 27
                                                                        }, this),
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                                            className: "jsx-ff900f9018a9c936" + " " + `rounded-r-md px-2 py-1.5 ${rowBg(idx)}`,
                                                                            children: "Belgische sportschool. Geen NVB-keurmerk vereist; controleer BKBMO-site en boksboekje."
                                                                        }, void 0, false, {
                                                                            fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                                            lineNumber: 1597,
                                                                            columnNumber: 27
                                                                        }, this)
                                                                    ]
                                                                }, `belgische-check-${gym}-${idx}`, true, {
                                                                    fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                                    lineNumber: 1594,
                                                                    columnNumber: 25
                                                                }, this)) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("tr", {
                                                                className: "jsx-ff900f9018a9c936",
                                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                                    colSpan: 3,
                                                                    className: "jsx-ff900f9018a9c936" + " " + "rounded-md bg-white px-3 py-3 text-sm text-black/70",
                                                                    children: "Geen open Belgische sportschoolcontroles."
                                                                }, void 0, false, {
                                                                    fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                                    lineNumber: 1604,
                                                                    columnNumber: 25
                                                                }, this)
                                                            }, void 0, false, {
                                                                fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                                lineNumber: 1603,
                                                                columnNumber: 23
                                                            }, this)
                                                        }, void 0, false, {
                                                            fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                            lineNumber: 1591,
                                                            columnNumber: 19
                                                        }, this)
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                    lineNumber: 1583,
                                                    columnNumber: 17
                                                }, this)
                                            }, void 0, false, {
                                                fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                lineNumber: 1582,
                                                columnNumber: 15
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                        lineNumber: 1578,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "jsx-ff900f9018a9c936" + " " + "overflow-hidden rounded-[18px] border border-black/10",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(SectionTitle, {
                                                right: `${keurmerkIssues.length + sportschoolIssues.nietGevonden.length + sportschoolIssues.geenKeurmerk.length + sportschoolIssues.geenData.length + sportschoolIssues.verlopen.length + sportschoolIssues.datumOntbreekt.length}`,
                                                children: "KEURMERK CONTROLE"
                                            }, void 0, false, {
                                                fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                lineNumber: 1615,
                                                columnNumber: 15
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "jsx-ff900f9018a9c936" + " " + "space-y-4 px-3 pb-3",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        className: "jsx-ff900f9018a9c936" + " " + "overflow-x-auto",
                                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("table", {
                                                            className: "jsx-ff900f9018a9c936" + " " + "w-full border-separate border-spacing-y-[2px] text-xs",
                                                            children: [
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("thead", {
                                                                    className: "jsx-ff900f9018a9c936",
                                                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("tr", {
                                                                        className: "jsx-ff900f9018a9c936",
                                                                        children: [
                                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                                                className: "jsx-ff900f9018a9c936" + " " + "rounded-l-md bg-[#3a3f46] px-2 py-1 text-left font-black text-white",
                                                                                children: "Soort"
                                                                            }, void 0, false, {
                                                                                fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                                                lineNumber: 1632,
                                                                                columnNumber: 25
                                                                            }, this),
                                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                                                className: "jsx-ff900f9018a9c936" + " " + "bg-[#3a3f46] px-2 py-1 text-left font-black text-white",
                                                                                children: "Waarde"
                                                                            }, void 0, false, {
                                                                                fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                                                lineNumber: 1633,
                                                                                columnNumber: 25
                                                                            }, this),
                                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                                                className: "jsx-ff900f9018a9c936" + " " + "rounded-r-md bg-[#3a3f46] px-2 py-1 text-left font-black text-white",
                                                                                children: "Detail"
                                                                            }, void 0, false, {
                                                                                fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                                                lineNumber: 1634,
                                                                                columnNumber: 25
                                                                            }, this)
                                                                        ]
                                                                    }, void 0, true, {
                                                                        fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                                        lineNumber: 1631,
                                                                        columnNumber: 23
                                                                    }, this)
                                                                }, void 0, false, {
                                                                    fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                                    lineNumber: 1630,
                                                                    columnNumber: 21
                                                                }, this),
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("tbody", {
                                                                    className: "jsx-ff900f9018a9c936",
                                                                    children: sportschoolIssues.nietGevonden.length === 0 && sportschoolIssues.geenKeurmerk.length === 0 && sportschoolIssues.geenData.length === 0 && sportschoolIssues.verlopen.length === 0 && sportschoolIssues.datumOntbreekt.length === 0 ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("tr", {
                                                                        className: "jsx-ff900f9018a9c936",
                                                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                                            colSpan: 3,
                                                                            className: "jsx-ff900f9018a9c936" + " " + "rounded-md bg-white px-3 py-3 text-sm text-black/70",
                                                                            children: "Geen."
                                                                        }, void 0, false, {
                                                                            fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                                            lineNumber: 1644,
                                                                            columnNumber: 27
                                                                        }, this)
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                                        lineNumber: 1643,
                                                                        columnNumber: 25
                                                                    }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Fragment"], {
                                                                        children: [
                                                                            sportschoolIssues.nietGevonden.map((gym, idx)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("tr", {
                                                                                    className: "jsx-ff900f9018a9c936",
                                                                                    children: [
                                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                                                            className: "jsx-ff900f9018a9c936" + " " + `rounded-l-md px-2 py-1.5 font-bold ${rowBg(idx)}`,
                                                                                            children: "Niet gevonden"
                                                                                        }, void 0, false, {
                                                                                            fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                                                            lineNumber: 1652,
                                                                                            columnNumber: 31
                                                                                        }, this),
                                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                                                            className: "jsx-ff900f9018a9c936" + " " + `px-2 py-1.5 font-semibold ${rowBg(idx)}`,
                                                                                            children: gym
                                                                                        }, void 0, false, {
                                                                                            fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                                                            lineNumber: 1653,
                                                                                            columnNumber: 31
                                                                                        }, this),
                                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                                                            className: "jsx-ff900f9018a9c936" + " " + `rounded-r-md px-2 py-1.5 ${rowBg(idx)}`,
                                                                                            children: "Sportschool niet gevonden. Onbekend of sportschool keurmerk heeft."
                                                                                        }, void 0, false, {
                                                                                            fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                                                            lineNumber: 1654,
                                                                                            columnNumber: 31
                                                                                        }, this)
                                                                                    ]
                                                                                }, `niet-gevonden-${gym}-${idx}`, true, {
                                                                                    fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                                                    lineNumber: 1651,
                                                                                    columnNumber: 29
                                                                                }, this)),
                                                                            sportschoolIssues.geenKeurmerk.map((gym, idx)=>{
                                                                                const offset = sportschoolIssues.nietGevonden.length + idx;
                                                                                return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("tr", {
                                                                                    className: "jsx-ff900f9018a9c936",
                                                                                    children: [
                                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                                                            className: "jsx-ff900f9018a9c936" + " " + `rounded-l-md px-2 py-1.5 font-bold ${rowBg(offset)}`,
                                                                                            children: "Zonder geldig keurmerk"
                                                                                        }, void 0, false, {
                                                                                            fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                                                            lineNumber: 1664,
                                                                                            columnNumber: 33
                                                                                        }, this),
                                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                                                            className: "jsx-ff900f9018a9c936" + " " + `px-2 py-1.5 font-semibold ${rowBg(offset)}`,
                                                                                            children: gym
                                                                                        }, void 0, false, {
                                                                                            fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                                                            lineNumber: 1665,
                                                                                            columnNumber: 33
                                                                                        }, this),
                                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                                                            className: "jsx-ff900f9018a9c936" + " " + `rounded-r-md px-2 py-1.5 ${rowBg(offset)}`,
                                                                                            children: "Sportschool heeft geen geldig keurmerk"
                                                                                        }, void 0, false, {
                                                                                            fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                                                            lineNumber: 1666,
                                                                                            columnNumber: 33
                                                                                        }, this)
                                                                                    ]
                                                                                }, `geen-keurmerk-${gym}-${idx}`, true, {
                                                                                    fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                                                    lineNumber: 1663,
                                                                                    columnNumber: 31
                                                                                }, this);
                                                                            }),
                                                                            sportschoolIssues.verlopen.map((gym, idx)=>{
                                                                                const offset = sportschoolIssues.nietGevonden.length + sportschoolIssues.geenKeurmerk.length + idx;
                                                                                return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("tr", {
                                                                                    className: "jsx-ff900f9018a9c936",
                                                                                    children: [
                                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                                                            className: "jsx-ff900f9018a9c936" + " " + `rounded-l-md px-2 py-1.5 font-bold ${rowBg(offset)}`,
                                                                                            children: "Keurmerk verlopen"
                                                                                        }, void 0, false, {
                                                                                            fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                                                            lineNumber: 1678,
                                                                                            columnNumber: 33
                                                                                        }, this),
                                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                                                            className: "jsx-ff900f9018a9c936" + " " + `px-2 py-1.5 font-semibold ${rowBg(offset)}`,
                                                                                            children: gym
                                                                                        }, void 0, false, {
                                                                                            fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                                                            lineNumber: 1679,
                                                                                            columnNumber: 33
                                                                                        }, this),
                                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                                                            className: "jsx-ff900f9018a9c936" + " " + `rounded-r-md px-2 py-1.5 ${rowBg(offset)}`,
                                                                                            children: "Keurmerk aanwezig maar verlopen"
                                                                                        }, void 0, false, {
                                                                                            fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                                                            lineNumber: 1680,
                                                                                            columnNumber: 33
                                                                                        }, this)
                                                                                    ]
                                                                                }, `verlopen-${gym}-${idx}`, true, {
                                                                                    fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                                                    lineNumber: 1677,
                                                                                    columnNumber: 31
                                                                                }, this);
                                                                            }),
                                                                            sportschoolIssues.datumOntbreekt.map((gym, idx)=>{
                                                                                const offset = sportschoolIssues.nietGevonden.length + sportschoolIssues.geenKeurmerk.length + sportschoolIssues.verlopen.length + idx;
                                                                                return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("tr", {
                                                                                    className: "jsx-ff900f9018a9c936",
                                                                                    children: [
                                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                                                            className: "jsx-ff900f9018a9c936" + " " + `rounded-l-md px-2 py-1.5 font-bold ${rowBg(offset)}`,
                                                                                            children: "Datum ontbreekt"
                                                                                        }, void 0, false, {
                                                                                            fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                                                            lineNumber: 1693,
                                                                                            columnNumber: 33
                                                                                        }, this),
                                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                                                            className: "jsx-ff900f9018a9c936" + " " + `px-2 py-1.5 font-semibold ${rowBg(offset)}`,
                                                                                            children: gym
                                                                                        }, void 0, false, {
                                                                                            fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                                                            lineNumber: 1694,
                                                                                            columnNumber: 33
                                                                                        }, this),
                                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                                                            className: "jsx-ff900f9018a9c936" + " " + `rounded-r-md px-2 py-1.5 ${rowBg(offset)}`,
                                                                                            children: "Keurmerkdatum ontbreekt"
                                                                                        }, void 0, false, {
                                                                                            fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                                                            lineNumber: 1695,
                                                                                            columnNumber: 33
                                                                                        }, this)
                                                                                    ]
                                                                                }, `datum-ontbreekt-${gym}-${idx}`, true, {
                                                                                    fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                                                    lineNumber: 1692,
                                                                                    columnNumber: 31
                                                                                }, this);
                                                                            }),
                                                                            sportschoolIssues.geenData.map((gym, idx)=>{
                                                                                const offset = sportschoolIssues.nietGevonden.length + sportschoolIssues.geenKeurmerk.length + sportschoolIssues.verlopen.length + sportschoolIssues.datumOntbreekt.length + idx;
                                                                                return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("tr", {
                                                                                    className: "jsx-ff900f9018a9c936",
                                                                                    children: [
                                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                                                            className: "jsx-ff900f9018a9c936" + " " + `rounded-l-md px-2 py-1.5 font-bold ${rowBg(offset)}`,
                                                                                            children: "Niet gevonden / geen data"
                                                                                        }, void 0, false, {
                                                                                            fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                                                            lineNumber: 1709,
                                                                                            columnNumber: 33
                                                                                        }, this),
                                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                                                            className: "jsx-ff900f9018a9c936" + " " + `px-2 py-1.5 font-semibold ${rowBg(offset)}`,
                                                                                            children: gym
                                                                                        }, void 0, false, {
                                                                                            fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                                                            lineNumber: 1710,
                                                                                            columnNumber: 33
                                                                                        }, this),
                                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                                                            className: "jsx-ff900f9018a9c936" + " " + `rounded-r-md px-2 py-1.5 ${rowBg(offset)}`,
                                                                                            children: "Sportschool niet gevonden of onvoldoende data"
                                                                                        }, void 0, false, {
                                                                                            fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                                                            lineNumber: 1711,
                                                                                            columnNumber: 33
                                                                                        }, this)
                                                                                    ]
                                                                                }, `geen-data-${gym}-${idx}`, true, {
                                                                                    fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                                                    lineNumber: 1708,
                                                                                    columnNumber: 31
                                                                                }, this);
                                                                            })
                                                                        ]
                                                                    }, void 0, true)
                                                                }, void 0, false, {
                                                                    fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                                    lineNumber: 1637,
                                                                    columnNumber: 21
                                                                }, this)
                                                            ]
                                                        }, void 0, true, {
                                                            fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                            lineNumber: 1629,
                                                            columnNumber: 19
                                                        }, this)
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                        lineNumber: 1628,
                                                        columnNumber: 17
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        className: "jsx-ff900f9018a9c936",
                                                        children: [
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                className: "jsx-ff900f9018a9c936" + " " + "mb-2 text-sm font-black",
                                                                children: "Open keurmerkmeldingen per vechter"
                                                            }, void 0, false, {
                                                                fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                                lineNumber: 1722,
                                                                columnNumber: 19
                                                            }, this),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                className: "jsx-ff900f9018a9c936" + " " + "overflow-x-auto",
                                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("table", {
                                                                    className: "jsx-ff900f9018a9c936" + " " + "w-full border-separate border-spacing-y-[2px] text-xs",
                                                                    children: [
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("thead", {
                                                                            className: "jsx-ff900f9018a9c936",
                                                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("tr", {
                                                                                className: "jsx-ff900f9018a9c936",
                                                                                children: [
                                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                                                        className: "jsx-ff900f9018a9c936" + " " + "rounded-l-md bg-[#3a3f46] px-2 py-1 text-left font-black text-white",
                                                                                        children: "Partij"
                                                                                    }, void 0, false, {
                                                                                        fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                                                        lineNumber: 1727,
                                                                                        columnNumber: 27
                                                                                    }, this),
                                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                                                        className: "jsx-ff900f9018a9c936" + " " + "bg-[#3a3f46] px-2 py-1 text-left font-black text-white",
                                                                                        children: "Hoek"
                                                                                    }, void 0, false, {
                                                                                        fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                                                        lineNumber: 1728,
                                                                                        columnNumber: 27
                                                                                    }, this),
                                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                                                        className: "jsx-ff900f9018a9c936" + " " + "bg-[#3a3f46] px-2 py-1 text-left font-black text-white",
                                                                                        children: "Naam"
                                                                                    }, void 0, false, {
                                                                                        fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                                                        lineNumber: 1729,
                                                                                        columnNumber: 27
                                                                                    }, this),
                                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                                                        className: "jsx-ff900f9018a9c936" + " " + "bg-[#3a3f46] px-2 py-1 text-left font-black text-white",
                                                                                        children: "Gym"
                                                                                    }, void 0, false, {
                                                                                        fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                                                        lineNumber: 1730,
                                                                                        columnNumber: 27
                                                                                    }, this),
                                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                                                        className: "jsx-ff900f9018a9c936" + " " + "rounded-r-md bg-[#3a3f46] px-2 py-1 text-left font-black text-white",
                                                                                        children: "Detail"
                                                                                    }, void 0, false, {
                                                                                        fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                                                        lineNumber: 1731,
                                                                                        columnNumber: 27
                                                                                    }, this)
                                                                                ]
                                                                            }, void 0, true, {
                                                                                fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                                                lineNumber: 1726,
                                                                                columnNumber: 25
                                                                            }, this)
                                                                        }, void 0, false, {
                                                                            fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                                            lineNumber: 1725,
                                                                            columnNumber: 23
                                                                        }, this),
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("tbody", {
                                                                            className: "jsx-ff900f9018a9c936",
                                                                            children: keurmerkIssues.length ? keurmerkIssues.map((item, idx)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("tr", {
                                                                                    className: "jsx-ff900f9018a9c936",
                                                                                    children: [
                                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                                                            className: "jsx-ff900f9018a9c936" + " " + `rounded-l-md px-2 py-1.5 font-bold ${rowBg(idx)}`,
                                                                                            children: item.partij
                                                                                        }, void 0, false, {
                                                                                            fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                                                            lineNumber: 1738,
                                                                                            columnNumber: 31
                                                                                        }, this),
                                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                                                            className: "jsx-ff900f9018a9c936" + " " + `px-2 py-1.5 capitalize ${rowBg(idx)}`,
                                                                                            children: item.hoek
                                                                                        }, void 0, false, {
                                                                                            fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                                                            lineNumber: 1739,
                                                                                            columnNumber: 31
                                                                                        }, this),
                                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                                                            className: "jsx-ff900f9018a9c936" + " " + `px-2 py-1.5 font-semibold ${rowBg(idx)}`,
                                                                                            children: item.naam
                                                                                        }, void 0, false, {
                                                                                            fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                                                            lineNumber: 1740,
                                                                                            columnNumber: 31
                                                                                        }, this),
                                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                                                            className: "jsx-ff900f9018a9c936" + " " + `px-2 py-1.5 ${rowBg(idx)}`,
                                                                                            children: item.gym
                                                                                        }, void 0, false, {
                                                                                            fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                                                            lineNumber: 1741,
                                                                                            columnNumber: 31
                                                                                        }, this),
                                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                                                            className: "jsx-ff900f9018a9c936" + " " + `rounded-r-md px-2 py-1.5 ${rowBg(idx)}`,
                                                                                            children: item.detail
                                                                                        }, void 0, false, {
                                                                                            fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                                                            lineNumber: 1742,
                                                                                            columnNumber: 31
                                                                                        }, this)
                                                                                    ]
                                                                                }, `${item.partij_nr}-${item.hoek}-keurmerk-${idx}`, true, {
                                                                                    fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                                                    lineNumber: 1737,
                                                                                    columnNumber: 29
                                                                                }, this)) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("tr", {
                                                                                className: "jsx-ff900f9018a9c936",
                                                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                                                    colSpan: 5,
                                                                                    className: "jsx-ff900f9018a9c936" + " " + "rounded-md bg-white px-3 py-3 text-sm text-black/70",
                                                                                    children: "Geen open keurmerkproblemen."
                                                                                }, void 0, false, {
                                                                                    fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                                                    lineNumber: 1747,
                                                                                    columnNumber: 29
                                                                                }, this)
                                                                            }, void 0, false, {
                                                                                fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                                                lineNumber: 1746,
                                                                                columnNumber: 27
                                                                            }, this)
                                                                        }, void 0, false, {
                                                                            fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                                            lineNumber: 1734,
                                                                            columnNumber: 23
                                                                        }, this)
                                                                    ]
                                                                }, void 0, true, {
                                                                    fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                                    lineNumber: 1724,
                                                                    columnNumber: 21
                                                                }, this)
                                                            }, void 0, false, {
                                                                fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                                lineNumber: 1723,
                                                                columnNumber: 19
                                                            }, this)
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                        lineNumber: 1721,
                                                        columnNumber: 17
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                lineNumber: 1627,
                                                columnNumber: 15
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                        lineNumber: 1614,
                                        columnNumber: 13
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                lineNumber: 1429,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "jsx-ff900f9018a9c936" + " " + "mt-4 space-y-4",
                                children: partijMetOpenMeldingen.map((item)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("section", {
                                        className: "jsx-ff900f9018a9c936" + " " + "avoid-break overflow-hidden rounded-[18px] border border-black/10 bg-[linear-gradient(180deg,#f9f9f9_0%,#eeeeee_100%)]",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "jsx-ff900f9018a9c936" + " " + "flex flex-wrap items-center justify-between gap-2 bg-[#ff4d00] px-4 py-2",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        className: "jsx-ff900f9018a9c936" + " " + "text-sm font-black text-black",
                                                        children: [
                                                            "Partij ",
                                                            item.partij_label,
                                                            " • ",
                                                            item.discipline,
                                                            " • ",
                                                            item.klasse,
                                                            " • max ",
                                                            item.max_gewicht,
                                                            " kg"
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                        lineNumber: 1767,
                                                        columnNumber: 19
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(Badge, {
                                                        status: item.status
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                        lineNumber: 1770,
                                                        columnNumber: 19
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                lineNumber: 1766,
                                                columnNumber: 17
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "jsx-ff900f9018a9c936" + " " + "grid gap-3 p-4 md:grid-cols-2",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        className: "jsx-ff900f9018a9c936" + " " + "rounded-xl border border-black/10 bg-white px-3 py-3",
                                                        children: [
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                className: "jsx-ff900f9018a9c936" + " " + "mb-1 text-[11px] font-black uppercase tracking-[0.16em] text-[#ff4d00]",
                                                                children: "Rood"
                                                            }, void 0, false, {
                                                                fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                                lineNumber: 1775,
                                                                columnNumber: 21
                                                            }, this),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                className: "jsx-ff900f9018a9c936" + " " + "font-black",
                                                                children: item.roodNaam
                                                            }, void 0, false, {
                                                                fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                                lineNumber: 1776,
                                                                columnNumber: 21
                                                            }, this),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                className: "jsx-ff900f9018a9c936" + " " + "text-sm text-black/75",
                                                                children: item.roodGym
                                                            }, void 0, false, {
                                                                fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                                lineNumber: 1777,
                                                                columnNumber: 21
                                                            }, this),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                className: "jsx-ff900f9018a9c936" + " " + "mt-1 text-xs font-bold text-black/60",
                                                                children: [
                                                                    "VA: ",
                                                                    item.roodVa
                                                                ]
                                                            }, void 0, true, {
                                                                fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                                lineNumber: 1778,
                                                                columnNumber: 21
                                                            }, this)
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                        lineNumber: 1774,
                                                        columnNumber: 19
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        className: "jsx-ff900f9018a9c936" + " " + "rounded-xl border border-black/10 bg-white px-3 py-3",
                                                        children: [
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                className: "jsx-ff900f9018a9c936" + " " + "mb-1 text-[11px] font-black uppercase tracking-[0.16em] text-[#ff4d00]",
                                                                children: "Blauw"
                                                            }, void 0, false, {
                                                                fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                                lineNumber: 1781,
                                                                columnNumber: 21
                                                            }, this),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                className: "jsx-ff900f9018a9c936" + " " + "font-black",
                                                                children: item.blauwNaam
                                                            }, void 0, false, {
                                                                fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                                lineNumber: 1782,
                                                                columnNumber: 21
                                                            }, this),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                className: "jsx-ff900f9018a9c936" + " " + "text-sm text-black/75",
                                                                children: item.blauwGym
                                                            }, void 0, false, {
                                                                fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                                lineNumber: 1783,
                                                                columnNumber: 21
                                                            }, this),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                className: "jsx-ff900f9018a9c936" + " " + "mt-1 text-xs font-bold text-black/60",
                                                                children: [
                                                                    "VA: ",
                                                                    item.blauwVa
                                                                ]
                                                            }, void 0, true, {
                                                                fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                                lineNumber: 1784,
                                                                columnNumber: 21
                                                            }, this)
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                        lineNumber: 1780,
                                                        columnNumber: 19
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                lineNumber: 1773,
                                                columnNumber: 17
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "jsx-ff900f9018a9c936" + " " + "px-4 pb-4",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        className: "jsx-ff900f9018a9c936" + " " + "mb-2 text-sm font-black",
                                                        children: "Open meldingen"
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                        lineNumber: 1789,
                                                        columnNumber: 19
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        className: "jsx-ff900f9018a9c936" + " " + "overflow-x-auto",
                                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("table", {
                                                            className: "jsx-ff900f9018a9c936" + " " + "w-full border-separate border-spacing-y-[2px] text-sm",
                                                            children: [
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("thead", {
                                                                    className: "jsx-ff900f9018a9c936",
                                                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("tr", {
                                                                        className: "jsx-ff900f9018a9c936",
                                                                        children: [
                                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                                                className: "jsx-ff900f9018a9c936" + " " + "w-[110px] rounded-l-md bg-[#3a3f46] px-2 py-1 text-left font-black text-white",
                                                                                children: "Resultaat"
                                                                            }, void 0, false, {
                                                                                fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                                                lineNumber: 1794,
                                                                                columnNumber: 27
                                                                            }, this),
                                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                                                className: "jsx-ff900f9018a9c936" + " " + "w-[280px] bg-[#3a3f46] px-2 py-1 text-left font-black text-white",
                                                                                children: "Regel"
                                                                            }, void 0, false, {
                                                                                fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                                                lineNumber: 1797,
                                                                                columnNumber: 27
                                                                            }, this),
                                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                                                className: "jsx-ff900f9018a9c936" + " " + "rounded-r-md bg-[#3a3f46] px-2 py-1 text-left font-black text-white",
                                                                                children: "Melding"
                                                                            }, void 0, false, {
                                                                                fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                                                lineNumber: 1800,
                                                                                columnNumber: 27
                                                                            }, this)
                                                                        ]
                                                                    }, void 0, true, {
                                                                        fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                                        lineNumber: 1793,
                                                                        columnNumber: 25
                                                                    }, this)
                                                                }, void 0, false, {
                                                                    fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                                    lineNumber: 1792,
                                                                    columnNumber: 23
                                                                }, this),
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("tbody", {
                                                                    className: "jsx-ff900f9018a9c936",
                                                                    children: item.meldingen.map((m, idx)=>{
                                                                        const st = statusFromResultaat(m.resultaat, m.rule_code);
                                                                        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("tr", {
                                                                            className: "jsx-ff900f9018a9c936",
                                                                            children: [
                                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                                                    className: "jsx-ff900f9018a9c936" + " " + `rounded-l-md px-2 py-2 ${rowBg(idx)}`,
                                                                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(Badge, {
                                                                                        status: st
                                                                                    }, void 0, false, {
                                                                                        fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                                                        lineNumber: 1811,
                                                                                        columnNumber: 33
                                                                                    }, this)
                                                                                }, void 0, false, {
                                                                                    fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                                                    lineNumber: 1810,
                                                                                    columnNumber: 31
                                                                                }, this),
                                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                                                    className: "jsx-ff900f9018a9c936" + " " + `px-2 py-2 font-mono text-[12px] ${rowBg(idx)}`,
                                                                                    children: safe(m.rule_code ?? m.rule)
                                                                                }, void 0, false, {
                                                                                    fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                                                    lineNumber: 1813,
                                                                                    columnNumber: 31
                                                                                }, this),
                                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                                                    className: "jsx-ff900f9018a9c936" + " " + `rounded-r-md px-2 py-2 ${rowBg(idx)}`,
                                                                                    children: [
                                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                                            className: "jsx-ff900f9018a9c936",
                                                                                            children: safe(m.boodschap ?? m.rule)
                                                                                        }, void 0, false, {
                                                                                            fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                                                            lineNumber: 1817,
                                                                                            columnNumber: 33
                                                                                        }, this),
                                                                                        m.aantekeningen ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                                            className: "jsx-ff900f9018a9c936" + " " + "mt-1 text-xs opacity-80",
                                                                                            children: [
                                                                                                "Notitie: ",
                                                                                                m.aantekeningen
                                                                                            ]
                                                                                        }, void 0, true, {
                                                                                            fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                                                            lineNumber: 1819,
                                                                                            columnNumber: 35
                                                                                        }, this) : null
                                                                                    ]
                                                                                }, void 0, true, {
                                                                                    fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                                                    lineNumber: 1816,
                                                                                    columnNumber: 31
                                                                                }, this)
                                                                            ]
                                                                        }, `${item.partij_nr}-${idx}-${m.rule_code || m.rule || "melding"}`, true, {
                                                                            fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                                            lineNumber: 1809,
                                                                            columnNumber: 29
                                                                        }, this);
                                                                    })
                                                                }, void 0, false, {
                                                                    fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                                    lineNumber: 1805,
                                                                    columnNumber: 23
                                                                }, this)
                                                            ]
                                                        }, void 0, true, {
                                                            fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                            lineNumber: 1791,
                                                            columnNumber: 21
                                                        }, this)
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                        lineNumber: 1790,
                                                        columnNumber: 19
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                lineNumber: 1788,
                                                columnNumber: 17
                                            }, this)
                                        ]
                                    }, item.partij_nr, true, {
                                        fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                        lineNumber: 1762,
                                        columnNumber: 15
                                    }, this))
                            }, void 0, false, {
                                fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                lineNumber: 1760,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "jsx-ff900f9018a9c936" + " " + "page-break mt-4 overflow-hidden rounded-[18px] border border-black/10",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(SectionTitle, {
                                        right: `${partijenCompact.length} partijen`,
                                        children: "TOTAAL OVERZICHT PARTIJEN"
                                    }, void 0, false, {
                                        fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                        lineNumber: 1834,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "jsx-ff900f9018a9c936" + " " + "overflow-x-auto px-3 pb-3",
                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("table", {
                                            className: "jsx-ff900f9018a9c936" + " " + "w-full table-fixed border-separate border-spacing-y-[2px] text-[10px] leading-[1.15] md:text-[11px]",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("thead", {
                                                    className: "jsx-ff900f9018a9c936",
                                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("tr", {
                                                        className: "jsx-ff900f9018a9c936",
                                                        children: [
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                                className: "jsx-ff900f9018a9c936" + " " + "w-[42px] rounded-l-md bg-[#3a3f46] px-2 py-1 text-left font-black text-white",
                                                                children: "Nr"
                                                            }, void 0, false, {
                                                                fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                                lineNumber: 1839,
                                                                columnNumber: 21
                                                            }, this),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                                className: "jsx-ff900f9018a9c936" + " " + "w-[95px] bg-[#3a3f46] px-2 py-1 text-left font-black text-white",
                                                                children: "Disc."
                                                            }, void 0, false, {
                                                                fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                                lineNumber: 1840,
                                                                columnNumber: 21
                                                            }, this),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                                className: "jsx-ff900f9018a9c936" + " " + "w-[90px] bg-[#3a3f46] px-2 py-1 text-left font-black text-white",
                                                                children: "Klasse"
                                                            }, void 0, false, {
                                                                fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                                lineNumber: 1841,
                                                                columnNumber: 21
                                                            }, this),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                                className: "jsx-ff900f9018a9c936" + " " + "bg-[#3a3f46] px-2 py-1 text-left font-black text-white",
                                                                children: "Rood"
                                                            }, void 0, false, {
                                                                fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                                lineNumber: 1842,
                                                                columnNumber: 21
                                                            }, this),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                                className: "jsx-ff900f9018a9c936" + " " + "bg-[#3a3f46] px-2 py-1 text-left font-black text-white",
                                                                children: "Gym"
                                                            }, void 0, false, {
                                                                fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                                lineNumber: 1843,
                                                                columnNumber: 21
                                                            }, this),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                                className: "jsx-ff900f9018a9c936" + " " + "bg-[#3a3f46] px-2 py-1 text-left font-black text-white",
                                                                children: "Blauw"
                                                            }, void 0, false, {
                                                                fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                                lineNumber: 1844,
                                                                columnNumber: 21
                                                            }, this),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                                className: "jsx-ff900f9018a9c936" + " " + "bg-[#3a3f46] px-2 py-1 text-left font-black text-white",
                                                                children: "Gym"
                                                            }, void 0, false, {
                                                                fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                                lineNumber: 1845,
                                                                columnNumber: 21
                                                            }, this),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                                className: "jsx-ff900f9018a9c936" + " " + "w-[70px] bg-[#3a3f46] px-2 py-1 text-left font-black text-white",
                                                                children: "Max KG"
                                                            }, void 0, false, {
                                                                fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                                lineNumber: 1846,
                                                                columnNumber: 21
                                                            }, this),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                                className: "jsx-ff900f9018a9c936" + " " + "w-[92px] rounded-r-md bg-[#3a3f46] px-2 py-1 text-left font-black text-white",
                                                                children: "Status"
                                                            }, void 0, false, {
                                                                fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                                lineNumber: 1847,
                                                                columnNumber: 21
                                                            }, this)
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                        lineNumber: 1838,
                                                        columnNumber: 19
                                                    }, this)
                                                }, void 0, false, {
                                                    fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                    lineNumber: 1837,
                                                    columnNumber: 17
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("tbody", {
                                                    className: "jsx-ff900f9018a9c936",
                                                    children: partijenCompact.map((p, idx)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("tr", {
                                                            className: "jsx-ff900f9018a9c936",
                                                            children: [
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                                    className: "jsx-ff900f9018a9c936" + " " + `rounded-l-md px-2 py-[5px] font-black ${rowBg(idx)}`,
                                                                    children: p.partij_label
                                                                }, void 0, false, {
                                                                    fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                                    lineNumber: 1853,
                                                                    columnNumber: 23
                                                                }, this),
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                                    className: "jsx-ff900f9018a9c936" + " " + `px-2 py-[5px] ${rowBg(idx)}`,
                                                                    children: p.discipline
                                                                }, void 0, false, {
                                                                    fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                                    lineNumber: 1854,
                                                                    columnNumber: 23
                                                                }, this),
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                                    className: "jsx-ff900f9018a9c936" + " " + `px-2 py-[5px] ${rowBg(idx)}`,
                                                                    children: p.klasse
                                                                }, void 0, false, {
                                                                    fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                                    lineNumber: 1855,
                                                                    columnNumber: 23
                                                                }, this),
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                                    title: p.rood,
                                                                    className: "jsx-ff900f9018a9c936" + " " + `truncate px-2 py-[5px] font-semibold ${rowBg(idx)}`,
                                                                    children: p.rood
                                                                }, void 0, false, {
                                                                    fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                                    lineNumber: 1856,
                                                                    columnNumber: 23
                                                                }, this),
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                                    title: p.rood_gym,
                                                                    className: "jsx-ff900f9018a9c936" + " " + `truncate px-2 py-[5px] ${rowBg(idx)}`,
                                                                    children: p.rood_gym
                                                                }, void 0, false, {
                                                                    fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                                    lineNumber: 1859,
                                                                    columnNumber: 23
                                                                }, this),
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                                    title: p.blauw,
                                                                    className: "jsx-ff900f9018a9c936" + " " + `truncate px-2 py-[5px] font-semibold ${rowBg(idx)}`,
                                                                    children: p.blauw
                                                                }, void 0, false, {
                                                                    fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                                    lineNumber: 1862,
                                                                    columnNumber: 23
                                                                }, this),
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                                    title: p.blauw_gym,
                                                                    className: "jsx-ff900f9018a9c936" + " " + `truncate px-2 py-[5px] ${rowBg(idx)}`,
                                                                    children: p.blauw_gym
                                                                }, void 0, false, {
                                                                    fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                                    lineNumber: 1865,
                                                                    columnNumber: 23
                                                                }, this),
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                                    className: "jsx-ff900f9018a9c936" + " " + `${rowBg(idx)} px-2 py-[5px]`,
                                                                    children: p.max_gewicht
                                                                }, void 0, false, {
                                                                    fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                                    lineNumber: 1868,
                                                                    columnNumber: 23
                                                                }, this),
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                                    className: "jsx-ff900f9018a9c936" + " " + `rounded-r-md px-2 py-[5px] ${rowBg(idx)}`,
                                                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(Badge, {
                                                                        status: p.status
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                                        lineNumber: 1870,
                                                                        columnNumber: 25
                                                                    }, this)
                                                                }, void 0, false, {
                                                                    fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                                    lineNumber: 1869,
                                                                    columnNumber: 23
                                                                }, this)
                                                            ]
                                                        }, p.partij_nr || idx, true, {
                                                            fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                            lineNumber: 1852,
                                                            columnNumber: 21
                                                        }, this))
                                                }, void 0, false, {
                                                    fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                    lineNumber: 1850,
                                                    columnNumber: 17
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                            lineNumber: 1836,
                                            columnNumber: 15
                                        }, this)
                                    }, void 0, false, {
                                        fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                        lineNumber: 1835,
                                        columnNumber: 13
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                lineNumber: 1833,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                        lineNumber: 1428,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                lineNumber: 1379,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
        lineNumber: 1334,
        columnNumber: 5
    }, this);
}
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__b4758b25._.js.map