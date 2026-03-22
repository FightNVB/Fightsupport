module.exports = [
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
"[project]/app/dashboard/admin/controle/page.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>ControleOverzichtPage
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$styled$2d$jsx$2f$style$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/styled-jsx/style.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/client/app-dir/link.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$image$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/image.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$api$2f$authedFetch$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/api/authedFetch.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabaseClient$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/supabaseClient.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$NvbLightButton$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/NvbLightButton.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$NvbDarkButton$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/NvbDarkButton.tsx [app-ssr] (ecmascript)");
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
const NVB_ORANGE = "#ff4d00";
const silverBackplate = {
    background: "radial-gradient(circle at 50% 0%, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0.16) 38%, rgba(0,0,0,0.08) 72%, rgba(0,0,0,0.22) 100%), linear-gradient(180deg, rgba(255,255,255,0.92) 0%, rgba(236,238,242,0.98) 100%)"
};
function formatDate(v) {
    if (!v) return "-";
    return new Date(v).toLocaleDateString("nl-NL");
}
function formatDateTime(v) {
    if (!v) return "-";
    return new Date(v).toLocaleString("nl-NL");
}
function getMonthKey(v) {
    if (!v) return "";
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return "";
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    return `${year}-${month}`;
}
function formatMonthLabel(monthKey) {
    if (!monthKey) return "-";
    const [year, month] = monthKey.split("-");
    const d = new Date(Number(year), Number(month) - 1, 1);
    return d.toLocaleDateString("nl-NL", {
        month: "long",
        year: "numeric"
    });
}
function Small({ children, origin = "left center" }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        style: {
            transform: "scale(0.85)",
            transformOrigin: origin
        },
        children: children
    }, void 0, false, {
        fileName: "[project]/app/dashboard/admin/controle/page.tsx",
        lineNumber: 90,
        columnNumber: 5
    }, this);
}
function normalizeStatus(status) {
    return (status ?? "Niet gecontroleerd").trim().toLowerCase();
}
function formatStatusLabel(status) {
    const s = normalizeStatus(status);
    if (s === "niet gecontroleerd") return "Niet gecontroleerd";
    return status ?? "Niet gecontroleerd";
}
function TabButton({ active, label, count, onClick }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
        type: "button",
        onClick: onClick,
        className: "px-4 py-2 text-sm font-extrabold tracking-[0.02em] transition",
        style: {
            borderRadius: 0,
            minWidth: 220,
            background: active ? "linear-gradient(180deg, #ff6a14 0%, #ff4d00 55%, #df3f00 100%)" : "linear-gradient(180deg, #f2f2f2 0%, #cfcfcf 48%, #a8a8a8 100%)",
            color: active ? "#fff" : "#161616",
            border: active ? "1px solid rgba(150,40,0,0.55)" : "1px solid rgba(82,82,91,0.45)",
            boxShadow: active ? "inset 0 1px 0 rgba(255,255,255,0.18), 0 12px 22px rgba(255,77,0,0.18)" : "inset 0 1px 0 rgba(255,255,255,0.85), 0 10px 18px rgba(0,0,0,0.10)"
        },
        children: [
            label,
            " ",
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                style: {
                    opacity: 0.9
                },
                children: [
                    "(",
                    count,
                    ")"
                ]
            }, void 0, true, {
                fileName: "[project]/app/dashboard/admin/controle/page.tsx",
                lineNumber: 142,
                columnNumber: 15
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/app/dashboard/admin/controle/page.tsx",
        lineNumber: 123,
        columnNumber: 5
    }, this);
}
function ControleOverzichtPage() {
    const [rows, setRows] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])([]);
    const [loading, setLoading] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(true);
    const [busyId, setBusyId] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(null);
    const [isBusy, setIsBusy] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(false);
    const [sportsBusy, setSportsBusy] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(false);
    const [sportsMsg, setSportsMsg] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])("");
    const [editId, setEditId] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(null);
    const [editMatchmaker, setEditMatchmaker] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])("");
    const [editPromotor, setEditPromotor] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])("");
    const [editBondteam, setEditBondteam] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])("");
    const [savingEditId, setSavingEditId] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(null);
    const [snapshotSavingId, setSnapshotSavingId] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(null);
    const [rowMsgById, setRowMsgById] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])({});
    const [filterMonth, setFilterMonth] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])("");
    const [filterBondteam, setFilterBondteam] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])("");
    const [filterName, setFilterName] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])("");
    const [filterStatus, setFilterStatus] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])("");
    const [activeTab, setActiveTab] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])("controle");
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        void load();
    }, []);
    function setRowMessage(rowId, message) {
        setRowMsgById((prev)=>({
                ...prev,
                [rowId]: message
            }));
    }
    async function load() {
        setLoading(true);
        setSportsMsg("");
        const { data: uploads, error: uploadError } = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabaseClient$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["supabase"].from("matchmaking_uploads").select(`
        id,
        uploaded_at,
        uploaded_by,
        hoofdofficial_user_id,
        evenement_naam,
        evenement_datum,
        locatie,
        matchmaking_id,
        matchmaker,
        promotor,
        bondteam,
        official_release,
        official_released_at
      `).order("uploaded_at", {
            ascending: false
        });
        if (uploadError) {
            console.error("Fout bij laden uploads:", uploadError);
            setRows([]);
            setLoading(false);
            return;
        }
        const matchmakingIds = (uploads ?? []).map((u)=>u.matchmaking_id).filter(Boolean);
        const { data: runs } = matchmakingIds.length ? await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabaseClient$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["supabase"].from("controle_runs").select("id, matchmaking_id, status, gestart_op, afgerond_op, run_type").in("matchmaking_id", matchmakingIds) : {
            data: []
        };
        const runMap = new Map();
        (runs ?? []).forEach((r)=>{
            const existing = runMap.get(r.matchmaking_id);
            if (!existing || new Date(r.gestart_op ?? 0) > new Date(existing.gestart_op ?? 0)) {
                runMap.set(r.matchmaking_id, r);
            }
        });
        const merged = (uploads ?? []).map((u)=>({
                ...u,
                laatste_run: u.matchmaking_id ? runMap.get(u.matchmaking_id) ?? null : null
            }));
        setRows(merged);
        setLoading(false);
    }
    async function runSportscholen() {
        try {
            setSportsMsg("");
            setSportsBusy(true);
            const res = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$api$2f$authedFetch$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["authedFetch"])("/api/control-engine/sportscholen", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                }
            });
            if (!res.ok) {
                const t = await res.text();
                console.error("Sportscholen run failed:", res.status, t);
                setSportsMsg(`❌ Sportscholen sync mislukt (${res.status}).`);
                return;
            }
            setSportsMsg("✅ Sportscholen sync gestart/afgerond.");
            await load();
        } catch (e) {
            console.error(e);
            setSportsMsg("❌ Onverwachte fout bij sportscholen sync.");
        } finally{
            setSportsBusy(false);
        }
    }
    async function startControle(matchmakingId) {
        try {
            setIsBusy(true);
            setBusyId(matchmakingId);
            const res = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$api$2f$authedFetch$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["authedFetch"])("/api/control-engine/start", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    matchmaking_id: matchmakingId,
                    do_scrape: true,
                    scrape_mode: "auto",
                    reset_before_run: true
                })
            });
            if (!res.ok) {
                const t = await res.text();
                console.error("Start controle failed:", res.status, t);
                alert("Start controle mislukt. Check console/logs.");
                return;
            }
            await load();
        } finally{
            setBusyId(null);
            setIsBusy(false);
        }
    }
    async function deleteMatchmaking(matchmaking_id) {
        const ok2 = window.confirm("Weet je zeker dat je deze matchmaking + alle controle data wilt verwijderen?\n\nDit kan niet ongedaan gemaakt worden.");
        if (!ok2) return;
        try {
            setBusyId(matchmaking_id);
            const res = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$api$2f$authedFetch$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["authedFetch"])("/api/control-engine/delete-matchmaking", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    matchmaking_id
                })
            });
            if (!res.ok) {
                const t = await res.text();
                console.error("Delete failed:", res.status, t);
                alert("Verwijderen mislukt. Check console/logs.");
                return;
            }
            await load();
        } finally{
            setBusyId(null);
        }
    }
    function openEdit(r) {
        setRowMessage(r.id, "");
        setEditId(r.id);
        setEditMatchmaker(r.matchmaker ?? "");
        setEditPromotor(r.promotor ?? "");
        setEditBondteam(r.bondteam ?? "");
    }
    function closeEdit() {
        setEditId(null);
        setEditMatchmaker("");
        setEditPromotor("");
        setEditBondteam("");
    }
    async function saveEdit(uploadId) {
        try {
            setRowMessage(uploadId, "");
            if (!editMatchmaker.trim()) {
                setRowMessage(uploadId, "⚠️ Matchmaker is verplicht.");
                return;
            }
            setSavingEditId(uploadId);
            const { error } = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabaseClient$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["supabase"].from("matchmaking_uploads").update({
                matchmaker: editMatchmaker.trim(),
                promotor: editPromotor.trim() || null,
                bondteam: editBondteam.trim() || null
            }).eq("id", uploadId);
            if (error) {
                console.error("Update upload meta error:", error);
                setRowMessage(uploadId, "❌ Bewerken opslaan mislukt.");
                return;
            }
            setRowMessage(uploadId, "✅ Bewerking opgeslagen.");
            await load();
            closeEdit();
        } catch (e) {
            console.error(e);
            setRowMessage(uploadId, "❌ Onverwachte fout bij opslaan.");
        } finally{
            setSavingEditId(null);
        }
    }
    async function saveSnapshot(row) {
        try {
            const matchmakingId = String(row.matchmaking_id ?? "").trim();
            if (!matchmakingId) {
                setRowMessage(row.id, "❌ Geen matchmaking_id.");
                return;
            }
            setRowMessage(row.id, "");
            setSnapshotSavingId(row.id);
            const res = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$api$2f$authedFetch$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["authedFetch"])("/api/admin/beheer/save-matchmaking", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    matchmaking_id: matchmakingId
                })
            });
            const json = await res.json().catch(()=>null);
            if (!res.ok) {
                console.error("save-matchmaking failed:", res.status, json);
                setRowMessage(row.id, json?.error ? `❌ ${json.error}` : "❌ Snapshot opslaan mislukt.");
                return;
            }
            setRowMessage(row.id, json?.message ?? "✅ Matchmaking opgeslagen in beheer-database.");
        } catch (e) {
            console.error(e);
            setRowMessage(row.id, "❌ Onverwachte fout bij snapshot opslaan.");
        } finally{
            setSnapshotSavingId(null);
        }
    }
    const monthOptions = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useMemo"])(()=>{
        return Array.from(new Set(rows.map((r)=>getMonthKey(r.evenement_datum)).filter(Boolean))).sort((a, b)=>b.localeCompare(a));
    }, [
        rows
    ]);
    const statusOptions = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useMemo"])(()=>{
        return Array.from(new Set(rows.map((r)=>normalizeStatus(r.laatste_run?.status ?? "Niet gecontroleerd")))).sort((a, b)=>a.localeCompare(b, "nl"));
    }, [
        rows
    ]);
    const tabRows = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useMemo"])(()=>{
        if (activeTab === "bondteam") {
            return rows.filter((r)=>!!r.official_release);
        }
        return rows.filter((r)=>!r.official_release);
    }, [
        rows,
        activeTab
    ]);
    const filteredRows = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useMemo"])(()=>{
        const nameNeedle = filterName.trim().toLowerCase();
        const bondNeedle = filterBondteam.trim().toLowerCase();
        return tabRows.filter((r)=>{
            const rowMonth = getMonthKey(r.evenement_datum);
            const rowBondteam = (r.bondteam ?? "").trim().toLowerCase();
            const rowMatchmaker = (r.matchmaker ?? "").trim().toLowerCase();
            const rowEvent = (r.evenement_naam ?? "").trim().toLowerCase();
            const rowStatus = normalizeStatus(r.laatste_run?.status ?? "Niet gecontroleerd");
            if (filterMonth && rowMonth !== filterMonth) return false;
            if (filterStatus && rowStatus !== filterStatus) return false;
            if (bondNeedle && !rowBondteam.includes(bondNeedle)) return false;
            if (nameNeedle && !rowMatchmaker.includes(nameNeedle) && !rowEvent.includes(nameNeedle)) {
                return false;
            }
            return true;
        });
    }, [
        tabRows,
        filterMonth,
        filterBondteam,
        filterName,
        filterStatus
    ]);
    const hasActiveFilters = !!filterMonth || !!filterBondteam || !!filterName || !!filterStatus;
    function resetFilters() {
        setFilterMonth("");
        setFilterBondteam("");
        setFilterName("");
        setFilterStatus("");
    }
    const bondteamCount = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useMemo"])(()=>rows.filter((r)=>!!r.official_release).length, [
        rows
    ]);
    const controleCount = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useMemo"])(()=>rows.filter((r)=>!r.official_release).length, [
        rows
    ]);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("main", {
        className: "min-h-screen px-4 py-6",
        style: {
            background: "#eef0f3"
        },
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "jsx-e330f5047f16c9d3" + " " + "mx-auto w-full max-w-[1500px]",
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    style: {
                        background: "linear-gradient(180deg, #f8f8f8 0%, #d8d8d8 22%, #8f8f8f 55%, #f0f0f0 100%)",
                        boxShadow: `
              0 0 0 1px rgba(255,255,255,0.7),
              0 22px 70px rgba(0,0,0,0.9)
            `
                    },
                    className: "jsx-e330f5047f16c9d3" + " " + "rounded-[32px] p-[6px]",
                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        style: {
                            background: "linear-gradient(180deg, #f8fafc 0%, #eef2f7 100%)",
                            border: "3px solid rgba(63,63,70,0.35)",
                            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.9)"
                        },
                        className: "jsx-e330f5047f16c9d3" + " " + "relative overflow-hidden rounded-[28px]",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                style: {
                                    background: "linear-gradient(180deg, #3a3a3f 0%, #2a2a2e 100%)",
                                    borderBottom: `3px solid rgba(255,77,0,0.55)`
                                },
                                className: "jsx-e330f5047f16c9d3" + " " + "px-6 py-5",
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "jsx-e330f5047f16c9d3" + " " + "grid grid-cols-1 items-center gap-4 xl:grid-cols-[1fr_auto_1fr]",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "jsx-e330f5047f16c9d3" + " " + "justify-self-start",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "jsx-e330f5047f16c9d3" + " " + "leading-tight",
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                            style: {
                                                                fontSize: 28,
                                                                letterSpacing: "0.04em",
                                                                color: NVB_ORANGE,
                                                                textShadow: "0 6px 18px rgba(0,0,0,0.45)"
                                                            },
                                                            className: "jsx-e330f5047f16c9d3" + " " + "font-extrabold uppercase",
                                                            children: "Controle Overzicht"
                                                        }, void 0, false, {
                                                            fileName: "[project]/app/dashboard/admin/controle/page.tsx",
                                                            lineNumber: 524,
                                                            columnNumber: 21
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                            className: "jsx-e330f5047f16c9d3" + " " + "mt-1 text-sm text-white/85",
                                                            children: "Matchmakings ter controle"
                                                        }, void 0, false, {
                                                            fileName: "[project]/app/dashboard/admin/controle/page.tsx",
                                                            lineNumber: 535,
                                                            columnNumber: 21
                                                        }, this)
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/app/dashboard/admin/controle/page.tsx",
                                                    lineNumber: 523,
                                                    columnNumber: 19
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "jsx-e330f5047f16c9d3" + " " + "mt-3 flex flex-wrap items-center gap-2",
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(Small, {
                                                            origin: "left center",
                                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$NvbLightButton$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"], {
                                                                label: "← Terug naar Admin",
                                                                onClick: ()=>window.location.href = "/dashboard/admin"
                                                            }, void 0, false, {
                                                                fileName: "[project]/app/dashboard/admin/controle/page.tsx",
                                                                lineNumber: 542,
                                                                columnNumber: 23
                                                            }, this)
                                                        }, void 0, false, {
                                                            fileName: "[project]/app/dashboard/admin/controle/page.tsx",
                                                            lineNumber: 541,
                                                            columnNumber: 21
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(Small, {
                                                            origin: "left center",
                                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$NvbDarkButton$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"], {
                                                                label: "Upload MM",
                                                                onClick: ()=>window.location.href = "/dashboard/admin/upload"
                                                            }, void 0, false, {
                                                                fileName: "[project]/app/dashboard/admin/controle/page.tsx",
                                                                lineNumber: 549,
                                                                columnNumber: 23
                                                            }, this)
                                                        }, void 0, false, {
                                                            fileName: "[project]/app/dashboard/admin/controle/page.tsx",
                                                            lineNumber: 548,
                                                            columnNumber: 21
                                                        }, this)
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/app/dashboard/admin/controle/page.tsx",
                                                    lineNumber: 540,
                                                    columnNumber: 19
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/app/dashboard/admin/controle/page.tsx",
                                            lineNumber: 522,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "jsx-e330f5047f16c9d3" + " " + "justify-self-center",
                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$image$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"], {
                                                src: "/branding/fightsupport/excel-logo.png",
                                                alt: "FightSupport",
                                                width: 320,
                                                height: 120,
                                                priority: true,
                                                className: "h-auto w-[240px] md:w-[280px] xl:w-[320px] drop-shadow-[0_8px_22px_rgba(0,0,0,0.45)]"
                                            }, void 0, false, {
                                                fileName: "[project]/app/dashboard/admin/controle/page.tsx",
                                                lineNumber: 558,
                                                columnNumber: 19
                                            }, this)
                                        }, void 0, false, {
                                            fileName: "[project]/app/dashboard/admin/controle/page.tsx",
                                            lineNumber: 557,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "jsx-e330f5047f16c9d3" + " " + "flex min-w-[240px] flex-col items-end gap-2 justify-self-end",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                    onClick: runSportscholen,
                                                    disabled: sportsBusy,
                                                    title: "Update sportscholen tabel (keurmerk data)",
                                                    className: "jsx-e330f5047f16c9d3" + " " + "rounded border border-[var(--brand-orange)] bg-[#2f2f33] px-3 py-2 text-sm text-white hover:bg-[var(--brand-orange)] hover:text-black disabled:opacity-60",
                                                    children: sportsBusy ? "Sportscholen…" : "Sportscholen sync"
                                                }, void 0, false, {
                                                    fileName: "[project]/app/dashboard/admin/controle/page.tsx",
                                                    lineNumber: 569,
                                                    columnNumber: 19
                                                }, this),
                                                sportsMsg ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                    style: {
                                                        color: "var(--brand-orange)"
                                                    },
                                                    className: "jsx-e330f5047f16c9d3" + " " + "text-xs",
                                                    children: sportsMsg
                                                }, void 0, false, {
                                                    fileName: "[project]/app/dashboard/admin/controle/page.tsx",
                                                    lineNumber: 578,
                                                    columnNumber: 21
                                                }, this) : null
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/app/dashboard/admin/controle/page.tsx",
                                            lineNumber: 568,
                                            columnNumber: 17
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/app/dashboard/admin/controle/page.tsx",
                                    lineNumber: 521,
                                    columnNumber: 15
                                }, this)
                            }, void 0, false, {
                                fileName: "[project]/app/dashboard/admin/controle/page.tsx",
                                lineNumber: 514,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "jsx-e330f5047f16c9d3" + " " + "px-4 py-6 md:px-6",
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    style: silverBackplate,
                                    className: "jsx-e330f5047f16c9d3" + " " + "rounded-3xl border-2 border-zinc-500/60 p-4 shadow-[0_22px_60px_rgba(24,24,27,0.12)] ring-1 ring-white/50 md:p-5",
                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "jsx-e330f5047f16c9d3" + " " + "px-2 py-2 md:px-3",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "jsx-e330f5047f16c9d3" + " " + "mb-5 flex flex-wrap items-center justify-center gap-3",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(TabButton, {
                                                        active: activeTab === "controle",
                                                        label: "Controle overzicht",
                                                        count: controleCount,
                                                        onClick: ()=>setActiveTab("controle")
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/dashboard/admin/controle/page.tsx",
                                                        lineNumber: 593,
                                                        columnNumber: 21
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(TabButton, {
                                                        active: activeTab === "bondteam",
                                                        label: "Naar bondteam gestuurd",
                                                        count: bondteamCount,
                                                        onClick: ()=>setActiveTab("bondteam")
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/dashboard/admin/controle/page.tsx",
                                                        lineNumber: 599,
                                                        columnNumber: 21
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/app/dashboard/admin/controle/page.tsx",
                                                lineNumber: 592,
                                                columnNumber: 19
                                            }, this),
                                            !loading && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                style: {
                                                    background: "linear-gradient(180deg, rgba(255,255,255,0.94) 0%, rgba(239,242,246,0.98) 100%)",
                                                    borderColor: "rgba(90,90,95,0.22)",
                                                    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.9), 0 10px 24px rgba(0,0,0,0.08)"
                                                },
                                                className: "jsx-e330f5047f16c9d3" + " " + "rounded-[24px] border p-4 md:p-4",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        className: "jsx-e330f5047f16c9d3" + " " + "mb-3 flex flex-wrap items-center justify-between gap-3",
                                                        children: [
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                className: "jsx-e330f5047f16c9d3",
                                                                children: [
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                        className: "jsx-e330f5047f16c9d3" + " " + "text-sm font-bold uppercase tracking-[0.18em] text-zinc-700",
                                                                        children: "Filters"
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/app/dashboard/admin/controle/page.tsx",
                                                                        lineNumber: 620,
                                                                        columnNumber: 27
                                                                    }, this),
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                        className: "jsx-e330f5047f16c9d3" + " " + "mt-1 text-xs text-zinc-500",
                                                                        children: activeTab === "bondteam" ? "Overzicht van matchmakings die naar bondteam / officials zijn gestuurd" : "Filter op maand, bondteam, naam of status"
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/app/dashboard/admin/controle/page.tsx",
                                                                        lineNumber: 623,
                                                                        columnNumber: 27
                                                                    }, this)
                                                                ]
                                                            }, void 0, true, {
                                                                fileName: "[project]/app/dashboard/admin/controle/page.tsx",
                                                                lineNumber: 619,
                                                                columnNumber: 25
                                                            }, this),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                className: "jsx-e330f5047f16c9d3" + " " + "text-sm text-zinc-600",
                                                                children: [
                                                                    filteredRows.length,
                                                                    " van ",
                                                                    tabRows.length,
                                                                    " zichtbaar"
                                                                ]
                                                            }, void 0, true, {
                                                                fileName: "[project]/app/dashboard/admin/controle/page.tsx",
                                                                lineNumber: 630,
                                                                columnNumber: 25
                                                            }, this)
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/app/dashboard/admin/controle/page.tsx",
                                                        lineNumber: 618,
                                                        columnNumber: 23
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        className: "jsx-e330f5047f16c9d3" + " " + "grid grid-cols-1 gap-3 xl:grid-cols-[180px_180px_minmax(180px,1fr)_180px_180px]",
                                                        children: [
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                className: "jsx-e330f5047f16c9d3",
                                                                children: [
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                                        className: "jsx-e330f5047f16c9d3" + " " + "mb-1 block text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-600",
                                                                        children: "Maand"
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/app/dashboard/admin/controle/page.tsx",
                                                                        lineNumber: 637,
                                                                        columnNumber: 27
                                                                    }, this),
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("select", {
                                                                        value: filterMonth,
                                                                        onChange: (e)=>setFilterMonth(e.target.value),
                                                                        style: {
                                                                            borderColor: "rgba(63,63,70,0.22)",
                                                                            background: "#fff",
                                                                            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.95)"
                                                                        },
                                                                        className: "jsx-e330f5047f16c9d3" + " " + "h-10 w-full rounded-xl border px-3 text-sm outline-none",
                                                                        children: [
                                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                                                value: "",
                                                                                className: "jsx-e330f5047f16c9d3",
                                                                                children: "Alle maanden"
                                                                            }, void 0, false, {
                                                                                fileName: "[project]/app/dashboard/admin/controle/page.tsx",
                                                                                lineNumber: 650,
                                                                                columnNumber: 29
                                                                            }, this),
                                                                            monthOptions.map((monthKey)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                                                    value: monthKey,
                                                                                    className: "jsx-e330f5047f16c9d3",
                                                                                    children: formatMonthLabel(monthKey)
                                                                                }, monthKey, false, {
                                                                                    fileName: "[project]/app/dashboard/admin/controle/page.tsx",
                                                                                    lineNumber: 652,
                                                                                    columnNumber: 31
                                                                                }, this))
                                                                        ]
                                                                    }, void 0, true, {
                                                                        fileName: "[project]/app/dashboard/admin/controle/page.tsx",
                                                                        lineNumber: 640,
                                                                        columnNumber: 27
                                                                    }, this)
                                                                ]
                                                            }, void 0, true, {
                                                                fileName: "[project]/app/dashboard/admin/controle/page.tsx",
                                                                lineNumber: 636,
                                                                columnNumber: 25
                                                            }, this),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                className: "jsx-e330f5047f16c9d3",
                                                                children: [
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                                        className: "jsx-e330f5047f16c9d3" + " " + "mb-1 block text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-600",
                                                                        children: "Bondteam"
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/app/dashboard/admin/controle/page.tsx",
                                                                        lineNumber: 660,
                                                                        columnNumber: 27
                                                                    }, this),
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                                        value: filterBondteam,
                                                                        onChange: (e)=>setFilterBondteam(e.target.value),
                                                                        placeholder: "Zoek bondteam",
                                                                        style: {
                                                                            borderColor: "rgba(63,63,70,0.22)",
                                                                            background: "#fff",
                                                                            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.95)"
                                                                        },
                                                                        className: "jsx-e330f5047f16c9d3" + " " + "h-10 w-full rounded-xl border px-3 text-sm outline-none"
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/app/dashboard/admin/controle/page.tsx",
                                                                        lineNumber: 663,
                                                                        columnNumber: 27
                                                                    }, this)
                                                                ]
                                                            }, void 0, true, {
                                                                fileName: "[project]/app/dashboard/admin/controle/page.tsx",
                                                                lineNumber: 659,
                                                                columnNumber: 25
                                                            }, this),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                className: "jsx-e330f5047f16c9d3",
                                                                children: [
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                                        className: "jsx-e330f5047f16c9d3" + " " + "mb-1 block text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-600",
                                                                        children: "Naam"
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/app/dashboard/admin/controle/page.tsx",
                                                                        lineNumber: 677,
                                                                        columnNumber: 27
                                                                    }, this),
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                                        value: filterName,
                                                                        onChange: (e)=>setFilterName(e.target.value),
                                                                        placeholder: "Zoek evenement of matchmaker",
                                                                        style: {
                                                                            borderColor: "rgba(63,63,70,0.22)",
                                                                            background: "#fff",
                                                                            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.95)"
                                                                        },
                                                                        className: "jsx-e330f5047f16c9d3" + " " + "h-10 w-full rounded-xl border px-3 text-sm outline-none"
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/app/dashboard/admin/controle/page.tsx",
                                                                        lineNumber: 680,
                                                                        columnNumber: 27
                                                                    }, this)
                                                                ]
                                                            }, void 0, true, {
                                                                fileName: "[project]/app/dashboard/admin/controle/page.tsx",
                                                                lineNumber: 676,
                                                                columnNumber: 25
                                                            }, this),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                className: "jsx-e330f5047f16c9d3",
                                                                children: [
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                                        className: "jsx-e330f5047f16c9d3" + " " + "mb-1 block text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-600",
                                                                        children: "Status"
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/app/dashboard/admin/controle/page.tsx",
                                                                        lineNumber: 694,
                                                                        columnNumber: 27
                                                                    }, this),
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("select", {
                                                                        value: filterStatus,
                                                                        onChange: (e)=>setFilterStatus(e.target.value),
                                                                        style: {
                                                                            borderColor: "rgba(63,63,70,0.22)",
                                                                            background: "#fff",
                                                                            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.95)"
                                                                        },
                                                                        className: "jsx-e330f5047f16c9d3" + " " + "h-10 w-full rounded-xl border px-3 text-sm outline-none",
                                                                        children: [
                                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                                                value: "",
                                                                                className: "jsx-e330f5047f16c9d3",
                                                                                children: "Alle statussen"
                                                                            }, void 0, false, {
                                                                                fileName: "[project]/app/dashboard/admin/controle/page.tsx",
                                                                                lineNumber: 707,
                                                                                columnNumber: 29
                                                                            }, this),
                                                                            statusOptions.map((status)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                                                    value: status,
                                                                                    className: "jsx-e330f5047f16c9d3",
                                                                                    children: formatStatusLabel(status)
                                                                                }, status, false, {
                                                                                    fileName: "[project]/app/dashboard/admin/controle/page.tsx",
                                                                                    lineNumber: 709,
                                                                                    columnNumber: 31
                                                                                }, this))
                                                                        ]
                                                                    }, void 0, true, {
                                                                        fileName: "[project]/app/dashboard/admin/controle/page.tsx",
                                                                        lineNumber: 697,
                                                                        columnNumber: 27
                                                                    }, this)
                                                                ]
                                                            }, void 0, true, {
                                                                fileName: "[project]/app/dashboard/admin/controle/page.tsx",
                                                                lineNumber: 693,
                                                                columnNumber: 25
                                                            }, this),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                className: "jsx-e330f5047f16c9d3" + " " + "flex items-end",
                                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                                    onClick: resetFilters,
                                                                    disabled: !hasActiveFilters,
                                                                    style: {
                                                                        borderColor: hasActiveFilters ? "rgba(255,77,0,0.65)" : "rgba(63,63,70,0.22)"
                                                                    },
                                                                    className: "jsx-e330f5047f16c9d3" + " " + "h-10 w-full rounded-xl border bg-[#2f2f33] px-3 text-sm text-white hover:bg-white hover:text-black disabled:cursor-not-allowed disabled:opacity-50",
                                                                    children: "Filters wissen"
                                                                }, void 0, false, {
                                                                    fileName: "[project]/app/dashboard/admin/controle/page.tsx",
                                                                    lineNumber: 717,
                                                                    columnNumber: 27
                                                                }, this)
                                                            }, void 0, false, {
                                                                fileName: "[project]/app/dashboard/admin/controle/page.tsx",
                                                                lineNumber: 716,
                                                                columnNumber: 25
                                                            }, this)
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/app/dashboard/admin/controle/page.tsx",
                                                        lineNumber: 635,
                                                        columnNumber: 23
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/app/dashboard/admin/controle/page.tsx",
                                                lineNumber: 608,
                                                columnNumber: 21
                                            }, this),
                                            loading ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                className: "jsx-e330f5047f16c9d3" + " " + "mt-6 text-center text-gray-500",
                                                children: "Laden…"
                                            }, void 0, false, {
                                                fileName: "[project]/app/dashboard/admin/controle/page.tsx",
                                                lineNumber: 735,
                                                columnNumber: 21
                                            }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                style: {
                                                    border: "2px solid rgba(230,230,230,0.55)",
                                                    background: "linear-gradient(180deg, rgba(18,18,18,0.18) 0%, rgba(10,10,10,0.22) 100%)",
                                                    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.12)"
                                                },
                                                className: "jsx-e330f5047f16c9d3" + " " + "mt-5 overflow-hidden rounded-2xl",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        style: {
                                                            background: "rgba(255,77,0,0.75)"
                                                        },
                                                        className: "jsx-e330f5047f16c9d3" + " " + "h-[3px]"
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/dashboard/admin/controle/page.tsx",
                                                        lineNumber: 746,
                                                        columnNumber: 23
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        className: "jsx-e330f5047f16c9d3" + " " + "overflow-x-auto",
                                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("table", {
                                                            className: "jsx-e330f5047f16c9d3" + " " + "min-w-full border-collapse",
                                                            children: [
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("thead", {
                                                                    style: {
                                                                        background: "linear-gradient(180deg, #ff6a00 0%, #ff5400 100%)",
                                                                        color: "#fff",
                                                                        borderBottom: "2px solid rgba(255,255,255,0.35)"
                                                                    },
                                                                    className: "jsx-e330f5047f16c9d3",
                                                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("tr", {
                                                                        className: "jsx-e330f5047f16c9d3",
                                                                        children: [
                                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                                                className: "jsx-e330f5047f16c9d3" + " " + "px-4 py-3 text-left",
                                                                                children: "Datum"
                                                                            }, void 0, false, {
                                                                                fileName: "[project]/app/dashboard/admin/controle/page.tsx",
                                                                                lineNumber: 762,
                                                                                columnNumber: 31
                                                                            }, this),
                                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                                                className: "jsx-e330f5047f16c9d3" + " " + "px-4 py-3 text-left",
                                                                                children: "Evenement"
                                                                            }, void 0, false, {
                                                                                fileName: "[project]/app/dashboard/admin/controle/page.tsx",
                                                                                lineNumber: 763,
                                                                                columnNumber: 31
                                                                            }, this),
                                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                                                className: "jsx-e330f5047f16c9d3" + " " + "px-4 py-3 text-left",
                                                                                children: "Locatie"
                                                                            }, void 0, false, {
                                                                                fileName: "[project]/app/dashboard/admin/controle/page.tsx",
                                                                                lineNumber: 764,
                                                                                columnNumber: 31
                                                                            }, this),
                                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                                                className: "jsx-e330f5047f16c9d3" + " " + "px-4 py-3 text-left",
                                                                                children: "Matchmaker"
                                                                            }, void 0, false, {
                                                                                fileName: "[project]/app/dashboard/admin/controle/page.tsx",
                                                                                lineNumber: 765,
                                                                                columnNumber: 31
                                                                            }, this),
                                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                                                className: "jsx-e330f5047f16c9d3" + " " + "px-4 py-3 text-left",
                                                                                children: "Promotor"
                                                                            }, void 0, false, {
                                                                                fileName: "[project]/app/dashboard/admin/controle/page.tsx",
                                                                                lineNumber: 766,
                                                                                columnNumber: 31
                                                                            }, this),
                                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                                                className: "jsx-e330f5047f16c9d3" + " " + "px-4 py-3 text-left",
                                                                                children: "Bondteam"
                                                                            }, void 0, false, {
                                                                                fileName: "[project]/app/dashboard/admin/controle/page.tsx",
                                                                                lineNumber: 767,
                                                                                columnNumber: 31
                                                                            }, this),
                                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                                                className: "jsx-e330f5047f16c9d3" + " " + "px-4 py-3 text-left",
                                                                                children: "Status"
                                                                            }, void 0, false, {
                                                                                fileName: "[project]/app/dashboard/admin/controle/page.tsx",
                                                                                lineNumber: 768,
                                                                                columnNumber: 31
                                                                            }, this),
                                                                            activeTab === "bondteam" ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                                                className: "jsx-e330f5047f16c9d3" + " " + "px-4 py-3 text-left",
                                                                                children: "Doorgestuurd"
                                                                            }, void 0, false, {
                                                                                fileName: "[project]/app/dashboard/admin/controle/page.tsx",
                                                                                lineNumber: 770,
                                                                                columnNumber: 33
                                                                            }, this) : null,
                                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                                                className: "jsx-e330f5047f16c9d3" + " " + "px-4 py-3 text-left",
                                                                                children: "Acties"
                                                                            }, void 0, false, {
                                                                                fileName: "[project]/app/dashboard/admin/controle/page.tsx",
                                                                                lineNumber: 772,
                                                                                columnNumber: 31
                                                                            }, this)
                                                                        ]
                                                                    }, void 0, true, {
                                                                        fileName: "[project]/app/dashboard/admin/controle/page.tsx",
                                                                        lineNumber: 761,
                                                                        columnNumber: 29
                                                                    }, this)
                                                                }, void 0, false, {
                                                                    fileName: "[project]/app/dashboard/admin/controle/page.tsx",
                                                                    lineNumber: 753,
                                                                    columnNumber: 27
                                                                }, this),
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("tbody", {
                                                                    className: "jsx-e330f5047f16c9d3",
                                                                    children: filteredRows.length === 0 ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("tr", {
                                                                        className: "jsx-e330f5047f16c9d3",
                                                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                                            colSpan: activeTab === "bondteam" ? 9 : 8,
                                                                            style: {
                                                                                background: "#ffffff",
                                                                                color: "#555"
                                                                            },
                                                                            className: "jsx-e330f5047f16c9d3" + " " + "px-4 py-8 text-center text-sm",
                                                                            children: activeTab === "bondteam" ? "Geen naar bondteam gestuurde matchmakings gevonden." : "Geen matchmakings gevonden met deze filters."
                                                                        }, void 0, false, {
                                                                            fileName: "[project]/app/dashboard/admin/controle/page.tsx",
                                                                            lineNumber: 779,
                                                                            columnNumber: 33
                                                                        }, this)
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/app/dashboard/admin/controle/page.tsx",
                                                                        lineNumber: 778,
                                                                        columnNumber: 31
                                                                    }, this) : filteredRows.map((r, i)=>{
                                                                        const zebra = i % 2 === 0;
                                                                        const run = r.laatste_run;
                                                                        const hasMatchmaking = !!r.matchmaking_id;
                                                                        const canView = hasMatchmaking;
                                                                        const isEditing = editId === r.id;
                                                                        const mmId = r.matchmaking_id ?? "";
                                                                        const rowBusy = busyId === mmId;
                                                                        const rowEditBusy = savingEditId === r.id;
                                                                        const rowSnapshotBusy = snapshotSavingId === r.id;
                                                                        const rowMsg = rowMsgById[r.id] ?? "";
                                                                        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("tr", {
                                                                            style: {
                                                                                backgroundColor: zebra ? "#ffffff" : "#0d0d0d",
                                                                                color: zebra ? "#000" : "#fff"
                                                                            },
                                                                            className: "jsx-e330f5047f16c9d3",
                                                                            children: [
                                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                                                    className: "jsx-e330f5047f16c9d3" + " " + "px-4 py-3",
                                                                                    children: formatDate(r.evenement_datum)
                                                                                }, void 0, false, {
                                                                                    fileName: "[project]/app/dashboard/admin/controle/page.tsx",
                                                                                    lineNumber: 810,
                                                                                    columnNumber: 37
                                                                                }, this),
                                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                                                    className: "jsx-e330f5047f16c9d3" + " " + "px-4 py-3 font-semibold",
                                                                                    children: r.evenement_naam ?? "-"
                                                                                }, void 0, false, {
                                                                                    fileName: "[project]/app/dashboard/admin/controle/page.tsx",
                                                                                    lineNumber: 813,
                                                                                    columnNumber: 37
                                                                                }, this),
                                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                                                    className: "jsx-e330f5047f16c9d3" + " " + "px-4 py-3",
                                                                                    children: r.locatie ?? "-"
                                                                                }, void 0, false, {
                                                                                    fileName: "[project]/app/dashboard/admin/controle/page.tsx",
                                                                                    lineNumber: 816,
                                                                                    columnNumber: 37
                                                                                }, this),
                                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                                                    className: "jsx-e330f5047f16c9d3" + " " + "px-4 py-3",
                                                                                    children: isEditing ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                                                        value: editMatchmaker,
                                                                                        onChange: (e)=>setEditMatchmaker(e.target.value),
                                                                                        placeholder: "Matchmaker *",
                                                                                        className: "jsx-e330f5047f16c9d3" + " " + "orange-input h-9 w-full"
                                                                                    }, void 0, false, {
                                                                                        fileName: "[project]/app/dashboard/admin/controle/page.tsx",
                                                                                        lineNumber: 820,
                                                                                        columnNumber: 41
                                                                                    }, this) : r.matchmaker ?? "-"
                                                                                }, void 0, false, {
                                                                                    fileName: "[project]/app/dashboard/admin/controle/page.tsx",
                                                                                    lineNumber: 818,
                                                                                    columnNumber: 37
                                                                                }, this),
                                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                                                    className: "jsx-e330f5047f16c9d3" + " " + "px-4 py-3",
                                                                                    children: isEditing ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                                                        value: editPromotor,
                                                                                        onChange: (e)=>setEditPromotor(e.target.value),
                                                                                        placeholder: "Promotor (optioneel)",
                                                                                        className: "jsx-e330f5047f16c9d3" + " " + "orange-input h-9 w-full"
                                                                                    }, void 0, false, {
                                                                                        fileName: "[project]/app/dashboard/admin/controle/page.tsx",
                                                                                        lineNumber: 835,
                                                                                        columnNumber: 41
                                                                                    }, this) : r.promotor ?? "-"
                                                                                }, void 0, false, {
                                                                                    fileName: "[project]/app/dashboard/admin/controle/page.tsx",
                                                                                    lineNumber: 833,
                                                                                    columnNumber: 37
                                                                                }, this),
                                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                                                    className: "jsx-e330f5047f16c9d3" + " " + "px-4 py-3",
                                                                                    children: isEditing ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                                                        value: editBondteam,
                                                                                        onChange: (e)=>setEditBondteam(e.target.value),
                                                                                        placeholder: "Bondteam (optioneel)",
                                                                                        className: "jsx-e330f5047f16c9d3" + " " + "orange-input h-9 w-full"
                                                                                    }, void 0, false, {
                                                                                        fileName: "[project]/app/dashboard/admin/controle/page.tsx",
                                                                                        lineNumber: 850,
                                                                                        columnNumber: 41
                                                                                    }, this) : r.bondteam ?? "-"
                                                                                }, void 0, false, {
                                                                                    fileName: "[project]/app/dashboard/admin/controle/page.tsx",
                                                                                    lineNumber: 848,
                                                                                    columnNumber: 37
                                                                                }, this),
                                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                                                    className: "jsx-e330f5047f16c9d3" + " " + "px-4 py-3 italic",
                                                                                    children: formatStatusLabel(run?.status)
                                                                                }, void 0, false, {
                                                                                    fileName: "[project]/app/dashboard/admin/controle/page.tsx",
                                                                                    lineNumber: 863,
                                                                                    columnNumber: 37
                                                                                }, this),
                                                                                activeTab === "bondteam" ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                                                    className: "jsx-e330f5047f16c9d3" + " " + "px-4 py-3 text-sm",
                                                                                    children: formatDateTime(r.official_released_at)
                                                                                }, void 0, false, {
                                                                                    fileName: "[project]/app/dashboard/admin/controle/page.tsx",
                                                                                    lineNumber: 868,
                                                                                    columnNumber: 39
                                                                                }, this) : null,
                                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                                                    className: "jsx-e330f5047f16c9d3" + " " + "px-4 py-3",
                                                                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                                        className: "jsx-e330f5047f16c9d3" + " " + "flex flex-wrap items-center gap-3",
                                                                                        children: [
                                                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"], {
                                                                                                href: hasMatchmaking ? `/dashboard/admin/controle/${r.matchmaking_id}` : "#",
                                                                                                className: [
                                                                                                    "rounded border px-3 py-1 text-sm",
                                                                                                    canView ? "bg-[#2f2f33] border-[var(--brand-orange)] text-white hover:bg-[var(--brand-orange)] hover:text-black" : "pointer-events-none cursor-not-allowed bg-zinc-200 text-zinc-400 border-zinc-300"
                                                                                                ].join(" "),
                                                                                                "aria-disabled": !canView,
                                                                                                tabIndex: canView ? 0 : -1,
                                                                                                children: "Matchmaking"
                                                                                            }, void 0, false, {
                                                                                                fileName: "[project]/app/dashboard/admin/controle/page.tsx",
                                                                                                lineNumber: 875,
                                                                                                columnNumber: 41
                                                                                            }, this),
                                                                                            activeTab === "controle" && hasMatchmaking && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                                                                onClick: ()=>startControle(r.matchmaking_id),
                                                                                                disabled: rowBusy || isBusy || rowEditBusy || rowSnapshotBusy,
                                                                                                title: "Start volledige controle: scrape + build + enrich + rules (nieuwe run)",
                                                                                                className: "jsx-e330f5047f16c9d3" + " " + "rounded border border-[var(--brand-orange)] bg-[#2f2f33] px-3 py-1 text-sm text-white hover:bg-[var(--brand-orange)] hover:text-black disabled:opacity-60",
                                                                                                children: rowBusy ? "Bezig…" : "Start controle"
                                                                                            }, void 0, false, {
                                                                                                fileName: "[project]/app/dashboard/admin/controle/page.tsx",
                                                                                                lineNumber: 894,
                                                                                                columnNumber: 43
                                                                                            }, this),
                                                                                            !isEditing ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                                                                onClick: ()=>openEdit(r),
                                                                                                disabled: rowBusy || rowEditBusy || rowSnapshotBusy,
                                                                                                className: "jsx-e330f5047f16c9d3" + " " + "rounded border border-zinc-300 bg-[#2f2f33] px-3 py-1 text-sm text-white hover:bg-white hover:text-black disabled:opacity-60",
                                                                                                children: "Bewerken"
                                                                                            }, void 0, false, {
                                                                                                fileName: "[project]/app/dashboard/admin/controle/page.tsx",
                                                                                                lineNumber: 912,
                                                                                                columnNumber: 43
                                                                                            }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Fragment"], {
                                                                                                children: [
                                                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                                                                        onClick: ()=>saveEdit(r.id),
                                                                                                        disabled: rowBusy || rowEditBusy || rowSnapshotBusy || isBusy,
                                                                                                        className: "jsx-e330f5047f16c9d3" + " " + "rounded border border-[var(--brand-orange)] bg-[#2f2f33] px-3 py-1 text-sm text-white hover:bg-[var(--brand-orange)] hover:text-black disabled:opacity-60",
                                                                                                        children: rowEditBusy ? "Opslaan…" : "Bewerking opslaan"
                                                                                                    }, void 0, false, {
                                                                                                        fileName: "[project]/app/dashboard/admin/controle/page.tsx",
                                                                                                        lineNumber: 925,
                                                                                                        columnNumber: 45
                                                                                                    }, this),
                                                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                                                                        onClick: closeEdit,
                                                                                                        disabled: rowEditBusy || rowSnapshotBusy,
                                                                                                        className: "jsx-e330f5047f16c9d3" + " " + "rounded border border-zinc-300 bg-[#2f2f33] px-3 py-1 text-sm text-white hover:bg-white hover:text-black disabled:opacity-60",
                                                                                                        children: "Annuleren"
                                                                                                    }, void 0, false, {
                                                                                                        fileName: "[project]/app/dashboard/admin/controle/page.tsx",
                                                                                                        lineNumber: 937,
                                                                                                        columnNumber: 45
                                                                                                    }, this)
                                                                                                ]
                                                                                            }, void 0, true),
                                                                                            activeTab === "bondteam" && hasMatchmaking && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                                                                onClick: ()=>saveSnapshot(r),
                                                                                                disabled: rowBusy || rowEditBusy || rowSnapshotBusy || isBusy,
                                                                                                title: "Sla deze matchmaking op in admin beheer snapshots",
                                                                                                className: "jsx-e330f5047f16c9d3" + " " + "rounded border border-emerald-600 bg-[#2f2f33] px-3 py-1 text-sm text-emerald-100 hover:bg-emerald-600 hover:text-white disabled:opacity-60",
                                                                                                children: rowSnapshotBusy ? "Bezig…" : "Opslaan"
                                                                                            }, void 0, false, {
                                                                                                fileName: "[project]/app/dashboard/admin/controle/page.tsx",
                                                                                                lineNumber: 948,
                                                                                                columnNumber: 43
                                                                                            }, this),
                                                                                            hasMatchmaking && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                                                                onClick: ()=>deleteMatchmaking(r.matchmaking_id),
                                                                                                disabled: rowBusy || isBusy || rowEditBusy || rowSnapshotBusy,
                                                                                                title: "Verwijdert uploads, bouts, uitslagen_raw en alle controle-data voor deze matchmaking",
                                                                                                className: "jsx-e330f5047f16c9d3" + " " + "rounded border border-red-600 bg-[#2f2f33] px-3 py-1 text-sm text-red-200 hover:bg-red-600 hover:text-white disabled:opacity-60",
                                                                                                children: rowBusy ? "Bezig…" : "Verwijderen"
                                                                                            }, void 0, false, {
                                                                                                fileName: "[project]/app/dashboard/admin/controle/page.tsx",
                                                                                                lineNumber: 964,
                                                                                                columnNumber: 43
                                                                                            }, this),
                                                                                            rowMsg ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                                                style: {
                                                                                                    color: rowMsg.startsWith("✅") ? zebra ? "#0a7a2f" : "#8dffb0" : rowMsg.startsWith("⚠️") ? zebra ? "#9a5a00" : "#ffd58f" : zebra ? "var(--brand-orange)" : "#ffb38a"
                                                                                                },
                                                                                                className: "jsx-e330f5047f16c9d3" + " " + "text-xs",
                                                                                                children: rowMsg
                                                                                            }, void 0, false, {
                                                                                                fileName: "[project]/app/dashboard/admin/controle/page.tsx",
                                                                                                lineNumber: 982,
                                                                                                columnNumber: 43
                                                                                            }, this) : null
                                                                                        ]
                                                                                    }, void 0, true, {
                                                                                        fileName: "[project]/app/dashboard/admin/controle/page.tsx",
                                                                                        lineNumber: 874,
                                                                                        columnNumber: 39
                                                                                    }, this)
                                                                                }, void 0, false, {
                                                                                    fileName: "[project]/app/dashboard/admin/controle/page.tsx",
                                                                                    lineNumber: 873,
                                                                                    columnNumber: 37
                                                                                }, this)
                                                                            ]
                                                                        }, r.id, true, {
                                                                            fileName: "[project]/app/dashboard/admin/controle/page.tsx",
                                                                            lineNumber: 803,
                                                                            columnNumber: 35
                                                                        }, this);
                                                                    })
                                                                }, void 0, false, {
                                                                    fileName: "[project]/app/dashboard/admin/controle/page.tsx",
                                                                    lineNumber: 776,
                                                                    columnNumber: 27
                                                                }, this)
                                                            ]
                                                        }, void 0, true, {
                                                            fileName: "[project]/app/dashboard/admin/controle/page.tsx",
                                                            lineNumber: 752,
                                                            columnNumber: 25
                                                        }, this)
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/dashboard/admin/controle/page.tsx",
                                                        lineNumber: 751,
                                                        columnNumber: 23
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/app/dashboard/admin/controle/page.tsx",
                                                lineNumber: 737,
                                                columnNumber: 21
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                className: "jsx-e330f5047f16c9d3" + " " + "mt-7 text-center text-xs text-zinc-500",
                                                children: "© FightSupport"
                                            }, void 0, false, {
                                                fileName: "[project]/app/dashboard/admin/controle/page.tsx",
                                                lineNumber: 1013,
                                                columnNumber: 19
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/app/dashboard/admin/controle/page.tsx",
                                        lineNumber: 591,
                                        columnNumber: 17
                                    }, this)
                                }, void 0, false, {
                                    fileName: "[project]/app/dashboard/admin/controle/page.tsx",
                                    lineNumber: 587,
                                    columnNumber: 15
                                }, this)
                            }, void 0, false, {
                                fileName: "[project]/app/dashboard/admin/controle/page.tsx",
                                lineNumber: 586,
                                columnNumber: 13
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/app/dashboard/admin/controle/page.tsx",
                        lineNumber: 506,
                        columnNumber: 11
                    }, this)
                }, void 0, false, {
                    fileName: "[project]/app/dashboard/admin/controle/page.tsx",
                    lineNumber: 495,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$styled$2d$jsx$2f$style$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"], {
                    id: "e330f5047f16c9d3",
                    children: `:root{--brand-orange:${NVB_ORANGE}}.orange-input{color:#111;background:#ffffffe6;border:1px solid #ff4d0059;border-radius:10px;outline:none;padding:0 10px}.orange-input:focus{border-color:#ff4d00bf;box-shadow:0 0 0 3px #ff4d002e}`
                }, void 0, false, void 0, this)
            ]
        }, void 0, true, {
            fileName: "[project]/app/dashboard/admin/controle/page.tsx",
            lineNumber: 494,
            columnNumber: 7
        }, this)
    }, void 0, false, {
        fileName: "[project]/app/dashboard/admin/controle/page.tsx",
        lineNumber: 493,
        columnNumber: 5
    }, this);
}
}),
];

//# sourceMappingURL=_521a623c._.js.map