(globalThis.TURBOPACK || (globalThis.TURBOPACK = [])).push([typeof document === "object" ? document.currentScript : undefined,
"[project]/lib/api/authedFetch.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "authedFetch",
    ()=>authedFetch
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabaseClient$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/supabaseClient.ts [app-client] (ecmascript)");
"use client";
;
async function authedFetch(input, init = {}) {
    const { data } = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabaseClient$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["supabase"].auth.getSession();
    const token = data?.session?.access_token ?? null;
    const headers = new Headers(init.headers || {});
    if (token) headers.set("Authorization", `Bearer ${token}`);
    return fetch(input, {
        ...init,
        headers
    });
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/components/NvbLightButton.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>NvbLightButton
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
"use client";
;
function NvbLightButton({ label, onClick, disabled = false, className = "", fullWidth = true }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
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
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
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
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
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
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
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
_c = NvbLightButton;
var _c;
__turbopack_context__.k.register(_c, "NvbLightButton");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/components/NvbDarkButton.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>NvbDarkButton
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
"use client";
;
function NvbDarkButton({ label, onClick, disabled = false, className = "", fullWidth = true }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
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
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
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
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
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
_c = NvbDarkButton;
var _c;
__turbopack_context__.k.register(_c, "NvbDarkButton");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/app/dashboard/officials/controle/page.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>ControleOverzichtPage
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$styled$2d$jsx$2f$style$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/styled-jsx/style.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/client/app-dir/link.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$image$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/image.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$api$2f$authedFetch$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/api/authedFetch.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$NvbLightButton$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/NvbLightButton.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$NvbDarkButton$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/NvbDarkButton.tsx [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
"use client";
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
function Small({ children, origin = "left center" }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        style: {
            transform: "scale(0.85)",
            transformOrigin: origin
        },
        children: children
    }, void 0, false, {
        fileName: "[project]/app/dashboard/officials/controle/page.tsx",
        lineNumber: 77,
        columnNumber: 5
    }, this);
}
_c = Small;
function getQueueStatusLabel(job, run) {
    if (job?.status === "queued") return "in wachtrij";
    if (job?.status === "running") return "bezig";
    if (job?.status === "failed") return "mislukt";
    if (job?.status === "done") return "doorgestuurd";
    if (run?.status === "klaar") return "klaar";
    if (run?.status === "failed") return "failed";
    if (run?.status) return run.status;
    return "nieuw";
}
function getQueueStatusStyle(job, run) {
    const label = getQueueStatusLabel(job, run);
    if (label === "in wachtrij") {
        return {
            background: "rgba(255, 193, 7, 0.16)",
            color: "#7a5400",
            border: "1px solid rgba(255, 193, 7, 0.45)"
        };
    }
    if (label === "bezig") {
        return {
            background: "rgba(255, 77, 0, 0.14)",
            color: "#b63b00",
            border: "1px solid rgba(255, 77, 0, 0.45)"
        };
    }
    if (label === "klaar" || label === "doorgestuurd") {
        return {
            background: "rgba(34, 197, 94, 0.14)",
            color: "#166534",
            border: "1px solid rgba(34, 197, 94, 0.45)"
        };
    }
    if (label === "mislukt" || label === "failed") {
        return {
            background: "rgba(220, 38, 38, 0.14)",
            color: "#991b1b",
            border: "1px solid rgba(220, 38, 38, 0.45)"
        };
    }
    return {
        background: "rgba(120,120,120,0.12)",
        color: "#444",
        border: "1px solid rgba(120,120,120,0.28)"
    };
}
function ControleOverzichtPage() {
    _s();
    const [rows, setRows] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])([]);
    const [loading, setLoading] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(true);
    const [sportsBusy, setSportsBusy] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [sportsMsg, setSportsMsg] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])("");
    const [errorMsg, setErrorMsg] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])("");
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "ControleOverzichtPage.useEffect": ()=>{
            void load();
            const t = setInterval({
                "ControleOverzichtPage.useEffect.t": ()=>{
                    void load(false);
                }
            }["ControleOverzichtPage.useEffect.t"], 5000);
            return ({
                "ControleOverzichtPage.useEffect": ()=>clearInterval(t)
            })["ControleOverzichtPage.useEffect"];
        }
    }["ControleOverzichtPage.useEffect"], []);
    async function load(showLoader = true) {
        if (showLoader) setLoading(true);
        setErrorMsg("");
        setSportsMsg("");
        try {
            const res = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$api$2f$authedFetch$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["authedFetch"])("/api/officials/released-matchmakings", {
                method: "GET"
            });
            const json = await res.json().catch(()=>({}));
            if (!res.ok) {
                throw new Error(json?.error ?? "Laden official overzicht mislukt. Controleer de route of permissies.");
            }
            setRows(Array.isArray(json?.rows) ? json.rows : []);
        } catch (e) {
            console.error("Fout bij laden official overzicht:", e);
            setRows([]);
            setErrorMsg(e?.message ?? "Laden official overzicht mislukt. Controleer route / rechten / API-response.");
        } finally{
            setLoading(false);
        }
    }
    async function runSportscholen() {
        try {
            setSportsMsg("");
            setSportsBusy(true);
            const res = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$api$2f$authedFetch$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["authedFetch"])("/api/sportscholen/sync", {
                method: "POST"
            });
            const json = await res.json().catch(()=>({}));
            if (!res.ok) {
                setSportsMsg(`❌ ${json?.error ?? "Sync mislukt."}`);
                return;
            }
            setSportsMsg(json?.message ?? "✅ Sportscholen gesynchroniseerd.");
        } catch (e) {
            console.error(e);
            setSportsMsg(`❌ ${e?.message ?? "Sync mislukt (onverwachte fout)."}`);
        } finally{
            setSportsBusy(false);
        }
    }
    const visibleRows = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useMemo"])({
        "ControleOverzichtPage.useMemo[visibleRows]": ()=>{
            return [
                ...rows
            ].sort({
                "ControleOverzichtPage.useMemo[visibleRows]": (a, b)=>{
                    const aTime = new Date(a.official_released_at ?? a.uploaded_at ?? 0).getTime();
                    const bTime = new Date(b.official_released_at ?? b.uploaded_at ?? 0).getTime();
                    return bTime - aTime;
                }
            }["ControleOverzichtPage.useMemo[visibleRows]"]);
        }
    }["ControleOverzichtPage.useMemo[visibleRows]"], [
        rows
    ]);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("main", {
        className: "min-h-screen px-4 py-6",
        style: {
            background: "#eef0f3"
        },
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "mx-auto w-full max-w-[1500px]",
            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "rounded-[32px] p-[6px]",
                style: {
                    background: "linear-gradient(180deg, #f8f8f8 0%, #d8d8d8 22%, #8f8f8f 55%, #f0f0f0 100%)",
                    boxShadow: `
              0 0 0 1px rgba(255,255,255,0.7),
              0 22px 70px rgba(0,0,0,0.9)
            `
                },
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    style: {
                        background: "linear-gradient(180deg, #f8fafc 0%, #eef2f7 100%)",
                        border: "3px solid rgba(63,63,70,0.35)",
                        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.9)"
                    },
                    className: "jsx-418cd238f8a22fbc" + " " + "relative rounded-[28px] overflow-hidden",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            style: {
                                background: "linear-gradient(180deg, #3a3a3f 0%, #2a2a2e 100%)",
                                borderBottom: `3px solid rgba(255,77,0,0.55)`
                            },
                            className: "jsx-418cd238f8a22fbc" + " " + "px-6 py-5",
                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "jsx-418cd238f8a22fbc" + " " + "grid grid-cols-3 items-center gap-4",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "jsx-418cd238f8a22fbc" + " " + "justify-self-start leading-tight",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                style: {
                                                    fontSize: 14,
                                                    letterSpacing: "0.22em",
                                                    textTransform: "uppercase",
                                                    background: "linear-gradient(180deg, rgba(255,255,255,0.95) 0%, rgba(230,230,230,0.75) 35%, rgba(150,150,150,0.55) 100%)",
                                                    WebkitBackgroundClip: "text",
                                                    WebkitTextFillColor: "transparent",
                                                    textShadow: "0 10px 26px rgba(0,0,0,0.35)"
                                                },
                                                className: "jsx-418cd238f8a22fbc" + " " + "font-extrabold tracking-[0.20em]",
                                                children: "FIGHTSUPPORT"
                                            }, void 0, false, {
                                                fileName: "[project]/app/dashboard/officials/controle/page.tsx",
                                                lineNumber: 253,
                                                columnNumber: 19
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "jsx-418cd238f8a22fbc" + " " + "text-xs text-white/70",
                                                children: "Vechtsport ondersteuning"
                                            }, void 0, false, {
                                                fileName: "[project]/app/dashboard/officials/controle/page.tsx",
                                                lineNumber: 268,
                                                columnNumber: 19
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "jsx-418cd238f8a22fbc" + " " + "mt-3 flex flex-wrap gap-2 items-center",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(Small, {
                                                        origin: "left center",
                                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$NvbLightButton$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                                                            label: "← Terug naar Menu",
                                                            onClick: ()=>{
                                                                window.location.href = "/dashboard/officials";
                                                            }
                                                        }, void 0, false, {
                                                            fileName: "[project]/app/dashboard/officials/controle/page.tsx",
                                                            lineNumber: 272,
                                                            columnNumber: 23
                                                        }, this)
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/dashboard/officials/controle/page.tsx",
                                                        lineNumber: 271,
                                                        columnNumber: 21
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(Small, {
                                                        origin: "left center",
                                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$NvbDarkButton$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                                                            label: "Ververs",
                                                            onClick: ()=>{
                                                                void load(true);
                                                            }
                                                        }, void 0, false, {
                                                            fileName: "[project]/app/dashboard/officials/controle/page.tsx",
                                                            lineNumber: 281,
                                                            columnNumber: 23
                                                        }, this)
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/dashboard/officials/controle/page.tsx",
                                                        lineNumber: 280,
                                                        columnNumber: 21
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/app/dashboard/officials/controle/page.tsx",
                                                lineNumber: 270,
                                                columnNumber: 19
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/app/dashboard/officials/controle/page.tsx",
                                        lineNumber: 252,
                                        columnNumber: 17
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "jsx-418cd238f8a22fbc" + " " + "justify-self-center",
                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            style: {
                                                background: "linear-gradient(180deg, #f5f5f5 0%, #cfcfcf 35%, #8f8f8f 65%, #f0f0f0 100%)",
                                                boxShadow: `
                        0 0 0 1px rgba(255,255,255,0.70),
                        0 12px 28px rgba(0,0,0,0.70)
                      `
                                            },
                                            className: "jsx-418cd238f8a22fbc" + " " + "rounded-[28px] p-[6px]",
                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                style: {
                                                    background: "linear-gradient(180deg, rgba(12,12,12,0.96), rgba(4,4,4,0.96))",
                                                    border: "3px solid rgba(220,220,220,0.50)",
                                                    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.10)"
                                                },
                                                className: "jsx-418cd238f8a22fbc" + " " + "rounded-[22px] p-3",
                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$image$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                                                    src: "/branding/fightsupport/excel-logo.png",
                                                    alt: "FightSupport",
                                                    width: 650,
                                                    height: 200,
                                                    priority: true
                                                }, void 0, false, {
                                                    fileName: "[project]/app/dashboard/officials/controle/page.tsx",
                                                    lineNumber: 312,
                                                    columnNumber: 23
                                                }, this)
                                            }, void 0, false, {
                                                fileName: "[project]/app/dashboard/officials/controle/page.tsx",
                                                lineNumber: 303,
                                                columnNumber: 21
                                            }, this)
                                        }, void 0, false, {
                                            fileName: "[project]/app/dashboard/officials/controle/page.tsx",
                                            lineNumber: 292,
                                            columnNumber: 19
                                        }, this)
                                    }, void 0, false, {
                                        fileName: "[project]/app/dashboard/officials/controle/page.tsx",
                                        lineNumber: 291,
                                        columnNumber: 17
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "jsx-418cd238f8a22fbc" + " " + "justify-self-end flex flex-col items-end gap-2",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                onClick: runSportscholen,
                                                disabled: sportsBusy,
                                                title: "Update sportscholen tabel (keurmerk data)",
                                                className: "jsx-418cd238f8a22fbc" + " " + "px-3 py-2 text-sm bg-[#2f2f33] border border-[var(--brand-orange)] text-white rounded hover:bg-[var(--brand-orange)] hover:text-black disabled:opacity-60",
                                                children: sportsBusy ? "Sportscholen…" : "Sportscholen sync"
                                            }, void 0, false, {
                                                fileName: "[project]/app/dashboard/officials/controle/page.tsx",
                                                lineNumber: 324,
                                                columnNumber: 19
                                            }, this),
                                            sportsMsg ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                style: {
                                                    color: "var(--brand-orange)"
                                                },
                                                className: "jsx-418cd238f8a22fbc" + " " + "text-xs",
                                                children: sportsMsg
                                            }, void 0, false, {
                                                fileName: "[project]/app/dashboard/officials/controle/page.tsx",
                                                lineNumber: 334,
                                                columnNumber: 21
                                            }, this) : null
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/app/dashboard/officials/controle/page.tsx",
                                        lineNumber: 323,
                                        columnNumber: 17
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/app/dashboard/officials/controle/page.tsx",
                                lineNumber: 251,
                                columnNumber: 15
                            }, this)
                        }, void 0, false, {
                            fileName: "[project]/app/dashboard/officials/controle/page.tsx",
                            lineNumber: 244,
                            columnNumber: 13
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "jsx-418cd238f8a22fbc" + " " + "px-4 md:px-6 py-6",
                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                style: silverBackplate,
                                className: "jsx-418cd238f8a22fbc" + " " + "rounded-3xl border-2 border-zinc-500/60 p-4 md:p-5 shadow-[0_22px_60px_rgba(24,24,27,0.12)] ring-1 ring-white/50",
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "jsx-418cd238f8a22fbc" + " " + "px-2 md:px-3 py-2",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "jsx-418cd238f8a22fbc" + " " + "mt-2 text-center",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h1", {
                                                    style: {
                                                        backgroundImage: `linear-gradient(180deg, #ff7a1a 0%, ${NVB_ORANGE} 45%, #c92c00 100%)`,
                                                        WebkitBackgroundClip: "text",
                                                        backgroundClip: "text",
                                                        color: "transparent",
                                                        textShadow: `
                          0 2px 0 rgba(255,255,255,0.35),
                          0 8px 22px rgba(0,0,0,0.35)
                        `
                                                    },
                                                    className: "jsx-418cd238f8a22fbc" + " " + "text-4xl md:text-5xl font-extrabold tracking-wide",
                                                    children: "Controle Overzicht"
                                                }, void 0, false, {
                                                    fileName: "[project]/app/dashboard/officials/controle/page.tsx",
                                                    lineNumber: 349,
                                                    columnNumber: 21
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    style: {
                                                        width: 200,
                                                        height: 4,
                                                        borderRadius: 999,
                                                        background: `linear-gradient(90deg, ${NVB_ORANGE} 0%, #ff7a1a 50%, ${NVB_ORANGE} 100%)`,
                                                        boxShadow: "0 0 16px rgba(255,77,0,0.65)"
                                                    },
                                                    className: "jsx-418cd238f8a22fbc" + " " + "mx-auto mt-4 mb-3"
                                                }, void 0, false, {
                                                    fileName: "[project]/app/dashboard/officials/controle/page.tsx",
                                                    lineNumber: 365,
                                                    columnNumber: 21
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                    className: "jsx-418cd238f8a22fbc" + " " + "mt-2 text-sm md:text-base text-zinc-700",
                                                    children: "Doorgestuurde matchmakings voor officials"
                                                }, void 0, false, {
                                                    fileName: "[project]/app/dashboard/officials/controle/page.tsx",
                                                    lineNumber: 376,
                                                    columnNumber: 21
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/app/dashboard/officials/controle/page.tsx",
                                            lineNumber: 348,
                                            columnNumber: 19
                                        }, this),
                                        errorMsg ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            style: {
                                                background: "rgba(220,38,38,0.10)",
                                                color: "#991b1b",
                                                borderColor: "rgba(220,38,38,0.28)"
                                            },
                                            className: "jsx-418cd238f8a22fbc" + " " + "mt-5 rounded-2xl border px-4 py-3 text-sm font-semibold",
                                            children: [
                                                "❌ ",
                                                errorMsg
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/app/dashboard/officials/controle/page.tsx",
                                            lineNumber: 382,
                                            columnNumber: 21
                                        }, this) : null,
                                        loading ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                            className: "jsx-418cd238f8a22fbc" + " " + "text-gray-500 mt-6 text-center",
                                            children: "Laden…"
                                        }, void 0, false, {
                                            fileName: "[project]/app/dashboard/officials/controle/page.tsx",
                                            lineNumber: 395,
                                            columnNumber: 21
                                        }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            style: {
                                                border: "2px solid rgba(230,230,230,0.55)",
                                                background: "linear-gradient(180deg, rgba(18,18,18,0.18) 0%, rgba(10,10,10,0.22) 100%)",
                                                boxShadow: "inset 0 1px 0 rgba(255,255,255,0.12)"
                                            },
                                            className: "jsx-418cd238f8a22fbc" + " " + "mt-6 overflow-hidden rounded-2xl",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    style: {
                                                        background: "rgba(255,77,0,0.75)"
                                                    },
                                                    className: "jsx-418cd238f8a22fbc" + " " + "h-[3px]"
                                                }, void 0, false, {
                                                    fileName: "[project]/app/dashboard/officials/controle/page.tsx",
                                                    lineNumber: 406,
                                                    columnNumber: 23
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "jsx-418cd238f8a22fbc" + " " + "overflow-x-auto",
                                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("table", {
                                                        className: "jsx-418cd238f8a22fbc" + " " + "min-w-full border-collapse",
                                                        children: [
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("thead", {
                                                                style: {
                                                                    background: "linear-gradient(180deg, #3a3a3f 0%, #2a2a2e 100%)",
                                                                    color: "#fff",
                                                                    borderBottom: "2px solid rgba(255,77,0,0.55)"
                                                                },
                                                                className: "jsx-418cd238f8a22fbc",
                                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("tr", {
                                                                    className: "jsx-418cd238f8a22fbc",
                                                                    children: [
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                                            className: "jsx-418cd238f8a22fbc" + " " + "py-3 px-4 text-left",
                                                                            children: "Datum"
                                                                        }, void 0, false, {
                                                                            fileName: "[project]/app/dashboard/officials/controle/page.tsx",
                                                                            lineNumber: 422,
                                                                            columnNumber: 31
                                                                        }, this),
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                                            className: "jsx-418cd238f8a22fbc" + " " + "py-3 px-4 text-left",
                                                                            children: "Evenement"
                                                                        }, void 0, false, {
                                                                            fileName: "[project]/app/dashboard/officials/controle/page.tsx",
                                                                            lineNumber: 423,
                                                                            columnNumber: 31
                                                                        }, this),
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                                            className: "jsx-418cd238f8a22fbc" + " " + "py-3 px-4 text-left",
                                                                            children: "Locatie"
                                                                        }, void 0, false, {
                                                                            fileName: "[project]/app/dashboard/officials/controle/page.tsx",
                                                                            lineNumber: 424,
                                                                            columnNumber: 31
                                                                        }, this),
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                                            className: "jsx-418cd238f8a22fbc" + " " + "py-3 px-4 text-left",
                                                                            children: "Matchmaker"
                                                                        }, void 0, false, {
                                                                            fileName: "[project]/app/dashboard/officials/controle/page.tsx",
                                                                            lineNumber: 425,
                                                                            columnNumber: 31
                                                                        }, this),
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                                            className: "jsx-418cd238f8a22fbc" + " " + "py-3 px-4 text-left",
                                                                            children: "Promotor"
                                                                        }, void 0, false, {
                                                                            fileName: "[project]/app/dashboard/officials/controle/page.tsx",
                                                                            lineNumber: 426,
                                                                            columnNumber: 31
                                                                        }, this),
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                                            className: "jsx-418cd238f8a22fbc" + " " + "py-3 px-4 text-left",
                                                                            children: "Bondteam"
                                                                        }, void 0, false, {
                                                                            fileName: "[project]/app/dashboard/officials/controle/page.tsx",
                                                                            lineNumber: 427,
                                                                            columnNumber: 31
                                                                        }, this),
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                                            className: "jsx-418cd238f8a22fbc" + " " + "py-3 px-4 text-left",
                                                                            children: "Status"
                                                                        }, void 0, false, {
                                                                            fileName: "[project]/app/dashboard/officials/controle/page.tsx",
                                                                            lineNumber: 428,
                                                                            columnNumber: 31
                                                                        }, this),
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                                            className: "jsx-418cd238f8a22fbc" + " " + "py-3 px-4 text-left",
                                                                            children: "Doorgestuurd"
                                                                        }, void 0, false, {
                                                                            fileName: "[project]/app/dashboard/officials/controle/page.tsx",
                                                                            lineNumber: 429,
                                                                            columnNumber: 31
                                                                        }, this),
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                                            className: "jsx-418cd238f8a22fbc" + " " + "py-3 px-4 text-left",
                                                                            children: "Acties"
                                                                        }, void 0, false, {
                                                                            fileName: "[project]/app/dashboard/officials/controle/page.tsx",
                                                                            lineNumber: 430,
                                                                            columnNumber: 31
                                                                        }, this)
                                                                    ]
                                                                }, void 0, true, {
                                                                    fileName: "[project]/app/dashboard/officials/controle/page.tsx",
                                                                    lineNumber: 421,
                                                                    columnNumber: 29
                                                                }, this)
                                                            }, void 0, false, {
                                                                fileName: "[project]/app/dashboard/officials/controle/page.tsx",
                                                                lineNumber: 413,
                                                                columnNumber: 27
                                                            }, this),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("tbody", {
                                                                className: "jsx-418cd238f8a22fbc",
                                                                children: [
                                                                    visibleRows.map((r, i)=>{
                                                                        const zebra = i % 2 === 0;
                                                                        const run = r.laatste_run;
                                                                        const queueJob = r.actieve_queue_job;
                                                                        const hasMatchmaking = !!r.matchmaking_id;
                                                                        const mmId = r.matchmaking_id ?? "";
                                                                        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("tr", {
                                                                            style: {
                                                                                backgroundColor: zebra ? "#ffffff" : "#0d0d0d",
                                                                                color: zebra ? "#000" : "#fff"
                                                                            },
                                                                            className: "jsx-418cd238f8a22fbc",
                                                                            children: [
                                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                                                    className: "jsx-418cd238f8a22fbc" + " " + "py-3 px-4",
                                                                                    children: formatDate(r.evenement_datum)
                                                                                }, void 0, false, {
                                                                                    fileName: "[project]/app/dashboard/officials/controle/page.tsx",
                                                                                    lineNumber: 450,
                                                                                    columnNumber: 35
                                                                                }, this),
                                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                                                    className: "jsx-418cd238f8a22fbc" + " " + "py-3 px-4 font-semibold",
                                                                                    children: r.evenement_naam ?? "-"
                                                                                }, void 0, false, {
                                                                                    fileName: "[project]/app/dashboard/officials/controle/page.tsx",
                                                                                    lineNumber: 451,
                                                                                    columnNumber: 35
                                                                                }, this),
                                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                                                    className: "jsx-418cd238f8a22fbc" + " " + "py-3 px-4",
                                                                                    children: r.locatie ?? "-"
                                                                                }, void 0, false, {
                                                                                    fileName: "[project]/app/dashboard/officials/controle/page.tsx",
                                                                                    lineNumber: 452,
                                                                                    columnNumber: 35
                                                                                }, this),
                                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                                                    className: "jsx-418cd238f8a22fbc" + " " + "py-3 px-4",
                                                                                    children: r.matchmaker ?? "-"
                                                                                }, void 0, false, {
                                                                                    fileName: "[project]/app/dashboard/officials/controle/page.tsx",
                                                                                    lineNumber: 453,
                                                                                    columnNumber: 35
                                                                                }, this),
                                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                                                    className: "jsx-418cd238f8a22fbc" + " " + "py-3 px-4",
                                                                                    children: r.promotor ?? "-"
                                                                                }, void 0, false, {
                                                                                    fileName: "[project]/app/dashboard/officials/controle/page.tsx",
                                                                                    lineNumber: 454,
                                                                                    columnNumber: 35
                                                                                }, this),
                                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                                                    className: "jsx-418cd238f8a22fbc" + " " + "py-3 px-4",
                                                                                    children: r.bondteam ?? "-"
                                                                                }, void 0, false, {
                                                                                    fileName: "[project]/app/dashboard/officials/controle/page.tsx",
                                                                                    lineNumber: 455,
                                                                                    columnNumber: 35
                                                                                }, this),
                                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                                                    className: "jsx-418cd238f8a22fbc" + " " + "py-3 px-4",
                                                                                    children: [
                                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                                            style: getQueueStatusStyle(queueJob, run),
                                                                                            className: "jsx-418cd238f8a22fbc" + " " + "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold",
                                                                                            children: getQueueStatusLabel(queueJob, run)
                                                                                        }, void 0, false, {
                                                                                            fileName: "[project]/app/dashboard/officials/controle/page.tsx",
                                                                                            lineNumber: 458,
                                                                                            columnNumber: 37
                                                                                        }, this),
                                                                                        queueJob?.status === "failed" && queueJob?.error_message ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                                            className: "jsx-418cd238f8a22fbc" + " " + "mt-1 text-xs opacity-80",
                                                                                            children: queueJob.error_message
                                                                                        }, void 0, false, {
                                                                                            fileName: "[project]/app/dashboard/officials/controle/page.tsx",
                                                                                            lineNumber: 465,
                                                                                            columnNumber: 39
                                                                                        }, this) : null
                                                                                    ]
                                                                                }, void 0, true, {
                                                                                    fileName: "[project]/app/dashboard/officials/controle/page.tsx",
                                                                                    lineNumber: 457,
                                                                                    columnNumber: 35
                                                                                }, this),
                                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                                                    className: "jsx-418cd238f8a22fbc" + " " + "py-3 px-4 text-sm",
                                                                                    children: formatDateTime(r.official_released_at)
                                                                                }, void 0, false, {
                                                                                    fileName: "[project]/app/dashboard/officials/controle/page.tsx",
                                                                                    lineNumber: 471,
                                                                                    columnNumber: 35
                                                                                }, this),
                                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                                                    className: "jsx-418cd238f8a22fbc" + " " + "py-3 px-4",
                                                                                    children: hasMatchmaking ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                                                                                        href: `/dashboard/officials/controle/${encodeURIComponent(mmId)}`,
                                                                                        className: "inline-flex px-3 py-2 text-sm rounded bg-[#151515] text-white border border-orange-600 hover:bg-orange-600 hover:text-black",
                                                                                        children: "Matchmaking"
                                                                                    }, void 0, false, {
                                                                                        fileName: "[project]/app/dashboard/officials/controle/page.tsx",
                                                                                        lineNumber: 477,
                                                                                        columnNumber: 39
                                                                                    }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                                        className: "jsx-418cd238f8a22fbc" + " " + "inline-flex px-3 py-2 text-sm rounded bg-[#151515] text-white/40 border border-white/15",
                                                                                        children: "Geen matchmaking"
                                                                                    }, void 0, false, {
                                                                                        fileName: "[project]/app/dashboard/officials/controle/page.tsx",
                                                                                        lineNumber: 484,
                                                                                        columnNumber: 39
                                                                                    }, this)
                                                                                }, void 0, false, {
                                                                                    fileName: "[project]/app/dashboard/officials/controle/page.tsx",
                                                                                    lineNumber: 475,
                                                                                    columnNumber: 35
                                                                                }, this)
                                                                            ]
                                                                        }, r.id, true, {
                                                                            fileName: "[project]/app/dashboard/officials/controle/page.tsx",
                                                                            lineNumber: 443,
                                                                            columnNumber: 33
                                                                        }, this);
                                                                    }),
                                                                    visibleRows.length === 0 ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("tr", {
                                                                        className: "jsx-418cd238f8a22fbc",
                                                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                                            colSpan: 9,
                                                                            style: {
                                                                                background: "#ffffff"
                                                                            },
                                                                            className: "jsx-418cd238f8a22fbc" + " " + "py-8 px-4 text-center text-zinc-500",
                                                                            children: "Geen doorgestuurde matchmakings gevonden."
                                                                        }, void 0, false, {
                                                                            fileName: "[project]/app/dashboard/officials/controle/page.tsx",
                                                                            lineNumber: 495,
                                                                            columnNumber: 33
                                                                        }, this)
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/app/dashboard/officials/controle/page.tsx",
                                                                        lineNumber: 494,
                                                                        columnNumber: 31
                                                                    }, this) : null
                                                                ]
                                                            }, void 0, true, {
                                                                fileName: "[project]/app/dashboard/officials/controle/page.tsx",
                                                                lineNumber: 434,
                                                                columnNumber: 27
                                                            }, this)
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/app/dashboard/officials/controle/page.tsx",
                                                        lineNumber: 412,
                                                        columnNumber: 25
                                                    }, this)
                                                }, void 0, false, {
                                                    fileName: "[project]/app/dashboard/officials/controle/page.tsx",
                                                    lineNumber: 411,
                                                    columnNumber: 23
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/app/dashboard/officials/controle/page.tsx",
                                            lineNumber: 397,
                                            columnNumber: 21
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/app/dashboard/officials/controle/page.tsx",
                                    lineNumber: 347,
                                    columnNumber: 17
                                }, this)
                            }, void 0, false, {
                                fileName: "[project]/app/dashboard/officials/controle/page.tsx",
                                lineNumber: 343,
                                columnNumber: 15
                            }, this)
                        }, void 0, false, {
                            fileName: "[project]/app/dashboard/officials/controle/page.tsx",
                            lineNumber: 342,
                            columnNumber: 13
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$styled$2d$jsx$2f$style$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                            id: "418cd238f8a22fbc",
                            children: `:root{--brand-orange:${NVB_ORANGE}}`
                        }, void 0, false, void 0, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/app/dashboard/officials/controle/page.tsx",
                    lineNumber: 236,
                    columnNumber: 11
                }, this)
            }, void 0, false, {
                fileName: "[project]/app/dashboard/officials/controle/page.tsx",
                lineNumber: 225,
                columnNumber: 9
            }, this)
        }, void 0, false, {
            fileName: "[project]/app/dashboard/officials/controle/page.tsx",
            lineNumber: 224,
            columnNumber: 7
        }, this)
    }, void 0, false, {
        fileName: "[project]/app/dashboard/officials/controle/page.tsx",
        lineNumber: 223,
        columnNumber: 5
    }, this);
}
_s(ControleOverzichtPage, "Xyu+cZ2BfQUjxaxri6lXES7F9Ac=");
_c1 = ControleOverzichtPage;
var _c, _c1;
__turbopack_context__.k.register(_c, "Small");
__turbopack_context__.k.register(_c1, "ControleOverzichtPage");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
]);

//# sourceMappingURL=_871ddd0e._.js.map