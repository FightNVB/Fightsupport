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
"[project]/lib/api/authedFetch.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "authedFetch",
    ()=>authedFetch
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabaseClient$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/supabaseClient.ts [app-ssr] (ecmascript)");
"use client";
;
async function authedFetch(input, init = {}) {
    const { data } = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabaseClient$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["supabase"].auth.getSession();
    const token = data?.session?.access_token ?? null;
    const headers = new Headers(init.headers || {});
    if (token) headers.set("Authorization", `Bearer ${token}`);
    return fetch(input, {
        ...init,
        headers
    });
}
}),
"[project]/components/NvbDarkButton.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>NvbDarkButton
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
"use client";
;
function NvbDarkButton({ label, onClick, disabled = false, className = "", fullWidth = true }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
        type: "button",
        disabled: disabled,
        onClick: onClick,
        className: `
        ${fullWidth ? "w-full" : "inline-flex"}
        relative
        flex items-center justify-center
        py-4 px-6
        font-semibold tracking-wide text-white
        transition-all duration-150
        disabled:opacity-50 disabled:cursor-not-allowed
        rounded-none
        ${className}
      `,
        style: {
            /* NVB-oranje vlak */ background: "linear-gradient(180deg, rgba(255,77,0,1) 0%, rgba(235,60,0,1) 100%)",
            /* ZILVEREN RAND (duidelijk, strak) */ border: "1px solid rgba(245,245,245,0.95)",
            /* Subtiele diepte, GEEN glow */ boxShadow: `
          inset 0 1px 0 rgba(255,255,255,0.20),
  inset 0 -1px 0 rgba(0,0,0,0.25),
  0 0 0 1px rgba(255,255,255,0.35)
        `,
            textShadow: "0 1px 2px rgba(0,0,0,0.45)"
        },
        onMouseEnter: (e)=>{
            const el = e.currentTarget;
            el.style.filter = "brightness(1.02)";
            el.style.transform = "translateY(-1px)";
        },
        onMouseLeave: (e)=>{
            const el = e.currentTarget;
            el.style.filter = "brightness(1)";
            el.style.transform = "translateY(0px)";
        },
        onMouseDown: (e)=>{
            const el = e.currentTarget;
            el.style.transform = "translateY(0px)";
            el.style.filter = "brightness(0.98)";
        },
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                "aria-hidden": true,
                className: "pointer-events-none absolute inset-[2px]",
                style: {
                    border: "1px solid rgba(235,235,235,0.55)"
                }
            }, void 0, false, {
                fileName: "[project]/components/NvbDarkButton.tsx",
                lineNumber: 69,
                columnNumber: 4
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                className: "relative z-10",
                children: label
            }, void 0, false, {
                fileName: "[project]/components/NvbDarkButton.tsx",
                lineNumber: 76,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/components/NvbDarkButton.tsx",
        lineNumber: 20,
        columnNumber: 5
    }, this);
}
}),
"[project]/components/NvbLightButton.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>NvbLightButton
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
"use client";
;
function NvbLightButton({ label, onClick, disabled = false, className = "", fullWidth = true }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
        type: "button",
        disabled: disabled,
        onClick: onClick,
        className: `
        ${fullWidth ? "w-full" : "inline-flex"}
        relative
        flex items-center justify-center
        py-4 px-6
        transition-all duration-200
        disabled:opacity-50 disabled:cursor-not-allowed
        rounded-none
        ${className}
      `,
        style: {
            // zilver / geborsteld
            background: `
          linear-gradient(180deg,
            rgba(250,250,250,0.95) 0%,
            rgba(220,220,220,0.92) 38%,
            rgba(180,180,180,0.92) 70%,
            rgba(205,205,205,0.92) 100%
          )
        `,
            border: "1px solid rgba(20,20,20,0.38)",
            boxShadow: `
          inset 0 1px 0 rgba(255,255,255,0.70),
          inset 0 -1px 0 rgba(0,0,0,0.18),
          0 0 0 1px rgba(255,255,255,0.18),
          0 10px 24px rgba(0,0,0,0.35)
        `
        },
        onMouseEnter: (e)=>{
            const el = e.currentTarget;
            el.style.transform = "translateY(-1px)";
            el.style.filter = "brightness(1.02)";
            el.style.boxShadow = `
          inset 0 1px 0 rgba(255,255,255,0.78),
          inset 0 -1px 0 rgba(0,0,0,0.18),
          0 0 0 1px rgba(255,255,255,0.22),
          0 14px 30px rgba(0,0,0,0.38)
        `;
        },
        onMouseLeave: (e)=>{
            const el = e.currentTarget;
            el.style.transform = "translateY(0px)";
            el.style.filter = "brightness(1)";
            el.style.boxShadow = `
          inset 0 1px 0 rgba(255,255,255,0.70),
          inset 0 -1px 0 rgba(0,0,0,0.18),
          0 0 0 1px rgba(255,255,255,0.18),
          0 10px 24px rgba(0,0,0,0.35)
        `;
        },
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                "aria-hidden": true,
                className: "pointer-events-none absolute inset-[2px]",
                style: {
                    border: "1px solid rgba(255,255,255,0.45)",
                    opacity: 0.9
                }
            }, void 0, false, {
                fileName: "[project]/components/NvbLightButton.tsx",
                lineNumber: 76,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                "aria-hidden": true,
                className: "pointer-events-none absolute inset-0",
                style: {
                    background: "linear-gradient(90deg, rgba(255,255,255,0.00) 0%, rgba(255,255,255,0.20) 45%, rgba(255,255,255,0.06) 65%, rgba(255,255,255,0.00) 100%)",
                    opacity: 0.35
                }
            }, void 0, false, {
                fileName: "[project]/components/NvbLightButton.tsx",
                lineNumber: 86,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                className: "relative z-10 font-semibold tracking-wide",
                style: {
                    // bijna zwart maar grijs-tint (zoals jij wil)
                    color: "rgba(24,24,24,0.92)",
                    textShadow: "0 1px 0 rgba(255,255,255,0.55)"
                },
                children: label
            }, void 0, false, {
                fileName: "[project]/components/NvbLightButton.tsx",
                lineNumber: 96,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/components/NvbLightButton.tsx",
        lineNumber: 20,
        columnNumber: 5
    }, this);
}
}),
"[next]/internal/font/google/inter_a71219c2.module.css [app-ssr] (css module)", ((__turbopack_context__) => {

__turbopack_context__.v({
  "className": "inter_a71219c2-module__7w24HW__className",
});
}),
"[next]/internal/font/google/inter_a71219c2.js [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>__TURBOPACK__default__export__
]);
var __TURBOPACK__imported__module__$5b$next$5d2f$internal$2f$font$2f$google$2f$inter_a71219c2$2e$module$2e$css__$5b$app$2d$ssr$5d$__$28$css__module$29$__ = __turbopack_context__.i("[next]/internal/font/google/inter_a71219c2.module.css [app-ssr] (css module)");
;
const fontData = {
    className: __TURBOPACK__imported__module__$5b$next$5d2f$internal$2f$font$2f$google$2f$inter_a71219c2$2e$module$2e$css__$5b$app$2d$ssr$5d$__$28$css__module$29$__["default"].className,
    style: {
        fontFamily: "'Inter', 'Inter Fallback'",
        fontStyle: "normal"
    }
};
if (__TURBOPACK__imported__module__$5b$next$5d2f$internal$2f$font$2f$google$2f$inter_a71219c2$2e$module$2e$css__$5b$app$2d$ssr$5d$__$28$css__module$29$__["default"].variable != null) {
    fontData.variable = __TURBOPACK__imported__module__$5b$next$5d2f$internal$2f$font$2f$google$2f$inter_a71219c2$2e$module$2e$css__$5b$app$2d$ssr$5d$__$28$css__module$29$__["default"].variable;
}
const __TURBOPACK__default__export__ = fontData;
}),
"[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/page.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>MatchmakerMatchmakingPage
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/client/app-dir/link.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$image$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/image.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/navigation.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabaseClient$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/supabaseClient.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$api$2f$authedFetch$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/api/authedFetch.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$NvbDarkButton$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/NvbDarkButton.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$NvbLightButton$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/NvbLightButton.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$next$5d2f$internal$2f$font$2f$google$2f$inter_a71219c2$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[next]/internal/font/google/inter_a71219c2.js [app-ssr] (ecmascript)");
"use client";
;
;
;
;
;
;
;
;
;
;
const NVB_ORANGE = "#ff4d00";
function parseISODateOnly(d) {
    if (!d) return null;
    const s = String(d).trim();
    const dt = new Date(s.length === 10 ? `${s}T00:00:00` : s);
    return isNaN(dt.getTime()) ? null : dt;
}
function formatDateNl(d) {
    const dt = parseISODateOnly(d);
    if (!dt) {
        const raw = String(d ?? "").trim();
        if (/^\d{2}-\d{2}-\d{4}$/.test(raw)) return raw;
        return raw;
    }
    const dd = String(dt.getDate()).padStart(2, "0");
    const mm = String(dt.getMonth() + 1).padStart(2, "0");
    const yyyy = dt.getFullYear();
    return `${dd}-${mm}-${yyyy}`;
}
function calcAgeYearsOnDate(eventDate, birthDate) {
    let years = eventDate.getFullYear() - birthDate.getFullYear();
    const m = eventDate.getMonth() - birthDate.getMonth();
    if (m < 0 || m === 0 && eventDate.getDate() < birthDate.getDate()) years -= 1;
    if (years < 0 || !Number.isFinite(years)) return null;
    return years;
}
function ageAtEvent(ctx, side) {
    const event = parseISODateOnly(ctx?.evenement_datum);
    const birth = parseISODateOnly(ctx?.[`${side}_geboortedatum_fp`] ?? ctx?.[`${side}_geboortedatum_mm`]);
    if (!event || !birth) return "-";
    const years = calcAgeYearsOnDate(event, birth);
    return years == null ? "-" : String(years);
}
function safeText(v, fallback = "-") {
    const s = String(v ?? "").trim();
    return s.length ? s : fallback;
}
function licenseValueToOk(v) {
    if (v == null) return null;
    if (typeof v === "boolean") return v;
    if (typeof v === "number") return v > 0;
    const s = String(v).trim().toLowerCase();
    if (!s) return null;
    if ([
        "ja",
        "yes",
        "true",
        "geldig",
        "ok",
        "actief",
        "active"
    ].includes(s)) return true;
    if ([
        "nee",
        "no",
        "false",
        "ongeldig",
        "verlopen",
        "niet",
        "inactive",
        "inactief"
    ].includes(s)) return false;
    if (s.includes("valid") || s.includes("geldig") || s.includes("ok")) return true;
    if (s.includes("invalid") || s.includes("ongeldig") || s.includes("verlop")) return false;
    return null;
}
function isMissingLicentie(ctx, side) {
    if (!ctx) return false;
    const prefix = `${side}_`;
    const preferred = [
        `${prefix}licentie_ok`,
        `${prefix}licentie_geldig`,
        `${prefix}licentie`,
        `${prefix}licentie_status`,
        `${prefix}licentie_fp`,
        `${prefix}licentie_ja_nee`
    ];
    const keys = [
        ...preferred.filter((k)=>k in ctx),
        ...Object.keys(ctx).filter((k)=>k.startsWith(prefix) && k.toLowerCase().includes("licen"))
    ];
    if (keys.length === 0) return false;
    for (const k of keys){
        const ok = licenseValueToOk(ctx[k]);
        if (ok === true) return false;
    }
    for (const k of keys){
        const v = ctx[k];
        const ok = licenseValueToOk(v);
        if (ok === false) return true;
        if (v == null) return true;
        if (typeof v === "string" && !v.trim()) return true;
    }
    return false;
}
function isContextCompleet(ctx) {
    if (!ctx) return false;
    const required = [
        ctx?.rood_va_mm,
        ctx?.blauw_va_mm,
        ctx?.rood_naam_fp,
        ctx?.blauw_naam_fp,
        ctx?.rood_geboortedatum_fp,
        ctx?.blauw_geboortedatum_fp,
        ctx?.rood_geslacht,
        ctx?.blauw_geslacht,
        ctx?.evenement_datum
    ];
    return required.every((v)=>v != null && String(v).trim() !== "");
}
function normResultaat(v) {
    const s = String(v ?? "").trim().toLowerCase();
    if (!s) return "";
    if (s === "afkeur" || s === "afgekeur" || s === "afgekeurd" || s === "afkeuren") return "afgekeurd";
    if (s === "actie" || s === "waarschuwing") return "actie";
    if (s === "dispensatie" || s === "disp") return "dispensatie";
    if (s === "ok" || s === "goedgekeurd") return "ok";
    if (s === "info") return "ok";
    return s;
}
function hasDispensatieResultaat(resultaten) {
    return resultaten.some((r)=>normResultaat(r?.resultaat) === "dispensatie");
}
function statusPriority(status) {
    if (status === "afgekeurd") return 4;
    if (status === "dispensatie") return 3;
    if (status === "actie") return 2;
    if (status === "ok") return 1;
    return 0;
}
function statusFromResultaten(resultaten) {
    let best = "geen_info";
    for (const r of resultaten){
        const res = normResultaat(r?.resultaat);
        const mapped = res === "afgekeurd" ? "afgekeurd" : res === "dispensatie" ? "dispensatie" : res === "actie" ? "actie" : res === "ok" ? "ok" : "geen_info";
        if (statusPriority(mapped) > statusPriority(best)) best = mapped;
    }
    return best;
}
function statusFromResultatenOrOk(resultaten, ctxRow) {
    if (resultaten && resultaten.length > 0) {
        const resStatus = statusFromResultaten(resultaten);
        if (resStatus !== "geen_info") return resStatus;
    }
    if (!isContextCompleet(ctxRow)) return "geen_info";
    return "ok";
}
function isLicentieRow(r) {
    const code = String(r.rule_code ?? "").toLowerCase();
    const rule = String(r.rule ?? "").toLowerCase();
    const msg = String(r.boodschap ?? "").toLowerCase();
    const hay = `${code} ${rule} ${msg}`;
    return hay.includes("licentie") || hay.includes("license");
}
function HeaderBadge({ label, value, tone }) {
    const cls = tone === "red" ? "bg-red-500 text-zinc-900" : tone === "yellow" ? "bg-yellow-300 text-black" : tone === "orange" ? "bg-orange-600 text-zinc-900" : tone === "green" ? "bg-green-500 text-zinc-900" : tone === "blue" ? "bg-blue-700 text-white" : tone === "purple" ? "bg-purple-700 text-white" : tone === "white" ? "bg-white/90 text-black" : "bg-gray-500 text-zinc-900";
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
        className: `inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold ${cls}`,
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                children: label
            }, void 0, false, {
                fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/page.tsx",
                lineNumber: 253,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                className: "tabular-nums",
                children: value
            }, void 0, false, {
                fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/page.tsx",
                lineNumber: 254,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/page.tsx",
        lineNumber: 252,
        columnNumber: 5
    }, this);
}
function Chip({ label, tone }) {
    const cls = tone === "red" ? "bg-red-500 text-zinc-900" : tone === "yellow" ? "bg-yellow-300 text-black" : tone === "orange" ? "bg-orange-600 text-zinc-900" : tone === "green" ? "bg-green-500 text-zinc-900" : tone === "purple" ? "bg-purple-700 text-white" : tone === "blue" ? "bg-blue-700 text-white" : tone === "white" ? "bg-white/90 text-black" : "bg-gray-500 text-zinc-900";
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
        className: `px-2 py-1 rounded text-[11px] font-extrabold ${cls}`,
        children: label
    }, void 0, false, {
        fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/page.tsx",
        lineNumber: 284,
        columnNumber: 5
    }, this);
}
function StatusBadge({ status }) {
    if (status === "afgekeurd") return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(Chip, {
        label: "AFKEUR",
        tone: "red"
    }, void 0, false, {
        fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/page.tsx",
        lineNumber: 291,
        columnNumber: 38
    }, this);
    if (status === "dispensatie") return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(Chip, {
        label: "DISPENSATIE",
        tone: "orange"
    }, void 0, false, {
        fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/page.tsx",
        lineNumber: 292,
        columnNumber: 40
    }, this);
    if (status === "actie") return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(Chip, {
        label: "ACTIE",
        tone: "yellow"
    }, void 0, false, {
        fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/page.tsx",
        lineNumber: 293,
        columnNumber: 34
    }, this);
    if (status === "ok") return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(Chip, {
        label: "OK",
        tone: "green"
    }, void 0, false, {
        fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/page.tsx",
        lineNumber: 294,
        columnNumber: 31
    }, this);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(Chip, {
        label: "GEEN INFO",
        tone: "white"
    }, void 0, false, {
        fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/page.tsx",
        lineNumber: 295,
        columnNumber: 10
    }, this);
}
function FilterButton({ label, active, onClick, count, tone }) {
    const base = "inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-extrabold border transition";
    const activeCls = tone === "red" ? "bg-red-500 text-zinc-900 border-red-500" : tone === "yellow" ? "bg-yellow-300 text-black border-yellow-300" : tone === "orange" ? "bg-orange-600 text-zinc-900 border-orange-600" : tone === "green" ? "bg-green-500 text-zinc-900 border-green-500" : tone === "purple" ? "bg-purple-700 text-white border-purple-700" : tone === "blue" ? "bg-blue-700 text-white border-blue-700" : tone === "white" ? "bg-white text-black border-white" : tone === "gray" ? "bg-gray-500 text-zinc-900 border-gray-500" : "bg-zinc-100 text-zinc-900 border-zinc-300";
    const inactiveCls = tone === "red" ? "bg-white text-red-700 border-red-500/60 hover:bg-red-500/15" : tone === "yellow" ? "bg-white text-yellow-800 border-yellow-300/70 hover:bg-yellow-300/15" : tone === "orange" ? "bg-white text-orange-800 border-orange-500/70 hover:bg-orange-500/15" : tone === "green" ? "bg-white text-green-800 border-green-500/60 hover:bg-green-500/15" : tone === "purple" ? "bg-white text-purple-700 border-purple-700/60 hover:bg-purple-700/15" : tone === "blue" ? "bg-white text-blue-700 border-blue-500/60 hover:bg-blue-500/15" : tone === "white" ? "bg-white text-zinc-900 border-zinc-400 hover:bg-zinc-100" : tone === "gray" ? "bg-white text-slate-700 border-gray-500/60 hover:bg-gray-500/15" : "bg-white text-zinc-900 border-zinc-300 hover:bg-white";
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
        type: "button",
        onClick: onClick,
        className: `${base} ${active ? activeCls : inactiveCls}`,
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                children: label
            }, void 0, false, {
                fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/page.tsx",
                lineNumber: 358,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                className: `tabular-nums px-2 py-0.5 rounded-full ${active ? "bg-white" : "bg-zinc-100"}`,
                children: count
            }, void 0, false, {
                fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/page.tsx",
                lineNumber: 359,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/page.tsx",
        lineNumber: 353,
        columnNumber: 5
    }, this);
}
function isVerbodRow(r) {
    const code = String(r.rule_code ?? "").toUpperCase();
    const rule = String(r.rule ?? "").toUpperCase();
    const msg = String(r.boodschap ?? "").toUpperCase();
    if (code.includes("STARTVERBOD")) return true;
    if (rule.includes("STARTVERBOD")) return true;
    if (msg.includes("STARTVERBOD")) return true;
    if (code.includes("VERBOD")) return true;
    if (rule.includes("VERBOD")) return true;
    if (msg.includes("VERBOD")) return true;
    if (rule.includes("NIET START")) return true;
    if (msg.includes("NIET START")) return true;
    return false;
}
function isGeenTegenstander(ctx) {
    const blauwVa = String(ctx?.blauw_va_mm ?? "").trim();
    const blauwNaam = String(ctx?.blauw_naam_fp ?? ctx?.blauw_naam_mm ?? "").trim();
    const roodVa = String(ctx?.rood_va_mm ?? "").trim();
    const roodNaam = String(ctx?.rood_naam_fp ?? ctx?.rood_naam_mm ?? "").trim();
    const heeftRood = !!(roodVa || roodNaam);
    const heeftBlauw = !!(blauwVa || blauwNaam);
    return heeftRood && !heeftBlauw || !heeftRood && heeftBlauw;
}
function parseMinutesFromText(text) {
    const m = String(text).match(/(\d+)\s*min/i);
    if (!m) return null;
    const n = Number(m[1]);
    return Number.isFinite(n) ? n : null;
}
function formatQuarterHoursFromMinutes(mins) {
    const rounded = Math.round(mins / 15) * 15;
    const h = Math.floor(rounded / 60);
    const m = rounded % 60;
    const quarters = Math.round(m / 15);
    const frac = quarters === 0 ? "" : quarters === 1 ? " 1/4" : quarters === 2 ? " 1/2" : " 3/4";
    const prettyFrac = `${h}${frac} uur`;
    const hhmm = `${h}u ${String(m).padStart(2, "0")}m`;
    return `${prettyFrac} (${hhmm}, kwartier-afronding)`;
}
function isGalaDuurRow(r) {
    const code = String(r.rule_code ?? "").toUpperCase();
    const rule = String(r.rule ?? "").toUpperCase();
    const msg = String(r.boodschap ?? "").toUpperCase();
    if (code.includes("GALA") && code.includes("DUUR")) return true;
    if (code.includes("EVENEMENT") && code.includes("DUUR")) return true;
    if (code.includes("TIJDSDUUR")) return true;
    if (rule.includes("GALA") && rule.includes("DUUR")) return true;
    if (rule.includes("TIJDSDUUR")) return true;
    if (rule.includes("EVENEMENT") && rule.includes("DUUR")) return true;
    if (msg.includes("GALA") && msg.includes("DUUR")) return true;
    if (msg.includes("TIJDSDUUR")) return true;
    if (msg.includes("EVENEMENT") && msg.includes("DUUR")) return true;
    if (rule.includes("DUURT TE LANG")) return true;
    if (msg.includes("DUURT TE LANG")) return true;
    return false;
}
function buildGalaDuurSamenvatting(runMeldingen) {
    const hit = runMeldingen.find(isGalaDuurRow);
    if (!hit?.boodschap) return null;
    const mins = parseMinutesFromText(hit.boodschap);
    const approvalMin = 390;
    const maxMin = 510;
    if (!mins) {
        return {
            mins: null,
            needsApproval: true,
            overMax: false,
            text: hit.boodschap
        };
    }
    const needsApproval = mins > approvalMin;
    const overMax = mins > maxMin;
    let extra = "";
    if (overMax) extra = "⚠️ Overschrijdt max 8.5 uur (510 min) — AFKEUR.";
    else if (needsApproval) extra = "⚠️ Boven 6.5 uur: Superadmin-goedkeuring nodig.";
    else extra = "Binnen 6.5 uur (geen goedkeuring nodig).";
    const q = formatQuarterHoursFromMinutes(mins);
    return {
        mins,
        needsApproval,
        overMax,
        text: `Tijdsduur evenement: ${q}. ${extra}`
    };
}
function buildCompactRunMeldingen(runMeldingen) {
    if (!runMeldingen?.length) return [];
    const galaRows = runMeldingen.filter(isGalaDuurRow);
    const rest = runMeldingen.filter((r)=>!isGalaDuurRow(r));
    if (galaRows.length === 0) return runMeldingen;
    const sum = buildGalaDuurSamenvatting(galaRows);
    const mins = sum?.mins ?? parseMinutesFromText(galaRows.find((r)=>r?.boodschap)?.boodschap ?? "") ?? null;
    const approvalMin = 390;
    const maxMin = 510;
    const needsApproval = mins != null ? mins > approvalMin : true;
    const overMax = mins != null ? mins > maxMin : false;
    const resultaat = overMax ? "afgekeurd" : needsApproval ? "actie" : "ok";
    const q = mins != null ? formatQuarterHoursFromMinutes(mins) : null;
    const compactMsg = q ? `Geschatte gala-duur: ${q}. ${overMax ? "Overschrijdt max 8.5 uur — AFKEUR." : needsApproval ? "Boven 6.5 uur — Hoofdofficial nodig / actie." : "Binnen 6.5 uur (geen goedkeuring nodig)."}` : sum?.text ?? galaRows.find((r)=>r?.boodschap)?.boodschap ?? "";
    const merged = {
        partij_nr: null,
        hoek: null,
        rule: "Gala tijdsduur",
        rule_code: "GALA_DUUR",
        resultaat,
        boodschap: compactMsg
    };
    return [
        merged,
        ...rest
    ];
}
function DarkActionButton({ label, onClick, tone = "orange", title, disabled }) {
    const border = tone === "green" ? "rgba(34,197,94,0.85)" : tone === "purple" ? "rgba(147,51,234,0.85)" : tone === "red" ? "rgba(239,68,68,0.85)" : tone === "silver" ? "rgba(220,220,220,0.70)" : "rgba(255,77,0,0.85)";
    const text = tone === "silver" ? "rgba(240,240,240,0.95)" : tone === "orange" ? "rgba(255,210,190,0.95)" : "rgba(240,240,240,0.95)";
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
        type: "button",
        disabled: !!disabled,
        title: title,
        onClick: onClick,
        className: `px-3 py-1.5 rounded font-extrabold text-sm transition ${disabled ? "opacity-50 cursor-not-allowed" : "hover:opacity-90"}`,
        style: {
            background: "rgba(0,0,0,0.55)",
            border: `1px solid ${border}`,
            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06)",
            color: text
        },
        children: label
    }, void 0, false, {
        fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/page.tsx",
        lineNumber: 533,
        columnNumber: 5
    }, this);
}
function Field({ label, value, onChange, placeholder, type = "text" }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
        className: "block",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "text-xs font-semibold text-zinc-700 mb-1",
                children: label
            }, void 0, false, {
                fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/page.tsx",
                lineNumber: 568,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                value: value,
                onChange: (e)=>onChange(e.target.value),
                placeholder: placeholder,
                type: type,
                className: "w-full rounded-lg px-3 py-2 bg-white text-zinc-900 border border-zinc-300 focus:outline-none focus:border-white/30"
            }, void 0, false, {
                fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/page.tsx",
                lineNumber: 569,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/page.tsx",
        lineNumber: 567,
        columnNumber: 5
    }, this);
}
function MatchmakerMatchmakingPage() {
    const params = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useParams"])();
    const router = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRouter"])();
    const matchmakingId = params?.matchmakingId;
    const [reloadTick, setReloadTick] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(0);
    const [loading, setLoading] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(true);
    const [run, setRun] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(null);
    const [evenementNaam, setEvenementNaam] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(null);
    const [evenementDatum, setEvenementDatum] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(null);
    const [rows, setRows] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])([]);
    const [statusByPartij, setStatusByPartij] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])({});
    const [runMeldingen, setRunMeldingen] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])([]);
    const [error, setError] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(null);
    const [msg, setMsg] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])("");
    const [busyPartij, setBusyPartij] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])({});
    const [hasDispByPartij, setHasDispByPartij] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])({});
    const [dispRequestByPartij, setDispRequestByPartij] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])({});
    const [dispResultaatByPartij, setDispResultaatByPartij] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])({});
    const [countByPartij, setCountByPartij] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])({});
    const [licentieStatusByPartij, setLicentieStatusByPartij] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])({});
    const [verbodByPartij, setVerbodByPartij] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])({});
    const [filter, setFilter] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])("all");
    const [search, setSearch] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])("");
    const [showAdd, setShowAdd] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(false);
    const [addBusy, setAddBusy] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(false);
    const [fDiscipline, setFDiscipline] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])("");
    const [fKlasse, setFKlasse] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])("");
    const [fRoodNaam, setFRoodNaam] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])("");
    const [fRoodGym, setFRoodGym] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])("");
    const [fRoodVa, setFRoodVa] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])("");
    const [fRoodKg, setFRoodKg] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])("");
    const [fBlauwNaam, setFBlauwNaam] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])("");
    const [fBlauwGym, setFBlauwGym] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])("");
    const [fBlauwVa, setFBlauwVa] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])("");
    const [fBlauwKg, setFBlauwKg] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])("");
    const [fMaxKg, setFMaxKg] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])("");
    const [releaseBusy, setReleaseBusy] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(false);
    const [releaseMsg, setReleaseMsg] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(null);
    async function getAccessToken() {
        const { data } = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabaseClient$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["supabase"].auth.getSession();
        return data.session?.access_token ?? null;
    }
    const subtitle = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useMemo"])(()=>{
        const naam = (evenementNaam ?? "").trim();
        const datum = formatDateNl(evenementDatum);
        if (naam && datum) return `${naam} ${datum}`;
        if (naam) return naam;
        if (datum) return datum;
        return "-";
    }, [
        evenementNaam,
        evenementDatum
    ]);
    const separator = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useMemo"])(()=>({
            height: "1px",
            background: "linear-gradient(to right, transparent, rgba(220,220,220,0.22), transparent)"
        }), []);
    function openReportHtml() {
        router.push(`/dashboard/admin/controle/${encodeURIComponent(matchmakingId)}/rapport`);
    }
    function openExcel() {
        window.open(`/api/rapport/excel?matchmaking_id=${encodeURIComponent(matchmakingId)}`, "_blank");
    }
    function openSportdataCsv() {
        window.open(`/api/rapport/sportdata-csv?matchmaking_id=${encodeURIComponent(matchmakingId)}`, "_blank");
    }
    async function addPartijSubmit() {
        setError(null);
        setMsg("");
        if (!matchmakingId) {
            setError("matchmakingId ontbreekt.");
            return;
        }
        const required = [
            [
                "Discipline",
                fDiscipline
            ],
            [
                "Klasse",
                fKlasse
            ],
            [
                "Rood naam",
                fRoodNaam
            ],
            [
                "Rood sportschool",
                fRoodGym
            ],
            [
                "Rood VA",
                fRoodVa
            ],
            [
                "Rood KG",
                fRoodKg
            ],
            [
                "Blauw naam",
                fBlauwNaam
            ],
            [
                "Blauw sportschool",
                fBlauwGym
            ],
            [
                "Blauw VA",
                fBlauwVa
            ],
            [
                "Blauw KG",
                fBlauwKg
            ],
            [
                "Max gewicht",
                fMaxKg
            ]
        ];
        const miss = required.find(([, v])=>!String(v ?? "").trim());
        if (miss) {
            setError(`Veld ontbreekt: ${miss[0]}`);
            return;
        }
        const toNum = (s)=>{
            const n = Number(String(s).replace(",", "."));
            return Number.isFinite(n) ? n : null;
        };
        const payload = {
            matchmaking_id: matchmakingId,
            discipline: fDiscipline.trim(),
            klasse: fKlasse.trim(),
            rood_naam: fRoodNaam.trim(),
            rood_gym: fRoodGym.trim(),
            va_rood: fRoodVa.trim(),
            rood_gewicht: toNum(fRoodKg),
            blauw_naam: fBlauwNaam.trim(),
            blauw_gym: fBlauwGym.trim(),
            va_blauw: fBlauwVa.trim(),
            blauw_gewicht: toNum(fBlauwKg),
            max_gewicht: toNum(fMaxKg)
        };
        if (payload.rood_gewicht == null || payload.blauw_gewicht == null || payload.max_gewicht == null) {
            setError("KG velden moeten een geldig getal zijn (bijv. 71.5).");
            return;
        }
        setAddBusy(true);
        try {
            const token = await getAccessToken();
            if (!token) throw new Error("Niet ingelogd.");
            const resp = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$api$2f$authedFetch$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["authedFetch"])("/api/matchmaking/add-bout", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });
            const json = await resp.json().catch(()=>({}));
            if (!resp.ok) throw new Error(json?.error ?? "Partij toevoegen mislukt");
            setMsg("✅ Partij toegevoegd.");
            setShowAdd(false);
            setFDiscipline("");
            setFKlasse("");
            setFRoodNaam("");
            setFRoodGym("");
            setFRoodVa("");
            setFRoodKg("");
            setFBlauwNaam("");
            setFBlauwGym("");
            setFBlauwVa("");
            setFBlauwKg("");
            setFMaxKg("");
            setReloadTick((x)=>x + 1);
        } catch (e) {
            setError(e?.message ?? String(e));
        } finally{
            setAddBusy(false);
        }
    }
    async function deletePartij(partijNr, boutId) {
        if (!confirm(`Partij ${partijNr} verwijderen?`)) return;
        setBusyPartij((prev)=>({
                ...prev,
                [partijNr]: "delete"
            }));
        setError(null);
        try {
            const token = await getAccessToken();
            if (!token) throw new Error("Niet ingelogd.");
            const resp = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$api$2f$authedFetch$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["authedFetch"])("/api/matchmaking/delete-partij", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    matchmaking_id: matchmakingId,
                    partij_nr: partijNr,
                    controle_run_id: run?.id ?? null,
                    bout_id: boutId ?? null
                })
            });
            const json = await resp.json().catch(()=>({}));
            if (!resp.ok) throw new Error(json?.error ?? "Verwijderen mislukt.");
            setMsg(`✅ Partij ${partijNr} verwijderd.`);
            setReloadTick((x)=>x + 1);
        } catch (e) {
            setError(e?.message ?? String(e));
        } finally{
            setBusyPartij((prev)=>{
                const next = {
                    ...prev
                };
                delete next[partijNr];
                return next;
            });
        }
    }
    async function stuurDoorNaarOfficials() {
        if (!matchmakingId || releaseBusy) return;
        setReleaseBusy(true);
        setReleaseMsg(null);
        setError(null);
        try {
            const token = await getAccessToken();
            if (!token) throw new Error("Niet ingelogd.");
            const resp = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$api$2f$authedFetch$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["authedFetch"])("/api/officials/release-matchmaking", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    matchmaking_id: matchmakingId
                })
            });
            const json = await resp.json().catch(()=>({}));
            if (!resp.ok) {
                throw new Error(json?.error ?? "Doorsturen naar officials mislukt.");
            }
            const successMsg = json?.message ?? "✅ Matchmaking is doorgestuurd naar officials en staat nu in het official overzicht.";
            setReleaseMsg(successMsg);
            setMsg(successMsg);
        } catch (e) {
            const message = e?.message ?? String(e) ?? "Onbekende fout.";
            setReleaseMsg(`❌ ${message}`);
            setError(message);
        } finally{
            setReleaseBusy(false);
        }
    }
    async function load() {
        setLoading(true);
        setError(null);
        setMsg("");
        try {
            if (!matchmakingId) {
                setRows([]);
                setRun(null);
                setEvenementNaam(null);
                setEvenementDatum(null);
                setStatusByPartij({});
                setRunMeldingen([]);
                setHasDispByPartij({});
                setDispRequestByPartij({});
                setDispResultaatByPartij({});
                setCountByPartij({});
                setVerbodByPartij({});
                setLicentieStatusByPartij({});
                return;
            }
            try {
                const { data: ups, error: upErr } = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabaseClient$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["supabase"].from("matchmaking_uploads").select("evenement_naam, evenement_datum, event_id").eq("matchmaking_id", matchmakingId).order("uploaded_at", {
                    ascending: false
                }).limit(1);
                if (upErr) throw upErr;
                const up = (ups ?? [])?.[0];
                let naam = String(up?.evenement_naam ?? "").trim() || null;
                let datum = String(up?.evenement_datum ?? "").trim() || null;
                const eventId = String(up?.event_id ?? "").trim() || null;
                if (eventId && (!naam || !datum)) {
                    const { data: ev, error: evErr } = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabaseClient$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["supabase"].from("events").select("naam, datum").eq("id", eventId).maybeSingle();
                    if (evErr) throw evErr;
                    if (!naam) naam = String(ev?.naam ?? "").trim() || null;
                    if (!datum) datum = String(ev?.datum ?? "").trim() || null;
                }
                setEvenementNaam(naam);
                setEvenementDatum(datum);
            } catch  {
                setEvenementNaam(null);
                setEvenementDatum(null);
            }
            const { data: lastCtxRows, error: lastErr } = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabaseClient$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["supabase"].from("matchmaker_fighter_context").select("controle_run_id, created_at").eq("matchmaking_id", matchmakingId).order("created_at", {
                ascending: false
            }).limit(1);
            if (lastErr) throw lastErr;
            const latestControleRunId = lastCtxRows?.[0]?.controle_run_id ? String(lastCtxRows[0].controle_run_id) : null;
            setRun(latestControleRunId ? {
                id: latestControleRunId,
                matchmaking_id: matchmakingId,
                status: "unknown",
                gestart_op: null,
                afgerond_op: null,
                run_type: null
            } : null);
            let ctxQuery = __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabaseClient$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["supabase"].from("matchmaker_matches").select("*").eq("matchmaking_id", matchmakingId);
            if (latestControleRunId) ctxQuery = ctxQuery.eq("controle_run_id", latestControleRunId);
            const { data: ctxRows, error: ctxErr } = await ctxQuery.order("partij_nr", {
                ascending: true
            });
            if (ctxErr) throw ctxErr;
            const ctxList = ctxRows ?? [];
            setRows(ctxList);
            const map = {};
            const ctxByPn = {};
            for (const r of ctxList){
                const pn = Number(r.partij_nr);
                if (!Number.isFinite(pn)) continue;
                ctxByPn[pn] = r;
                map[pn] = isContextCompleet(r) ? "ok" : "geen_info";
            }
            if (!latestControleRunId) {
                setStatusByPartij(map);
                setRunMeldingen([]);
                setHasDispByPartij({});
                setDispRequestByPartij({});
                setDispResultaatByPartij({});
                setCountByPartij({});
                setVerbodByPartij({});
                setLicentieStatusByPartij({});
                return;
            }
            const { data: resRows, error: resErr } = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabaseClient$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["supabase"].from("matchmaker_controle_resultaten").select("partij_nr, bout_id, hoek, resultaat, rule, rule_code, boodschap").eq("controle_run_id", latestControleRunId);
            if (resErr) throw resErr;
            const allRes = resRows ?? [];
            const runRows = allRes.filter((r)=>{
                const pn = r?.partij_nr;
                const isRunPn = pn == null || Number(pn) === 0;
                const isRunBout = r?.bout_id == null;
                return isRunPn && isRunBout;
            });
            setRunMeldingen(runRows);
            const resByPn = {};
            for (const rr of allRes){
                const pn = Number(rr.partij_nr);
                if (!Number.isFinite(pn) || pn <= 0) continue;
                if (!resByPn[pn]) resByPn[pn] = [];
                resByPn[pn].push(rr);
            }
            const statusMap = {
                ...map
            };
            const verbodMap = {};
            const countMap = {};
            const dispResultMap = {};
            const licMap = {};
            for (const pnStr of Object.keys(ctxByPn)){
                const pn = Number(pnStr);
                const ctx = ctxByPn[pn];
                const rr = resByPn[pn] ?? [];
                statusMap[pn] = statusFromResultatenOrOk(rr, ctx);
                verbodMap[pn] = rr.some(isVerbodRow);
                countMap[pn] = rr.length;
                dispResultMap[pn] = hasDispensatieResultaat(rr);
                const licRows = rr.filter(isLicentieRow);
                if (licRows.length > 0) {
                    const hasLicIssue = licRows.some((x)=>{
                        const res = normResultaat(x.resultaat);
                        return res === "afgekeurd" || res === "actie" || res === "dispensatie";
                    });
                    const hasLicOk = licRows.some((x)=>normResultaat(x.resultaat) === "ok");
                    if (hasLicIssue) licMap[pn] = "issue";
                    else if (hasLicOk) licMap[pn] = "ok";
                }
            }
            setStatusByPartij(statusMap);
            setVerbodByPartij(verbodMap);
            setCountByPartij(countMap);
            setDispResultaatByPartij(dispResultMap);
            setLicentieStatusByPartij(licMap);
            try {
                const { data: dispHits } = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabaseClient$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["supabase"].from("dispensatie_hits").select("partij_nr").eq("matchmaking_id", matchmakingId);
                const m = {};
                for (const d of dispHits ?? []){
                    const pn = Number(d?.partij_nr);
                    if (Number.isFinite(pn)) m[pn] = true;
                }
                setHasDispByPartij(m);
            } catch  {
                setHasDispByPartij({});
            }
            try {
                const { data: dispReq } = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabaseClient$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["supabase"].from("dispensatie_requests").select("partij_nr").eq("matchmaking_id", matchmakingId);
                const m = {};
                for (const d of dispReq ?? []){
                    const pn = Number(d?.partij_nr);
                    if (Number.isFinite(pn)) m[pn] = true;
                }
                setDispRequestByPartij(m);
            } catch  {
                setDispRequestByPartij({});
            }
        } catch (e) {
            setError(e?.message ?? String(e));
        } finally{
            setLoading(false);
        }
    }
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
        matchmakingId,
        reloadTick
    ]);
    const galaDuur = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useMemo"])(()=>buildGalaDuurSamenvatting(runMeldingen), [
        runMeldingen
    ]);
    const compactRunMeldingen = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useMemo"])(()=>buildCompactRunMeldingen(runMeldingen), [
        runMeldingen
    ]);
    const rowsByPartijNr = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useMemo"])(()=>{
        return [
            ...rows
        ].sort((a, b)=>Number(a.partij_nr ?? 0) - Number(b.partij_nr ?? 0));
    }, [
        rows
    ]);
    const missingLicentieByPartij = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useMemo"])(()=>{
        const m = {};
        for (const r of rows){
            const pn = Number(r.partij_nr);
            if (!Number.isFinite(pn)) continue;
            const licStatus = licentieStatusByPartij[pn];
            if (licStatus === "ok") {
                m[pn] = false;
                continue;
            }
            if (licStatus === "issue") {
                m[pn] = true;
                continue;
            }
            const rood = isMissingLicentie(r, "rood");
            const blauw = isMissingLicentie(r, "blauw");
            if (rood || blauw) m[pn] = true;
        }
        return m;
    }, [
        rows,
        licentieStatusByPartij
    ]);
    const anyDispensatieByPartij = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useMemo"])(()=>{
        const m = {};
        for (const r of rows){
            const pn = Number(r.partij_nr);
            if (!Number.isFinite(pn)) continue;
            m[pn] = !!dispResultaatByPartij[pn] || !!hasDispByPartij[pn] || !!dispRequestByPartij[pn] || statusByPartij[pn] === "dispensatie";
        }
        return m;
    }, [
        rows,
        dispResultaatByPartij,
        hasDispByPartij,
        dispRequestByPartij,
        statusByPartij
    ]);
    const totals = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useMemo"])(()=>{
        let meldingen_totaal = 0;
        let partijen_met_melding = 0;
        let ok = 0, actie = 0, afk = 0, disp = 0, geen = 0, verbod = 0, geen_licentie = 0;
        for (const r of rows){
            const pn = Number(r.partij_nr);
            if (!Number.isFinite(pn)) continue;
            const s = statusByPartij[pn] ?? "geen_info";
            if (s === "afgekeurd") afk++;
            else if (s === "dispensatie") disp++;
            else if (s === "actie") actie++;
            else if (s === "ok") ok++;
            else geen++;
            if (anyDispensatieByPartij[pn] && s !== "dispensatie") {
                disp++;
            }
            if (verbodByPartij[pn]) verbod++;
            if (missingLicentieByPartij[pn]) geen_licentie++;
            const cnt = countByPartij[pn] ?? 0;
            meldingen_totaal += cnt;
            if (cnt > 0) partijen_met_melding++;
        }
        return {
            totaal: rows.length,
            meldingen_totaal,
            partijen_met_melding,
            verbod,
            afk,
            dispensatie: disp,
            actie,
            ok,
            geen,
            geen_licentie
        };
    }, [
        rows,
        statusByPartij,
        anyDispensatieByPartij,
        verbodByPartij,
        countByPartij,
        missingLicentieByPartij
    ]);
    const filterCounts = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useMemo"])(()=>{
        let afk = 0, actie = 0, ok = 0, disp = 0, geen = 0, verbod = 0, geen_licentie = 0;
        for (const r of rows){
            const pn = Number(r.partij_nr);
            if (!Number.isFinite(pn)) continue;
            const s = statusByPartij[pn] ?? "geen_info";
            if (s === "afgekeurd") afk++;
            else if (s === "dispensatie") disp++;
            else if (s === "actie") actie++;
            else if (s === "ok") ok++;
            else geen++;
            if (anyDispensatieByPartij[pn] && s !== "dispensatie") disp++;
            if (verbodByPartij[pn]) verbod++;
            if (missingLicentieByPartij[pn]) geen_licentie++;
        }
        return {
            all: rows.length,
            verbod,
            afgekeurd: afk,
            dispensatie: disp,
            actie,
            ok,
            geen_info: geen,
            geen_licentie
        };
    }, [
        rows,
        statusByPartij,
        anyDispensatieByPartij,
        verbodByPartij,
        missingLicentieByPartij
    ]);
    const filteredRows = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useMemo"])(()=>{
        const q = search.trim().toLowerCase();
        const base = rowsByPartijNr.filter((r)=>{
            const pn = Number(r.partij_nr);
            if (!Number.isFinite(pn)) return false;
            if (filter === "dispensatie") {
                return !!anyDispensatieByPartij[pn];
            }
            if (filter === "verbod") return !!verbodByPartij[pn];
            if (filter === "geen_licentie") return !!missingLicentieByPartij[pn];
            if (filter !== "all") {
                const s = statusByPartij[pn] ?? "geen_info";
                if (s !== filter) return false;
            }
            return true;
        });
        if (!q) return base;
        const hay = (r)=>{
            const parts = [
                r.rood_naam_fp,
                r.rood_naam_mm,
                r.rood_naam,
                r.rood_gym_fp,
                r.rood_gym_mm,
                r.rood_va_mm,
                r.blauw_naam_fp,
                r.blauw_naam_mm,
                r.blauw_naam,
                r.blauw_gym_fp,
                r.blauw_gym_mm,
                r.blauw_va_mm
            ].map((v)=>String(v ?? "").trim().toLowerCase()).filter(Boolean);
            return parts.join(" ");
        };
        return base.filter((r)=>hay(r).includes(q));
    }, [
        rowsByPartijNr,
        filter,
        statusByPartij,
        anyDispensatieByPartij,
        verbodByPartij,
        missingLicentieByPartij,
        search
    ]);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("main", {
        className: "flex items-center justify-center min-h-screen px-4 py-8",
        style: {
            background: "#eef0f3"
        },
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "relative w-full max-w-[1280px]",
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "pointer-events-none absolute -inset-10 rounded-[48px]",
                    style: {
                        boxShadow: "0 0 110px rgba(220,220,220,0.26), 0 0 180px rgba(220,220,220,0.16), 0 0 140px rgba(255,77,0,0.04)"
                    }
                }, void 0, false, {
                    fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/page.tsx",
                    lineNumber: 1256,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "relative rounded-[42px] p-[10px]",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "absolute inset-0 rounded-[42px]",
                            style: {
                                background: "linear-gradient(180deg, #d0d0d0 0%, #8f8f8f 50%, #2a2a2a 100%)",
                                boxShadow: `
                0 0 0 1px rgba(255,255,255,0.35),
                0 0 0 2px rgba(120,120,120,0.20),
                0 30px 80px rgba(0,0,0,0.70)
              `
                            }
                        }, void 0, false, {
                            fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/page.tsx",
                            lineNumber: 1265,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "relative rounded-[34px] p-[2px]",
                            style: {
                                background: "linear-gradient(135deg, rgba(245,245,245,0.95) 0%, rgba(200,200,200,0.65) 40%, rgba(150,150,150,0.45) 70%, rgba(255,77,0,0.10) 100%)"
                            },
                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "rounded-[32px] px-6 py-5",
                                style: {
                                    background: "linear-gradient(180deg, #f8fafc 0%, #eef2f7 100%)",
                                    border: "2px solid rgba(63,63,70,0.30)",
                                    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.95)",
                                    color: "#111827"
                                },
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "flex items-center justify-between gap-6 px-5 py-5",
                                        style: {
                                            background: "linear-gradient(180deg, #34343a 0%, #23232a 100%)",
                                            border: "1px solid rgba(255,255,255,0.08)",
                                            boxShadow: "0 18px 34px rgba(0,0,0,0.22)",
                                            color: "#fff"
                                        },
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "flex items-center gap-4 min-w-[240px]",
                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$image$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"], {
                                                    src: "/branding/fightsupport/excel-logo.png",
                                                    width: 180,
                                                    height: 48,
                                                    alt: "FightSupport",
                                                    priority: true,
                                                    style: {
                                                        width: "auto",
                                                        height: "44px",
                                                        objectFit: "contain"
                                                    }
                                                }, void 0, false, {
                                                    fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/page.tsx",
                                                    lineNumber: 1303,
                                                    columnNumber: 19
                                                }, this)
                                            }, void 0, false, {
                                                fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/page.tsx",
                                                lineNumber: 1302,
                                                columnNumber: 17
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "flex flex-1 items-center justify-end gap-3 flex-wrap",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(DarkActionButton, {
                                                        label: releaseBusy ? "Doorsturen…" : "→ Bondteam",
                                                        tone: "orange",
                                                        onClick: stuurDoorNaarOfficials,
                                                        disabled: releaseBusy
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/page.tsx",
                                                        lineNumber: 1314,
                                                        columnNumber: 19
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(DarkActionButton, {
                                                        label: "Rapportage",
                                                        tone: "orange",
                                                        onClick: openReportHtml
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/page.tsx",
                                                        lineNumber: 1320,
                                                        columnNumber: 19
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(DarkActionButton, {
                                                        label: "Excel",
                                                        tone: "green",
                                                        onClick: openExcel
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/page.tsx",
                                                        lineNumber: 1325,
                                                        columnNumber: 19
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(DarkActionButton, {
                                                        label: "CSV Sportdata",
                                                        tone: "purple",
                                                        onClick: openSportdataCsv
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/page.tsx",
                                                        lineNumber: 1330,
                                                        columnNumber: 19
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/page.tsx",
                                                lineNumber: 1313,
                                                columnNumber: 17
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/page.tsx",
                                        lineNumber: 1293,
                                        columnNumber: 15
                                    }, this),
                                    releaseMsg ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "mt-4 rounded-2xl border px-4 py-3 text-sm font-semibold",
                                        style: {
                                            background: releaseMsg.startsWith("✅") ? "rgba(34,197,94,0.10)" : "rgba(239,68,68,0.10)",
                                            color: releaseMsg.startsWith("✅") ? "#166534" : "#991b1b",
                                            borderColor: releaseMsg.startsWith("✅") ? "rgba(34,197,94,0.35)" : "rgba(239,68,68,0.35)"
                                        },
                                        children: releaseMsg
                                    }, void 0, false, {
                                        fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/page.tsx",
                                        lineNumber: 1339,
                                        columnNumber: 17
                                    }, this) : null,
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "pt-6",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: `${__TURBOPACK__imported__module__$5b$next$5d2f$internal$2f$font$2f$google$2f$inter_a71219c2$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"].className} text-center`,
                                                style: {
                                                    color: NVB_ORANGE,
                                                    fontSize: 22,
                                                    fontWeight: 900,
                                                    letterSpacing: "0.12em",
                                                    textTransform: "uppercase"
                                                },
                                                children: "Matchmaking"
                                            }, void 0, false, {
                                                fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/page.tsx",
                                                lineNumber: 1356,
                                                columnNumber: 17
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "mt-5 flex flex-wrap items-center justify-center gap-3",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                        type: "button",
                                                        onClick: ()=>router.push("/dashboard/matchmaker/matchmaking"),
                                                        className: `${__TURBOPACK__imported__module__$5b$next$5d2f$internal$2f$font$2f$google$2f$inter_a71219c2$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"].className} px-5 py-3 text-[15px] font-extrabold tracking-[0.02em] text-zinc-900 transition hover:translate-y-[-1px]`,
                                                        style: {
                                                            background: "linear-gradient(180deg, #f2f2f2 0%, #cfcfcf 48%, #a8a8a8 100%)",
                                                            border: "1px solid rgba(82,82,91,0.45)",
                                                            borderRadius: 0,
                                                            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.85), 0 10px 18px rgba(0,0,0,0.12)",
                                                            minWidth: 180
                                                        },
                                                        children: "← Terug naar overzicht"
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/page.tsx",
                                                        lineNumber: 1370,
                                                        columnNumber: 19
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        className: __TURBOPACK__imported__module__$5b$next$5d2f$internal$2f$font$2f$google$2f$inter_a71219c2$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"].className,
                                                        style: {
                                                            fontSize: 24,
                                                            fontWeight: 900,
                                                            letterSpacing: "0.02em",
                                                            color: "#1f1f23",
                                                            display: "inline-block",
                                                            padding: "12px 22px",
                                                            borderRadius: 0,
                                                            background: "linear-gradient(180deg, rgba(255,255,255,0.92) 0%, rgba(242,242,242,0.96) 100%)",
                                                            border: "1px solid rgba(42,42,46,0.22)",
                                                            boxShadow: "0 12px 24px rgba(0,0,0,0.08)"
                                                        },
                                                        children: safeText(subtitle, "Onbekend evenement")
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/page.tsx",
                                                        lineNumber: 1385,
                                                        columnNumber: 19
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                        type: "button",
                                                        onClick: ()=>setShowAdd(true),
                                                        className: `${__TURBOPACK__imported__module__$5b$next$5d2f$internal$2f$font$2f$google$2f$inter_a71219c2$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"].className} px-5 py-3 text-[15px] font-extrabold tracking-[0.02em] text-white transition hover:translate-y-[-1px]`,
                                                        style: {
                                                            background: "linear-gradient(180deg, #ff6a14 0%, #ff4d00 55%, #df3f00 100%)",
                                                            border: "1px solid rgba(150,40,0,0.55)",
                                                            borderRadius: 0,
                                                            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.18), 0 12px 22px rgba(255,77,0,0.18)",
                                                            minWidth: 180
                                                        },
                                                        children: "Partij toevoegen"
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/page.tsx",
                                                        lineNumber: 1403,
                                                        columnNumber: 19
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"], {
                                                        href: `/dashboard/officials/weegstation/${encodeURIComponent(matchmakingId)}`,
                                                        className: `${__TURBOPACK__imported__module__$5b$next$5d2f$internal$2f$font$2f$google$2f$inter_a71219c2$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"].className} px-5 py-3 text-[15px] font-extrabold tracking-[0.02em] text-white transition hover:translate-y-[-1px]`,
                                                        style: {
                                                            background: "linear-gradient(180deg, #1e40af 0%, #1d4ed8 55%, #1e3a8a 100%)",
                                                            border: "1px solid rgba(30,64,175,0.55)",
                                                            borderRadius: 0,
                                                            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.18), 0 12px 22px rgba(30,64,175,0.18)",
                                                            minWidth: 180,
                                                            textDecoration: "none",
                                                            display: "inline-flex",
                                                            alignItems: "center",
                                                            justifyContent: "center"
                                                        },
                                                        children: "⚖ Weegstation"
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/page.tsx",
                                                        lineNumber: 1418,
                                                        columnNumber: 19
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/page.tsx",
                                                lineNumber: 1369,
                                                columnNumber: 17
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: __TURBOPACK__imported__module__$5b$next$5d2f$internal$2f$font$2f$google$2f$inter_a71219c2$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"].className,
                                                style: {
                                                    marginTop: 12,
                                                    textAlign: "center",
                                                    fontSize: 12,
                                                    color: "rgba(42,42,46,0.78)",
                                                    letterSpacing: "0.06em"
                                                },
                                                children: matchmakingId
                                            }, void 0, false, {
                                                fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/page.tsx",
                                                lineNumber: 1437,
                                                columnNumber: 17
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/page.tsx",
                                        lineNumber: 1355,
                                        columnNumber: 15
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "my-4",
                                        style: separator
                                    }, void 0, false, {
                                        fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/page.tsx",
                                        lineNumber: 1451,
                                        columnNumber: 15
                                    }, this),
                                    loading ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "text-zinc-700",
                                        children: "Laden…"
                                    }, void 0, false, {
                                        fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/page.tsx",
                                        lineNumber: 1454,
                                        columnNumber: 17
                                    }, this) : error ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "text-red-700",
                                        children: error
                                    }, void 0, false, {
                                        fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/page.tsx",
                                        lineNumber: 1456,
                                        columnNumber: 17
                                    }, this) : rows.length === 0 ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "text-zinc-700",
                                        children: "Geen context gevonden (context nog niet gevuld?)."
                                    }, void 0, false, {
                                        fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/page.tsx",
                                        lineNumber: 1458,
                                        columnNumber: 17
                                    }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "space-y-3",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "flex flex-wrap items-center gap-3",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                        className: "text-sm text-zinc-800",
                                                        children: [
                                                            "Partijen:",
                                                            " ",
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                className: "text-zinc-900 font-semibold",
                                                                children: totals.totaal
                                                            }, void 0, false, {
                                                                fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/page.tsx",
                                                                lineNumber: 1466,
                                                                columnNumber: 23
                                                            }, this)
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/page.tsx",
                                                        lineNumber: 1464,
                                                        columnNumber: 21
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(HeaderBadge, {
                                                        label: "Meldingen totaal",
                                                        value: totals.meldingen_totaal,
                                                        tone: "white"
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/page.tsx",
                                                        lineNumber: 1469,
                                                        columnNumber: 21
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(HeaderBadge, {
                                                        label: "Partijen met melding",
                                                        value: totals.partijen_met_melding,
                                                        tone: "white"
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/page.tsx",
                                                        lineNumber: 1470,
                                                        columnNumber: 21
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(HeaderBadge, {
                                                        label: "Verbod",
                                                        value: totals.verbod,
                                                        tone: "purple"
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/page.tsx",
                                                        lineNumber: 1471,
                                                        columnNumber: 21
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(HeaderBadge, {
                                                        label: "Geen licentie",
                                                        value: totals.geen_licentie,
                                                        tone: "blue"
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/page.tsx",
                                                        lineNumber: 1472,
                                                        columnNumber: 21
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(HeaderBadge, {
                                                        label: "Afkeur",
                                                        value: totals.afk,
                                                        tone: "red"
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/page.tsx",
                                                        lineNumber: 1473,
                                                        columnNumber: 21
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(HeaderBadge, {
                                                        label: "Dispensatie",
                                                        value: totals.dispensatie,
                                                        tone: "orange"
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/page.tsx",
                                                        lineNumber: 1474,
                                                        columnNumber: 21
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(HeaderBadge, {
                                                        label: "Actie",
                                                        value: totals.actie,
                                                        tone: "yellow"
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/page.tsx",
                                                        lineNumber: 1475,
                                                        columnNumber: 21
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(HeaderBadge, {
                                                        label: "OK",
                                                        value: totals.ok,
                                                        tone: "green"
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/page.tsx",
                                                        lineNumber: 1476,
                                                        columnNumber: 21
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(HeaderBadge, {
                                                        label: "Geen info",
                                                        value: totals.geen,
                                                        tone: "white"
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/page.tsx",
                                                        lineNumber: 1477,
                                                        columnNumber: 21
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/page.tsx",
                                                lineNumber: 1463,
                                                columnNumber: 19
                                            }, this),
                                            galaDuur?.text && compactRunMeldingen.length === 0 ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "rounded-xl border border-zinc-300 bg-white/5 p-3 text-sm",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                        className: "font-semibold text-zinc-900",
                                                        children: "Gala duur:"
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/page.tsx",
                                                        lineNumber: 1482,
                                                        columnNumber: 23
                                                    }, this),
                                                    " ",
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                        className: "text-zinc-800",
                                                        children: galaDuur.text
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/page.tsx",
                                                        lineNumber: 1483,
                                                        columnNumber: 23
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/page.tsx",
                                                lineNumber: 1481,
                                                columnNumber: 21
                                            }, this) : null,
                                            compactRunMeldingen.length > 0 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "mt-3 rounded-xl bg-white p-0 overflow-hidden",
                                                style: {
                                                    border: "3px solid #2b2b2b",
                                                    boxShadow: "0 12px 26px rgba(0,0,0,0.10), inset 0 1px 0 rgba(255,255,255,0.65)"
                                                },
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        className: "px-4 py-3 font-extrabold text-white",
                                                        style: {
                                                            background: "linear-gradient(180deg, #2a2a2e 0%, #1f1f23 100%)",
                                                            borderBottom: "2px solid rgba(255,77,0,0.50)"
                                                        },
                                                        children: "Run meldingen"
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/page.tsx",
                                                        lineNumber: 1496,
                                                        columnNumber: 23
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        className: "p-4",
                                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                            className: "mt-1 space-y-2 text-sm",
                                                            children: compactRunMeldingen.map((r, i)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                    className: "rounded-md bg-white p-3",
                                                                    style: {
                                                                        border: "2px solid rgba(43,43,43,0.35)",
                                                                        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.70), 0 10px 18px rgba(0,0,0,0.05)"
                                                                    },
                                                                    children: [
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                            className: "flex items-start gap-2",
                                                                            children: [
                                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                                    className: "min-w-0",
                                                                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                                        className: "text-zinc-900 font-semibold leading-tight",
                                                                                        children: [
                                                                                            r.rule ?? "(run)",
                                                                                            r.rule_code ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                                                className: "ml-2 text-xs text-zinc-600 font-semibold",
                                                                                                children: [
                                                                                                    "(",
                                                                                                    r.rule_code,
                                                                                                    ")"
                                                                                                ]
                                                                                            }, void 0, true, {
                                                                                                fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/page.tsx",
                                                                                                lineNumber: 1524,
                                                                                                columnNumber: 39
                                                                                            }, this) : null
                                                                                        ]
                                                                                    }, void 0, true, {
                                                                                        fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/page.tsx",
                                                                                        lineNumber: 1521,
                                                                                        columnNumber: 35
                                                                                    }, this)
                                                                                }, void 0, false, {
                                                                                    fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/page.tsx",
                                                                                    lineNumber: 1520,
                                                                                    columnNumber: 33
                                                                                }, this),
                                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                                    className: "ml-auto text-xs font-extrabold tracking-wide text-zinc-700",
                                                                                    children: String(r.resultaat ?? "").toUpperCase()
                                                                                }, void 0, false, {
                                                                                    fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/page.tsx",
                                                                                    lineNumber: 1531,
                                                                                    columnNumber: 33
                                                                                }, this)
                                                                            ]
                                                                        }, void 0, true, {
                                                                            fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/page.tsx",
                                                                            lineNumber: 1519,
                                                                            columnNumber: 31
                                                                        }, this),
                                                                        r.boodschap ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                            className: "mt-1 text-zinc-700 leading-snug",
                                                                            children: r.boodschap
                                                                        }, void 0, false, {
                                                                            fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/page.tsx",
                                                                            lineNumber: 1537,
                                                                            columnNumber: 33
                                                                        }, this) : null
                                                                    ]
                                                                }, `${r.rule_code ?? "run"}-${i}`, true, {
                                                                    fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/page.tsx",
                                                                    lineNumber: 1510,
                                                                    columnNumber: 29
                                                                }, this))
                                                        }, void 0, false, {
                                                            fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/page.tsx",
                                                            lineNumber: 1508,
                                                            columnNumber: 25
                                                        }, this)
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/page.tsx",
                                                        lineNumber: 1507,
                                                        columnNumber: 23
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/page.tsx",
                                                lineNumber: 1488,
                                                columnNumber: 21
                                            }, this),
                                            msg ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "text-sm text-zinc-700",
                                                children: msg
                                            }, void 0, false, {
                                                fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/page.tsx",
                                                lineNumber: 1546,
                                                columnNumber: 26
                                            }, this) : null,
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "flex flex-wrap items-center gap-2 rounded-xl border border-zinc-300 bg-white/5 p-3",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        className: "text-sm font-semibold text-zinc-800 mr-2",
                                                        children: "Filter:"
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/page.tsx",
                                                        lineNumber: 1549,
                                                        columnNumber: 21
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        className: "flex-1 min-w-[220px]",
                                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                            value: search,
                                                            onChange: (e)=>setSearch(e.target.value),
                                                            placeholder: "Zoek op naam, sportschool of VA…",
                                                            className: "w-full rounded-lg px-3 py-2 text-sm outline-none placeholder:text-zinc-500",
                                                            style: {
                                                                background: "linear-gradient(180deg, #ffffff 0%, #f4f6f9 100%)",
                                                                border: "2px solid rgba(63,63,70,0.35)",
                                                                color: "#111827",
                                                                boxShadow: "inset 0 1px 0 rgba(255,255,255,0.90), 0 8px 18px rgba(0,0,0,0.10)"
                                                            }
                                                        }, void 0, false, {
                                                            fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/page.tsx",
                                                            lineNumber: 1552,
                                                            columnNumber: 23
                                                        }, this)
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/page.tsx",
                                                        lineNumber: 1551,
                                                        columnNumber: 21
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(FilterButton, {
                                                        label: "Alle",
                                                        count: filterCounts.all,
                                                        tone: "neutral",
                                                        active: filter === "all",
                                                        onClick: ()=>setFilter("all")
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/page.tsx",
                                                        lineNumber: 1567,
                                                        columnNumber: 21
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(FilterButton, {
                                                        label: "Verbod",
                                                        count: filterCounts.verbod,
                                                        tone: "purple",
                                                        active: filter === "verbod",
                                                        onClick: ()=>setFilter("verbod")
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/page.tsx",
                                                        lineNumber: 1568,
                                                        columnNumber: 21
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(FilterButton, {
                                                        label: "Geen licentie",
                                                        count: filterCounts.geen_licentie,
                                                        tone: "blue",
                                                        active: filter === "geen_licentie",
                                                        onClick: ()=>setFilter("geen_licentie")
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/page.tsx",
                                                        lineNumber: 1569,
                                                        columnNumber: 21
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(FilterButton, {
                                                        label: "Afkeur",
                                                        count: filterCounts.afgekeurd,
                                                        tone: "red",
                                                        active: filter === "afgekeurd",
                                                        onClick: ()=>setFilter("afgekeurd")
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/page.tsx",
                                                        lineNumber: 1570,
                                                        columnNumber: 21
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(FilterButton, {
                                                        label: "Dispensatie",
                                                        count: filterCounts.dispensatie,
                                                        tone: "orange",
                                                        active: filter === "dispensatie",
                                                        onClick: ()=>setFilter("dispensatie")
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/page.tsx",
                                                        lineNumber: 1571,
                                                        columnNumber: 21
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(FilterButton, {
                                                        label: "Actie",
                                                        count: filterCounts.actie,
                                                        tone: "yellow",
                                                        active: filter === "actie",
                                                        onClick: ()=>setFilter("actie")
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/page.tsx",
                                                        lineNumber: 1572,
                                                        columnNumber: 21
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(FilterButton, {
                                                        label: "OK",
                                                        count: filterCounts.ok,
                                                        tone: "green",
                                                        active: filter === "ok",
                                                        onClick: ()=>setFilter("ok")
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/page.tsx",
                                                        lineNumber: 1573,
                                                        columnNumber: 21
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(FilterButton, {
                                                        label: "Geen info",
                                                        count: filterCounts.geen_info,
                                                        tone: "white",
                                                        active: filter === "geen_info",
                                                        onClick: ()=>setFilter("geen_info")
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/page.tsx",
                                                        lineNumber: 1574,
                                                        columnNumber: 21
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        className: "ml-auto text-xs text-zinc-600",
                                                        children: [
                                                            "Toon: ",
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                className: "font-semibold text-zinc-900",
                                                                children: filteredRows.length
                                                            }, void 0, false, {
                                                                fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/page.tsx",
                                                                lineNumber: 1577,
                                                                columnNumber: 29
                                                            }, this)
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/page.tsx",
                                                        lineNumber: 1576,
                                                        columnNumber: 21
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/page.tsx",
                                                lineNumber: 1548,
                                                columnNumber: 19
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "overflow-auto rounded-xl border border-zinc-300",
                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("table", {
                                                    className: "min-w-full border-collapse",
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("thead", {
                                                            style: {
                                                                background: "linear-gradient(180deg, #3a3a3f 0%, #2a2a2e 100%)",
                                                                color: "#fff",
                                                                borderBottom: "3px solid rgba(255,77,0,0.55)"
                                                            },
                                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("tr", {
                                                                children: [
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                                        className: "py-3 px-4 text-left w-24",
                                                                        children: "#"
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/page.tsx",
                                                                        lineNumber: 1591,
                                                                        columnNumber: 27
                                                                    }, this),
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                                        className: "py-3 px-4 text-left",
                                                                        children: "Vechters"
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/page.tsx",
                                                                        lineNumber: 1592,
                                                                        columnNumber: 27
                                                                    }, this),
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                                        className: "py-3 px-4 text-left w-[320px]",
                                                                        children: "Info"
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/page.tsx",
                                                                        lineNumber: 1593,
                                                                        columnNumber: 27
                                                                    }, this),
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                                        className: "py-3 px-4 text-left w-[260px]",
                                                                        children: "Acties"
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/page.tsx",
                                                                        lineNumber: 1594,
                                                                        columnNumber: 27
                                                                    }, this)
                                                                ]
                                                            }, void 0, true, {
                                                                fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/page.tsx",
                                                                lineNumber: 1590,
                                                                columnNumber: 25
                                                            }, this)
                                                        }, void 0, false, {
                                                            fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/page.tsx",
                                                            lineNumber: 1583,
                                                            columnNumber: 23
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("tbody", {
                                                            children: filteredRows.map((r, i)=>{
                                                                const zebraWhite = i % 2 === 0;
                                                                const roodNaam = safeText(r.rood_naam_fp ?? r.rood_naam_mm, "-");
                                                                const blauwNaam = safeText(r.blauw_naam_fp ?? r.blauw_naam_mm, "-");
                                                                const roodGym = safeText(r.rood_gym_mm, "-");
                                                                const blauwGym = safeText(r.blauw_gym_mm, "-");
                                                                const roodVA = safeText(r.rood_va_mm, "-");
                                                                const blauwVA = safeText(r.blauw_va_mm, "-");
                                                                const roodAge = ageAtEvent(r, "rood");
                                                                const blauwAge = ageAtEvent(r, "blauw");
                                                                const pn = Number(r.partij_nr);
                                                                const status = Number.isFinite(pn) ? statusByPartij[pn] ?? "geen_info" : "geen_info";
                                                                const discipline = safeText(r.discipline, "-");
                                                                const klasse = safeText(r.klasse_mm, "-");
                                                                const eventDatum = safeText(r.evenement_datum, "-");
                                                                const dividerClass = zebraWhite ? "border-t border-gray-400/70" : "border-t border-zinc-300";
                                                                const heeftVerbod = Number.isFinite(pn) ? !!verbodByPartij[pn] : false;
                                                                const heeftDispensatie = Number.isFinite(pn) ? !!anyDispensatieByPartij[pn] : false;
                                                                const geenTegenstander = isGeenTegenstander(r);
                                                                const busy = Number.isFinite(pn) ? busyPartij[pn] : null;
                                                                return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("tr", {
                                                                    style: {
                                                                        backgroundColor: zebraWhite ? "#ffffff" : "#0d0d0d",
                                                                        color: zebraWhite ? "#000" : "#fff"
                                                                    },
                                                                    children: [
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                                            className: "py-3 px-4 font-semibold align-top",
                                                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                                className: "flex items-center gap-2 flex-wrap",
                                                                                children: [
                                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                                        className: "tabular-nums",
                                                                                        children: r.partij_nr ?? "-"
                                                                                    }, void 0, false, {
                                                                                        fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/page.tsx",
                                                                                        lineNumber: 1642,
                                                                                        columnNumber: 35
                                                                                    }, this),
                                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(StatusBadge, {
                                                                                        status: status
                                                                                    }, void 0, false, {
                                                                                        fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/page.tsx",
                                                                                        lineNumber: 1643,
                                                                                        columnNumber: 35
                                                                                    }, this),
                                                                                    heeftDispensatie && status !== "dispensatie" ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(Chip, {
                                                                                        label: "DISPENSATIE",
                                                                                        tone: "orange"
                                                                                    }, void 0, false, {
                                                                                        fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/page.tsx",
                                                                                        lineNumber: 1645,
                                                                                        columnNumber: 37
                                                                                    }, this) : null,
                                                                                    heeftVerbod ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(Chip, {
                                                                                        label: "VERBOD",
                                                                                        tone: "purple"
                                                                                    }, void 0, false, {
                                                                                        fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/page.tsx",
                                                                                        lineNumber: 1647,
                                                                                        columnNumber: 50
                                                                                    }, this) : null,
                                                                                    Number.isFinite(pn) && missingLicentieByPartij[pn] ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(Chip, {
                                                                                        label: "GEEN LICENTIE",
                                                                                        tone: "blue"
                                                                                    }, void 0, false, {
                                                                                        fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/page.tsx",
                                                                                        lineNumber: 1649,
                                                                                        columnNumber: 37
                                                                                    }, this) : null
                                                                                ]
                                                                            }, void 0, true, {
                                                                                fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/page.tsx",
                                                                                lineNumber: 1641,
                                                                                columnNumber: 33
                                                                            }, this)
                                                                        }, void 0, false, {
                                                                            fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/page.tsx",
                                                                            lineNumber: 1640,
                                                                            columnNumber: 31
                                                                        }, this),
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                                            className: "py-3 px-4 align-top",
                                                                            children: [
                                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                                    className: "flex items-center gap-3 min-w-0",
                                                                                    children: [
                                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                                            className: "inline-block w-3 h-3 rounded-full shrink-0",
                                                                                            style: {
                                                                                                backgroundColor: "#ef4444"
                                                                                            }
                                                                                        }, void 0, false, {
                                                                                            fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/page.tsx",
                                                                                            lineNumber: 1656,
                                                                                            columnNumber: 35
                                                                                        }, this),
                                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                                            className: "min-w-0 text-sm",
                                                                                            children: [
                                                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                                                    className: "font-semibold",
                                                                                                    children: roodNaam
                                                                                                }, void 0, false, {
                                                                                                    fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/page.tsx",
                                                                                                    lineNumber: 1661,
                                                                                                    columnNumber: 37
                                                                                                }, this),
                                                                                                " ",
                                                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                                                    className: "opacity-80",
                                                                                                    children: [
                                                                                                        "(",
                                                                                                        roodAge,
                                                                                                        " jaar)"
                                                                                                    ]
                                                                                                }, void 0, true, {
                                                                                                    fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/page.tsx",
                                                                                                    lineNumber: 1662,
                                                                                                    columnNumber: 37
                                                                                                }, this),
                                                                                                " ",
                                                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                                                    className: "opacity-80",
                                                                                                    children: [
                                                                                                        "• ",
                                                                                                        roodGym
                                                                                                    ]
                                                                                                }, void 0, true, {
                                                                                                    fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/page.tsx",
                                                                                                    lineNumber: 1663,
                                                                                                    columnNumber: 37
                                                                                                }, this),
                                                                                                " ",
                                                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                                                    className: "opacity-80",
                                                                                                    children: [
                                                                                                        "• FP/VA: ",
                                                                                                        roodVA
                                                                                                    ]
                                                                                                }, void 0, true, {
                                                                                                    fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/page.tsx",
                                                                                                    lineNumber: 1664,
                                                                                                    columnNumber: 37
                                                                                                }, this)
                                                                                            ]
                                                                                        }, void 0, true, {
                                                                                            fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/page.tsx",
                                                                                            lineNumber: 1660,
                                                                                            columnNumber: 35
                                                                                        }, this)
                                                                                    ]
                                                                                }, void 0, true, {
                                                                                    fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/page.tsx",
                                                                                    lineNumber: 1655,
                                                                                    columnNumber: 33
                                                                                }, this),
                                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                                    className: `my-2 ${dividerClass}`
                                                                                }, void 0, false, {
                                                                                    fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/page.tsx",
                                                                                    lineNumber: 1668,
                                                                                    columnNumber: 33
                                                                                }, this),
                                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                                    className: "flex items-center gap-3 min-w-0",
                                                                                    children: [
                                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                                            className: "inline-block w-3 h-3 rounded-full shrink-0",
                                                                                            style: {
                                                                                                backgroundColor: "#3b82f6"
                                                                                            }
                                                                                        }, void 0, false, {
                                                                                            fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/page.tsx",
                                                                                            lineNumber: 1671,
                                                                                            columnNumber: 35
                                                                                        }, this),
                                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                                            className: "min-w-0 text-sm",
                                                                                            children: [
                                                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                                                    className: "font-semibold",
                                                                                                    children: blauwNaam
                                                                                                }, void 0, false, {
                                                                                                    fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/page.tsx",
                                                                                                    lineNumber: 1676,
                                                                                                    columnNumber: 37
                                                                                                }, this),
                                                                                                " ",
                                                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                                                    className: "opacity-80",
                                                                                                    children: [
                                                                                                        "(",
                                                                                                        blauwAge,
                                                                                                        " jaar)"
                                                                                                    ]
                                                                                                }, void 0, true, {
                                                                                                    fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/page.tsx",
                                                                                                    lineNumber: 1677,
                                                                                                    columnNumber: 37
                                                                                                }, this),
                                                                                                " ",
                                                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                                                    className: "opacity-80",
                                                                                                    children: [
                                                                                                        "• ",
                                                                                                        blauwGym
                                                                                                    ]
                                                                                                }, void 0, true, {
                                                                                                    fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/page.tsx",
                                                                                                    lineNumber: 1678,
                                                                                                    columnNumber: 37
                                                                                                }, this),
                                                                                                " ",
                                                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                                                    className: "opacity-80",
                                                                                                    children: [
                                                                                                        "• FP/VA: ",
                                                                                                        blauwVA
                                                                                                    ]
                                                                                                }, void 0, true, {
                                                                                                    fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/page.tsx",
                                                                                                    lineNumber: 1679,
                                                                                                    columnNumber: 37
                                                                                                }, this)
                                                                                            ]
                                                                                        }, void 0, true, {
                                                                                            fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/page.tsx",
                                                                                            lineNumber: 1675,
                                                                                            columnNumber: 35
                                                                                        }, this)
                                                                                    ]
                                                                                }, void 0, true, {
                                                                                    fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/page.tsx",
                                                                                    lineNumber: 1670,
                                                                                    columnNumber: 33
                                                                                }, this),
                                                                                geenTegenstander ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                                    className: "mt-2 text-xs font-extrabold",
                                                                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                                        className: "px-2 py-1 rounded bg-red-500 text-zinc-900",
                                                                                        children: "GEEN TEGENSTANDER"
                                                                                    }, void 0, false, {
                                                                                        fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/page.tsx",
                                                                                        lineNumber: 1685,
                                                                                        columnNumber: 37
                                                                                    }, this)
                                                                                }, void 0, false, {
                                                                                    fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/page.tsx",
                                                                                    lineNumber: 1684,
                                                                                    columnNumber: 35
                                                                                }, this) : null
                                                                            ]
                                                                        }, void 0, true, {
                                                                            fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/page.tsx",
                                                                            lineNumber: 1654,
                                                                            columnNumber: 31
                                                                        }, this),
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                                            className: "py-3 px-4 align-top",
                                                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                                className: "space-y-1 text-sm",
                                                                                children: [
                                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                                        children: [
                                                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                                                className: "font-semibold",
                                                                                                children: "Discipline:"
                                                                                            }, void 0, false, {
                                                                                                fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/page.tsx",
                                                                                                lineNumber: 1695,
                                                                                                columnNumber: 37
                                                                                            }, this),
                                                                                            " ",
                                                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                                                className: "opacity-90",
                                                                                                children: discipline
                                                                                            }, void 0, false, {
                                                                                                fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/page.tsx",
                                                                                                lineNumber: 1696,
                                                                                                columnNumber: 37
                                                                                            }, this)
                                                                                        ]
                                                                                    }, void 0, true, {
                                                                                        fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/page.tsx",
                                                                                        lineNumber: 1694,
                                                                                        columnNumber: 35
                                                                                    }, this),
                                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                                        children: [
                                                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                                                className: "font-semibold",
                                                                                                children: "Klasse:"
                                                                                            }, void 0, false, {
                                                                                                fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/page.tsx",
                                                                                                lineNumber: 1699,
                                                                                                columnNumber: 37
                                                                                            }, this),
                                                                                            " ",
                                                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                                                className: "opacity-90",
                                                                                                children: klasse
                                                                                            }, void 0, false, {
                                                                                                fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/page.tsx",
                                                                                                lineNumber: 1700,
                                                                                                columnNumber: 37
                                                                                            }, this)
                                                                                        ]
                                                                                    }, void 0, true, {
                                                                                        fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/page.tsx",
                                                                                        lineNumber: 1698,
                                                                                        columnNumber: 35
                                                                                    }, this),
                                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                                        children: [
                                                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                                                className: "font-semibold",
                                                                                                children: "Event datum:"
                                                                                            }, void 0, false, {
                                                                                                fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/page.tsx",
                                                                                                lineNumber: 1703,
                                                                                                columnNumber: 37
                                                                                            }, this),
                                                                                            " ",
                                                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                                                className: "opacity-90",
                                                                                                children: eventDatum
                                                                                            }, void 0, false, {
                                                                                                fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/page.tsx",
                                                                                                lineNumber: 1704,
                                                                                                columnNumber: 37
                                                                                            }, this)
                                                                                        ]
                                                                                    }, void 0, true, {
                                                                                        fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/page.tsx",
                                                                                        lineNumber: 1702,
                                                                                        columnNumber: 35
                                                                                    }, this),
                                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                                        children: [
                                                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                                                className: "font-semibold",
                                                                                                children: "Meldingen:"
                                                                                            }, void 0, false, {
                                                                                                fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/page.tsx",
                                                                                                lineNumber: 1707,
                                                                                                columnNumber: 37
                                                                                            }, this),
                                                                                            " ",
                                                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                                                className: "opacity-90",
                                                                                                children: Number.isFinite(pn) ? countByPartij[pn] ?? 0 : 0
                                                                                            }, void 0, false, {
                                                                                                fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/page.tsx",
                                                                                                lineNumber: 1708,
                                                                                                columnNumber: 37
                                                                                            }, this)
                                                                                        ]
                                                                                    }, void 0, true, {
                                                                                        fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/page.tsx",
                                                                                        lineNumber: 1706,
                                                                                        columnNumber: 35
                                                                                    }, this)
                                                                                ]
                                                                            }, void 0, true, {
                                                                                fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/page.tsx",
                                                                                lineNumber: 1693,
                                                                                columnNumber: 33
                                                                            }, this)
                                                                        }, void 0, false, {
                                                                            fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/page.tsx",
                                                                            lineNumber: 1692,
                                                                            columnNumber: 31
                                                                        }, this),
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                                            className: "py-3 px-4 align-top",
                                                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                                className: "flex flex-wrap gap-2",
                                                                                children: [
                                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"], {
                                                                                        href: `/dashboard/matchmaker/matchmaking/${encodeURIComponent(matchmakingId)}/${encodeURIComponent(String(r.partij_nr ?? ""))}`,
                                                                                        className: "px-3 py-1.5 rounded font-extrabold text-sm",
                                                                                        style: {
                                                                                            background: "rgba(0,0,0,0.55)",
                                                                                            border: `1px solid rgba(255,77,0,0.85)`,
                                                                                            color: "rgba(255,210,190,0.95)"
                                                                                        },
                                                                                        children: "Detail"
                                                                                    }, void 0, false, {
                                                                                        fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/page.tsx",
                                                                                        lineNumber: 1717,
                                                                                        columnNumber: 35
                                                                                    }, this),
                                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(DarkActionButton, {
                                                                                        label: busy === "delete" ? "… Verwijderen" : "Verwijderen",
                                                                                        tone: "red",
                                                                                        disabled: busy === "delete",
                                                                                        onClick: ()=>Number.isFinite(pn) && deletePartij(pn, typeof r?.bout_id === "string" ? r.bout_id : typeof r?.bout_uid === "string" ? r.bout_uid : typeof r?.id === "string" ? r.id : null)
                                                                                    }, void 0, false, {
                                                                                        fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/page.tsx",
                                                                                        lineNumber: 1729,
                                                                                        columnNumber: 35
                                                                                    }, this)
                                                                                ]
                                                                            }, void 0, true, {
                                                                                fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/page.tsx",
                                                                                lineNumber: 1716,
                                                                                columnNumber: 33
                                                                            }, this)
                                                                        }, void 0, false, {
                                                                            fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/page.tsx",
                                                                            lineNumber: 1715,
                                                                            columnNumber: 31
                                                                        }, this)
                                                                    ]
                                                                }, r.id ?? `${r.partij_nr}-${i}`, true, {
                                                                    fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/page.tsx",
                                                                    lineNumber: 1633,
                                                                    columnNumber: 29
                                                                }, this);
                                                            })
                                                        }, void 0, false, {
                                                            fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/page.tsx",
                                                            lineNumber: 1598,
                                                            columnNumber: 23
                                                        }, this)
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/page.tsx",
                                                    lineNumber: 1582,
                                                    columnNumber: 21
                                                }, this)
                                            }, void 0, false, {
                                                fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/page.tsx",
                                                lineNumber: 1581,
                                                columnNumber: 19
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "pt-2 text-xs text-zinc-500 text-center",
                                                children: "© FightSupport"
                                            }, void 0, false, {
                                                fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/page.tsx",
                                                lineNumber: 1756,
                                                columnNumber: 19
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/page.tsx",
                                        lineNumber: 1462,
                                        columnNumber: 17
                                    }, this),
                                    showAdd && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "fixed inset-0 z-[999] flex items-center justify-center px-4",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "absolute inset-0",
                                                style: {
                                                    background: "rgba(0,0,0,0.65)"
                                                },
                                                onClick: ()=>!addBusy && setShowAdd(false)
                                            }, void 0, false, {
                                                fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/page.tsx",
                                                lineNumber: 1762,
                                                columnNumber: 19
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "relative w-full max-w-[980px] rounded-2xl border-[3px] border-zinc-700/40 bg-white shadow-2xl overflow-hidden",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        className: "px-6 py-4 flex items-center justify-between",
                                                        style: {
                                                            background: "linear-gradient(180deg, #3a3a3f 0%, #2a2a2e 100%)",
                                                            borderBottom: "3px solid rgba(255,77,0,0.55)"
                                                        },
                                                        children: [
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                children: [
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                        className: "text-white font-extrabold text-lg",
                                                                        children: "Partij toevoegen"
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/page.tsx",
                                                                        lineNumber: 1776,
                                                                        columnNumber: 25
                                                                    }, this),
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                        className: "text-white/75 text-xs",
                                                                        children: "Discipline / klasse + rood vs blauw (VA nummers als tekst) + max gewicht"
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/page.tsx",
                                                                        lineNumber: 1777,
                                                                        columnNumber: 25
                                                                    }, this)
                                                                ]
                                                            }, void 0, true, {
                                                                fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/page.tsx",
                                                                lineNumber: 1775,
                                                                columnNumber: 23
                                                            }, this),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                                className: "text-white/70 hover:text-white font-bold",
                                                                onClick: ()=>!addBusy && setShowAdd(false),
                                                                children: "✕"
                                                            }, void 0, false, {
                                                                fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/page.tsx",
                                                                lineNumber: 1782,
                                                                columnNumber: 23
                                                            }, this)
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/page.tsx",
                                                        lineNumber: 1768,
                                                        columnNumber: 21
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        className: "px-6 py-5 space-y-4",
                                                        children: [
                                                            error ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                className: "text-red-700 text-sm",
                                                                children: error
                                                            }, void 0, false, {
                                                                fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/page.tsx",
                                                                lineNumber: 1791,
                                                                columnNumber: 32
                                                            }, this) : null,
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                className: "grid grid-cols-1 md:grid-cols-2 gap-3",
                                                                children: [
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(Field, {
                                                                        label: "Discipline",
                                                                        value: fDiscipline,
                                                                        onChange: setFDiscipline,
                                                                        placeholder: "Kickboksen / Muay Thai / MMA..."
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/page.tsx",
                                                                        lineNumber: 1794,
                                                                        columnNumber: 25
                                                                    }, this),
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(Field, {
                                                                        label: "Klasse",
                                                                        value: fKlasse,
                                                                        onChange: setFKlasse,
                                                                        placeholder: "N / C / B / A..."
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/page.tsx",
                                                                        lineNumber: 1800,
                                                                        columnNumber: 25
                                                                    }, this)
                                                                ]
                                                            }, void 0, true, {
                                                                fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/page.tsx",
                                                                lineNumber: 1793,
                                                                columnNumber: 23
                                                            }, this),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                className: "grid grid-cols-1 md:grid-cols-2 gap-4",
                                                                children: [
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                        className: "rounded-xl border-2 border-zinc-300 bg-white p-4",
                                                                        children: [
                                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                                className: "text-zinc-900 font-extrabold mb-3",
                                                                                children: "Rood"
                                                                            }, void 0, false, {
                                                                                fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/page.tsx",
                                                                                lineNumber: 1810,
                                                                                columnNumber: 27
                                                                            }, this),
                                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                                className: "grid grid-cols-1 md:grid-cols-2 gap-3",
                                                                                children: [
                                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(Field, {
                                                                                        label: "Naam rood",
                                                                                        value: fRoodNaam,
                                                                                        onChange: setFRoodNaam
                                                                                    }, void 0, false, {
                                                                                        fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/page.tsx",
                                                                                        lineNumber: 1812,
                                                                                        columnNumber: 29
                                                                                    }, this),
                                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(Field, {
                                                                                        label: "Sportschool rood",
                                                                                        value: fRoodGym,
                                                                                        onChange: setFRoodGym
                                                                                    }, void 0, false, {
                                                                                        fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/page.tsx",
                                                                                        lineNumber: 1813,
                                                                                        columnNumber: 29
                                                                                    }, this),
                                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(Field, {
                                                                                        label: "VA nummer rood",
                                                                                        value: fRoodVa,
                                                                                        onChange: setFRoodVa,
                                                                                        placeholder: "tekst"
                                                                                    }, void 0, false, {
                                                                                        fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/page.tsx",
                                                                                        lineNumber: 1814,
                                                                                        columnNumber: 29
                                                                                    }, this),
                                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(Field, {
                                                                                        label: "KG rood",
                                                                                        value: fRoodKg,
                                                                                        onChange: setFRoodKg,
                                                                                        type: "number",
                                                                                        placeholder: "bijv. 71.5"
                                                                                    }, void 0, false, {
                                                                                        fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/page.tsx",
                                                                                        lineNumber: 1815,
                                                                                        columnNumber: 29
                                                                                    }, this)
                                                                                ]
                                                                            }, void 0, true, {
                                                                                fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/page.tsx",
                                                                                lineNumber: 1811,
                                                                                columnNumber: 27
                                                                            }, this)
                                                                        ]
                                                                    }, void 0, true, {
                                                                        fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/page.tsx",
                                                                        lineNumber: 1809,
                                                                        columnNumber: 25
                                                                    }, this),
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                        className: "rounded-xl border-2 border-zinc-300 bg-white p-4",
                                                                        children: [
                                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                                className: "text-zinc-900 font-extrabold mb-3",
                                                                                children: "Blauw"
                                                                            }, void 0, false, {
                                                                                fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/page.tsx",
                                                                                lineNumber: 1820,
                                                                                columnNumber: 27
                                                                            }, this),
                                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                                className: "grid grid-cols-1 md:grid-cols-2 gap-3",
                                                                                children: [
                                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(Field, {
                                                                                        label: "Naam blauw",
                                                                                        value: fBlauwNaam,
                                                                                        onChange: setFBlauwNaam
                                                                                    }, void 0, false, {
                                                                                        fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/page.tsx",
                                                                                        lineNumber: 1822,
                                                                                        columnNumber: 29
                                                                                    }, this),
                                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(Field, {
                                                                                        label: "Sportschool blauw",
                                                                                        value: fBlauwGym,
                                                                                        onChange: setFBlauwGym
                                                                                    }, void 0, false, {
                                                                                        fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/page.tsx",
                                                                                        lineNumber: 1823,
                                                                                        columnNumber: 29
                                                                                    }, this),
                                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(Field, {
                                                                                        label: "VA nummer blauw",
                                                                                        value: fBlauwVa,
                                                                                        onChange: setFBlauwVa,
                                                                                        placeholder: "tekst"
                                                                                    }, void 0, false, {
                                                                                        fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/page.tsx",
                                                                                        lineNumber: 1824,
                                                                                        columnNumber: 29
                                                                                    }, this),
                                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(Field, {
                                                                                        label: "KG blauw",
                                                                                        value: fBlauwKg,
                                                                                        onChange: setFBlauwKg,
                                                                                        type: "number",
                                                                                        placeholder: "bijv. 71.5"
                                                                                    }, void 0, false, {
                                                                                        fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/page.tsx",
                                                                                        lineNumber: 1825,
                                                                                        columnNumber: 29
                                                                                    }, this)
                                                                                ]
                                                                            }, void 0, true, {
                                                                                fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/page.tsx",
                                                                                lineNumber: 1821,
                                                                                columnNumber: 27
                                                                            }, this)
                                                                        ]
                                                                    }, void 0, true, {
                                                                        fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/page.tsx",
                                                                        lineNumber: 1819,
                                                                        columnNumber: 25
                                                                    }, this)
                                                                ]
                                                            }, void 0, true, {
                                                                fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/page.tsx",
                                                                lineNumber: 1808,
                                                                columnNumber: 23
                                                            }, this),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                className: "grid grid-cols-1 md:grid-cols-3 gap-3",
                                                                children: [
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(Field, {
                                                                        label: "Max gewicht (KG)",
                                                                        value: fMaxKg,
                                                                        onChange: setFMaxKg,
                                                                        type: "number",
                                                                        placeholder: "bijv. 72.0"
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/page.tsx",
                                                                        lineNumber: 1831,
                                                                        columnNumber: 25
                                                                    }, this),
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                        className: "md:col-span-2 text-xs text-zinc-700 flex items-center",
                                                                        children: "Tip: als je “max gewicht” als tolerantie bedoelt (bv 3kg), zeg het even — dan maak ik er 2 velden van: “gewichtsklasse” + “max afwijking”."
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/page.tsx",
                                                                        lineNumber: 1838,
                                                                        columnNumber: 25
                                                                    }, this)
                                                                ]
                                                            }, void 0, true, {
                                                                fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/page.tsx",
                                                                lineNumber: 1830,
                                                                columnNumber: 23
                                                            }, this)
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/page.tsx",
                                                        lineNumber: 1790,
                                                        columnNumber: 21
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        className: "px-6 py-4 border-t border-zinc-300 flex items-center justify-end gap-3",
                                                        children: [
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$NvbLightButton$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"], {
                                                                label: "Annuleren",
                                                                onClick: ()=>!addBusy && setShowAdd(false)
                                                            }, void 0, false, {
                                                                fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/page.tsx",
                                                                lineNumber: 1846,
                                                                columnNumber: 23
                                                            }, this),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$NvbDarkButton$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"], {
                                                                label: addBusy ? "Bezig..." : "Partij toevoegen",
                                                                onClick: addPartijSubmit
                                                            }, void 0, false, {
                                                                fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/page.tsx",
                                                                lineNumber: 1850,
                                                                columnNumber: 23
                                                            }, this)
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/page.tsx",
                                                        lineNumber: 1845,
                                                        columnNumber: 21
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/page.tsx",
                                                lineNumber: 1767,
                                                columnNumber: 19
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/page.tsx",
                                        lineNumber: 1761,
                                        columnNumber: 17
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/page.tsx",
                                lineNumber: 1284,
                                columnNumber: 13
                            }, this)
                        }, void 0, false, {
                            fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/page.tsx",
                            lineNumber: 1277,
                            columnNumber: 11
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/page.tsx",
                    lineNumber: 1264,
                    columnNumber: 9
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/page.tsx",
            lineNumber: 1255,
            columnNumber: 7
        }, this)
    }, void 0, false, {
        fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/page.tsx",
        lineNumber: 1251,
        columnNumber: 5
    }, this);
}
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__0ae3f032._.js.map