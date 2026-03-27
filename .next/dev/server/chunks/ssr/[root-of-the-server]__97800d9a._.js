module.exports = [
"[externals]/next/dist/server/app-render/action-async-storage.external.js [external] (next/dist/server/app-render/action-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/action-async-storage.external.js", () => require("next/dist/server/app-render/action-async-storage.external.js"));

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
"[project]/lib/weegstation/weighInRulesEngine.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
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
"[project]/app/dashboard/officials/weegstation/[matchmakingId]/page.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>WeegstationDetailPage
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$image$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/image.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/client/app-dir/link.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/navigation.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$save$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Save$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/save.js [app-ssr] (ecmascript) <export default as Save>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$search$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Search$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/search.js [app-ssr] (ecmascript) <export default as Search>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$shield$2d$alert$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__ShieldAlert$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/shield-alert.js [app-ssr] (ecmascript) <export default as ShieldAlert>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$user$2d$round$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__UserRound$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/user-round.js [app-ssr] (ecmascript) <export default as UserRound>");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabaseClient$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/supabaseClient.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$api$2f$authedFetch$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/api/authedFetch.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$weegstation$2f$weighInRulesEngine$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/weegstation/weighInRulesEngine.ts [app-ssr] (ecmascript)");
"use client";
;
;
;
;
;
;
;
;
;
const NVB_ORANGE = "#ff4d00";
const FS_LINE_LIGHT = "rgba(0,0,0,0.12)";
function pageBgStyle() {
    return {
        background: "radial-gradient(circle at top, rgba(255,77,0,0.13) 0%, rgba(255,77,0,0) 24%), linear-gradient(180deg, #edf1f5 0%, #dfe5eb 100%)"
    };
}
function metalFrameStyle() {
    return {
        border: "4px solid rgba(20,22,26,0.90)",
        borderRadius: 26,
        background: "radial-gradient(900px 300px at 50% -10%, rgba(255,77,0,0.16), transparent 55%), linear-gradient(135deg, rgba(255,255,255,0.20) 0%, rgba(255,255,255,0.05) 20%, rgba(255,255,255,0.00) 42%, rgba(255,255,255,0.12) 70%, rgba(255,255,255,0.02) 100%), repeating-linear-gradient(90deg, rgba(255,255,255,0.05) 0px, rgba(255,255,255,0.05) 1px, rgba(255,255,255,0.015) 1px, rgba(255,255,255,0.015) 5px), linear-gradient(180deg, #575b64 0%, #2b2f37 45%, #181b20 100%)",
        boxShadow: "0 20px 55px rgba(0,0,0,0.22), inset 0 0 0 2px rgba(255,255,255,0.14), inset 0 0 0 5px rgba(90,94,104,0.28), inset 0 -14px 22px rgba(0,0,0,0.30)"
    };
}
function metalInnerStyle() {
    return {
        border: "3px solid rgba(20,22,26,0.34)",
        borderRadius: 20,
        background: "repeating-linear-gradient(90deg, rgba(255,255,255,0.08) 0px, rgba(255,255,255,0.08) 1px, rgba(255,255,255,0.03) 1px, rgba(255,255,255,0.03) 6px), linear-gradient(180deg, #f8fafc 0%, #e7edf3 100%)",
        boxShadow: "inset 0 0 0 2px rgba(255,255,255,0.80), inset 0 0 0 6px rgba(0,0,0,0.08), inset 0 -12px 22px rgba(0,0,0,0.08)"
    };
}
function darkPanelStyle() {
    return {
        background: "linear-gradient(180deg, rgba(47,50,58,0.98) 0%, rgba(30,32,37,0.98) 100%)",
        border: "1px solid rgba(255,255,255,0.08)",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.07)",
        borderRadius: 16
    };
}
function silverCardStyle() {
    return {
        background: "repeating-linear-gradient(90deg, rgba(255,255,255,0.08) 0px, rgba(255,255,255,0.08) 1px, rgba(255,255,255,0.03) 1px, rgba(255,255,255,0.03) 6px), linear-gradient(180deg, rgba(255,255,255,0.96) 0%, rgba(237,242,247,0.98) 100%)",
        border: "2px solid rgba(0,0,0,0.15)",
        borderRadius: 18,
        boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.75), inset 0 -10px 18px rgba(0,0,0,0.06)"
    };
}
function statsBoxStyle() {
    return {
        background: "repeating-linear-gradient(90deg, rgba(255,255,255,0.10) 0px, rgba(255,255,255,0.10) 1px, rgba(255,255,255,0.04) 1px, rgba(255,255,255,0.04) 7px), linear-gradient(180deg, rgba(255,255,255,0.92) 0%, rgba(233,238,243,0.96) 100%)",
        border: "2px solid rgba(0,0,0,0.12)",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.85), 0 6px 18px rgba(0,0,0,0.06)"
    };
}
function normalizeRoleName(v) {
    return String(v ?? "").trim().toLowerCase();
}
function safeText(v, fallback = "-") {
    const s = String(v ?? "").trim();
    return s.length ? s : fallback;
}
function toNum(v) {
    if (v == null) return null;
    const s = String(v).trim().replace(",", ".");
    if (!s) return null;
    const n = Number(s);
    return Number.isFinite(n) ? Number(n.toFixed(2)) : null;
}
function toPenalty(v) {
    return Number(String(v ?? "0").trim()) === 1 ? 1 : 0;
}
function hasManualSanction(v) {
    const s = String(v ?? "").trim().toLowerCase();
    return s === "1" || s === "true" || s === "yes";
}
function fmtKg(v) {
    const n = toNum(v);
    if (n == null) return "-";
    return `${n.toFixed(1)} kg`;
}
function fmtCompact(v) {
    const n = toNum(v);
    if (n == null) return "-";
    return n.toFixed(1);
}
function parseWeightClass(klasse, fallbackMax) {
    const raw = String(klasse ?? "").trim();
    const normalized = raw.toLowerCase().replace(",", ".").replace(/\s+/g, " ").trim();
    if (normalized) {
        if (normalized.includes("95+") || normalized.includes("+95") || normalized.includes("heavy")) {
            return {
                kind: "heavy",
                threshold: 95,
                label: raw || "95+"
            };
        }
        const minusMatch = normalized.match(/(?:^|\s)-\s*(\d+(?:\.\d+)?)(?:\s|$)/);
        if (minusMatch) {
            return {
                kind: "max",
                max: Number(minusMatch[1]),
                label: raw
            };
        }
        const plusMatch = normalized.match(/(?:^|\s)(\d+(?:\.\d+)?)\s*\+(?:\s|$)/);
        if (plusMatch) {
            const threshold = Number(plusMatch[1]);
            return {
                kind: "heavy",
                threshold,
                label: raw
            };
        }
    }
    const fallback = toNum(fallbackMax);
    if (fallback != null) {
        return {
            kind: "max",
            max: fallback,
            label: raw || `-${fallback}`
        };
    }
    return {
        kind: "unknown",
        label: raw || "-"
    };
}
function isWeightOutsideClass(weight, klasse, fallbackMax) {
    if (weight == null || !Number.isFinite(weight)) return false;
    const parsed = parseWeightClass(klasse, fallbackMax);
    if (parsed.kind === "heavy") {
        return Number(weight) < parsed.threshold;
    }
    if (parsed.kind === "max") {
        return Number(weight) > parsed.max;
    }
    return false;
}
function isOpenHeavyWeightClass(klasse, fallbackMax) {
    return parseWeightClass(klasse, fallbackMax).kind === "heavy";
}
function isTeLicht(gewogen, doorgegeven, klasse, fallbackMax) {
    if (isOpenHeavyWeightClass(klasse, fallbackMax)) return false;
    const w = toNum(gewogen);
    const d = toNum(doorgegeven);
    if (w == null || d == null) return false;
    return w < d - 0.05;
}
function getWeightClassHint(klasse, fallbackMax) {
    const parsed = parseWeightClass(klasse, fallbackMax);
    if (parsed.kind === "heavy") {
        return `${parsed.threshold}+ kg (heavyweight, minimum ${parsed.threshold} kg)`;
    }
    if (parsed.kind === "max") {
        return `max ${parsed.max} kg`;
    }
    return safeText(klasse);
}
function getWeightRuleTitle(row) {
    const parsed = parseWeightClass(row?.klasse_mm, row?.max_gewicht);
    if (parsed.kind === "heavy") return "Gewichtsklasse";
    if (parsed.kind === "max") return "Max gewicht";
    return "Gewichtsregel";
}
function getWeightRuleValue(row) {
    if (!row) return "-";
    const parsed = parseWeightClass(row.klasse_mm, row.max_gewicht_notatie ?? row.max_gewicht);
    if (parsed.kind === "heavy") return `${parsed.threshold}+ heavyweight`;
    if (parsed.kind === "max") return `${parsed.max.toFixed(1)} kg`;
    return safeText(row.max_gewicht_notatie ?? row.klasse_mm ?? row.max_gewicht);
}
function formatDate(v) {
    if (!v) return "-";
    return new Date(v.length === 10 ? `${v}T00:00:00` : v).toLocaleDateString("nl-NL");
}
function normalizeSearchText(value) {
    return String(value ?? "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9+]+/g, " ").replace(/\s+/g, " ").trim();
}
function compactSearchText(value) {
    return normalizeSearchText(value).replace(/\s+/g, "");
}
function splitSearchTokens(value) {
    return normalizeSearchText(value).split(/\s+/).filter(Boolean);
}
function getSearchWeightRank(item) {
    if (item.fighterGewogen == null) return 0;
    if (item.opponentGewogen == null) return 1;
    return 2;
}
function getFieldPrefixScore(field, query) {
    if (!field || !query) return 0;
    if (field === query) return 40;
    if (field.startsWith(query)) return 34;
    const words = field.split(" ").filter(Boolean);
    if (words.some((word)=>word === query)) return 30;
    if (words.some((word)=>word.startsWith(query))) return 26;
    if (field.includes(` ${query}`)) return 22;
    if (field.includes(query)) return 16;
    return 0;
}
function scoreTokenCoverage(tokens, words) {
    if (!tokens.length || !words.length) return 0;
    let score = 0;
    const used = new Set();
    for (const token of tokens){
        let best = 0;
        let bestIndex = -1;
        for(let i = 0; i < words.length; i++){
            if (used.has(i)) continue;
            const word = words[i];
            let candidate = 0;
            if (word === token) candidate = 18;
            else if (word.startsWith(token)) candidate = 15;
            else if (word.includes(token)) candidate = 9;
            else if (token.length >= 3 && token.startsWith(word)) candidate = 7;
            if (candidate > best) {
                best = candidate;
                bestIndex = i;
            }
        }
        if (best > 0 && bestIndex >= 0) {
            used.add(bestIndex);
            score += best;
        }
    }
    if (used.size === tokens.length) {
        score += 12;
    }
    return score;
}
function scoreFighterSearch(item, query) {
    const q = normalizeSearchText(query);
    if (!q) return 0;
    const queryTokens = splitSearchTokens(q);
    const compactQuery = compactSearchText(q);
    const fighterName = normalizeSearchText(item.fighterName);
    const fighterGym = normalizeSearchText(item.fighterGym);
    const fighterVa = compactSearchText(item.fighterVa);
    const partijNr = compactSearchText(String(item.partijNr));
    const opponentName = normalizeSearchText(item.opponentName);
    const opponentGym = normalizeSearchText(item.opponentGym);
    const cornerLabel = item.corner === "red" ? "rood rode hoek red" : "blauw blauwe hoek blue";
    const fighterNameWords = fighterName.split(" ").filter(Boolean);
    const fighterGymWords = fighterGym.split(" ").filter(Boolean);
    const opponentNameWords = opponentName.split(" ").filter(Boolean);
    const opponentGymWords = opponentGym.split(" ").filter(Boolean);
    let score = 0;
    if (fighterVa && fighterVa === compactQuery) score = Math.max(score, 180);
    else if (fighterVa && fighterVa.startsWith(compactQuery) && compactQuery.length >= 3) {
        score = Math.max(score, 150);
    }
    if (partijNr && partijNr === compactQuery) score = Math.max(score, 138);
    if (fighterName === q) score = Math.max(score, 170);
    else if (fighterName.startsWith(q)) score = Math.max(score, 150);
    else if (fighterNameWords.some((word)=>word === q)) score = Math.max(score, 142);
    else if (fighterNameWords.some((word)=>word.startsWith(q))) score = Math.max(score, 132);
    else if (fighterName.includes(` ${q}`)) score = Math.max(score, 122);
    else if (fighterName.includes(q)) score = Math.max(score, 112);
    const fighterTokenCoverage = scoreTokenCoverage(queryTokens, fighterNameWords);
    if (fighterTokenCoverage > 0) {
        score = Math.max(score, 98 + fighterTokenCoverage);
    }
    const gymTokenCoverage = scoreTokenCoverage(queryTokens, fighterGymWords);
    if (fighterGym === q) score = Math.max(score, 126);
    else if (fighterGym.startsWith(q)) score = Math.max(score, 114);
    else if (fighterGymWords.some((word)=>word === q)) score = Math.max(score, 108);
    else if (fighterGymWords.some((word)=>word.startsWith(q))) score = Math.max(score, 102);
    else if (fighterGym.includes(` ${q}`)) score = Math.max(score, 94);
    else if (fighterGym.includes(q)) score = Math.max(score, 84);
    if (gymTokenCoverage > 0) {
        score = Math.max(score, 78 + gymTokenCoverage);
    }
    const opponentTokenCoverage = scoreTokenCoverage(queryTokens, opponentNameWords);
    if (opponentName === q) score = Math.max(score, 92);
    else if (opponentName.startsWith(q)) score = Math.max(score, 84);
    else if (opponentNameWords.some((word)=>word === q)) score = Math.max(score, 78);
    else if (opponentNameWords.some((word)=>word.startsWith(q))) score = Math.max(score, 72);
    else if (opponentName.includes(` ${q}`)) score = Math.max(score, 66);
    else if (opponentName.includes(q)) score = Math.max(score, 60);
    if (opponentTokenCoverage > 0) {
        score = Math.max(score, 52 + opponentTokenCoverage);
    }
    const broadFields = [
        fighterName,
        fighterGym,
        opponentName,
        opponentGym,
        cornerLabel
    ].filter(Boolean);
    for (const field of broadFields){
        score = Math.max(score, getFieldPrefixScore(field, q));
    }
    const combinedFields = [
        fighterName,
        fighterGym,
        fighterVa,
        partijNr,
        opponentName,
        opponentGym,
        cornerLabel
    ].filter(Boolean).join(" ");
    if (queryTokens.length > 1 && queryTokens.every((token)=>combinedFields.includes(token))) {
        score = Math.max(score, 74 + queryTokens.length * 6);
    }
    if (score === 0 && compactQuery.length >= 2) {
        const compactCombined = compactSearchText(combinedFields);
        if (compactCombined.includes(compactQuery)) {
            score = Math.max(score, 42);
        }
    }
    if (score === 0) return 0;
    if (item.fighterGewogen == null) score += 24;
    else if (item.opponentGewogen == null) score += 8;
    return score;
}
function normalizeStatus(status) {
    const s = String(status ?? "").trim().toUpperCase();
    if (!s) return "WACHT_OP_WEGEN";
    if (s === "OK") return "OK";
    if (s.includes("DISPENSATIE")) return "DISPENSATIE_NODIG";
    if (s.includes("AFKEUR")) return "AFKEUR";
    if (s.includes("DEELS")) return "DEELS_GEWOGEN";
    if (s.includes("WACHT")) return "WACHT_OP_WEGEN";
    if (s.includes("HANDMATIG")) return "HANDMATIGE_BEOORDELING";
    return s;
}
function getDispDecision(row) {
    const reason = String(row.dispensatie_reason ?? "").trim().toUpperCase();
    if (row.dispensatie_verleend || reason === "VERLEEND") return "VERLEEND";
    if (reason === "AFGEWEZEN") return "AFGEWEZEN";
    if (row.dispensatie_nodig) return "NODIG";
    return null;
}
function getDraftsFromRows(rows) {
    const next = {};
    for (const row of rows){
        next[row.id] = {
            rood: row.rood_gewogen_gewicht != null ? String(row.rood_gewogen_gewicht) : "",
            blauw: row.blauw_gewogen_gewicht != null ? String(row.blauw_gewogen_gewicht) : "",
            note: row.weging_notitie ?? "",
            strafpuntRood: String(toPenalty(row.gewicht_strafpunt_rood)),
            strafpuntBlauw: String(toPenalty(row.gewicht_strafpunt_blauw))
        };
    }
    return next;
}
function getRowCompletionRank(row) {
    const hasRood = row.rood_gewogen_gewicht != null;
    const hasBlauw = row.blauw_gewogen_gewicht != null;
    if (!hasRood && !hasBlauw) return 0;
    if (!hasRood || !hasBlauw) return 1;
    return 2;
}
function dedupeRows(rows) {
    const map = new Map();
    for (const row of rows){
        const key = `${row.matchmaking_id}__${row.partij_nr}`;
        const prev = map.get(key);
        if (!prev) {
            map.set(key, row);
            continue;
        }
        const prevRank = getRowCompletionRank(prev);
        const nextRank = getRowCompletionRank(row);
        if (nextRank > prevRank) {
            map.set(key, row);
            continue;
        }
        if (nextRank < prevRank) continue;
        const prevUpdated = new Date(prev.laatste_bewerking_op ?? 0).getTime();
        const nextUpdated = new Date(row.laatste_bewerking_op ?? 0).getTime();
        if (nextUpdated >= prevUpdated) {
            map.set(key, row);
        }
    }
    return Array.from(map.values()).sort((a, b)=>a.partij_nr - b.partij_nr);
}
function statusChipFromRowOrEval(row, evalStatus) {
    const rowStatus = normalizeStatus(row.eindstatus || row.praktijk_status || row.reglement_status);
    const normalizedEval = normalizeStatus(evalStatus);
    const dispDecision = getDispDecision(row);
    let finalStatus = rowStatus || normalizedEval || "WACHT_OP_WEGEN";
    if (rowStatus === "WACHT_OP_WEGEN" || rowStatus === "DEELS_GEWOGEN" || rowStatus === "HANDMATIGE_BEOORDELING" || !row.eindstatus) {
        if (normalizedEval && normalizedEval !== "HANDMATIGE_BEOORDELING") {
            finalStatus = normalizedEval;
        }
    }
    if (dispDecision === "VERLEEND") {
        finalStatus = "OK";
    } else if (dispDecision === "AFGEWEZEN") {
        finalStatus = "AFKEUR";
    } else if (dispDecision === "NODIG" && finalStatus !== "AFKEUR") {
        finalStatus = "DISPENSATIE_NODIG";
    }
    switch(finalStatus){
        case "OK":
            return {
                key: finalStatus,
                label: "OK",
                bg: "#dcfce7",
                color: "#166534",
                border: "#86efac"
            };
        case "DISPENSATIE_NODIG":
            return {
                key: finalStatus,
                label: "Dispensatie",
                bg: "#fef3c7",
                color: "#92400e",
                border: "#fcd34d"
            };
        case "AFKEUR":
            return {
                key: finalStatus,
                label: "Afkeur",
                bg: "#fee2e2",
                color: "#991b1b",
                border: "#fca5a5"
            };
        case "DEELS_GEWOGEN":
            return {
                key: finalStatus,
                label: "Deels gewogen",
                bg: "#fef3c7",
                color: "#92400e",
                border: "#fcd34d"
            };
        case "WACHT_OP_WEGEN":
            return {
                key: finalStatus,
                label: "Te wegen",
                bg: "#dbeafe",
                color: "#1e40af",
                border: "#93c5fd"
            };
        case "HANDMATIGE_BEOORDELING":
            return {
                key: finalStatus,
                label: "Handmatig",
                bg: "#ede9fe",
                color: "#5b21b6",
                border: "#c4b5fd"
            };
        default:
            return {
                key: finalStatus,
                label: finalStatus || "Onbekend",
                bg: "#e5e7eb",
                color: "#374151",
                border: "#cbd5e1"
            };
    }
}
function getLiveEval(row, draft) {
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$weegstation$2f$weighInRulesEngine$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["evaluateWeighInBout"])({
        discipline: row.discipline,
        klasse_mm: row.klasse_mm,
        leeftijd_type: row.leeftijd_type,
        max_gewicht: row.max_gewicht,
        rood_doorgegeven_gewicht: row.rood_doorgegeven_gewicht,
        blauw_doorgegeven_gewicht: row.blauw_doorgegeven_gewicht,
        rood_gewogen_gewicht: draft ? toNum(draft.rood) : row.rood_gewogen_gewicht,
        blauw_gewogen_gewicht: draft ? toNum(draft.blauw) : row.blauw_gewogen_gewicht,
        dispensatie_verleend: row.dispensatie_verleend
    });
}
function getLiveDispState(row, evalResult) {
    const saved = getDispDecision(row);
    if (saved === "VERLEEND" || saved === "AFGEWEZEN") return saved;
    if (saved === "NODIG") return "NODIG";
    if (normalizeStatus(evalResult?.eindStatus) === "DISPENSATIE_NODIG") return "NODIG";
    return null;
}
function StatBox({ label, value, color }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "rounded-2xl p-3 text-center",
        style: statsBoxStyle(),
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                style: {
                    color,
                    fontWeight: 900,
                    fontSize: 24,
                    lineHeight: 1.1
                },
                children: value
            }, void 0, false, {
                fileName: "[project]/app/dashboard/officials/weegstation/[matchmakingId]/page.tsx",
                lineNumber: 714,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                style: {
                    color: "rgba(0,0,0,0.52)",
                    fontSize: 12,
                    marginTop: 4,
                    fontWeight: 700
                },
                children: label
            }, void 0, false, {
                fileName: "[project]/app/dashboard/officials/weegstation/[matchmakingId]/page.tsx",
                lineNumber: 715,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/app/dashboard/officials/weegstation/[matchmakingId]/page.tsx",
        lineNumber: 713,
        columnNumber: 5
    }, this);
}
function ActionButton({ children, onClick, disabled, tone = "dark", className = "" }) {
    const styles = tone === "orange" ? {
        background: "linear-gradient(180deg, #ff6a2b 0%, #ff4d00 100%)",
        border: "1px solid #c93e00",
        color: "#111"
    } : tone === "green" ? {
        background: "#16a34a",
        border: "1px solid #15803d",
        color: "#fff"
    } : tone === "red" ? {
        background: "#dc2626",
        border: "1px solid #b91c1c",
        color: "#fff"
    } : {
        background: "linear-gradient(180deg, #3d434d 0%, #22262d 100%)",
        border: "1px solid rgba(0,0,0,0.45)",
        color: "#fff"
    };
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
        type: "button",
        onClick: onClick,
        disabled: disabled,
        className: `inline-flex items-center justify-center whitespace-nowrap px-3 py-2 text-xs font-black transition disabled:cursor-not-allowed disabled:opacity-50 ${className}`,
        style: {
            borderRadius: 4,
            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.10)",
            ...styles
        },
        children: children
    }, void 0, false, {
        fileName: "[project]/app/dashboard/officials/weegstation/[matchmakingId]/page.tsx",
        lineNumber: 761,
        columnNumber: 5
    }, this);
}
function WeegstationDetailPage() {
    const params = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useParams"])();
    const router = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRouter"])();
    const matchmakingId = String(params?.matchmakingId ?? "");
    const activeInputRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])(null);
    const [loading, setLoading] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(true);
    const [syncing, setSyncing] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(false);
    const [savingId, setSavingId] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(null);
    const [finalizing, setFinalizing] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(false);
    const [error, setError] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(null);
    const [notice, setNotice] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(null);
    const [header, setHeader] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(null);
    const [rows, setRows] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])([]);
    const [drafts, setDrafts] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])({});
    const [roleNames, setRoleNames] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])([]);
    const [myBondteam, setMyBondteam] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])("");
    const [search, setSearch] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])("");
    const [selectedFighter, setSelectedFighter] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(null);
    const isHoofdofficialOrSuperadmin = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useMemo"])(()=>roleNames.includes("hoofdofficial") || roleNames.includes("superadmin"), [
        roleNames
    ]);
    // Matchmakers can view weegstation read-only but cannot edit weights, penalties or dispensaties
    const isMatchmakerOnly = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useMemo"])(()=>roleNames.includes("matchmaker") && !roleNames.some((r)=>[
                "official",
                "hoofdofficial",
                "admin",
                "superadmin",
                "dispensatie_admin"
            ].includes(r)), [
        roleNames
    ]);
    const canAccess = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useMemo"])(()=>roleNames.some((r)=>[
                "official",
                "hoofdofficial",
                "admin",
                "superadmin",
                "dispensatie_admin",
                "matchmaker"
            ].includes(r)), [
        roleNames
    ]);
    function getDraft(rowId) {
        return drafts[rowId] ?? {
            rood: "",
            blauw: "",
            note: "",
            strafpuntRood: "0",
            strafpuntBlauw: "0"
        };
    }
    function setDraft(rowId, patch) {
        setDrafts((prev)=>({
                ...prev,
                [rowId]: {
                    ...getDraft(rowId),
                    ...patch
                }
            }));
    }
    async function fetchRows(mmId) {
        const { data, error } = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabaseClient$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["supabase"].from("weigh_in_bouts").select("*").eq("matchmaking_id", mmId).order("partij_nr", {
            ascending: true
        });
        if (error) throw error;
        return dedupeRows(data ?? []);
    }
    async function hydrateRows(mmId) {
        const nextRows = await fetchRows(mmId);
        setRows(nextRows);
        setDrafts(getDraftsFromRows(nextRows));
        return nextRows;
    }
    async function refreshRows(manual = false) {
        if (!matchmakingId) return;
        setSyncing(true);
        setError(null);
        setNotice(null);
        try {
            const res = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$api$2f$authedFetch$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["authedFetch"])("/api/officials/weegstation/build", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    matchmakingId
                })
            });
            const json = await res.json().catch(()=>({}));
            if (!res.ok) throw new Error(json?.error || "Weeglijst opbouwen mislukt.");
            const nextRows = dedupeRows(json?.rows ?? []);
            setRows(nextRows);
            setDrafts(getDraftsFromRows(nextRows));
            setNotice(manual ? `Weeglijst ververst (${nextRows.length} partijen).` : `Weeglijst opgebouwd (${nextRows.length} partijen).`);
        } catch (e) {
            setError(e?.message ?? "Weeglijst verversen mislukt.");
        } finally{
            setSyncing(false);
        }
    }
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        async function load() {
            setLoading(true);
            setError(null);
            setNotice(null);
            try {
                const { data: authData } = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabaseClient$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["supabase"].auth.getUser();
                const uid = authData?.user?.id;
                if (!uid) {
                    router.push("/login");
                    return;
                }
                const { data: profile, error: profileErr } = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabaseClient$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["supabase"].from("user_profiles").select("id, bondteam").eq("id", uid).single();
                if (profileErr) throw profileErr;
                setMyBondteam(String(profile?.bondteam ?? "").trim());
                const { data: userRoles, error: urErr } = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabaseClient$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["supabase"].from("user_roles").select("role_id").eq("user_id", uid);
                if (urErr) throw urErr;
                const roleIds = (userRoles ?? []).map((r)=>r.role_id).filter(Boolean);
                let names = [];
                if (roleIds.length > 0) {
                    const { data: rolesRows, error: rolesErr } = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabaseClient$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["supabase"].from("roles").select("id, name").in("id", roleIds);
                    if (rolesErr) throw rolesErr;
                    names = (rolesRows ?? []).map((r)=>normalizeRoleName(r?.name)).filter(Boolean);
                }
                setRoleNames(names);
                if (!names.some((r)=>[
                        "official",
                        "hoofdofficial",
                        "admin",
                        "superadmin",
                        "dispensatie_admin",
                        "matchmaker"
                    ].includes(r))) {
                    throw new Error("Je hebt geen toegang tot de weeglijst.");
                }
                const { data: mm, error: mmErr } = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabaseClient$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["supabase"].from("matchmaking_uploads").select("matchmaking_id, bondteam, evenement_naam, evenement_datum, locatie").eq("matchmaking_id", matchmakingId).single();
                if (mmErr) throw mmErr;
                setHeader(mm);
                const mmBondteam = String(mm?.bondteam ?? "").trim().toLowerCase();
                const adminAccess = names.some((r)=>[
                        "admin",
                        "superadmin",
                        "dispensatie_admin"
                    ].includes(r));
                const teamAccess = names.some((r)=>r === "official" || r === "hoofdofficial") && mmBondteam && mmBondteam === String(profile?.bondteam ?? "").trim().toLowerCase();
                // Matchmakers get read-only access to any weegstation
                const matchmakerAccess = names.includes("matchmaker");
                if (!adminAccess && !teamAccess && !matchmakerAccess) {
                    throw new Error("Je mag alleen matchmakings van je eigen bondteam zien en bewerken.");
                }
                const existingRows = await hydrateRows(matchmakingId);
                if (existingRows.length === 0) {
                    await refreshRows(false);
                }
            } catch (e) {
                setError(e?.message ?? "Fout bij laden van de weeglijst.");
            } finally{
                setLoading(false);
            }
        }
        if (matchmakingId) {
            load();
        }
    }, [
        matchmakingId,
        router
    ]);
    const fighterResults = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useMemo"])(()=>{
        const list = [];
        for (const row of rows){
            const draft = getDraft(row.id);
            const liveRood = toNum(draft.rood);
            const liveBlauw = toNum(draft.blauw);
            list.push({
                boutId: row.id,
                partijNr: row.partij_nr,
                corner: "red",
                fighterName: safeText(row.rood_naam, ""),
                fighterGym: safeText(row.rood_gym, ""),
                fighterVa: safeText(row.rood_va, ""),
                fighterDoorgegeven: row.rood_doorgegeven_gewicht,
                fighterGewogen: liveRood,
                opponentName: safeText(row.blauw_naam, "-"),
                opponentGym: safeText(row.blauw_gym, "-"),
                opponentVa: safeText(row.blauw_va, "-"),
                opponentGewogen: liveBlauw,
                discipline: row.discipline,
                klasse: row.klasse_mm,
                bout: row
            });
            list.push({
                boutId: row.id,
                partijNr: row.partij_nr,
                corner: "blue",
                fighterName: safeText(row.blauw_naam, ""),
                fighterGym: safeText(row.blauw_gym, ""),
                fighterVa: safeText(row.blauw_va, ""),
                fighterDoorgegeven: row.blauw_doorgegeven_gewicht,
                fighterGewogen: liveBlauw,
                opponentName: safeText(row.rood_naam, "-"),
                opponentGym: safeText(row.rood_gym, "-"),
                opponentVa: safeText(row.rood_va, "-"),
                opponentGewogen: liveRood,
                discipline: row.discipline,
                klasse: row.klasse_mm,
                bout: row
            });
        }
        return list;
    }, [
        rows,
        drafts
    ]);
    const searchSuggestions = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useMemo"])(()=>{
        const q = search.trim();
        const sortBaseResults = (a, b)=>{
            const aWeightRank = getSearchWeightRank(a);
            const bWeightRank = getSearchWeightRank(b);
            if (aWeightRank !== bWeightRank) return aWeightRank - bWeightRank;
            const aCompletion = getRowCompletionRank(a.bout);
            const bCompletion = getRowCompletionRank(b.bout);
            if (aCompletion !== bCompletion) return aCompletion - bCompletion;
            const aCorner = a.corner === "red" ? 0 : 1;
            const bCorner = b.corner === "red" ? 0 : 1;
            if (a.partijNr !== b.partijNr) return a.partijNr - b.partijNr;
            return aCorner - bCorner;
        };
        const base = [
            ...fighterResults
        ].sort(sortBaseResults);
        if (!q) return base.slice(0, 24);
        return base.map((item)=>({
                item,
                score: scoreFighterSearch(item, q)
            })).filter((x)=>x.score > 0).sort((a, b)=>{
            const aWeightRank = getSearchWeightRank(a.item);
            const bWeightRank = getSearchWeightRank(b.item);
            if (aWeightRank !== bWeightRank) return aWeightRank - bWeightRank;
            if (b.score !== a.score) return b.score - a.score;
            const aCompletion = getRowCompletionRank(a.item.bout);
            const bCompletion = getRowCompletionRank(b.item.bout);
            if (aCompletion !== bCompletion) return aCompletion - bCompletion;
            const aCorner = a.item.corner === "red" ? 0 : 1;
            const bCorner = b.item.corner === "red" ? 0 : 1;
            if (a.item.partijNr !== b.item.partijNr) return a.item.partijNr - b.item.partijNr;
            return aCorner - bCorner;
        }).slice(0, 24).map((x)=>x.item);
    }, [
        fighterResults,
        search
    ]);
    const counts = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useMemo"])(()=>{
        let nogNiet = 0;
        let deels = 0;
        let volledig = 0;
        let dispensaties = 0;
        let afkeur = 0;
        let handmatig = 0;
        for (const row of rows){
            const draft = getDraft(row.id);
            const evalResult = getLiveEval(row, draft);
            const chip = statusChipFromRowOrEval(row, evalResult?.eindStatus);
            const dispDecision = getLiveDispState(row, evalResult);
            if (chip.key === "WACHT_OP_WEGEN") nogNiet++;
            else if (chip.key === "DEELS_GEWOGEN") deels++;
            else volledig++;
            if (dispDecision === "NODIG" || dispDecision === "VERLEEND") {
                dispensaties++;
            }
            if (chip.key === "AFKEUR") {
                afkeur++;
            }
            if (hasManualSanction(row.admin_sanctie_nodig)) {
                handmatig++;
            }
        }
        return {
            nogNiet,
            deels,
            volledig,
            dispensaties,
            afkeur,
            handmatig
        };
    }, [
        rows,
        drafts
    ]);
    function selectFighter(item) {
        setSelectedFighter(item);
        setTimeout(()=>activeInputRef.current?.focus(), 40);
    }
    const selectedRow = selectedFighter ? rows.find((r)=>r.id === selectedFighter.boutId) ?? null : null;
    const selectedDraft = selectedRow ? getDraft(selectedRow.id) : null;
    const selectedEval = selectedRow && selectedDraft ? getLiveEval(selectedRow, selectedDraft) : null;
    const activeWeightValue = selectedFighter?.corner === "red" ? selectedDraft?.rood ?? "" : selectedDraft?.blauw ?? "";
    const activePenaltyValue = selectedFighter?.corner === "red" ? selectedDraft?.strafpuntRood ?? "0" : selectedDraft?.strafpuntBlauw ?? "0";
    const activeWeightNumber = toNum(activeWeightValue);
    const selectedWeightClass = selectedRow ? parseWeightClass(selectedRow.klasse_mm, selectedRow.max_gewicht_notatie ?? selectedRow.max_gewicht) : null;
    const selectedIsOpenHeavyClass = selectedWeightClass?.kind === "heavy";
    const selectedIsOutsideWeightClass = !!selectedRow && isWeightOutsideClass(activeWeightNumber, selectedRow.klasse_mm, selectedRow.max_gewicht_notatie ?? selectedRow.max_gewicht);
    const isTooLight = !!selectedRow && (selectedFighter?.corner === "red" ? isTeLicht(activeWeightNumber, selectedRow.rood_doorgegeven_gewicht, selectedRow.klasse_mm, selectedRow.max_gewicht_notatie ?? selectedRow.max_gewicht) : isTeLicht(activeWeightNumber, selectedRow.blauw_doorgegeven_gewicht, selectedRow.klasse_mm, selectedRow.max_gewicht_notatie ?? selectedRow.max_gewicht));
    const selectedEvalPenaltyApplies = !!selectedEval && !!selectedEval.canProceedWithPenalty && !selectedEval.adminSanctieNodig && (selectedFighter?.corner === "red" ? !!selectedEval.nietOpGewichtRood : !!selectedEval.nietOpGewichtBlauw);
    const selectedCanAssignPenalty = !!selectedRow && (selectedIsOutsideWeightClass || isTooLight || !selectedIsOpenHeavyClass && selectedEvalPenaltyApplies);
    const selectedDispState = selectedRow && selectedEval ? getLiveDispState(selectedRow, selectedEval) : null;
    async function saveSelected() {
        if (!selectedRow || !selectedDraft) return;
        setSavingId(selectedRow.id);
        setError(null);
        setNotice(null);
        try {
            const penaltyPayload = isHoofdofficialOrSuperadmin ? {
                gewicht_strafpunt_rood: toPenalty(selectedDraft.strafpuntRood),
                gewicht_strafpunt_blauw: toPenalty(selectedDraft.strafpuntBlauw)
            } : {};
            const res = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$api$2f$authedFetch$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["authedFetch"])("/api/officials/weegstation/update", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    id: selectedRow.id,
                    rood_gewogen_gewicht: toNum(selectedDraft.rood),
                    blauw_gewogen_gewicht: toNum(selectedDraft.blauw),
                    weging_notitie: selectedDraft.note,
                    ...penaltyPayload
                })
            });
            const json = await res.json().catch(()=>({}));
            if (!res.ok) throw new Error(json?.error || "Opslaan mislukt.");
            const updated = json?.bout;
            if (!updated) throw new Error("Geen bijgewerkte partij ontvangen.");
            setRows((prev)=>prev.map((r)=>r.id === updated.id ? updated : r));
            setDrafts((prev)=>({
                    ...prev,
                    [updated.id]: {
                        rood: updated.rood_gewogen_gewicht != null ? String(updated.rood_gewogen_gewicht) : "",
                        blauw: updated.blauw_gewogen_gewicht != null ? String(updated.blauw_gewogen_gewicht) : "",
                        note: updated.weging_notitie ?? "",
                        strafpuntRood: String(toPenalty(updated.gewicht_strafpunt_rood)),
                        strafpuntBlauw: String(toPenalty(updated.gewicht_strafpunt_blauw))
                    }
                }));
            setSelectedFighter((prev)=>{
                if (!prev || prev.boutId !== updated.id) return prev;
                return {
                    ...prev,
                    bout: updated,
                    fighterGewogen: prev.corner === "red" ? updated.rood_gewogen_gewicht : updated.blauw_gewogen_gewicht,
                    opponentGewogen: prev.corner === "red" ? updated.blauw_gewogen_gewicht : updated.rood_gewogen_gewicht
                };
            });
            setNotice(`Partij ${updated.partij_nr} opgeslagen.`);
        } catch (e) {
            setError(e?.message ?? "Opslaan mislukt.");
        } finally{
            setSavingId(null);
        }
    }
    async function decideDispensation(rowId, decision) {
        setSavingId(rowId);
        setError(null);
        setNotice(null);
        try {
            const res = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$api$2f$authedFetch$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["authedFetch"])("/api/officials/weegstation/dispensatie", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    id: rowId,
                    decision
                })
            });
            const json = await res.json().catch(()=>({}));
            if (!res.ok) throw new Error(json?.error || "Dispensatie beslissing mislukt.");
            const updated = json?.bout;
            if (!updated) throw new Error("Geen bijgewerkte partij ontvangen.");
            setRows((prev)=>prev.map((r)=>r.id === updated.id ? updated : r));
            setDrafts((prev)=>({
                    ...prev,
                    [updated.id]: {
                        rood: updated.rood_gewogen_gewicht != null ? String(updated.rood_gewogen_gewicht) : "",
                        blauw: updated.blauw_gewogen_gewicht != null ? String(updated.blauw_gewogen_gewicht) : "",
                        note: updated.weging_notitie ?? "",
                        strafpuntRood: String(toPenalty(updated.gewicht_strafpunt_rood)),
                        strafpuntBlauw: String(toPenalty(updated.gewicht_strafpunt_blauw))
                    }
                }));
            setSelectedFighter((prev)=>{
                if (!prev || prev.boutId !== updated.id) return prev;
                return {
                    ...prev,
                    bout: updated,
                    fighterGewogen: prev.corner === "red" ? updated.rood_gewogen_gewicht : updated.blauw_gewogen_gewicht,
                    opponentGewogen: prev.corner === "red" ? updated.blauw_gewogen_gewicht : updated.rood_gewogen_gewicht
                };
            });
            setNotice(decision === "approved" ? `Dispensatie goedgekeurd voor partij ${updated.partij_nr}. Partij staat nu op OK.` : `Dispensatie afgekeurd voor partij ${updated.partij_nr}. Partij staat nu op afkeur.`);
        } catch (e) {
            setError(e?.message ?? "Dispensatie beslissing mislukt.");
        } finally{
            setSavingId(null);
        }
    }
    async function finalizeMatchmaking() {
        if (!isHoofdofficialOrSuperadmin) {
            setError("Alleen hoofdofficial of superadmin mag de definitieve lineup maken.");
            setNotice(null);
            return;
        }
        if (finalizing) return;
        setFinalizing(true);
        setError(null);
        setNotice(null);
        try {
            const res = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$api$2f$authedFetch$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["authedFetch"])("/api/officials/weegstation/finalize", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    matchmakingId
                })
            });
            const json = await res.json().catch(()=>({}));
            if (!res.ok) throw new Error(json?.error || "Finaliseren mislukt.");
            setNotice(`Definitieve lineup opgeslagen (${json.saved_bouts} partijen).`);
        } catch (e) {
            setError(e?.message ?? "Finaliseren mislukt.");
        } finally{
            setFinalizing(false);
        }
    }
    if (loading) {
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("main", {
            className: "flex min-h-screen items-center justify-center",
            style: pageBgStyle(),
            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "max-w-[420px] rounded-3xl p-4",
                style: metalFrameStyle(),
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "p-8 text-center",
                    style: metalInnerStyle(),
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            style: {
                                color: NVB_ORANGE,
                                fontWeight: 900,
                                fontSize: 26
                            },
                            children: "⚖️ WEEGSTATION"
                        }, void 0, false, {
                            fileName: "[project]/app/dashboard/officials/weegstation/[matchmakingId]/page.tsx",
                            lineNumber: 1344,
                            columnNumber: 13
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "mt-3 text-sm font-semibold text-zinc-700",
                            children: "Laden..."
                        }, void 0, false, {
                            fileName: "[project]/app/dashboard/officials/weegstation/[matchmakingId]/page.tsx",
                            lineNumber: 1345,
                            columnNumber: 13
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/app/dashboard/officials/weegstation/[matchmakingId]/page.tsx",
                    lineNumber: 1343,
                    columnNumber: 11
                }, this)
            }, void 0, false, {
                fileName: "[project]/app/dashboard/officials/weegstation/[matchmakingId]/page.tsx",
                lineNumber: 1342,
                columnNumber: 9
            }, this)
        }, void 0, false, {
            fileName: "[project]/app/dashboard/officials/weegstation/[matchmakingId]/page.tsx",
            lineNumber: 1341,
            columnNumber: 7
        }, this);
    }
    if (!canAccess) {
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("main", {
            className: "flex min-h-screen items-center justify-center px-6",
            style: pageBgStyle(),
            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "max-w-xl rounded-3xl p-4",
                style: metalFrameStyle(),
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "p-8 text-center",
                    style: metalInnerStyle(),
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "text-xl font-black text-red-600",
                            children: "Geen toegang"
                        }, void 0, false, {
                            fileName: "[project]/app/dashboard/officials/weegstation/[matchmakingId]/page.tsx",
                            lineNumber: 1357,
                            columnNumber: 13
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                            className: "mt-3 text-sm text-zinc-700",
                            children: "Deze pagina is alleen voor officials, hoofdofficials, admins en superadmins."
                        }, void 0, false, {
                            fileName: "[project]/app/dashboard/officials/weegstation/[matchmakingId]/page.tsx",
                            lineNumber: 1358,
                            columnNumber: 13
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/app/dashboard/officials/weegstation/[matchmakingId]/page.tsx",
                    lineNumber: 1356,
                    columnNumber: 11
                }, this)
            }, void 0, false, {
                fileName: "[project]/app/dashboard/officials/weegstation/[matchmakingId]/page.tsx",
                lineNumber: 1355,
                columnNumber: 9
            }, this)
        }, void 0, false, {
            fileName: "[project]/app/dashboard/officials/weegstation/[matchmakingId]/page.tsx",
            lineNumber: 1354,
            columnNumber: 7
        }, this);
    }
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("main", {
        className: "min-h-screen px-3 py-4 md:px-5 md:py-5",
        style: pageBgStyle(),
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "mx-auto max-w-[1840px]",
            style: metalFrameStyle(),
            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "p-3 md:p-4",
                style: metalInnerStyle(),
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "rounded-[14px] px-4 py-2 text-white shadow-2xl",
                        style: {
                            ...darkPanelStyle(),
                            background: "linear-gradient(180deg, rgba(47,50,58,0.98) 0%, rgba(30,32,37,0.98) 100%)"
                        },
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "flex items-center justify-between gap-4",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "min-w-0 leading-tight",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "text-[11px] font-black uppercase tracking-[0.12em]",
                                            style: {
                                                color: NVB_ORANGE
                                            },
                                            children: "Event info"
                                        }, void 0, false, {
                                            fileName: "[project]/app/dashboard/officials/weegstation/[matchmakingId]/page.tsx",
                                            lineNumber: 1380,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "text-[24px] font-black text-white leading-[1.05]",
                                            children: safeText(header?.evenement_naam, "Onbekend evenement")
                                        }, void 0, false, {
                                            fileName: "[project]/app/dashboard/officials/weegstation/[matchmakingId]/page.tsx",
                                            lineNumber: 1387,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "text-[14px] font-semibold text-white/80",
                                            children: [
                                                formatDate(header?.evenement_datum ?? null),
                                                " ·",
                                                " ",
                                                safeText(header?.bondteam, myBondteam || "-"),
                                                " ·",
                                                " ",
                                                safeText(header?.locatie)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/app/dashboard/officials/weegstation/[matchmakingId]/page.tsx",
                                            lineNumber: 1391,
                                            columnNumber: 17
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/app/dashboard/officials/weegstation/[matchmakingId]/page.tsx",
                                    lineNumber: 1379,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "flex items-center justify-center shrink-0",
                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "rounded-[6px] p-[2px]",
                                        style: {
                                            background: "linear-gradient(135deg, #f5f5f5 0%, #bdbdbd 28%, #8e8e8e 55%, #f0f0f0 72%, #6f6f6f 100%)"
                                        },
                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "rounded-[4px] px-2 py-[2px]",
                                            style: {
                                                background: "rgba(0,0,0,0.65)",
                                                border: "1px solid rgba(255,255,255,0.08)"
                                            },
                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$image$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"], {
                                                src: "/branding/fightsupport/logo-dark.png",
                                                width: 170,
                                                height: 70,
                                                alt: "FightSupport",
                                                className: "h-auto w-auto",
                                                priority: true
                                            }, void 0, false, {
                                                fileName: "[project]/app/dashboard/officials/weegstation/[matchmakingId]/page.tsx",
                                                lineNumber: 1413,
                                                columnNumber: 21
                                            }, this)
                                        }, void 0, false, {
                                            fileName: "[project]/app/dashboard/officials/weegstation/[matchmakingId]/page.tsx",
                                            lineNumber: 1406,
                                            columnNumber: 19
                                        }, this)
                                    }, void 0, false, {
                                        fileName: "[project]/app/dashboard/officials/weegstation/[matchmakingId]/page.tsx",
                                        lineNumber: 1399,
                                        columnNumber: 17
                                    }, this)
                                }, void 0, false, {
                                    fileName: "[project]/app/dashboard/officials/weegstation/[matchmakingId]/page.tsx",
                                    lineNumber: 1398,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "flex items-center gap-2 shrink-0",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"], {
                                            href: "/dashboard/officials/weegstation",
                                            className: "px-3 py-1.5 text-[12px] font-black text-white",
                                            style: {
                                                borderRadius: 4,
                                                border: "1px solid rgba(0,0,0,0.45)",
                                                background: "linear-gradient(180deg, #3d434d 0%, #22262d 100%)"
                                            },
                                            children: "← Terug"
                                        }, void 0, false, {
                                            fileName: "[project]/app/dashboard/officials/weegstation/[matchmakingId]/page.tsx",
                                            lineNumber: 1426,
                                            columnNumber: 17
                                        }, this),
                                        isHoofdofficialOrSuperadmin && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(ActionButton, {
                                            onClick: finalizeMatchmaking,
                                            disabled: finalizing,
                                            tone: "orange",
                                            className: "px-3 py-1.5 text-[12px]",
                                            children: finalizing ? "Bezig..." : "Definitieve lineup"
                                        }, void 0, false, {
                                            fileName: "[project]/app/dashboard/officials/weegstation/[matchmakingId]/page.tsx",
                                            lineNumber: 1439,
                                            columnNumber: 19
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/app/dashboard/officials/weegstation/[matchmakingId]/page.tsx",
                                    lineNumber: 1425,
                                    columnNumber: 15
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/app/dashboard/officials/weegstation/[matchmakingId]/page.tsx",
                            lineNumber: 1378,
                            columnNumber: 13
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/app/dashboard/officials/weegstation/[matchmakingId]/page.tsx",
                        lineNumber: 1371,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(StatBox, {
                                label: "Nog niet",
                                value: counts.nogNiet,
                                color: "#0ea5e9"
                            }, void 0, false, {
                                fileName: "[project]/app/dashboard/officials/weegstation/[matchmakingId]/page.tsx",
                                lineNumber: 1453,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(StatBox, {
                                label: "Deels",
                                value: counts.deels,
                                color: "#ca8a04"
                            }, void 0, false, {
                                fileName: "[project]/app/dashboard/officials/weegstation/[matchmakingId]/page.tsx",
                                lineNumber: 1454,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(StatBox, {
                                label: "Volledig",
                                value: counts.volledig,
                                color: "#16a34a"
                            }, void 0, false, {
                                fileName: "[project]/app/dashboard/officials/weegstation/[matchmakingId]/page.tsx",
                                lineNumber: 1455,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(StatBox, {
                                label: "Dispensatie",
                                value: counts.dispensaties,
                                color: NVB_ORANGE
                            }, void 0, false, {
                                fileName: "[project]/app/dashboard/officials/weegstation/[matchmakingId]/page.tsx",
                                lineNumber: 1456,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(StatBox, {
                                label: "Afkeur",
                                value: counts.afkeur,
                                color: "#dc2626"
                            }, void 0, false, {
                                fileName: "[project]/app/dashboard/officials/weegstation/[matchmakingId]/page.tsx",
                                lineNumber: 1457,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(StatBox, {
                                label: "Handmatig",
                                value: counts.handmatig,
                                color: "#7c3aed"
                            }, void 0, false, {
                                fileName: "[project]/app/dashboard/officials/weegstation/[matchmakingId]/page.tsx",
                                lineNumber: 1458,
                                columnNumber: 13
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/app/dashboard/officials/weegstation/[matchmakingId]/page.tsx",
                        lineNumber: 1452,
                        columnNumber: 11
                    }, this),
                    error && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "mt-4 rounded-2xl p-3 text-sm font-semibold",
                        style: {
                            background: "rgba(220,38,38,0.12)",
                            border: "1px solid rgba(220,38,38,0.30)",
                            color: "#991b1b"
                        },
                        children: error
                    }, void 0, false, {
                        fileName: "[project]/app/dashboard/officials/weegstation/[matchmakingId]/page.tsx",
                        lineNumber: 1462,
                        columnNumber: 13
                    }, this),
                    notice && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "mt-4 rounded-2xl p-3 text-sm font-semibold",
                        style: {
                            background: "rgba(22,163,74,0.12)",
                            border: "1px solid rgba(22,163,74,0.30)",
                            color: "#166534"
                        },
                        children: notice
                    }, void 0, false, {
                        fileName: "[project]/app/dashboard/officials/weegstation/[matchmakingId]/page.tsx",
                        lineNumber: 1475,
                        columnNumber: 13
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "mt-5 flex flex-col gap-4 xl:flex-row",
                        style: {
                            minHeight: 760
                        },
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "flex flex-col xl:w-[36%] xl:min-w-[320px] xl:max-w-[500px]",
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "flex h-full flex-col rounded-[16px] p-3 text-white",
                                    style: darkPanelStyle(),
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                            className: "mb-3 flex items-center gap-3 rounded-md px-3 py-3",
                                            style: {
                                                border: "1px solid rgba(255,255,255,0.12)",
                                                background: "rgba(255,255,255,0.06)"
                                            },
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$search$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Search$3e$__["Search"], {
                                                    className: "h-5 w-5 text-white/55"
                                                }, void 0, false, {
                                                    fileName: "[project]/app/dashboard/officials/weegstation/[matchmakingId]/page.tsx",
                                                    lineNumber: 1497,
                                                    columnNumber: 19
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                    type: "text",
                                                    placeholder: "Slim zoeken: naam, gym, VA, partij of hoek...",
                                                    value: search,
                                                    onChange: (e)=>setSearch(e.target.value),
                                                    onKeyDown: (e)=>{
                                                        if (e.key !== "Enter") return;
                                                        const first = searchSuggestions[0];
                                                        if (!first) return;
                                                        e.preventDefault();
                                                        selectFighter(first);
                                                    },
                                                    className: "w-full text-sm font-semibold outline-none placeholder:text-zinc-500",
                                                    style: {
                                                        background: "#ffffff",
                                                        color: "#111111",
                                                        border: "1px solid rgba(0,0,0,0.20)",
                                                        borderRadius: 4,
                                                        padding: "10px 12px"
                                                    }
                                                }, void 0, false, {
                                                    fileName: "[project]/app/dashboard/officials/weegstation/[matchmakingId]/page.tsx",
                                                    lineNumber: 1498,
                                                    columnNumber: 19
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/app/dashboard/officials/weegstation/[matchmakingId]/page.tsx",
                                            lineNumber: 1490,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "mb-3 text-xs font-semibold text-white/45",
                                            children: "Slim zoeken op naam, gym, VA, partij of hoek. Ongewogen vechters blijven bovenaan."
                                        }, void 0, false, {
                                            fileName: "[project]/app/dashboard/officials/weegstation/[matchmakingId]/page.tsx",
                                            lineNumber: 1521,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "flex-1 overflow-y-auto",
                                            style: {
                                                maxHeight: 650
                                            },
                                            children: searchSuggestions.length === 0 ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "py-8 text-center text-sm text-white/35",
                                                children: "Geen vechters gevonden"
                                            }, void 0, false, {
                                                fileName: "[project]/app/dashboard/officials/weegstation/[matchmakingId]/page.tsx",
                                                lineNumber: 1527,
                                                columnNumber: 21
                                            }, this) : searchSuggestions.map((item, idx)=>{
                                                const isSelected = selectedFighter?.boutId === item.boutId && selectedFighter?.corner === item.corner;
                                                const draft = getDraft(item.bout.id);
                                                const evalResult = getLiveEval(item.bout, draft);
                                                const chip = statusChipFromRowOrEval(item.bout, evalResult?.eindStatus);
                                                const penalty = item.corner === "red" ? toPenalty(draft.strafpuntRood) : toPenalty(draft.strafpuntBlauw);
                                                return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                    type: "button",
                                                    onClick: ()=>selectFighter(item),
                                                    className: "mb-2 w-full p-3 text-left transition-all",
                                                    style: {
                                                        borderRadius: 4,
                                                        background: isSelected ? "linear-gradient(180deg, rgba(255,77,0,0.20), rgba(255,77,0,0.10))" : "linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.03))",
                                                        border: isSelected ? `1.5px solid ${NVB_ORANGE}` : "1.5px solid rgba(255,255,255,0.08)"
                                                    },
                                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        className: "flex items-start justify-between gap-2",
                                                        children: [
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                className: "min-w-0 flex-1",
                                                                children: [
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                        className: "text-[10px] font-bold tracking-[0.08em] text-white/45",
                                                                        children: [
                                                                            "PARTIJ #",
                                                                            item.partijNr,
                                                                            " · ",
                                                                            item.corner === "red" ? "RODE HOEK" : "BLAUWE HOEK"
                                                                        ]
                                                                    }, void 0, true, {
                                                                        fileName: "[project]/app/dashboard/officials/weegstation/[matchmakingId]/page.tsx",
                                                                        lineNumber: 1560,
                                                                        columnNumber: 31
                                                                    }, this),
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                        className: "mt-1 flex items-center gap-2",
                                                                        children: [
                                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$user$2d$round$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__UserRound$3e$__["UserRound"], {
                                                                                className: "h-4 w-4",
                                                                                style: {
                                                                                    color: item.corner === "red" ? "#ef4444" : "#3b82f6"
                                                                                }
                                                                            }, void 0, false, {
                                                                                fileName: "[project]/app/dashboard/officials/weegstation/[matchmakingId]/page.tsx",
                                                                                lineNumber: 1565,
                                                                                columnNumber: 33
                                                                            }, this),
                                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                                className: "truncate text-sm font-extrabold text-white",
                                                                                children: item.fighterName
                                                                            }, void 0, false, {
                                                                                fileName: "[project]/app/dashboard/officials/weegstation/[matchmakingId]/page.tsx",
                                                                                lineNumber: 1569,
                                                                                columnNumber: 33
                                                                            }, this)
                                                                        ]
                                                                    }, void 0, true, {
                                                                        fileName: "[project]/app/dashboard/officials/weegstation/[matchmakingId]/page.tsx",
                                                                        lineNumber: 1564,
                                                                        columnNumber: 31
                                                                    }, this),
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                        className: "mt-1 text-xs text-white/45",
                                                                        children: [
                                                                            item.fighterGym,
                                                                            " · VA ",
                                                                            item.fighterVa
                                                                        ]
                                                                    }, void 0, true, {
                                                                        fileName: "[project]/app/dashboard/officials/weegstation/[matchmakingId]/page.tsx",
                                                                        lineNumber: 1574,
                                                                        columnNumber: 31
                                                                    }, this),
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                        className: "mt-2 flex flex-wrap gap-1",
                                                                        children: [
                                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                                className: "px-2 py-1 text-[10px] font-black",
                                                                                style: {
                                                                                    borderRadius: 4,
                                                                                    background: chip.bg,
                                                                                    color: chip.color,
                                                                                    border: `1px solid ${chip.border}`,
                                                                                    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.35)"
                                                                                },
                                                                                children: chip.label
                                                                            }, void 0, false, {
                                                                                fileName: "[project]/app/dashboard/officials/weegstation/[matchmakingId]/page.tsx",
                                                                                lineNumber: 1579,
                                                                                columnNumber: 33
                                                                            }, this),
                                                                            getLiveDispState(item.bout, evalResult) === "NODIG" && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                                className: "rounded-sm border border-white/15 bg-white/10 px-2 py-1 text-[10px] font-black text-white/85",
                                                                                children: "Dispensatie nodig"
                                                                            }, void 0, false, {
                                                                                fileName: "[project]/app/dashboard/officials/weegstation/[matchmakingId]/page.tsx",
                                                                                lineNumber: 1593,
                                                                                columnNumber: 35
                                                                            }, this),
                                                                            penalty === 1 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                                className: "rounded-sm border border-red-300 bg-red-100 px-2 py-1 text-[10px] font-black text-red-800",
                                                                                children: "Minpunt R1"
                                                                            }, void 0, false, {
                                                                                fileName: "[project]/app/dashboard/officials/weegstation/[matchmakingId]/page.tsx",
                                                                                lineNumber: 1599,
                                                                                columnNumber: 35
                                                                            }, this),
                                                                            hasManualSanction(item.bout.admin_sanctie_nodig) && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                                className: "rounded-sm border border-violet-300 bg-violet-100 px-2 py-1 text-[10px] font-black text-violet-800",
                                                                                children: "Handmatige actie"
                                                                            }, void 0, false, {
                                                                                fileName: "[project]/app/dashboard/officials/weegstation/[matchmakingId]/page.tsx",
                                                                                lineNumber: 1605,
                                                                                columnNumber: 35
                                                                            }, this)
                                                                        ]
                                                                    }, void 0, true, {
                                                                        fileName: "[project]/app/dashboard/officials/weegstation/[matchmakingId]/page.tsx",
                                                                        lineNumber: 1578,
                                                                        columnNumber: 31
                                                                    }, this)
                                                                ]
                                                            }, void 0, true, {
                                                                fileName: "[project]/app/dashboard/officials/weegstation/[matchmakingId]/page.tsx",
                                                                lineNumber: 1559,
                                                                columnNumber: 29
                                                            }, this),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                className: "shrink-0 text-right",
                                                                children: [
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                        className: "text-[10px] font-bold text-white/45",
                                                                        children: "GEWOGEN"
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/app/dashboard/officials/weegstation/[matchmakingId]/page.tsx",
                                                                        lineNumber: 1613,
                                                                        columnNumber: 31
                                                                    }, this),
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                        className: "mt-1 text-sm font-extrabold text-white",
                                                                        children: fmtKg(item.fighterGewogen)
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/app/dashboard/officials/weegstation/[matchmakingId]/page.tsx",
                                                                        lineNumber: 1614,
                                                                        columnNumber: 31
                                                                    }, this)
                                                                ]
                                                            }, void 0, true, {
                                                                fileName: "[project]/app/dashboard/officials/weegstation/[matchmakingId]/page.tsx",
                                                                lineNumber: 1612,
                                                                columnNumber: 29
                                                            }, this)
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/app/dashboard/officials/weegstation/[matchmakingId]/page.tsx",
                                                        lineNumber: 1558,
                                                        columnNumber: 27
                                                    }, this)
                                                }, `${item.boutId}-${item.corner}-${idx}`, false, {
                                                    fileName: "[project]/app/dashboard/officials/weegstation/[matchmakingId]/page.tsx",
                                                    lineNumber: 1543,
                                                    columnNumber: 25
                                                }, this);
                                            })
                                        }, void 0, false, {
                                            fileName: "[project]/app/dashboard/officials/weegstation/[matchmakingId]/page.tsx",
                                            lineNumber: 1525,
                                            columnNumber: 17
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/app/dashboard/officials/weegstation/[matchmakingId]/page.tsx",
                                    lineNumber: 1489,
                                    columnNumber: 15
                                }, this)
                            }, void 0, false, {
                                fileName: "[project]/app/dashboard/officials/weegstation/[matchmakingId]/page.tsx",
                                lineNumber: 1488,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "min-w-0 flex-1",
                                children: !selectedFighter || !selectedRow || !selectedDraft || !selectedEval ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "flex h-full items-center justify-center rounded-[18px]",
                                    style: {
                                        ...silverCardStyle(),
                                        minHeight: 500
                                    },
                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "text-center",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                style: {
                                                    fontSize: 48,
                                                    marginBottom: 12
                                                },
                                                children: "⚖️"
                                            }, void 0, false, {
                                                fileName: "[project]/app/dashboard/officials/weegstation/[matchmakingId]/page.tsx",
                                                lineNumber: 1637,
                                                columnNumber: 21
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "text-base font-semibold text-zinc-700",
                                                children: "Selecteer links één vechter om te wegen"
                                            }, void 0, false, {
                                                fileName: "[project]/app/dashboard/officials/weegstation/[matchmakingId]/page.tsx",
                                                lineNumber: 1638,
                                                columnNumber: 21
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/app/dashboard/officials/weegstation/[matchmakingId]/page.tsx",
                                        lineNumber: 1636,
                                        columnNumber: 19
                                    }, this)
                                }, void 0, false, {
                                    fileName: "[project]/app/dashboard/officials/weegstation/[matchmakingId]/page.tsx",
                                    lineNumber: 1629,
                                    columnNumber: 17
                                }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "h-full p-4",
                                    style: silverCardStyle(),
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "mb-4 flex items-start justify-between gap-4",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                            className: "text-lg font-black text-zinc-900",
                                                            children: [
                                                                "Partij #",
                                                                selectedFighter.partijNr
                                                            ]
                                                        }, void 0, true, {
                                                            fileName: "[project]/app/dashboard/officials/weegstation/[matchmakingId]/page.tsx",
                                                            lineNumber: 1647,
                                                            columnNumber: 23
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                            className: "mt-1 text-sm text-zinc-600",
                                                            children: [
                                                                safeText(selectedFighter.discipline),
                                                                " · ",
                                                                safeText(selectedFighter.klasse),
                                                                " ·",
                                                                " ",
                                                                safeText(selectedRow.leeftijd_type)
                                                            ]
                                                        }, void 0, true, {
                                                            fileName: "[project]/app/dashboard/officials/weegstation/[matchmakingId]/page.tsx",
                                                            lineNumber: 1648,
                                                            columnNumber: 23
                                                        }, this)
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/app/dashboard/officials/weegstation/[matchmakingId]/page.tsx",
                                                    lineNumber: 1646,
                                                    columnNumber: 21
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "flex flex-wrap items-center justify-end gap-2",
                                                    children: [
                                                        (()=>{
                                                            const chip = statusChipFromRowOrEval(selectedRow, selectedEval?.eindStatus);
                                                            return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                className: "px-3 py-1 text-xs font-black",
                                                                style: {
                                                                    borderRadius: 4,
                                                                    background: chip.bg,
                                                                    color: chip.color,
                                                                    border: `1px solid ${chip.border}`,
                                                                    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.35)"
                                                                },
                                                                children: chip.label
                                                            }, void 0, false, {
                                                                fileName: "[project]/app/dashboard/officials/weegstation/[matchmakingId]/page.tsx",
                                                                lineNumber: 1658,
                                                                columnNumber: 27
                                                            }, this);
                                                        })(),
                                                        selectedDispState === "VERLEEND" && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                            className: "inline-flex h-7 items-center whitespace-nowrap rounded-sm border border-emerald-300 bg-emerald-100 px-3 py-1 text-[11px] font-black text-emerald-800",
                                                            children: "Dispensatie ✅"
                                                        }, void 0, false, {
                                                            fileName: "[project]/app/dashboard/officials/weegstation/[matchmakingId]/page.tsx",
                                                            lineNumber: 1674,
                                                            columnNumber: 25
                                                        }, this),
                                                        selectedDispState === "AFGEWEZEN" && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                            className: "inline-flex h-7 items-center whitespace-nowrap rounded-sm border border-red-300 bg-red-100 px-3 py-1 text-[11px] font-black text-red-800",
                                                            children: "Dispensatie ⛔"
                                                        }, void 0, false, {
                                                            fileName: "[project]/app/dashboard/officials/weegstation/[matchmakingId]/page.tsx",
                                                            lineNumber: 1680,
                                                            columnNumber: 25
                                                        }, this),
                                                        selectedDispState === "NODIG" && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                            className: "inline-flex h-7 items-center whitespace-nowrap rounded-sm border border-yellow-300 bg-yellow-100 px-3 py-1 text-[11px] font-black text-yellow-800",
                                                            children: "Dispensatie nodig"
                                                        }, void 0, false, {
                                                            fileName: "[project]/app/dashboard/officials/weegstation/[matchmakingId]/page.tsx",
                                                            lineNumber: 1686,
                                                            columnNumber: 25
                                                        }, this)
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/app/dashboard/officials/weegstation/[matchmakingId]/page.tsx",
                                                    lineNumber: 1654,
                                                    columnNumber: 21
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/app/dashboard/officials/weegstation/[matchmakingId]/page.tsx",
                                            lineNumber: 1645,
                                            columnNumber: 19
                                        }, this),
                                        isMatchmakerOnly && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "mb-3 rounded-[8px] border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-800",
                                            children: "👁 Alleen-lezen modus — matchmakers mogen gewichten bekijken maar niet wijzigen."
                                        }, void 0, false, {
                                            fileName: "[project]/app/dashboard/officials/weegstation/[matchmakingId]/page.tsx",
                                            lineNumber: 1694,
                                            columnNumber: 21
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "mb-4 grid grid-cols-1 gap-4 xl:grid-cols-[1.15fr_0.95fr]",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "rounded-[10px] p-4",
                                                    style: {
                                                        background: selectedFighter.corner === "red" ? "linear-gradient(180deg, rgba(220,38,38,0.08), rgba(255,255,255,0.72))" : "linear-gradient(180deg, rgba(37,99,235,0.08), rgba(255,255,255,0.72))",
                                                        border: selectedFighter.corner === "red" ? "2px solid rgba(220,38,38,0.20)" : "2px solid rgba(37,99,235,0.20)",
                                                        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.65)"
                                                    },
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                            className: "mb-2 text-xs font-black uppercase tracking-[0.08em]",
                                                            style: {
                                                                color: selectedFighter.corner === "red" ? "#dc2626" : "#2563eb"
                                                            },
                                                            children: selectedFighter.corner === "red" ? "🔴 geselecteerde vechter" : "🔵 geselecteerde vechter"
                                                        }, void 0, false, {
                                                            fileName: "[project]/app/dashboard/officials/weegstation/[matchmakingId]/page.tsx",
                                                            lineNumber: 1714,
                                                            columnNumber: 23
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                            className: "text-2xl font-black text-zinc-900",
                                                            children: selectedFighter.fighterName
                                                        }, void 0, false, {
                                                            fileName: "[project]/app/dashboard/officials/weegstation/[matchmakingId]/page.tsx",
                                                            lineNumber: 1723,
                                                            columnNumber: 23
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                            className: "mt-1 text-sm text-zinc-600",
                                                            children: [
                                                                selectedFighter.fighterGym,
                                                                " · VA ",
                                                                selectedFighter.fighterVa
                                                            ]
                                                        }, void 0, true, {
                                                            fileName: "[project]/app/dashboard/officials/weegstation/[matchmakingId]/page.tsx",
                                                            lineNumber: 1725,
                                                            columnNumber: 23
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                            className: "mt-2 text-xs text-zinc-500",
                                                            children: [
                                                                "Opgegeven: ",
                                                                fmtKg(selectedFighter.fighterDoorgegeven)
                                                            ]
                                                        }, void 0, true, {
                                                            fileName: "[project]/app/dashboard/officials/weegstation/[matchmakingId]/page.tsx",
                                                            lineNumber: 1729,
                                                            columnNumber: 23
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                            className: "mt-4",
                                                            children: [
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                                    className: "mb-2 block text-sm font-bold text-zinc-700",
                                                                    children: "Gewogen gewicht (kg)"
                                                                }, void 0, false, {
                                                                    fileName: "[project]/app/dashboard/officials/weegstation/[matchmakingId]/page.tsx",
                                                                    lineNumber: 1734,
                                                                    columnNumber: 25
                                                                }, this),
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                                    ref: activeInputRef,
                                                                    type: "text",
                                                                    inputMode: "decimal",
                                                                    enterKeyHint: "done",
                                                                    autoComplete: "off",
                                                                    placeholder: "Gewicht",
                                                                    value: activeWeightValue,
                                                                    readOnly: isMatchmakerOnly,
                                                                    disabled: isMatchmakerOnly,
                                                                    onChange: (e)=>{
                                                                        if (isMatchmakerOnly || !selectedRow || !selectedFighter) return;
                                                                        if (selectedFighter.corner === "red") {
                                                                            setDraft(selectedRow.id, {
                                                                                rood: e.target.value
                                                                            });
                                                                        } else {
                                                                            setDraft(selectedRow.id, {
                                                                                blauw: e.target.value
                                                                            });
                                                                        }
                                                                    },
                                                                    onKeyDown: (e)=>{
                                                                        if (isMatchmakerOnly) return;
                                                                        if (e.key !== "Enter") return;
                                                                        e.preventDefault();
                                                                        void saveSelected();
                                                                    },
                                                                    style: {
                                                                        width: "100%",
                                                                        padding: "16px 14px",
                                                                        fontSize: 30,
                                                                        fontWeight: 800,
                                                                        textAlign: "center",
                                                                        background: isMatchmakerOnly ? "rgba(243,244,246,0.95)" : "rgba(255,255,255,0.95)",
                                                                        border: selectedFighter.corner === "red" ? "2.5px solid rgba(220,38,38,0.34)" : "2.5px solid rgba(37,99,235,0.34)",
                                                                        borderRadius: 4,
                                                                        color: isMatchmakerOnly ? "#6b7280" : "#111",
                                                                        outline: "none",
                                                                        letterSpacing: "0.02em"
                                                                    }
                                                                }, void 0, false, {
                                                                    fileName: "[project]/app/dashboard/officials/weegstation/[matchmakingId]/page.tsx",
                                                                    lineNumber: 1735,
                                                                    columnNumber: 25
                                                                }, this),
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                    className: "mt-2 text-xs font-semibold text-zinc-500",
                                                                    children: isMatchmakerOnly ? "Alleen-lezen — matchmakers mogen geen gewichten wijzigen." : "Typ gewicht en druk op Enter om direct op te slaan."
                                                                }, void 0, false, {
                                                                    fileName: "[project]/app/dashboard/officials/weegstation/[matchmakingId]/page.tsx",
                                                                    lineNumber: 1776,
                                                                    columnNumber: 25
                                                                }, this)
                                                            ]
                                                        }, void 0, true, {
                                                            fileName: "[project]/app/dashboard/officials/weegstation/[matchmakingId]/page.tsx",
                                                            lineNumber: 1733,
                                                            columnNumber: 23
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                            className: "mt-4 grid grid-cols-1 gap-3 md:grid-cols-2",
                                                            children: [
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                    className: "rounded-[8px] p-3",
                                                                    style: {
                                                                        background: "rgba(255,255,255,0.68)",
                                                                        border: `1px solid ${FS_LINE_LIGHT}`
                                                                    },
                                                                    children: [
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                            className: "text-[11px] font-black uppercase tracking-[0.06em] text-zinc-500",
                                                                            children: "Tegenstander"
                                                                        }, void 0, false, {
                                                                            fileName: "[project]/app/dashboard/officials/weegstation/[matchmakingId]/page.tsx",
                                                                            lineNumber: 1788,
                                                                            columnNumber: 27
                                                                        }, this),
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                            className: "mt-1 text-base font-extrabold text-zinc-900",
                                                                            children: selectedFighter.opponentName
                                                                        }, void 0, false, {
                                                                            fileName: "[project]/app/dashboard/officials/weegstation/[matchmakingId]/page.tsx",
                                                                            lineNumber: 1791,
                                                                            columnNumber: 27
                                                                        }, this),
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                            className: "mt-1 text-sm text-zinc-600",
                                                                            children: [
                                                                                selectedFighter.opponentGym,
                                                                                " · VA ",
                                                                                selectedFighter.opponentVa
                                                                            ]
                                                                        }, void 0, true, {
                                                                            fileName: "[project]/app/dashboard/officials/weegstation/[matchmakingId]/page.tsx",
                                                                            lineNumber: 1794,
                                                                            columnNumber: 27
                                                                        }, this),
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                            className: "mt-2 text-xs text-zinc-500",
                                                                            children: [
                                                                                "Gewogen: ",
                                                                                fmtKg(selectedFighter.opponentGewogen)
                                                                            ]
                                                                        }, void 0, true, {
                                                                            fileName: "[project]/app/dashboard/officials/weegstation/[matchmakingId]/page.tsx",
                                                                            lineNumber: 1797,
                                                                            columnNumber: 27
                                                                        }, this)
                                                                    ]
                                                                }, void 0, true, {
                                                                    fileName: "[project]/app/dashboard/officials/weegstation/[matchmakingId]/page.tsx",
                                                                    lineNumber: 1784,
                                                                    columnNumber: 25
                                                                }, this),
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                    className: "rounded-[8px] p-3",
                                                                    style: {
                                                                        background: "rgba(255,255,255,0.68)",
                                                                        border: `1px solid ${FS_LINE_LIGHT}`
                                                                    },
                                                                    children: [
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                            className: "text-[11px] font-black uppercase tracking-[0.06em] text-zinc-500",
                                                                            children: "Klasse / gewichtsregel"
                                                                        }, void 0, false, {
                                                                            fileName: "[project]/app/dashboard/officials/weegstation/[matchmakingId]/page.tsx",
                                                                            lineNumber: 1806,
                                                                            columnNumber: 27
                                                                        }, this),
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                            className: "mt-1 text-base font-extrabold text-zinc-900",
                                                                            children: getWeightRuleValue(selectedRow)
                                                                        }, void 0, false, {
                                                                            fileName: "[project]/app/dashboard/officials/weegstation/[matchmakingId]/page.tsx",
                                                                            lineNumber: 1809,
                                                                            columnNumber: 27
                                                                        }, this),
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                            className: "mt-2 text-xs text-zinc-500",
                                                                            children: [
                                                                                getWeightRuleTitle(selectedRow),
                                                                                ": ",
                                                                                getWeightClassHint(selectedRow.klasse_mm, selectedRow.max_gewicht_notatie ?? selectedRow.max_gewicht)
                                                                            ]
                                                                        }, void 0, true, {
                                                                            fileName: "[project]/app/dashboard/officials/weegstation/[matchmakingId]/page.tsx",
                                                                            lineNumber: 1812,
                                                                            columnNumber: 27
                                                                        }, this)
                                                                    ]
                                                                }, void 0, true, {
                                                                    fileName: "[project]/app/dashboard/officials/weegstation/[matchmakingId]/page.tsx",
                                                                    lineNumber: 1802,
                                                                    columnNumber: 25
                                                                }, this)
                                                            ]
                                                        }, void 0, true, {
                                                            fileName: "[project]/app/dashboard/officials/weegstation/[matchmakingId]/page.tsx",
                                                            lineNumber: 1783,
                                                            columnNumber: 23
                                                        }, this)
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/app/dashboard/officials/weegstation/[matchmakingId]/page.tsx",
                                                    lineNumber: 1700,
                                                    columnNumber: 21
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "rounded-[10px] p-4",
                                                    style: {
                                                        background: "rgba(255,255,255,0.56)",
                                                        border: `1px solid ${FS_LINE_LIGHT}`
                                                    },
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                            className: "mb-3 text-sm font-black uppercase tracking-[0.06em] text-zinc-800",
                                                            children: "Status en beoordeling"
                                                        }, void 0, false, {
                                                            fileName: "[project]/app/dashboard/officials/weegstation/[matchmakingId]/page.tsx",
                                                            lineNumber: 1826,
                                                            columnNumber: 23
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                            className: "mb-3 rounded-[8px] p-3 text-center",
                                                            style: {
                                                                background: "rgba(255,255,255,0.74)",
                                                                border: `1px solid ${FS_LINE_LIGHT}`
                                                            },
                                                            children: [
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                    className: "text-lg font-black text-zinc-900",
                                                                    children: [
                                                                        "Verschil: ",
                                                                        fmtKg(selectedEval?.diff ?? null)
                                                                    ]
                                                                }, void 0, true, {
                                                                    fileName: "[project]/app/dashboard/officials/weegstation/[matchmakingId]/page.tsx",
                                                                    lineNumber: 1834,
                                                                    columnNumber: 25
                                                                }, this),
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                    className: "mt-1 text-xs text-zinc-500",
                                                                    children: "Jeugd: OK ≤ 2.5 / Disp. 2.6–3.9 / Afkeur ≥ 4.0"
                                                                }, void 0, false, {
                                                                    fileName: "[project]/app/dashboard/officials/weegstation/[matchmakingId]/page.tsx",
                                                                    lineNumber: 1837,
                                                                    columnNumber: 25
                                                                }, this),
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                    className: "text-xs text-zinc-500",
                                                                    children: "Volwassen: OK ≤ 3.5 / Disp. 3.6–6.9 / Afkeur ≥ 7.0"
                                                                }, void 0, false, {
                                                                    fileName: "[project]/app/dashboard/officials/weegstation/[matchmakingId]/page.tsx",
                                                                    lineNumber: 1840,
                                                                    columnNumber: 25
                                                                }, this)
                                                            ]
                                                        }, void 0, true, {
                                                            fileName: "[project]/app/dashboard/officials/weegstation/[matchmakingId]/page.tsx",
                                                            lineNumber: 1830,
                                                            columnNumber: 23
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                            className: "space-y-2",
                                                            children: (selectedEval?.messages ?? []).map((msg, idx)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                    className: "rounded-[8px] px-3 py-2 text-sm font-semibold text-zinc-700",
                                                                    style: {
                                                                        background: "rgba(255,255,255,0.74)",
                                                                        border: `1px solid ${FS_LINE_LIGHT}`
                                                                    },
                                                                    children: msg
                                                                }, idx, false, {
                                                                    fileName: "[project]/app/dashboard/officials/weegstation/[matchmakingId]/page.tsx",
                                                                    lineNumber: 1847,
                                                                    columnNumber: 27
                                                                }, this))
                                                        }, void 0, false, {
                                                            fileName: "[project]/app/dashboard/officials/weegstation/[matchmakingId]/page.tsx",
                                                            lineNumber: 1845,
                                                            columnNumber: 23
                                                        }, this),
                                                        selectedIsOutsideWeightClass && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                            className: "mt-3 rounded-[8px] p-3 text-sm font-bold text-red-900",
                                                            style: {
                                                                background: "rgba(220,38,38,0.10)",
                                                                border: "1px solid rgba(220,38,38,0.26)"
                                                            },
                                                            children: [
                                                                "Deze vechter valt buiten de gewichtsklasse (",
                                                                getWeightClassHint(selectedRow.klasse_mm, selectedRow.max_gewicht_notatie ?? selectedRow.max_gewicht),
                                                                "). Bij 95+ telt alleen het minimum van 95,0 kg en is er geen bovengrens."
                                                            ]
                                                        }, void 0, true, {
                                                            fileName: "[project]/app/dashboard/officials/weegstation/[matchmakingId]/page.tsx",
                                                            lineNumber: 1858,
                                                            columnNumber: 25
                                                        }, this),
                                                        hasManualSanction(selectedRow.admin_sanctie_nodig) && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                            className: "mt-3 rounded-[8px] p-3",
                                                            style: {
                                                                background: "rgba(124,58,237,0.10)",
                                                                border: "1px solid rgba(124,58,237,0.26)"
                                                            },
                                                            children: [
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                    className: "flex items-center gap-2 font-black text-violet-900",
                                                                    children: [
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$shield$2d$alert$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__ShieldAlert$3e$__["ShieldAlert"], {
                                                                            className: "h-4 w-4"
                                                                        }, void 0, false, {
                                                                            fileName: "[project]/app/dashboard/officials/weegstation/[matchmakingId]/page.tsx",
                                                                            lineNumber: 1882,
                                                                            columnNumber: 29
                                                                        }, this),
                                                                        "Handmatige actie nodig"
                                                                    ]
                                                                }, void 0, true, {
                                                                    fileName: "[project]/app/dashboard/officials/weegstation/[matchmakingId]/page.tsx",
                                                                    lineNumber: 1881,
                                                                    columnNumber: 27
                                                                }, this),
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                    className: "mt-2 text-sm text-violet-900/80",
                                                                    children: selectedRow.admin_sanctie_reason || "Handmatige beoordeling nodig."
                                                                }, void 0, false, {
                                                                    fileName: "[project]/app/dashboard/officials/weegstation/[matchmakingId]/page.tsx",
                                                                    lineNumber: 1885,
                                                                    columnNumber: 27
                                                                }, this)
                                                            ]
                                                        }, void 0, true, {
                                                            fileName: "[project]/app/dashboard/officials/weegstation/[matchmakingId]/page.tsx",
                                                            lineNumber: 1874,
                                                            columnNumber: 25
                                                        }, this)
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/app/dashboard/officials/weegstation/[matchmakingId]/page.tsx",
                                                    lineNumber: 1819,
                                                    columnNumber: 21
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/app/dashboard/officials/weegstation/[matchmakingId]/page.tsx",
                                            lineNumber: 1699,
                                            columnNumber: 19
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "mb-4 grid grid-cols-1 gap-4 lg:grid-cols-[0.8fr_1.2fr]",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "rounded-[10px] p-4",
                                                    style: {
                                                        background: "rgba(255,255,255,0.56)",
                                                        border: `1px solid ${FS_LINE_LIGHT}`
                                                    },
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                            className: "mb-3 text-sm font-black uppercase tracking-[0.06em] text-zinc-800",
                                                            children: "Minpunt eerste ronde"
                                                        }, void 0, false, {
                                                            fileName: "[project]/app/dashboard/officials/weegstation/[matchmakingId]/page.tsx",
                                                            lineNumber: 1898,
                                                            columnNumber: 23
                                                        }, this),
                                                        !selectedCanAssignPenalty ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                            className: "rounded-[8px] p-3 text-sm font-semibold text-zinc-600",
                                                            style: {
                                                                background: "rgba(255,255,255,0.74)",
                                                                border: `1px solid ${FS_LINE_LIGHT}`
                                                            },
                                                            children: "Voor deze vechter is nu geen minpunt mogelijk."
                                                        }, void 0, false, {
                                                            fileName: "[project]/app/dashboard/officials/weegstation/[matchmakingId]/page.tsx",
                                                            lineNumber: 1903,
                                                            columnNumber: 25
                                                        }, this) : !isHoofdofficialOrSuperadmin ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                            className: "rounded-[8px] border border-orange-200 bg-orange-50 p-3 text-sm font-bold text-orange-800",
                                                            children: "Alleen hoofdofficial of superadmin mag minpunt bevestigen."
                                                        }, void 0, false, {
                                                            fileName: "[project]/app/dashboard/officials/weegstation/[matchmakingId]/page.tsx",
                                                            lineNumber: 1910,
                                                            columnNumber: 25
                                                        }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                            className: "rounded-[8px] p-3",
                                                            style: {
                                                                background: "rgba(255,255,255,0.74)",
                                                                border: `1px solid ${FS_LINE_LIGHT}`
                                                            },
                                                            children: [
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                    className: "mb-2 flex items-center justify-between gap-2",
                                                                    children: [
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                            className: "text-xs font-black uppercase tracking-[0.06em] text-zinc-500",
                                                                            children: "Minpunt"
                                                                        }, void 0, false, {
                                                                            fileName: "[project]/app/dashboard/officials/weegstation/[matchmakingId]/page.tsx",
                                                                            lineNumber: 1919,
                                                                            columnNumber: 29
                                                                        }, this),
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                            className: "inline-flex min-w-[72px] items-center justify-center px-2 py-1 text-[11px] font-black",
                                                                            style: {
                                                                                borderRadius: 4,
                                                                                background: activePenaltyValue === "1" ? "#dcfce7" : "#fee2e2",
                                                                                color: activePenaltyValue === "1" ? "#166534" : "#991b1b",
                                                                                border: activePenaltyValue === "1" ? "1px solid #86efac" : "1px solid #fca5a5"
                                                                            },
                                                                            children: activePenaltyValue === "1" ? "Minpunt: Ja" : "Minpunt: Nee"
                                                                        }, void 0, false, {
                                                                            fileName: "[project]/app/dashboard/officials/weegstation/[matchmakingId]/page.tsx",
                                                                            lineNumber: 1923,
                                                                            columnNumber: 29
                                                                        }, this)
                                                                    ]
                                                                }, void 0, true, {
                                                                    fileName: "[project]/app/dashboard/officials/weegstation/[matchmakingId]/page.tsx",
                                                                    lineNumber: 1918,
                                                                    columnNumber: 27
                                                                }, this),
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                    className: "flex flex-wrap gap-2",
                                                                    children: [
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(ActionButton, {
                                                                            onClick: ()=>{
                                                                                if (!selectedRow || !selectedFighter) return;
                                                                                if (selectedFighter.corner === "red") {
                                                                                    setDraft(selectedRow.id, {
                                                                                        strafpuntRood: "1"
                                                                                    });
                                                                                } else {
                                                                                    setDraft(selectedRow.id, {
                                                                                        strafpuntBlauw: "1"
                                                                                    });
                                                                                }
                                                                            },
                                                                            tone: activePenaltyValue === "1" ? "green" : "dark",
                                                                            children: "Ja"
                                                                        }, void 0, false, {
                                                                            fileName: "[project]/app/dashboard/officials/weegstation/[matchmakingId]/page.tsx",
                                                                            lineNumber: 1940,
                                                                            columnNumber: 29
                                                                        }, this),
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(ActionButton, {
                                                                            onClick: ()=>{
                                                                                if (!selectedRow || !selectedFighter) return;
                                                                                if (selectedFighter.corner === "red") {
                                                                                    setDraft(selectedRow.id, {
                                                                                        strafpuntRood: "0"
                                                                                    });
                                                                                } else {
                                                                                    setDraft(selectedRow.id, {
                                                                                        strafpuntBlauw: "0"
                                                                                    });
                                                                                }
                                                                            },
                                                                            tone: activePenaltyValue === "0" ? "red" : "dark",
                                                                            children: "Nee"
                                                                        }, void 0, false, {
                                                                            fileName: "[project]/app/dashboard/officials/weegstation/[matchmakingId]/page.tsx",
                                                                            lineNumber: 1954,
                                                                            columnNumber: 29
                                                                        }, this)
                                                                    ]
                                                                }, void 0, true, {
                                                                    fileName: "[project]/app/dashboard/officials/weegstation/[matchmakingId]/page.tsx",
                                                                    lineNumber: 1939,
                                                                    columnNumber: 27
                                                                }, this)
                                                            ]
                                                        }, void 0, true, {
                                                            fileName: "[project]/app/dashboard/officials/weegstation/[matchmakingId]/page.tsx",
                                                            lineNumber: 1914,
                                                            columnNumber: 25
                                                        }, this)
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/app/dashboard/officials/weegstation/[matchmakingId]/page.tsx",
                                                    lineNumber: 1894,
                                                    columnNumber: 21
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "rounded-[10px] p-4",
                                                    style: {
                                                        background: "rgba(255,255,255,0.56)",
                                                        border: `1px solid ${FS_LINE_LIGHT}`
                                                    },
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                            className: "mb-3 text-sm font-black uppercase tracking-[0.06em] text-zinc-800",
                                                            children: "Weegnotitie"
                                                        }, void 0, false, {
                                                            fileName: "[project]/app/dashboard/officials/weegstation/[matchmakingId]/page.tsx",
                                                            lineNumber: 1976,
                                                            columnNumber: 23
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("textarea", {
                                                            rows: 3,
                                                            placeholder: "Optionele notitie...",
                                                            value: selectedDraft.note,
                                                            onChange: (e)=>selectedRow && setDraft(selectedRow.id, {
                                                                    note: e.target.value
                                                                }),
                                                            style: {
                                                                width: "100%",
                                                                padding: "10px 12px",
                                                                fontSize: 14,
                                                                fontWeight: 500,
                                                                background: "rgba(255,255,255,0.92)",
                                                                border: "1.5px solid rgba(0,0,0,0.14)",
                                                                borderRadius: 4,
                                                                color: "#111",
                                                                outline: "none",
                                                                resize: "vertical"
                                                            }
                                                        }, void 0, false, {
                                                            fileName: "[project]/app/dashboard/officials/weegstation/[matchmakingId]/page.tsx",
                                                            lineNumber: 1980,
                                                            columnNumber: 23
                                                        }, this)
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/app/dashboard/officials/weegstation/[matchmakingId]/page.tsx",
                                                    lineNumber: 1972,
                                                    columnNumber: 21
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/app/dashboard/officials/weegstation/[matchmakingId]/page.tsx",
                                            lineNumber: 1893,
                                            columnNumber: 19
                                        }, this),
                                        !isMatchmakerOnly && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(ActionButton, {
                                            onClick: saveSelected,
                                            disabled: savingId === selectedRow.id,
                                            tone: "dark",
                                            className: "gap-2 px-5 py-3 text-sm",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$save$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Save$3e$__["Save"], {
                                                    className: "h-4 w-4"
                                                }, void 0, false, {
                                                    fileName: "[project]/app/dashboard/officials/weegstation/[matchmakingId]/page.tsx",
                                                    lineNumber: 2008,
                                                    columnNumber: 21
                                                }, this),
                                                savingId === selectedRow.id ? "Opslaan..." : "Opslaan"
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/app/dashboard/officials/weegstation/[matchmakingId]/page.tsx",
                                            lineNumber: 2002,
                                            columnNumber: 19
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/app/dashboard/officials/weegstation/[matchmakingId]/page.tsx",
                                    lineNumber: 1644,
                                    columnNumber: 17
                                }, this)
                            }, void 0, false, {
                                fileName: "[project]/app/dashboard/officials/weegstation/[matchmakingId]/page.tsx",
                                lineNumber: 1627,
                                columnNumber: 13
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/app/dashboard/officials/weegstation/[matchmakingId]/page.tsx",
                        lineNumber: 1487,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "mt-5 rounded-[16px] p-4 text-white",
                        style: darkPanelStyle(),
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "mb-3 text-sm font-black uppercase tracking-[0.06em]",
                                style: {
                                    color: NVB_ORANGE
                                },
                                children: "📋 Alle gewogen partijen"
                            }, void 0, false, {
                                fileName: "[project]/app/dashboard/officials/weegstation/[matchmakingId]/page.tsx",
                                lineNumber: 2018,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "overflow-x-auto",
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("table", {
                                    className: "w-full border-separate text-sm",
                                    style: {
                                        borderSpacing: "0 4px"
                                    },
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("thead", {
                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("tr", {
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                        className: "px-2 py-2 text-left text-[10px] font-black uppercase tracking-[0.08em] text-white/50",
                                                        children: "Nr"
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/dashboard/officials/weegstation/[matchmakingId]/page.tsx",
                                                        lineNumber: 2026,
                                                        columnNumber: 21
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                        className: "px-2 py-2 text-left text-[10px] font-black uppercase tracking-[0.08em] text-white/50",
                                                        children: "Discipline"
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/dashboard/officials/weegstation/[matchmakingId]/page.tsx",
                                                        lineNumber: 2027,
                                                        columnNumber: 21
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                        className: "px-2 py-2 text-left text-[10px] font-black uppercase tracking-[0.08em] text-white/50",
                                                        children: "Klasse"
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/dashboard/officials/weegstation/[matchmakingId]/page.tsx",
                                                        lineNumber: 2028,
                                                        columnNumber: 21
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                        className: "px-2 py-2 text-left text-[10px] font-black uppercase tracking-[0.08em] text-white/50",
                                                        children: "Rood"
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/dashboard/officials/weegstation/[matchmakingId]/page.tsx",
                                                        lineNumber: 2029,
                                                        columnNumber: 21
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                        className: "px-2 py-2 text-left text-[10px] font-black uppercase tracking-[0.08em] text-white/50",
                                                        children: "Blauw"
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/dashboard/officials/weegstation/[matchmakingId]/page.tsx",
                                                        lineNumber: 2030,
                                                        columnNumber: 21
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                        className: "px-2 py-2 text-left text-[10px] font-black uppercase tracking-[0.08em] text-white/50",
                                                        children: "Max"
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/dashboard/officials/weegstation/[matchmakingId]/page.tsx",
                                                        lineNumber: 2031,
                                                        columnNumber: 21
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                        className: "px-2 py-2 text-left text-[10px] font-black uppercase tracking-[0.08em] text-white/50",
                                                        style: {
                                                            width: 74,
                                                            minWidth: 74
                                                        },
                                                        children: "R.gew."
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/dashboard/officials/weegstation/[matchmakingId]/page.tsx",
                                                        lineNumber: 2032,
                                                        columnNumber: 21
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                        className: "px-2 py-2 text-left text-[10px] font-black uppercase tracking-[0.08em] text-white/50",
                                                        style: {
                                                            width: 74,
                                                            minWidth: 74
                                                        },
                                                        children: "B.gew."
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/dashboard/officials/weegstation/[matchmakingId]/page.tsx",
                                                        lineNumber: 2038,
                                                        columnNumber: 21
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                        className: "px-2 py-2 text-left text-[10px] font-black uppercase tracking-[0.08em] text-white/50",
                                                        style: {
                                                            width: 78,
                                                            minWidth: 78
                                                        },
                                                        children: "Verschil"
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/dashboard/officials/weegstation/[matchmakingId]/page.tsx",
                                                        lineNumber: 2044,
                                                        columnNumber: 21
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                        className: "px-2 py-2 text-left text-[10px] font-black uppercase tracking-[0.08em] text-white/50",
                                                        children: "Status"
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/dashboard/officials/weegstation/[matchmakingId]/page.tsx",
                                                        lineNumber: 2050,
                                                        columnNumber: 21
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                        className: "px-2 py-2 text-center text-[10px] font-black uppercase tracking-[0.08em] text-white/50",
                                                        style: {
                                                            width: 82,
                                                            minWidth: 82
                                                        },
                                                        children: "Minpunt"
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/dashboard/officials/weegstation/[matchmakingId]/page.tsx",
                                                        lineNumber: 2051,
                                                        columnNumber: 21
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                        className: "px-2 py-2 text-left text-[10px] font-black uppercase tracking-[0.08em] text-white/50",
                                                        style: {
                                                            width: 220,
                                                            minWidth: 220
                                                        },
                                                        children: "Acties"
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/dashboard/officials/weegstation/[matchmakingId]/page.tsx",
                                                        lineNumber: 2057,
                                                        columnNumber: 21
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/app/dashboard/officials/weegstation/[matchmakingId]/page.tsx",
                                                lineNumber: 2025,
                                                columnNumber: 19
                                            }, this)
                                        }, void 0, false, {
                                            fileName: "[project]/app/dashboard/officials/weegstation/[matchmakingId]/page.tsx",
                                            lineNumber: 2024,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("tbody", {
                                            children: rows.map((row, index)=>{
                                                const draft = getDraft(row.id);
                                                const liveRood = toNum(draft.rood);
                                                const liveBlauw = toNum(draft.blauw);
                                                const evalResult = getLiveEval(row, draft);
                                                const chip = statusChipFromRowOrEval(row, evalResult?.eindStatus);
                                                const dispState = getLiveDispState(row, evalResult);
                                                const canHandleDisp = isHoofdofficialOrSuperadmin && (normalizeStatus(evalResult?.eindStatus) === "DISPENSATIE_NODIG" || dispState === "NODIG" || dispState === "VERLEEND" || dispState === "AFGEWEZEN");
                                                const zebraBg = index % 2 === 0 ? "rgba(255,255,255,0.05)" : "rgba(171,178,187,0.14)";
                                                const hasPenalty = toPenalty(draft.strafpuntRood) === 1 || toPenalty(draft.strafpuntBlauw) === 1;
                                                return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("tr", {
                                                    style: {
                                                        background: zebraBg
                                                    },
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                            className: "px-2 py-2 font-black",
                                                            style: {
                                                                color: NVB_ORANGE
                                                            },
                                                            children: [
                                                                "#",
                                                                row.partij_nr
                                                            ]
                                                        }, void 0, true, {
                                                            fileName: "[project]/app/dashboard/officials/weegstation/[matchmakingId]/page.tsx",
                                                            lineNumber: 2095,
                                                            columnNumber: 25
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                            className: "px-2 py-2 text-white/85",
                                                            children: safeText(row.discipline)
                                                        }, void 0, false, {
                                                            fileName: "[project]/app/dashboard/officials/weegstation/[matchmakingId]/page.tsx",
                                                            lineNumber: 2098,
                                                            columnNumber: 25
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                            className: "px-2 py-2 text-white/85",
                                                            children: safeText(row.klasse_mm)
                                                        }, void 0, false, {
                                                            fileName: "[project]/app/dashboard/officials/weegstation/[matchmakingId]/page.tsx",
                                                            lineNumber: 2099,
                                                            columnNumber: 25
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                            className: "px-2 py-2 font-bold text-red-400",
                                                            children: safeText(row.rood_naam, "?")
                                                        }, void 0, false, {
                                                            fileName: "[project]/app/dashboard/officials/weegstation/[matchmakingId]/page.tsx",
                                                            lineNumber: 2100,
                                                            columnNumber: 25
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                            className: "px-2 py-2 font-bold text-sky-400",
                                                            children: safeText(row.blauw_naam, "?")
                                                        }, void 0, false, {
                                                            fileName: "[project]/app/dashboard/officials/weegstation/[matchmakingId]/page.tsx",
                                                            lineNumber: 2101,
                                                            columnNumber: 25
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                            className: "px-2 py-2 font-bold text-white/88",
                                                            children: fmtCompact(row.max_gewicht)
                                                        }, void 0, false, {
                                                            fileName: "[project]/app/dashboard/officials/weegstation/[matchmakingId]/page.tsx",
                                                            lineNumber: 2102,
                                                            columnNumber: 25
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                            className: "px-2 py-2 font-bold text-white/92",
                                                            children: fmtCompact(liveRood)
                                                        }, void 0, false, {
                                                            fileName: "[project]/app/dashboard/officials/weegstation/[matchmakingId]/page.tsx",
                                                            lineNumber: 2103,
                                                            columnNumber: 25
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                            className: "px-2 py-2 font-bold text-white/92",
                                                            children: fmtCompact(liveBlauw)
                                                        }, void 0, false, {
                                                            fileName: "[project]/app/dashboard/officials/weegstation/[matchmakingId]/page.tsx",
                                                            lineNumber: 2104,
                                                            columnNumber: 25
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                            className: "px-2 py-2 font-bold text-white/75",
                                                            children: fmtCompact(evalResult?.diff ?? null)
                                                        }, void 0, false, {
                                                            fileName: "[project]/app/dashboard/officials/weegstation/[matchmakingId]/page.tsx",
                                                            lineNumber: 2105,
                                                            columnNumber: 25
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                            className: "px-2 py-2",
                                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                className: "flex flex-col items-start gap-1",
                                                                children: [
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                        className: "px-2 py-1 text-[10px] font-black",
                                                                        style: {
                                                                            borderRadius: 4,
                                                                            background: chip.bg,
                                                                            color: chip.color,
                                                                            border: `1px solid ${chip.border}`,
                                                                            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.35)"
                                                                        },
                                                                        children: chip.label
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/app/dashboard/officials/weegstation/[matchmakingId]/page.tsx",
                                                                        lineNumber: 2109,
                                                                        columnNumber: 29
                                                                    }, this),
                                                                    dispState === "NODIG" && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                        className: "text-[10px] font-black text-white/85",
                                                                        children: "Dispensatie nodig"
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/app/dashboard/officials/weegstation/[matchmakingId]/page.tsx",
                                                                        lineNumber: 2123,
                                                                        columnNumber: 31
                                                                    }, this),
                                                                    hasManualSanction(row.admin_sanctie_nodig) && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                        className: "rounded-sm border border-violet-300 bg-violet-100 px-2 py-1 text-[10px] font-black text-violet-800",
                                                                        children: "Handmatig"
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/app/dashboard/officials/weegstation/[matchmakingId]/page.tsx",
                                                                        lineNumber: 2129,
                                                                        columnNumber: 31
                                                                    }, this)
                                                                ]
                                                            }, void 0, true, {
                                                                fileName: "[project]/app/dashboard/officials/weegstation/[matchmakingId]/page.tsx",
                                                                lineNumber: 2108,
                                                                columnNumber: 27
                                                            }, this)
                                                        }, void 0, false, {
                                                            fileName: "[project]/app/dashboard/officials/weegstation/[matchmakingId]/page.tsx",
                                                            lineNumber: 2107,
                                                            columnNumber: 25
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                            className: "px-2 py-2 text-center",
                                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                className: "inline-flex min-w-[42px] items-center justify-center px-2 py-1 text-[11px] font-black",
                                                                style: {
                                                                    borderRadius: 4,
                                                                    background: hasPenalty ? "#dcfce7" : "#fee2e2",
                                                                    color: hasPenalty ? "#166534" : "#991b1b",
                                                                    border: hasPenalty ? "1px solid #86efac" : "1px solid #fca5a5",
                                                                    boxShadow: hasPenalty ? "0 0 0 1px rgba(22,163,74,0.12) inset" : "0 0 0 1px rgba(220,38,38,0.10) inset"
                                                                },
                                                                children: hasPenalty ? "Ja" : "Nee"
                                                            }, void 0, false, {
                                                                fileName: "[project]/app/dashboard/officials/weegstation/[matchmakingId]/page.tsx",
                                                                lineNumber: 2137,
                                                                columnNumber: 27
                                                            }, this)
                                                        }, void 0, false, {
                                                            fileName: "[project]/app/dashboard/officials/weegstation/[matchmakingId]/page.tsx",
                                                            lineNumber: 2136,
                                                            columnNumber: 25
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                            className: "px-2 py-2",
                                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                className: "flex flex-nowrap items-center gap-1 whitespace-nowrap",
                                                                children: [
                                                                    (dispState === "VERLEEND" || dispState === "AFGEWEZEN") && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                        className: "inline-flex h-7 min-w-[28px] items-center justify-center px-2 text-[12px] font-black",
                                                                        style: {
                                                                            borderRadius: 4,
                                                                            background: dispState === "VERLEEND" ? "#dcfce7" : "#fee2e2",
                                                                            color: dispState === "VERLEEND" ? "#166534" : "#991b1b",
                                                                            border: dispState === "VERLEEND" ? "1px solid #86efac" : "1px solid #fca5a5"
                                                                        },
                                                                        title: dispState === "VERLEEND" ? "Dispensatie goedgekeurd" : "Dispensatie afgewezen",
                                                                        children: dispState === "VERLEEND" ? "✅" : "⛔"
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/app/dashboard/officials/weegstation/[matchmakingId]/page.tsx",
                                                                        lineNumber: 2156,
                                                                        columnNumber: 31
                                                                    }, this),
                                                                    canHandleDisp && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Fragment"], {
                                                                        children: [
                                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(ActionButton, {
                                                                                onClick: ()=>decideDispensation(row.id, "approved"),
                                                                                disabled: savingId === row.id,
                                                                                tone: "green",
                                                                                className: "px-2 py-1 text-[11px] leading-none",
                                                                                children: "Ja"
                                                                            }, void 0, false, {
                                                                                fileName: "[project]/app/dashboard/officials/weegstation/[matchmakingId]/page.tsx",
                                                                                lineNumber: 2179,
                                                                                columnNumber: 33
                                                                            }, this),
                                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(ActionButton, {
                                                                                onClick: ()=>decideDispensation(row.id, "rejected"),
                                                                                disabled: savingId === row.id,
                                                                                tone: "red",
                                                                                className: "px-2 py-1 text-[11px] leading-none",
                                                                                children: "Nee"
                                                                            }, void 0, false, {
                                                                                fileName: "[project]/app/dashboard/officials/weegstation/[matchmakingId]/page.tsx",
                                                                                lineNumber: 2187,
                                                                                columnNumber: 33
                                                                            }, this)
                                                                        ]
                                                                    }, void 0, true),
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"], {
                                                                        href: `/dashboard/officials/controle/${matchmakingId}/${row.partij_nr}`,
                                                                        className: "inline-flex items-center justify-center whitespace-nowrap px-2 py-1 text-[11px] font-black leading-none text-white",
                                                                        style: {
                                                                            borderRadius: 4,
                                                                            border: "1px solid rgba(0,0,0,0.45)",
                                                                            background: "linear-gradient(180deg, #3d434d 0%, #22262d 100%)",
                                                                            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.10)",
                                                                            height: 28
                                                                        },
                                                                        children: "Detail"
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/app/dashboard/officials/weegstation/[matchmakingId]/page.tsx",
                                                                        lineNumber: 2198,
                                                                        columnNumber: 29
                                                                    }, this)
                                                                ]
                                                            }, void 0, true, {
                                                                fileName: "[project]/app/dashboard/officials/weegstation/[matchmakingId]/page.tsx",
                                                                lineNumber: 2154,
                                                                columnNumber: 27
                                                            }, this)
                                                        }, void 0, false, {
                                                            fileName: "[project]/app/dashboard/officials/weegstation/[matchmakingId]/page.tsx",
                                                            lineNumber: 2153,
                                                            columnNumber: 25
                                                        }, this)
                                                    ]
                                                }, row.id, true, {
                                                    fileName: "[project]/app/dashboard/officials/weegstation/[matchmakingId]/page.tsx",
                                                    lineNumber: 2089,
                                                    columnNumber: 23
                                                }, this);
                                            })
                                        }, void 0, false, {
                                            fileName: "[project]/app/dashboard/officials/weegstation/[matchmakingId]/page.tsx",
                                            lineNumber: 2066,
                                            columnNumber: 17
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/app/dashboard/officials/weegstation/[matchmakingId]/page.tsx",
                                    lineNumber: 2023,
                                    columnNumber: 15
                                }, this)
                            }, void 0, false, {
                                fileName: "[project]/app/dashboard/officials/weegstation/[matchmakingId]/page.tsx",
                                lineNumber: 2022,
                                columnNumber: 13
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/app/dashboard/officials/weegstation/[matchmakingId]/page.tsx",
                        lineNumber: 2017,
                        columnNumber: 11
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/app/dashboard/officials/weegstation/[matchmakingId]/page.tsx",
                lineNumber: 1370,
                columnNumber: 9
            }, this)
        }, void 0, false, {
            fileName: "[project]/app/dashboard/officials/weegstation/[matchmakingId]/page.tsx",
            lineNumber: 1369,
            columnNumber: 7
        }, this)
    }, void 0, false, {
        fileName: "[project]/app/dashboard/officials/weegstation/[matchmakingId]/page.tsx",
        lineNumber: 1368,
        columnNumber: 5
    }, this);
}
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__97800d9a._.js.map