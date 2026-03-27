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
"[project]/app/dashboard/matchmaker/matchmaking/page.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>MatchmakingOverzichtPage
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$styled$2d$jsx$2f$style$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/styled-jsx/style.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/client/app-dir/link.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$image$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/image.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabaseClient$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/supabaseClient.ts [app-client] (ecmascript)");
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
function normalizeStatus(status) {
    return (status ?? "concept").trim().toLowerCase();
}
function formatStatusLabel(status) {
    const s = normalizeStatus(status);
    if (s === "concept") return "Concept";
    if (s === "niet gecontroleerd") return "Niet gecontroleerd";
    return status ?? "Concept";
}
function effectiveStatus(row) {
    return row.laatste_run?.status ?? row.status ?? "concept";
}
function Small({ children, origin = "left center" }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        style: {
            transform: "scale(0.85)",
            transformOrigin: origin
        },
        children: children
    }, void 0, false, {
        fileName: "[project]/app/dashboard/matchmaker/matchmaking/page.tsx",
        lineNumber: 108,
        columnNumber: 5
    }, this);
}
_c = Small;
function MatchmakingOverzichtPage() {
    _s();
    const [rows, setRows] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])([]);
    const [profile, setProfile] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [loading, setLoading] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(true);
    const [busyId, setBusyId] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [showCreate, setShowCreate] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [creating, setCreating] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [createMsg, setCreateMsg] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])("");
    const [naam, setNaam] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])("");
    const [datum, setDatum] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])("");
    const [locatie, setLocatie] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])("");
    const [promotor, setPromotor] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])("");
    const [bondteam, setBondteam] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])("");
    const [filterMonth, setFilterMonth] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])("");
    const [filterName, setFilterName] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])("");
    const [filterStatus, setFilterStatus] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])("");
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "MatchmakingOverzichtPage.useEffect": ()=>{
            void load();
        }
    }["MatchmakingOverzichtPage.useEffect"], []);
    function resetCreateForm(profileData) {
        setNaam("");
        setDatum("");
        setLocatie("");
        setPromotor("");
        setBondteam(profileData?.bondteam ?? "");
        setCreateMsg("");
    }
    async function load() {
        setLoading(true);
        const { data: { user }, error: userError } = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabaseClient$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["supabase"].auth.getUser();
        if (userError || !user) {
            console.error("Fout bij ophalen gebruiker:", userError);
            setRows([]);
            setProfile(null);
            setLoading(false);
            return;
        }
        const { data: profileData, error: profileError } = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabaseClient$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["supabase"].from("user_profiles").select("id, full_name, bondteam").eq("id", user.id).maybeSingle();
        if (profileError) {
            console.error("Fout bij laden profiel:", profileError);
        }
        const normalizedProfile = {
            id: user.id,
            full_name: profileData?.full_name ?? "",
            bondteam: profileData?.bondteam ?? ""
        };
        setProfile(normalizedProfile);
        const { data: matchmakings, error: matchmakingError } = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabaseClient$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["supabase"].from("matchmaker_matchmakings").select(`
        id,
        naam,
        datum,
        locatie,
        promotor,
        bondteam,
        matchmaker_id,
        matchmaker_naam,
        status,
        official_release,
        official_released_at,
        created_at,
        updated_at
      `).eq("matchmaker_id", user.id).order("datum", {
            ascending: false
        }).order("created_at", {
            ascending: false
        });
        if (matchmakingError) {
            console.error("Fout bij laden matchmakings:", matchmakingError);
            setRows([]);
            setLoading(false);
            return;
        }
        const ids = (matchmakings ?? []).map((r)=>r.id).filter(Boolean);
        const { data: runs, error: runsError } = ids.length ? await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabaseClient$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["supabase"].from("controle_runs").select("id, matchmaking_id, status, gestart_op, afgerond_op").in("matchmaking_id", ids) : {
            data: [],
            error: null
        };
        if (runsError) {
            console.error("Fout bij laden controle runs:", runsError);
        }
        const runMap = new Map();
        (runs ?? []).forEach((r)=>{
            const existing = runMap.get(r.matchmaking_id);
            if (!existing || new Date(r.gestart_op ?? 0).getTime() > new Date(existing.gestart_op ?? 0).getTime()) {
                runMap.set(r.matchmaking_id, r);
            }
        });
        const merged = (matchmakings ?? []).map((r)=>({
                ...r,
                laatste_run: runMap.get(r.id) ?? null
            }));
        setRows(merged);
        setLoading(false);
    }
    async function createMatchmaking() {
        try {
            setCreateMsg("");
            const { data: { user }, error: userError } = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabaseClient$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["supabase"].auth.getUser();
            if (userError || !user) {
                setCreateMsg("❌ Gebruiker niet gevonden.");
                return;
            }
            if (!naam.trim()) {
                setCreateMsg("⚠️ Naam is verplicht.");
                return;
            }
            if (!datum.trim()) {
                setCreateMsg("⚠️ Datum is verplicht.");
                return;
            }
            setCreating(true);
            const { error } = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabaseClient$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["supabase"].from("matchmaker_matchmakings").insert({
                naam: naam.trim(),
                datum,
                locatie: locatie.trim() || null,
                promotor: promotor.trim() || null,
                bondteam: bondteam.trim() || null,
                matchmaker_id: user.id,
                matchmaker_naam: profile?.full_name?.trim() || null,
                status: "concept",
                official_release: false
            });
            if (error) {
                console.error("Nieuwe matchmaking error:", error);
                setCreateMsg("❌ Nieuwe matchmaking aanmaken mislukt.");
                return;
            }
            setShowCreate(false);
            resetCreateForm(profile);
            await load();
        } catch (e) {
            console.error(e);
            setCreateMsg("❌ Onverwachte fout bij aanmaken.");
        } finally{
            setCreating(false);
        }
    }
    async function deleteMM(matchmakingId) {
        const ok = window.confirm("Weet je zeker dat je deze matchmaking wilt verwijderen?\n\nDit kan niet ongedaan gemaakt worden.");
        if (!ok) return;
        try {
            setBusyId(matchmakingId);
            const res = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$api$2f$authedFetch$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["authedFetch"])("/api/matchmaker/delete-matchmaking", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    matchmaking_id: matchmakingId
                })
            });
            if (!res.ok) {
                const t = await res.text();
                console.error("Delete failed:", res.status, t);
                alert("Verwijderen mislukt.");
                return;
            }
            await load();
        } finally{
            setBusyId(null);
        }
    }
    const monthOptions = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useMemo"])({
        "MatchmakingOverzichtPage.useMemo[monthOptions]": ()=>{
            return Array.from(new Set(rows.map({
                "MatchmakingOverzichtPage.useMemo[monthOptions]": (r)=>getMonthKey(r.datum)
            }["MatchmakingOverzichtPage.useMemo[monthOptions]"]).filter(Boolean))).sort({
                "MatchmakingOverzichtPage.useMemo[monthOptions]": (a, b)=>b.localeCompare(a)
            }["MatchmakingOverzichtPage.useMemo[monthOptions]"]);
        }
    }["MatchmakingOverzichtPage.useMemo[monthOptions]"], [
        rows
    ]);
    const statusOptions = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useMemo"])({
        "MatchmakingOverzichtPage.useMemo[statusOptions]": ()=>{
            return Array.from(new Set(rows.map({
                "MatchmakingOverzichtPage.useMemo[statusOptions]": (r)=>normalizeStatus(effectiveStatus(r))
            }["MatchmakingOverzichtPage.useMemo[statusOptions]"]))).sort({
                "MatchmakingOverzichtPage.useMemo[statusOptions]": (a, b)=>a.localeCompare(b, "nl")
            }["MatchmakingOverzichtPage.useMemo[statusOptions]"]);
        }
    }["MatchmakingOverzichtPage.useMemo[statusOptions]"], [
        rows
    ]);
    const filteredRows = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useMemo"])({
        "MatchmakingOverzichtPage.useMemo[filteredRows]": ()=>{
            const nameNeedle = filterName.trim().toLowerCase();
            return rows.filter({
                "MatchmakingOverzichtPage.useMemo[filteredRows]": (r)=>{
                    const rowMonth = getMonthKey(r.datum);
                    const rowStatus = normalizeStatus(effectiveStatus(r));
                    const rowNaam = (r.naam ?? "").trim().toLowerCase();
                    const rowLocatie = (r.locatie ?? "").trim().toLowerCase();
                    const rowPromotor = (r.promotor ?? "").trim().toLowerCase();
                    if (filterMonth && rowMonth !== filterMonth) return false;
                    if (filterStatus && rowStatus !== filterStatus) return false;
                    if (nameNeedle && !rowNaam.includes(nameNeedle) && !rowLocatie.includes(nameNeedle) && !rowPromotor.includes(nameNeedle)) {
                        return false;
                    }
                    return true;
                }
            }["MatchmakingOverzichtPage.useMemo[filteredRows]"]);
        }
    }["MatchmakingOverzichtPage.useMemo[filteredRows]"], [
        rows,
        filterMonth,
        filterName,
        filterStatus
    ]);
    const hasActiveFilters = !!filterMonth || !!filterName || !!filterStatus;
    function resetFilters() {
        setFilterMonth("");
        setFilterName("");
        setFilterStatus("");
    }
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("main", {
        className: "min-h-screen px-4 py-6",
        style: {
            background: "#eef0f3"
        },
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "jsx-e330f5047f16c9d3" + " " + "mx-auto w-full max-w-[1500px]",
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    style: {
                        background: "linear-gradient(180deg, #f8f8f8 0%, #d8d8d8 22%, #8f8f8f 55%, #f0f0f0 100%)",
                        boxShadow: `
              0 0 0 1px rgba(255,255,255,0.7),
              0 22px 70px rgba(0,0,0,0.9)
            `
                    },
                    className: "jsx-e330f5047f16c9d3" + " " + "rounded-[32px] p-[6px]",
                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        style: {
                            background: "linear-gradient(180deg, #f8fafc 0%, #eef2f7 100%)",
                            border: "3px solid rgba(63,63,70,0.35)",
                            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.9)"
                        },
                        className: "jsx-e330f5047f16c9d3" + " " + "relative overflow-hidden rounded-[28px]",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                style: {
                                    background: "linear-gradient(180deg, #3a3a3f 0%, #2a2a2e 100%)",
                                    borderBottom: `3px solid rgba(255,77,0,0.55)`
                                },
                                className: "jsx-e330f5047f16c9d3" + " " + "px-6 py-5",
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "jsx-e330f5047f16c9d3" + " " + "grid grid-cols-1 items-center gap-4 xl:grid-cols-[1fr_auto_1fr]",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "jsx-e330f5047f16c9d3" + " " + "justify-self-start",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "jsx-e330f5047f16c9d3" + " " + "leading-tight",
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                            style: {
                                                                fontSize: 28,
                                                                letterSpacing: "0.04em",
                                                                color: NVB_ORANGE,
                                                                textShadow: "0 6px 18px rgba(0,0,0,0.45)"
                                                            },
                                                            className: "jsx-e330f5047f16c9d3" + " " + "font-extrabold uppercase",
                                                            children: "Matchmaking overzicht"
                                                        }, void 0, false, {
                                                            fileName: "[project]/app/dashboard/matchmaker/matchmaking/page.tsx",
                                                            lineNumber: 405,
                                                            columnNumber: 21
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                            className: "jsx-e330f5047f16c9d3" + " " + "mt-1 text-sm text-white/85",
                                                            children: "Maak een nieuwe MM."
                                                        }, void 0, false, {
                                                            fileName: "[project]/app/dashboard/matchmaker/matchmaking/page.tsx",
                                                            lineNumber: 416,
                                                            columnNumber: 21
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                            className: "jsx-e330f5047f16c9d3" + " " + "mt-1 text-xs text-white/70",
                                                            children: [
                                                                "Ingelogd als: ",
                                                                profile?.full_name || "-"
                                                            ]
                                                        }, void 0, true, {
                                                            fileName: "[project]/app/dashboard/matchmaker/matchmaking/page.tsx",
                                                            lineNumber: 419,
                                                            columnNumber: 21
                                                        }, this)
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/app/dashboard/matchmaker/matchmaking/page.tsx",
                                                    lineNumber: 404,
                                                    columnNumber: 19
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "jsx-e330f5047f16c9d3" + " " + "mt-3 flex flex-wrap items-center gap-2",
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(Small, {
                                                            origin: "left center",
                                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$NvbLightButton$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                                                                label: "← Terug naar menu",
                                                                onClick: ()=>window.location.href = "/dashboard/matchmaker"
                                                            }, void 0, false, {
                                                                fileName: "[project]/app/dashboard/matchmaker/matchmaking/page.tsx",
                                                                lineNumber: 426,
                                                                columnNumber: 23
                                                            }, this)
                                                        }, void 0, false, {
                                                            fileName: "[project]/app/dashboard/matchmaker/matchmaking/page.tsx",
                                                            lineNumber: 425,
                                                            columnNumber: 21
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(Small, {
                                                            origin: "left center",
                                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$NvbDarkButton$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                                                                label: showCreate ? "Nieuwe matchmaking sluiten" : "Nieuwe matchmaking starten",
                                                                onClick: ()=>{
                                                                    if (!showCreate) resetCreateForm(profile);
                                                                    setShowCreate((prev)=>!prev);
                                                                }
                                                            }, void 0, false, {
                                                                fileName: "[project]/app/dashboard/matchmaker/matchmaking/page.tsx",
                                                                lineNumber: 435,
                                                                columnNumber: 23
                                                            }, this)
                                                        }, void 0, false, {
                                                            fileName: "[project]/app/dashboard/matchmaker/matchmaking/page.tsx",
                                                            lineNumber: 434,
                                                            columnNumber: 21
                                                        }, this)
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/app/dashboard/matchmaker/matchmaking/page.tsx",
                                                    lineNumber: 424,
                                                    columnNumber: 19
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/app/dashboard/matchmaker/matchmaking/page.tsx",
                                            lineNumber: 403,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "jsx-e330f5047f16c9d3" + " " + "justify-self-center",
                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$image$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                                                src: "/branding/fightsupport/excel-logo.png",
                                                alt: "FightSupport",
                                                width: 320,
                                                height: 120,
                                                priority: true,
                                                className: "h-auto w-[240px] md:w-[280px] xl:w-[320px] drop-shadow-[0_8px_22px_rgba(0,0,0,0.45)]"
                                            }, void 0, false, {
                                                fileName: "[project]/app/dashboard/matchmaker/matchmaking/page.tsx",
                                                lineNumber: 451,
                                                columnNumber: 19
                                            }, this)
                                        }, void 0, false, {
                                            fileName: "[project]/app/dashboard/matchmaker/matchmaking/page.tsx",
                                            lineNumber: 450,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "jsx-e330f5047f16c9d3" + " " + "justify-self-end"
                                        }, void 0, false, {
                                            fileName: "[project]/app/dashboard/matchmaker/matchmaking/page.tsx",
                                            lineNumber: 461,
                                            columnNumber: 17
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/app/dashboard/matchmaker/matchmaking/page.tsx",
                                    lineNumber: 402,
                                    columnNumber: 15
                                }, this)
                            }, void 0, false, {
                                fileName: "[project]/app/dashboard/matchmaker/matchmaking/page.tsx",
                                lineNumber: 395,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "jsx-e330f5047f16c9d3" + " " + "px-4 py-6 md:px-6",
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    style: silverBackplate,
                                    className: "jsx-e330f5047f16c9d3" + " " + "rounded-3xl border-2 border-zinc-500/60 p-4 shadow-[0_22px_60px_rgba(24,24,27,0.12)] ring-1 ring-white/50 md:p-5",
                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "jsx-e330f5047f16c9d3" + " " + "px-2 py-2 md:px-3",
                                        children: [
                                            showCreate && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                style: {
                                                    background: "linear-gradient(180deg, rgba(255,255,255,0.96) 0%, rgba(239,242,246,0.98) 100%)",
                                                    borderColor: "rgba(90,90,95,0.22)",
                                                    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.9), 0 10px 24px rgba(0,0,0,0.08)"
                                                },
                                                className: "jsx-e330f5047f16c9d3" + " " + "mb-5 rounded-[24px] border p-4 md:p-5",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        className: "jsx-e330f5047f16c9d3" + " " + "mb-3",
                                                        children: [
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                className: "jsx-e330f5047f16c9d3" + " " + "text-sm font-bold uppercase tracking-[0.18em] text-zinc-700",
                                                                children: "Nieuwe matchmaking"
                                                            }, void 0, false, {
                                                                fileName: "[project]/app/dashboard/matchmaker/matchmaking/page.tsx",
                                                                lineNumber: 483,
                                                                columnNumber: 25
                                                            }, this),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                className: "jsx-e330f5047f16c9d3" + " " + "mt-1 text-xs text-zinc-500",
                                                                children: "Na opslaan komt de matchmaking direct in het overzicht. Gebruik daarna Upload om vechters toe te voegen."
                                                            }, void 0, false, {
                                                                fileName: "[project]/app/dashboard/matchmaker/matchmaking/page.tsx",
                                                                lineNumber: 486,
                                                                columnNumber: 25
                                                            }, this)
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/app/dashboard/matchmaker/matchmaking/page.tsx",
                                                        lineNumber: 482,
                                                        columnNumber: 23
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        className: "jsx-e330f5047f16c9d3" + " " + "grid grid-cols-1 gap-3 lg:grid-cols-2 xl:grid-cols-5",
                                                        children: [
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                className: "jsx-e330f5047f16c9d3",
                                                                children: [
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                                        className: "jsx-e330f5047f16c9d3" + " " + "mb-1 block text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-600",
                                                                        children: "Datum *"
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/app/dashboard/matchmaker/matchmaking/page.tsx",
                                                                        lineNumber: 494,
                                                                        columnNumber: 27
                                                                    }, this),
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                                        type: "date",
                                                                        value: datum,
                                                                        onChange: (e)=>setDatum(e.target.value),
                                                                        className: "jsx-e330f5047f16c9d3" + " " + "orange-input h-10 w-full"
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/app/dashboard/matchmaker/matchmaking/page.tsx",
                                                                        lineNumber: 497,
                                                                        columnNumber: 27
                                                                    }, this)
                                                                ]
                                                            }, void 0, true, {
                                                                fileName: "[project]/app/dashboard/matchmaker/matchmaking/page.tsx",
                                                                lineNumber: 493,
                                                                columnNumber: 25
                                                            }, this),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                className: "jsx-e330f5047f16c9d3",
                                                                children: [
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                                        className: "jsx-e330f5047f16c9d3" + " " + "mb-1 block text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-600",
                                                                        children: "Naam *"
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/app/dashboard/matchmaker/matchmaking/page.tsx",
                                                                        lineNumber: 506,
                                                                        columnNumber: 27
                                                                    }, this),
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                                        value: naam,
                                                                        onChange: (e)=>setNaam(e.target.value),
                                                                        placeholder: "Evenement naam",
                                                                        className: "jsx-e330f5047f16c9d3" + " " + "orange-input h-10 w-full"
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/app/dashboard/matchmaker/matchmaking/page.tsx",
                                                                        lineNumber: 509,
                                                                        columnNumber: 27
                                                                    }, this)
                                                                ]
                                                            }, void 0, true, {
                                                                fileName: "[project]/app/dashboard/matchmaker/matchmaking/page.tsx",
                                                                lineNumber: 505,
                                                                columnNumber: 25
                                                            }, this),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                className: "jsx-e330f5047f16c9d3",
                                                                children: [
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                                        className: "jsx-e330f5047f16c9d3" + " " + "mb-1 block text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-600",
                                                                        children: "Locatie"
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/app/dashboard/matchmaker/matchmaking/page.tsx",
                                                                        lineNumber: 518,
                                                                        columnNumber: 27
                                                                    }, this),
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                                        value: locatie,
                                                                        onChange: (e)=>setLocatie(e.target.value),
                                                                        placeholder: "Locatie",
                                                                        className: "jsx-e330f5047f16c9d3" + " " + "orange-input h-10 w-full"
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/app/dashboard/matchmaker/matchmaking/page.tsx",
                                                                        lineNumber: 521,
                                                                        columnNumber: 27
                                                                    }, this)
                                                                ]
                                                            }, void 0, true, {
                                                                fileName: "[project]/app/dashboard/matchmaker/matchmaking/page.tsx",
                                                                lineNumber: 517,
                                                                columnNumber: 25
                                                            }, this),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                className: "jsx-e330f5047f16c9d3",
                                                                children: [
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                                        className: "jsx-e330f5047f16c9d3" + " " + "mb-1 block text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-600",
                                                                        children: "Promotor"
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/app/dashboard/matchmaker/matchmaking/page.tsx",
                                                                        lineNumber: 530,
                                                                        columnNumber: 27
                                                                    }, this),
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                                        value: promotor,
                                                                        onChange: (e)=>setPromotor(e.target.value),
                                                                        placeholder: "Promotor",
                                                                        className: "jsx-e330f5047f16c9d3" + " " + "orange-input h-10 w-full"
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/app/dashboard/matchmaker/matchmaking/page.tsx",
                                                                        lineNumber: 533,
                                                                        columnNumber: 27
                                                                    }, this)
                                                                ]
                                                            }, void 0, true, {
                                                                fileName: "[project]/app/dashboard/matchmaker/matchmaking/page.tsx",
                                                                lineNumber: 529,
                                                                columnNumber: 25
                                                            }, this),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                className: "jsx-e330f5047f16c9d3",
                                                                children: [
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                                        className: "jsx-e330f5047f16c9d3" + " " + "mb-1 block text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-600",
                                                                        children: "Bondteam"
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/app/dashboard/matchmaker/matchmaking/page.tsx",
                                                                        lineNumber: 542,
                                                                        columnNumber: 27
                                                                    }, this),
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                                        value: bondteam,
                                                                        onChange: (e)=>setBondteam(e.target.value),
                                                                        placeholder: "Bondteam",
                                                                        className: "jsx-e330f5047f16c9d3" + " " + "orange-input h-10 w-full"
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/app/dashboard/matchmaker/matchmaking/page.tsx",
                                                                        lineNumber: 545,
                                                                        columnNumber: 27
                                                                    }, this)
                                                                ]
                                                            }, void 0, true, {
                                                                fileName: "[project]/app/dashboard/matchmaker/matchmaking/page.tsx",
                                                                lineNumber: 541,
                                                                columnNumber: 25
                                                            }, this)
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/app/dashboard/matchmaker/matchmaking/page.tsx",
                                                        lineNumber: 492,
                                                        columnNumber: 23
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        className: "jsx-e330f5047f16c9d3" + " " + "mt-4 flex flex-wrap items-center gap-3",
                                                        children: [
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                                onClick: createMatchmaking,
                                                                disabled: creating,
                                                                className: "jsx-e330f5047f16c9d3" + " " + "rounded border border-[var(--brand-orange)] bg-[#2f2f33] px-4 py-2 text-sm text-white hover:bg-[var(--brand-orange)] hover:text-black disabled:opacity-60",
                                                                children: creating ? "Bezig…" : "Nieuwe matchmaking starten"
                                                            }, void 0, false, {
                                                                fileName: "[project]/app/dashboard/matchmaker/matchmaking/page.tsx",
                                                                lineNumber: 555,
                                                                columnNumber: 25
                                                            }, this),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                                onClick: ()=>{
                                                                    setShowCreate(false);
                                                                    setCreateMsg("");
                                                                },
                                                                disabled: creating,
                                                                className: "jsx-e330f5047f16c9d3" + " " + "rounded border border-zinc-300 bg-[#2f2f33] px-4 py-2 text-sm text-white hover:bg-white hover:text-black disabled:opacity-60",
                                                                children: "Annuleren"
                                                            }, void 0, false, {
                                                                fileName: "[project]/app/dashboard/matchmaker/matchmaking/page.tsx",
                                                                lineNumber: 563,
                                                                columnNumber: 25
                                                            }, this),
                                                            createMsg ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                style: {
                                                                    color: createMsg.startsWith("⚠️") ? "#9a5a00" : "var(--brand-orange)"
                                                                },
                                                                className: "jsx-e330f5047f16c9d3" + " " + "text-xs",
                                                                children: createMsg
                                                            }, void 0, false, {
                                                                fileName: "[project]/app/dashboard/matchmaker/matchmaking/page.tsx",
                                                                lineNumber: 575,
                                                                columnNumber: 27
                                                            }, this) : null
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/app/dashboard/matchmaker/matchmaking/page.tsx",
                                                        lineNumber: 554,
                                                        columnNumber: 23
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/app/dashboard/matchmaker/matchmaking/page.tsx",
                                                lineNumber: 472,
                                                columnNumber: 21
                                            }, this),
                                            !loading && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                style: {
                                                    background: "linear-gradient(180deg, rgba(255,255,255,0.94) 0%, rgba(239,242,246,0.98) 100%)",
                                                    borderColor: "rgba(90,90,95,0.22)",
                                                    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.9), 0 10px 24px rgba(0,0,0,0.08)"
                                                },
                                                className: "jsx-e330f5047f16c9d3" + " " + "rounded-[24px] border p-4 md:p-4",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        className: "jsx-e330f5047f16c9d3" + " " + "mb-3 flex flex-wrap items-center justify-between gap-3",
                                                        children: [
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                className: "jsx-e330f5047f16c9d3",
                                                                children: [
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                        className: "jsx-e330f5047f16c9d3" + " " + "text-sm font-bold uppercase tracking-[0.18em] text-zinc-700",
                                                                        children: "Filters"
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/app/dashboard/matchmaker/matchmaking/page.tsx",
                                                                        lineNumber: 603,
                                                                        columnNumber: 27
                                                                    }, this),
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                        className: "jsx-e330f5047f16c9d3" + " " + "mt-1 text-xs text-zinc-500",
                                                                        children: "Filter op maand, naam of status"
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/app/dashboard/matchmaker/matchmaking/page.tsx",
                                                                        lineNumber: 606,
                                                                        columnNumber: 27
                                                                    }, this)
                                                                ]
                                                            }, void 0, true, {
                                                                fileName: "[project]/app/dashboard/matchmaker/matchmaking/page.tsx",
                                                                lineNumber: 602,
                                                                columnNumber: 25
                                                            }, this),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                className: "jsx-e330f5047f16c9d3" + " " + "text-sm text-zinc-600",
                                                                children: [
                                                                    filteredRows.length,
                                                                    " van ",
                                                                    rows.length,
                                                                    " zichtbaar"
                                                                ]
                                                            }, void 0, true, {
                                                                fileName: "[project]/app/dashboard/matchmaker/matchmaking/page.tsx",
                                                                lineNumber: 611,
                                                                columnNumber: 25
                                                            }, this)
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/app/dashboard/matchmaker/matchmaking/page.tsx",
                                                        lineNumber: 601,
                                                        columnNumber: 23
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        className: "jsx-e330f5047f16c9d3" + " " + "grid grid-cols-1 gap-3 xl:grid-cols-[180px_minmax(180px,1fr)_180px_180px]",
                                                        children: [
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                className: "jsx-e330f5047f16c9d3",
                                                                children: [
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                                        className: "jsx-e330f5047f16c9d3" + " " + "mb-1 block text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-600",
                                                                        children: "Maand"
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/app/dashboard/matchmaker/matchmaking/page.tsx",
                                                                        lineNumber: 618,
                                                                        columnNumber: 27
                                                                    }, this),
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("select", {
                                                                        value: filterMonth,
                                                                        onChange: (e)=>setFilterMonth(e.target.value),
                                                                        style: {
                                                                            borderColor: "rgba(63,63,70,0.22)",
                                                                            background: "#fff",
                                                                            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.95)"
                                                                        },
                                                                        className: "jsx-e330f5047f16c9d3" + " " + "h-10 w-full rounded-xl border px-3 text-sm outline-none",
                                                                        children: [
                                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                                                value: "",
                                                                                className: "jsx-e330f5047f16c9d3",
                                                                                children: "Alle maanden"
                                                                            }, void 0, false, {
                                                                                fileName: "[project]/app/dashboard/matchmaker/matchmaking/page.tsx",
                                                                                lineNumber: 632,
                                                                                columnNumber: 29
                                                                            }, this),
                                                                            monthOptions.map((monthKey)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                                                    value: monthKey,
                                                                                    className: "jsx-e330f5047f16c9d3",
                                                                                    children: formatMonthLabel(monthKey)
                                                                                }, monthKey, false, {
                                                                                    fileName: "[project]/app/dashboard/matchmaker/matchmaking/page.tsx",
                                                                                    lineNumber: 634,
                                                                                    columnNumber: 31
                                                                                }, this))
                                                                        ]
                                                                    }, void 0, true, {
                                                                        fileName: "[project]/app/dashboard/matchmaker/matchmaking/page.tsx",
                                                                        lineNumber: 621,
                                                                        columnNumber: 27
                                                                    }, this)
                                                                ]
                                                            }, void 0, true, {
                                                                fileName: "[project]/app/dashboard/matchmaker/matchmaking/page.tsx",
                                                                lineNumber: 617,
                                                                columnNumber: 25
                                                            }, this),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                className: "jsx-e330f5047f16c9d3",
                                                                children: [
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                                        className: "jsx-e330f5047f16c9d3" + " " + "mb-1 block text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-600",
                                                                        children: "Naam"
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/app/dashboard/matchmaker/matchmaking/page.tsx",
                                                                        lineNumber: 642,
                                                                        columnNumber: 27
                                                                    }, this),
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                                        value: filterName,
                                                                        onChange: (e)=>setFilterName(e.target.value),
                                                                        placeholder: "Zoek naam, locatie of promotor",
                                                                        style: {
                                                                            borderColor: "rgba(63,63,70,0.22)",
                                                                            background: "#fff",
                                                                            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.95)"
                                                                        },
                                                                        className: "jsx-e330f5047f16c9d3" + " " + "h-10 w-full rounded-xl border px-3 text-sm outline-none"
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/app/dashboard/matchmaker/matchmaking/page.tsx",
                                                                        lineNumber: 645,
                                                                        columnNumber: 27
                                                                    }, this)
                                                                ]
                                                            }, void 0, true, {
                                                                fileName: "[project]/app/dashboard/matchmaker/matchmaking/page.tsx",
                                                                lineNumber: 641,
                                                                columnNumber: 25
                                                            }, this),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                className: "jsx-e330f5047f16c9d3",
                                                                children: [
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                                        className: "jsx-e330f5047f16c9d3" + " " + "mb-1 block text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-600",
                                                                        children: "Status"
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/app/dashboard/matchmaker/matchmaking/page.tsx",
                                                                        lineNumber: 660,
                                                                        columnNumber: 27
                                                                    }, this),
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("select", {
                                                                        value: filterStatus,
                                                                        onChange: (e)=>setFilterStatus(e.target.value),
                                                                        style: {
                                                                            borderColor: "rgba(63,63,70,0.22)",
                                                                            background: "#fff",
                                                                            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.95)"
                                                                        },
                                                                        className: "jsx-e330f5047f16c9d3" + " " + "h-10 w-full rounded-xl border px-3 text-sm outline-none",
                                                                        children: [
                                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                                                value: "",
                                                                                className: "jsx-e330f5047f16c9d3",
                                                                                children: "Alle statussen"
                                                                            }, void 0, false, {
                                                                                fileName: "[project]/app/dashboard/matchmaker/matchmaking/page.tsx",
                                                                                lineNumber: 674,
                                                                                columnNumber: 29
                                                                            }, this),
                                                                            statusOptions.map((status)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                                                    value: status,
                                                                                    className: "jsx-e330f5047f16c9d3",
                                                                                    children: formatStatusLabel(status)
                                                                                }, status, false, {
                                                                                    fileName: "[project]/app/dashboard/matchmaker/matchmaking/page.tsx",
                                                                                    lineNumber: 676,
                                                                                    columnNumber: 31
                                                                                }, this))
                                                                        ]
                                                                    }, void 0, true, {
                                                                        fileName: "[project]/app/dashboard/matchmaker/matchmaking/page.tsx",
                                                                        lineNumber: 663,
                                                                        columnNumber: 27
                                                                    }, this)
                                                                ]
                                                            }, void 0, true, {
                                                                fileName: "[project]/app/dashboard/matchmaker/matchmaking/page.tsx",
                                                                lineNumber: 659,
                                                                columnNumber: 25
                                                            }, this),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                className: "jsx-e330f5047f16c9d3" + " " + "flex items-end",
                                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                                    onClick: resetFilters,
                                                                    disabled: !hasActiveFilters,
                                                                    style: {
                                                                        borderColor: hasActiveFilters ? "rgba(255,77,0,0.65)" : "rgba(63,63,70,0.22)"
                                                                    },
                                                                    className: "jsx-e330f5047f16c9d3" + " " + "h-10 w-full rounded-xl border bg-[#2f2f33] px-3 text-sm text-white hover:bg-white hover:text-black disabled:cursor-not-allowed disabled:opacity-50",
                                                                    children: "Filters wissen"
                                                                }, void 0, false, {
                                                                    fileName: "[project]/app/dashboard/matchmaker/matchmaking/page.tsx",
                                                                    lineNumber: 684,
                                                                    columnNumber: 27
                                                                }, this)
                                                            }, void 0, false, {
                                                                fileName: "[project]/app/dashboard/matchmaker/matchmaking/page.tsx",
                                                                lineNumber: 683,
                                                                columnNumber: 25
                                                            }, this)
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/app/dashboard/matchmaker/matchmaking/page.tsx",
                                                        lineNumber: 616,
                                                        columnNumber: 23
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/app/dashboard/matchmaker/matchmaking/page.tsx",
                                                lineNumber: 591,
                                                columnNumber: 21
                                            }, this),
                                            loading ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                className: "jsx-e330f5047f16c9d3" + " " + "mt-6 text-center text-gray-500",
                                                children: "Laden…"
                                            }, void 0, false, {
                                                fileName: "[project]/app/dashboard/matchmaker/matchmaking/page.tsx",
                                                lineNumber: 702,
                                                columnNumber: 21
                                            }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                style: {
                                                    border: "2px solid rgba(230,230,230,0.55)",
                                                    background: "linear-gradient(180deg, rgba(18,18,18,0.18) 0%, rgba(10,10,10,0.22) 100%)",
                                                    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.12)"
                                                },
                                                className: "jsx-e330f5047f16c9d3" + " " + "mt-5 overflow-hidden rounded-2xl",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        style: {
                                                            background: "rgba(255,77,0,0.75)"
                                                        },
                                                        className: "jsx-e330f5047f16c9d3" + " " + "h-[3px]"
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/dashboard/matchmaker/matchmaking/page.tsx",
                                                        lineNumber: 713,
                                                        columnNumber: 23
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        className: "jsx-e330f5047f16c9d3" + " " + "overflow-x-auto",
                                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("table", {
                                                            className: "jsx-e330f5047f16c9d3" + " " + "min-w-full border-collapse",
                                                            children: [
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("thead", {
                                                                    style: {
                                                                        background: "linear-gradient(180deg, #ff6a00 0%, #ff5400 100%)",
                                                                        color: "#fff",
                                                                        borderBottom: "2px solid rgba(255,255,255,0.35)"
                                                                    },
                                                                    className: "jsx-e330f5047f16c9d3",
                                                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("tr", {
                                                                        className: "jsx-e330f5047f16c9d3",
                                                                        children: [
                                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                                                className: "jsx-e330f5047f16c9d3" + " " + "px-4 py-3 text-left",
                                                                                children: "Datum"
                                                                            }, void 0, false, {
                                                                                fileName: "[project]/app/dashboard/matchmaker/matchmaking/page.tsx",
                                                                                lineNumber: 730,
                                                                                columnNumber: 31
                                                                            }, this),
                                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                                                className: "jsx-e330f5047f16c9d3" + " " + "px-4 py-3 text-left",
                                                                                children: "Naam"
                                                                            }, void 0, false, {
                                                                                fileName: "[project]/app/dashboard/matchmaker/matchmaking/page.tsx",
                                                                                lineNumber: 731,
                                                                                columnNumber: 31
                                                                            }, this),
                                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                                                className: "jsx-e330f5047f16c9d3" + " " + "px-4 py-3 text-left",
                                                                                children: "Locatie"
                                                                            }, void 0, false, {
                                                                                fileName: "[project]/app/dashboard/matchmaker/matchmaking/page.tsx",
                                                                                lineNumber: 732,
                                                                                columnNumber: 31
                                                                            }, this),
                                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                                                className: "jsx-e330f5047f16c9d3" + " " + "px-4 py-3 text-left",
                                                                                children: "Promotor"
                                                                            }, void 0, false, {
                                                                                fileName: "[project]/app/dashboard/matchmaker/matchmaking/page.tsx",
                                                                                lineNumber: 733,
                                                                                columnNumber: 31
                                                                            }, this),
                                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                                                className: "jsx-e330f5047f16c9d3" + " " + "px-4 py-3 text-left",
                                                                                children: "Bondteam"
                                                                            }, void 0, false, {
                                                                                fileName: "[project]/app/dashboard/matchmaker/matchmaking/page.tsx",
                                                                                lineNumber: 734,
                                                                                columnNumber: 31
                                                                            }, this),
                                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                                                className: "jsx-e330f5047f16c9d3" + " " + "px-4 py-3 text-left",
                                                                                children: "Status"
                                                                            }, void 0, false, {
                                                                                fileName: "[project]/app/dashboard/matchmaker/matchmaking/page.tsx",
                                                                                lineNumber: 735,
                                                                                columnNumber: 31
                                                                            }, this),
                                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                                                className: "jsx-e330f5047f16c9d3" + " " + "px-4 py-3 text-left",
                                                                                children: "Laatste run"
                                                                            }, void 0, false, {
                                                                                fileName: "[project]/app/dashboard/matchmaker/matchmaking/page.tsx",
                                                                                lineNumber: 736,
                                                                                columnNumber: 31
                                                                            }, this),
                                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                                                className: "jsx-e330f5047f16c9d3" + " " + "px-4 py-3 text-left",
                                                                                children: "Aangemaakt"
                                                                            }, void 0, false, {
                                                                                fileName: "[project]/app/dashboard/matchmaker/matchmaking/page.tsx",
                                                                                lineNumber: 737,
                                                                                columnNumber: 31
                                                                            }, this),
                                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                                                className: "jsx-e330f5047f16c9d3" + " " + "px-4 py-3 text-left",
                                                                                children: "Acties"
                                                                            }, void 0, false, {
                                                                                fileName: "[project]/app/dashboard/matchmaker/matchmaking/page.tsx",
                                                                                lineNumber: 738,
                                                                                columnNumber: 31
                                                                            }, this)
                                                                        ]
                                                                    }, void 0, true, {
                                                                        fileName: "[project]/app/dashboard/matchmaker/matchmaking/page.tsx",
                                                                        lineNumber: 729,
                                                                        columnNumber: 29
                                                                    }, this)
                                                                }, void 0, false, {
                                                                    fileName: "[project]/app/dashboard/matchmaker/matchmaking/page.tsx",
                                                                    lineNumber: 720,
                                                                    columnNumber: 27
                                                                }, this),
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("tbody", {
                                                                    className: "jsx-e330f5047f16c9d3",
                                                                    children: filteredRows.length === 0 ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("tr", {
                                                                        className: "jsx-e330f5047f16c9d3",
                                                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                                            colSpan: 9,
                                                                            style: {
                                                                                background: "#ffffff",
                                                                                color: "#555"
                                                                            },
                                                                            className: "jsx-e330f5047f16c9d3" + " " + "px-4 py-8 text-center text-sm",
                                                                            children: "Geen matchmakings gevonden met deze filters."
                                                                        }, void 0, false, {
                                                                            fileName: "[project]/app/dashboard/matchmaker/matchmaking/page.tsx",
                                                                            lineNumber: 745,
                                                                            columnNumber: 33
                                                                        }, this)
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/app/dashboard/matchmaker/matchmaking/page.tsx",
                                                                        lineNumber: 744,
                                                                        columnNumber: 31
                                                                    }, this) : filteredRows.map((r, i)=>{
                                                                        const zebra = i % 2 === 0;
                                                                        const rowBusy = busyId === r.id;
                                                                        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("tr", {
                                                                            style: {
                                                                                backgroundColor: zebra ? "#ffffff" : "#0d0d0d",
                                                                                color: zebra ? "#000" : "#fff"
                                                                            },
                                                                            className: "jsx-e330f5047f16c9d3",
                                                                            children: [
                                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                                                    className: "jsx-e330f5047f16c9d3" + " " + "px-4 py-3",
                                                                                    children: formatDate(r.datum)
                                                                                }, void 0, false, {
                                                                                    fileName: "[project]/app/dashboard/matchmaker/matchmaking/page.tsx",
                                                                                    lineNumber: 766,
                                                                                    columnNumber: 37
                                                                                }, this),
                                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                                                    className: "jsx-e330f5047f16c9d3" + " " + "px-4 py-3 font-semibold",
                                                                                    children: r.naam ?? "-"
                                                                                }, void 0, false, {
                                                                                    fileName: "[project]/app/dashboard/matchmaker/matchmaking/page.tsx",
                                                                                    lineNumber: 767,
                                                                                    columnNumber: 37
                                                                                }, this),
                                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                                                    className: "jsx-e330f5047f16c9d3" + " " + "px-4 py-3",
                                                                                    children: r.locatie ?? "-"
                                                                                }, void 0, false, {
                                                                                    fileName: "[project]/app/dashboard/matchmaker/matchmaking/page.tsx",
                                                                                    lineNumber: 770,
                                                                                    columnNumber: 37
                                                                                }, this),
                                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                                                    className: "jsx-e330f5047f16c9d3" + " " + "px-4 py-3",
                                                                                    children: r.promotor ?? "-"
                                                                                }, void 0, false, {
                                                                                    fileName: "[project]/app/dashboard/matchmaker/matchmaking/page.tsx",
                                                                                    lineNumber: 771,
                                                                                    columnNumber: 37
                                                                                }, this),
                                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                                                    className: "jsx-e330f5047f16c9d3" + " " + "px-4 py-3",
                                                                                    children: r.bondteam ?? "-"
                                                                                }, void 0, false, {
                                                                                    fileName: "[project]/app/dashboard/matchmaker/matchmaking/page.tsx",
                                                                                    lineNumber: 772,
                                                                                    columnNumber: 37
                                                                                }, this),
                                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                                                    className: "jsx-e330f5047f16c9d3" + " " + "px-4 py-3 italic",
                                                                                    children: formatStatusLabel(r.status)
                                                                                }, void 0, false, {
                                                                                    fileName: "[project]/app/dashboard/matchmaker/matchmaking/page.tsx",
                                                                                    lineNumber: 773,
                                                                                    columnNumber: 37
                                                                                }, this),
                                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                                                    className: "jsx-e330f5047f16c9d3" + " " + "px-4 py-3 italic",
                                                                                    children: formatStatusLabel(effectiveStatus(r))
                                                                                }, void 0, false, {
                                                                                    fileName: "[project]/app/dashboard/matchmaker/matchmaking/page.tsx",
                                                                                    lineNumber: 776,
                                                                                    columnNumber: 37
                                                                                }, this),
                                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                                                    className: "jsx-e330f5047f16c9d3" + " " + "px-4 py-3 text-sm",
                                                                                    children: formatDateTime(r.created_at)
                                                                                }, void 0, false, {
                                                                                    fileName: "[project]/app/dashboard/matchmaker/matchmaking/page.tsx",
                                                                                    lineNumber: 779,
                                                                                    columnNumber: 37
                                                                                }, this),
                                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                                                    className: "jsx-e330f5047f16c9d3" + " " + "px-4 py-3",
                                                                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                                        className: "jsx-e330f5047f16c9d3" + " " + "flex flex-wrap items-center gap-3",
                                                                                        children: [
                                                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                                                                                                href: `/dashboard/matchmaker/matchmaking/upload?matchmaking_id=${r.id}`,
                                                                                                className: "rounded border border-[var(--brand-orange)] bg-[#2f2f33] px-3 py-1 text-sm text-white hover:bg-[var(--brand-orange)] hover:text-black",
                                                                                                children: "Upload"
                                                                                            }, void 0, false, {
                                                                                                fileName: "[project]/app/dashboard/matchmaker/matchmaking/page.tsx",
                                                                                                lineNumber: 784,
                                                                                                columnNumber: 41
                                                                                            }, this),
                                                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                                                                                                href: `/dashboard/matchmaker/matchmaking/${r.id}/match?matchmaking_id=${r.id}`,
                                                                                                className: "rounded border border-[var(--brand-orange)] bg-[#2f2f33] px-3 py-1 text-sm text-white hover:bg-[var(--brand-orange)] hover:text-black",
                                                                                                children: "Matchen"
                                                                                            }, void 0, false, {
                                                                                                fileName: "[project]/app/dashboard/matchmaker/matchmaking/page.tsx",
                                                                                                lineNumber: 791,
                                                                                                columnNumber: 41
                                                                                            }, this),
                                                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                                                                                                href: `/dashboard/matchmaker/matchmaking/${r.id}`,
                                                                                                className: "rounded border border-zinc-300 bg-[#2f2f33] px-3 py-1 text-sm text-white hover:bg-white hover:text-black",
                                                                                                children: "Matchmaking"
                                                                                            }, void 0, false, {
                                                                                                fileName: "[project]/app/dashboard/matchmaker/matchmaking/page.tsx",
                                                                                                lineNumber: 798,
                                                                                                columnNumber: 41
                                                                                            }, this),
                                                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                                                                onClick: ()=>deleteMM(r.id),
                                                                                                disabled: rowBusy,
                                                                                                className: "jsx-e330f5047f16c9d3" + " " + "rounded border border-red-600 bg-[#2f2f33] px-3 py-1 text-sm text-red-200 hover:bg-red-600 hover:text-white disabled:opacity-60",
                                                                                                children: rowBusy ? "Bezig…" : "Verwijderen"
                                                                                            }, void 0, false, {
                                                                                                fileName: "[project]/app/dashboard/matchmaker/matchmaking/page.tsx",
                                                                                                lineNumber: 805,
                                                                                                columnNumber: 41
                                                                                            }, this)
                                                                                        ]
                                                                                    }, void 0, true, {
                                                                                        fileName: "[project]/app/dashboard/matchmaker/matchmaking/page.tsx",
                                                                                        lineNumber: 783,
                                                                                        columnNumber: 39
                                                                                    }, this)
                                                                                }, void 0, false, {
                                                                                    fileName: "[project]/app/dashboard/matchmaker/matchmaking/page.tsx",
                                                                                    lineNumber: 782,
                                                                                    columnNumber: 37
                                                                                }, this)
                                                                            ]
                                                                        }, r.id, true, {
                                                                            fileName: "[project]/app/dashboard/matchmaker/matchmaking/page.tsx",
                                                                            lineNumber: 759,
                                                                            columnNumber: 35
                                                                        }, this);
                                                                    })
                                                                }, void 0, false, {
                                                                    fileName: "[project]/app/dashboard/matchmaker/matchmaking/page.tsx",
                                                                    lineNumber: 742,
                                                                    columnNumber: 27
                                                                }, this)
                                                            ]
                                                        }, void 0, true, {
                                                            fileName: "[project]/app/dashboard/matchmaker/matchmaking/page.tsx",
                                                            lineNumber: 719,
                                                            columnNumber: 25
                                                        }, this)
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/dashboard/matchmaker/matchmaking/page.tsx",
                                                        lineNumber: 718,
                                                        columnNumber: 23
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/app/dashboard/matchmaker/matchmaking/page.tsx",
                                                lineNumber: 704,
                                                columnNumber: 21
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                className: "jsx-e330f5047f16c9d3" + " " + "mt-7 text-center text-xs text-zinc-500",
                                                children: "© FightSupport"
                                            }, void 0, false, {
                                                fileName: "[project]/app/dashboard/matchmaker/matchmaking/page.tsx",
                                                lineNumber: 824,
                                                columnNumber: 19
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/app/dashboard/matchmaker/matchmaking/page.tsx",
                                        lineNumber: 470,
                                        columnNumber: 17
                                    }, this)
                                }, void 0, false, {
                                    fileName: "[project]/app/dashboard/matchmaker/matchmaking/page.tsx",
                                    lineNumber: 466,
                                    columnNumber: 15
                                }, this)
                            }, void 0, false, {
                                fileName: "[project]/app/dashboard/matchmaker/matchmaking/page.tsx",
                                lineNumber: 465,
                                columnNumber: 13
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/app/dashboard/matchmaker/matchmaking/page.tsx",
                        lineNumber: 387,
                        columnNumber: 11
                    }, this)
                }, void 0, false, {
                    fileName: "[project]/app/dashboard/matchmaker/matchmaking/page.tsx",
                    lineNumber: 376,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$styled$2d$jsx$2f$style$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                    id: "e330f5047f16c9d3",
                    children: `:root{--brand-orange:${NVB_ORANGE}}.orange-input{color:#111;background:#ffffffe6;border:1px solid #ff4d0059;border-radius:10px;outline:none;padding:0 10px}.orange-input:focus{border-color:#ff4d00bf;box-shadow:0 0 0 3px #ff4d002e}`
                }, void 0, false, void 0, this)
            ]
        }, void 0, true, {
            fileName: "[project]/app/dashboard/matchmaker/matchmaking/page.tsx",
            lineNumber: 375,
            columnNumber: 7
        }, this)
    }, void 0, false, {
        fileName: "[project]/app/dashboard/matchmaker/matchmaking/page.tsx",
        lineNumber: 374,
        columnNumber: 5
    }, this);
}
_s(MatchmakingOverzichtPage, "NmJfJH4IelWx7JoGRFE4pY36AI0=");
_c1 = MatchmakingOverzichtPage;
var _c, _c1;
__turbopack_context__.k.register(_c, "Small");
__turbopack_context__.k.register(_c1, "MatchmakingOverzichtPage");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
]);

//# sourceMappingURL=_ddae1657._.js.map