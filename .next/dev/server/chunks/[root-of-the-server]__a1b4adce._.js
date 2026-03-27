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
"[project]/app/api/matchmaking/delete-partij/route.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
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
function asUuid(v) {
    const s = String(v ?? "").trim();
    if (!s) return null;
    const ok = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
    return ok ? s : null;
}
/**
 * Voer een supabase query uit, maar negeer fouten (best effort).
 * Handig voor "kolom bestaat niet" of "tabel bestaat niet" scenario's.
 */ async function bestEffort(promise) {
    try {
        await promise;
    } catch  {
    // bewust negeren
    }
    return null;
}
async function POST(req) {
    try {
        const user = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$api$2f$requireRole$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["requireUserFromAuthHeader"])(req);
        const allowed = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$api$2f$requireRole$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["hasAnyRoleFromReq"])(req, [
            "superadmin",
            "admin"
        ]);
        if (!allowed) {
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: "Geen rechten."
            }, {
                status: 403
            });
        }
        const body = await req.json().catch(()=>({}));
        const matchmaking_id = asUuid(body?.matchmaking_id);
        const partij_nr = Number(body?.partij_nr);
        const controle_run_id = asUuid(body?.controle_run_id);
        const bout_id = asUuid(body?.bout_id);
        if (!matchmaking_id) {
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: "matchmaking_id ontbreekt."
            }, {
                status: 400
            });
        }
        if (!Number.isFinite(partij_nr)) {
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: "partij_nr ontbreekt."
            }, {
                status: 400
            });
        }
        // 1) dispensatie_requests
        await bestEffort(supabaseAdmin.from("dispensatie_requests").delete().eq("matchmaking_id", matchmaking_id).eq("partij_nr", partij_nr).throwOnError());
        // 2) controle_resultaten
        if (controle_run_id) {
            await bestEffort(supabaseAdmin.from("controle_resultaten").delete().eq("controle_run_id", controle_run_id).eq("partij_nr", partij_nr).throwOnError());
        } else {
            await bestEffort(supabaseAdmin.from("controle_resultaten").delete().eq("matchmaking_id", matchmaking_id).eq("partij_nr", partij_nr).throwOnError());
            // fallback voor oudere data waar matchmaking_id niet op controle_resultaten staat:
            const { data: runs } = await supabaseAdmin.from("controle_runs").select("id").eq("matchmaking_id", matchmaking_id);
            for (const run of runs ?? []){
                await bestEffort(supabaseAdmin.from("controle_resultaten").delete().eq("controle_run_id", run.id).eq("partij_nr", partij_nr).throwOnError());
            }
        }
        // 3) controle_bout_context
        {
            let q = supabaseAdmin.from("controle_bout_context").delete().eq("matchmaking_id", matchmaking_id).eq("partij_nr", partij_nr);
            if (controle_run_id) q = q.eq("controle_run_id", controle_run_id);
            await bestEffort(q.throwOnError());
        }
        // 4) controle_audit_events  <-- BELANGRIJK voor VA gewijzigd / oude rapportregels
        if (controle_run_id) {
            await bestEffort(supabaseAdmin.from("controle_audit_events").delete().eq("matchmaking_id", matchmaking_id).eq("controle_run_id", controle_run_id).eq("partij_nr", partij_nr).throwOnError());
        } else {
            await bestEffort(supabaseAdmin.from("controle_audit_events").delete().eq("matchmaking_id", matchmaking_id).eq("partij_nr", partij_nr).throwOnError());
        }
        // 5) matchmaking_bouts_raw
        if (bout_id) {
            await bestEffort(supabaseAdmin.from("matchmaking_bouts_raw").delete()// @ts-ignore
            .or(`bout_uid.eq.${bout_id},id.eq.${bout_id}`).throwOnError());
        }
        await bestEffort(supabaseAdmin.from("matchmaking_bouts_raw").delete().eq("matchmaking_id", matchmaking_id).eq("partij_nr", partij_nr).throwOnError());
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            ok: true,
            removed: {
                matchmaking_id,
                partij_nr,
                controle_run_id: controle_run_id ?? null,
                bout_id: bout_id ?? null
            },
            by: {
                user_id: user?.id ?? null,
                email: user?.email ?? null
            }
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

//# sourceMappingURL=%5Broot-of-the-server%5D__a1b4adce._.js.map