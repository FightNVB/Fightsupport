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
"[project]/lib/weegstation/weighInRulesEngine.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "evaluateWeighInBout",
    ()=>evaluateWeighInBout
]);
const YOUTH_LOWER_OFFSET = 2.0;
const ADULT_LOWER_OFFSET = 3.0;
const TOP_OFFSET = 0.1;
const HEAVY_OPEN_MIN = 95.0;
const MMA_LIMITS = [
    {
        match: /straw/i,
        max: 52.2
    },
    {
        match: /fly/i,
        max: 56.7
    },
    {
        match: /bantam/i,
        max: 61.2
    },
    {
        match: /feather/i,
        max: 65.8
    },
    {
        match: /lightweight/i,
        max: 70.3
    },
    {
        match: /super\s*light/i,
        max: 74.8
    },
    {
        match: /welter/i,
        max: 77.1
    },
    {
        match: /super\s*welter/i,
        max: 79.4
    },
    {
        match: /middleweight/i,
        max: 83.9
    },
    {
        match: /super\s*middle/i,
        max: 88.5
    },
    {
        match: /light\s*heavy/i,
        max: 93.0
    },
    {
        match: /cruiser/i,
        max: 102.1
    },
    {
        match: /heavyweight/i,
        max: 120.2
    },
    {
        match: /super\s*heavy/i,
        max: null
    }
];
function fmtKg(v) {
    if (v == null || !Number.isFinite(v)) return "-";
    return `${Number(v).toFixed(1)} kg`;
}
function toNum(v) {
    if (v == null) return null;
    const s = String(v).trim().replace(",", ".");
    if (!s) return null;
    const n = Number(s);
    return Number.isFinite(n) ? Number(n.toFixed(2)) : null;
}
function parseKlasseMaxGewicht(label) {
    const s = String(label ?? "").trim().toLowerCase();
    if (!s) return null;
    if (isHeavyweightOpenClass(label)) {
        return null;
    }
    const cleaned = s.replace(/\s/g, "");
    const match = cleaned.match(/(?:tot|max|onder|t\/m|\-)(\d+(?:[.,]\d+)?)(?:kg)?/) || cleaned.match(/(\d+(?:[.,]\d+)?)\s*-\s*(\d+(?:[.,]\d+)?)(?:kg)?/) || cleaned.match(/(\d+(?:[.,]\d+)?)(?:kg)/);
    if (!match) return null;
    const raw = match[2] ?? match[1];
    if (!raw) return null;
    const n = Number(raw.replace(",", "."));
    return Number.isFinite(n) ? Number(n.toFixed(2)) : null;
}
function inferLeeftijdType(v) {
    const s = String(v ?? "").trim().toLowerCase();
    if (!s) return "onbekend";
    if (s.includes("jeugd") || s.includes("junior")) return "jeugd";
    if (s.includes("volwass") || s.includes("senior")) return "volwassene";
    return "onbekend";
}
function getMmaClassMax(klasse) {
    const s = String(klasse ?? "").trim();
    if (!s) return null;
    for (const row of MMA_LIMITS){
        if (row.match.test(s)) return row.max;
    }
    return null;
}
function isHeavyweightOpenClass(label) {
    const s = String(label ?? "").trim().toLowerCase();
    if (!s) return false;
    return /(?:^|\D)95(?:[.,]0+)?\s*\+(?:\D|$)/i.test(s) || /super\s*heavy/i.test(s) || /superzwaar/i.test(s) || /open\s*(klasse|class)/i.test(s);
}
function getAllowedWeightRange(params) {
    const { leeftijdType, effectiveMaxGewicht, isMma, isHeavyweightOpen } = params;
    if (isHeavyweightOpen) {
        return {
            min: HEAVY_OPEN_MIN,
            max: null
        };
    }
    if (effectiveMaxGewicht == null) {
        return {
            min: null,
            max: null
        };
    }
    if (isMma) {
        return {
            min: null,
            max: Number(effectiveMaxGewicht.toFixed(2))
        };
    }
    const max = Number((effectiveMaxGewicht - TOP_OFFSET).toFixed(2));
    if (leeftijdType === "jeugd") {
        return {
            min: Number((effectiveMaxGewicht - YOUTH_LOWER_OFFSET - TOP_OFFSET).toFixed(2)),
            max
        };
    }
    if (leeftijdType === "volwassene") {
        return {
            min: Number((effectiveMaxGewicht - ADULT_LOWER_OFFSET - TOP_OFFSET).toFixed(2)),
            max
        };
    }
    return {
        min: null,
        max
    };
}
function getEffectiveMaxWeight(input, isMma) {
    if (isMma) {
        const mmaMax = getMmaClassMax(input.klasse_mm);
        if (mmaMax != null) {
            return {
                value: mmaMax,
                source: "mma-klasse"
            };
        }
    }
    if (input.max_gewicht != null && Number.isFinite(input.max_gewicht)) {
        return {
            value: Number(input.max_gewicht.toFixed(2)),
            source: "tabel"
        };
    }
    const klasseMax = parseKlasseMaxGewicht(input.klasse_mm);
    if (klasseMax != null) {
        return {
            value: klasseMax,
            source: "klasse"
        };
    }
    const declared = [
        input.rood_doorgegeven_gewicht,
        input.blauw_doorgegeven_gewicht
    ].map(toNum).filter((v)=>v != null);
    if (declared.length > 0) {
        return {
            value: Number(Math.max(...declared).toFixed(2)),
            source: "doorgegeven"
        };
    }
    return {
        value: null,
        source: "onbekend"
    };
}
function evaluateWeighInBout(input) {
    const messages = [];
    const rood = toNum(input.rood_gewogen_gewicht);
    const blauw = toNum(input.blauw_gewogen_gewicht);
    const leeftijdType = inferLeeftijdType(input.leeftijd_type);
    const dispVerleend = !!input.dispensatie_verleend;
    const discipline = String(input.discipline ?? "").toLowerCase();
    const isMma = discipline.includes("mma");
    if (rood == null && blauw == null) {
        return {
            leeftijdType,
            diff: null,
            reglementStatus: "WACHT_OP_WEGEN",
            praktijkStatus: "WACHT_OP_WEGEN",
            eindStatus: "WACHT_OP_WEGEN",
            dispensatieNodig: false,
            dispensatieMogelijk: false,
            messages: [
                "Nog geen van beide vechters gewogen."
            ],
            effectiveMaxGewicht: null,
            minToelaatbaarGewicht: null,
            maxToelaatbaarGewicht: null,
            maxSource: "onbekend",
            withinRangeRood: false,
            withinRangeBlauw: false,
            nietOpGewichtRood: false,
            nietOpGewichtBlauw: false,
            teLichtRood: false,
            teLichtBlauw: false,
            teZwaarRood: false,
            teZwaarBlauw: false,
            hasAnyOffWeight: false,
            canProceedWithPenalty: false,
            adminSanctieNodig: false,
            adminSanctieReason: null,
            isHeavyweightOpen: false,
            isMma
        };
    }
    if (rood == null || blauw == null) {
        return {
            leeftijdType,
            diff: null,
            reglementStatus: "DEELS_GEWOGEN",
            praktijkStatus: "DEELS_GEWOGEN",
            eindStatus: "DEELS_GEWOGEN",
            dispensatieNodig: false,
            dispensatieMogelijk: false,
            messages: [
                "Nog niet beide vechters gewogen."
            ],
            effectiveMaxGewicht: null,
            minToelaatbaarGewicht: null,
            maxToelaatbaarGewicht: null,
            maxSource: "onbekend",
            withinRangeRood: false,
            withinRangeBlauw: false,
            nietOpGewichtRood: false,
            nietOpGewichtBlauw: false,
            teLichtRood: false,
            teLichtBlauw: false,
            teZwaarRood: false,
            teZwaarBlauw: false,
            hasAnyOffWeight: false,
            canProceedWithPenalty: false,
            adminSanctieNodig: false,
            adminSanctieReason: null,
            isHeavyweightOpen: false,
            isMma
        };
    }
    const diff = Number(Math.abs(rood - blauw).toFixed(2));
    const effectiveMaxInfo = getEffectiveMaxWeight(input, isMma);
    const heavyByClass = isHeavyweightOpenClass(input.klasse_mm);
    const isHeavyweightOpen = heavyByClass;
    const allowedRange = getAllowedWeightRange({
        leeftijdType,
        effectiveMaxGewicht: effectiveMaxInfo.value,
        isMma,
        isHeavyweightOpen
    });
    const minToelaatbaarGewicht = allowedRange.min;
    const maxToelaatbaarGewicht = allowedRange.max;
    const hasKnownWeightRange = isHeavyweightOpen || effectiveMaxInfo.value != null;
    const teLichtRood = minToelaatbaarGewicht != null ? rood < minToelaatbaarGewicht : false;
    const teLichtBlauw = minToelaatbaarGewicht != null ? blauw < minToelaatbaarGewicht : false;
    const teZwaarRood = maxToelaatbaarGewicht != null ? rood > maxToelaatbaarGewicht : false;
    const teZwaarBlauw = maxToelaatbaarGewicht != null ? blauw > maxToelaatbaarGewicht : false;
    const withinRangeRood = hasKnownWeightRange && (minToelaatbaarGewicht == null || rood >= minToelaatbaarGewicht) && (maxToelaatbaarGewicht == null || rood <= maxToelaatbaarGewicht);
    const withinRangeBlauw = hasKnownWeightRange && (minToelaatbaarGewicht == null || blauw >= minToelaatbaarGewicht) && (maxToelaatbaarGewicht == null || blauw <= maxToelaatbaarGewicht);
    const nietOpGewichtRood = hasKnownWeightRange ? teLichtRood || teZwaarRood : false;
    const nietOpGewichtBlauw = hasKnownWeightRange ? teLichtBlauw || teZwaarBlauw : false;
    const hasAnyOffWeight = nietOpGewichtRood || nietOpGewichtBlauw;
    if (!hasKnownWeightRange) {
        messages.push("Geen bruikbare bovengrens gevonden; verschilregels zijn wel toegepast, maar niet-op-gewicht kon niet automatisch worden beoordeeld.");
    } else if (isHeavyweightOpen) {
        messages.push(`95+ klasse: beide vechters moeten minimaal ${fmtKg(HEAVY_OPEN_MIN)} wegen. Daarboven geldt geen bovengrens en maakt onderling gewichtsverschil niet meer uit.`);
    } else if (minToelaatbaarGewicht != null && maxToelaatbaarGewicht != null) {
        messages.push(`Toegestaan gewicht ${fmtKg(minToelaatbaarGewicht)} t/m ${fmtKg(maxToelaatbaarGewicht)}.`);
    } else if (maxToelaatbaarGewicht != null) {
        messages.push(`Maximaal toegestaan gewicht: ${fmtKg(maxToelaatbaarGewicht)}.`);
    }
    if (teLichtRood) messages.push("Rood is te licht voor de afgesproken partij.");
    if (teZwaarRood) messages.push("Rood is te zwaar voor de afgesproken partij.");
    if (teLichtBlauw) messages.push("Blauw is te licht voor de afgesproken partij.");
    if (teZwaarBlauw) messages.push("Blauw is te zwaar voor de afgesproken partij.");
    if (isMma) {
        if (diff <= 4.0) {
            return {
                leeftijdType,
                diff,
                reglementStatus: hasAnyOffWeight ? "AFWIJKING_GEWICHT" : "OK",
                praktijkStatus: "OK",
                eindStatus: "OK",
                dispensatieNodig: false,
                dispensatieMogelijk: false,
                messages: hasAnyOffWeight ? [
                    ...messages,
                    "MMA: verschil is toegestaan, maar minimaal één vechter zit buiten klasse."
                ] : [
                    ...messages,
                    "MMA: verschil binnen 4.0 kg."
                ],
                effectiveMaxGewicht: effectiveMaxInfo.value,
                minToelaatbaarGewicht,
                maxToelaatbaarGewicht,
                maxSource: effectiveMaxInfo.source,
                withinRangeRood,
                withinRangeBlauw,
                nietOpGewichtRood,
                nietOpGewichtBlauw,
                teLichtRood,
                teLichtBlauw,
                teZwaarRood,
                teZwaarBlauw,
                hasAnyOffWeight,
                canProceedWithPenalty: hasAnyOffWeight,
                adminSanctieNodig: false,
                adminSanctieReason: null,
                isHeavyweightOpen,
                isMma
            };
        }
        return {
            leeftijdType,
            diff,
            reglementStatus: "AFKEUR",
            praktijkStatus: "AFKEUR",
            eindStatus: "AFKEUR",
            dispensatieNodig: false,
            dispensatieMogelijk: false,
            messages: [
                ...messages,
                "MMA: verschil groter dan 4.0 kg, partij kan niet doorgaan."
            ],
            effectiveMaxGewicht: effectiveMaxInfo.value,
            minToelaatbaarGewicht,
            maxToelaatbaarGewicht,
            maxSource: effectiveMaxInfo.source,
            withinRangeRood,
            withinRangeBlauw,
            nietOpGewichtRood,
            nietOpGewichtBlauw,
            teLichtRood,
            teLichtBlauw,
            teZwaarRood,
            teZwaarBlauw,
            hasAnyOffWeight,
            canProceedWithPenalty: false,
            adminSanctieNodig: true,
            adminSanctieReason: "MMA-gewichtsverschil te groot.",
            isHeavyweightOpen,
            isMma
        };
    }
    const okMax = leeftijdType === "jeugd" ? 2.5 : 3.5;
    const dispMax = leeftijdType === "jeugd" ? 3.9 : 6.9;
    const rejectFrom = leeftijdType === "jeugd" ? 4.0 : 7.0;
    if (isHeavyweightOpen) {
        return {
            leeftijdType,
            diff,
            reglementStatus: hasAnyOffWeight ? "AFWIJKING_GEWICHT" : "OK",
            praktijkStatus: hasAnyOffWeight ? "AFKEUR" : "OK",
            eindStatus: hasAnyOffWeight ? "AFKEUR" : "OK",
            dispensatieNodig: false,
            dispensatieMogelijk: false,
            messages: hasAnyOffWeight ? [
                ...messages,
                "95+ klasse: minimaal één vechter weegt minder dan 95.0 kg en valt dus buiten de klasse."
            ] : [
                ...messages,
                "95+ klasse toegestaan. Onderling gewichtsverschil speelt hier geen rol."
            ],
            effectiveMaxGewicht: effectiveMaxInfo.value,
            minToelaatbaarGewicht,
            maxToelaatbaarGewicht,
            maxSource: effectiveMaxInfo.source,
            withinRangeRood,
            withinRangeBlauw,
            nietOpGewichtRood,
            nietOpGewichtBlauw,
            teLichtRood,
            teLichtBlauw,
            teZwaarRood,
            teZwaarBlauw,
            hasAnyOffWeight,
            canProceedWithPenalty: false,
            adminSanctieNodig: false,
            adminSanctieReason: null,
            isHeavyweightOpen,
            isMma
        };
    }
    if (diff >= rejectFrom) {
        const adminSanctieReason = "Partij kan niet doorgaan: gewichtsverschil te groot. Admin moet administratieve sanctie beoordelen.";
        return {
            leeftijdType,
            diff,
            reglementStatus: "AFKEUR",
            praktijkStatus: "AFKEUR",
            eindStatus: "AFKEUR",
            dispensatieNodig: false,
            dispensatieMogelijk: false,
            messages: [
                ...messages,
                adminSanctieReason
            ],
            effectiveMaxGewicht: effectiveMaxInfo.value,
            minToelaatbaarGewicht,
            maxToelaatbaarGewicht,
            maxSource: effectiveMaxInfo.source,
            withinRangeRood,
            withinRangeBlauw,
            nietOpGewichtRood,
            nietOpGewichtBlauw,
            teLichtRood,
            teLichtBlauw,
            teZwaarRood,
            teZwaarBlauw,
            hasAnyOffWeight,
            canProceedWithPenalty: false,
            adminSanctieNodig: true,
            adminSanctieReason,
            isHeavyweightOpen,
            isMma
        };
    }
    if (diff <= okMax) {
        return {
            leeftijdType,
            diff,
            reglementStatus: hasAnyOffWeight ? "AFWIJKING_GEWICHT" : "OK",
            praktijkStatus: "OK",
            eindStatus: "OK",
            dispensatieNodig: false,
            dispensatieMogelijk: false,
            messages: hasAnyOffWeight ? [
                ...messages,
                "Verschil is toegestaan. Niet-op-gewicht kan een minpunt opleveren."
            ] : [
                ...messages,
                `Verschil binnen normale marge (${okMax.toFixed(1)} kg).`
            ],
            effectiveMaxGewicht: effectiveMaxInfo.value,
            minToelaatbaarGewicht,
            maxToelaatbaarGewicht,
            maxSource: effectiveMaxInfo.source,
            withinRangeRood,
            withinRangeBlauw,
            nietOpGewichtRood,
            nietOpGewichtBlauw,
            teLichtRood,
            teLichtBlauw,
            teZwaarRood,
            teZwaarBlauw,
            hasAnyOffWeight,
            canProceedWithPenalty: hasAnyOffWeight,
            adminSanctieNodig: false,
            adminSanctieReason: null,
            isHeavyweightOpen,
            isMma
        };
    }
    if (diff <= dispMax) {
        return {
            leeftijdType,
            diff,
            reglementStatus: hasAnyOffWeight ? "AFWIJKING_GEWICHT" : "AFWIJKING_DIFF",
            praktijkStatus: "DISPENSATIE_NODIG",
            eindStatus: dispVerleend ? "GOEDGEKEURD_MET_DISPENSATIE" : "DISPENSATIE_NODIG",
            dispensatieNodig: true,
            dispensatieMogelijk: true,
            messages: [
                ...messages,
                `Gewichtsverschil vraagt dispensatie (${okMax.toFixed(1)} t/m ${dispMax.toFixed(1)} kg).`,
                ...hasAnyOffWeight ? [
                    "Niet-op-gewicht kan daarnaast ook een minpunt opleveren."
                ] : []
            ],
            effectiveMaxGewicht: effectiveMaxInfo.value,
            minToelaatbaarGewicht,
            maxToelaatbaarGewicht,
            maxSource: effectiveMaxInfo.source,
            withinRangeRood,
            withinRangeBlauw,
            nietOpGewichtRood,
            nietOpGewichtBlauw,
            teLichtRood,
            teLichtBlauw,
            teZwaarRood,
            teZwaarBlauw,
            hasAnyOffWeight,
            canProceedWithPenalty: hasAnyOffWeight,
            adminSanctieNodig: false,
            adminSanctieReason: null,
            isHeavyweightOpen,
            isMma
        };
    }
    return {
        leeftijdType,
        diff,
        reglementStatus: "HANDMATIGE_BEOORDELING",
        praktijkStatus: "HANDMATIGE_BEOORDELING",
        eindStatus: "HANDMATIGE_BEOORDELING",
        dispensatieNodig: false,
        dispensatieMogelijk: false,
        messages: [
            ...messages,
            "Partij valt buiten automatische beoordeling."
        ],
        effectiveMaxGewicht: effectiveMaxInfo.value,
        minToelaatbaarGewicht,
        maxToelaatbaarGewicht,
        maxSource: effectiveMaxInfo.source,
        withinRangeRood,
        withinRangeBlauw,
        nietOpGewichtRood,
        nietOpGewichtBlauw,
        teLichtRood,
        teLichtBlauw,
        teZwaarRood,
        teZwaarBlauw,
        hasAnyOffWeight,
        canProceedWithPenalty: false,
        adminSanctieNodig: false,
        adminSanctieReason: null,
        isHeavyweightOpen,
        isMma
    };
}
}),
"[project]/app/api/officials/weegstation/dispensatie/route.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "POST",
    ()=>POST,
    "runtime",
    ()=>runtime
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/server.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$weegstation$2f$routeAuth$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/weegstation/routeAuth.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$weegstation$2f$weighInRulesEngine$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/weegstation/weighInRulesEngine.ts [app-route] (ecmascript)");
;
;
;
const runtime = "nodejs";
function canDecideDispensation(ctx) {
    if (ctx.isHoofdofficialLike) return true;
    const names = (ctx.roleNames ?? []).map((x)=>String(x).trim().toLowerCase());
    return names.includes("hoofdofficial") || names.includes("superadmin");
}
async function POST(req) {
    try {
        const body = await req.json().catch(()=>({}));
        const rowId = String(body?.id ?? "").trim();
        const decision = String(body?.decision ?? "").trim().toLowerCase();
        if (!rowId) {
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: "id ontbreekt."
            }, {
                status: 400
            });
        }
        if (![
            "approved",
            "rejected"
        ].includes(decision)) {
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: "decision moet approved of rejected zijn."
            }, {
                status: 400
            });
        }
        const auth = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$weegstation$2f$routeAuth$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getWeegstationAuthContext"])(req);
        const { admin, userId } = auth;
        if (!canDecideDispensation(auth)) {
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: "Alleen hoofdofficial of superadmin mag gewicht-dispensaties behandelen."
            }, {
                status: 403
            });
        }
        const { data: row, error: rowErr } = await admin.from("weigh_in_bouts").select("*").eq("id", rowId).single();
        if (rowErr || !row) {
            throw new Error(rowErr?.message ?? "Partij niet gevonden.");
        }
        await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$weegstation$2f$routeAuth$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getWeegstationAuthContext"])(req, row.matchmaking_id);
        const evalResult = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$weegstation$2f$weighInRulesEngine$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["evaluateWeighInBout"])({
            discipline: row.discipline,
            klasse_mm: row.klasse_mm,
            leeftijd_type: row.leeftijd_type,
            max_gewicht: row.max_gewicht,
            rood_doorgegeven_gewicht: row.rood_doorgegeven_gewicht,
            blauw_doorgegeven_gewicht: row.blauw_doorgegeven_gewicht,
            rood_gewogen_gewicht: row.rood_gewogen_gewicht,
            blauw_gewogen_gewicht: row.blauw_gewogen_gewicht,
            dispensatie_verleend: false
        });
        if (!evalResult.dispensatieMogelijk && !evalResult.dispensatieNodig) {
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: "Voor deze partij is geen gewicht-dispensatie van toepassing."
            }, {
                status: 400
            });
        }
        const now = new Date().toISOString();
        const payload = decision === "approved" ? {
            dispensatie_nodig: true,
            dispensatie_verleend: true,
            dispensatie_reason: "VERLEEND",
            dispensatie_by: userId,
            dispensatie_at: now,
            praktijk_status: "OK",
            eindstatus: "OK",
            admin_sanctie_nodig: false,
            admin_sanctie_reason: null,
            laatste_bewerking_door: userId,
            laatste_bewerking_op: now,
            updated_at: now
        } : {
            dispensatie_nodig: false,
            dispensatie_verleend: false,
            dispensatie_reason: "AFGEWEZEN",
            dispensatie_by: userId,
            dispensatie_at: now,
            praktijk_status: "AFKEUR",
            eindstatus: "AFKEUR",
            admin_sanctie_nodig: false,
            admin_sanctie_reason: null,
            laatste_bewerking_door: userId,
            laatste_bewerking_op: now,
            updated_at: now
        };
        const { data: updated, error: updErr } = await admin.from("weigh_in_bouts").update(payload).eq("id", rowId).select("*").single();
        if (updErr || !updated) {
            throw new Error(updErr?.message ?? "Dispensatie beslissing mislukt.");
        }
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            ok: true,
            bout: updated,
            eval: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$weegstation$2f$weighInRulesEngine$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["evaluateWeighInBout"])({
                discipline: updated.discipline,
                klasse_mm: updated.klasse_mm,
                leeftijd_type: updated.leeftijd_type,
                max_gewicht: updated.max_gewicht,
                rood_doorgegeven_gewicht: updated.rood_doorgegeven_gewicht,
                blauw_doorgegeven_gewicht: updated.blauw_doorgegeven_gewicht,
                rood_gewogen_gewicht: updated.rood_gewogen_gewicht,
                blauw_gewogen_gewicht: updated.blauw_gewogen_gewicht,
                dispensatie_verleend: updated.dispensatie_verleend
            })
        });
    } catch (e) {
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            error: e?.message ?? "Gewicht-dispensatie beslissing mislukt."
        }, {
            status: 500
        });
    }
}
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__efe2b865._.js.map