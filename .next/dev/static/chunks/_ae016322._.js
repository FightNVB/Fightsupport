(globalThis.TURBOPACK || (globalThis.TURBOPACK = [])).push([typeof document === "object" ? document.currentScript : undefined,
"[project]/components/NvbTable.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>NvbTable
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
;
function NvbTable({ columns, children, headerVariant = "silver", showAccentLine = true }) {
    const theadClass = headerVariant === "orange" ? "bg-[#ff4d00] text-white" : "text-white";
    const theadStyle = headerVariant === "orange" ? undefined : {
        background: "linear-gradient(180deg, rgba(245,245,245,0.26) 0%, rgba(160,160,160,0.10) 55%, rgba(0,0,0,0.15) 100%)"
    };
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "overflow-x-auto w-full",
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "rounded-2xl border border-white/10 bg-black/35 overflow-hidden",
            children: [
                showAccentLine ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "h-[2px] bg-[#ff4d00]"
                }, void 0, false, {
                    fileName: "[project]/components/NvbTable.tsx",
                    lineNumber: 35,
                    columnNumber: 27
                }, this) : null,
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("table", {
                    className: "min-w-full border-collapse",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("thead", {
                            style: theadStyle,
                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("tr", {
                                className: theadClass,
                                children: columns.map((c, i)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                        className: "py-3 px-4 text-left text-sm md:text-base font-semibold text-white/95",
                                        children: c
                                    }, i, false, {
                                        fileName: "[project]/components/NvbTable.tsx",
                                        lineNumber: 41,
                                        columnNumber: 17
                                    }, this))
                            }, void 0, false, {
                                fileName: "[project]/components/NvbTable.tsx",
                                lineNumber: 39,
                                columnNumber: 13
                            }, this)
                        }, void 0, false, {
                            fileName: "[project]/components/NvbTable.tsx",
                            lineNumber: 38,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("tbody", {
                            className: "   [&>tr:nth-child(odd)]:bg-black   [&>tr:nth-child(odd)]:text-white   [&>tr:nth-child(even)]:bg-white   [&>tr:nth-child(even)]:text-black   ",
                            children: children
                        }, void 0, false, {
                            fileName: "[project]/components/NvbTable.tsx",
                            lineNumber: 51,
                            columnNumber: 11
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/components/NvbTable.tsx",
                    lineNumber: 37,
                    columnNumber: 9
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/components/NvbTable.tsx",
            lineNumber: 33,
            columnNumber: 7
        }, this)
    }, void 0, false, {
        fileName: "[project]/components/NvbTable.tsx",
        lineNumber: 32,
        columnNumber: 5
    }, this);
}
_c = NvbTable;
var _c;
__turbopack_context__.k.register(_c, "NvbTable");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>RapportPage
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$styled$2d$jsx$2f$style$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/styled-jsx/style.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/navigation.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/client/app-dir/link.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabaseClient$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/supabaseClient.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$NvbTable$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/NvbTable.tsx [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature(), _s1 = __turbopack_context__.k.signature();
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
function isApprovedOrClosed(review_status) {
    if (review_status == null) return false;
    const raw = String(review_status).trim().toLowerCase();
    if (!raw) return false;
    // ✅ tolerant: "GOEDGEKEURD ✅", "approved (by ...)", "closed/afgehandeld", etc.
    // We split into tokens so we don't accidentally match "niet goed" as approved.
    const tokens = raw.replace(/[^a-z0-9]+/g, " ").trim().split(/\s+/g).filter(Boolean);
    const tset = new Set(tokens);
    const hasAny = (...t)=>t.some((x)=>tset.has(x));
    if (hasAny("approved", "approve", "accepted", "ok", "akkoord", "done", "closed", "resolved", "complete", "completed")) {
        return true;
    }
    // NL varianten
    if (hasAny("goedgekeurd", "afgehandeld")) return true;
    // "goed" is alleen een approval als het een los token is (en niet in "niet goed")
    if (tset.has("goed") && !tset.has("niet")) return true;
    // last resort (suffix/prefix) – voor rare waarden zoals "status_goedgekeurd"
    if (raw.includes("goedgekeurd") || raw.includes("afgehandeld")) return true;
    return false;
}
/**
 * ✅ Naam mismatch / naam anders NOOIT tonen in rapport
 * (maar "Fightpaspoort nummer gewijzigd" wél, dat is aparte melding)
 */ function isNameMismatch(row) {
    const c = normCode(row.rule_code);
    return c.startsWith("VECHTER_NAAM_MISMATCH") || c.startsWith("VECHTER_NAAM_ANDERS");
}
/**
 * ✅ "Fightpaspoort nummer gewijzigd" melding tonen
 * - liefst via rule_code VA_NUMMER_AANGEPAST_*
 * - maar ook tolerant: als rule/boodschap die tekst bevat
 */ function isFightpaspoortGewijzigd(row) {
    const c = normCode(row.rule_code);
    if (c.startsWith("VA_NUMMER_AANGEPAST")) return true;
    const r = String(row.rule ?? "").toLowerCase();
    const b = String(row.boodschap ?? "").toLowerCase();
    if (r.includes("fightpaspoort nummer gewijzigd")) return true;
    if (b.includes("fightpaspoort nummer gewijzigd")) return true;
    return false;
}
function statusFromResultaat(resultaat) {
    const s = String(resultaat ?? "").trim().toLowerCase();
    if (s === "afkeur" || s === "afgekeurd" || s === "reject" || s === "rejected") return "AFKEUR";
    if (s === "dispensatie") return "DISPENSATIE";
    if (s === "actie") return "ACTIE";
    return "OK";
}
function statusPrio(s) {
    return s === "AFKEUR" ? 1 : s === "DISPENSATIE" ? 2 : s === "ACTIE" ? 3 : 9;
}
function partyStatusVoorMeldingen(meldingen) {
    if (!meldingen?.length) return "OK";
    let best = "OK";
    let bestP = 999;
    for (const m of meldingen){
        const st = statusFromResultaat(m.resultaat);
        const p = statusPrio(st);
        if (p < bestP) {
            bestP = p;
            best = st;
        }
    }
    return best;
}
function StatusBadge({ status }) {
    const base = "inline-flex items-center rounded px-2 py-0.5 text-xs font-bold";
    if (status === "AFKEUR") return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
        className: `${base} bg-red-600 text-zinc-900`,
        children: "AFKEUR"
    }, void 0, false, {
        fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
        lineNumber: 164,
        columnNumber: 35
    }, this);
    if (status === "DISPENSATIE") return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
        className: `${base} bg-yellow-500 text-black`,
        children: "DISPENSATIE"
    }, void 0, false, {
        fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
        lineNumber: 165,
        columnNumber: 40
    }, this);
    if (status === "ACTIE") return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
        className: `${base} bg-orange-500 text-black`,
        children: "ACTIE"
    }, void 0, false, {
        fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
        lineNumber: 166,
        columnNumber: 34
    }, this);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
        className: `${base} bg-green-600 text-zinc-900`,
        children: "OK"
    }, void 0, false, {
        fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
        lineNumber: 167,
        columnNumber: 10
    }, this);
}
_c = StatusBadge;
function licentieIsProbleem(v) {
    const s = String(v ?? "").trim().toLowerCase();
    return s !== "ja"; // nee / null / anders -> probleem
}
function licentieLabel(v) {
    const s = String(v ?? "").trim().toLowerCase();
    if (!s) return "onbekend";
    return s;
}
function keurmerkIsProbleem(v) {
    return v === false || v == null; // ongeldig of onbekend
}
// ✅ VA "mist" check (tolerant): leeg/geen digits => mist
function vaIsMissing(v) {
    if (v == null) return true;
    const s = String(v).trim();
    if (!s) return true;
    const digits = s.replace(/[^0-9]/g, "");
    // jouw VA is typisch 3-5 cijfers (zoals in andere code)
    return !/^\d{3,5}$/.test(digits);
}
/**
 * ============================================================
 * ✅ DISPENSATIE-INDICATIE (voor badge + jotform link)
 * - Niet alleen resultaat === "DISPENSATIE"
 * - Ook fallback op rule_code/rule als dat dispensatie aanduidt
 * ============================================================
 */ function isDispensatieMelding(m) {
    const res = String(m.resultaat ?? "").trim().toLowerCase();
    if (res === "dispensatie") return true;
    const c = normCode(m.rule_code ?? m.rule);
    if (c.includes("DISPENSATIE")) return true;
    if (c.includes("KLASSE") && c.includes("VERSCHIL")) return true; // bv KLASSE_VERSCHIL_*
    return false;
}
function hasDispensatie(meldingen) {
    return (meldingen ?? []).some(isDispensatieMelding);
}
/**
 * ✅ Max 2 badges:
 * - Hoofdbadge = zwaarste status (AFKEUR > DISPENSATIE > ACTIE > OK)
 * - Extra badge = DISPENSATIE als die óók voorkomt en hoofdbadge ≠ DISPENSATIE
 */ function StatusBadges({ status, meldingen }) {
    const extraDisp = hasDispensatie(meldingen) && status !== "DISPENSATIE";
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "flex items-center gap-2",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(StatusBadge, {
                status: status
            }, void 0, false, {
                fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                lineNumber: 223,
                columnNumber: 7
            }, this),
            extraDisp ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(StatusBadge, {
                status: "DISPENSATIE"
            }, void 0, false, {
                fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                lineNumber: 224,
                columnNumber: 20
            }, this) : null
        ]
    }, void 0, true, {
        fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
        lineNumber: 222,
        columnNumber: 5
    }, this);
}
_c1 = StatusBadges;
/**
 * DISPENSATIE LINKS
 * - volwassen klasse verschil: https://form.jotform.com/252374601478056
 * - jeugd dispensatie:         https://form.jotform.com/252374582262055
 *
 * ✅ Let op: we tonen link zodra hasDispensatie(meldingen) true is,
 * ook als hoofdbadge AFKEUR is.
 */ const DISP_VOLWASSENEN = "https://form.jotform.com/252374601478056";
