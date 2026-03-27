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
"[project]/app/api/_utils/authz.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "assertCanAccessMatchmaking",
    ()=>assertCanAccessMatchmaking,
    "getMatchmakingMeta",
    ()=>getMatchmakingMeta,
    "getMatchmakingOwner",
    ()=>getMatchmakingOwner,
    "getUserBondteam",
    ()=>getUserBondteam,
    "getUserRole",
    ()=>getUserRole,
    "requireAdmin",
    ()=>requireAdmin,
    "requireAnyRole",
    ()=>requireAnyRole,
    "requireUserWithRole",
    ()=>requireUserWithRole,
    "supabaseAdmin",
    ()=>supabaseAdmin
]);
// app/api/_utils/authz.ts
// Auth + authorization helpers for API routes.
// Uses service role to verify bearer tokens and to read roles / ownership.
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$supabase$2f$supabase$2d$js$2f$dist$2f$index$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/@supabase/supabase-js/dist/index.mjs [app-route] (ecmascript) <locals>");
;
const supabaseAdmin = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$supabase$2f$supabase$2d$js$2f$dist$2f$index$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$locals$3e$__["createClient"])(("TURBOPACK compile-time value", "https://krskuyaqvzloptfndznc.supabase.co"), process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
        persistSession: false
    }
});
function getBearerToken(req) {
    const h = req.headers.get("authorization") || req.headers.get("Authorization") || "";
    const token = h.toLowerCase().startsWith("bearer ") ? h.slice(7).trim() : null;
    return token && token.length ? token : null;
}
function normalizeRole(v) {
    const r = String(v ?? "").trim().toLowerCase();
    if (r === "superadmin" || r === "admin" || r === "matchmaker" || r === "official" || r === "hoofdofficial" || r === "dispensatie_admin") {
        return r;
    }
    return "unknown";
}
async function getUserRole(userId) {
    // 1) user_profiles.role
    const { data: prof, error: pErr } = await supabaseAdmin.from("user_profiles").select("role").eq("id", userId).maybeSingle();
    if (!pErr) {
        const r = normalizeRole(prof?.role);
        if (r !== "unknown") return r;
    }
    // 2) legacy: user_roles + roles
    const { data, error } = await supabaseAdmin.from("user_roles").select(`
      role_id,
      roles:roles ( name )
    `).eq("user_id", userId).maybeSingle();
    if (error) {
        console.error("[authz:getUserRole]", error);
        return "unknown";
    }
    const roleName = data?.roles?.name;
    return normalizeRole(roleName);
}
async function requireUserWithRole(req) {
    const token = getBearerToken(req);
    if (!token) throw new Response("Unauthorized", {
        status: 401
    });
    const { data: userData, error: userErr } = await supabaseAdmin.auth.getUser(token);
    if (userErr || !userData?.user?.id) throw new Response("Unauthorized", {
        status: 401
    });
    const userId = userData.user.id;
    const role = await getUserRole(userId);
    return {
        userId,
        role
    };
}
async function requireAdmin(req) {
    const { userId, role } = await requireUserWithRole(req);
    if (role !== "admin" && role !== "superadmin") throw new Response("Forbidden", {
        status: 403
    });
    return {
        userId,
        role
    };
}
async function requireAnyRole(req, allowed) {
    const { userId, role } = await requireUserWithRole(req);
    if (role === "superadmin") return {
        userId,
        role
    };
    if (!allowed.includes(role)) throw new Response("Forbidden", {
        status: 403
    });
    return {
        userId,
        role
    };
}
async function getUserBondteam(userId) {
    const { data, error } = await supabaseAdmin.from("user_profiles").select("bondteam").eq("id", userId).maybeSingle();
    if (error) {
        console.error("[authz:getUserBondteam]", error);
        return null;
    }
    const bt = data?.bondteam;
    return bt ? String(bt) : null;
}
async function getMatchmakingMeta(matchmaking_id) {
    const { data, error } = await supabaseAdmin.from("matchmaking_uploads").select("uploaded_by, bondteam").eq("matchmaking_id", matchmaking_id).order("uploaded_at", {
        ascending: false
    }).limit(1).maybeSingle();
    if (error) {
        console.error("[authz:getMatchmakingMeta]", error);
        return null;
    }
    return {
        uploaded_by: data?.uploaded_by ? String(data.uploaded_by) : null,
        bondteam: data?.bondteam ? String(data.bondteam) : null
    };
}
async function getMatchmakingOwner(matchmaking_id) {
    const meta = await getMatchmakingMeta(matchmaking_id);
    return meta?.uploaded_by ?? null;
}
async function assertCanAccessMatchmaking(opts) {
    const { matchmaking_id, userId, role } = opts;
    if (role === "admin" || role === "superadmin") return;
    const meta = await getMatchmakingMeta(matchmaking_id);
    const owner = meta?.uploaded_by ?? null;
    const mmBond = meta?.bondteam ?? null;
    if (role === "matchmaker") {
        if (!owner || owner !== userId) throw new Response("Forbidden", {
            status: 403
        });
        return;
    }
    if (role === "official" || role === "hoofdofficial") {
        const userBond = await getUserBondteam(userId);
        if (!userBond || !mmBond || String(userBond) !== String(mmBond)) {
            throw new Response("Forbidden", {
                status: 403
            });
        }
        return;
    }
    throw new Response("Forbidden", {
        status: 403
    });
}
;
}),
"[project]/app/api/control-engine/review/route.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "POST",
    ()=>POST,
    "runtime",
    ()=>runtime
]);
// app/api/control-engine/review/route.ts
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/server.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$supabase$2f$supabase$2d$js$2f$dist$2f$index$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/@supabase/supabase-js/dist/index.mjs [app-route] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$app$2f$api$2f$_utils$2f$authz$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/app/api/_utils/authz.ts [app-route] (ecmascript)");
;
;
;
const runtime = "nodejs";
const supabase = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$supabase$2f$supabase$2d$js$2f$dist$2f$index$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$locals$3e$__["createClient"])(("TURBOPACK compile-time value", "https://krskuyaqvzloptfndznc.supabase.co"), process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
        persistSession: false
    }
});
function nowIso() {
    return new Date().toISOString();
}
function normalizeResultaat(v) {
    const s = String(v ?? "").trim().toLowerCase();
    if (s === "ok") return "ok";
    if (s === "dispensatie") return "dispensatie";
    if (s === "afkeur" || s === "afgekeurd" || s === "afkeuren") return "afgekeurd";
    return "actie";
}
async function POST(req) {
    try {
        const { userId, role } = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$app$2f$api$2f$_utils$2f$authz$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["requireUserWithRole"])(req);
        const body = await req.json().catch(()=>({}));
        const controle_resultaat_id = String(body?.controle_resultaat_id ?? "").trim();
        const decision = String(body?.decision ?? "").trim();
        const note = String(body?.note ?? "").trim() || null;
        if (!controle_resultaat_id) {
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: "controle_resultaat_id ontbreekt"
            }, {
                status: 400
            });
        }
        if (decision !== "approve" && decision !== "reject") {
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: "Ongeldige decision (gebruik approve/reject)"
            }, {
                status: 400
            });
        }
        const { data: row, error: rowErr } = await supabase.from("controle_resultaten").select("*").eq("id", controle_resultaat_id).single();
        if (rowErr || !row) {
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: "Controle-regel niet gevonden"
            }, {
                status: 404
            });
        }
        const huidig = normalizeResultaat(row.resultaat);
        const code = String(row?.rule_code ?? "").toLowerCase();
        const ruleName = String(row?.rule ?? "").toLowerCase();
        const msg = String(row?.boodschap ?? "").toLowerCase();
        const hay = `${code} ${ruleName} ${msg}`;
        const isLicentieOfKeurmerk = hay.includes("licentie") || hay.includes("keurmerk");
        // DISPENSATIE: normaal via dispensatie-module,
        // maar superadmin mag (op verzoek) direct goed/afkeuren vanuit de controle-detailpagina.
        if (huidig === "dispensatie") {
            if (role !== "superadmin") {
                return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                    error: "Dispensatie kan niet via review API (gebruik dispensatie-module)."
                }, {
                    status: 400
                });
            }
        // superadmin: toegestaan
        }
        // reject: reden verplicht
        if (decision === "reject" && !note) {
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: "Aantekeningen verplicht bij afkeuren."
            }, {
                status: 400
            });
        }
        const reviewed_at = nowIso();
        // Ownership check (matchmaker must own the matchmaking)
        const mmId = String(row?.matchmaking_id ?? "").trim();
        if (mmId) {
            await (0, __TURBOPACK__imported__module__$5b$project$5d2f$app$2f$api$2f$_utils$2f$authz$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["assertCanAccessMatchmaking"])({
                matchmaking_id: mmId,
                userId,
                role
            });
        } else {
            // if row has no matchmaking_id, only admin/superadmin may review it
            if (!(role === "admin" || role === "superadmin")) {
                return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                    error: "Geen rechten"
                }, {
                    status: 403
                });
            }
        }
        // Matchmaker restrictions:
        // - matchmaker may ONLY approve (no reject)
        // - matchmaker may ONLY approve a small allow-list (Belgium checks, 40+ info, name mismatch, missing data)
        // - never approve license/keurmerk/startverbod or general combat rules overrides
        if (role === "matchmaker") {
            if (decision !== "approve") {
                return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                    error: "Matchmakers kunnen alleen goedkeuren."
                }, {
                    status: 403
                });
            }
            const denied = hay.includes("licentie") || hay.includes("keurmerk") || hay.includes("startverbod");
            if (denied) {
                return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                    error: "Matchmakers mogen deze melding niet overrulen."
                }, {
                    status: 403
                });
            }
            const allowed = hay.includes("belg") || hay.includes("buitenland") || hay.includes("40") || hay.includes("ouder") || hay.includes("naam") && hay.includes("mismatch") || hay.includes("ontbreek") || hay.includes("missing") || hay.includes("onbekend") || hay.includes("geen va");
            if (!allowed) {
                return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                    error: "Matchmakers mogen alleen INFO/ACTIE meldingen goedkeuren (België/40+/naam mismatch/missende gegevens)."
                }, {
                    status: 403
                });
            }
        }
        // Alleen superadmin mag AFKEUR op licentie/keurmerk overrulen
        if (decision === "approve" && huidig === "afgekeurd" && isLicentieOfKeurmerk) {
            if (role !== "superadmin") {
                return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                    error: "Alleen superadmin mag AFKEUR op licentie of keurmerk overrulen."
                }, {
                    status: 403
                });
            }
        }
        if (decision === "approve") {
            // Bij goedkeuren wordt resultaat altijd OK.
            // Daardoor blijft deze override staan en zie je overal alleen nog OK.
            const update = {
                resultaat: "ok",
                review_status: "goedgekeurd",
                reviewed_by: userId,
                reviewed_at,
                original_resultaat: row.original_resultaat ?? row.resultaat,
                aantekeningen: note ?? row.aantekeningen
            };
            const { error: updErr } = await supabase.from("controle_resultaten").update(update).eq("id", controle_resultaat_id);
            if (updErr) throw updErr;
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                ok: true,
                row: {
                    ...row,
                    ...update
                }
            });
        }
        // decision === "reject"
        const update = {
            resultaat: "afgekeurd",
            review_status: "afgekeurd",
            reviewed_by: userId,
            reviewed_at,
            original_resultaat: row.original_resultaat ?? row.resultaat,
            aantekeningen: note
        };
        const { error: updErr } = await supabase.from("controle_resultaten").update(update).eq("id", controle_resultaat_id);
        if (updErr) throw updErr;
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            ok: true,
            row: {
                ...row,
                ...update
            }
        });
    } catch (e) {
        console.error("[review API]", e);
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            error: e?.message ?? "Onbekende fout"
        }, {
            status: 500
        });
    }
}
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__e63065ef._.js.map