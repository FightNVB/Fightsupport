module.exports = [
"[externals]/next/dist/compiled/next-server/app-route-turbo.runtime.dev.js [external] (next/dist/compiled/next-server/app-route-turbo.runtime.dev.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/next-server/app-route-turbo.runtime.dev.js", () => require("next/dist/compiled/next-server/app-route-turbo.runtime.dev.js"));

module.exports = mod;
}),
"[externals]/next/dist/compiled/@opentelemetry/api [external] (next/dist/compiled/@opentelemetry/api, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/@opentelemetry/api", () => require("next/dist/compiled/@opentelemetry/api"));

module.exports = mod;
}),
"[externals]/next/dist/compiled/next-server/app-page-turbo.runtime.dev.js [external] (next/dist/compiled/next-server/app-page-turbo.runtime.dev.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js", () => require("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js"));

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
"[externals]/next/dist/shared/lib/no-fallback-error.external.js [external] (next/dist/shared/lib/no-fallback-error.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/shared/lib/no-fallback-error.external.js", () => require("next/dist/shared/lib/no-fallback-error.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/after-task-async-storage.external.js [external] (next/dist/server/app-render/after-task-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/after-task-async-storage.external.js", () => require("next/dist/server/app-render/after-task-async-storage.external.js"));

module.exports = mod;
}),
"[project]/lib/api/requireRole.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "getUserRoleNames",
    ()=>getUserRoleNames,
    "hasAnyRole",
    ()=>hasAnyRole,
    "hasAnyRoleFromReq",
    ()=>hasAnyRoleFromReq,
    "requireRole",
    ()=>requireRole,
    "requireUserFromAuthHeader",
    ()=>requireUserFromAuthHeader,
    "supabaseAdmin",
    ()=>supabaseAdmin
]);
// lib/api/requireRole.ts
// ✅ Single auth mechanism for API routes: Authorization: Bearer <access_token>
// ✅ No cookie-based auth / SSR session required
// ✅ Source of truth for roles: public.user_profiles.role (single role)
//    (legacy fallback: user_roles + roles)
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$supabase$2f$supabase$2d$js$2f$dist$2f$index$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/@supabase/supabase-js/dist/index.mjs [app-route] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/server.js [app-route] (ecmascript)");
;
;
const supabaseAdmin = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$supabase$2f$supabase$2d$js$2f$dist$2f$index$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$locals$3e$__["createClient"])(("TURBOPACK compile-time value", "https://krskuyaqvzloptfndznc.supabase.co"), process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
        persistSession: false
    }
});
function getBearerToken(req) {
    const h = req.headers.get("authorization") || req.headers.get("Authorization");
    if (!h) return null;
    const m = h.match(/^Bearer\s+(.+)$/i);
    return m ? m[1].trim() : null;
}
async function requireUserFromAuthHeader(req) {
    const token = getBearerToken(req);
    if (!token) {
        // 401
        throw __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            error: "Niet ingelogd."
        }, {
            status: 401
        });
    }
    const { data, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !data?.user) {
        // 401
        throw __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            error: "Niet ingelogd."
        }, {
            status: 401
        });
    }
    return {
        supabase: supabaseAdmin,
        user: data.user,
        userId: data.user.id
    };
}
async function getUserRoleNames(supabase, userId) {
    // 1) preferred: user_profiles.role
    const { data: prof, error: pErr } = await supabase.from("user_profiles").select("role").eq("id", userId).maybeSingle();
    if (!pErr) {
        const r = String(prof?.role ?? "").trim().toLowerCase();
        if (r) return [
            r
        ];
    }
    // 2) legacy fallback: user_roles + roles
    const { data: ur, error: urErr } = await supabase.from("user_roles").select("role_id").eq("user_id", userId);
    if (urErr) throw urErr;
    const roleIds = (ur ?? []).map((x)=>Number(x?.role_id)).filter((n)=>Number.isFinite(n));
    if (roleIds.length === 0) return [];
    const { data: roles, error: rErr } = await supabase.from("roles").select("id,name").in("id", roleIds);
    if (rErr) throw rErr;
    const names = (roles ?? []).map((x)=>String(x?.name ?? "").trim().toLowerCase()).filter(Boolean);
    return Array.from(new Set(names));
}
function hasAnyRole(userRoles, wanted) {
    const roles = (userRoles ?? []).map((s)=>String(s ?? "").trim().toLowerCase()).filter(Boolean);
    const wantedArr = (Array.isArray(wanted) ? wanted : [
        wanted
    ]).map((s)=>String(s ?? "").trim().toLowerCase()).filter(Boolean);
    if (roles.includes("superadmin")) return true;
    return wantedArr.some((w)=>roles.includes(w));
}
async function hasAnyRoleFromReq(req, wanted) {
    const { userId } = await requireUserFromAuthHeader(req);
    const roles = await getUserRoleNames(supabaseAdmin, userId);
    return hasAnyRole(roles, wanted);
}
async function requireRole(req, wanted) {
    const { userId } = await requireUserFromAuthHeader(req);
    const roles = await getUserRoleNames(supabaseAdmin, userId);
    if (!hasAnyRole(roles, wanted)) {
        // 403
        throw __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            error: "Geen toegang."
        }, {
            status: 403
        });
    }
    return {
        userId,
        roles
    };
}
}),
"[project]/app/api/dispensatie/list/route.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "POST",
    ()=>POST,
    "runtime",
    ()=>runtime
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/server.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$supabase$2f$supabase$2d$js$2f$dist$2f$index$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/@supabase/supabase-js/dist/index.mjs [app-route] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$api$2f$requireRole$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/api/requireRole.ts [app-route] (ecmascript)");
;
;
;
const runtime = "nodejs";
const supabaseAdmin = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$supabase$2f$supabase$2d$js$2f$dist$2f$index$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$locals$3e$__["createClient"])(("TURBOPACK compile-time value", "https://krskuyaqvzloptfndznc.supabase.co"), process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
        persistSession: false
    }
});
async function POST(req) {
    try {
        await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$api$2f$requireRole$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["requireUserFromAuthHeader"])(req);
        const ok = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$api$2f$requireRole$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["hasAnyRoleFromReq"])(req, [
            "admin",
            "superadmin",
            "dispensatie_admin"
        ]);
        if (!ok) return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            error: "Geen rechten."
        }, {
            status: 403
        });
        const { data: base, error: rErr } = await supabaseAdmin.from("dispensatie_requests").select("id,status,matchmaking_id,partij_nr,bout_id,rule_code,created_at,updated_at,decision").order("updated_at", {
            ascending: false
        });
        if (rErr) throw rErr;
        const rows = base ?? [];
        // 2e query matchmaking_uploads (geen embedded select zonder FK)
        const matchmakingIds = [
            ...new Set(rows.map((d)=>d.matchmaking_id).filter(Boolean))
        ];
        const { data: uploads, error: uErr } = matchmakingIds.length ? await supabaseAdmin.from("matchmaking_uploads").select("matchmaking_id,evenement_naam,evenement_datum").in("matchmaking_id", matchmakingIds) : {
            data: [],
            error: null
        };
        if (uErr) throw uErr;
        const uploadsBy = new Map();
        (uploads ?? []).forEach((u)=>uploadsBy.set(String(u.matchmaking_id), u));
        const merged = rows.map((r)=>{
            const u = r.matchmaking_id ? uploadsBy.get(String(r.matchmaking_id)) ?? null : null;
            return {
                ...r,
                evenement_naam: u?.evenement_naam ?? null,
                evenement_datum: u?.evenement_datum ?? null
            };
        });
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            rows: merged
        });
    } catch (e) {
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            error: e?.message ?? String(e)
        }, {
            status: 500
        });
    }
}
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__4968a21d._.js.map