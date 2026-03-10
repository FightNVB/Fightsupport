module.exports = [
"[externals]/next/dist/compiled/next-server/app-page-turbo.runtime.dev.js [external] (next/dist/compiled/next-server/app-page-turbo.runtime.dev.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js", () => require("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js"));

module.exports = mod;
}),
"[project]/lib/supabaseClient.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "supabase",
    ()=>supabase
]);
// lib/supabaseClient.ts
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$supabase$2f$supabase$2d$js$2f$dist$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/@supabase/supabase-js/dist/index.mjs [app-ssr] (ecmascript) <locals>");
;
const SUPABASE_URL = ("TURBOPACK compile-time value", "https://krskuyaqvzloptfndznc.supabase.co");
const SUPABASE_ANON_KEY = ("TURBOPACK compile-time value", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtyc2t1eWFxdnpsb3B0Zm5kem5jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM1MjgzMzYsImV4cCI6MjA3OTEwNDMzNn0.YpWbtoMejfuvSUstZAKpvOeLYnfj87tfMwQppnRgJac");
const supabase = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$supabase$2f$supabase$2d$js$2f$dist$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__["createClient"])(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
    }
});
}),
"[project]/app/context/AuthContext.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "AuthProvider",
    ()=>AuthProvider,
    "useAuth",
    ()=>useAuth
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabaseClient$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/supabaseClient.ts [app-ssr] (ecmascript)");
"use client";
;
;
;
const AuthContext = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["createContext"])(undefined);
function asRoleName(v) {
    const r = String(v ?? "").trim().toLowerCase();
    if (!r) return null;
    // normaliseer eventuele oude schrijfwijzen
    if (r === "dispensatie_admin" || r === "dispensatie admin" || r === "dispensatie-admin") return "dispensatie_admin";
    // whitelist
    const allowed = new Set([
        "superadmin",
        "admin",
        "promotor",
        "matchmaker",
        "official",
        "hoofdofficial",
        "dispensatie_admin"
    ]);
    return allowed.has(r) ? r : null;
}
function AuthProvider({ children }) {
    const [user, setUser] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(null);
    const [roles, setRoles] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])([]);
    const [loading, setLoading] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(true);
    // ---- ⭐ FIXED LOADER: sessie correct ophalen ----
    const loadAuthState = async ()=>{
        setLoading(true);
        const { data: { session } } = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabaseClient$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["supabase"].auth.getSession();
        if (!session || !session.user) {
            setUser(null);
            setRoles([]);
            setLoading(false);
            return;
        }
        const u = session.user;
        setUser(u);
        // 1) Rollen ophalen (SOURCE OF TRUTH: public.user_profiles.role)
        const { data: prof, error: profErr } = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabaseClient$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["supabase"].from("user_profiles").select("role").eq("id", u.id).maybeSingle();
        if (!profErr) {
            const r = asRoleName(prof?.role);
            if (r) {
                setRoles([
                    r
                ]);
                setLoading(false);
                return;
            }
        }
        // 2) legacy fallback: user_roles -> roles
        const { data: userRoles, error: userRolesError } = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabaseClient$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["supabase"].from("user_roles").select("role_id").eq("user_id", u.id);
        if (userRolesError || !userRoles) {
            setRoles([]);
            setLoading(false);
            return;
        }
        const roleIds = userRoles.map((r)=>r.role_id).filter(Boolean);
        if (roleIds.length === 0) {
            setRoles([]);
            setLoading(false);
            return;
        }
        const { data: rolesData, error: rolesError } = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabaseClient$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["supabase"].from("roles").select("id, name").in("id", roleIds);
        if (rolesError || !rolesData) {
            setRoles([]);
            setLoading(false);
            return;
        }
        const mapped = rolesData.map((r)=>asRoleName(r?.name)).filter(Boolean);
        // uniek
        setRoles(Array.from(new Set(mapped)));
        setLoading(false);
    };
    // ---- ✅ Logout ----
    const logout = async ()=>{
        try {
            await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabaseClient$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["supabase"].auth.signOut();
        } catch (e) {
            console.error("Logout error:", e);
        } finally{
            // hard redirect voorkomt "blijven hangen" door oude state
            window.location.href = "/login";
        }
    };
    // ---- 🔄 Auth herladen bij sessie-wijzigingen ----
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        loadAuthState();
        const { data: { subscription } } = __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabaseClient$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["supabase"].auth.onAuthStateChange(()=>{
            loadAuthState(); // na login / logout / refresh opnieuw laden
        });
        return ()=>{
            subscription.unsubscribe();
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(AuthContext.Provider, {
        value: {
            user,
            roles,
            loading,
            refresh: loadAuthState,
            logout
        },
        children: children
    }, void 0, false, {
        fileName: "[project]/app/context/AuthContext.tsx",
        lineNumber: 159,
        columnNumber: 5
    }, this);
}
function useAuth() {
    const ctx = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useContext"])(AuthContext);
    if (!ctx) throw new Error("useAuth moet binnen AuthProvider gebruikt worden");
    return ctx;
}
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__78c9b763._.js.map