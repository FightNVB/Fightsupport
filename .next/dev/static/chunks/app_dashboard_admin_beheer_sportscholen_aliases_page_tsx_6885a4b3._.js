(globalThis.TURBOPACK || (globalThis.TURBOPACK = [])).push([typeof document === "object" ? document.currentScript : undefined,
"[project]/app/dashboard/admin/beheer/sportscholen/aliases/page.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>SportschoolAliasesPage
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$image$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/image.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/navigation.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabaseClient$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/supabaseClient.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$app$2f$context$2f$AuthContext$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/app/context/AuthContext.tsx [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
"use client";
;
;
;
;
;
const ORANGE = "#ff4d00";
const BORDER = "#2b2b2b";
const PAGE_BG = "radial-gradient(900px 520px at 18% 0%, rgba(255,77,0,0.14), transparent 56%), radial-gradient(780px 520px at 82% 18%, rgba(255,255,255,0.80), transparent 62%), linear-gradient(180deg,#f6f6f6 0%, #e7e7e7 55%, #d4d4d4 100%)";
const PANEL_BG = "linear-gradient(180deg,#ffffff 0%, #f2f2f2 55%, #e7e7e7 100%)";
const PANEL_BG_SOFT = "linear-gradient(180deg,#fbfbfb 0%, #efefef 55%, #e2e2e2 100%)";
const PANEL_SHADOW = "0 12px 28px rgba(0,0,0,0.16), inset 0 0 0 2px rgba(255,255,255,0.70)";
const PAGE_SIZE = 50;
function Shell({ children }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("main", {
        className: "min-h-screen px-4 py-6",
        style: {
            background: PAGE_BG
        },
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "mx-auto w-full max-w-6xl",
            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "rounded-[36px] p-[10px]",
                style: {
                    background: "linear-gradient(180deg,#f8f8f8 0%, #d6d6d6 55%, #bdbdbd 100%)",
                    boxShadow: "0 20px 70px rgba(0,0,0,0.35)"
                },
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "rounded-[28px] overflow-hidden",
                    style: {
                        border: `4px solid ${BORDER}`,
                        background: "linear-gradient(180deg,#fbfbfb 0%, #f1f1f1 50%, #e7e7e7 100%)"
                    },
                    children: children
                }, void 0, false, {
                    fileName: "[project]/app/dashboard/admin/beheer/sportscholen/aliases/page.tsx",
                    lineNumber: 45,
                    columnNumber: 11
                }, this)
            }, void 0, false, {
                fileName: "[project]/app/dashboard/admin/beheer/sportscholen/aliases/page.tsx",
                lineNumber: 38,
                columnNumber: 9
            }, this)
        }, void 0, false, {
            fileName: "[project]/app/dashboard/admin/beheer/sportscholen/aliases/page.tsx",
            lineNumber: 37,
            columnNumber: 7
        }, this)
    }, void 0, false, {
        fileName: "[project]/app/dashboard/admin/beheer/sportscholen/aliases/page.tsx",
        lineNumber: 36,
        columnNumber: 5
    }, this);
}
_c = Shell;
function Header({ onBack, onDashboard }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "relative px-6 py-6",
        style: {
            background: "linear-gradient(180deg,#3a3a3a 0%, #1f1f1f 55%, #141414 100%)",
            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.10), 0 10px 26px rgba(0,0,0,0.35)",
            borderBottom: "3px solid rgba(255,77,0,0.35)"
        },
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "pointer-events-none absolute inset-x-0 top-0 h-10",
                style: {
                    background: "linear-gradient(90deg, transparent 0%, rgba(255,77,0,0.18) 35%, rgba(255,77,0,0.05) 65%, transparent 100%)"
                }
            }, void 0, false, {
                fileName: "[project]/app/dashboard/admin/beheer/sportscholen/aliases/page.tsx",
                lineNumber: 70,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "flex items-center justify-between gap-4",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                style: {
                                    color: ORANGE,
                                    letterSpacing: "0.14em",
                                    fontWeight: 800
                                },
                                children: "FIGHTSUPPORT"
                            }, void 0, false, {
                                fileName: "[project]/app/dashboard/admin/beheer/sportscholen/aliases/page.tsx",
                                lineNumber: 79,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "text-sm",
                                style: {
                                    color: "rgba(255,255,255,0.70)"
                                },
                                children: "Vechtsport ondersteuning"
                            }, void 0, false, {
                                fileName: "[project]/app/dashboard/admin/beheer/sportscholen/aliases/page.tsx",
                                lineNumber: 80,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/app/dashboard/admin/beheer/sportscholen/aliases/page.tsx",
                        lineNumber: 78,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "absolute left-1/2 -translate-x-1/2",
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "rounded-[22px] p-[6px]",
                            style: {
                                background: "linear-gradient(180deg,#fefefe,#cfcfcf)",
                                boxShadow: "0 10px 24px rgba(0,0,0,0.55)"
                            },
                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "rounded-[18px] p-[6px]",
                                style: {
                                    border: `3px solid ${BORDER}`,
                                    background: "linear-gradient(180deg,#111,#000)"
                                },
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$image$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                                    src: "/branding/fightsupport/logo-dark.png",
                                    width: 84,
                                    height: 84,
                                    alt: "FightSupport",
                                    priority: true
                                }, void 0, false, {
                                    fileName: "[project]/app/dashboard/admin/beheer/sportscholen/aliases/page.tsx",
                                    lineNumber: 86,
                                    columnNumber: 15
                                }, this)
                            }, void 0, false, {
                                fileName: "[project]/app/dashboard/admin/beheer/sportscholen/aliases/page.tsx",
                                lineNumber: 85,
                                columnNumber: 13
                            }, this)
                        }, void 0, false, {
                            fileName: "[project]/app/dashboard/admin/beheer/sportscholen/aliases/page.tsx",
                            lineNumber: 84,
                            columnNumber: 11
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/app/dashboard/admin/beheer/sportscholen/aliases/page.tsx",
                        lineNumber: 83,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "flex items-center gap-3",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                onClick: onBack,
                                className: "rounded-lg px-4 py-2 font-bold",
                                style: {
                                    background: "linear-gradient(180deg,#4b4b4b,#2f2f2f)",
                                    color: "#fff",
                                    border: "2px solid rgba(255,255,255,0.22)",
                                    boxShadow: "inset 0 0 0 2px rgba(0,0,0,0.25)"
                                },
                                children: "Terug"
                            }, void 0, false, {
                                fileName: "[project]/app/dashboard/admin/beheer/sportscholen/aliases/page.tsx",
                                lineNumber: 92,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                onClick: onDashboard,
                                className: "rounded-lg px-5 py-2 font-extrabold",
                                style: {
                                    background: "linear-gradient(180deg,#f6f6f6,#cfcfcf)",
                                    color: "#000",
                                    border: `3px solid ${BORDER}`,
                                    boxShadow: "0 10px 22px rgba(0,0,0,0.22), inset 0 0 0 2px rgba(255,255,255,0.75), inset 0 -10px 18px rgba(0,0,0,0.08)"
                                },
                                children: "Naar dashboard"
                            }, void 0, false, {
                                fileName: "[project]/app/dashboard/admin/beheer/sportscholen/aliases/page.tsx",
                                lineNumber: 104,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/app/dashboard/admin/beheer/sportscholen/aliases/page.tsx",
                        lineNumber: 91,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/app/dashboard/admin/beheer/sportscholen/aliases/page.tsx",
                lineNumber: 77,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/app/dashboard/admin/beheer/sportscholen/aliases/page.tsx",
        lineNumber: 62,
        columnNumber: 5
    }, this);
}
_c1 = Header;
function SportschoolAliasesPage() {
    _s();
    const router = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRouter"])();
    const { user, roles, loading } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$app$2f$context$2f$AuthContext$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useAuth"])();
    const isAdmin = roles.includes("admin") || roles.includes("superadmin");
    const [err, setErr] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    // Sportschool search + paging
    const [sportschoolQuery, setSportschoolQuery] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])("");
    const [sportscholen, setSportscholen] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])([]);
    const [sportsLoading, setSportsLoading] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [sportsPage, setSportsPage] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(0);
    const [sportsHasMore, setSportsHasMore] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(true);
    const [sportsCount, setSportsCount] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    // Selected sportschool
    const [selected, setSelected] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    // Aliases for selected
    const [aliases, setAliases] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])([]);
    const [aliasesLoading, setAliasesLoading] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [aliasFilter, setAliasFilter] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])("");
    // Add alias
    const [newAlias, setNewAlias] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])("");
    // Guard
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "SportschoolAliasesPage.useEffect": ()=>{
            if (!loading && (!user || !isAdmin)) {
                router.replace("/dashboard");
            }
        }
    }["SportschoolAliasesPage.useEffect"], [
        loading,
        user,
        isAdmin,
        router
    ]);
    async function loadSportscholenPage(reset) {
        try {
            setErr(null);
            setSportsLoading(true);
            const q = sportschoolQuery.trim();
            const page = reset ? 0 : sportsPage;
            const from = page * PAGE_SIZE;
            const to = from + PAGE_SIZE - 1;
            let query = __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabaseClient$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["supabase"].from("sportscholen").select("sportschool_id, naam, plaats, land", {
                count: "exact"
            }).order("naam", {
                ascending: true
            }).range(from, to);
            if (q) {
                const like = `%${q}%`;
                query = query.or(`naam.ilike.${like},plaats.ilike.${like},land.ilike.${like}`);
            }
            const { data, error, count } = await query;
            if (error) throw error;
            const rows = data ?? [];
            if (reset) {
                setSportscholen(rows);
                setSportsPage(1);
            } else {
                setSportscholen((prev)=>[
                        ...prev,
                        ...rows
                    ]);
                setSportsPage((prev)=>prev + 1);
            }
            setSportsCount(typeof count === "number" ? count : null);
            const loaded = (reset ? 0 : page * PAGE_SIZE) + rows.length;
            const total = typeof count === "number" ? count : loaded;
            setSportsHasMore(loaded < total);
        } catch (e) {
            setErr(e?.message ?? "sportscholen_load_failed");
        } finally{
            setSportsLoading(false);
        }
    }
    async function loadAliases(sportschool_id) {
        try {
            setErr(null);
            setAliasesLoading(true);
            const { data, error } = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabaseClient$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["supabase"].from("sportschool_aliases").select("id, alias_text, sportschool_id, note, created_at, updated_at").eq("sportschool_id", sportschool_id).order("alias_text", {
                ascending: true
            });
            if (error) throw error;
            setAliases(data ?? []);
        } catch (e) {
            setErr(e?.message ?? "aliases_load_failed");
        } finally{
            setAliasesLoading(false);
        }
    }
    async function addAlias() {
        try {
            setErr(null);
            if (!selected) throw new Error("Kies eerst een sportschool.");
            const alias = newAlias.trim();
            if (!alias) throw new Error("Vul een alias in.");
            const { error } = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabaseClient$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["supabase"].from("sportschool_aliases").insert({
                alias_text: alias,
                sportschool_id: selected.sportschool_id,
                note: null
            });
            if (error) {
                const msg = String(error.message ?? "");
                if (msg.toLowerCase().includes("duplicate") || msg.toLowerCase().includes("unique")) {
                    throw new Error("Deze alias bestaat al (case-insensitive).");
                }
                throw error;
            }
            setNewAlias("");
            await loadAliases(selected.sportschool_id);
        } catch (e) {
            setErr(e?.message ?? "save_failed");
        }
    }
    async function removeAlias(row) {
        try {
            setErr(null);
            if (!selected) return;
            const ok = confirm(`Alias verwijderen?\n\n${row.alias_text}`);
            if (!ok) return;
            const { error } = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabaseClient$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["supabase"].from("sportschool_aliases").delete().eq("id", row.id);
            if (error) throw error;
            await loadAliases(selected.sportschool_id);
        } catch (e) {
            setErr(e?.message ?? "delete_failed");
        }
    }
    // Init
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "SportschoolAliasesPage.useEffect": ()=>{
            if (!loading && user && isAdmin) {
                setSelected(null);
                setAliases([]);
                setSportsPage(0);
                setSportsHasMore(true);
                setSportsCount(null);
                loadSportscholenPage(true);
            }
        // eslint-disable-next-line react-hooks/exhaustive-deps
        }
    }["SportschoolAliasesPage.useEffect"], [
        loading,
        user,
        isAdmin
    ]);
    // Search debounce
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "SportschoolAliasesPage.useEffect": ()=>{
            if (!user || !isAdmin) return;
            const t = setTimeout({
                "SportschoolAliasesPage.useEffect.t": ()=>{
                    setSportsPage(0);
                    setSportsHasMore(true);
                    setSportsCount(null);
                    loadSportscholenPage(true);
                }
            }["SportschoolAliasesPage.useEffect.t"], 250);
            return ({
                "SportschoolAliasesPage.useEffect": ()=>clearTimeout(t)
            })["SportschoolAliasesPage.useEffect"];
        // eslint-disable-next-line react-hooks/exhaustive-deps
        }
    }["SportschoolAliasesPage.useEffect"], [
        sportschoolQuery
    ]);
    const filteredAliases = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useMemo"])({
        "SportschoolAliasesPage.useMemo[filteredAliases]": ()=>{
            const q = aliasFilter.trim().toLowerCase();
            if (!q) return aliases;
            return aliases.filter({
                "SportschoolAliasesPage.useMemo[filteredAliases]": (a)=>(a.alias_text ?? "").toLowerCase().includes(q)
            }["SportschoolAliasesPage.useMemo[filteredAliases]"]);
        }
    }["SportschoolAliasesPage.useMemo[filteredAliases]"], [
        aliases,
        aliasFilter
    ]);
    if (!user || !isAdmin) return null;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(Shell, {
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(Header, {
                onBack: ()=>router.back(),
                onDashboard: ()=>router.push("/dashboard/admin")
            }, void 0, false, {
                fileName: "[project]/app/dashboard/admin/beheer/sportscholen/aliases/page.tsx",
                lineNumber: 305,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "px-6 py-8",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "text-center",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "text-4xl font-extrabold",
                                style: {
                                    color: ORANGE
                                },
                                children: "Sportschool Aliassen"
                            }, void 0, false, {
                                fileName: "[project]/app/dashboard/admin/beheer/sportscholen/aliases/page.tsx",
                                lineNumber: 309,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "mt-1",
                                style: {
                                    color: "#555"
                                },
                                children: "Voeg aliassen toe zodat matching (scraper/controle) stabiel blijft."
                            }, void 0, false, {
                                fileName: "[project]/app/dashboard/admin/beheer/sportscholen/aliases/page.tsx",
                                lineNumber: 312,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/app/dashboard/admin/beheer/sportscholen/aliases/page.tsx",
                        lineNumber: 308,
                        columnNumber: 9
                    }, this),
                    err && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "mt-6 rounded-2xl px-4 py-3",
                        style: {
                            border: `3px solid ${BORDER}`,
                            background: "#ffe8e8",
                            color: "#7a0000"
                        },
                        children: err
                    }, void 0, false, {
                        fileName: "[project]/app/dashboard/admin/beheer/sportscholen/aliases/page.tsx",
                        lineNumber: 318,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "mt-6 grid grid-cols-1 lg:grid-cols-2 gap-4",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "rounded-2xl p-5",
                                style: {
                                    background: PANEL_BG,
                                    border: `3px solid ${BORDER}`,
                                    boxShadow: PANEL_SHADOW
                                },
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "mb-4 h-[4px] w-full rounded-full",
                                        style: {
                                            background: "linear-gradient(90deg,#ff4d00, rgba(255,77,0,0.10))"
                                        }
                                    }, void 0, false, {
                                        fileName: "[project]/app/dashboard/admin/beheer/sportscholen/aliases/page.tsx",
                                        lineNumber: 326,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "text-lg font-extrabold",
                                        style: {
                                            color: "#111"
                                        },
                                        children: "1) Zoek sportschool"
                                    }, void 0, false, {
                                        fileName: "[project]/app/dashboard/admin/beheer/sportscholen/aliases/page.tsx",
                                        lineNumber: 327,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "mt-3 flex gap-2",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                value: sportschoolQuery,
                                                onChange: (e)=>setSportschoolQuery(e.target.value),
                                                placeholder: "Zoek op naam / plaats / land…",
                                                className: "w-full rounded-xl px-3 py-2",
                                                style: {
                                                    background: "#fff",
                                                    border: `2px solid ${BORDER}`,
                                                    color: "#000"
                                                }
                                            }, void 0, false, {
                                                fileName: "[project]/app/dashboard/admin/beheer/sportscholen/aliases/page.tsx",
                                                lineNumber: 332,
                                                columnNumber: 15
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                onClick: ()=>loadSportscholenPage(true),
                                                className: "rounded-xl px-4 py-2 font-extrabold",
                                                style: {
                                                    background: ORANGE,
                                                    color: "#fff",
                                                    border: `2px solid ${BORDER}`
                                                },
                                                children: "Zoek"
                                            }, void 0, false, {
                                                fileName: "[project]/app/dashboard/admin/beheer/sportscholen/aliases/page.tsx",
                                                lineNumber: 339,
                                                columnNumber: 15
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/app/dashboard/admin/beheer/sportscholen/aliases/page.tsx",
                                        lineNumber: 331,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "mt-3 text-xs",
                                        style: {
                                            color: "#666"
                                        },
                                        children: sportsCount != null ? `${sportsCount} totaal` : ""
                                    }, void 0, false, {
                                        fileName: "[project]/app/dashboard/admin/beheer/sportscholen/aliases/page.tsx",
                                        lineNumber: 348,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "mt-3 overflow-hidden rounded-2xl",
                                        style: {
                                            border: `3px solid ${BORDER}`,
                                            background: "#fff"
                                        },
                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "max-h-[520px] overflow-auto",
                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("table", {
                                                className: "w-full text-sm",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("thead", {
                                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("tr", {
                                                            style: {
                                                                background: ORANGE,
                                                                color: "#fff"
                                                            },
                                                            children: [
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                                    className: "text-left px-4 py-3",
                                                                    children: "Sportschool"
                                                                }, void 0, false, {
                                                                    fileName: "[project]/app/dashboard/admin/beheer/sportscholen/aliases/page.tsx",
                                                                    lineNumber: 357,
                                                                    columnNumber: 23
                                                                }, this),
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                                    className: "text-left px-4 py-3",
                                                                    children: "Plaats"
                                                                }, void 0, false, {
                                                                    fileName: "[project]/app/dashboard/admin/beheer/sportscholen/aliases/page.tsx",
                                                                    lineNumber: 358,
                                                                    columnNumber: 23
                                                                }, this),
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                                    className: "text-left px-4 py-3",
                                                                    children: "Land"
                                                                }, void 0, false, {
                                                                    fileName: "[project]/app/dashboard/admin/beheer/sportscholen/aliases/page.tsx",
                                                                    lineNumber: 359,
                                                                    columnNumber: 23
                                                                }, this)
                                                            ]
                                                        }, void 0, true, {
                                                            fileName: "[project]/app/dashboard/admin/beheer/sportscholen/aliases/page.tsx",
                                                            lineNumber: 356,
                                                            columnNumber: 21
                                                        }, this)
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/dashboard/admin/beheer/sportscholen/aliases/page.tsx",
                                                        lineNumber: 355,
                                                        columnNumber: 19
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("tbody", {
                                                        children: [
                                                            sportscholen.map((s, idx)=>{
                                                                const active = selected?.sportschool_id === s.sportschool_id;
                                                                return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("tr", {
                                                                    onClick: ()=>{
                                                                        setSelected(s);
                                                                        setAliasFilter("");
                                                                        loadAliases(s.sportschool_id);
                                                                    },
                                                                    style: {
                                                                        cursor: "pointer",
                                                                        background: active ? "#ffe6db" : idx % 2 === 0 ? "#fff" : "#efefef"
                                                                    },
                                                                    children: [
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                                            className: "px-4 py-3",
                                                                            style: {
                                                                                borderTop: "1px solid rgba(0,0,0,0.10)"
                                                                            },
                                                                            children: [
                                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                                    className: "font-bold",
                                                                                    style: {
                                                                                        color: "#111"
                                                                                    },
                                                                                    children: s.naam ?? "—"
                                                                                }, void 0, false, {
                                                                                    fileName: "[project]/app/dashboard/admin/beheer/sportscholen/aliases/page.tsx",
                                                                                    lineNumber: 379,
                                                                                    columnNumber: 29
                                                                                }, this),
                                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                                    className: "text-xs",
                                                                                    style: {
                                                                                        color: "#666"
                                                                                    },
                                                                                    children: [
                                                                                        "#",
                                                                                        s.sportschool_id
                                                                                    ]
                                                                                }, void 0, true, {
                                                                                    fileName: "[project]/app/dashboard/admin/beheer/sportscholen/aliases/page.tsx",
                                                                                    lineNumber: 380,
                                                                                    columnNumber: 29
                                                                                }, this)
                                                                            ]
                                                                        }, void 0, true, {
                                                                            fileName: "[project]/app/dashboard/admin/beheer/sportscholen/aliases/page.tsx",
                                                                            lineNumber: 378,
                                                                            columnNumber: 27
                                                                        }, this),
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                                            className: "px-4 py-3",
                                                                            style: {
                                                                                borderTop: "1px solid rgba(0,0,0,0.10)",
                                                                                color: "#111"
                                                                            },
                                                                            children: s.plaats ?? "—"
                                                                        }, void 0, false, {
                                                                            fileName: "[project]/app/dashboard/admin/beheer/sportscholen/aliases/page.tsx",
                                                                            lineNumber: 382,
                                                                            columnNumber: 27
                                                                        }, this),
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                                            className: "px-4 py-3",
                                                                            style: {
                                                                                borderTop: "1px solid rgba(0,0,0,0.10)",
                                                                                color: "#111"
                                                                            },
                                                                            children: s.land ?? "—"
                                                                        }, void 0, false, {
                                                                            fileName: "[project]/app/dashboard/admin/beheer/sportscholen/aliases/page.tsx",
                                                                            lineNumber: 385,
                                                                            columnNumber: 27
                                                                        }, this)
                                                                    ]
                                                                }, s.sportschool_id, true, {
                                                                    fileName: "[project]/app/dashboard/admin/beheer/sportscholen/aliases/page.tsx",
                                                                    lineNumber: 366,
                                                                    columnNumber: 25
                                                                }, this);
                                                            }),
                                                            sportscholen.length === 0 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("tr", {
                                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                                    className: "px-4 py-4",
                                                                    colSpan: 3,
                                                                    style: {
                                                                        color: "#666"
                                                                    },
                                                                    children: "Geen sportscholen gevonden."
                                                                }, void 0, false, {
                                                                    fileName: "[project]/app/dashboard/admin/beheer/sportscholen/aliases/page.tsx",
                                                                    lineNumber: 394,
                                                                    columnNumber: 25
                                                                }, this)
                                                            }, void 0, false, {
                                                                fileName: "[project]/app/dashboard/admin/beheer/sportscholen/aliases/page.tsx",
                                                                lineNumber: 393,
                                                                columnNumber: 23
                                                            }, this)
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/app/dashboard/admin/beheer/sportscholen/aliases/page.tsx",
                                                        lineNumber: 362,
                                                        columnNumber: 19
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/app/dashboard/admin/beheer/sportscholen/aliases/page.tsx",
                                                lineNumber: 354,
                                                columnNumber: 17
                                            }, this)
                                        }, void 0, false, {
                                            fileName: "[project]/app/dashboard/admin/beheer/sportscholen/aliases/page.tsx",
                                            lineNumber: 353,
                                            columnNumber: 15
                                        }, this)
                                    }, void 0, false, {
                                        fileName: "[project]/app/dashboard/admin/beheer/sportscholen/aliases/page.tsx",
                                        lineNumber: 352,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "mt-3 flex items-center justify-between",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "text-sm",
                                                style: {
                                                    color: "#666"
                                                },
                                                children: sportsLoading ? "Laden…" : ""
                                            }, void 0, false, {
                                                fileName: "[project]/app/dashboard/admin/beheer/sportscholen/aliases/page.tsx",
                                                lineNumber: 405,
                                                columnNumber: 15
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                disabled: !sportsHasMore || sportsLoading,
                                                onClick: ()=>loadSportscholenPage(false),
                                                className: "rounded-xl px-4 py-2 font-extrabold disabled:opacity-60",
                                                style: {
                                                    background: "linear-gradient(180deg,#f6f6f6,#cfcfcf)",
                                                    color: "#000",
                                                    border: `2px solid ${BORDER}`
                                                },
                                                children: "Meer laden"
                                            }, void 0, false, {
                                                fileName: "[project]/app/dashboard/admin/beheer/sportscholen/aliases/page.tsx",
                                                lineNumber: 408,
                                                columnNumber: 15
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/app/dashboard/admin/beheer/sportscholen/aliases/page.tsx",
                                        lineNumber: 404,
                                        columnNumber: 13
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/app/dashboard/admin/beheer/sportscholen/aliases/page.tsx",
                                lineNumber: 325,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "rounded-2xl p-5",
                                style: {
                                    background: PANEL_BG_SOFT,
                                    border: `3px solid ${BORDER}`,
                                    boxShadow: PANEL_SHADOW
                                },
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "mb-4 h-[4px] w-full rounded-full",
                                        style: {
                                            background: "linear-gradient(90deg, rgba(255,77,0,0.12), rgba(0,0,0,0.10))"
                                        }
                                    }, void 0, false, {
                                        fileName: "[project]/app/dashboard/admin/beheer/sportscholen/aliases/page.tsx",
                                        lineNumber: 421,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "text-lg font-extrabold",
                                        style: {
                                            color: "#111"
                                        },
                                        children: "2) Aliassen"
                                    }, void 0, false, {
                                        fileName: "[project]/app/dashboard/admin/beheer/sportscholen/aliases/page.tsx",
                                        lineNumber: 422,
                                        columnNumber: 13
                                    }, this),
                                    !selected ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "mt-4 rounded-2xl p-4",
                                        style: {
                                            background: "linear-gradient(180deg,#ffffff 0%, #f1f1f1 60%, #e7e7e7 100%)",
                                            border: `3px solid ${BORDER}`,
                                            color: "#333",
                                            boxShadow: "inset 0 0 0 2px rgba(255,255,255,0.70)"
                                        },
                                        children: "Kies links een sportschool om aliassen te bekijken/toe te voegen."
                                    }, void 0, false, {
                                        fileName: "[project]/app/dashboard/admin/beheer/sportscholen/aliases/page.tsx",
                                        lineNumber: 427,
                                        columnNumber: 15
                                    }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Fragment"], {
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "mt-3 rounded-2xl p-4",
                                                style: {
                                                    background: "linear-gradient(180deg,#ffffff 0%, #f1f1f1 60%, #e7e7e7 100%)",
                                                    border: `3px solid ${BORDER}`,
                                                    boxShadow: "inset 0 0 0 2px rgba(255,255,255,0.70)"
                                                },
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        className: "font-extrabold",
                                                        style: {
                                                            color: "#111"
                                                        },
                                                        children: selected.naam ?? "—"
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/dashboard/admin/beheer/sportscholen/aliases/page.tsx",
                                                        lineNumber: 448,
                                                        columnNumber: 19
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        className: "text-sm",
                                                        style: {
                                                            color: "#666"
                                                        },
                                                        children: [
                                                            selected.plaats ?? "—",
                                                            " ",
                                                            selected.land ? `• ${selected.land}` : "",
                                                            " • #",
                                                            selected.sportschool_id
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/app/dashboard/admin/beheer/sportscholen/aliases/page.tsx",
                                                        lineNumber: 449,
                                                        columnNumber: 19
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/app/dashboard/admin/beheer/sportscholen/aliases/page.tsx",
                                                lineNumber: 440,
                                                columnNumber: 17
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "mt-4 grid grid-cols-1 md:grid-cols-2 gap-3",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        children: [
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                className: "text-sm font-bold mb-1",
                                                                style: {
                                                                    color: "#222"
                                                                },
                                                                children: "Filter alias"
                                                            }, void 0, false, {
                                                                fileName: "[project]/app/dashboard/admin/beheer/sportscholen/aliases/page.tsx",
                                                                lineNumber: 456,
                                                                columnNumber: 21
                                                            }, this),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                                value: aliasFilter,
                                                                onChange: (e)=>setAliasFilter(e.target.value),
                                                                className: "w-full rounded-xl px-3 py-2",
                                                                style: {
                                                                    background: "#fff",
                                                                    border: `2px solid ${BORDER}`,
                                                                    color: "#000"
                                                                },
                                                                placeholder: "zoek in aliassen…"
                                                            }, void 0, false, {
                                                                fileName: "[project]/app/dashboard/admin/beheer/sportscholen/aliases/page.tsx",
                                                                lineNumber: 457,
                                                                columnNumber: 21
                                                            }, this)
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/app/dashboard/admin/beheer/sportscholen/aliases/page.tsx",
                                                        lineNumber: 455,
                                                        columnNumber: 19
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        children: [
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                className: "text-sm font-bold mb-1",
                                                                style: {
                                                                    color: "#222"
                                                                },
                                                                children: "Nieuwe alias"
                                                            }, void 0, false, {
                                                                fileName: "[project]/app/dashboard/admin/beheer/sportscholen/aliases/page.tsx",
                                                                lineNumber: 466,
                                                                columnNumber: 21
                                                            }, this),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                className: "flex gap-2",
                                                                children: [
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                                        value: newAlias,
                                                                        onChange: (e)=>setNewAlias(e.target.value),
                                                                        className: "w-full rounded-xl px-3 py-2",
                                                                        style: {
                                                                            background: "#fff",
                                                                            border: `2px solid ${BORDER}`,
                                                                            color: "#000"
                                                                        },
                                                                        placeholder: "bijv. Team Suboxer"
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/app/dashboard/admin/beheer/sportscholen/aliases/page.tsx",
                                                                        lineNumber: 468,
                                                                        columnNumber: 23
                                                                    }, this),
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                                        onClick: addAlias,
                                                                        className: "rounded-xl px-4 py-2 font-extrabold",
                                                                        style: {
                                                                            background: ORANGE,
                                                                            color: "#fff",
                                                                            border: `2px solid ${BORDER}`
                                                                        },
                                                                        children: "+"
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/app/dashboard/admin/beheer/sportscholen/aliases/page.tsx",
                                                                        lineNumber: 475,
                                                                        columnNumber: 23
                                                                    }, this)
                                                                ]
                                                            }, void 0, true, {
                                                                fileName: "[project]/app/dashboard/admin/beheer/sportscholen/aliases/page.tsx",
                                                                lineNumber: 467,
                                                                columnNumber: 21
                                                            }, this)
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/app/dashboard/admin/beheer/sportscholen/aliases/page.tsx",
                                                        lineNumber: 465,
                                                        columnNumber: 19
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/app/dashboard/admin/beheer/sportscholen/aliases/page.tsx",
                                                lineNumber: 454,
                                                columnNumber: 17
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "mt-4 overflow-hidden rounded-2xl",
                                                style: {
                                                    border: `3px solid ${BORDER}`,
                                                    background: "#fff"
                                                },
                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "max-h-[520px] overflow-auto",
                                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("table", {
                                                        className: "w-full text-sm",
                                                        children: [
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("thead", {
                                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("tr", {
                                                                    style: {
                                                                        background: ORANGE,
                                                                        color: "#fff"
                                                                    },
                                                                    children: [
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                                            className: "text-left px-4 py-3",
                                                                            children: "Alias"
                                                                        }, void 0, false, {
                                                                            fileName: "[project]/app/dashboard/admin/beheer/sportscholen/aliases/page.tsx",
                                                                            lineNumber: 491,
                                                                            columnNumber: 27
                                                                        }, this),
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                                            className: "text-left px-4 py-3",
                                                                            children: "Actie"
                                                                        }, void 0, false, {
                                                                            fileName: "[project]/app/dashboard/admin/beheer/sportscholen/aliases/page.tsx",
                                                                            lineNumber: 492,
                                                                            columnNumber: 27
                                                                        }, this)
                                                                    ]
                                                                }, void 0, true, {
                                                                    fileName: "[project]/app/dashboard/admin/beheer/sportscholen/aliases/page.tsx",
                                                                    lineNumber: 490,
                                                                    columnNumber: 25
                                                                }, this)
                                                            }, void 0, false, {
                                                                fileName: "[project]/app/dashboard/admin/beheer/sportscholen/aliases/page.tsx",
                                                                lineNumber: 489,
                                                                columnNumber: 23
                                                            }, this),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("tbody", {
                                                                children: aliasesLoading ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("tr", {
                                                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                                        className: "px-4 py-4",
                                                                        colSpan: 2,
                                                                        style: {
                                                                            color: "#666"
                                                                        },
                                                                        children: "Laden…"
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/app/dashboard/admin/beheer/sportscholen/aliases/page.tsx",
                                                                        lineNumber: 498,
                                                                        columnNumber: 29
                                                                    }, this)
                                                                }, void 0, false, {
                                                                    fileName: "[project]/app/dashboard/admin/beheer/sportscholen/aliases/page.tsx",
                                                                    lineNumber: 497,
                                                                    columnNumber: 27
                                                                }, this) : filteredAliases.length === 0 ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("tr", {
                                                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                                        className: "px-4 py-4",
                                                                        colSpan: 2,
                                                                        style: {
                                                                            color: "#666"
                                                                        },
                                                                        children: "Geen aliassen."
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/app/dashboard/admin/beheer/sportscholen/aliases/page.tsx",
                                                                        lineNumber: 504,
                                                                        columnNumber: 29
                                                                    }, this)
                                                                }, void 0, false, {
                                                                    fileName: "[project]/app/dashboard/admin/beheer/sportscholen/aliases/page.tsx",
                                                                    lineNumber: 503,
                                                                    columnNumber: 27
                                                                }, this) : filteredAliases.map((a, idx)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("tr", {
                                                                        style: {
                                                                            background: idx % 2 === 0 ? "#fff" : "#efefef"
                                                                        },
                                                                        children: [
                                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                                                className: "px-4 py-3",
                                                                                style: {
                                                                                    borderTop: "1px solid rgba(0,0,0,0.10)",
                                                                                    color: "#111"
                                                                                },
                                                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                                    className: "font-bold",
                                                                                    children: a.alias_text
                                                                                }, void 0, false, {
                                                                                    fileName: "[project]/app/dashboard/admin/beheer/sportscholen/aliases/page.tsx",
                                                                                    lineNumber: 512,
                                                                                    columnNumber: 33
                                                                                }, this)
                                                                            }, void 0, false, {
                                                                                fileName: "[project]/app/dashboard/admin/beheer/sportscholen/aliases/page.tsx",
                                                                                lineNumber: 511,
                                                                                columnNumber: 31
                                                                            }, this),
                                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                                                className: "px-4 py-3",
                                                                                style: {
                                                                                    borderTop: "1px solid rgba(0,0,0,0.10)"
                                                                                },
                                                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                                                    onClick: ()=>removeAlias(a),
                                                                                    className: "rounded-xl px-4 py-2 font-extrabold",
                                                                                    style: {
                                                                                        background: "linear-gradient(180deg,#f6f6f6,#cfcfcf)",
                                                                                        color: "#000",
                                                                                        border: `2px solid ${BORDER}`
                                                                                    },
                                                                                    children: "Verwijder"
                                                                                }, void 0, false, {
                                                                                    fileName: "[project]/app/dashboard/admin/beheer/sportscholen/aliases/page.tsx",
                                                                                    lineNumber: 515,
                                                                                    columnNumber: 33
                                                                                }, this)
                                                                            }, void 0, false, {
                                                                                fileName: "[project]/app/dashboard/admin/beheer/sportscholen/aliases/page.tsx",
                                                                                lineNumber: 514,
                                                                                columnNumber: 31
                                                                            }, this)
                                                                        ]
                                                                    }, a.id, true, {
                                                                        fileName: "[project]/app/dashboard/admin/beheer/sportscholen/aliases/page.tsx",
                                                                        lineNumber: 510,
                                                                        columnNumber: 29
                                                                    }, this))
                                                            }, void 0, false, {
                                                                fileName: "[project]/app/dashboard/admin/beheer/sportscholen/aliases/page.tsx",
                                                                lineNumber: 495,
                                                                columnNumber: 23
                                                            }, this)
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/app/dashboard/admin/beheer/sportscholen/aliases/page.tsx",
                                                        lineNumber: 488,
                                                        columnNumber: 21
                                                    }, this)
                                                }, void 0, false, {
                                                    fileName: "[project]/app/dashboard/admin/beheer/sportscholen/aliases/page.tsx",
                                                    lineNumber: 487,
                                                    columnNumber: 19
                                                }, this)
                                            }, void 0, false, {
                                                fileName: "[project]/app/dashboard/admin/beheer/sportscholen/aliases/page.tsx",
                                                lineNumber: 486,
                                                columnNumber: 17
                                            }, this)
                                        ]
                                    }, void 0, true)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/app/dashboard/admin/beheer/sportscholen/aliases/page.tsx",
                                lineNumber: 420,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/app/dashboard/admin/beheer/sportscholen/aliases/page.tsx",
                        lineNumber: 323,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "mt-8 text-center text-xs",
                        style: {
                            color: "#666"
                        },
                        children: "© 2026 FightSupport"
                    }, void 0, false, {
                        fileName: "[project]/app/dashboard/admin/beheer/sportscholen/aliases/page.tsx",
                        lineNumber: 535,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/app/dashboard/admin/beheer/sportscholen/aliases/page.tsx",
                lineNumber: 307,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/app/dashboard/admin/beheer/sportscholen/aliases/page.tsx",
        lineNumber: 304,
        columnNumber: 5
    }, this);
}
_s(SportschoolAliasesPage, "qsJ6tgf7YID8x2tQJRUZM6okWHw=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRouter"],
        __TURBOPACK__imported__module__$5b$project$5d2f$app$2f$context$2f$AuthContext$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useAuth"]
    ];
});
_c2 = SportschoolAliasesPage;
var _c, _c1, _c2;
__turbopack_context__.k.register(_c, "Shell");
__turbopack_context__.k.register(_c1, "Header");
__turbopack_context__.k.register(_c2, "SportschoolAliasesPage");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
]);

//# sourceMappingURL=app_dashboard_admin_beheer_sportscholen_aliases_page_tsx_6885a4b3._.js.map