const DISP_JEUGD = "https://form.jotform.com/252374582262055";
function isJeugdDispensatie(meldingen) {
    for (const m of meldingen ?? []){
        if (!isDispensatieMelding(m)) continue;
        const c = normCode(m.rule_code ?? m.rule);
        if (c.includes("JEUGD") || c.includes("YOUTH") || c.includes("CAT13") || c.includes("CAT15") || c.includes("CAT17")) {
            return true;
        }
    }
    return false;
}
function DispensatieLinks({ meldingen }) {
    if (!hasDispensatie(meldingen)) return null;
    const jeugd = isJeugdDispensatie(meldingen);
    const url = jeugd ? DISP_JEUGD : DISP_VOLWASSENEN;
    const label = jeugd ? "Dispensatie jeugd (formulier)" : "Klasse verschil volwassenen (formulier)";
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("a", {
        href: url,
        target: "_blank",
        rel: "noreferrer",
        className: "inline-flex items-center gap-2 rounded-md bg-[#111] px-3 py-1.5 text-xs font-extrabold text-[#f2f2f2] ring-1 ring-white/20 shadow-sm hover:bg-[#151515] hover:text-white",
        title: "Open Jotform in nieuwe tab",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                className: "inline-block h-1.5 w-1.5 rounded-full bg-[#ff4d00] shadow-[0_0_0_2px_rgba(255,77,0,0.22)]"
            }, void 0, false, {
                fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                lineNumber: 266,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                className: "underline decoration-white/30 underline-offset-2",
                children: label
            }, void 0, false, {
                fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                lineNumber: 267,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
        lineNumber: 259,
        columnNumber: 5
    }, this);
}
_c2 = DispensatieLinks;
function FsLogo({ className }) {
    _s();
    // Probe a few common locations so the report doesn't break if your asset path differs.
    // Put your REAL path first if you know it.
    const candidates = [
        "/branding/fightsupport/logo-dark.png",
        "/branding/fightsupport/logo.png",
        "/branding/fightsupport/logo-light.png",
        "/fightsupport-logo-dark.png",
        "/fightsupport-logo.png",
        "/logo.png"
    ];
    const [src, setSrc] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(candidates[0]);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "FsLogo.useEffect": ()=>{
            let alive = true;
            ({
                "FsLogo.useEffect": async ()=>{
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
                        // ignore and continue
                        }
                    }
                    // fallback: keep first candidate even if HEAD blocked in prod
                    if (alive) setSrc(candidates[0]);
                }
            })["FsLogo.useEffect"]();
            return ({
                "FsLogo.useEffect": ()=>{
                    alive = false;
                }
            })["FsLogo.useEffect"];
        }
    }["FsLogo.useEffect"], []);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("img", {
        src: src,
        alt: "Fightsupport",
        className: className ?? "",
        onError: ()=>setSrc(candidates[candidates.length - 1])
    }, void 0, false, {
        fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
        lineNumber: 312,
        columnNumber: 5
    }, this);
}
_s(FsLogo, "nUrxeqyXd4hIxlzqsJL4zzXM2iM=");
_c3 = FsLogo;
/**
 * ✅ Eventmeta (FightSupport):
 * 1) matchmaking_uploads.event_id -> events.id (naam, datum)
 * 2) fallback: events.matchmaking_id == matchmaking_id
 * 3) fallback: events.upload_id == matchmaking_id
 * 4) fallback: matchmaking_uploads.(evenement_naam/evenement_datum)
 */ async function getEventMeta(matchmaking_id) {
    try {
        const { data: up, error: upErr } = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabaseClient$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["supabase"].from("matchmaking_uploads")// ⚠️ select alleen kolommen die zeker bestaan
        .select("event_id, evenement_naam, evenement_datum, matchmaking_id").or(`id.eq.${matchmaking_id},matchmaking_id.eq.${matchmaking_id}`).order("uploaded_at", {
            ascending: false
        }).limit(1).maybeSingle();
        if (upErr) throw upErr;
        const uploadEventId = up?.event_id ? String(up.event_id) : null;
        // 1) Prefer: echte link via event_id
        if (uploadEventId) {
            const { data: ev, error: evErr } = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabaseClient$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["supabase"].from("events").select("id, naam, datum").eq("id", uploadEventId).maybeSingle();
            if (!evErr && ev) {
                return {
                    id: String(ev?.id ?? uploadEventId),
                    event_id: uploadEventId,
                    naam: ev?.naam ?? null,
                    datum: ev?.datum ?? null,
                    source: "events"
                };
            }
        }
        // 2) Fallback: events.matchmaking_id == matchmaking_id
        const { data: evByMm, error: evByMmErr } = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabaseClient$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["supabase"].from("events").select("id, naam, datum").eq("matchmaking_id", matchmaking_id).order("created_at", {
            ascending: false
        }).limit(1).maybeSingle();
        if (!evByMmErr && evByMm) {
            return {
                id: String(evByMm?.id ?? null),
                event_id: String(evByMm?.id ?? null),
                naam: evByMm?.naam ?? null,
                datum: evByMm?.datum ?? null,
                source: "events"
            };
        }
        // 3) Fallback: events.upload_id == matchmaking_id
        const { data: evByUpload, error: evByUploadErr } = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabaseClient$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["supabase"].from("events").select("id, naam, datum").eq("upload_id", matchmaking_id).order("created_at", {
            ascending: false
        }).limit(1).maybeSingle();
        if (!evByUploadErr && evByUpload) {
            return {
                id: String(evByUpload?.id ?? null),
                event_id: String(evByUpload?.id ?? null),
                naam: evByUpload?.naam ?? null,
                datum: evByUpload?.datum ?? null,
                source: "events"
            };
        }
        // 4) Laatste fallback: upload zelf
        return {
            id: String(up?.matchmaking_id ?? matchmaking_id),
            event_id: uploadEventId,
            naam: up?.evenement_naam ?? null,
            datum: up?.evenement_datum ?? null,
            source: "matchmaking_uploads"
        };
    } catch  {
        return {
            id: null,
            naam: null,
            datum: null,
            source: null
        };
    }
}
function RapportPage() {
    _s1();
    const params = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useParams"])();
    const matchmakingId = String(params?.matchmakingId ?? "");
    const [loading, setLoading] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(true);
    const [error, setError] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [run, setRun] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [eventMeta, setEventMeta] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [ctxRows, setCtxRows] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])([]);
    const [resultaten, setResultaten] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])([]);
    const [auditEvents, setAuditEvents] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])([]);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "RapportPage.useEffect": ()=>{
            if (!matchmakingId) return;
            ({
                "RapportPage.useEffect": async ()=>{
                    setLoading(true);
                    setError(null);
                    try {
                        const { data: runRows, error: runErr } = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabaseClient$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["supabase"].from("controle_runs").select("id, matchmaking_id, status, gestart_op, afgerond_op, run_type").eq("matchmaking_id", matchmakingId).order("gestart_op", {
                            ascending: false
                        }).limit(1);
                        if (runErr) throw runErr;
                        const lastRun = (runRows ?? [])[0] ?? null;
                        setRun(lastRun);
                        // ✅ event meta: zelfde aanpak als Excel (naam/datum consistent)
                        const em = await getEventMeta(matchmakingId);
                        setEventMeta(em);
                        if (!lastRun?.id) {
                            setCtxRows([]);
                            setResultaten([]);
                            setAuditEvents([]);
                            setLoading(false);
                            return;
                        }
                        const { data: ctx, error: ctxErr } = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabaseClient$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["supabase"].from("controle_bout_context").select("*").eq("matchmaking_id", matchmakingId).eq("controle_run_id", lastRun.id).order("partij_nr", {
                            ascending: true
                        });
                        if (ctxErr) throw ctxErr;
                        setCtxRows(ctx ?? []);
                        const { data: res, error: resErr } = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabaseClient$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["supabase"].from("controle_resultaten").select("partij_nr, rule, rule_code, resultaat, boodschap, aantekeningen, created_at, review_status, hoek").eq("controle_run_id", lastRun.id);
                        if (resErr) throw resErr;
                        setResultaten(res ?? []);
                        // ✅ Audit events (blijven bestaan na herscrape)
                        const { data: aud, error: audErr } = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabaseClient$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["supabase"].from("controle_audit_events").select("partij_nr, hoek, event_type, old_va, new_va, actor_email, created_at, reason").eq("controle_run_id", lastRun.id).eq("matchmaking_id", matchmakingId).order("created_at", {
                            ascending: false
                        });
                        if (audErr) {
                            // audit is nice-to-have: niet crashen
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
                }
            })["RapportPage.useEffect"]();
        }
    }["RapportPage.useEffect"], [
        matchmakingId
    ]);
    // OPEN meldingen: alles wat NIET approved/closed is
    // + naam mismatch/anders weglaten (maar fightpaspoort gewijzigd wél meenemen)
    const openMeldingen = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useMemo"])({
        "RapportPage.useMemo[openMeldingen]": ()=>{
            return (resultaten ?? []).filter({
                "RapportPage.useMemo[openMeldingen]": (r)=>{
                    if (isApprovedOrClosed(r.review_status)) return false;
                    if (isNameMismatch(r) && !isFightpaspoortGewijzigd(r)) return false;
                    return true;
                }
            }["RapportPage.useMemo[openMeldingen]"]);
        }
    }["RapportPage.useMemo[openMeldingen]"], [
        resultaten
    ]);
    const meldByPartij = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useMemo"])({
        "RapportPage.useMemo[meldByPartij]": ()=>{
            const m = new Map();
            for (const r of openMeldingen){
                const pn = Number(r.partij_nr);
                if (!Number.isFinite(pn)) continue;
                const arr = m.get(pn) ?? [];
                arr.push(r);
                m.set(pn, arr);
            }
            for (const [pn, arr] of m.entries()){
                arr.sort({
                    "RapportPage.useMemo[meldByPartij]": (a, b)=>statusPrio(statusFromResultaat(a.resultaat)) - statusPrio(statusFromResultaat(b.resultaat))
                }["RapportPage.useMemo[meldByPartij]"]);
                m.set(pn, arr);
            }
            return m;
        }
    }["RapportPage.useMemo[meldByPartij]"], [
        openMeldingen
    ]);
    const partijenOverzicht = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useMemo"])({
        "RapportPage.useMemo[partijenOverzicht]": ()=>{
            return (ctxRows ?? []).map({
                "RapportPage.useMemo[partijenOverzicht]": (p)=>{
                    const pn = Number(p.partij_nr);
                    const meldingen = Number.isFinite(pn) ? meldByPartij.get(pn) ?? [] : [];
                    const status = partyStatusVoorMeldingen(meldingen);
                    return {
                        partij_label: p.partij_label ?? p.partij_nr,
                        partij_nr: p.partij_nr,
                        rood: safe(p.rood_naam_fp ?? p.rood_naam_mm),
                        blauw: safe(p.blauw_naam_fp ?? p.blauw_naam_mm),
                        discipline: safe(p.discipline),
                        klasse: safe(p.klasse_mm ?? p.klasse),
                        status,
                        hasOpenMeldingen: meldingen.length > 0,
                        meldingen
                    };
                }
            }["RapportPage.useMemo[partijenOverzicht]"]);
        }
    }["RapportPage.useMemo[partijenOverzicht]"], [
        ctxRows,
        meldByPartij
    ]);
    const partijMetMeldingen = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useMemo"])({
        "RapportPage.useMemo[partijMetMeldingen]": ()=>{
            return (ctxRows ?? []).map({
                "RapportPage.useMemo[partijMetMeldingen]": (p)=>{
                    const pn = Number(p.partij_nr);
                    const meldingen = Number.isFinite(pn) ? meldByPartij.get(pn) ?? [] : [];
                    if (!meldingen.length) return null;
                    return {
                        partij_label: p.partij_label ?? p.partij_nr,
                        partij_nr: p.partij_nr,
                        status: partyStatusVoorMeldingen(meldingen),
                        roodNaam: safe(p.rood_naam_fp ?? p.rood_naam_mm),
                        blauwNaam: safe(p.blauw_naam_fp ?? p.blauw_naam_mm),
                        roodGym: safe(p.rood_gym_fp ?? p.rood_gym_mm ?? p.rood_gym),
                        blauwGym: safe(p.blauw_gym_fp ?? p.blauw_gym_mm ?? p.blauw_gym),
                        roodVa: safe(p.rood_va_mm ?? p.va_rood ?? p.rood_va),
                        blauwVa: safe(p.blauw_va_mm ?? p.va_blauw ?? p.blauw_va),
                        meldingen
                    };
                }
            }["RapportPage.useMemo[partijMetMeldingen]"]).filter(Boolean);
        }
    }["RapportPage.useMemo[partijMetMeldingen]"], [
        ctxRows,
        meldByPartij
    ]);
    // ✅ map partij_nr -> ctx row (voor lookup)
    const ctxByPartijNr = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useMemo"])({
        "RapportPage.useMemo[ctxByPartijNr]": ()=>{
            const m = new Map();
            for (const p of ctxRows ?? []){
                const pn = Number(p.partij_nr);
                if (!Number.isFinite(pn)) continue;
                m.set(pn, p);
            }
            return m;
        }
    }["RapportPage.useMemo[ctxByPartijNr]"], [
        ctxRows
    ]);
    /**
   * ✅ Aandacht vereist: fightpaspoort nummer gewijzigd
   * - Eerst: audit VA_CHANGED (blijft bestaan na herscrape)
   * - Daarna: fallback op controle_resultaten (als ze er (nog) zijn)
   */ const lijstFightpaspoortGewijzigd = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useMemo"])({
        "RapportPage.useMemo[lijstFightpaspoortGewijzigd]": ()=>{
            const items = [];
            // 0) context-first: controle_bout_context.*_va_mm_prev gevuld => VA gewijzigd
            for (const p of ctxRows ?? []){
                const pn = Number(p.partij_nr);
                if (!Number.isFinite(pn)) continue;
                const partij = safe(p.partij_label ?? pn);
                // rood
                const roodPrevRaw = p.rood_va_mm_prev;
                const roodHasPrevField = roodPrevRaw !== null && roodPrevRaw !== undefined;
                if (roodHasPrevField) {
                    const prev = safe(p.rood_va_mm_prev, "");
                    const current = safe(p.rood_va_mm ?? p.va_rood ?? p.rood_va, "");
                    const fp = safe(p.rood_va, "");
                    const changed = prev && prev !== current || !prev && !!current;
                    if (changed) {
                        const extraFp = fp && fp !== "-" && fp !== current ? ` (FightPassport: ${fp})` : "";
                        items.push({
                            partij,
                            partij_nr: pn,
                            hoek: "rood",
                            naam: safe(p.rood_naam_fp ?? p.rood_naam_mm),
                            gym: safe(p.rood_gym_fp ?? p.rood_gym_mm ?? p.rood_gym),
                            boodschap: `VA-nummer gewijzigd: ${prev} → ${current}.${extraFp}`,
                            created_at: null
                        });
                    }
                }
                // blauw
                const blauwPrevRaw = p.blauw_va_mm_prev;
                const blauwHasPrevField = blauwPrevRaw !== null && blauwPrevRaw !== undefined;
                if (blauwHasPrevField) {
                    const prev = safe(p.blauw_va_mm_prev, "");
                    const current = safe(p.blauw_va_mm ?? p.va_blauw ?? p.blauw_va, "");
                    const fp = safe(p.blauw_va, "");
                    const changed = prev && prev !== current || !prev && !!current;
                    if (changed) {
                        const extraFp = fp && fp !== "-" && fp !== current ? ` (FightPassport: ${fp})` : "";
                        items.push({
                            partij,
                            partij_nr: pn,
                            hoek: "blauw",
                            naam: safe(p.blauw_naam_fp ?? p.blauw_naam_mm),
                            gym: safe(p.blauw_gym_fp ?? p.blauw_gym_mm ?? p.blauw_gym),
                            boodschap: `VA-nummer gewijzigd: ${prev} → ${current}.${extraFp}`,
                            created_at: null
                        });
                    }
                }
            }
            // 1) audit-first
            for (const ev of auditEvents ?? []){
                if (normCode(ev.event_type) !== "VA_CHANGED") continue;
                const pn = Number(ev.partij_nr);
                if (!Number.isFinite(pn)) continue;
                const hoek = ev.hoek ?? "rood";
                const ctx = ctxByPartijNr.get(pn);
                const naam = hoek === "rood" ? safe(ctx?.rood_naam_fp ?? ctx?.rood_naam_mm) : safe(ctx?.blauw_naam_fp ?? ctx?.blauw_naam_mm);
                const gym = hoek === "rood" ? safe(ctx?.rood_gym_fp ?? ctx?.rood_gym_mm ?? ctx?.rood_gym) : safe(ctx?.blauw_gym_fp ?? ctx?.blauw_gym_mm ?? ctx?.blauw_gym);
                const oldVa = safe(ev.old_va, "-");
                const newVa = safe(ev.new_va, "-");
                const actor = ev.actor_email ? ` (door: ${ev.actor_email})` : "";
                items.push({
                    partij: safe(ctx?.partij_label ?? pn),
                    partij_nr: pn,
                    hoek,
                    naam,
                    gym,
                    boodschap: `Fightpaspoort nummer gewijzigd: ${oldVa} → ${newVa}. Pas aan op MM.${actor}`,
                    created_at: ev.created_at ?? null
                });
            }
            // 2) fallback: resultaten (zonder duplicates)
            const seen = new Set(items.map({
                "RapportPage.useMemo[lijstFightpaspoortGewijzigd]": (x)=>`${x.partij_nr}-${x.hoek}`
            }["RapportPage.useMemo[lijstFightpaspoortGewijzigd]"]));
            for (const r of openMeldingen ?? []){
                if (!isFightpaspoortGewijzigd(r)) continue;
                const pn = Number(r.partij_nr);
                if (!Number.isFinite(pn)) continue;
                const ctx = ctxByPartijNr.get(pn);
                const hoek = r.hoek ?? (normCode(r.rule_code).includes("_BLAUW") ? "blauw" : "rood");
                const key = `${pn}-${hoek}`;
                if (seen.has(key)) continue;
                const naam = hoek === "rood" ? safe(ctx?.rood_naam_fp ?? ctx?.rood_naam_mm) : safe(ctx?.blauw_naam_fp ?? ctx?.blauw_naam_mm);
                const gym = hoek === "rood" ? safe(ctx?.rood_gym_fp ?? ctx?.rood_gym_mm ?? ctx?.rood_gym) : safe(ctx?.blauw_gym_fp ?? ctx?.blauw_gym_mm ?? ctx?.blauw_gym);
                items.push({
                    partij: safe(ctx?.partij_label ?? pn),
                    partij_nr: pn,
                    hoek,
                    naam,
                    gym,
                    boodschap: safe(r.boodschap ?? r.rule ?? "Fightpaspoort nummer gewijzigd", "-"),
                    created_at: r.created_at ?? null
                });
            }
            // ✅ dedupe per partij+hoek (context > audit > resultaat) doordat we 'first wins' houden
            const uniqMap = new Map();
            for (const it of items){
                const key = `${it.partij_nr}-${it.hoek}`;
                if (!uniqMap.has(key)) uniqMap.set(key, it);
            }
            const uniq = Array.from(uniqMap.values());
            uniq.sort({
                "RapportPage.useMemo[lijstFightpaspoortGewijzigd]": (a, b)=>{
                    if (a.partij_nr !== b.partij_nr) return a.partij_nr - b.partij_nr;
                    return a.hoek.localeCompare(b.hoek);
                }
            }["RapportPage.useMemo[lijstFightpaspoortGewijzigd]"]);
            return uniq;
        }
    }["RapportPage.useMemo[lijstFightpaspoortGewijzigd]"], [
        auditEvents,
        openMeldingen,
        ctxByPartijNr,
        ctxRows
    ]);
    // ===== aparte lijsten =====
    const lijstLicentie = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useMemo"])({
        "RapportPage.useMemo[lijstLicentie]": ()=>{
            const items = [];
            for (const p of ctxRows ?? []){
                const partij = safe(p.partij_label ?? p.partij_nr);
                const roodVa = p.rood_va_mm ?? p.va_rood ?? p.rood_va;
                const blauwVa = p.blauw_va_mm ?? p.va_blauw ?? p.blauw_va;
                if (licentieIsProbleem(p.rood_licentie)) {
                    items.push({
                        partij,
                        hoek: "rood",
                        naam: safe(p.rood_naam_fp ?? p.rood_naam_mm),
                        gym: safe(p.rood_gym_fp ?? p.rood_gym_mm ?? p.rood_gym),
                        licentie: licentieLabel(p.rood_licentie),
                        ookGeenVa: vaIsMissing(roodVa)
                    });
                }
                if (licentieIsProbleem(p.blauw_licentie)) {
                    items.push({
                        partij,
                        hoek: "blauw",
                        naam: safe(p.blauw_naam_fp ?? p.blauw_naam_mm),
                        gym: safe(p.blauw_gym_fp ?? p.blauw_gym_mm ?? p.blauw_gym),
                        licentie: licentieLabel(p.blauw_licentie),
                        ookGeenVa: vaIsMissing(blauwVa)
                    });
                }
            }
            const score = {
                "RapportPage.useMemo[lijstLicentie].score": (x)=>x === "nee" ? 1 : x === "onbekend" ? 2 : 9
            }["RapportPage.useMemo[lijstLicentie].score"];
            const toNum = {
                "RapportPage.useMemo[lijstLicentie].toNum": (s)=>{
                    const m = String(s ?? "").match(/^\d+/);
                    return m ? Number(m[0]) : 999999;
                }
            }["RapportPage.useMemo[lijstLicentie].toNum"];
            return items.sort({
                "RapportPage.useMemo[lijstLicentie]": (a, b)=>{
                    const sa = score(a.licentie);
                    const sb = score(b.licentie);
                    if (sa !== sb) return sa - sb;
                    if (a.ookGeenVa !== b.ookGeenVa) return a.ookGeenVa ? -1 : 1;
                    const na = toNum(a.partij);
                    const nb = toNum(b.partij);
                    if (na !== nb) return na - nb;
                    return a.hoek.localeCompare(b.hoek);
                }
            }["RapportPage.useMemo[lijstLicentie]"]);
        }
    }["RapportPage.useMemo[lijstLicentie]"], [
        ctxRows
    ]);
    const lijstKeurmerkSportscholen = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useMemo"])({
        "RapportPage.useMemo[lijstKeurmerkSportscholen]": ()=>{
            const set = new Set();
            for (const p of ctxRows ?? []){
                const roodGym = safe(p.rood_gym_fp ?? p.rood_gym_mm ?? p.rood_gym, "");
                const blauwGym = safe(p.blauw_gym_fp ?? p.blauw_gym_mm ?? p.blauw_gym, "");
                if (roodGym && keurmerkIsProbleem(p.keurmerk_rood)) set.add(roodGym);
                if (blauwGym && keurmerkIsProbleem(p.keurmerk_blauw)) set.add(blauwGym);
            }
            return Array.from(set).sort({
                "RapportPage.useMemo[lijstKeurmerkSportscholen]": (a, b)=>a.localeCompare(b, "nl")
            }["RapportPage.useMemo[lijstKeurmerkSportscholen]"]);
        }
    }["RapportPage.useMemo[lijstKeurmerkSportscholen]"], [
        ctxRows
    ]);
    const lijstStartverbod = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useMemo"])({
        "RapportPage.useMemo[lijstStartverbod]": ()=>{
            const items = [];
            for (const p of ctxRows ?? []){
                const partij = safe(p.partij_label ?? p.partij_nr);
                if (p.rood_heeft_startverbod === true) {
                    items.push({
                        partij,
                        hoek: "rood",
                        naam: safe(p.rood_naam_fp ?? p.rood_naam_mm),
                        gym: safe(p.rood_gym_fp ?? p.rood_gym_mm ?? p.rood_gym)
                    });
                }
                if (p.blauw_heeft_startverbod === true) {
                    items.push({
                        partij,
                        hoek: "blauw",
                        naam: safe(p.blauw_naam_fp ?? p.blauw_naam_mm),
                        gym: safe(p.blauw_gym_fp ?? p.blauw_gym_mm ?? p.blauw_gym)
                    });
                }
            }
            const toNum = {
                "RapportPage.useMemo[lijstStartverbod].toNum": (s)=>{
                    const m = String(s ?? "").match(/^\d+/);
                    return m ? Number(m[0]) : 999999;
                }
            }["RapportPage.useMemo[lijstStartverbod].toNum"];
            return items.sort({
                "RapportPage.useMemo[lijstStartverbod]": (a, b)=>{
                    const na = toNum(a.partij);
                    const nb = toNum(b.partij);
                    if (na !== nb) return na - nb;
                    return a.hoek.localeCompare(b.hoek);
                }
            }["RapportPage.useMemo[lijstStartverbod]"]);
        }
    }["RapportPage.useMemo[lijstStartverbod]"], [
        ctxRows
    ]);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        style: {
            background: "#eef0f3",
            color: "#111827"
        },
        className: "jsx-76660bd565818adb" + " " + "min-h-screen fs-report",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$styled$2d$jsx$2f$style$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                id: "76660bd565818adb",
                children: "@media print{@page{margin:12mm}*{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}html,body{background:#fff!important}.no-print{display:none!important}.print-max{max-width:none!important;margin:0!important;padding:0!important}.print-max .fs-report,.print-max .min-h-screen{height:auto!important;min-height:auto!important}.avoid-break{break-inside:avoid!important;page-break-inside:avoid!important}.fs-report .fs-silver-frame{box-shadow:0 0 0 2px #c0c0c08c!important}.fs-report table{border-collapse:separate!important;border-spacing:0 3px!important}.fs-report table thead th{border-bottom:1px solid #c0c0c059!important}.fs-report table tbody tr td{border-top:1px solid #c0c0c059!important;border-bottom:1px solid #c0c0c059!important}.fs-report table tbody tr td:first-child{border-left:1px solid #c0c0c059!important;border-top-left-radius:10px!important;border-bottom-left-radius:10px!important}.fs-report table tbody tr td:last-child{border-right:1px solid #c0c0c059!important;border-top-right-radius:10px!important;border-bottom-right-radius:10px!important}.fs-report table tbody td *{color:inherit!important}}.fs-section{border:1px solid #0000001a;box-shadow:inset 0 0 0 1px #c0c0c040}.fs-report table{width:100%}.fs-report table thead th{background:linear-gradient(#f5f5f5 0%,#d2d2d2 100%);font-weight:800;color:#111827!important}.fs-report table tbody tr:nth-child(odd) td{color:#111827!important;background:#fff!important}.fs-report table tbody tr:nth-child(2n) td{color:#fff!important;background:#3a3a3a!important}.fs-report table tbody td *{color:inherit!important}.section-strong{margin-bottom:22px;padding:16px;background:linear-gradient(#fff 0%,#f0f0f0 55%,#e6e6e6 100%)!important;border:2px solid #000000d9!important;border-radius:14px!important;box-shadow:inset 0 0 0 1px #ffffff59,0 10px 18px #0000001f,0 2px #0000002e!important}"
            }, void 0, false, void 0, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "jsx-76660bd565818adb" + " " + "print-max mx-auto max-w-6xl px-4 py-6",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "jsx-76660bd565818adb" + " " + "fs-silver-frame rounded-[28px] p-[2px] bg-gradient-to-b from-white/70 via-white/25 to-white/60 shadow-[0_0_0_1px_rgba(0,0,0,0.08),0_18px_70px_rgba(0,0,0,0.25)]",
                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "jsx-76660bd565818adb" + " " + "rounded-[26px] p-[2px] bg-gradient-to-b from-[#111111] via-[#070707] to-[#111111] ring-1 ring-black/70",
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "jsx-76660bd565818adb" + " " + "rounded-[24px] bg-[#f8fafc] ring-1 ring-black/10",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "jsx-76660bd565818adb" + " " + "px-5 py-5 border-b border-black/10",
                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "jsx-76660bd565818adb" + " " + "grid gap-4 lg:grid-cols-3 lg:items-center",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "jsx-76660bd565818adb",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        style: {
                                                            background: "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(230,230,230,0.72) 40%, rgba(140,140,140,0.60) 100%)",
                                                            WebkitBackgroundClip: "text",
                                                            WebkitTextFillColor: "transparent",
                                                            textShadow: "0 10px 24px rgba(0,0,0,0.18)"
                                                        },
                                                        className: "jsx-76660bd565818adb" + " " + "text-xs font-extrabold tracking-wider",
                                                        children: "FIGHTSUPPORT RAPPORT"
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                        lineNumber: 983,
                                                        columnNumber: 21
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        className: "jsx-76660bd565818adb" + " " + "mt-2",
                                                        children: [
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                className: "jsx-76660bd565818adb" + " " + "text-[#ff4d00] font-extrabold text-sm",
                                                                children: "Evenement"
                                                            }, void 0, false, {
                                                                fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                                lineNumber: 996,
                                                                columnNumber: 23
                                                            }, this),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                className: "jsx-76660bd565818adb" + " " + "text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-900",
                                                                children: eventMeta?.naam ?? "-"
                                                            }, void 0, false, {
                                                                fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                                lineNumber: 997,
                                                                columnNumber: 23
                                                            }, this),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                className: "jsx-76660bd565818adb" + " " + "mt-1 text-[#ff4d00] font-extrabold text-sm",
                                                                children: "Datum"
                                                            }, void 0, false, {
                                                                fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                                lineNumber: 998,
                                                                columnNumber: 23
                                                            }, this),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                className: "jsx-76660bd565818adb" + " " + "text-xl sm:text-2xl font-extrabold tracking-tight text-zinc-900/90",
                                                                children: fmtNlDateOnly(eventMeta?.datum)
                                                            }, void 0, false, {
                                                                fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                                lineNumber: 999,
                                                                columnNumber: 23
                                                            }, this)
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                        lineNumber: 995,
                                                        columnNumber: 21
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        className: "jsx-76660bd565818adb" + " " + "mt-3 text-xs text-zinc-700",
                                                        children: [
                                                            "Matchmaking ID: ",
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                className: "jsx-76660bd565818adb" + " " + "font-mono",
                                                                children: matchmakingId
                                                            }, void 0, false, {
                                                                fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                                lineNumber: 1003,
                                                                columnNumber: 39
                                                            }, this)
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                        lineNumber: 1002,
                                                        columnNumber: 21
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        className: "jsx-76660bd565818adb" + " " + "mt-1 text-xs text-zinc-600",
                                                        children: [
                                                            "Run: ",
                                                            safe(run?.status),
                                                            " • Gestart: ",
                                                            fmtDateTime(run?.gestart_op),
                                                            " • Afgerond: ",
                                                            fmtDateTime(run?.afgerond_op)
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                        lineNumber: 1005,
                                                        columnNumber: 21
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                lineNumber: 982,
                                                columnNumber: 19
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "jsx-76660bd565818adb" + " " + "flex justify-center",
                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "jsx-76660bd565818adb" + " " + "rounded-xl p-[5px] bg-gradient-to-b from-[#e0e0e0] via-[#8c8c8c] to-[#cfcfcf]",
                                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        className: "jsx-76660bd565818adb" + " " + "rounded-lg border-[3px] border-[#bdbdbd] bg-[#0b0b0b] p-4",
                                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(FsLogo, {
                                                            className: "h-20 sm:h-24 w-auto"
                                                        }, void 0, false, {
                                                            fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                            lineNumber: 1015,
                                                            columnNumber: 25
                                                        }, this)
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                        lineNumber: 1013,
                                                        columnNumber: 23
                                                    }, this)
                                                }, void 0, false, {
                                                    fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                    lineNumber: 1012,
                                                    columnNumber: 21
                                                }, this)
                                            }, void 0, false, {
                                                fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                lineNumber: 1011,
                                                columnNumber: 19
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "jsx-76660bd565818adb" + " " + "no-print flex items-center justify-start lg:justify-end gap-2",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                                                        href: `/dashboard/admin/controle/${matchmakingId}`,
                                                        className: "rounded-md bg-white px-3 py-2 text-sm font-semibold text-[#c0c0c0] ring-1 ring-white/20 hover:bg-[#151515] hover:text-white",
                                                        children: "Terug"
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                        lineNumber: 1022,
                                                        columnNumber: 21
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                        onClick: ()=>window.print(),
                                                        className: "jsx-76660bd565818adb" + " " + "rounded-md bg-[#ff4d00] px-3 py-2 text-sm font-extrabold text-black hover:brightness-110",
                                                        children: "Opslaan als PDF"
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                        lineNumber: 1028,
                                                        columnNumber: 21
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                lineNumber: 1021,
                                                columnNumber: 19
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                        lineNumber: 980,
                                        columnNumber: 17
                                    }, this)
                                }, void 0, false, {
                                    fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                    lineNumber: 979,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "jsx-76660bd565818adb" + " " + "px-5 py-6 space-y-6",
                                    children: [
                                        loading && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "jsx-76660bd565818adb" + " " + "rounded-xl border border-black/10 bg-white p-4 text-sm text-zinc-800",
                                            children: "Rapport laden…"
                                        }, void 0, false, {
                                            fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                            lineNumber: 1039,
                                            columnNumber: 29
                                        }, this),
                                        error && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "jsx-76660bd565818adb" + " " + "rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-700",
                                            children: error
                                        }, void 0, false, {
                                            fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                            lineNumber: 1040,
                                            columnNumber: 27
                                        }, this),
                                        !loading && !error && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Fragment"], {
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "jsx-76660bd565818adb" + " " + "fs-section rounded-2xl bg-white overflow-hidden",
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                            className: "jsx-76660bd565818adb" + " " + "bg-[#ff4d00] px-4 py-3 font-extrabold text-black",
                                                            children: "Overzicht partijen (alle)"
                                                        }, void 0, false, {
                                                            fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                            lineNumber: 1046,
                                                            columnNumber: 23
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                            className: "jsx-76660bd565818adb" + " " + "p-3",
                                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$NvbTable$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                                                                columns: [
                                                                    "Partij",
                                                                    "Partij",
                                                                    "Status"
                                                                ],
                                                                children: partijenOverzicht.map((r, i)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("tr", {
                                                                        className: "jsx-76660bd565818adb",
                                                                        children: [
                                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                                                className: "jsx-76660bd565818adb" + " " + "px-4 py-2 font-semibold",
                                                                                children: safe(r.partij_label)
                                                                            }, void 0, false, {
                                                                                fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                                                lineNumber: 1052,
                                                                                columnNumber: 23
                                                                            }, this),
                                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                                                className: "jsx-76660bd565818adb" + " " + "px-4 py-2",
                                                                                children: [
                                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                                        className: "jsx-76660bd565818adb" + " " + "font-medium",
                                                                                        children: [
                                                                                            r.rood,
                                                                                            " ",
                                                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                                                className: "jsx-76660bd565818adb" + " " + "opacity-70",
                                                                                                children: "vs"
                                                                                            }, void 0, false, {
                                                                                                fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                                                                lineNumber: 1055,
                                                                                                columnNumber: 36
                                                                                            }, this),
                                                                                            " ",
                                                                                            r.blauw
                                                                                        ]
                                                                                    }, void 0, true, {
                                                                                        fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                                                        lineNumber: 1054,
                                                                                        columnNumber: 25
                                                                                    }, this),
                                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                                        className: "jsx-76660bd565818adb" + " " + "text-xs opacity-80",
                                                                                        children: [
                                                                                            r.discipline,
                                                                                            " • ",
                                                                                            r.klasse,
                                                                                            r.hasOpenMeldingen ? " • open meldingen" : ""
                                                                                        ]
                                                                                    }, void 0, true, {
                                                                                        fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                                                        lineNumber: 1057,
                                                                                        columnNumber: 25
                                                                                    }, this),
                                                                                    hasDispensatie(r.meldingen) ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                                        className: "jsx-76660bd565818adb" + " " + "mt-2",
                                                                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(DispensatieLinks, {
                                                                                            meldingen: r.meldingen
                                                                                        }, void 0, false, {
                                                                                            fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                                                            lineNumber: 1065,
                                                                                            columnNumber: 29
                                                                                        }, this)
                                                                                    }, void 0, false, {
                                                                                        fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                                                        lineNumber: 1064,
                                                                                        columnNumber: 27
                                                                                    }, this) : null
                                                                                ]
                                                                            }, void 0, true, {
                                                                                fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                                                lineNumber: 1053,
                                                                                columnNumber: 23
                                                                            }, this),
                                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                                                className: "jsx-76660bd565818adb" + " " + "px-4 py-2",
                                                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(StatusBadges, {
                                                                                    status: r.status,
                                                                                    meldingen: r.meldingen
                                                                                }, void 0, false, {
                                                                                    fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                                                    lineNumber: 1071,
                                                                                    columnNumber: 25
                                                                                }, this)
                                                                            }, void 0, false, {
                                                                                fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                                                lineNumber: 1069,
                                                                                columnNumber: 23
                                                                            }, this)
                                                                        ]
                                                                    }, `${r.partij_nr}-${i}`, true, {
                                                                        fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                                        lineNumber: 1051,
                                                                        columnNumber: 21
                                                                    }, this))
                                                            }, void 0, false, {
                                                                fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                                lineNumber: 1049,
                                                                columnNumber: 17
                                                            }, this)
                                                        }, void 0, false, {
                                                            fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                            lineNumber: 1048,
                                                            columnNumber: 23
                                                        }, this)
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                    lineNumber: 1045,
                                                    columnNumber: 21
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "jsx-76660bd565818adb" + " " + "fs-section rounded-2xl bg-white overflow-hidden",
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                            className: "jsx-76660bd565818adb" + " " + "bg-[#ff4d00] px-4 py-3 font-extrabold text-black",
                                                            children: "Aandacht vereist"
                                                        }, void 0, false, {
                                                            fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                            lineNumber: 1081,
                                                            columnNumber: 15
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                            className: "jsx-76660bd565818adb" + " " + "p-3 space-y-4",
                                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                className: "jsx-76660bd565818adb" + " " + "rounded-xl border border-black/10 bg-white p-3 avoid-break",
                                                                children: [
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                        className: "jsx-76660bd565818adb" + " " + "flex items-center justify-between gap-3",
                                                                        children: [
                                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                                className: "jsx-76660bd565818adb" + " " + "font-semibold text-zinc-900",
                                                                                children: "Fightpaspoort nummer gewijzigd"
                                                                            }, void 0, false, {
                                                                                fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                                                lineNumber: 1087,
                                                                                columnNumber: 21
                                                                            }, this),
                                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                                className: "jsx-76660bd565818adb" + " " + "text-xs font-extrabold text-zinc-600",
                                                                                children: lijstFightpaspoortGewijzigd.length
                                                                            }, void 0, false, {
                                                                                fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                                                lineNumber: 1088,
                                                                                columnNumber: 21
                                                                            }, this)
                                                                        ]
                                                                    }, void 0, true, {
                                                                        fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                                        lineNumber: 1086,
                                                                        columnNumber: 19
                                                                    }, this),
                                                                    lijstFightpaspoortGewijzigd.length === 0 ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                        className: "jsx-76660bd565818adb" + " " + "mt-2 text-sm text-zinc-700",
                                                                        children: "Geen."
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                                        lineNumber: 1092,
                                                                        columnNumber: 21
                                                                    }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                        className: "jsx-76660bd565818adb" + " " + "mt-3",
                                                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$NvbTable$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                                                                            columns: [
                                                                                "Partij",
                                                                                "Hoek",
                                                                                "Naam",
                                                                                "Sportschool",
                                                                                "Melding"
                                                                            ],
                                                                            children: lijstFightpaspoortGewijzigd.map((x, i)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("tr", {
                                                                                    className: "jsx-76660bd565818adb",
                                                                                    children: [
                                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                                                            className: "jsx-76660bd565818adb" + " " + "px-4 py-2 font-semibold",
                                                                                            children: x.partij
                                                                                        }, void 0, false, {
                                                                                            fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                                                            lineNumber: 1098,
                                                                                            columnNumber: 29
                                                                                        }, this),
                                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                                                            className: "jsx-76660bd565818adb" + " " + "px-4 py-2",
                                                                                            children: x.hoek
                                                                                        }, void 0, false, {
                                                                                            fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                                                            lineNumber: 1099,
                                                                                            columnNumber: 29
                                                                                        }, this),
                                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                                                            className: "jsx-76660bd565818adb" + " " + "px-4 py-2",
                                                                                            children: x.naam
                                                                                        }, void 0, false, {
                                                                                            fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                                                            lineNumber: 1100,
                                                                                            columnNumber: 29
                                                                                        }, this),
                                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                                                            className: "jsx-76660bd565818adb" + " " + "px-4 py-2",
                                                                                            children: x.gym
                                                                                        }, void 0, false, {
                                                                                            fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                                                            lineNumber: 1101,
                                                                                            columnNumber: 29
                                                                                        }, this),
                                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                                                            className: "jsx-76660bd565818adb" + " " + "px-4 py-2",
                                                                                            children: [
                                                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                                                    className: "jsx-76660bd565818adb",
                                                                                                    children: x.boodschap
                                                                                                }, void 0, false, {
                                                                                                    fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                                                                    lineNumber: 1103,
                                                                                                    columnNumber: 31
                                                                                                }, this),
                                                                                                x.created_at ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                                                    className: "jsx-76660bd565818adb" + " " + "mt-1 text-xs text-zinc-600",
                                                                                                    children: [
                                                                                                        "(",
                                                                                                        fmtDateTime(x.created_at),
                                                                                                        ")"
                                                                                                    ]
                                                                                                }, void 0, true, {
                                                                                                    fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                                                                    lineNumber: 1104,
                                                                                                    columnNumber: 47
                                                                                                }, this) : null
                                                                                            ]
                                                                                        }, void 0, true, {
                                                                                            fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                                                            lineNumber: 1102,
                                                                                            columnNumber: 29
                                                                                        }, this)
                                                                                    ]
                                                                                }, `fpchg-${x.partij_nr}-${x.hoek}-${i}`, true, {
                                                                                    fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                                                    lineNumber: 1097,
                                                                                    columnNumber: 27
                                                                                }, this))
                                                                        }, void 0, false, {
                                                                            fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                                            lineNumber: 1095,
                                                                            columnNumber: 23
                                                                        }, this)
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                                        lineNumber: 1094,
                                                                        columnNumber: 21
                                                                    }, this)
                                                                ]
                                                            }, void 0, true, {
                                                                fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                                lineNumber: 1085,
                                                                columnNumber: 17
                                                            }, this)
                                                        }, void 0, false, {
                                                            fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                            lineNumber: 1083,
                                                            columnNumber: 15
                                                        }, this)
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                    lineNumber: 1080,
                                                    columnNumber: 13
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "jsx-76660bd565818adb" + " " + "space-y-4",
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                            className: "jsx-76660bd565818adb" + " " + "rounded-2xl border border-black/10 bg-white overflow-hidden section-strong",
                                                            children: [
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                    className: "jsx-76660bd565818adb" + " " + "bg-[#101010] text-white px-4 py-3 font-extrabold border-b border-black/10",
                                                                    children: "Licentie (nee/onbekend)"
                                                                }, void 0, false, {
                                                                    fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                                    lineNumber: 1119,
                                                                    columnNumber: 17
                                                                }, this),
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                    className: "jsx-76660bd565818adb" + " " + "p-3",
                                                                    children: lijstLicentie.length === 0 ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                        className: "jsx-76660bd565818adb" + " " + "text-sm text-zinc-700",
                                                                        children: "Geen."
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                                        lineNumber: 1122,
                                                                        columnNumber: 21
                                                                    }, this) : (()=>{
                                                                        // groepeer per partij zodat rood/blauw naast elkaar kunnen staan
                                                                        const map = new Map();
                                                                        for (const it of lijstLicentie){
                                                                            const k = it.partij;
                                                                            const cur = map.get(k) ?? {
                                                                                partij: it.partij
                                                                            };
                                                                            if (it.hoek === "rood") cur.rood = it;
                                                                            if (it.hoek === "blauw") cur.blauw = it;
                                                                            map.set(k, cur);
                                                                        }
                                                                        const rows = Array.from(map.values());
                                                                        const Badge = ({ children, tone })=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                                className: "jsx-76660bd565818adb" + " " + ("inline-flex items-center rounded px-2 py-0.5 text-[11px] font-extrabold ring-1 " + (tone === "danger" ? "bg-[#ff4d00]/15 text-[#ff4d00] ring-[#ff4d00]/25" : tone === "warn" ? "bg-amber-500/15 text-amber-700 ring-amber-500/25" : "bg-black/5 text-zinc-700 ring-black/10") || ""),
                                                                                children: children
                                                                            }, void 0, false, {
                                                                                fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                                                lineNumber: 1152,
                                                                                columnNumber: 25
                                                                            }, this);
                                                                        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                            className: "jsx-76660bd565818adb" + " " + "rounded-xl overflow-hidden border border-black/10",
                                                                            children: [
                                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                                    className: "jsx-76660bd565818adb" + " " + "grid grid-cols-[86px_1fr_1fr] bg-gradient-to-r from-[#f6f6f6] to-white text-xs font-extrabold text-zinc-900 border-b border-black/10",
                                                                                    children: [
                                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                                            className: "jsx-76660bd565818adb" + " " + "px-3 py-2",
                                                                                            children: "Partij"
                                                                                        }, void 0, false, {
                                                                                            fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                                                            lineNumber: 1170,
                                                                                            columnNumber: 29
                                                                                        }, this),
                                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                                            className: "jsx-76660bd565818adb" + " " + "px-3 py-2 border-l border-black/10",
                                                                                            children: "Rood"
                                                                                        }, void 0, false, {
                                                                                            fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                                                            lineNumber: 1171,
                                                                                            columnNumber: 29
                                                                                        }, this),
                                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                                            className: "jsx-76660bd565818adb" + " " + "px-3 py-2 border-l border-black/10",
                                                                                            children: "Blauw"
                                                                                        }, void 0, false, {
                                                                                            fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                                                            lineNumber: 1172,
                                                                                            columnNumber: 29
                                                                                        }, this)
                                                                                    ]
                                                                                }, void 0, true, {
                                                                                    fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                                                    lineNumber: 1169,
                                                                                    columnNumber: 27
                                                                                }, this),
                                                                                rows.map((r, idx)=>{
                                                                                    const zebra = idx % 2 === 0 ? "bg-white text-zinc-900" : "bg-[#2f2f2f] text-white";
                                                                                    const subText = idx % 2 === 0 ? "text-zinc-600" : "text-white/75";
                                                                                    const line = idx % 2 === 0 ? "border-black/10" : "border-white/10";
                                                                                    const Cell = ({ it, side })=>{
                                                                                        if (!it) return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                                            className: "jsx-76660bd565818adb" + " " + `px-3 py-2 text-sm ${idx % 2 === 0 ? "text-zinc-500" : "text-white/70"}`,
                                                                                            children: "—"
                                                                                        }, void 0, false, {
                                                                                            fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                                                            lineNumber: 1182,
                                                                                            columnNumber: 47
                                                                                        }, this);
                                                                                        const licTone = it.licentie === "nee" ? "danger" : it.licentie === "onbekend" ? "warn" : "muted";
                                                                                        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                                            className: "jsx-76660bd565818adb" + " " + "px-3 py-2",
                                                                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                                                className: "jsx-76660bd565818adb" + " " + "flex items-start justify-between gap-3",
                                                                                                children: [
                                                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                                                        className: "jsx-76660bd565818adb" + " " + "min-w-0",
                                                                                                        children: [
                                                                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                                                                className: "jsx-76660bd565818adb" + " " + "truncate text-sm font-semibold",
                                                                                                                children: it.naam
                                                                                                            }, void 0, false, {
                                                                                                                fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                                                                                lineNumber: 1190,
                                                                                                                columnNumber: 39
                                                                                                            }, this),
                                                                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                                                                className: "jsx-76660bd565818adb" + " " + `truncate text-xs ${subText}`,
                                                                                                                children: it.gym
                                                                                                            }, void 0, false, {
                                                                                                                fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                                                                                lineNumber: 1191,
                                                                                                                columnNumber: 39
                                                                                                            }, this)
                                                                                                        ]
                                                                                                    }, void 0, true, {
                                                                                                        fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                                                                        lineNumber: 1189,
                                                                                                        columnNumber: 37
                                                                                                    }, this),
                                                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                                                        className: "jsx-76660bd565818adb" + " " + "flex flex-wrap items-center justify-end gap-2",
                                                                                                        children: [
                                                                                                            it.ookGeenVa ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(Badge, {
                                                                                                                tone: "danger",
                                                                                                                children: "ook geen VA"
                                                                                                            }, void 0, false, {
                                                                                                                fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                                                                                lineNumber: 1194,
                                                                                                                columnNumber: 55
                                                                                                            }, this) : null,
                                                                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(Badge, {
                                                                                                                tone: licTone,
                                                                                                                children: [
                                                                                                                    "licentie: ",
                                                                                                                    it.licentie
                                                                                                                ]
                                                                                                            }, void 0, true, {
                                                                                                                fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                                                                                lineNumber: 1195,
                                                                                                                columnNumber: 39
                                                                                                            }, this)
                                                                                                        ]
                                                                                                    }, void 0, true, {
                                                                                                        fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                                                                        lineNumber: 1193,
                                                                                                        columnNumber: 37
                                                                                                    }, this)
                                                                                                ]
                                                                                            }, void 0, true, {
                                                                                                fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                                                                lineNumber: 1188,
                                                                                                columnNumber: 35
                                                                                            }, this)
                                                                                        }, void 0, false, {
                                                                                            fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                                                            lineNumber: 1187,
                                                                                            columnNumber: 33
                                                                                        }, this);
                                                                                    };
                                                                                    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                                        className: "jsx-76660bd565818adb" + " " + `grid grid-cols-[86px_1fr_1fr] ${zebra} border-b last:border-b-0 ${line}`,
                                                                                        children: [
                                                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                                                className: "jsx-76660bd565818adb" + " " + "px-3 py-2 font-extrabold",
                                                                                                children: r.partij
                                                                                            }, void 0, false, {
                                                                                                fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                                                                lineNumber: 1204,
                                                                                                columnNumber: 33
                                                                                            }, this),
                                                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                                                className: "jsx-76660bd565818adb" + " " + `border-l ${line}`,
                                                                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(Cell, {
                                                                                                    it: r.rood,
                                                                                                    side: "rood",
                                                                                                    className: "jsx-76660bd565818adb"
                                                                                                }, void 0, false, {
                                                                                                    fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                                                                    lineNumber: 1206,
                                                                                                    columnNumber: 35
                                                                                                }, this)
                                                                                            }, void 0, false, {
                                                                                                fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                                                                lineNumber: 1205,
                                                                                                columnNumber: 33
                                                                                            }, this),
                                                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                                                className: "jsx-76660bd565818adb" + " " + `border-l ${line}`,
                                                                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(Cell, {
                                                                                                    it: r.blauw,
                                                                                                    side: "blauw",
                                                                                                    className: "jsx-76660bd565818adb"
                                                                                                }, void 0, false, {
                                                                                                    fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                                                                    lineNumber: 1209,
                                                                                                    columnNumber: 35
                                                                                                }, this)
                                                                                            }, void 0, false, {
                                                                                                fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                                                                lineNumber: 1208,
                                                                                                columnNumber: 33
                                                                                            }, this)
                                                                                        ]
                                                                                    }, `licrow-${r.partij}-${idx}`, true, {
                                                                                        fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                                                        lineNumber: 1203,
                                                                                        columnNumber: 31
                                                                                    }, this);
                                                                                })
                                                                            ]
                                                                        }, void 0, true, {
                                                                            fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                                            lineNumber: 1167,
                                                                            columnNumber: 25
                                                                        }, this);
                                                                    })()
                                                                }, void 0, false, {
                                                                    fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                                    lineNumber: 1120,
                                                                    columnNumber: 33
                                                                }, this)
                                                            ]
                                                        }, void 0, true, {
                                                            fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                            lineNumber: 1118,
                                                            columnNumber: 15
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                            className: "jsx-76660bd565818adb" + " " + "rounded-2xl border border-black/10 bg-white overflow-hidden section-strong",
                                                            children: [
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                    className: "jsx-76660bd565818adb" + " " + "bg-[#101010] text-white px-4 py-3 font-extrabold border-b border-black/10",
                                                                    children: "Keurmerk (sportscholen)"
                                                                }, void 0, false, {
                                                                    fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                                    lineNumber: 1223,
                                                                    columnNumber: 17
                                                                }, this),
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                    className: "jsx-76660bd565818adb" + " " + "p-3",
                                                                    children: [
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                            className: "jsx-76660bd565818adb" + " " + "text-xs text-zinc-600 mb-2",
                                                                            children: "Ongeldig of onbekend (uniek)"
                                                                        }, void 0, false, {
                                                                            fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                                            lineNumber: 1225,
                                                                            columnNumber: 19
                                                                        }, this),
                                                                        lijstKeurmerkSportscholen.length === 0 ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                            className: "jsx-76660bd565818adb" + " " + "text-sm text-zinc-700",
                                                                            children: "Geen."
                                                                        }, void 0, false, {
                                                                            fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                                            lineNumber: 1227,
                                                                            columnNumber: 21
                                                                        }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                            className: "jsx-76660bd565818adb" + " " + "rounded-xl overflow-hidden border border-black/10",
                                                                            children: lijstKeurmerkSportscholen.map((gym, idx)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                                    className: "jsx-76660bd565818adb" + " " + `${idx % 2 === 0 ? "bg-white text-zinc-900" : "bg-[#2f2f2f] text-white"} px-3 py-2 text-sm border-b border-black/10 last:border-b-0`,
                                                                                    children: gym
                                                                                }, `keur-${idx}`, false, {
                                                                                    fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                                                    lineNumber: 1231,
                                                                                    columnNumber: 25
                                                                                }, this))
                                                                        }, void 0, false, {
                                                                            fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                                            lineNumber: 1229,
                                                                            columnNumber: 21
                                                                        }, this)
                                                                    ]
                                                                }, void 0, true, {
                                                                    fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                                    lineNumber: 1224,
                                                                    columnNumber: 17
                                                                }, this)
                                                            ]
                                                        }, void 0, true, {
                                                            fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                            lineNumber: 1222,
                                                            columnNumber: 15
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                            className: "jsx-76660bd565818adb" + " " + "rounded-2xl border border-black/10 bg-white overflow-hidden section-strong",
                                                            children: [
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                    className: "jsx-76660bd565818adb" + " " + "bg-[#101010] text-white px-4 py-3 font-extrabold border-b border-black/10",
                                                                    children: "Startverbod (true)"
                                                                }, void 0, false, {
                                                                    fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                                    lineNumber: 1245,
                                                                    columnNumber: 17
                                                                }, this),
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                    className: "jsx-76660bd565818adb" + " " + "p-3",
                                                                    children: lijstStartverbod.length === 0 ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                        className: "jsx-76660bd565818adb" + " " + "text-sm text-zinc-700",
                                                                        children: "Geen."
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                                        lineNumber: 1248,
                                                                        columnNumber: 21
                                                                    }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                        className: "jsx-76660bd565818adb" + " " + "rounded-xl overflow-hidden border border-black/10",
                                                                        children: lijstStartverbod.map((x, idx)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                                className: "jsx-76660bd565818adb" + " " + `${idx % 2 === 0 ? "bg-white text-zinc-900" : "bg-[#2f2f2f] text-white"} px-3 py-2 text-sm border-b border-black/10 last:border-b-0`,
                                                                                children: [
                                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                                        className: "jsx-76660bd565818adb" + " " + "flex items-center justify-between gap-2",
                                                                                        children: [
                                                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                                                className: "jsx-76660bd565818adb" + " " + "font-semibold",
                                                                                                children: [
                                                                                                    x.partij,
                                                                                                    " • ",
                                                                                                    x.hoek
                                                                                                ]
                                                                                            }, void 0, true, {
                                                                                                fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                                                                lineNumber: 1257,
                                                                                                columnNumber: 29
                                                                                            }, this),
                                                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                                                className: "jsx-76660bd565818adb" + " " + "rounded bg-red-500/15 px-2 py-0.5 text-xs font-extrabold text-red-700 ring-1 ring-red-500/25",
                                                                                                children: "startverbod"
                                                                                            }, void 0, false, {
                                                                                                fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                                                                lineNumber: 1260,
                                                                                                columnNumber: 29
                                                                                            }, this)
                                                                                        ]
                                                                                    }, void 0, true, {
                                                                                        fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                                                        lineNumber: 1256,
                                                                                        columnNumber: 27
                                                                                    }, this),
                                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                                        className: "jsx-76660bd565818adb" + " " + "mt-1",
                                                                                        children: x.naam
                                                                                    }, void 0, false, {
                                                                                        fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                                                        lineNumber: 1262,
                                                                                        columnNumber: 27
                                                                                    }, this),
                                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                                        className: "jsx-76660bd565818adb" + " " + `${idx % 2 === 0 ? "text-zinc-600" : "text-white/75"} text-xs`,
                                                                                        children: x.gym
                                                                                    }, void 0, false, {
                                                                                        fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                                                        lineNumber: 1263,
                                                                                        columnNumber: 27
                                                                                    }, this)
                                                                                ]
                                                                            }, `sv-${idx}`, true, {
                                                                                fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                                                lineNumber: 1252,
                                                                                columnNumber: 25
                                                                            }, this))
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                                        lineNumber: 1250,
                                                                        columnNumber: 21
                                                                    }, this)
                                                                }, void 0, false, {
                                                                    fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                                    lineNumber: 1246,
                                                                    columnNumber: 17
                                                                }, this)
                                                            ]
                                                        }, void 0, true, {
                                                            fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                            lineNumber: 1244,
                                                            columnNumber: 15
                                                        }, this)
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                    lineNumber: 1116,
                                                    columnNumber: 13
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "jsx-76660bd565818adb" + " " + "space-y-6",
                                                    children: [
                                                        partijMetMeldingen.map((it, idx)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                className: "jsx-76660bd565818adb" + " " + "relative mb-12 rounded-2xl p-[4px] bg-gradient-to-br from-[#d9d9d9] via-[#8f8f8f] to-[#cfcfcf]",
                                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                    className: "jsx-76660bd565818adb" + " " + "rounded-[14px] border border-white/12 bg-white overflow-hidden",
                                                                    children: [
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                            className: "jsx-76660bd565818adb" + " " + "flex items-center justify-between gap-3 bg-[#ff4d00] px-4 py-3 shadow-inner",
                                                                            children: [
                                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                                    className: "jsx-76660bd565818adb" + " " + "font-extrabold text-black",
                                                                                    children: [
                                                                                        "Partij ",
                                                                                        safe(it.partij_label)
                                                                                    ]
                                                                                }, void 0, true, {
                                                                                    fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                                                    lineNumber: 1278,
                                                                                    columnNumber: 21
                                                                                }, this),
                                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                                    className: "jsx-76660bd565818adb" + " " + "flex items-center gap-2",
                                                                                    children: [
                                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(DispensatieLinks, {
                                                                                            meldingen: it.meldingen
                                                                                        }, void 0, false, {
                                                                                            fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                                                            lineNumber: 1282,
                                                                                            columnNumber: 23
                                                                                        }, this),
                                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(StatusBadges, {
                                                                                            status: it.status,
                                                                                            meldingen: it.meldingen
                                                                                        }, void 0, false, {
                                                                                            fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                                                            lineNumber: 1285,
                                                                                            columnNumber: 23
                                                                                        }, this)
                                                                                    ]
                                                                                }, void 0, true, {
                                                                                    fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                                                    lineNumber: 1280,
                                                                                    columnNumber: 21
                                                                                }, this)
                                                                            ]
                                                                        }, void 0, true, {
                                                                            fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                                            lineNumber: 1277,
                                                                            columnNumber: 19
                                                                        }, this),
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                            className: "jsx-76660bd565818adb" + " " + "px-4 py-4",
                                                                            children: [
                                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                                    className: "jsx-76660bd565818adb" + " " + "grid gap-3 sm:grid-cols-2",
                                                                                    children: [
                                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                                            className: "jsx-76660bd565818adb" + " " + "rounded-xl border border-black/10 bg-white p-3 avoid-break",
                                                                                            children: [
                                                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                                                    className: "jsx-76660bd565818adb" + " " + "text-xs font-semibold text-zinc-600",
                                                                                                    children: "Rood"
                                                                                                }, void 0, false, {
                                                                                                    fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                                                                    lineNumber: 1292,
                                                                                                    columnNumber: 25
                                                                                                }, this),
                                                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                                                    className: "jsx-76660bd565818adb" + " " + "mt-1 font-semibold text-zinc-900",
                                                                                                    children: it.roodNaam
                                                                                                }, void 0, false, {
                                                                                                    fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                                                                    lineNumber: 1293,
                                                                                                    columnNumber: 25
                                                                                                }, this),
                                                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                                                    className: "jsx-76660bd565818adb" + " " + "text-sm text-zinc-700",
                                                                                                    children: [
                                                                                                        it.roodGym,
                                                                                                        " • VA: ",
                                                                                                        it.roodVa
                                                                                                    ]
                                                                                                }, void 0, true, {
                                                                                                    fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                                                                    lineNumber: 1294,
                                                                                                    columnNumber: 25
                                                                                                }, this)
                                                                                            ]
                                                                                        }, void 0, true, {
                                                                                            fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                                                            lineNumber: 1291,
                                                                                            columnNumber: 23
                                                                                        }, this),
                                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                                            className: "jsx-76660bd565818adb" + " " + "rounded-xl border border-black/10 bg-white p-3 avoid-break",
                                                                                            children: [
                                                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                                                    className: "jsx-76660bd565818adb" + " " + "text-xs font-semibold text-zinc-600",
                                                                                                    children: "Blauw"
                                                                                                }, void 0, false, {
                                                                                                    fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                                                                    lineNumber: 1300,
                                                                                                    columnNumber: 25
                                                                                                }, this),
                                                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                                                    className: "jsx-76660bd565818adb" + " " + "mt-1 font-semibold text-zinc-900",
                                                                                                    children: it.blauwNaam
                                                                                                }, void 0, false, {
                                                                                                    fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                                                                    lineNumber: 1301,
                                                                                                    columnNumber: 25
                                                                                                }, this),
                                                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                                                    className: "jsx-76660bd565818adb" + " " + "text-sm text-zinc-700",
                                                                                                    children: [
                                                                                                        it.blauwGym,
                                                                                                        " • VA: ",
                                                                                                        it.blauwVa
                                                                                                    ]
                                                                                                }, void 0, true, {
                                                                                                    fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                                                                    lineNumber: 1302,
                                                                                                    columnNumber: 25
                                                                                                }, this)
                                                                                            ]
                                                                                        }, void 0, true, {
                                                                                            fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                                                            lineNumber: 1299,
                                                                                            columnNumber: 23
                                                                                        }, this)
                                                                                    ]
                                                                                }, void 0, true, {
                                                                                    fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                                                    lineNumber: 1290,
                                                                                    columnNumber: 21
                                                                                }, this),
                                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                                    className: "jsx-76660bd565818adb" + " " + "mt-4",
                                                                                    children: [
                                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                                            className: "jsx-76660bd565818adb" + " " + "text-sm font-semibold",
                                                                                            children: "Open meldingen"
                                                                                        }, void 0, false, {
                                                                                            fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                                                            lineNumber: 1309,
                                                                                            columnNumber: 23
                                                                                        }, this),
                                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                                            className: "jsx-76660bd565818adb" + " " + "mt-2",
                                                                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$NvbTable$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                                                                                                columns: [
                                                                                                    "Resultaat",
                                                                                                    "Regel",
                                                                                                    "Melding"
                                                                                                ],
                                                                                                children: it.meldingen.map((m, i)=>{
                                                                                                    const st = statusFromResultaat(m.resultaat);
                                                                                                    const code = safe(m.rule_code ?? m.rule);
                                                                                                    const msg = safe(m.boodschap ?? "", "-");
                                                                                                    const aant = safe(m.aantekeningen ?? "", "");
                                                                                                    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("tr", {
                                                                                                        className: "jsx-76660bd565818adb",
                                                                                                        children: [
                                                                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                                                                                className: "jsx-76660bd565818adb" + " " + "px-4 py-2",
                                                                                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(StatusBadge, {
                                                                                                                    status: st
                                                                                                                }, void 0, false, {
                                                                                                                    fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                                                                                    lineNumber: 1323,
                                                                                                                    columnNumber: 35
                                                                                                                }, this)
                                                                                                            }, void 0, false, {
                                                                                                                fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                                                                                lineNumber: 1322,
                                                                                                                columnNumber: 33
                                                                                                            }, this),
                                                                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                                                                                className: "jsx-76660bd565818adb" + " " + "px-4 py-2 font-mono text-xs",
                                                                                                                children: code
                                                                                                            }, void 0, false, {
                                                                                                                fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                                                                                lineNumber: 1325,
                                                                                                                columnNumber: 33
                                                                                                            }, this),
                                                                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                                                                                className: "jsx-76660bd565818adb" + " " + "px-4 py-2",
                                                                                                                children: [
                                                                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                                                                        className: "jsx-76660bd565818adb",
                                                                                                                        children: msg
                                                                                                                    }, void 0, false, {
                                                                                                                        fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                                                                                        lineNumber: 1327,
                                                                                                                        columnNumber: 35
                                                                                                                    }, this),
                                                                                                                    aant && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                                                                        className: "jsx-76660bd565818adb" + " " + "mt-1 text-xs opacity-80",
                                                                                                                        children: [
                                                                                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                                                                                className: "jsx-76660bd565818adb" + " " + "font-semibold",
                                                                                                                                children: "Aantekeningen:"
                                                                                                                            }, void 0, false, {
                                                                                                                                fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                                                                                                lineNumber: 1330,
                                                                                                                                columnNumber: 39
                                                                                                                            }, this),
                                                                                                                            " ",
                                                                                                                            aant
                                                                                                                        ]
                                                                                                                    }, void 0, true, {
                                                                                                                        fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                                                                                        lineNumber: 1329,
                                                                                                                        columnNumber: 37
                                                                                                                    }, this)
                                                                                                                ]
                                                                                                            }, void 0, true, {
                                                                                                                fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                                                                                lineNumber: 1326,
                                                                                                                columnNumber: 33
                                                                                                            }, this)
                                                                                                        ]
                                                                                                    }, `${safe(it.partij_nr)}-${i}`, true, {
                                                                                                        fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                                                                        lineNumber: 1321,
                                                                                                        columnNumber: 31
                                                                                                    }, this);
                                                                                                })
                                                                                            }, void 0, false, {
                                                                                                fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                                                                lineNumber: 1313,
                                                                                                columnNumber: 25
                                                                                            }, this)
                                                                                        }, void 0, false, {
                                                                                            fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                                                            lineNumber: 1312,
                                                                                            columnNumber: 23
                                                                                        }, this)
                                                                                    ]
                                                                                }, void 0, true, {
                                                                                    fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                                                    lineNumber: 1308,
                                                                                    columnNumber: 21
                                                                                }, this)
                                                                            ]
                                                                        }, void 0, true, {
                                                                            fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                                            lineNumber: 1289,
                                                                            columnNumber: 19
                                                                        }, this)
                                                                    ]
                                                                }, void 0, true, {
                                                                    fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                                    lineNumber: 1276,
                                                                    columnNumber: 19
                                                                }, this)
                                                            }, `partij-${safe(it.partij_nr)}-${idx}`, false, {
                                                                fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                                lineNumber: 1275,
                                                                columnNumber: 17
                                                            }, this)),
                                                        partijMetMeldingen.length === 0 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                            className: "jsx-76660bd565818adb" + " " + "rounded border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-700",
                                                            children: "Geen open meldingen."
                                                        }, void 0, false, {
                                                            fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                            lineNumber: 1346,
                                                            columnNumber: 17
                                                        }, this)
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                                    lineNumber: 1273,
                                                    columnNumber: 13
                                                }, this)
                                            ]
                                        }, void 0, true),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "jsx-76660bd565818adb" + " " + "mt-10 border-t border-white/15 pt-4 text-center text-xs text-zinc-600",
                                            children: "© 2026 Fightsupport – Alle rechten voorbehouden"
                                        }, void 0, false, {
                                            fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                            lineNumber: 1354,
                                            columnNumber: 17
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                                    lineNumber: 1038,
                                    columnNumber: 15
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                            lineNumber: 977,
                            columnNumber: 13
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                        lineNumber: 976,
                        columnNumber: 11
                    }, this)
                }, void 0, false, {
                    fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                    lineNumber: 975,
                    columnNumber: 9
                }, this)
            }, void 0, false, {
                fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
                lineNumber: 973,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/rapport/page.tsx",
        lineNumber: 842,
        columnNumber: 5
    }, this);
}
_s1(RapportPage, "1pSK3/VowPx89cMVYgkC+muJsrQ=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useParams"]
    ];
});
_c4 = RapportPage;
var _c, _c1, _c2, _c3, _c4;
__turbopack_context__.k.register(_c, "StatusBadge");
__turbopack_context__.k.register(_c1, "StatusBadges");
__turbopack_context__.k.register(_c2, "DispensatieLinks");
__turbopack_context__.k.register(_c3, "FsLogo");
__turbopack_context__.k.register(_c4, "RapportPage");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
]);

//# sourceMappingURL=_ae016322._.js.map