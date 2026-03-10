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
const NVB_ORANGE = "#ff4d00";
// Shared "silver backplate" look that matches the detail flow.
const silverBackplate = {
    background: "radial-gradient(circle at 50% 0%, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0.16) 38%, rgba(0,0,0,0.08) 72%, rgba(0,0,0,0.22) 100%), linear-gradient(180deg, rgba(255,255,255,0.92) 0%, rgba(236,238,242,0.98) 100%)"
};
function formatDate(v) {
    if (!v) return "-";
    return new Date(v).toLocaleDateString("nl-NL");
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
        lineNumber: 61,
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
    const [saveMsg, setSaveMsg] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])("");
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    async function load() {
        setLoading(true);
        setSaveMsg("");
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
        bondteam
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
        setSaveMsg("");
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
            setSaveMsg("");
            if (!editMatchmaker.trim()) {
                setSaveMsg("⚠️ Matchmaker is verplicht.");
                return;
            }
            const { error } = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabaseClient$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["supabase"].from("matchmaking_uploads").update({
                matchmaker: editMatchmaker.trim(),
                promotor: editPromotor.trim() || null,
                bondteam: editBondteam.trim() || null
            }).eq("id", uploadId);
            if (error) {
                console.error("Update upload meta error:", error);
                setSaveMsg("❌ Opslaan mislukt.");
                return;
            }
            setSaveMsg("✅ Opgeslagen.");
            await load();
            closeEdit();
        } catch (e) {
            console.error(e);
            setSaveMsg("❌ Onverwachte fout bij opslaan.");
        }
    }
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("main", {
        className: "min-h-screen px-4 py-6",
        style: {
            background: "#eef0f3"
        },
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "mx-auto w-full max-w-[1500px]",
            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "rounded-[32px] p-[6px]",
                style: {
                    background: "linear-gradient(180deg, #f8f8f8 0%, #d8d8d8 22%, #8f8f8f 55%, #f0f0f0 100%)",
                    boxShadow: `
              0 0 0 1px rgba(255,255,255,0.7),
              0 22px 70px rgba(0,0,0,0.9)
            `
                },
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "relative rounded-[28px] overflow-hidden",
                    style: {
                        background: "linear-gradient(180deg, #f8fafc 0%, #eef2f7 100%)",
                        border: "3px solid rgba(63,63,70,0.35)",
                        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.9)"
                    },
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "px-6 py-5",
                            style: {
                                background: "linear-gradient(180deg, #3a3a3f 0%, #2a2a2e 100%)",
                                borderBottom: `3px solid rgba(255,77,0,0.55)`
                            },
                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "grid grid-cols-3 items-center gap-4",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "justify-self-start leading-tight",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "font-extrabold tracking-[0.20em]",
                                                style: {
                                                    fontSize: 14,
                                                    letterSpacing: "0.22em",
                                                    textTransform: "uppercase",
                                                    background: "linear-gradient(180deg, rgba(255,255,255,0.95) 0%, rgba(230,230,230,0.75) 35%, rgba(150,150,150,0.55) 100%)",
                                                    WebkitBackgroundClip: "text",
                                                    WebkitTextFillColor: "transparent",
                                                    textShadow: "0 10px 26px rgba(0,0,0,0.35)"
                                                },
                                                children: "FIGHTSUPPORT"
                                            }, void 0, false, {
                                                fileName: "[project]/app/dashboard/admin/controle/page.tsx",
                                                lineNumber: 320,
                                                columnNumber: 19
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "text-xs text-white/70",
                                                children: "Vechtsport ondersteuning"
                                            }, void 0, false, {
                                                fileName: "[project]/app/dashboard/admin/controle/page.tsx",
                                                lineNumber: 335,
                                                columnNumber: 19
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "mt-3 flex flex-wrap gap-2 items-center",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(Small, {
                                                        origin: "left center",
                                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$NvbLightButton$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"], {
                                                            label: "← Terug naar Admin",
                                                            onClick: ()=>window.location.href = "/dashboard/admin"
                                                        }, void 0, false, {
                                                            fileName: "[project]/app/dashboard/admin/controle/page.tsx",
                                                            lineNumber: 342,
                                                            columnNumber: 23
                                                        }, this)
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/dashboard/admin/controle/page.tsx",
                                                        lineNumber: 341,
                                                        columnNumber: 21
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(Small, {
                                                        origin: "left center",
                                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$NvbDarkButton$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"], {
                                                            label: "Upload MM",
                                                            onClick: ()=>window.location.href = "/dashboard/admin/upload"
                                                        }, void 0, false, {
                                                            fileName: "[project]/app/dashboard/admin/controle/page.tsx",
                                                            lineNumber: 349,
                                                            columnNumber: 23
                                                        }, this)
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/dashboard/admin/controle/page.tsx",
                                                        lineNumber: 348,
                                                        columnNumber: 21
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/app/dashboard/admin/controle/page.tsx",
                                                lineNumber: 340,
                                                columnNumber: 19
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/app/dashboard/admin/controle/page.tsx",
                                        lineNumber: 319,
                                        columnNumber: 17
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "justify-self-center",
                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "rounded-[28px] p-[6px]",
                                            style: {
                                                background: "linear-gradient(180deg, #f5f5f5 0%, #cfcfcf 35%, #8f8f8f 65%, #f0f0f0 100%)",
                                                boxShadow: `
                        0 0 0 1px rgba(255,255,255,0.70),
                        0 12px 28px rgba(0,0,0,0.70)
                      `
                                            },
                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "rounded-[22px] p-3",
                                                style: {
                                                    background: "linear-gradient(180deg, rgba(12,12,12,0.96), rgba(4,4,4,0.96))",
                                                    border: "3px solid rgba(220,220,220,0.50)",
                                                    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.10)"
                                                },
                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$image$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"], {
                                                    src: "/branding/fightsupport/logo-dark.png",
                                                    alt: "FightSupport",
                                                    width: 120,
                                                    height: 120,
                                                    priority: true
                                                }, void 0, false, {
                                                    fileName: "[project]/app/dashboard/admin/controle/page.tsx",
                                                    lineNumber: 379,
                                                    columnNumber: 23
                                                }, this)
                                            }, void 0, false, {
                                                fileName: "[project]/app/dashboard/admin/controle/page.tsx",
                                                lineNumber: 370,
                                                columnNumber: 21
                                            }, this)
                                        }, void 0, false, {
                                            fileName: "[project]/app/dashboard/admin/controle/page.tsx",
                                            lineNumber: 359,
                                            columnNumber: 19
                                        }, this)
                                    }, void 0, false, {
                                        fileName: "[project]/app/dashboard/admin/controle/page.tsx",
                                        lineNumber: 358,
                                        columnNumber: 17
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "justify-self-end flex flex-col items-end gap-2",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                onClick: runSportscholen,
                                                disabled: sportsBusy,
                                                className: "px-3 py-2 text-sm bg-[#2f2f33] border border-[var(--brand-orange)] text-white rounded hover:bg-[var(--brand-orange)] hover:text-black disabled:opacity-60",
                                                title: "Update sportscholen tabel (keurmerk data)",
                                                children: sportsBusy ? "Sportscholen…" : "Sportscholen sync"
                                            }, void 0, false, {
                                                fileName: "[project]/app/dashboard/admin/controle/page.tsx",
                                                lineNumber: 392,
                                                columnNumber: 19
                                            }, this),
                                            sportsMsg ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                className: "text-xs",
                                                style: {
                                                    color: "var(--brand-orange)"
                                                },
                                                children: sportsMsg
                                            }, void 0, false, {
                                                fileName: "[project]/app/dashboard/admin/controle/page.tsx",
                                                lineNumber: 401,
                                                columnNumber: 21
                                            }, this) : null
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/app/dashboard/admin/controle/page.tsx",
                                        lineNumber: 391,
                                        columnNumber: 17
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/app/dashboard/admin/controle/page.tsx",
                                lineNumber: 317,
                                columnNumber: 15
                            }, this)
                        }, void 0, false, {
                            fileName: "[project]/app/dashboard/admin/controle/page.tsx",
                            lineNumber: 310,
                            columnNumber: 13
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "px-4 md:px-6 py-6",
                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "rounded-3xl border-2 border-zinc-500/60 p-4 md:p-5 shadow-[0_22px_60px_rgba(24,24,27,0.12)] ring-1 ring-white/50",
                                style: silverBackplate,
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "px-2 md:px-3 py-2",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "mt-2 text-center",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h1", {
                                                    className: "text-4xl md:text-5xl font-extrabold tracking-wide",
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
                                                    children: "Controle Overzicht"
                                                }, void 0, false, {
                                                    fileName: "[project]/app/dashboard/admin/controle/page.tsx",
                                                    lineNumber: 418,
                                                    columnNumber: 21
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "mx-auto mt-4 mb-3",
                                                    style: {
                                                        width: 200,
                                                        height: 4,
                                                        borderRadius: 999,
                                                        background: `linear-gradient(90deg, ${NVB_ORANGE} 0%, #ff7a1a 50%, ${NVB_ORANGE} 100%)`,
                                                        boxShadow: "0 0 16px rgba(255,77,0,0.65)"
                                                    }
                                                }, void 0, false, {
                                                    fileName: "[project]/app/dashboard/admin/controle/page.tsx",
                                                    lineNumber: 434,
                                                    columnNumber: 21
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                    className: "mt-2 text-sm md:text-base text-zinc-700",
                                                    children: "Matchmakings ter controle"
                                                }, void 0, false, {
                                                    fileName: "[project]/app/dashboard/admin/controle/page.tsx",
                                                    lineNumber: 445,
                                                    columnNumber: 21
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/app/dashboard/admin/controle/page.tsx",
                                            lineNumber: 417,
                                            columnNumber: 19
                                        }, this),
                                        loading ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                            className: "text-gray-500 mt-6 text-center",
                                            children: "Laden…"
                                        }, void 0, false, {
                                            fileName: "[project]/app/dashboard/admin/controle/page.tsx",
                                            lineNumber: 451,
                                            columnNumber: 21
                                        }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "mt-6 overflow-hidden rounded-2xl",
                                            style: {
                                                border: "2px solid rgba(230,230,230,0.55)",
                                                background: "linear-gradient(180deg, rgba(18,18,18,0.18) 0%, rgba(10,10,10,0.22) 100%)",
                                                boxShadow: "inset 0 1px 0 rgba(255,255,255,0.12)"
                                            },
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "h-[3px]",
                                                    style: {
                                                        background: "rgba(255,77,0,0.75)"
                                                    }
                                                }, void 0, false, {
                                                    fileName: "[project]/app/dashboard/admin/controle/page.tsx",
                                                    lineNumber: 462,
                                                    columnNumber: 23
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "overflow-x-auto",
                                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("table", {
                                                        className: "min-w-full border-collapse",
                                                        children: [
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("thead", {
                                                                style: {
                                                                    background: "linear-gradient(180deg, #3a3a3f 0%, #2a2a2e 100%)",
                                                                    color: "#fff",
                                                                    borderBottom: "2px solid rgba(255,77,0,0.55)"
                                                                },
                                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("tr", {
                                                                    children: [
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                                            className: "py-3 px-4 text-left",
                                                                            children: "Datum"
                                                                        }, void 0, false, {
                                                                            fileName: "[project]/app/dashboard/admin/controle/page.tsx",
                                                                            lineNumber: 478,
                                                                            columnNumber: 31
                                                                        }, this),
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                                            className: "py-3 px-4 text-left",
                                                                            children: "Evenement"
                                                                        }, void 0, false, {
                                                                            fileName: "[project]/app/dashboard/admin/controle/page.tsx",
                                                                            lineNumber: 479,
                                                                            columnNumber: 31
                                                                        }, this),
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                                            className: "py-3 px-4 text-left",
                                                                            children: "Locatie"
                                                                        }, void 0, false, {
                                                                            fileName: "[project]/app/dashboard/admin/controle/page.tsx",
                                                                            lineNumber: 480,
                                                                            columnNumber: 31
                                                                        }, this),
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                                            className: "py-3 px-4 text-left",
                                                                            children: "Matchmaker"
                                                                        }, void 0, false, {
                                                                            fileName: "[project]/app/dashboard/admin/controle/page.tsx",
                                                                            lineNumber: 481,
                                                                            columnNumber: 31
                                                                        }, this),
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                                            className: "py-3 px-4 text-left",
                                                                            children: "Promotor"
                                                                        }, void 0, false, {
                                                                            fileName: "[project]/app/dashboard/admin/controle/page.tsx",
                                                                            lineNumber: 482,
                                                                            columnNumber: 31
                                                                        }, this),
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                                            className: "py-3 px-4 text-left",
                                                                            children: "Bondteam"
                                                                        }, void 0, false, {
                                                                            fileName: "[project]/app/dashboard/admin/controle/page.tsx",
                                                                            lineNumber: 483,
                                                                            columnNumber: 31
                                                                        }, this),
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                                            className: "py-3 px-4 text-left",
                                                                            children: "Status"
                                                                        }, void 0, false, {
                                                                            fileName: "[project]/app/dashboard/admin/controle/page.tsx",
                                                                            lineNumber: 484,
                                                                            columnNumber: 31
                                                                        }, this),
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                                            className: "py-3 px-4 text-left",
                                                                            children: "Acties"
                                                                        }, void 0, false, {
                                                                            fileName: "[project]/app/dashboard/admin/controle/page.tsx",
                                                                            lineNumber: 485,
                                                                            columnNumber: 31
                                                                        }, this)
                                                                    ]
                                                                }, void 0, true, {
                                                                    fileName: "[project]/app/dashboard/admin/controle/page.tsx",
                                                                    lineNumber: 477,
                                                                    columnNumber: 29
                                                                }, this)
                                                            }, void 0, false, {
                                                                fileName: "[project]/app/dashboard/admin/controle/page.tsx",
                                                                lineNumber: 469,
                                                                columnNumber: 27
                                                            }, this),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("tbody", {
                                                                children: rows.map((r, i)=>{
                                                                    const zebra = i % 2 === 0;
                                                                    const run = r.laatste_run;
                                                                    const hasMatchmaking = !!r.matchmaking_id;
                                                                    const canView = hasMatchmaking && run?.status === "klaar";
                                                                    const isEditing = editId === r.id;
                                                                    const mmId = r.matchmaking_id ?? "";
                                                                    const rowBusy = busyId === mmId;
                                                                    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("tr", {
                                                                        style: {
                                                                            backgroundColor: zebra ? "#ffffff" : "#0d0d0d",
                                                                            color: zebra ? "#000" : "#fff"
                                                                        },
                                                                        children: [
                                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                                                className: "py-3 px-4",
                                                                                children: formatDate(r.evenement_datum)
                                                                            }, void 0, false, {
                                                                                fileName: "[project]/app/dashboard/admin/controle/page.tsx",
                                                                                lineNumber: 509,
                                                                                columnNumber: 35
                                                                            }, this),
                                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                                                className: "py-3 px-4 font-semibold",
                                                                                children: r.evenement_naam ?? "-"
                                                                            }, void 0, false, {
                                                                                fileName: "[project]/app/dashboard/admin/controle/page.tsx",
                                                                                lineNumber: 512,
                                                                                columnNumber: 35
                                                                            }, this),
                                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                                                className: "py-3 px-4",
                                                                                children: r.locatie ?? "-"
                                                                            }, void 0, false, {
                                                                                fileName: "[project]/app/dashboard/admin/controle/page.tsx",
                                                                                lineNumber: 515,
                                                                                columnNumber: 35
                                                                            }, this),
                                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                                                className: "py-3 px-4",
                                                                                children: isEditing ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                                                    className: "w-full orange-input h-9",
                                                                                    value: editMatchmaker,
                                                                                    onChange: (e)=>setEditMatchmaker(e.target.value),
                                                                                    placeholder: "Matchmaker *"
                                                                                }, void 0, false, {
                                                                                    fileName: "[project]/app/dashboard/admin/controle/page.tsx",
                                                                                    lineNumber: 519,
                                                                                    columnNumber: 39
                                                                                }, this) : r.matchmaker ?? "-"
                                                                            }, void 0, false, {
                                                                                fileName: "[project]/app/dashboard/admin/controle/page.tsx",
                                                                                lineNumber: 517,
                                                                                columnNumber: 35
                                                                            }, this),
                                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                                                className: "py-3 px-4",
                                                                                children: isEditing ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                                                    className: "w-full orange-input h-9",
                                                                                    value: editPromotor,
                                                                                    onChange: (e)=>setEditPromotor(e.target.value),
                                                                                    placeholder: "Promotor (optioneel)"
                                                                                }, void 0, false, {
                                                                                    fileName: "[project]/app/dashboard/admin/controle/page.tsx",
                                                                                    lineNumber: 534,
                                                                                    columnNumber: 39
                                                                                }, this) : r.promotor ?? "-"
                                                                            }, void 0, false, {
                                                                                fileName: "[project]/app/dashboard/admin/controle/page.tsx",
                                                                                lineNumber: 532,
                                                                                columnNumber: 35
                                                                            }, this),
                                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                                                className: "py-3 px-4",
                                                                                children: isEditing ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                                                    className: "w-full orange-input h-9",
                                                                                    value: editBondteam,
                                                                                    onChange: (e)=>setEditBondteam(e.target.value),
                                                                                    placeholder: "Bondteam (optioneel)"
                                                                                }, void 0, false, {
                                                                                    fileName: "[project]/app/dashboard/admin/controle/page.tsx",
                                                                                    lineNumber: 549,
                                                                                    columnNumber: 39
                                                                                }, this) : r.bondteam ?? "-"
                                                                            }, void 0, false, {
                                                                                fileName: "[project]/app/dashboard/admin/controle/page.tsx",
                                                                                lineNumber: 547,
                                                                                columnNumber: 35
                                                                            }, this),
                                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                                                className: "py-3 px-4 italic",
                                                                                children: run?.status ?? "nog niet gecontroleerd"
                                                                            }, void 0, false, {
                                                                                fileName: "[project]/app/dashboard/admin/controle/page.tsx",
                                                                                lineNumber: 562,
                                                                                columnNumber: 35
                                                                            }, this),
                                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                                                className: "py-3 px-4",
                                                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                                    className: "flex flex-wrap gap-3 items-center",
                                                                                    children: [
                                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"], {
                                                                                            href: hasMatchmaking ? `/dashboard/admin/controle/${r.matchmaking_id}` : "#",
                                                                                            className: [
                                                                                                "px-3 py-1 text-sm rounded border",
                                                                                                canView ? "bg-[#2f2f33] border-[var(--brand-orange)] text-white hover:bg-[var(--brand-orange)] hover:text-black" : "bg-zinc-200 border-zinc-300 text-zinc-400 cursor-not-allowed pointer-events-none"
                                                                                            ].join(" "),
                                                                                            "aria-disabled": !canView,
                                                                                            tabIndex: canView ? 0 : -1,
                                                                                            children: "Matchmaking"
                                                                                        }, void 0, false, {
                                                                                            fileName: "[project]/app/dashboard/admin/controle/page.tsx",
                                                                                            lineNumber: 568,
                                                                                            columnNumber: 39
                                                                                        }, this),
                                                                                        hasMatchmaking && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                                                            onClick: ()=>startControle(r.matchmaking_id),
                                                                                            disabled: rowBusy || isBusy,
                                                                                            className: "px-3 py-1 text-sm bg-[#2f2f33] border border-[var(--brand-orange)] text-white rounded hover:bg-[var(--brand-orange)] hover:text-black disabled:opacity-60",
                                                                                            title: "Start volledige controle: scrape + build + enrich + rules (nieuwe run)",
                                                                                            children: rowBusy ? "Bezig…" : "Start controle"
                                                                                        }, void 0, false, {
                                                                                            fileName: "[project]/app/dashboard/admin/controle/page.tsx",
                                                                                            lineNumber: 587,
                                                                                            columnNumber: 41
                                                                                        }, this),
                                                                                        !isEditing ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                                                            onClick: ()=>openEdit(r),
                                                                                            className: "px-3 py-1 text-sm bg-[#2f2f33] border border-zinc-300 text-white rounded hover:bg-white hover:text-black",
                                                                                            children: "Bewerken"
                                                                                        }, void 0, false, {
                                                                                            fileName: "[project]/app/dashboard/admin/controle/page.tsx",
                                                                                            lineNumber: 600,
                                                                                            columnNumber: 41
                                                                                        }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Fragment"], {
                                                                                            children: [
                                                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                                                                    onClick: ()=>saveEdit(r.id),
                                                                                                    className: "px-3 py-1 text-sm bg-[#2f2f33] border border-[var(--brand-orange)] text-white rounded hover:bg-[var(--brand-orange)] hover:text-black",
                                                                                                    children: "Opslaan"
                                                                                                }, void 0, false, {
                                                                                                    fileName: "[project]/app/dashboard/admin/controle/page.tsx",
                                                                                                    lineNumber: 608,
                                                                                                    columnNumber: 43
                                                                                                }, this),
                                                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                                                                    onClick: closeEdit,
                                                                                                    className: "px-3 py-1 text-sm bg-[#2f2f33] border border-zinc-300 text-white rounded hover:bg-white hover:text-black",
                                                                                                    children: "Annuleren"
                                                                                                }, void 0, false, {
                                                                                                    fileName: "[project]/app/dashboard/admin/controle/page.tsx",
                                                                                                    lineNumber: 614,
                                                                                                    columnNumber: 43
                                                                                                }, this)
                                                                                            ]
                                                                                        }, void 0, true),
                                                                                        hasMatchmaking && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                                                            onClick: ()=>deleteMatchmaking(r.matchmaking_id),
                                                                                            disabled: rowBusy || isBusy,
                                                                                            className: "px-3 py-1 text-sm bg-[#2f2f33] border border-red-600 text-red-200 rounded hover:bg-red-600 hover:text-white disabled:opacity-60",
                                                                                            title: "Verwijdert uploads, bouts, uitslagen_raw en alle controle-data voor deze matchmaking",
                                                                                            children: rowBusy ? "Bezig…" : "Verwijderen"
                                                                                        }, void 0, false, {
                                                                                            fileName: "[project]/app/dashboard/admin/controle/page.tsx",
                                                                                            lineNumber: 624,
                                                                                            columnNumber: 41
                                                                                        }, this),
                                                                                        isEditing && saveMsg && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                                            className: "text-xs",
                                                                                            style: {
                                                                                                color: zebra ? "var(--brand-orange)" : "#ffb38a"
                                                                                            },
                                                                                            children: saveMsg
                                                                                        }, void 0, false, {
                                                                                            fileName: "[project]/app/dashboard/admin/controle/page.tsx",
                                                                                            lineNumber: 637,
                                                                                            columnNumber: 41
                                                                                        }, this)
                                                                                    ]
                                                                                }, void 0, true, {
                                                                                    fileName: "[project]/app/dashboard/admin/controle/page.tsx",
                                                                                    lineNumber: 567,
                                                                                    columnNumber: 37
                                                                                }, this)
                                                                            }, void 0, false, {
                                                                                fileName: "[project]/app/dashboard/admin/controle/page.tsx",
                                                                                lineNumber: 566,
                                                                                columnNumber: 35
                                                                            }, this)
                                                                        ]
                                                                    }, r.id, true, {
                                                                        fileName: "[project]/app/dashboard/admin/controle/page.tsx",
                                                                        lineNumber: 502,
                                                                        columnNumber: 33
                                                                    }, this);
                                                                })
                                                            }, void 0, false, {
                                                                fileName: "[project]/app/dashboard/admin/controle/page.tsx",
                                                                lineNumber: 489,
                                                                columnNumber: 27
                                                            }, this)
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/app/dashboard/admin/controle/page.tsx",
                                                        lineNumber: 468,
                                                        columnNumber: 25
                                                    }, this)
                                                }, void 0, false, {
                                                    fileName: "[project]/app/dashboard/admin/controle/page.tsx",
                                                    lineNumber: 467,
                                                    columnNumber: 23
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/app/dashboard/admin/controle/page.tsx",
                                            lineNumber: 453,
                                            columnNumber: 21
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                            className: "mt-7 text-xs text-center text-zinc-500",
                                            children: "© FightSupport"
                                        }, void 0, false, {
                                            fileName: "[project]/app/dashboard/admin/controle/page.tsx",
                                            lineNumber: 659,
                                            columnNumber: 19
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/app/dashboard/admin/controle/page.tsx",
                                    lineNumber: 415,
                                    columnNumber: 17
                                }, this)
                            }, void 0, false, {
                                fileName: "[project]/app/dashboard/admin/controle/page.tsx",
                                lineNumber: 411,
                                columnNumber: 15
                            }, this)
                        }, void 0, false, {
                            fileName: "[project]/app/dashboard/admin/controle/page.tsx",
                            lineNumber: 410,
                            columnNumber: 13
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/app/dashboard/admin/controle/page.tsx",
                    lineNumber: 301,
                    columnNumber: 11
                }, this)
            }, void 0, false, {
                fileName: "[project]/app/dashboard/admin/controle/page.tsx",
                lineNumber: 290,
                columnNumber: 9
            }, this)
        }, void 0, false, {
            fileName: "[project]/app/dashboard/admin/controle/page.tsx",
            lineNumber: 288,
            columnNumber: 7
        }, this)
    }, void 0, false, {
        fileName: "[project]/app/dashboard/admin/controle/page.tsx",
        lineNumber: 287,
        columnNumber: 5
    }, this);
}
}),
];

//# sourceMappingURL=_521a623c._.js.map