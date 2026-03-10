module.exports = [
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
"[next]/internal/font/google/bebas_neue_17e950bc.module.css [app-ssr] (css module)", ((__turbopack_context__) => {

__turbopack_context__.v({
  "className": "bebas_neue_17e950bc-module__r6qXjq__className",
});
}),
"[next]/internal/font/google/bebas_neue_17e950bc.js [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>__TURBOPACK__default__export__
]);
var __TURBOPACK__imported__module__$5b$next$5d2f$internal$2f$font$2f$google$2f$bebas_neue_17e950bc$2e$module$2e$css__$5b$app$2d$ssr$5d$__$28$css__module$29$__ = __turbopack_context__.i("[next]/internal/font/google/bebas_neue_17e950bc.module.css [app-ssr] (css module)");
;
const fontData = {
    className: __TURBOPACK__imported__module__$5b$next$5d2f$internal$2f$font$2f$google$2f$bebas_neue_17e950bc$2e$module$2e$css__$5b$app$2d$ssr$5d$__$28$css__module$29$__["default"].className,
    style: {
        fontFamily: "'Bebas Neue', 'Bebas Neue Fallback'",
        fontWeight: 400,
        fontStyle: "normal"
    }
};
if (__TURBOPACK__imported__module__$5b$next$5d2f$internal$2f$font$2f$google$2f$bebas_neue_17e950bc$2e$module$2e$css__$5b$app$2d$ssr$5d$__$28$css__module$29$__["default"].variable != null) {
    fontData.variable = __TURBOPACK__imported__module__$5b$next$5d2f$internal$2f$font$2f$google$2f$bebas_neue_17e950bc$2e$module$2e$css__$5b$app$2d$ssr$5d$__$28$css__module$29$__["default"].variable;
}
const __TURBOPACK__default__export__ = fontData;
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
"[project]/app/dashboard/admin/controle/[matchmakingId]/[partijNr]/page.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>PartijDetailPage
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/navigation.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$image$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/image.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$next$5d2f$internal$2f$font$2f$google$2f$inter_a71219c2$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[next]/internal/font/google/inter_a71219c2.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$next$5d2f$internal$2f$font$2f$google$2f$bebas_neue_17e950bc$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[next]/internal/font/google/bebas_neue_17e950bc.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabaseClient$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/supabaseClient.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$api$2f$authedFetch$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/api/authedFetch.ts [app-ssr] (ecmascript)");
"use client";
;
;
;
;
;
;
;
;
const NVB_ORANGE = "#ff4d00";
// ✅ UI toggles (handig tijdens finetunen)
// Zet op false als je alleen de FIGHTSUPPORT-letters in de header wilt (meer focus op de VS).
const SHOW_HEADER_LOGO = false;
// ✅ Heldere (meer wit + NVB-oranje) 3D titel voor de header
function fightSupportTitleText() {
    return {
        background: // wit → staal → subtiel oranje highlight → staal
        "linear-gradient(180deg, #ffffff 0%, #f4f4f4 18%, #dcdcdc 38%, #bfbfbf 55%, #f8f8f8 75%, #9a9a9a 100%)",
        WebkitBackgroundClip: "text",
        WebkitTextFillColor: "transparent"
    };
}
function metalText() {
    // ✅ Zwaarder staal (meer contrast + highlight)
    return {
        background: "linear-gradient(180deg, #f7f7f7 0%, #d7d7d7 22%, #9f9f9f 52%, #f1f1f1 70%, #6f6f6f 100%)",
        WebkitBackgroundClip: "text",
        WebkitTextFillColor: "transparent"
    };
}
// ✅ Ronde tijd is afhankelijk van Discipline + Klasse (zie Excel screenshot)
function rondeTijdFromKlasse(discipline, klasseMM) {
    const d = String(discipline ?? "").trim().toLowerCase();
    const kRaw = String(klasseMM ?? "").trim().toLowerCase();
    if (!kRaw) return null;
    const k = kRaw.replace(/\s+/g, " ").replace(/\./g, "").replace(/\(|\)/g, "").trim();
    const isMma = d.includes("mma");
    // minutes per ronde
    const kickMap = {
        "a titel": 3,
        "a title": 3,
        "a k1": 3,
        "b": 2,
        "c": 2,
        "n": 1.5,
        "16/17 jr": 1.5,
        "16/17 jaar": 1.5,
        "jeugd": 1,
        "demo": 1
    };
    const mmaMap = {
        "mma pro": 5,
        "pro": 5,
        "mma am": 3,
        "mma amateur": 3,
        "am": 3,
        "amateur": 3
    };
    let minutes = null;
    if (isMma) {
        // match exact, else contains
        minutes = mmaMap[k] ?? null;
        if (minutes == null) {
            if (k.includes("pro")) minutes = 5;
            if (minutes == null && (k.includes("am") || k.includes("amateur"))) minutes = 3;
        }
    } else {
        minutes = kickMap[k] ?? null;
        if (minutes == null) {
            // toleranter
            if (k.startsWith("a") && k.includes("titel")) minutes = 3;
            if (minutes == null && k.startsWith("a") && k.includes("k1")) minutes = 3;
            if (minutes == null && (k === "n" || k.includes("nieuweling") || k.includes("newcomer"))) minutes = 1.5;
            if (minutes == null && k.includes("jeugd")) minutes = 1;
            if (minutes == null && k.includes("demo")) minutes = 1;
            if (minutes == null && k.includes("16/17")) minutes = 1.5;
            if (minutes == null && k === "b") minutes = 2;
            if (minutes == null && k === "c") minutes = 2;
        }
    }
    if (minutes == null) return null;
    const totalSeconds = Math.round(minutes * 60);
    const mm = Math.floor(totalSeconds / 60);
    const ss = totalSeconds % 60;
    return `${mm}:${String(ss).padStart(2, "0")}`;
}
function metalFrameStyle(accent = "none") {
    // ✅ Middeleeuws/stoer staal: dikke rand, bevel, diepe schaduw.
    const accentGlow = accent === "red" ? "radial-gradient(520px 260px at 0% 0%, rgba(220,38,38,0.22), transparent 62%)" : accent === "blue" ? "radial-gradient(520px 260px at 100% 0%, rgba(37,99,235,0.22), transparent 62%)" : accent === "orange" ? "radial-gradient(640px 320px at 50% 0%, rgba(255,77,0,0.20), transparent 62%)" : "radial-gradient(640px 320px at 50% 0%, rgba(255,255,255,0.06), transparent 62%)";
    const brushed = "repeating-linear-gradient(90deg, rgba(255,255,255,0.05) 0px, rgba(255,255,255,0.05) 1px, rgba(255,255,255,0.02) 1px, rgba(255,255,255,0.02) 4px)";
    const sheen = "linear-gradient(135deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.05) 24%, rgba(255,255,255,0) 48%, rgba(255,255,255,0.10) 70%, rgba(255,255,255,0) 100%)";
    return {
        border: "5px solid rgba(10,10,12,0.92)",
        borderRadius: 22,
        background: `${accentGlow}, ${sheen}, ${brushed}, linear-gradient(180deg, #3a3d44 0%, #1f2025 52%, #0a0b0e 100%)`,
        boxShadow: // buiten-schaduw
        "0 26px 70px rgba(0,0,0,0.70)," + // dikke bevel laag
        " inset 0 0 0 2px rgba(255,255,255,0.14)," + " inset 0 0 0 4px rgba(180,180,190,0.18)," + // donkere binnenrand
        " inset 0 0 0 7px rgba(0,0,0,0.55)," + // highlight boven & schaduw onder
        " inset 0 1px 0 rgba(255,255,255,0.22)," + " inset 0 -18px 24px rgba(0,0,0,0.65)"
    };
}
function metalInnerStyle() {
    return {
        border: "3px solid rgba(0,0,0,0.45)",
        borderRadius: 16,
        background: "repeating-linear-gradient(90deg, rgba(255,255,255,0.06) 0px, rgba(255,255,255,0.06) 1px, rgba(255,255,255,0.025) 1px, rgba(255,255,255,0.025) 6px)," + " linear-gradient(180deg, rgba(255,255,255,0.92) 0%, rgba(233,236,240,0.98) 100%)",
        boxShadow: "inset 0 0 0 2px rgba(255,255,255,0.70)," + " inset 0 0 0 6px rgba(0,0,0,0.10)," + " inset 0 -12px 22px rgba(0,0,0,0.12)"
    };
}
// ✅ VS-style "plaat" header (donker staal, bevel, studs)
function plateHeaderStyle() {
    return {
        border: "2px solid rgba(0,0,0,0.55)",
        borderRadius: 12,
        background: "linear-gradient(180deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.03) 30%, rgba(0,0,0,0.55) 100%), linear-gradient(180deg, #2a2d33 0%, #15161a 100%)",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.14), inset 0 -1px 0 rgba(0,0,0,0.65), 0 10px 22px rgba(0,0,0,0.35)"
    };
}
function plateBodyStyle() {
    return {
        border: "2px solid rgba(0,0,0,0.28)",
        borderRadius: 14,
        background: "radial-gradient(circle at 30% 0%, rgba(255,255,255,0.12), transparent 55%), linear-gradient(180deg, rgba(255,255,255,0.94) 0%, rgba(229,232,236,0.98) 100%)",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.75), 0 16px 40px rgba(0,0,0,0.18)"
    };
}
function darkInsetStyle() {
    return {
        border: "2px solid rgba(0,0,0,0.45)",
        borderRadius: 14,
        background: "radial-gradient(circle at 20% 0%, rgba(255,77,0,0.14), transparent 55%), linear-gradient(180deg, #1f2228 0%, #0f1014 100%)",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.10), inset 0 -14px 22px rgba(0,0,0,0.55), 0 16px 38px rgba(0,0,0,0.25)"
    };
}
function SilverButton({ children, onClick, disabled, title, className = "" }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
        type: "button",
        onClick: onClick,
        disabled: disabled,
        title: title,
        className: `inline-flex items-center justify-center px-4 py-2 rounded font-semibold transition ${disabled ? "opacity-40 cursor-not-allowed" : "hover:opacity-95"} ${className}`,
        style: {
            background: "linear-gradient(180deg, rgba(255,255,255,0.95) 0%, rgba(205,205,205,0.78) 45%, rgba(120,120,120,0.55) 100%)",
            color: "#111",
            border: "1px solid rgba(255,255,255,0.35)",
            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.35), 0 10px 24px rgba(0,0,0,0.35)"
        },
        children: children
    }, void 0, false, {
        fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/[partijNr]/page.tsx",
        lineNumber: 251,
        columnNumber: 5
    }, this);
}
function Badge({ text, tone, invert }) {
    const cls = tone === "ok" ? invert ? "bg-green-700 text-white border-green-800" : "bg-green-50 text-green-800 border-green-300" : tone === "warn" ? invert ? "bg-yellow-500 text-black border-yellow-700" : "bg-yellow-50 text-yellow-900 border-yellow-300" : tone === "disp" ? invert ? "bg-orange-600 text-white border-orange-700" : "bg-orange-50 text-orange-900 border-orange-300" : tone === "info" ? invert ? "bg-blue-700 text-white border-blue-800" : "bg-blue-50 text-blue-900 border-blue-300" : invert ? "bg-red-700 text-white border-red-800" : "bg-red-50 text-red-900 border-red-300";
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
        className: "inline-flex items-center px-2.5 py-1 text-xs border rounded " + cls,
        children: text
    }, void 0, false, {
        fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/[partijNr]/page.tsx",
        lineNumber: 303,
        columnNumber: 5
    }, this);
}
// -----------------------------
// Fightsupport "Brute" UI blocks
// -----------------------------
function useLogoFallback(candidates) {
    const [idx, setIdx] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(0);
    const src = candidates[idx] ?? candidates[0] ?? "/branding/fightsupport/logo-dark.png";
    const onError = ()=>setIdx((i)=>Math.min(i + 1, candidates.length - 1));
    return {
        src,
        onError
    };
}
function MetalPanel({ children, className = "", accent = "none" }) {
    const cornerPlate = {
        background: "linear-gradient(180deg, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0.06) 35%, rgba(0,0,0,0.55) 100%)," + " linear-gradient(135deg, #8f949d 0%, #3a3d44 38%, #121318 100%)",
        border: "2px solid rgba(0,0,0,0.65)",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.22), inset 0 -1px 0 rgba(0,0,0,0.65), 0 10px 18px rgba(0,0,0,0.35)"
    };
    const rivet = {
        background: "radial-gradient(circle at 35% 30%, rgba(255,255,255,0.55), rgba(255,255,255,0.10) 40%, rgba(0,0,0,0.80) 75%)," + " linear-gradient(180deg, #d7d9df 0%, #777c86 55%, #2b2d33 100%)",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.35), 0 2px 6px rgba(0,0,0,0.55)",
        border: "1px solid rgba(0,0,0,0.55)"
    };
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: `relative ${className}`,
        style: metalFrameStyle(accent),
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "pointer-events-none absolute inset-[8px] rounded-[16px]",
                style: {
                    border: "2px solid rgba(255,255,255,0.12)",
                    boxShadow: "inset 0 0 0 2px rgba(0,0,0,0.55)"
                }
            }, void 0, false, {
                fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/[partijNr]/page.tsx",
                lineNumber: 348,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "relative",
                children: children
            }, void 0, false, {
                fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/[partijNr]/page.tsx",
                lineNumber: 356,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/[partijNr]/page.tsx",
        lineNumber: 346,
        columnNumber: 5
    }, this);
}
function PlateHeader({ title, right, dot }) {
    const dotCls = dot === "red" ? "bg-red-500" : dot === "blue" ? "bg-blue-500" : dot === "orange" ? "bg-[var(--brand-orange)]" : "bg-white/25";
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "relative px-4 py-3",
        style: plateHeaderStyle(),
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "flex items-center justify-between gap-3",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "flex items-center gap-2",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: `h-3.5 w-3.5 rounded-sm ${dotCls} shadow-[0_0_0_1px_rgba(0,0,0,0.45)]`
                            }, void 0, false, {
                                fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/[partijNr]/page.tsx",
                                lineNumber: 377,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "text-sm font-extrabold tracking-widest text-white",
                                children: title
                            }, void 0, false, {
                                fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/[partijNr]/page.tsx",
                                lineNumber: 378,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/[partijNr]/page.tsx",
                        lineNumber: 376,
                        columnNumber: 9
                    }, this),
                    right ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "text-sm text-white/70",
                        children: right
                    }, void 0, false, {
                        fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/[partijNr]/page.tsx",
                        lineNumber: 380,
                        columnNumber: 18
                    }, this) : null
                ]
            }, void 0, true, {
                fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/[partijNr]/page.tsx",
                lineNumber: 375,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "mt-2 h-[3px] w-full rounded-full",
                style: {
                    background: "linear-gradient(90deg, rgba(255,77,0,0.0) 0%, rgba(255,77,0,0.85) 22%, rgba(255,77,0,0.85) 78%, rgba(255,77,0,0.0) 100%)"
                }
            }, void 0, false, {
                fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/[partijNr]/page.tsx",
                lineNumber: 384,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/[partijNr]/page.tsx",
        lineNumber: 374,
        columnNumber: 5
    }, this);
}
function BruteHeaderA({ evenementNaam, evenementDatum, discipline, klasseMM, partijNrStr, matchmakingId, runStatus, navPrev, navNext, onPrev, onNext, onBack }) {
    const logo = useLogoFallback([
        "/branding/fightsupport/logo-dark.png",
        "/branding/fightsupport/logo-dark.webp",
        "/branding/fightsupport/logo-dark.jpg",
        "/logo_fightsupport.png",
        "/logo_fightsupport.webp",
        "/logo_fightsupport.jpg"
    ]);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(MetalPanel, {
        className: "p-0 overflow-hidden",
        accent: "orange",
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "relative p-4 md:p-5 overflow-hidden",
            style: {
                // ✅ Stoer metalen headerpaneel (donker staal + brushed texture + inner glow)
                background: `
            radial-gradient(900px 320px at 50% -40px, rgba(255,77,0,0.18), transparent 62%),
            radial-gradient(520px 240px at 14% 12%, rgba(255,255,255,0.12), transparent 62%),
            radial-gradient(520px 240px at 86% 18%, rgba(255,255,255,0.10), transparent 62%),
            /* brushed metal lines (vertical + horizontal) */
            repeating-linear-gradient(90deg, rgba(255,255,255,0.12) 0px, rgba(255,255,255,0.12) 1px, rgba(255,255,255,0.04) 1px, rgba(255,255,255,0.04) 6px),
            repeating-linear-gradient(0deg, rgba(0,0,0,0.10) 0px, rgba(0,0,0,0.10) 1px, rgba(0,0,0,0.00) 1px, rgba(0,0,0,0.00) 10px),
            linear-gradient(180deg, #3a3a3f 0%, #2a2a2e 55%, #17171a 100%)
          `,
                borderBottom: "3px solid rgba(255,77,0,0.55)",
                boxShadow: "inset 0 1px 0 rgba(255,255,255,0.08), inset 0 -10px 24px rgba(0,0,0,0.55)"
            },
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "pointer-events-none absolute inset-0",
                    style: {
                        opacity: 0.22,
                        backgroundImage: "radial-gradient(900px 260px at 50% 0%, rgba(255,255,255,0.06), transparent 60%)," + "repeating-linear-gradient(90deg, rgba(255,255,255,0.10) 0px, rgba(255,255,255,0.10) 1px, rgba(255,255,255,0.00) 1px, rgba(255,255,255,0.00) 9px)," + "repeating-linear-gradient(0deg, rgba(0,0,0,0.18) 0px, rgba(0,0,0,0.18) 1px, rgba(0,0,0,0.00) 1px, rgba(0,0,0,0.00) 13px)",
                        mixBlendMode: "overlay"
                    }
                }, void 0, false, {
                    fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/[partijNr]/page.tsx",
                    lineNumber: 446,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "pointer-events-none absolute inset-3 rounded-[18px]",
                    style: {
                        border: "1px solid rgba(255,255,255,0.10)",
                        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.10), inset 0 -1px 0 rgba(0,0,0,0.55)"
                    }
                }, void 0, false, {
                    fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/[partijNr]/page.tsx",
                    lineNumber: 459,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "grid grid-cols-1 md:grid-cols-3 items-center gap-4",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "order-2 md:order-1",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "text-[11px] tracking-widest text-white/60 font-semibold",
                                    children: "EVENT"
                                }, void 0, false, {
                                    fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/[partijNr]/page.tsx",
                                    lineNumber: 471,
                                    columnNumber: 11
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "mt-1 text-lg md:text-xl font-extrabold",
                                    style: {
                                        color: NVB_ORANGE
                                    },
                                    children: evenementNaam ?? "-"
                                }, void 0, false, {
                                    fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/[partijNr]/page.tsx",
                                    lineNumber: 472,
                                    columnNumber: 11
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "mt-2 grid grid-cols-1 gap-1 text-sm text-white/80",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                    className: "text-white/60",
                                                    children: "Datum:"
                                                }, void 0, false, {
                                                    fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/[partijNr]/page.tsx",
                                                    lineNumber: 478,
                                                    columnNumber: 15
                                                }, this),
                                                " ",
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                    className: "font-semibold",
                                                    style: metalText(),
                                                    children: evenementDatum ?? "-"
                                                }, void 0, false, {
                                                    fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/[partijNr]/page.tsx",
                                                    lineNumber: 479,
                                                    columnNumber: 15
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/[partijNr]/page.tsx",
                                            lineNumber: 477,
                                            columnNumber: 13
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                    className: "text-white/60",
                                                    children: "Discipline:"
                                                }, void 0, false, {
                                                    fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/[partijNr]/page.tsx",
                                                    lineNumber: 484,
                                                    columnNumber: 15
                                                }, this),
                                                " ",
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                    className: "text-white font-semibold",
                                                    children: discipline ?? "-"
                                                }, void 0, false, {
                                                    fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/[partijNr]/page.tsx",
                                                    lineNumber: 485,
                                                    columnNumber: 15
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/[partijNr]/page.tsx",
                                            lineNumber: 483,
                                            columnNumber: 13
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                    className: "text-white/60",
                                                    children: "Klasse (MM):"
                                                }, void 0, false, {
                                                    fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/[partijNr]/page.tsx",
                                                    lineNumber: 488,
                                                    columnNumber: 15
                                                }, this),
                                                " ",
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                    className: "text-white font-semibold",
                                                    children: klasseMM ?? "-"
                                                }, void 0, false, {
                                                    fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/[partijNr]/page.tsx",
                                                    lineNumber: 489,
                                                    columnNumber: 15
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/[partijNr]/page.tsx",
                                            lineNumber: 487,
                                            columnNumber: 13
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/[partijNr]/page.tsx",
                                    lineNumber: 476,
                                    columnNumber: 11
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/[partijNr]/page.tsx",
                            lineNumber: 469,
                            columnNumber: 9
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "order-1 md:order-2 flex justify-center items-center",
                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "text-center",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: `${__TURBOPACK__imported__module__$5b$next$5d2f$internal$2f$font$2f$google$2f$bebas_neue_17e950bc$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"].className} text-[48px] md:text-[60px] leading-none tracking-[0.22em]`,
                                        style: {
                                            // ✅ Duidelijker: meer wit + NVB-oranje highlight + 3D/emboss
                                            ...fightSupportTitleText(),
                                            filter: "drop-shadow(0 18px 28px rgba(0,0,0,0.75)) drop-shadow(0 0 14px rgba(255,255,255,0.35))",
                                            textShadow: // top highlight
                                            "0 1px 0 rgba(255,255,255,0.30)," + // emboss rim
                                            "0 2px 0 rgba(0,0,0,0.72)," + "0 3px 0 rgba(0,0,0,0.78)," + // extra depth
                                            "0 8px 16px rgba(0,0,0,0.62)," + "0 16px 30px rgba(0,0,0,0.70)," + // subtle orange edge glow
                                            "0 0 18px rgba(255,255,255,0.45)"
                                        },
                                        children: "FIGHTSUPPORT"
                                    }, void 0, false, {
                                        fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/[partijNr]/page.tsx",
                                        lineNumber: 497,
                                        columnNumber: 13
                                    }, this),
                                    ("TURBOPACK compile-time falsy", 0) ? /*#__PURE__*/ "TURBOPACK unreachable" : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "mt-3"
                                    }, void 0, false, {
                                        fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/[partijNr]/page.tsx",
                                        lineNumber: 579,
                                        columnNumber: 15
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "mt-2 text-[11px] tracking-[0.35em] text-white/60 font-semibold",
                                        children: "CONTROLE DASHBOARD"
                                    }, void 0, false, {
                                        fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/[partijNr]/page.tsx",
                                        lineNumber: 582,
                                        columnNumber: 13
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/[partijNr]/page.tsx",
                                lineNumber: 496,
                                columnNumber: 11
                            }, this)
                        }, void 0, false, {
                            fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/[partijNr]/page.tsx",
                            lineNumber: 495,
                            columnNumber: 9
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "order-3 md:text-right",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "text-[11px] tracking-widest text-white/60 font-semibold",
                                    children: "CONTROLE"
                                }, void 0, false, {
                                    fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/[partijNr]/page.tsx",
                                    lineNumber: 590,
                                    columnNumber: 11
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "mt-1 text-xl md:text-2xl font-extrabold text-white",
                                    children: [
                                        "Partij ",
                                        partijNrStr
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/[partijNr]/page.tsx",
                                    lineNumber: 591,
                                    columnNumber: 11
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "mt-2 flex md:justify-end gap-2 flex-wrap",
                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(Badge, {
                                        text: `RUN: ${(runStatus ?? "-").toUpperCase()}`,
                                        tone: runStatus === "klaar" ? "ok" : runStatus ? "warn" : "info"
                                    }, void 0, false, {
                                        fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/[partijNr]/page.tsx",
                                        lineNumber: 594,
                                        columnNumber: 13
                                    }, this)
                                }, void 0, false, {
                                    fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/[partijNr]/page.tsx",
                                    lineNumber: 593,
                                    columnNumber: 11
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "mt-2 text-xs text-white/60 break-all",
                                    children: [
                                        "Matchmaking ID: ",
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                            className: "text-white/70",
                                            children: String(matchmakingId ?? "-")
                                        }, void 0, false, {
                                            fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/[partijNr]/page.tsx",
                                            lineNumber: 601,
                                            columnNumber: 29
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/[partijNr]/page.tsx",
                                    lineNumber: 600,
                                    columnNumber: 11
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "mt-3 flex flex-wrap md:justify-end gap-2",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                            onClick: ()=>onBack?.(),
                                            className: "px-3 py-2 rounded font-semibold text-white transition active:scale-95",
                                            style: {
                                                background: "linear-gradient(180deg, #ff6200 0%, #cc3d00 100%)",
                                                border: "1px solid rgba(0,0,0,0.6)",
                                                boxShadow: "inset 0 1px 0 rgba(255,255,255,0.3), 0 6px 14px rgba(0,0,0,0.5)"
                                            },
                                            title: "Terug",
                                            children: "←"
                                        }, void 0, false, {
                                            fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/[partijNr]/page.tsx",
                                            lineNumber: 607,
                                            columnNumber: 13
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(SilverButton, {
                                            disabled: !navPrev,
                                            onClick: onPrev,
                                            title: "Vorige partij",
                                            className: "px-3 py-2",
                                            children: "←"
                                        }, void 0, false, {
                                            fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/[partijNr]/page.tsx",
                                            lineNumber: 620,
                                            columnNumber: 13
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(SilverButton, {
                                            disabled: !navNext,
                                            onClick: onNext,
                                            title: "Volgende partij",
                                            className: "px-3 py-2",
                                            children: "→"
                                        }, void 0, false, {
                                            fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/[partijNr]/page.tsx",
                                            lineNumber: 623,
                                            columnNumber: 13
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/[partijNr]/page.tsx",
                                    lineNumber: 604,
                                    columnNumber: 11
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/[partijNr]/page.tsx",
                            lineNumber: 589,
                            columnNumber: 9
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/[partijNr]/page.tsx",
                    lineNumber: 467,
                    columnNumber: 7
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/[partijNr]/page.tsx",
            lineNumber: 427,
            columnNumber: 7
        }, this)
    }, void 0, false, {
        fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/[partijNr]/page.tsx",
        lineNumber: 426,
        columnNumber: 5
    }, this);
}
function FighterMetalCard({ side, naam, gym, va, lic, sv, dob, leeftijdEvent, geslacht, klasseMM, nulKlasse, nulTotaal, nulOpmerking, canEdit, onEdit }) {
    const isR = side === "rood";
    const accent = isR ? "red" : "blue";
    const dot = isR ? "bg-red-500" : "bg-blue-500";
    const label = isR ? "ROOD" : "BLAUW";
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(MetalPanel, {
        className: "p-0 overflow-hidden",
        accent: accent,
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "flex items-center justify-between px-4 py-3 border-b",
                style: {
                    // ✅ Brute header: donker staal + rood/blauw accent
                    background: `radial-gradient(circle at 18% 10%, ${isR ? "rgba(220,38,38,0.22)" : "rgba(37,99,235,0.22)"}, transparent 55%),
                      linear-gradient(180deg, #2f3239 0%, #1a1c20 100%)`,
                    borderBottomColor: "rgba(0,0,0,0.35)",
                    borderLeft: `7px solid ${isR ? "rgba(220,38,38,0.95)" : "rgba(37,99,235,0.95)"}`
                },
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "flex items-center gap-2",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: `h-3.5 w-3.5 rounded-sm ${dot}`
                            }, void 0, false, {
                                fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/[partijNr]/page.tsx",
                                lineNumber: 686,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "text-sm font-extrabold tracking-widest text-white",
                                children: label
                            }, void 0, false, {
                                fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/[partijNr]/page.tsx",
                                lineNumber: 687,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/[partijNr]/page.tsx",
                        lineNumber: 685,
                        columnNumber: 9
                    }, this),
                    canEdit ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                        type: "button",
                        onClick: onEdit,
                        className: "inline-flex items-center px-3 py-1.5 rounded-md border text-xs font-semibold",
                        style: {
                            borderColor: "rgba(63,63,70,0.28)",
                            background: "rgba(255,255,255,0.70)",
                            color: "#111827"
                        },
                        children: "✎ Bewerken"
                    }, void 0, false, {
                        fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/[partijNr]/page.tsx",
                        lineNumber: 691,
                        columnNumber: 11
                    }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {}, void 0, false, {
                        fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/[partijNr]/page.tsx",
                        lineNumber: 704,
                        columnNumber: 11
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/[partijNr]/page.tsx",
                lineNumber: 675,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "p-4",
                style: {
                    color: "rgba(244,244,245,0.96)",
                    background: "linear-gradient(180deg, rgba(24,24,27,0.92) 0%, rgba(10,10,12,0.96) 100%)"
                },
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "text-3xl font-black leading-tight",
                        style: {
                            color: NVB_ORANGE
                        },
                        children: naam || "-"
                    }, void 0, false, {
                        fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/[partijNr]/page.tsx",
                        lineNumber: 712,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "text-white/70",
                        children: gym || "-"
                    }, void 0, false, {
                        fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/[partijNr]/page.tsx",
                        lineNumber: 718,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "mt-2 text-sm text-white/75",
                        children: [
                            "FP/VA: ",
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: "text-white font-semibold",
                                children: va || "-"
                            }, void 0, false, {
                                fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/[partijNr]/page.tsx",
                                lineNumber: 720,
                                columnNumber: 18
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/[partijNr]/page.tsx",
                        lineNumber: 719,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "mt-3 flex flex-wrap gap-2",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "flex items-center gap-2",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "text-xs text-white/60",
                                        children: "Licentie:"
                                    }, void 0, false, {
                                        fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/[partijNr]/page.tsx",
                                        lineNumber: 725,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(Badge, {
                                        text: (lic ?? "Onbekend").toUpperCase(),
                                        tone: lic === "ja" ? "ok" : lic === "nee" ? "err" : "warn",
                                        invert: true
                                    }, void 0, false, {
                                        fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/[partijNr]/page.tsx",
                                        lineNumber: 726,
                                        columnNumber: 13
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/[partijNr]/page.tsx",
                                lineNumber: 724,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "flex items-center gap-2",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "text-xs text-white/60",
                                        children: "Startverbod:"
                                    }, void 0, false, {
                                        fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/[partijNr]/page.tsx",
                                        lineNumber: 729,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(Badge, {
                                        text: (sv ?? "Onbekend").toUpperCase(),
                                        tone: sv === "nee" ? "ok" : sv === "ja" ? "err" : "warn",
                                        invert: true
                                    }, void 0, false, {
                                        fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/[partijNr]/page.tsx",
                                        lineNumber: 730,
                                        columnNumber: 13
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/[partijNr]/page.tsx",
                                lineNumber: 728,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/[partijNr]/page.tsx",
                        lineNumber: 723,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "mt-4 grid grid-cols-2 gap-2 text-sm text-white/75",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                children: [
                                    "Geboortedatum: ",
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "text-white",
                                        children: fmtDateOnlyNL(dob)
                                    }, void 0, false, {
                                        fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/[partijNr]/page.tsx",
                                        lineNumber: 736,
                                        columnNumber: 28
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/[partijNr]/page.tsx",
                                lineNumber: 735,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                children: [
                                    "Leeftijd (event): ",
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "text-white",
                                        children: leeftijdEvent
                                    }, void 0, false, {
                                        fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/[partijNr]/page.tsx",
                                        lineNumber: 739,
                                        columnNumber: 31
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/[partijNr]/page.tsx",
                                lineNumber: 738,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                children: [
                                    "Geslacht: ",
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "text-white",
                                        children: geslacht || "-"
                                    }, void 0, false, {
                                        fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/[partijNr]/page.tsx",
                                        lineNumber: 742,
                                        columnNumber: 23
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/[partijNr]/page.tsx",
                                lineNumber: 741,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                children: [
                                    "Klasse: ",
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "text-white",
                                        children: klasseMM || "-"
                                    }, void 0, false, {
                                        fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/[partijNr]/page.tsx",
                                        lineNumber: 745,
                                        columnNumber: 21
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/[partijNr]/page.tsx",
                                lineNumber: 744,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/[partijNr]/page.tsx",
                        lineNumber: 734,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "mt-4 rounded-xl border p-3",
                        style: {
                            border: "2px solid rgba(63,63,70,0.28)",
                            background: "linear-gradient(180deg, rgba(255,255,255,0.08) 0%, rgba(0,0,0,0.35) 100%)",
                            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.10), inset 0 -8px 16px rgba(0,0,0,0.55)"
                        },
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "text-xs text-white/60 mb-1",
                                children: "Extra / nulmeting"
                            }, void 0, false, {
                                fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/[partijNr]/page.tsx",
                                lineNumber: 757,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "text-sm text-white/75",
                                children: [
                                    "Klasse (nulmeting): ",
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "text-white",
                                        children: nulKlasse || "-"
                                    }, void 0, false, {
                                        fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/[partijNr]/page.tsx",
                                        lineNumber: 759,
                                        columnNumber: 33
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "text-white/40",
                                        children: " • "
                                    }, void 0, false, {
                                        fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/[partijNr]/page.tsx",
                                        lineNumber: 760,
                                        columnNumber: 13
                                    }, this),
                                    "Totaal (nulmeting): ",
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "text-white",
                                        children: nulTotaal ?? "-"
                                    }, void 0, false, {
                                        fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/[partijNr]/page.tsx",
                                        lineNumber: 761,
                                        columnNumber: 33
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/[partijNr]/page.tsx",
                                lineNumber: 758,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "mt-1 text-sm text-white/85 whitespace-pre-wrap",
                                children: nulOpmerking ? nulOpmerking : "-"
                            }, void 0, false, {
                                fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/[partijNr]/page.tsx",
                                lineNumber: 763,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/[partijNr]/page.tsx",
                        lineNumber: 749,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/[partijNr]/page.tsx",
                lineNumber: 708,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/[partijNr]/page.tsx",
        lineNumber: 673,
        columnNumber: 5
    }, this);
}
function parseISODateOnly(d) {
    if (!d) return null;
    const s = String(d).trim();
    const dt = new Date(s.length === 10 ? `${s}T00:00:00` : s);
    return isNaN(dt.getTime()) ? null : dt;
}
function dateOnlyUTC(d) {
    return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
}
function addMonthsUTC(date, add) {
    const y = date.getUTCFullYear();
    const m = date.getUTCMonth();
    const day = date.getUTCDate();
    // target month/year
    const ty = y + Math.floor((m + add) / 12);
    const tm = ((m + add) % 12 + 12) % 12;
    // last day of target month
    const last = new Date(Date.UTC(ty, tm + 1, 0)).getUTCDate();
    const dd = Math.min(day, last);
    return new Date(Date.UTC(ty, tm, dd));
}
/**
 * Absolute verschil tussen 2 datums als (maanden, dagen).
 * Kalender-maanden: we tellen volledige maanden, daarna resterende dagen.
 * (UTC date-only om DST-afwijkingen te vermijden)
 */ function diffMonthsDaysAbs(a, b) {
    const A = dateOnlyUTC(a);
    const B = dateOnlyUTC(b);
    let start = A;
    let end = B;
    if (start.getTime() > end.getTime()) {
        start = B;
        end = A;
    }
    let months = 0;
    let cursor = start;
    while(true){
        const next = addMonthsUTC(cursor, 1);
        if (next.getTime() <= end.getTime()) {
            months += 1;
            cursor = next;
            continue;
        }
        break;
    }
    const MS_DAY = 24 * 60 * 60 * 1000;
    const days = Math.round((end.getTime() - cursor.getTime()) / MS_DAY);
    return {
        months,
        days
    };
}
function fmtMonthsDays(months, days) {
    const m = Number.isFinite(months) ? months : 0;
    const d = Number.isFinite(days) ? days : 0;
    if (m > 0 && d > 0) return `${m} maanden ${d} dagen`;
    if (m > 0) return `${m} maanden`;
    return `${d} dagen`;
}
function fmtDateOnlyNL(d) {
    if (!d) return "-";
    const dt = parseISODateOnly(d);
    if (!dt) return String(d);
    return dt.toLocaleDateString("nl-NL");
}
function calcAgeYearsOnDate(eventDate, birthDate) {
    let years = eventDate.getFullYear() - birthDate.getFullYear();
    const m = eventDate.getMonth() - birthDate.getMonth();
    if (m < 0 || m === 0 && eventDate.getDate() < birthDate.getDate()) years -= 1;
    if (years < 0 || !Number.isFinite(years)) return null;
    return years;
}
function ageYearsAtEvent(ctx, side) {
    const event = parseISODateOnly(ctx?.evenement_datum);
    const birth = parseISODateOnly(ctx?.[`${side}_geboortedatum_fp`] ?? ctx?.[`${side}_geboortedatum_mm`]);
    if (!event || !birth) return "-";
    const years = calcAgeYearsOnDate(event, birth);
    return years == null ? "-" : `${years} jaar`;
}
function toInt(v) {
    if (v == null) return null;
    const n = Number(String(v).replace(",", "."));
    return Number.isFinite(n) ? Math.trunc(n) : null;
}
function toNumKg(v) {
    if (v == null) return null;
    const s = String(v).trim().replace(/,/g, ".");
    if (!s) return null;
    const n = Number(s);
    return Number.isFinite(n) ? n : null;
}
function parseJaNee(v) {
    if (v === true) return "ja";
    if (v === false) return "nee";
    const s = String(v ?? "").trim().toLowerCase();
    if (!s) return null;
    if ([
        "ja",
        "yes",
        "true",
        "1"
    ].includes(s)) return "ja";
    if ([
        "nee",
        "no",
        "false",
        "0"
    ].includes(s)) return "nee";
    return null;
}
function normResultaat(v) {
    const s = String(v ?? "").trim().toLowerCase();
    if (!s) return "";
    if (s === "afkeur" || s === "afgekeur" || s === "afgekeurd" || s === "afkeuren") return "afgekeurd";
    if (s === "actie" || s === "waarschuwing") return "actie";
    if (s === "dispensatie" || s === "disp") return "dispensatie";
    if (s === "ok" || s === "goedgekeurd") return "ok";
    return s;
}
function asUuid(v) {
    if (v == null) return null;
    const s = String(v).trim();
    if (!s || s === "[object Object]") return null;
    return s;
}
function displayResultaat(row) {
    const code = (row.rule_code ?? "").toUpperCase();
    const msg = String(row.boodschap ?? "").toLowerCase();
    if (msg.includes("geen data") || msg.includes("no data") || msg.includes("missing")) {
        return {
            label: "GEEN DATA",
            tone: "info"
        };
    }
    if (code.startsWith("STARTVERBOD_")) return {
        label: "STARTVERBOD",
        tone: "err"
    };
    // ✅ België: dit is een LET OP / INFO melding, geen AFKEUR
    if (code.startsWith("KEURMERK_BE_") && code.endsWith("_INFO")) {
        return {
            label: "LET OP",
            tone: "info"
        };
    }
    if (code.startsWith("LICENTIE_") || code.startsWith("KEURMERK_")) {
        if (normResultaat(row.resultaat) === "afgekeurd") return {
            label: "AFKEUR",
            tone: "err"
        };
        return {
            label: "AFKEUR",
            tone: "err"
        };
    }
    const r = normResultaat(row.resultaat);
    if (r === "afgekeurd") return {
        label: "AFKEUR",
        tone: "err"
    };
    if (r === "dispensatie") return {
        label: "DISPENSATIE",
        tone: "disp"
    };
    if (r === "actie") return {
        label: "ACTIE",
        tone: "warn"
    };
    if (r === "ok") return {
        label: "OK",
        tone: "ok"
    };
    return {
        label: String(r).toUpperCase(),
        tone: "info"
    };
}
// ✅ UitslagenTable met paging (per 6 + Verder)
function UitslagenTable({ rows, pageSize = 6 }) {
    const [limit, setLimit] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(pageSize);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        setLimit(pageSize);
    }, [
        pageSize,
        rows
    ]);
    const shown = rows.slice(0, limit);
    const hasMore = shown.length < rows.length;
    const padCount = Math.max(0, pageSize - shown.length);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "overflow-auto rounded-md border-2 border-zinc-300 bg-white",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("table", {
                className: "w-full text-sm border-collapse table-fixed",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("thead", {
                        className: "bg-zinc-800 text-white border-b-4",
                        style: {
                            borderColor: NVB_ORANGE
                        },
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("tr", {
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                    className: "text-left px-3 py-2 w-32 border-r border-zinc-700",
                                    children: "Datum"
                                }, void 0, false, {
                                    fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/[partijNr]/page.tsx",
                                    lineNumber: 955,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                    className: "text-left px-3 py-2 w-48 border-r border-zinc-700",
                                    children: "Discipline"
                                }, void 0, false, {
                                    fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/[partijNr]/page.tsx",
                                    lineNumber: 956,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                    className: "text-left px-3 py-2 w-16 border-r border-zinc-700",
                                    children: "Klasse"
                                }, void 0, false, {
                                    fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/[partijNr]/page.tsx",
                                    lineNumber: 957,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                    className: "text-left px-3 py-2",
                                    children: "Uitslag"
                                }, void 0, false, {
                                    fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/[partijNr]/page.tsx",
                                    lineNumber: 958,
                                    columnNumber: 13
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/[partijNr]/page.tsx",
                            lineNumber: 954,
                            columnNumber: 11
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/[partijNr]/page.tsx",
                        lineNumber: 953,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("tbody", {
                        className: "[&>tr:nth-child(odd)]:bg-white [&>tr:nth-child(odd)]:text-zinc-900 [&>tr:nth-child(even)]:bg-zinc-700 [&>tr:nth-child(even)]:text-white",
                        children: shown.length === 0 ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Fragment"], {
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("tr", {
                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                        className: "px-3 py-2",
                                        colSpan: 4,
                                        children: "Geen uitslagen gevonden."
                                    }, void 0, false, {
                                        fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/[partijNr]/page.tsx",
                                        lineNumber: 967,
                                        columnNumber: 17
                                    }, this)
                                }, void 0, false, {
                                    fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/[partijNr]/page.tsx",
                                    lineNumber: 966,
                                    columnNumber: 15
                                }, this),
                                Array.from({
                                    length: Math.max(0, pageSize - 1)
                                }).map((_, idx)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("tr", {
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                className: "px-3 py-2 w-32",
                                                children: " "
                                            }, void 0, false, {
                                                fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/[partijNr]/page.tsx",
                                                lineNumber: 973,
                                                columnNumber: 19
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                className: "px-3 py-2 w-48",
                                                children: " "
                                            }, void 0, false, {
                                                fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/[partijNr]/page.tsx",
                                                lineNumber: 974,
                                                columnNumber: 19
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                className: "px-3 py-2 w-16",
                                                children: " "
                                            }, void 0, false, {
                                                fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/[partijNr]/page.tsx",
                                                lineNumber: 975,
                                                columnNumber: 19
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                className: "px-3 py-2",
                                                children: " "
                                            }, void 0, false, {
                                                fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/[partijNr]/page.tsx",
                                                lineNumber: 976,
                                                columnNumber: 19
                                            }, this)
                                        ]
                                    }, `empty-${idx}`, true, {
                                        fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/[partijNr]/page.tsx",
                                        lineNumber: 972,
                                        columnNumber: 17
                                    }, this))
                            ]
                        }, void 0, true) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Fragment"], {
                            children: [
                                shown.map((r, idx)=>{
                                    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("tr", {
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                className: "px-3 py-2 w-32 whitespace-nowrap opacity-80",
                                                children: r.datum ?? "-"
                                            }, void 0, false, {
                                                fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/[partijNr]/page.tsx",
                                                lineNumber: 985,
                                                columnNumber: 21
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                className: "px-3 py-2 w-48 font-semibold truncate",
                                                children: r.discipline ?? "-"
                                            }, void 0, false, {
                                                fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/[partijNr]/page.tsx",
                                                lineNumber: 986,
                                                columnNumber: 21
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                className: "px-3 py-2 w-16 text-center font-bold",
                                                children: r.klasse ?? "-"
                                            }, void 0, false, {
                                                fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/[partijNr]/page.tsx",
                                                lineNumber: 987,
                                                columnNumber: 21
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                className: "px-3 py-2",
                                                children: r.uitslag ?? "-"
                                            }, void 0, false, {
                                                fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/[partijNr]/page.tsx",
                                                lineNumber: 988,
                                                columnNumber: 21
                                            }, this)
                                        ]
                                    }, `${r.datum ?? "d"}-${idx}`, true, {
                                        fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/[partijNr]/page.tsx",
                                        lineNumber: 984,
                                        columnNumber: 19
                                    }, this);
                                }),
                                padCount > 0 ? Array.from({
                                    length: padCount
                                }).map((_, i)=>{
                                    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("tr", {
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                className: "px-3 py-2 w-32",
                                                children: " "
                                            }, void 0, false, {
                                                fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/[partijNr]/page.tsx",
                                                lineNumber: 996,
                                                columnNumber: 25
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                className: "px-3 py-2 w-48",
                                                children: " "
                                            }, void 0, false, {
                                                fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/[partijNr]/page.tsx",
                                                lineNumber: 997,
                                                columnNumber: 25
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                className: "px-3 py-2 w-16",
                                                children: " "
                                            }, void 0, false, {
                                                fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/[partijNr]/page.tsx",
                                                lineNumber: 998,
                                                columnNumber: 25
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                className: "px-3 py-2",
                                                children: " "
                                            }, void 0, false, {
                                                fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/[partijNr]/page.tsx",
                                                lineNumber: 999,
                                                columnNumber: 25
                                            }, this)
                                        ]
                                    }, `pad-${i}`, true, {
                                        fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/[partijNr]/page.tsx",
                                        lineNumber: 995,
                                        columnNumber: 23
                                    }, this);
                                }) : null
                            ]
                        }, void 0, true)
                    }, void 0, false, {
                        fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/[partijNr]/page.tsx",
                        lineNumber: 963,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/[partijNr]/page.tsx",
                lineNumber: 951,
                columnNumber: 7
            }, this),
            rows.length > pageSize && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "flex items-center justify-between gap-3 p-3 border-t border-zinc-300",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "text-xs text-zinc-600",
                        children: [
                            shown.length,
                            " / ",
                            rows.length
                        ]
                    }, void 0, true, {
                        fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/[partijNr]/page.tsx",
                        lineNumber: 1011,
                        columnNumber: 11
                    }, this),
                    hasMore ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                        type: "button",
                        onClick: ()=>setLimit((n)=>n + pageSize),
                        className: "px-3 py-2 rounded bg-[var(--brand-orange)] text-black text-xs font-extrabold hover:opacity-90",
                        children: "Verder"
                    }, void 0, false, {
                        fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/[partijNr]/page.tsx",
                        lineNumber: 1015,
                        columnNumber: 13
                    }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        className: "text-xs text-zinc-500",
                        children: "Einde"
                    }, void 0, false, {
                        fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/[partijNr]/page.tsx",
                        lineNumber: 1023,
                        columnNumber: 13
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/[partijNr]/page.tsx",
                lineNumber: 1010,
                columnNumber: 9
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/[partijNr]/page.tsx",
        lineNumber: 950,
        columnNumber: 5
    }, this);
}
function PartijDetailPage() {
    const [allPartijNrs, setAllPartijNrs] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])([]);
    // ✅ Draft notities per melding — voorkomt focus-loss & scroll-jumps bij typen.
    // We gebruiken bewust een ref zodat typen NIET een rerender per letter triggert.
    const noteDraftRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])({});
    const params = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useParams"])();
    const router = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRouter"])();
    const matchmakingId = params?.matchmakingId;
    const partijNrStr = params?.partijNr;
    const partijNr = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useMemo"])(()=>{
        const n = Number(partijNrStr);
        return Number.isFinite(n) ? n : null;
    }, [
        partijNrStr
    ]);
    const nav = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useMemo"])(()=>{
        if (!partijNr || allPartijNrs.length === 0) return {
            prev: null,
            next: null
        };
        const idx = allPartijNrs.indexOf(partijNr);
        if (idx === -1) return {
            prev: null,
            next: null
        };
        return {
            prev: idx > 0 ? allPartijNrs[idx - 1] : null,
            next: idx < allPartijNrs.length - 1 ? allPartijNrs[idx + 1] : null
        };
    }, [
        partijNr,
        allPartijNrs
    ]);
    const [loading, setLoading] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(true);
    const [error, setError] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(null);
    const [msg, setMsg] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])("");
    const [run, setRun] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(null);
    // ✅ event header info (uit matchmaking_uploads / events)
    const [evenementNaam, setEvenementNaam] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(null);
    const [evenementDatum, setEvenementDatum] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(null);
    const [ctx, setCtx] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(null);
    const [regels, setRegels] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])([]);
    // (notities drafts zitten in noteDraftRef)
    const [uitslagenRood, setUitslagenRood] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])([]);
    const [uitslagenBlauw, setUitslagenBlauw] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])([]);
    const [approving, setApproving] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(false);
    const [rescraping, setRescraping] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(false);
    const [sendingDisp, setSendingDisp] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(false);
    const [dispSent, setDispSent] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(false);
    // ✅ Rollen
    const [roleNames, setRoleNames] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])([]);
    const isSuperadmin = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useMemo"])(()=>roleNames.map((r)=>r.toLowerCase()).includes("superadmin"), [
        roleNames
    ]);
    const isAdmin = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useMemo"])(()=>{
        const lower = roleNames.map((r)=>r.toLowerCase());
        return lower.includes("admin") || lower.includes("superadmin");
    }, [
        roleNames
    ]);
    // ====== PERSON EDIT (ROOD/BLAUW) ======
    const [editOpen, setEditOpen] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(null);
    const [editVa, setEditVa] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])("");
    const [editNaam, setEditNaam] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])("");
    const [editGym, setEditGym] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])("");
    const [editBoutDiscipline, setEditBoutDiscipline] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])("");
    const [editBoutKlasse, setEditBoutKlasse] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])("");
    // ✅ Drafts voor modal inputs via ref (geen rerender per letter → geen focus-loss / typ-lag)
    const editDraftRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])({
        va: "",
        naam: "",
        gym: "",
        discipline: "",
        klasse: ""
    });
    // ✅ Force remount van modal inputs bij openen (reset defaultValue netjes)
    const [editMountKey, setEditMountKey] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(0);
    const [editSaving, setEditSaving] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(false);
    // (vinkje verwijderd) → default: niet gewijzigd
    const vaGewijzigd = false;
    function openEdit(side) {
        if (!ctx) return;
        const va = String(ctx?.[`${side}_va_mm`] ?? "").trim();
        const naam = String(ctx?.[`${side}_naam_mm`] ?? ctx?.[`${side}_naam_fp`] ?? "").trim();
        const gym = String(ctx?.[`${side}_gym_mm`] ?? "").trim();
        // state houden we alleen voor startwaarden/fallback (niet per letter bijwerken)
        setEditVa(va);
        setEditNaam(naam);
        setEditGym(gym);
        // ✅ Partij (bout) velden
        const d = String(ctx?.discipline ?? ctx?.discipline_mm ?? "").trim();
        const k = String(ctx?.klasse_mm ?? ctx?.klasse ?? "").trim();
        setEditBoutDiscipline(d);
        setEditBoutKlasse(k);
        // ✅ Drafts vullen (uncontrolled inputs lezen/schrijven hieruit)
        editDraftRef.current = {
            va,
            naam,
            gym,
            discipline: d,
            klasse: k
        };
        setEditMountKey((x)=>x + 1);
        // (vinkje verwijderd)
        setEditOpen(side);
    }
    function closeEdit() {
        // (vinkje verwijderd)
        setEditBoutDiscipline('');
        setEditBoutKlasse('');
        editDraftRef.current = {
            va: "",
            naam: "",
            gym: "",
            discipline: "",
            klasse: ""
        };
        setEditOpen(null);
    }
    async function loadMyRoles() {
        const { data: u } = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabaseClient$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["supabase"].auth.getUser();
        const uid = u?.user?.id ?? null;
        if (!uid) {
            setRoleNames([]);
            return {
                uid: null,
                roles: []
            };
        }
        const { data: ur, error: urErr } = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabaseClient$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["supabase"].from("user_roles").select("role_id").eq("user_id", uid);
        if (urErr) {
            console.error("Fout bij laden user_roles:", urErr);
            setRoleNames([]);
            return {
                uid,
                roles: []
            };
        }
        const roleIds = (ur ?? []).map((x)=>x.role_id).filter(Boolean);
        if (roleIds.length === 0) {
            setRoleNames([]);
            return {
                uid,
                roles: []
            };
        }
        const { data: rr, error: rrErr } = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabaseClient$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["supabase"].from("roles").select("id, name").in("id", roleIds);
        if (rrErr) {
            console.error("Fout bij laden roles:", rrErr);
            setRoleNames([]);
            return {
                uid,
                roles: []
            };
        }
        const names = (rr ?? []).map((r)=>String(r?.name ?? "").trim()).filter(Boolean);
        setRoleNames(names);
        return {
            uid,
            roles: names
        };
    }
    // ✅ Superadmin: alles (incl. dispensatie). Admin: alleen licentie/keurmerk op actie/afkeur.
    function canApproveRule(r) {
        const res = normResultaat(r?.resultaat);
        // ✅ Renate: Admin/Superadmin mag alles reviewen behalve OK
        if (!(isSuperadmin || isAdmin)) return false;
        return res !== "ok";
    }
    async function saveAantekeningen(resultaatId, text) {
        if (!resultaatId) return;
        setError(null);
        try {
            const { error: updErr } = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabaseClient$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["supabase"].from("controle_resultaten").update({
                aantekeningen: text
            }).eq("id", resultaatId);
            if (updErr) throw updErr;
            setRegels((prev)=>prev.map((r)=>r.id === resultaatId ? {
                        ...r,
                        aantekeningen: text
                    } : r));
        } catch (e) {
            setError(e?.message ?? String(e));
        }
    }
    // ✅ Haal reden uit draft (als die bestaat), anders uit state.
    function getNoteFor(resultaatId) {
        if (!resultaatId) return "";
        const draft = noteDraftRef.current[resultaatId];
        if (draft != null) return String(draft);
        const row = regels.find((r)=>r.id === resultaatId);
        return String(row?.aantekeningen ?? "");
    }
    function primeNoteDrafts(rows) {
        // Vul drafts éénmalig aan (zonder rerender). Bewaar wat de gebruiker al typte.
        const cur = noteDraftRef.current;
        for (const r of rows ?? []){
            if (!r?.id) continue;
            if (cur[r.id] == null) cur[r.id] = String(r?.aantekeningen ?? "");
        }
    }
    async function reloadRegels() {
        if (!run?.id || !partijNr) return;
        const { data: resRows, error: resErr } = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabaseClient$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["supabase"].from("controle_resultaten").select("*").eq("controle_run_id", run.id).eq("partij_nr", partijNr).order("created_at", {
            ascending: true
        });
        if (resErr) throw resErr;
        const rows = resRows ?? [];
        setRegels(rows);
        primeNoteDrafts(rows);
    }
    async function approveSingle(resultaatId) {
        if (!resultaatId) return;
        if (!run?.id || !partijNr) return;
        setApproving(true);
        setError(null);
        try {
            const row = regels.find((r)=>r.id === resultaatId);
            if (row && !canApproveRule(row)) throw new Error("Je hebt geen rechten om deze melding goed te keuren.");
            const res = normResultaat(row?.resultaat);
            // ✅ Superadmin: mag ook DISPENSATIE. Anderen niet.
            if (res === "dispensatie" && !isSuperadmin) {
                throw new Error("Dispensatie kan hier niet. Gaat naar dispensatie-module.");
            }
            // ✅ Superadmin: actie/afkeur/dispensatie. Admin: alleen actie/afkeur (al afgevangen in canApproveRule)
            if (res !== "actie" && res !== "afgekeurd" && res !== "dispensatie") {
                throw new Error("Alleen ACTIE, AFKEUR of (superadmin) DISPENSATIE kan hier worden goedgekeurd.");
            }
            const reason = String(getNoteFor(resultaatId) ?? "").trim();
            const { data: sess } = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabaseClient$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["supabase"].auth.getSession();
            const token = sess?.session?.access_token ?? null;
            if (!token) throw new Error("Niet ingelogd (geen access token).");
            const rApi = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$api$2f$authedFetch$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["authedFetch"])("/api/control-engine/review", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    controle_resultaat_id: resultaatId,
                    decision: "approve",
                    note: reason
                })
            });
            const jApi = await rApi.json().catch(()=>({}));
            if (!rApi.ok) throw new Error(jApi?.error ?? "Goedkeuren mislukt");
            await reloadRegels();
        } catch (e) {
            setError(e?.message ?? String(e));
        } finally{
            setApproving(false);
        }
    }
    async function rejectSingle(resultaatId) {
        if (!resultaatId) return;
        if (!run?.id || !partijNr) return;
        setApproving(true);
        setError(null);
        try {
            const row = regels.find((r)=>r.id === resultaatId);
            if (row && !canApproveRule(row)) throw new Error("Je hebt geen rechten om deze melding af te keuren.");
            const res = normResultaat(row?.resultaat);
            // ✅ Superadmin: mag ook DISPENSATIE. Anderen niet.
            if (res === "dispensatie" && !isSuperadmin) {
                throw new Error("Dispensatie kan hier niet. Gaat naar dispensatie-module.");
            }
            if (res !== "actie" && res !== "afgekeurd" && res !== "dispensatie") {
                throw new Error("Alleen ACTIE, AFKEUR of (superadmin) DISPENSATIE kan hier worden afgekeurd.");
            }
            const reason = String(getNoteFor(resultaatId) ?? "").trim();
            if (!reason) throw new Error("Vul eerst een reden in bij Aantekeningen (verplicht bij afkeuren).");
            const { data: sess } = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabaseClient$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["supabase"].auth.getSession();
            const token = sess?.session?.access_token ?? null;
            if (!token) throw new Error("Niet ingelogd (geen access token).");
            const rApi = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$api$2f$authedFetch$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["authedFetch"])("/api/control-engine/review", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    controle_resultaat_id: resultaatId,
                    decision: "reject",
                    note: reason
                })
            });
            const jApi = await rApi.json().catch(()=>({}));
            if (!rApi.ok) throw new Error(jApi?.error ?? "Afkeuren mislukt");
            await reloadRegels();
        } catch (e) {
            setError(e?.message ?? String(e));
        } finally{
            setApproving(false);
        }
    }
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        const load = async ()=>{
            setLoading(true);
            setError(null);
            setMsg("");
            try {
                if (!matchmakingId || !partijNr) {
                    setError("Onjuiste parameters (matchmakingId/partijNr).");
                    return;
                }
                // 0) event info (naam + datum) voor header (nice-to-have)
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
                await loadMyRoles();
                const { data: runs, error: runErr } = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabaseClient$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["supabase"].from("controle_runs").select("id, matchmaking_id, status, gestart_op, afgerond_op, run_type").eq("matchmaking_id", matchmakingId).order("gestart_op", {
                    ascending: false
                }).limit(1);
                if (runErr) throw runErr;
                const latestRun = runs?.[0] ?? null;
                setRun(latestRun);
                if (!latestRun?.id) {
                    setCtx(null);
                    setRegels([]);
                    setUitslagenRood([]);
                    setUitslagenBlauw([]);
                    setAllPartijNrs([]);
                    return;
                }
                // ✅ Partij-navigatie
                const { data: pnRows, error: pnErr } = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabaseClient$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["supabase"].from("controle_bout_context").select("partij_nr").eq("controle_run_id", latestRun.id).order("partij_nr", {
                    ascending: true
                });
                if (pnErr) throw pnErr;
                const pnList = Array.from(new Set((pnRows ?? []).map((r)=>Number(r.partij_nr)).filter((n)=>Number.isFinite(n) && n > 0))).sort((a, b)=>a - b);
                setAllPartijNrs(pnList);
                const { data: ctxRows, error: ctxErr } = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabaseClient$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["supabase"].from("controle_bout_context").select("*").eq("controle_run_id", latestRun.id).eq("partij_nr", partijNr).limit(1);
                if (ctxErr) throw ctxErr;
                const row = ctxRows?.[0] ?? null;
                setCtx(row);
                const { data: resRows, error: resErr } = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabaseClient$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["supabase"].from("controle_resultaten").select("*").eq("controle_run_id", latestRun.id).eq("partij_nr", partijNr).order("created_at", {
                    ascending: true
                });
                if (resErr) throw resErr;
                {
                    const rows = resRows ?? [];
                    setRegels(rows);
                    primeNoteDrafts(rows);
                }
                const vaR = row?.rood_va_mm ? String(row.rood_va_mm).trim() : null;
                const vaB = row?.blauw_va_mm ? String(row.blauw_va_mm).trim() : null;
                const partijNrNum = Number(row?.partij_nr ?? partijNr ?? null);
                if (!partijNrNum) {
                    setUitslagenRood([]);
                    setUitslagenBlauw([]);
                } else {
                    const [roodRes, blauwRes] = await Promise.all([
                        vaR ? __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabaseClient$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["supabase"].from("controle_uitslagen").select("datum, discipline, klasse, uitslag").eq("matchmaking_id", matchmakingId).eq("controle_run_id", latestRun.id).eq("partij_nr", partijNrNum).eq("hoek", "rood").eq("va_nummer", vaR).order("datum", {
                            ascending: false
                        }) : Promise.resolve({
                            data: [],
                            error: null
                        }),
                        vaB ? __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabaseClient$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["supabase"].from("controle_uitslagen").select("datum, discipline, klasse, uitslag").eq("matchmaking_id", matchmakingId).eq("controle_run_id", latestRun.id).eq("partij_nr", partijNrNum).eq("hoek", "blauw").eq("va_nummer", vaB).order("datum", {
                            ascending: false
                        }) : Promise.resolve({
                            data: [],
                            error: null
                        })
                    ]);
                    if (roodRes?.error) throw roodRes.error;
                    if (blauwRes?.error) throw blauwRes.error;
                    setUitslagenRood(roodRes?.data ?? []);
                    setUitslagenBlauw(blauwRes?.data ?? []);
                }
            } catch (e) {
                setError(e?.message ?? String(e));
            } finally{
                setLoading(false);
            }
        };
        load();
    }, [
        matchmakingId,
        partijNr
    ]);
    const header = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useMemo"])(()=>{
        const evDatum = ctx?.evenement_datum ?? evenementDatum ?? null;
        const evNaam = ctx?.evenement_naam ?? evenementNaam ?? null;
        const roodNaam = ctx?.rood_naam_fp ?? ctx?.rood_naam_mm ?? "-";
        const blauwNaam = ctx?.blauw_naam_fp ?? ctx?.blauw_naam_mm ?? "-";
        const roodGym = ctx?.rood_gym_mm ?? "-";
        const blauwGym = ctx?.blauw_gym_mm ?? "-";
        const discipline = ctx?.discipline ?? "-";
        const klasseMM = ctx?.klasse_mm ?? "-";
        const roodDob = ctx?.rood_geboortedatum_fp ?? ctx?.rood_geboortedatum_mm ?? null;
        const blauwDob = ctx?.blauw_geboortedatum_fp ?? ctx?.blauw_geboortedatum_mm ?? null;
        const roodLic = parseJaNee(ctx?.rood_licentie);
        const blauwLic = parseJaNee(ctx?.blauw_licentie);
        const roodSv = parseJaNee(ctx?.rood_heeft_startverbod);
        const blauwSv = parseJaNee(ctx?.blauw_heeft_startverbod);
        return {
            evDatum,
            evNaam,
            discipline,
            klasseMM,
            roodNaam,
            blauwNaam,
            roodGym,
            blauwGym,
            roodDob,
            blauwDob,
            roodLic,
            blauwLic,
            roodSv,
            blauwSv
        };
    }, [
        ctx
    ]);
    const verschillen = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useMemo"])(()=>{
        if (!ctx) return null;
        const countDemo = (rows)=>(rows ?? []).reduce((acc, r)=>{
                const s = String(r?.uitslag ?? "").toLowerCase();
                return acc + (s.includes("demo") || s.includes("demonstr") ? 1 : 0);
            }, 0);
        const eventDate = parseISODateOnly(ctx?.evenement_datum);
        const rBirth = parseISODateOnly(ctx?.rood_geboortedatum_fp ?? ctx?.rood_geboortedatum_mm);
        const bBirth = parseISODateOnly(ctx?.blauw_geboortedatum_fp ?? ctx?.blauw_geboortedatum_mm);
        const leeftijdDiff = eventDate && rBirth && bBirth ? diffMonthsDaysAbs(rBirth, bBirth) : null;
        const maandenVerschil = leeftijdDiff ? leeftijdDiff.months : null;
        const dagenVerschil = leeftijdDiff ? leeftijdDiff.days : null;
        const leeftijdVerschilTekst = leeftijdDiff ? fmtMonthsDays(leeftijdDiff.months, leeftijdDiff.days) : null;
        const roodPartijen = toInt(ctx?.rood_totaal_wedstrijden_scrape);
        const blauwPartijen = toInt(ctx?.blauw_totaal_wedstrijden_scrape);
        const roodDemo = toInt(ctx?.rood_demo_totaal) ?? countDemo(uitslagenRood);
        const blauwDemo = toInt(ctx?.blauw_demo_totaal) ?? countDemo(uitslagenBlauw);
        const roodEffectief = roodPartijen != null ? roodPartijen - (roodDemo ?? 0) + Math.floor((roodDemo ?? 0) / 3) : null;
        const blauwEffectief = blauwPartijen != null ? blauwPartijen - (blauwDemo ?? 0) + Math.floor((blauwDemo ?? 0) / 3) : null;
        const partijenVerschil = roodEffectief != null && blauwEffectief != null ? Math.abs(roodEffectief - blauwEffectief) : null;
        return {
            maandenVerschil,
            dagenVerschil,
            leeftijdVerschilTekst,
            roodLeeftijd: ageYearsAtEvent(ctx, "rood"),
            blauwLeeftijd: ageYearsAtEvent(ctx, "blauw"),
            roodPartijen,
            blauwPartijen,
            roodDemo,
            blauwDemo,
            roodEffectief,
            blauwEffectief,
            partijenVerschil,
            roodNulmetingTotaal: toInt(ctx?.rood_totaal_nulmeting_totaal ?? ctx?.rood_nulmeting_totaal),
            blauwNulmetingTotaal: toInt(ctx?.blauw_totaal_nulmeting_totaal ?? ctx?.blauw_nulmeting_totaal),
            roodNulmetingKlasse: ctx?.rood_nulmeting_klasse ?? null,
            blauwNulmetingKlasse: ctx?.blauw_nulmeting_klasse ?? null,
            roodNulmetingOpmerking: ctx?.rood_nulmeting_opmerking ?? null,
            blauwNulmetingOpmerking: ctx?.blauw_nulmeting_opmerking ?? null
        };
    }, [
        ctx,
        uitslagenRood,
        uitslagenBlauw
    ]);
    // ✅ Gewicht info: toon gewichtklasse alleen bij MAX gewicht (niet bij rood/blauw)
    const gewichtInfo = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useMemo"])(()=>{
        if (!ctx) return null;
        const rKg = toNumKg(ctx?.rood_gewicht_mm);
        const bKg = toNumKg(ctx?.blauw_gewicht_mm);
        const discipline = String(ctx?.discipline ?? "").toLowerCase();
        const isMma = discipline.includes("mma");
        const MMA_CLASSES = [
            {
                name: "Strawweight",
                min: 0,
                max: 52.2
            },
            {
                name: "Flyweight",
                min: 52.2000001,
                max: 56.7
            },
            {
                name: "Bantamweight",
                min: 56.7000001,
                max: 61.2
            },
            {
                name: "Featherweight",
                min: 61.2000001,
                max: 65.8
            },
            {
                name: "Lightweight",
                min: 65.8000001,
                max: 70.3
            },
            {
                name: "Welterweight",
                min: 70.3000001,
                max: 77.1
            },
            {
                name: "Middleweight",
                min: 77.1000001,
                max: 83.9
            },
            {
                name: "Light Heavyweight",
                min: 83.9000001,
                max: 93.0
            },
            {
                name: "Heavyweight",
                min: 93.0000001,
                max: 120.2
            },
            {
                name: "Super Heavyweight",
                min: 120.2000001,
                max: null
            }
        ];
        const KB_CLASSES = [
            {
                name: "Junior Flyweight",
                min: 46.69,
                max: 48.99
            },
            {
                name: "Flyweight",
                min: 49.0,
                max: 50.8
            },
            {
                name: "Junior Bantamweight",
                min: 50.81,
                max: 52.16
            },
            {
                name: "Bantamweight",
                min: 52.17,
                max: 53.52
            },
            {
                name: "Junior Featherweight",
                min: 53.53,
                max: 55.34
            },
            {
                name: "Featherweight",
                min: 55.35,
                max: 57.15
            },
            {
                name: "Junior Lightweight",
                min: 57.16,
                max: 58.97
            },
            {
                name: "Lightweight",
                min: 58.98,
                max: 61.23
            },
            {
                name: "Super Lightweight",
                min: 61.24,
                max: 63.5
            },
            {
                name: "Welterweight",
                min: 63.51,
                max: 66.68
            },
            {
                name: "Junior Middleweight",
                min: 66.69,
                max: 69.85
            },
            {
                name: "Middleweight",
                min: 69.86,
                max: 72.57
            },
            {
                name: "Super Middleweight",
                min: 72.58,
                max: 76.2
            },
            {
                name: "Light Heavyweight",
                min: 76.21,
                max: 79.38
            },
            {
                name: "Super LightHeavyweight",
                min: 79.39,
                max: 82.55
            },
            {
                name: "Cruiserweight",
                min: 82.56,
                max: 86.18
            },
            {
                name: "Heavyweight",
                min: 86.19,
                max: 95.0
            },
            {
                name: "SuperHeavyweight",
                min: 95.0000001,
                max: null
            }
        ];
        const classes = isMma ? MMA_CLASSES : KB_CLASSES;
        const findClass = (kg)=>{
            if (kg == null) return null;
            const hit = classes.find((c)=>c.max == null ? kg >= c.min : kg >= c.min && kg <= c.max);
            return hit ?? null;
        };
        const maxFighterKg = rKg != null || bKg != null ? Math.max(rKg ?? -Infinity, bKg ?? -Infinity) : null;
        const klasse = findClass(maxFighterKg);
        const klasseNaam = klasse?.name ?? null;
        const klasseMaxKg = klasse?.max ?? null;
        const rKlasse = findClass(rKg)?.name ?? null;
        const bKlasse = findClass(bKg)?.name ?? null;
        const diffKg = rKg != null && bKg != null ? Math.abs(rKg - bKg) : null;
        return {
            rKg,
            bKg,
            maxFighterKg,
            klasseMaxKg,
            klasseNaam,
            rKlasse,
            bKlasse,
            diffKg,
            isMma
        };
    }, [
        ctx
    ]);
    const keurmerkInfo = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useMemo"])(()=>{
        if (!ctx) return null;
        const roodOk = ctx?.keurmerk_rood ?? (String(ctx?.heeft_keurmerk_rood ?? "").trim().toLowerCase() === "ja" ? true : String(ctx?.heeft_keurmerk_rood ?? "").trim().toLowerCase() === "nee" ? false : null);
        const blauwOk = ctx?.keurmerk_blauw ?? (String(ctx?.heeft_keurmerk_blauw ?? "").trim().toLowerCase() === "ja" ? true : String(ctx?.heeft_keurmerk_blauw ?? "").trim().toLowerCase() === "nee" ? false : null);
        return {
            rood: {
                ok: roodOk,
                reason: ctx?.keurmerk_reden_rood ?? ctx?.keurmerk_redenen_rood ?? ctx?.heeft_keurmerk_rood ?? null
            },
            blauw: {
                ok: blauwOk,
                reason: ctx?.keurmerk_reden_blauw ?? ctx?.keurmerk_redenen_blauw ?? ctx?.heeft_keurmerk_blauw ?? null
            }
        };
    }, [
        ctx
    ]);
    function buildRecordFromUitslagen(rows, preferredKlasse) {
        const norm = (s)=>String(s ?? "").trim().toLowerCase();
        const isAllowedDiscipline = (d)=>{
            const s = norm(d);
            return s.includes("kb") || s.includes("kick") || s.includes("mt") || s.includes("muay") || s.includes("thai") || s.includes("mma");
        };
        const isBoxing = (d)=>{
            const s = norm(d);
            return s.includes("bok") || s.includes("boxing");
        };
        const parseDate = (d)=>{
            const dt = parseISODateOnly(d);
            return dt ? dt.getTime() : 0;
        };
        const sorted = [
            ...rows ?? []
        ].sort((a, b)=>parseDate(b.datum) - parseDate(a.datum));
        const prefNorm = norm(preferredKlasse);
        const activeKlasse = prefNorm ? preferredKlasse : sorted.find((r)=>norm(r.klasse))?.klasse ?? null;
        let wins = 0;
        let loss = 0;
        let draw = 0;
        let drawRaw = 0;
        let noContest = 0;
        let demoTotal = 0;
        let historieCount = 0;
        const classifyResult = (u)=>{
            const s = norm(u);
            if (!s) return "unknown";
            if (s.includes("demo") || s.includes("demonstr")) return "demo";
            if (s.includes("draw") || s.includes("gelijk") || s.includes("onbeslist") || s === "d") return "draw";
            if (s.includes("win") || s.includes("winst") || s === "w") return "win";
            if (s.includes("loss") || s.includes("verlies") || s === "l") return "loss";
            if (s.includes("no contest") || s.includes("n/c") || s === "nc" || s.includes("contest")) return "nc";
            return "unknown";
        };
        for (const r of sorted){
            const k = norm(r.klasse);
            const d = norm(r.discipline);
            const inActiveKlasse = activeKlasse ? !k ? true : norm(activeKlasse) === k : true;
            const boxing = isBoxing(d);
            const allowed = isAllowedDiscipline(d) && !boxing;
            const resType = classifyResult(r.uitslag);
            if (resType === "demo") {
                demoTotal += 1;
                if (!inActiveKlasse) historieCount += 1;
                continue;
            }
            if (!inActiveKlasse) {
                if (k) historieCount += 1;
                continue;
            }
            if (!allowed) {
                historieCount += 1;
                continue;
            }
            if (resType === "win") wins += 1;
            else if (resType === "loss") loss += 1;
            else if (resType === "nc") noContest += 1;
            else if (resType === "draw") {
                draw += 1;
                drawRaw += 1;
            } else {
                historieCount += 1;
            }
        }
        const demoAsDraw = Math.floor(demoTotal / 3);
        const drawWithDemo = draw + demoAsDraw;
        return {
            activeKlasse: activeKlasse ? String(activeKlasse) : null,
            wins,
            loss,
            draw: drawWithDemo,
            demoTotal,
            historieCount,
            demoAsDraw,
            drawRaw,
            noContest,
            winPct: (()=>{
                const denom = wins + loss + drawRaw;
                return denom > 0 ? Math.round(wins / denom * 1000) / 10 : null;
            })()
        };
    }
    const recordRood = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useMemo"])(()=>buildRecordFromUitslagen(uitslagenRood, ctx?.klasse_mm ?? ctx?.klasse ?? null), [
        uitslagenRood,
        ctx?.klasse_mm,
        ctx?.klasse
    ]);
    const recordBlauw = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useMemo"])(()=>buildRecordFromUitslagen(uitslagenBlauw, ctx?.klasse_mm ?? ctx?.klasse ?? null), [
        uitslagenBlauw,
        ctx?.klasse_mm,
        ctx?.klasse
    ]);
    // ✅ 2 terug-knoppen
    function backPrevious() {
        try {
            router.back();
        } catch  {
            router.push(`/dashboard/admin/controle/${matchmakingId}`);
        }
    }
    function backToMatchmaking() {
        router.push(`/dashboard/admin/controle/${matchmakingId}`);
    }
    async function sendToDispensatie() {
        try {
            setError(null);
            setMsg("");
            setSendingDisp(true);
            const { data: sess } = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabaseClient$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["supabase"].auth.getSession();
            const token = sess?.session?.access_token ?? null;
            if (!token) throw new Error("Niet ingelogd.");
            const bout_id = asUuid(ctx?.bout_id);
            if (!bout_id) throw new Error("bout_id ontbreekt/ongeldig in context (controle_bout_context).");
            const partij = Number(partijNr);
            // ✅ kies de beste reden uit de controle-resultaten van deze partij
            const prio = (x)=>x?.resultaat === "AFKEUR" ? 4 : x?.resultaat === "DISPENSATIE" ? 3 : x?.resultaat === "ACTIE" ? 2 : x?.resultaat === "INFO" ? 1 : 0;
            const best = (resultaten ?? []).filter((r)=>Number(r.partij_nr) === partij).sort((a, b)=>prio(b) - prio(a))[0];
            if (!best?.rule_code) {
                throw new Error("Geen controle-melding gevonden om als reden mee te sturen.");
            }
            const r = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$api$2f$authedFetch$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["authedFetch"])("/api/dispensatie/upsert", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    matchmaking_id: asUuid(matchmakingId),
                    partij_nr: partij,
                    bout_id,
                    // ✅ dit is wat jij wil zien als reden:
                    rule_code: best.rule_code,
                    boodschap: best.boodschap ?? null
                })
            });
            const j = await r.json().catch(()=>({}));
            if (!r.ok) throw new Error(j?.error ?? "Naar dispensatie sturen mislukt");
            setDispSent(true);
            setMsg("✅ Naar dispensatie gestuurd.");
        } catch (e) {
            setError(e?.message ?? String(e));
        } finally{
            setSendingDisp(false);
        }
    }
    async function rescrapeBout() {
        try {
            setError(null);
            setRescraping(true);
            const r = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$api$2f$authedFetch$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["authedFetch"])("/api/control-engine/bout-rescrape", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    matchmaking_id: String(matchmakingId),
                    partij_nr: partijNr,
                    controle_run_id: run?.id ?? null
                })
            });
            const j = await r.json().catch(()=>({}));
            if (!r.ok) throw new Error(j?.error ?? "Herscrape mislukt");
            window.location.reload();
        } catch (e) {
            setError(e?.message ?? String(e));
        } finally{
            setRescraping(false);
        }
    }
    // ✅ alleen opslaan (geen scrape)
    async function saveEditOnly() {
        if (!editOpen) return;
        if (!matchmakingId || !partijNr) return;
        setEditSaving(true);
        setError(null);
        setMsg("");
        try {
            const { data: sess } = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabaseClient$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["supabase"].auth.getSession();
            const token = sess?.session?.access_token ?? null;
            if (!token) throw new Error("Niet ingelogd.");
            const payload = {
                matchmaking_id: String(matchmakingId),
                partij_nr: partijNr,
                controle_run_id: run?.id ?? null,
                va_gewijzigd: vaGewijzigd
            };
            const d = String(editDraftRef.current.discipline ?? editBoutDiscipline ?? "").trim();
            const k = String(editDraftRef.current.klasse ?? editBoutKlasse ?? "").trim();
            const va = String(editDraftRef.current.va ?? editVa ?? "");
            const naam = String(editDraftRef.current.naam ?? editNaam ?? "");
            const gym = String(editDraftRef.current.gym ?? editGym ?? "");
            // ✅ Partij velden (discipline/klasse)
            if (d) payload.new_discipline = d;
            if (k) payload.new_klasse_mm = k;
            if (editOpen === "rood") {
                payload.new_va_rood = va;
                payload.new_rood_naam = naam;
                payload.new_rood_gym = gym;
            } else {
                payload.new_va_blauw = va;
                payload.new_blauw_naam = naam;
                payload.new_blauw_gym = gym;
            }
            const r1 = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$api$2f$authedFetch$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["authedFetch"])("/api/control-engine/admin-correct-bout", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });
            const j1 = await r1.json().catch(()=>({}));
            if (!r1.ok) throw new Error(j1?.error ?? "Opslaan mislukt (admin-correct-bout)");
            setMsg("✅ Opgeslagen.");
            closeEdit();
            window.location.reload();
        } catch (e) {
            setError(e?.message ?? String(e));
        } finally{
            setEditSaving(false);
        }
    }
    // ✅ opslaan + rescrape vanuit modal
    async function saveAndRescrapeFromModal() {
        if (!editOpen) return;
        if (!matchmakingId || !partijNr) return;
        setEditSaving(true);
        setError(null);
        setMsg("");
        try {
            const { data: sess } = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabaseClient$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["supabase"].auth.getSession();
            const token = sess?.session?.access_token ?? null;
            if (!token) throw new Error("Niet ingelogd.");
            const payload = {
                matchmaking_id: String(matchmakingId),
                partij_nr: partijNr,
                controle_run_id: run?.id ?? null,
                va_gewijzigd: vaGewijzigd
            };
            const d = String(editDraftRef.current.discipline ?? editBoutDiscipline ?? "").trim();
            const k = String(editDraftRef.current.klasse ?? editBoutKlasse ?? "").trim();
            const va = String(editDraftRef.current.va ?? editVa ?? "");
            const naam = String(editDraftRef.current.naam ?? editNaam ?? "");
            const gym = String(editDraftRef.current.gym ?? editGym ?? "");
            // ✅ Partij velden (discipline/klasse)
            if (d) payload.new_discipline = d;
            if (k) payload.new_klasse_mm = k;
            if (editOpen === "rood") {
                payload.new_va_rood = va;
                payload.new_rood_naam = naam;
                payload.new_rood_gym = gym;
            } else {
                payload.new_va_blauw = va;
                payload.new_blauw_naam = naam;
                payload.new_blauw_gym = gym;
            }
            // 1) opslaan
            const r1 = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$api$2f$authedFetch$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["authedFetch"])("/api/control-engine/admin-correct-bout", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });
            const j1 = await r1.json().catch(()=>({}));
            if (!r1.ok) throw new Error(j1?.error ?? "Opslaan mislukt (admin-correct-bout)");
            // 2) rescrape
            const va_rood = editOpen === "rood" ? String(va ?? "").trim() : String(ctx?.rood_va_mm ?? "").trim();
            const va_blauw = editOpen === "blauw" ? String(va ?? "").trim() : String(ctx?.blauw_va_mm ?? "").trim();
            const r2 = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$api$2f$authedFetch$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["authedFetch"])("/api/control-engine/bout-rescrape", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    matchmaking_id: String(matchmakingId),
                    partij_nr: partijNr,
                    controle_run_id: run?.id ?? null,
                    va_rood: va_rood || null,
                    va_blauw: va_blauw || null
                })
            });
            const j2 = await r2.json().catch(()=>({}));
            if (!r2.ok) throw new Error(j2?.error ?? "Herscrape mislukt");
            setMsg("✅ Opgeslagen + herscrape gestart.");
            closeEdit();
            window.location.reload();
        } catch (e) {
            setError(e?.message ?? String(e));
        } finally{
            setEditSaving(false);
        }
    }
    // -----------------------------
    // Page rendering
    // -----------------------------
    const Shell = ({ children })=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: `${__TURBOPACK__imported__module__$5b$next$5d2f$internal$2f$font$2f$google$2f$inter_a71219c2$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"].className} min-h-screen bg-zinc-100 text-zinc-900`,
            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "mx-auto w-full max-w-[1400px] px-4 md:px-6 py-6 space-y-4",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "fs-shell",
                    children: children
                }, void 0, false, {
                    fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/[partijNr]/page.tsx",
                    lineNumber: 2004,
                    columnNumber: 9
                }, this)
            }, void 0, false, {
                fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/[partijNr]/page.tsx",
                lineNumber: 2003,
                columnNumber: 7
            }, this)
        }, void 0, false, {
            fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/[partijNr]/page.tsx",
            lineNumber: 2000,
            columnNumber: 5
        }, this);
    if (loading) {
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(Shell, {
            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "text-zinc-600",
                children: "Laden…"
            }, void 0, false, {
                fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/[partijNr]/page.tsx",
                lineNumber: 2012,
                columnNumber: 9
            }, this)
        }, void 0, false, {
            fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/[partijNr]/page.tsx",
            lineNumber: 2011,
            columnNumber: 7
        }, this);
    }
    if (error) {
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(Shell, {
            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "space-y-2",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "text-red-700",
                        children: error
                    }, void 0, false, {
                        fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/[partijNr]/page.tsx",
                        lineNumber: 2021,
                        columnNumber: 11
                    }, this),
                    msg ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "text-green-700",
                        children: msg
                    }, void 0, false, {
                        fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/[partijNr]/page.tsx",
                        lineNumber: 2022,
                        columnNumber: 18
                    }, this) : null
                ]
            }, void 0, true, {
                fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/[partijNr]/page.tsx",
                lineNumber: 2020,
                columnNumber: 9
            }, this)
        }, void 0, false, {
            fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/[partijNr]/page.tsx",
            lineNumber: 2019,
            columnNumber: 7
        }, this);
    }
    if (!ctx) {
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(Shell, {
            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "text-zinc-600",
                children: "Geen context gevonden."
            }, void 0, false, {
                fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/[partijNr]/page.tsx",
                lineNumber: 2031,
                columnNumber: 9
            }, this)
        }, void 0, false, {
            fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/[partijNr]/page.tsx",
            lineNumber: 2030,
            columnNumber: 7
        }, this);
    }
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(Shell, {
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "space-y-4",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(BruteHeaderA, {
                        evenementNaam: header.evNaam ?? evenementNaam ?? null,
                        evenementDatum: header.evDatum ?? evenementDatum ?? null,
                        discipline: header.discipline ?? null,
                        klasseMM: header.klasseMM ?? null,
                        partijNrStr: partijNrStr,
                        matchmakingId: matchmakingId,
                        runStatus: run?.status ?? null,
                        onBack: ()=>router.back(),
                        navPrev: nav.prev ?? null,
                        navNext: nav.next ?? null,
                        onPrev: ()=>nav.prev && router.push(`/dashboard/admin/controle/${matchmakingId}/${nav.prev}`),
                        onNext: ()=>nav.next && router.push(`/dashboard/admin/controle/${matchmakingId}/${nav.next}`)
                    }, void 0, false, {
                        fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/[partijNr]/page.tsx",
                        lineNumber: 2041,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "rounded-3xl border-2 border-zinc-500/60 p-4 md:p-5 shadow-[0_22px_60px_rgba(24,24,27,0.12)] ring-1 ring-white/50",
                        style: {
                            background: `radial-gradient(circle at 50% 0%, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0.16) 38%, rgba(0,0,0,0.08) 72%, rgba(0,0,0,0.22) 100%),
                          radial-gradient(circle at 20% 0%, rgba(255,77,0,0.10), transparent 40%),
                          radial-gradient(circle at 80% 20%, rgba(0,120,255,0.08), transparent 42%),
                          repeating-linear-gradient(90deg, rgba(255,255,255,0.10) 0px, rgba(255,255,255,0.03) 2px, rgba(0,0,0,0.04) 4px),
                          linear-gradient(180deg, #f0f0f2 0%, #dadade 52%, #c9c9cf 100%)`
                        },
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "grid grid-cols-1 lg:grid-cols-[1fr_280px_1fr] gap-4 items-start",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "order-1",
                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(FighterMetalCard, {
                                            side: "rood",
                                            naam: header.roodNaam,
                                            gym: header.roodGym,
                                            va: String(ctx?.rood_va_mm ?? "-"),
                                            lic: header.roodLic,
                                            sv: header.roodSv,
                                            dob: header.roodDob,
                                            leeftijdEvent: ageYearsAtEvent(ctx, "rood"),
                                            geslacht: String(ctx?.rood_geslacht ?? "-"),
                                            klasseMM: String(header.klasseMM ?? "-"),
                                            nulKlasse: String(ctx?.rood_nulmeting_klasse ?? "-"),
                                            nulTotaal: verschillen?.roodNulmetingTotaal ?? "-",
                                            nulOpmerking: String(ctx?.rood_nulmeting_opmerking ?? ""),
                                            canEdit: Boolean(isAdmin || isSuperadmin),
                                            onEdit: ()=>openEdit("rood")
                                        }, void 0, false, {
                                            fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/[partijNr]/page.tsx",
                                            lineNumber: 2071,
                                            columnNumber: 17
                                        }, this)
                                    }, void 0, false, {
                                        fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/[partijNr]/page.tsx",
                                        lineNumber: 2070,
                                        columnNumber: 15
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "order-2 flex flex-col items-center justify-start gap-3 pt-2 lg:pt-6",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "relative flex items-center justify-center",
                                                style: {
                                                    width: 236,
                                                    height: 236
                                                },
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        className: "absolute inset-0 rounded-full",
                                                        style: {
                                                            background: // ✅ Geslagen staal look (subtiele 'dents' + sheen)
                                                            "radial-gradient(circle at 35% 25%, rgba(255,255,255,0.45), rgba(255,255,255,0.10) 35%, rgba(0,0,0,0.78) 72%, rgba(0,0,0,0.93) 100%)," + "radial-gradient(circle at 18% 22%, rgba(255,255,255,0.10) 0%, transparent 22%)," + "radial-gradient(circle at 70% 18%, rgba(0,0,0,0.16) 0%, transparent 26%)," + "radial-gradient(circle at 32% 72%, rgba(0,0,0,0.14) 0%, transparent 24%)," + "radial-gradient(circle at 78% 78%, rgba(255,255,255,0.08) 0%, transparent 24%)," + "repeating-radial-gradient(circle at 50% 50%, rgba(255,255,255,0.04) 0px, rgba(255,255,255,0.02) 2px, rgba(0,0,0,0.02) 5px, rgba(0,0,0,0.00) 10px)," + "linear-gradient(180deg, #d2d2d2 0%, #7a7a7a 45%, #2a2a2a 100%)",
                                                            border: "6px solid rgba(220,220,220,0.55)",
                                                            boxShadow: "inset 0 3px 10px rgba(255,255,255,0.25), inset 0 -10px 18px rgba(0,0,0,0.65), 0 22px 45px rgba(0,0,0,0.55)"
                                                        }
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/[partijNr]/page.tsx",
                                                        lineNumber: 2097,
                                                        columnNumber: 19
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        className: "absolute inset-[24px] rounded-full",
                                                        style: {
                                                            background: "radial-gradient(circle at 40% 30%, rgba(255,255,255,0.18), rgba(0,0,0,0.85) 70%, rgba(0,0,0,0.98) 100%)",
                                                            border: "2px solid rgba(255,255,255,0.14)",
                                                            boxShadow: "inset 0 2px 8px rgba(0,0,0,0.70)"
                                                        }
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/[partijNr]/page.tsx",
                                                        lineNumber: 2115,
                                                        columnNumber: 19
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        className: "absolute inset-[28px] rounded-full pointer-events-none",
                                                        style: {
                                                            background: "radial-gradient(circle at 35% 22%, rgba(255,255,255,0.22), rgba(255,255,255,0.02) 55%, rgba(0,0,0,0.35) 100%)",
                                                            border: "1px solid rgba(255,255,255,0.10)",
                                                            boxShadow: "inset 0 10px 18px rgba(255,255,255,0.08), inset 0 -18px 22px rgba(0,0,0,0.55)"
                                                        }
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/[partijNr]/page.tsx",
                                                        lineNumber: 2126,
                                                        columnNumber: 19
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        className: "relative z-10",
                                                        style: {
                                                            width: 222,
                                                            height: 222,
                                                            // ✅ logo vult de cirkel meer en voelt 'ingebed'
                                                            transform: "scale(1.22)",
                                                            filter: "drop-shadow(0 12px 18px rgba(0,0,0,0.55))"
                                                        },
                                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$image$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"], {
                                                            src: "/branding/fightsupport/vs-shield.png",
                                                            alt: "VS",
                                                            width: 220,
                                                            height: 220,
                                                            priority: true,
                                                            style: {
                                                                objectFit: "contain",
                                                                width: "100%",
                                                                height: "100%"
                                                            }
                                                        }, void 0, false, {
                                                            fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/[partijNr]/page.tsx",
                                                            lineNumber: 2147,
                                                            columnNumber: 21
                                                        }, this)
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/[partijNr]/page.tsx",
                                                        lineNumber: 2137,
                                                        columnNumber: 19
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/[partijNr]/page.tsx",
                                                lineNumber: 2092,
                                                columnNumber: 17
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "w-full max-w-[280px] overflow-hidden",
                                                style: plateBodyStyle(),
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(PlateHeader, {
                                                        title: "WEDSTRIJDDETAILS",
                                                        dot: "orange"
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/[partijNr]/page.tsx",
                                                        lineNumber: 2159,
                                                        columnNumber: 19
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        className: "px-4 pb-4 pt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-sm",
                                                        children: [
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                className: "text-zinc-600",
                                                                children: "Ronde tijd"
                                                            }, void 0, false, {
                                                                fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/[partijNr]/page.tsx",
                                                                lineNumber: 2161,
                                                                columnNumber: 21
                                                            }, this),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                className: "text-zinc-900 font-semibold text-right",
                                                                children: (()=>{
                                                                    const computed = rondeTijdFromKlasse(header.discipline, header.klasseMM);
                                                                    const fallback = String(ctx?.ronde_tijd ?? ctx?.rondetijd ?? "").trim();
                                                                    return computed ?? (fallback || "-");
                                                                })()
                                                            }, void 0, false, {
                                                                fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/[partijNr]/page.tsx",
                                                                lineNumber: 2162,
                                                                columnNumber: 21
                                                            }, this),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                className: "text-zinc-600",
                                                                children: "Discipline"
                                                            }, void 0, false, {
                                                                fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/[partijNr]/page.tsx",
                                                                lineNumber: 2170,
                                                                columnNumber: 21
                                                            }, this),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                className: "text-zinc-900 font-semibold text-right",
                                                                children: header.discipline ?? "-"
                                                            }, void 0, false, {
                                                                fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/[partijNr]/page.tsx",
                                                                lineNumber: 2171,
                                                                columnNumber: 21
                                                            }, this),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                className: "text-zinc-600",
                                                                children: "Klasse"
                                                            }, void 0, false, {
                                                                fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/[partijNr]/page.tsx",
                                                                lineNumber: 2173,
                                                                columnNumber: 21
                                                            }, this),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                className: "text-zinc-900 font-semibold text-right",
                                                                children: String(header.klasseMM ?? "-")
                                                            }, void 0, false, {
                                                                fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/[partijNr]/page.tsx",
                                                                lineNumber: 2174,
                                                                columnNumber: 21
                                                            }, this)
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/[partijNr]/page.tsx",
                                                        lineNumber: 2160,
                                                        columnNumber: 19
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/[partijNr]/page.tsx",
                                                lineNumber: 2158,
                                                columnNumber: 17
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/[partijNr]/page.tsx",
                                        lineNumber: 2091,
                                        columnNumber: 15
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "order-3",
                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(FighterMetalCard, {
                                            side: "blauw",
                                            naam: header.blauwNaam,
                                            gym: header.blauwGym,
                                            va: String(ctx?.blauw_va_mm ?? "-"),
                                            lic: header.blauwLic,
                                            sv: header.blauwSv,
                                            dob: header.blauwDob,
                                            leeftijdEvent: ageYearsAtEvent(ctx, "blauw"),
                                            geslacht: String(ctx?.blauw_geslacht ?? "-"),
                                            klasseMM: String(header.klasseMM ?? "-"),
                                            nulKlasse: String(ctx?.blauw_nulmeting_klasse ?? "-"),
                                            nulTotaal: verschillen?.blauwNulmetingTotaal ?? "-",
                                            nulOpmerking: String(ctx?.blauw_nulmeting_opmerking ?? ""),
                                            canEdit: Boolean(isAdmin || isSuperadmin),
                                            onEdit: ()=>openEdit("blauw")
                                        }, void 0, false, {
                                            fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/[partijNr]/page.tsx",
                                            lineNumber: 2181,
                                            columnNumber: 17
                                        }, this)
                                    }, void 0, false, {
                                        fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/[partijNr]/page.tsx",
                                        lineNumber: 2180,
                                        columnNumber: 15
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/[partijNr]/page.tsx",
                                lineNumber: 2068,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "rounded-2xl p-4",
                                style: plateBodyStyle(),
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "grid grid-cols-1 md:grid-cols-2 gap-4",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "space-y-3",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "rounded-xl overflow-hidden",
                                                    style: {
                                                        ...plateBodyStyle(),
                                                        padding: 0
                                                    },
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(PlateHeader, {
                                                            title: "ROOD — UITSLAGEN",
                                                            dot: "red",
                                                            right: `${uitslagenRood.length} regels`
                                                        }, void 0, false, {
                                                            fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/[partijNr]/page.tsx",
                                                            lineNumber: 2207,
                                                            columnNumber: 19
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                            className: "p-3",
                                                            children: [
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(UitslagenTable, {
                                                                    rows: uitslagenRood,
                                                                    pageSize: 6
                                                                }, void 0, false, {
                                                                    fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/[partijNr]/page.tsx",
                                                                    lineNumber: 2210,
                                                                    columnNumber: 21
                                                                }, this),
                                                                recordRood?.demoAsDraw ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                    className: "mt-2 text-xs text-zinc-600",
                                                                    children: [
                                                                        "Demo-omrekening: ",
                                                                        recordRood.demoTotal,
                                                                        " demo’s ⇒ +",
                                                                        recordRood.demoAsDraw,
                                                                        " draw (per 3 demo’s)."
                                                                    ]
                                                                }, void 0, true, {
                                                                    fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/[partijNr]/page.tsx",
                                                                    lineNumber: 2212,
                                                                    columnNumber: 23
                                                                }, this) : null
                                                            ]
                                                        }, void 0, true, {
                                                            fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/[partijNr]/page.tsx",
                                                            lineNumber: 2209,
                                                            columnNumber: 19
                                                        }, this)
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/[partijNr]/page.tsx",
                                                    lineNumber: 2206,
                                                    columnNumber: 17
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "rounded-xl overflow-hidden",
                                                    style: {
                                                        ...plateBodyStyle(),
                                                        padding: 0
                                                    },
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(PlateHeader, {
                                                            title: "ROOD — KEURMERK",
                                                            dot: "red",
                                                            right: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(Badge, {
                                                                text: keurmerkInfo?.rood.ok === true ? "Geldig" : keurmerkInfo?.rood.ok === false ? "Ongeldig" : "Geen data",
                                                                tone: keurmerkInfo?.rood.ok === true ? "ok" : keurmerkInfo?.rood.ok === false ? "err" : "warn",
                                                                invert: true
                                                            }, void 0, false, {
                                                                fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/[partijNr]/page.tsx",
                                                                lineNumber: 2224,
                                                                columnNumber: 23
                                                            }, void 0)
                                                        }, void 0, false, {
                                                            fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/[partijNr]/page.tsx",
                                                            lineNumber: 2220,
                                                            columnNumber: 19
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                            className: "p-3 bg-white text-zinc-900 whitespace-pre-wrap",
                                                            children: keurmerkInfo?.rood.reason ?? "-"
                                                        }, void 0, false, {
                                                            fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/[partijNr]/page.tsx",
                                                            lineNumber: 2243,
                                                            columnNumber: 19
                                                        }, this)
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/[partijNr]/page.tsx",
                                                    lineNumber: 2219,
                                                    columnNumber: 17
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/[partijNr]/page.tsx",
                                            lineNumber: 2205,
                                            columnNumber: 15
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "space-y-3",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "rounded-xl overflow-hidden",
                                                    style: {
                                                        ...plateBodyStyle(),
                                                        padding: 0
                                                    },
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(PlateHeader, {
                                                            title: "BLAUW — UITSLAGEN",
                                                            dot: "blue",
                                                            right: `${uitslagenBlauw.length} regels`
                                                        }, void 0, false, {
                                                            fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/[partijNr]/page.tsx",
                                                            lineNumber: 2250,
                                                            columnNumber: 19
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                            className: "p-3",
                                                            children: [
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(UitslagenTable, {
                                                                    rows: uitslagenBlauw,
                                                                    pageSize: 6
                                                                }, void 0, false, {
                                                                    fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/[partijNr]/page.tsx",
                                                                    lineNumber: 2253,
                                                                    columnNumber: 21
                                                                }, this),
                                                                recordBlauw?.demoAsDraw ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                    className: "mt-2 text-xs text-zinc-600",
                                                                    children: [
                                                                        "Demo-omrekening: ",
                                                                        recordBlauw.demoTotal,
                                                                        " demo’s ⇒ +",
                                                                        recordBlauw.demoAsDraw,
                                                                        " draw (per 3 demo’s)."
                                                                    ]
                                                                }, void 0, true, {
                                                                    fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/[partijNr]/page.tsx",
                                                                    lineNumber: 2255,
                                                                    columnNumber: 23
                                                                }, this) : null
                                                            ]
                                                        }, void 0, true, {
                                                            fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/[partijNr]/page.tsx",
                                                            lineNumber: 2252,
                                                            columnNumber: 19
                                                        }, this)
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/[partijNr]/page.tsx",
                                                    lineNumber: 2249,
                                                    columnNumber: 17
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "rounded-xl overflow-hidden",
                                                    style: {
                                                        ...plateBodyStyle(),
                                                        padding: 0
                                                    },
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(PlateHeader, {
                                                            title: "BLAUW — KEURMERK",
                                                            dot: "blue",
                                                            right: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(Badge, {
                                                                text: keurmerkInfo?.blauw.ok === true ? "Geldig" : keurmerkInfo?.blauw.ok === false ? "Ongeldig" : "Geen data",
                                                                tone: keurmerkInfo?.blauw.ok === true ? "ok" : keurmerkInfo?.blauw.ok === false ? "err" : "warn",
                                                                invert: true
                                                            }, void 0, false, {
                                                                fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/[partijNr]/page.tsx",
                                                                lineNumber: 2267,
                                                                columnNumber: 23
                                                            }, void 0)
                                                        }, void 0, false, {
                                                            fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/[partijNr]/page.tsx",
                                                            lineNumber: 2263,
                                                            columnNumber: 19
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                            className: "p-3 bg-white text-zinc-900 whitespace-pre-wrap",
                                                            children: keurmerkInfo?.blauw.reason ?? "-"
                                                        }, void 0, false, {
                                                            fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/[partijNr]/page.tsx",
                                                            lineNumber: 2286,
                                                            columnNumber: 19
                                                        }, this)
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/[partijNr]/page.tsx",
                                                    lineNumber: 2262,
                                                    columnNumber: 17
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/[partijNr]/page.tsx",
                                            lineNumber: 2248,
                                            columnNumber: 15
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/[partijNr]/page.tsx",
                                    lineNumber: 2203,
                                    columnNumber: 13
                                }, this)
                            }, void 0, false, {
                                fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/[partijNr]/page.tsx",
                                lineNumber: 2202,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "rounded-2xl p-4",
                                style: plateBodyStyle(),
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(PlateHeader, {
                                        title: "VERSCHILLEN — ROOD vs BLAUW",
                                        dot: "orange",
                                        right: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(Badge, {
                                            text: "Context",
                                            tone: "info",
                                            invert: true
                                        }, void 0, false, {
                                            fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/[partijNr]/page.tsx",
                                            lineNumber: 2294,
                                            columnNumber: 82
                                        }, void 0)
                                    }, void 0, false, {
                                        fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/[partijNr]/page.tsx",
                                        lineNumber: 2294,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "mt-3 grid grid-cols-1 md:grid-cols-3 gap-3 text-sm",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "rounded-xl p-3",
                                                style: darkInsetStyle(),
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        className: "text-xs tracking-widest text-white/70 font-extrabold",
                                                        children: "LEEFTIJD"
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/[partijNr]/page.tsx",
                                                        lineNumber: 2299,
                                                        columnNumber: 17
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        className: "mt-2 text-white/90",
                                                        children: [
                                                            "Verschil:",
                                                            " ",
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                className: "text-white font-extrabold",
                                                                children: verschillen?.leeftijdVerschilTekst != null ? verschillen.leeftijdVerschilTekst : "-"
                                                            }, void 0, false, {
                                                                fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/[partijNr]/page.tsx",
                                                                lineNumber: 2302,
                                                                columnNumber: 19
                                                            }, this)
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/[partijNr]/page.tsx",
                                                        lineNumber: 2300,
                                                        columnNumber: 17
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        className: "mt-1 text-white/60 text-xs",
                                                        children: [
                                                            "(Rood: ",
                                                            verschillen?.roodLeeftijd ?? "-",
                                                            " • Blauw: ",
                                                            verschillen?.blauwLeeftijd ?? "-",
                                                            ")"
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/[partijNr]/page.tsx",
                                                        lineNumber: 2304,
                                                        columnNumber: 17
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/[partijNr]/page.tsx",
                                                lineNumber: 2298,
                                                columnNumber: 15
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "rounded-xl p-3",
                                                style: darkInsetStyle(),
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        className: "text-xs tracking-widest text-white/70 font-extrabold",
                                                        children: "PARTIJEN"
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/[partijNr]/page.tsx",
                                                        lineNumber: 2311,
                                                        columnNumber: 17
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        className: "mt-2 text-white/90",
                                                        children: [
                                                            "Rood: ",
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                className: "text-white font-extrabold",
                                                                children: verschillen?.roodPartijen ?? "-"
                                                            }, void 0, false, {
                                                                fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/[partijNr]/page.tsx",
                                                                lineNumber: 2313,
                                                                columnNumber: 25
                                                            }, this),
                                                            " • Blauw:",
                                                            " ",
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                className: "text-white font-extrabold",
                                                                children: verschillen?.blauwPartijen ?? "-"
                                                            }, void 0, false, {
                                                                fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/[partijNr]/page.tsx",
                                                                lineNumber: 2314,
                                                                columnNumber: 19
                                                            }, this)
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/[partijNr]/page.tsx",
                                                        lineNumber: 2312,
                                                        columnNumber: 17
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        className: "mt-1 text-white/90",
                                                        children: [
                                                            "Verschil: ",
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                className: "text-white font-extrabold",
                                                                children: verschillen?.partijenVerschil ?? "-"
                                                            }, void 0, false, {
                                                                fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/[partijNr]/page.tsx",
                                                                lineNumber: 2317,
                                                                columnNumber: 29
                                                            }, this)
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/[partijNr]/page.tsx",
                                                        lineNumber: 2316,
                                                        columnNumber: 17
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        className: "mt-2 text-xs text-white/65",
                                                        children: [
                                                            "Demo: Rood ",
                                                            verschillen?.roodDemo ?? 0,
                                                            " • Blauw ",
                                                            verschillen?.blauwDemo ?? 0
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/[partijNr]/page.tsx",
                                                        lineNumber: 2319,
                                                        columnNumber: 17
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        className: "mt-1 text-xs text-white/65",
                                                        children: [
                                                            "Winst%: Rood ",
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                className: "text-white",
                                                                children: recordRood?.winPct != null ? `${recordRood.winPct}%` : "-"
                                                            }, void 0, false, {
                                                                fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/[partijNr]/page.tsx",
                                                                lineNumber: 2323,
                                                                columnNumber: 32
                                                            }, this),
                                                            " • Blauw",
                                                            " ",
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                className: "text-white",
                                                                children: recordBlauw?.winPct != null ? `${recordBlauw.winPct}%` : "-"
                                                            }, void 0, false, {
                                                                fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/[partijNr]/page.tsx",
                                                                lineNumber: 2324,
                                                                columnNumber: 19
                                                            }, this),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                className: "text-white/45",
                                                                children: " (demo & no contest niet mee)"
                                                            }, void 0, false, {
                                                                fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/[partijNr]/page.tsx",
                                                                lineNumber: 2325,
                                                                columnNumber: 19
                                                            }, this)
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/[partijNr]/page.tsx",
                                                        lineNumber: 2322,
                                                        columnNumber: 17
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        className: "mt-1 text-xs text-white/45",
                                                        children: "(Fightpaspoort totaal, demo’s 3=1 voor verschil.)"
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/[partijNr]/page.tsx",
                                                        lineNumber: 2327,
                                                        columnNumber: 17
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/[partijNr]/page.tsx",
                                                lineNumber: 2310,
                                                columnNumber: 15
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "rounded-xl p-3",
                                                style: darkInsetStyle(),
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        className: "flex items-center justify-between gap-2",
                                                        children: [
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                className: "text-xs tracking-widest text-white/70 font-extrabold",
                                                                children: "GEWICHT"
                                                            }, void 0, false, {
                                                                fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/[partijNr]/page.tsx",
                                                                lineNumber: 2333,
                                                                columnNumber: 19
                                                            }, this),
                                                            (()=>{
                                                                const rKg = gewichtInfo?.rKg ?? null;
                                                                const bKg = gewichtInfo?.bKg ?? null;
                                                                const klasseMaxKg = gewichtInfo?.klasseMaxKg ?? null;
                                                                const okUnder = klasseMaxKg == null || (rKg == null || rKg <= klasseMaxKg) && (bKg == null || bKg <= klasseMaxKg);
                                                                const hasAny = rKg != null || bKg != null || klasseMaxKg != null;
                                                                return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(Badge, {
                                                                    text: !hasAny ? "-" : okUnder ? "OK" : "CHECK",
                                                                    tone: !hasAny ? "info" : okUnder ? "ok" : "warn"
                                                                }, void 0, false, {
                                                                    fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/[partijNr]/page.tsx",
                                                                    lineNumber: 2340,
                                                                    columnNumber: 28
                                                                }, this);
                                                            })()
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/[partijNr]/page.tsx",
                                                        lineNumber: 2332,
                                                        columnNumber: 17
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        className: "mt-2 space-y-1 text-white/85",
                                                        children: [
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                children: [
                                                                    "Gewicht Rood (MM):",
                                                                    " ",
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                        className: "text-white font-extrabold",
                                                                        children: gewichtInfo?.rKg != null ? `${gewichtInfo.rKg.toFixed(1)} kg` : "-"
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/[partijNr]/page.tsx",
                                                                        lineNumber: 2347,
                                                                        columnNumber: 21
                                                                    }, this),
                                                                    gewichtInfo?.rKlasse ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                        className: "text-white/60",
                                                                        children: [
                                                                            " — ",
                                                                            gewichtInfo.rKlasse
                                                                        ]
                                                                    }, void 0, true, {
                                                                        fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/[partijNr]/page.tsx",
                                                                        lineNumber: 2348,
                                                                        columnNumber: 45
                                                                    }, this) : null
                                                                ]
                                                            }, void 0, true, {
                                                                fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/[partijNr]/page.tsx",
                                                                lineNumber: 2345,
                                                                columnNumber: 19
                                                            }, this),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                children: [
                                                                    "Gewicht Blauw (MM):",
                                                                    " ",
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                        className: "text-white font-extrabold",
                                                                        children: gewichtInfo?.bKg != null ? `${gewichtInfo.bKg.toFixed(1)} kg` : "-"
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/[partijNr]/page.tsx",
                                                                        lineNumber: 2352,
                                                                        columnNumber: 21
                                                                    }, this),
                                                                    gewichtInfo?.bKlasse ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                        className: "text-white/60",
                                                                        children: [
                                                                            " — ",
                                                                            gewichtInfo.bKlasse
                                                                        ]
                                                                    }, void 0, true, {
                                                                        fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/[partijNr]/page.tsx",
                                                                        lineNumber: 2353,
                                                                        columnNumber: 45
                                                                    }, this) : null
                                                                ]
                                                            }, void 0, true, {
                                                                fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/[partijNr]/page.tsx",
                                                                lineNumber: 2350,
                                                                columnNumber: 19
                                                            }, this),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                children: [
                                                                    "Klasse max gewicht:",
                                                                    " ",
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                        className: "text-white font-extrabold",
                                                                        children: gewichtInfo?.klasseMaxKg != null ? `${gewichtInfo.klasseMaxKg.toFixed(1)} kg` : "-"
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/[partijNr]/page.tsx",
                                                                        lineNumber: 2357,
                                                                        columnNumber: 21
                                                                    }, this),
                                                                    gewichtInfo?.klasseNaam ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                        className: "text-white/60",
                                                                        children: [
                                                                            " ",
                                                                            "— ",
                                                                            gewichtInfo.klasseNaam,
                                                                            gewichtInfo?.isMma ? " (MMA)" : ""
                                                                        ]
                                                                    }, void 0, true, {
                                                                        fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/[partijNr]/page.tsx",
                                                                        lineNumber: 2359,
                                                                        columnNumber: 23
                                                                    }, this) : null
                                                                ]
                                                            }, void 0, true, {
                                                                fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/[partijNr]/page.tsx",
                                                                lineNumber: 2355,
                                                                columnNumber: 19
                                                            }, this),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                children: [
                                                                    "Verschil: ",
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                        className: "text-white font-extrabold",
                                                                        children: gewichtInfo?.diffKg != null ? `${gewichtInfo.diffKg.toFixed(1)} kg` : "-"
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/[partijNr]/page.tsx",
                                                                        lineNumber: 2367,
                                                                        columnNumber: 31
                                                                    }, this)
                                                                ]
                                                            }, void 0, true, {
                                                                fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/[partijNr]/page.tsx",
                                                                lineNumber: 2366,
                                                                columnNumber: 19
                                                            }, this)
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/[partijNr]/page.tsx",
                                                        lineNumber: 2344,
                                                        columnNumber: 17
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/[partijNr]/page.tsx",
                                                lineNumber: 2331,
                                                columnNumber: 15
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/[partijNr]/page.tsx",
                                        lineNumber: 2296,
                                        columnNumber: 13
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/[partijNr]/page.tsx",
                                lineNumber: 2293,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "rounded-2xl overflow-hidden",
                                style: {
                                    ...plateBodyStyle(),
                                    padding: 0
                                },
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "p-3",
                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(PlateHeader, {
                                            title: "MELDINGEN — RULES",
                                            dot: "orange",
                                            right: `${regels.length} meldingen`
                                        }, void 0, false, {
                                            fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/[partijNr]/page.tsx",
                                            lineNumber: 2377,
                                            columnNumber: 15
                                        }, this)
                                    }, void 0, false, {
                                        fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/[partijNr]/page.tsx",
                                        lineNumber: 2376,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "p-4 pt-2",
                                        children: [
                                            regels.length === 0 ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "text-sm text-zinc-700",
                                                children: "Geen meldingen."
                                            }, void 0, false, {
                                                fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/[partijNr]/page.tsx",
                                                lineNumber: 2382,
                                                columnNumber: 17
                                            }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "overflow-auto rounded-md border-2 border-zinc-300 bg-white",
                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("table", {
                                                    className: "w-full text-sm border-collapse",
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("thead", {
                                                            className: "bg-zinc-800 text-white border-b-4",
                                                            style: {
                                                                borderColor: NVB_ORANGE
                                                            },
                                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("tr", {
                                                                children: [
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                                        className: "text-left px-3 py-2 w-40",
                                                                        children: "Resultaat"
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/[partijNr]/page.tsx",
                                                                        lineNumber: 2389,
                                                                        columnNumber: 25
                                                                    }, this),
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                                        className: "text-left px-3 py-2 w-64",
                                                                        children: "Regel"
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/[partijNr]/page.tsx",
                                                                        lineNumber: 2390,
                                                                        columnNumber: 25
                                                                    }, this),
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                                        className: "text-left px-3 py-2",
                                                                        children: "Reden"
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/[partijNr]/page.tsx",
                                                                        lineNumber: 2391,
                                                                        columnNumber: 25
                                                                    }, this),
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                                        className: "text-left px-3 py-2 w-72",
                                                                        children: "Aantekeningen"
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/[partijNr]/page.tsx",
                                                                        lineNumber: 2392,
                                                                        columnNumber: 25
                                                                    }, this),
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                                        className: "text-left px-3 py-2 w-40",
                                                                        children: "Actie"
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/[partijNr]/page.tsx",
                                                                        lineNumber: 2393,
                                                                        columnNumber: 25
                                                                    }, this)
                                                                ]
                                                            }, void 0, true, {
                                                                fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/[partijNr]/page.tsx",
                                                                lineNumber: 2388,
                                                                columnNumber: 23
                                                            }, this)
                                                        }, void 0, false, {
                                                            fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/[partijNr]/page.tsx",
                                                            lineNumber: 2387,
                                                            columnNumber: 21
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("tbody", {
                                                            className: "[&>tr:nth-child(odd)]:bg-white [&>tr:nth-child(odd)]:text-zinc-900 [&>tr:nth-child(even)]:bg-zinc-700 [&>tr:nth-child(even)]:text-white",
                                                            children: regels.map((r, idx)=>{
                                                                const disp = displayResultaat(r);
                                                                const canApprove = canApproveRule(r);
                                                                return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("tr", {
                                                                    children: [
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                                            className: "px-3 py-2 align-top",
                                                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                                className: "flex flex-col gap-1",
                                                                                children: [
                                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(Badge, {
                                                                                        text: disp.label,
                                                                                        tone: disp.tone,
                                                                                        invert: true
                                                                                    }, void 0, false, {
                                                                                        fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/[partijNr]/page.tsx",
                                                                                        lineNumber: 2407,
                                                                                        columnNumber: 33
                                                                                    }, this),
                                                                                    r.original_resultaat && String(r.original_resultaat).toLowerCase() !== String(r.resultaat ?? "").toLowerCase() ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                                        className: "text-[10px] opacity-70",
                                                                                        children: [
                                                                                            "Origineel: ",
                                                                                            String(r.original_resultaat).toUpperCase()
                                                                                        ]
                                                                                    }, void 0, true, {
                                                                                        fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/[partijNr]/page.tsx",
                                                                                        lineNumber: 2410,
                                                                                        columnNumber: 35
                                                                                    }, this) : null,
                                                                                    r.review_status ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                                        className: "text-[10px] opacity-70",
                                                                                        children: [
                                                                                            "Review: ",
                                                                                            String(r.review_status)
                                                                                        ]
                                                                                    }, void 0, true, {
                                                                                        fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/[partijNr]/page.tsx",
                                                                                        lineNumber: 2415,
                                                                                        columnNumber: 35
                                                                                    }, this) : null,
                                                                                    r.reviewed_by || r.reviewed_at ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                                        className: "text-[10px] opacity-70",
                                                                                        children: [
                                                                                            r.reviewed_by ? `door ${r.reviewed_by}` : "",
                                                                                            r.reviewed_at ? ` • ${fmtDateOnlyNL(r.reviewed_at)}` : ""
                                                                                        ]
                                                                                    }, void 0, true, {
                                                                                        fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/[partijNr]/page.tsx",
                                                                                        lineNumber: 2420,
                                                                                        columnNumber: 35
                                                                                    }, this) : null
                                                                                ]
                                                                            }, void 0, true, {
                                                                                fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/[partijNr]/page.tsx",
                                                                                lineNumber: 2406,
                                                                                columnNumber: 31
                                                                            }, this)
                                                                        }, void 0, false, {
                                                                            fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/[partijNr]/page.tsx",
                                                                            lineNumber: 2405,
                                                                            columnNumber: 29
                                                                        }, this),
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                                            className: "px-3 py-2 align-top font-mono text-xs",
                                                                            children: r.rule_code ?? r.rule ?? "-"
                                                                        }, void 0, false, {
                                                                            fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/[partijNr]/page.tsx",
                                                                            lineNumber: 2428,
                                                                            columnNumber: 29
                                                                        }, this),
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                                            className: "px-3 py-2 align-top",
                                                                            children: r.boodschap ?? "-"
                                                                        }, void 0, false, {
                                                                            fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/[partijNr]/page.tsx",
                                                                            lineNumber: 2430,
                                                                            columnNumber: 29
                                                                        }, this),
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                                            className: "px-3 py-2 align-top",
                                                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("textarea", {
                                                                                defaultValue: noteDraftRef.current[r.id] ?? r.aantekeningen ?? "",
                                                                                onChange: (e)=>{
                                                                                    noteDraftRef.current[r.id] = e.target.value;
                                                                                },
                                                                                onBlur: (e)=>{
                                                                                    const v = e.target.value;
                                                                                    noteDraftRef.current[r.id] = v;
                                                                                    saveAantekeningen(r.id, v);
                                                                                },
                                                                                placeholder: "Noteer reden van goedkeuren / besluit…",
                                                                                spellCheck: false,
                                                                                className: "w-full min-h-[54px] px-2 py-2 rounded border border-zinc-400 bg-zinc-50 text-zinc-900 text-xs focus:outline-none focus:ring-2 focus:ring-zinc-400/40"
                                                                            }, void 0, false, {
                                                                                fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/[partijNr]/page.tsx",
                                                                                lineNumber: 2433,
                                                                                columnNumber: 31
                                                                            }, this)
                                                                        }, void 0, false, {
                                                                            fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/[partijNr]/page.tsx",
                                                                            lineNumber: 2432,
                                                                            columnNumber: 29
                                                                        }, this),
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                                            className: "px-3 py-2 align-top",
                                                                            children: canApprove ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                                className: "flex flex-col gap-2",
                                                                                children: [
                                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                                                        type: "button",
                                                                                        onClick: ()=>approveSingle(r.id),
                                                                                        disabled: approving,
                                                                                        className: "px-3 py-1 text-xs rounded bg-[var(--brand-orange)] text-black font-semibold hover:opacity-90 disabled:opacity-50",
                                                                                        children: "Goedkeuren"
                                                                                    }, void 0, false, {
                                                                                        fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/[partijNr]/page.tsx",
                                                                                        lineNumber: 2452,
                                                                                        columnNumber: 35
                                                                                    }, this),
                                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                                                        type: "button",
                                                                                        onClick: ()=>rejectSingle(r.id),
                                                                                        disabled: approving,
                                                                                        className: "px-3 py-1 text-xs rounded font-semibold hover:opacity-90 disabled:opacity-50 bg-[#2a2a2e] text-white",
                                                                                        children: "Afkeuren"
                                                                                    }, void 0, false, {
                                                                                        fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/[partijNr]/page.tsx",
                                                                                        lineNumber: 2461,
                                                                                        columnNumber: 35
                                                                                    }, this)
                                                                                ]
                                                                            }, void 0, true, {
                                                                                fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/[partijNr]/page.tsx",
                                                                                lineNumber: 2451,
                                                                                columnNumber: 33
                                                                            }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                                className: "text-xs text-zinc-400",
                                                                                children: "—"
                                                                            }, void 0, false, {
                                                                                fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/[partijNr]/page.tsx",
                                                                                lineNumber: 2471,
                                                                                columnNumber: 33
                                                                            }, this)
                                                                        }, void 0, false, {
                                                                            fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/[partijNr]/page.tsx",
                                                                            lineNumber: 2449,
                                                                            columnNumber: 29
                                                                        }, this)
                                                                    ]
                                                                }, r.id, true, {
                                                                    fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/[partijNr]/page.tsx",
                                                                    lineNumber: 2404,
                                                                    columnNumber: 27
                                                                }, this);
                                                            })
                                                        }, void 0, false, {
                                                            fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/[partijNr]/page.tsx",
                                                            lineNumber: 2398,
                                                            columnNumber: 21
                                                        }, this)
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/[partijNr]/page.tsx",
                                                    lineNumber: 2385,
                                                    columnNumber: 19
                                                }, this)
                                            }, void 0, false, {
                                                fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/[partijNr]/page.tsx",
                                                lineNumber: 2384,
                                                columnNumber: 17
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "mt-4 flex flex-wrap items-center gap-2",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                        type: "button",
                                                        onClick: rescrapeBout,
                                                        disabled: rescraping,
                                                        className: "inline-flex items-center px-4 py-2 rounded bg-[var(--brand-orange)] text-black font-semibold hover:opacity-90 disabled:opacity-50",
                                                        children: rescraping ? "Herscrape…" : "Herscrape partij"
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/[partijNr]/page.tsx",
                                                        lineNumber: 2484,
                                                        columnNumber: 17
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                        type: "button",
                                                        onClick: sendToDispensatie,
                                                        disabled: sendingDisp,
                                                        className: `inline-flex items-center px-4 py-2 rounded font-semibold transition ${sendingDisp ? "opacity-60 cursor-not-allowed" : "hover:opacity-90"} ${dispSent ? "bg-green-700 text-white" : "bg-[#2a2a2e] text-white"}`,
                                                        children: sendingDisp ? "Bezig… (versturen)" : dispSent ? "Verstuurd ✓" : "Stuur naar dispensatie"
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/[partijNr]/page.tsx",
                                                        lineNumber: 2493,
                                                        columnNumber: 17
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/[partijNr]/page.tsx",
                                                lineNumber: 2483,
                                                columnNumber: 15
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/[partijNr]/page.tsx",
                                        lineNumber: 2380,
                                        columnNumber: 13
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/[partijNr]/page.tsx",
                                lineNumber: 2375,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/[partijNr]/page.tsx",
                        lineNumber: 2057,
                        columnNumber: 11
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/[partijNr]/page.tsx",
                lineNumber: 2038,
                columnNumber: 7
            }, this),
            editOpen ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "w-full max-w-lg rounded-xl border-2 border-zinc-400 bg-white p-4 shadow-xl",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "flex items-center justify-between",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "font-extrabold text-zinc-900",
                                    children: [
                                        "Bewerk persoon — ",
                                        editOpen === "rood" ? "Rood" : "Blauw"
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/[partijNr]/page.tsx",
                                    lineNumber: 2516,
                                    columnNumber: 19
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                    type: "button",
                                    onClick: closeEdit,
                                    className: "text-zinc-700 hover:text-zinc-900 px-2 py-1",
                                    children: "✕"
                                }, void 0, false, {
                                    fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/[partijNr]/page.tsx",
                                    lineNumber: 2517,
                                    columnNumber: 19
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/[partijNr]/page.tsx",
                            lineNumber: 2515,
                            columnNumber: 17
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "mt-3 space-y-3",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "text-xs text-zinc-600 mb-1",
                                            children: "VA nummer"
                                        }, void 0, false, {
                                            fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/[partijNr]/page.tsx",
                                            lineNumber: 2525,
                                            columnNumber: 21
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                            defaultValue: editDraftRef.current.va,
                                            onChange: (e)=>{
                                                editDraftRef.current.va = e.target.value;
                                            },
                                            className: "w-full px-3 py-2 rounded bg-zinc-50 border border-zinc-400 text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-400/40",
                                            placeholder: "bijv. 12345"
                                        }, void 0, false, {
                                            fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/[partijNr]/page.tsx",
                                            lineNumber: 2526,
                                            columnNumber: 21
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/[partijNr]/page.tsx",
                                    lineNumber: 2524,
                                    columnNumber: 19
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "text-xs text-zinc-600 mb-1",
                                            children: "Naam"
                                        }, void 0, false, {
                                            fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/[partijNr]/page.tsx",
                                            lineNumber: 2540,
                                            columnNumber: 21
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                            defaultValue: editDraftRef.current.naam,
                                            onChange: (e)=>{
                                                editDraftRef.current.naam = e.target.value;
                                            },
                                            className: "w-full px-3 py-2 rounded bg-zinc-50 border border-zinc-400 text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-400/40",
                                            placeholder: "Bijv. Voornaam Achternaam"
                                        }, void 0, false, {
                                            fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/[partijNr]/page.tsx",
                                            lineNumber: 2541,
                                            columnNumber: 21
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/[partijNr]/page.tsx",
                                    lineNumber: 2539,
                                    columnNumber: 19
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "text-xs text-zinc-600 mb-1",
                                            children: "Sportschool"
                                        }, void 0, false, {
                                            fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/[partijNr]/page.tsx",
                                            lineNumber: 2553,
                                            columnNumber: 21
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                            defaultValue: editDraftRef.current.gym,
                                            onChange: (e)=>{
                                                editDraftRef.current.gym = e.target.value;
                                            },
                                            className: "w-full px-3 py-2 rounded bg-zinc-50 border border-zinc-400 text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-400/40",
                                            placeholder: "Bijv. Team XYZ"
                                        }, void 0, false, {
                                            fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/[partijNr]/page.tsx",
                                            lineNumber: 2554,
                                            columnNumber: 21
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/[partijNr]/page.tsx",
                                    lineNumber: 2552,
                                    columnNumber: 19
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "text-xs text-zinc-600 mb-1",
                                            children: "Discipline (partij)"
                                        }, void 0, false, {
                                            fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/[partijNr]/page.tsx",
                                            lineNumber: 2566,
                                            columnNumber: 21
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                            defaultValue: editDraftRef.current.discipline,
                                            onChange: (e)=>{
                                                editDraftRef.current.discipline = e.target.value;
                                            },
                                            className: "w-full px-3 py-2 rounded bg-zinc-50 border border-zinc-400 text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-400/40",
                                            placeholder: "Bijv. THAIBOKSEN/MUAY THAI"
                                        }, void 0, false, {
                                            fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/[partijNr]/page.tsx",
                                            lineNumber: 2567,
                                            columnNumber: 21
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/[partijNr]/page.tsx",
                                    lineNumber: 2565,
                                    columnNumber: 19
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "text-xs text-zinc-600 mb-1",
                                            children: "Klasse (partij)"
                                        }, void 0, false, {
                                            fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/[partijNr]/page.tsx",
                                            lineNumber: 2579,
                                            columnNumber: 21
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                            defaultValue: editDraftRef.current.klasse,
                                            onChange: (e)=>{
                                                editDraftRef.current.klasse = e.target.value;
                                            },
                                            className: "w-full px-3 py-2 rounded bg-zinc-50 border border-zinc-400 text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-400/40",
                                            placeholder: "Bijv. JEUGD/YOUTH, N, C, B…"
                                        }, void 0, false, {
                                            fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/[partijNr]/page.tsx",
                                            lineNumber: 2580,
                                            columnNumber: 21
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/[partijNr]/page.tsx",
                                    lineNumber: 2578,
                                    columnNumber: 19
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "pt-2 flex flex-wrap items-center gap-2 justify-end",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                            type: "button",
                                            onClick: closeEdit,
                                            disabled: editSaving,
                                            className: "px-4 py-2 rounded bg-[#2a2a2e] text-white font-semibold hover:opacity-90 disabled:opacity-50",
                                            children: "Annuleren"
                                        }, void 0, false, {
                                            fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/[partijNr]/page.tsx",
                                            lineNumber: 2592,
                                            columnNumber: 21
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                            type: "button",
                                            onClick: saveEditOnly,
                                            disabled: editSaving,
                                            className: "px-4 py-2 rounded bg-[var(--brand-orange)] text-black font-extrabold hover:opacity-90 disabled:opacity-50",
                                            children: editSaving ? "Opslaan…" : "Opslaan"
                                        }, void 0, false, {
                                            fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/[partijNr]/page.tsx",
                                            lineNumber: 2601,
                                            columnNumber: 21
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                            type: "button",
                                            onClick: saveAndRescrapeFromModal,
                                            disabled: editSaving,
                                            className: "px-4 py-2 rounded bg-white text-black font-extrabold hover:opacity-90 disabled:opacity-50",
                                            title: "Opslaan en daarna herscrape starten",
                                            children: editSaving ? "Bezig…" : "Opslaan + Herscrape"
                                        }, void 0, false, {
                                            fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/[partijNr]/page.tsx",
                                            lineNumber: 2610,
                                            columnNumber: 21
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/[partijNr]/page.tsx",
                                    lineNumber: 2591,
                                    columnNumber: 19
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "text-xs text-zinc-600",
                                    children: "Tip: “Opslaan” wijzigt alleen Matchmaking-data. “Opslaan + Fightpaspoort” haalt daarna Fightpaspoort opnieuw op."
                                }, void 0, false, {
                                    fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/[partijNr]/page.tsx",
                                    lineNumber: 2621,
                                    columnNumber: 19
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/[partijNr]/page.tsx",
                            lineNumber: 2522,
                            columnNumber: 17
                        }, this)
                    ]
                }, editMountKey, true, {
                    fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/[partijNr]/page.tsx",
                    lineNumber: 2514,
                    columnNumber: 15
                }, this)
            }, void 0, false, {
                fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/[partijNr]/page.tsx",
                lineNumber: 2513,
                columnNumber: 13
            }, this) : null
        ]
    }, void 0, true, {
        fileName: "[project]/app/dashboard/admin/controle/[matchmakingId]/[partijNr]/page.tsx",
        lineNumber: 2037,
        columnNumber: 5
    }, this);
}
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__b1fd1b5f._.js.map