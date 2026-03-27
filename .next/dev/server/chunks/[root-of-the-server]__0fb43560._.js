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
"[project]/lib/weegstation/routeAuth.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "getWeegstationAuthContext",
    ()=>getWeegstationAuthContext
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$supabase$2f$supabase$2d$js$2f$dist$2f$index$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/@supabase/supabase-js/dist/index.mjs [app-route] (ecmascript) <locals>");
;
function createSupabaseAdmin() {
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$supabase$2f$supabase$2d$js$2f$dist$2f$index$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$locals$3e$__["createClient"])(("TURBOPACK compile-time value", "https://krskuyaqvzloptfndznc.supabase.co"), process.env.SUPABASE_SERVICE_ROLE_KEY, {
        auth: {
            persistSession: false,
            autoRefreshToken: false
        }
    });
}
function normalizeRoleName(v) {
    return String(v ?? "").trim().toLowerCase();
}
function getBearerTokenFromRequest(req) {
    const authHeader = req.headers.get("authorization") || req.headers.get("Authorization") || "";
    const match = authHeader.match(/^Bearer\s+(.+)$/i);
    const token = match?.[1]?.trim();
    if (!token) {
        throw new Error("Niet ingelogd.");
    }
    return token;
}
async function getWeegstationAuthContext(req, matchmakingId) {
    const admin = createSupabaseAdmin();
    const accessToken = getBearerTokenFromRequest(req);
    const { data: { user }, error: authErr } = await admin.auth.getUser(accessToken);
    if (authErr || !user) {
        throw new Error("Niet ingelogd.");
    }
    const { data: profile, error: profileErr } = await admin.from("user_profiles").select("id, bondteam, role").eq("id", user.id).single();
    if (profileErr) {
        throw new Error(profileErr.message);
    }
    // ✅ Canonical role source: user_profiles.role (single role)
    // Legacy fallback: user_roles + roles
    let roles = [];
    const profileRole = normalizeRoleName(profile?.role);
    if (profileRole) {
        roles = [
            profileRole
        ];
    } else {
        // Legacy fallback
        const { data: userRoles, error: urErr } = await admin.from("user_roles").select("role_id").eq("user_id", user.id);
        if (urErr) {
            throw new Error(urErr.message);
        }
        const roleIds = (userRoles ?? []).map((r)=>r.role_id).filter(Boolean);
        if (roleIds.length > 0) {
            const { data: rolesRows, error: rolesErr } = await admin.from("roles").select("id, name").in("id", roleIds);
            if (rolesErr) {
                throw new Error(rolesErr.message);
            }
            roles = (rolesRows ?? []).map((r)=>normalizeRoleName(r?.name)).filter(Boolean);
        }
    }
    const isAdminLike = roles.some((r)=>[
            "admin",
            "superadmin",
            "dispensatie_admin"
        ].includes(r));
    const isHoofdofficialLike = roles.some((r)=>[
            "hoofdofficial",
            "superadmin",
            "dispensatie_admin"
        ].includes(r));
    const bondteam = String(profile?.bondteam ?? "").trim();
    const hasWeegstationAccess = roles.some((r)=>[
            "official",
            "hoofdofficial",
            "admin",
            "superadmin",
            "dispensatie_admin"
        ].includes(r));
    if (!hasWeegstationAccess) {
        throw new Error("Je hebt geen toegang tot het weegstation.");
    }
    if (matchmakingId) {
        const { data: mm, error: mmErr } = await admin.from("matchmaking_uploads").select("matchmaking_id, bondteam").eq("matchmaking_id", matchmakingId).single();
        if (mmErr) {
            throw new Error(mmErr.message);
        }
        const mmBondteam = String(mm?.bondteam ?? "").trim().toLowerCase();
        const teamAccess = roles.some((r)=>r === "official" || r === "hoofdofficial") && !!mmBondteam && mmBondteam === bondteam.toLowerCase();
        if (!isAdminLike && !teamAccess) {
            throw new Error("Je mag alleen matchmakings van je eigen bondteam zien en bewerken.");
        }
    }
    return {
        userId: user.id,
        roles,
        isAdminLike,
        isHoofdofficialLike,
        bondteam,
        admin
    };
}
}),
"[project]/app/api/officials/weegstation/build/route.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "POST",
    ()=>POST,
    "runtime",
    ()=>runtime
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/server.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$weegstation$2f$routeAuth$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/weegstation/routeAuth.ts [app-route] (ecmascript)");
;
;
const runtime = "nodejs";
function isConflictSecondTimeError(err) {
    const msg = String(err?.message ?? err ?? "").toLowerCase();
    return msg.includes("cannot affect row a second time");
}
function isOldColumnError(err) {
    const msg = String(err?.message ?? err ?? "").toLowerCase();
    return msg.includes("column c.rood_naam does not exist") || msg.includes("column ctx.rood_naam does not exist") || msg.includes("column ctx.blauw_naam does not exist");
}
async function POST(req) {
    try {
        const body = await req.json().catch(()=>({}));
        const matchmakingId = String(body?.matchmakingId ?? "").trim();
        if (!matchmakingId) {
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: "matchmakingId ontbreekt."
            }, {
                status: 400
            });
        }
        const { admin } = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$weegstation$2f$routeAuth$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getWeegstationAuthContext"])(req, matchmakingId);
        let syncWarning = null;
        try {
            const { error: rpcErr } = await admin.rpc("sync_weigh_in_bouts_for_matchmaking", {
                p_matchmaking_id: matchmakingId
            });
            if (rpcErr) {
                if (isOldColumnError(rpcErr)) {
                    syncWarning = "De databasefunctie gebruikt nog oude kolomnamen in controle_bout_context.";
                } else if (isConflictSecondTimeError(rpcErr)) {
                    syncWarning = "De sync-functie leverde dubbele rijen op in dezelfde build.";
                } else {
                    throw rpcErr;
                }
            }
        } catch (e) {
            if (isOldColumnError(e)) {
                syncWarning = "De databasefunctie gebruikt nog oude kolomnamen in controle_bout_context.";
            } else if (isConflictSecondTimeError(e)) {
                syncWarning = "De sync-functie leverde dubbele rijen op in dezelfde build.";
            } else {
                throw e;
            }
        }
        const { data: rows, error: rowsErr } = await admin.from("weigh_in_bouts").select("*").eq("matchmaking_id", matchmakingId).order("controle_run_id", {
            ascending: false,
            nullsFirst: false
        }).order("partij_nr", {
            ascending: true
        });
        if (rowsErr) {
            throw rowsErr;
        }
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            ok: true,
            warning: syncWarning,
            rows: rows ?? [],
            count: (rows ?? []).length
        });
    } catch (e) {
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            error: e?.message ?? "Build van weegstation mislukt."
        }, {
            status: 500
        });
    }
}
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__0fb43560._.js.map