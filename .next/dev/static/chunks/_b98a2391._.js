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
"[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/match/page.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>MatchmakerMatchPage
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/client/app-dir/link.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$image$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/image.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/navigation.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$arrow$2d$left$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__ArrowLeft$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/arrow-left.js [app-client] (ecmascript) <export default as ArrowLeft>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$refresh$2d$ccw$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__RefreshCcw$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/refresh-ccw.js [app-client] (ecmascript) <export default as RefreshCcw>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$save$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Save$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/save.js [app-client] (ecmascript) <export default as Save>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$upload$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Upload$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/upload.js [app-client] (ecmascript) <export default as Upload>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$search$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Search$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/search.js [app-client] (ecmascript) <export default as Search>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$user$2d$plus$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__UserPlus$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/user-plus.js [app-client] (ecmascript) <export default as UserPlus>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$radar$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Radar$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/radar.js [app-client] (ecmascript) <export default as Radar>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$users$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Users$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/users.js [app-client] (ecmascript) <export default as Users>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$x$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__X$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/x.js [app-client] (ecmascript) <export default as X>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$link$2d$2$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Link2$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/link-2.js [app-client] (ecmascript) <export default as Link2>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$swords$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Swords$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/swords.js [app-client] (ecmascript) <export default as Swords>");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabaseClient$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/supabaseClient.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$api$2f$authedFetch$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/api/authedFetch.ts [app-client] (ecmascript)");
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
const NVB_ORANGE = "#ff4d00";
function toName(f) {
    if (!f) return "-";
    const composed = `${f.voornaam ?? ""} ${f.achternaam ?? ""}`.trim();
    return composed || f.fp_naam || f.naam_input || "Onbekend";
}
function toNum(v) {
    if (v === null || v === undefined || v === "") return null;
    if (typeof v === "number" && Number.isFinite(v)) return v;
    const normalized = String(v).replace(",", ".").replace(/[^\d.-]/g, "");
    const n = Number(normalized);
    return Number.isFinite(n) ? n : null;
}
function formatWeight(v) {
    const n = toNum(v);
    return n == null ? "-" : `${n.toFixed(2)} kg`;
}
function formatDate(v) {
    if (!v) return "-";
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return String(v);
    return d.toLocaleDateString("nl-NL");
}
function calcAgeOnDate(birth, eventDate) {
    if (!birth || !eventDate) return null;
    const b = new Date(birth);
    const e = new Date(eventDate);
    if (Number.isNaN(b.getTime()) || Number.isNaN(e.getTime())) return null;
    let age = e.getFullYear() - b.getFullYear();
    const m = e.getMonth() - b.getMonth();
    if (m < 0 || m === 0 && e.getDate() < b.getDate()) age--;
    return age;
}
function isUuid(value) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value.trim());
}
function pickString(row, keys) {
    for (const key of keys){
        const v = row?.[key];
        if (v !== undefined && v !== null && String(v).trim() !== "") {
            return String(v);
        }
    }
    return null;
}
function pickNumber(row, keys) {
    for (const key of keys){
        const v = row?.[key];
        const n = Number(v);
        if (Number.isFinite(n)) return n;
    }
    return null;
}
function mapInschrijvingToFighter(row) {
    return {
        id: String(row.id),
        source: "inschrijving",
        matchmaking_id: row.matchmaking_id ?? null,
        upload_id: row.upload_id ?? null,
        row_nr: row.row_nr ?? null,
        inschrijving_id: row.id ? String(row.id) : null,
        discipline: pickString(row, [
            "discipline"
        ]),
        klasse: pickString(row, [
            "klasse",
            "klasse_mm"
        ]),
        geslacht: pickString(row, [
            "geslacht"
        ]),
        voornaam: pickString(row, [
            "voornaam"
        ]),
        achternaam: pickString(row, [
            "achternaam"
        ]),
        naam_input: pickString(row, [
            "naam_input",
            "naam"
        ]),
        email: pickString(row, [
            "email"
        ]),
        telefoon: pickString(row, [
            "telefoon"
        ]),
        gym: pickString(row, [
            "gym"
        ]),
        gym_input: pickString(row, [
            "gym_input"
        ]),
        va_nummer: pickString(row, [
            "va_nummer",
            "va"
        ]),
        geboortedatum: pickString(row, [
            "geboortedatum"
        ]),
        geboortedatum_input: pickString(row, [
            "geboortedatum_input"
        ]),
        gewicht: pickNumber(row, [
            "gewicht"
        ]) ?? pickString(row, [
            "gewicht"
        ]) ?? null,
        win: pickNumber(row, [
            "win"
        ]),
        loss: pickNumber(row, [
            "loss"
        ]),
        draw: pickNumber(row, [
            "draw"
        ]),
        demo: pickNumber(row, [
            "demo"
        ]),
        opmerkingen: pickString(row, [
            "opmerkingen"
        ]),
        raw: row,
        scrape_status: pickString(row, [
            "scrape_status"
        ]),
        scraped_at: pickString(row, [
            "scraped_at"
        ])
    };
}
function mapFighterContextToFighter(row) {
    return {
        id: String(row.id),
        source: "fighter_context",
        matchmaking_id: row.matchmaking_id ?? null,
        upload_id: null,
        row_nr: null,
        inschrijving_id: row.inschrijving_id ? String(row.inschrijving_id) : null,
        discipline: pickString(row, [
            "discipline"
        ]),
        klasse: pickString(row, [
            "klasse"
        ]),
        geslacht: pickString(row, [
            "geslacht"
        ]),
        voornaam: pickString(row, [
            "voornaam"
        ]),
        achternaam: pickString(row, [
            "achternaam"
        ]),
        naam_input: pickString(row, [
            "naam_input"
        ]),
        email: null,
        telefoon: null,
        gym: pickString(row, [
            "fp_gym"
        ]),
        gym_input: pickString(row, [
            "gym_input"
        ]),
        va_nummer: pickString(row, [
            "va_nummer"
        ]),
        geboortedatum: pickString(row, [
            "fp_geboortedatum"
        ]),
        geboortedatum_input: pickString(row, [
            "geboortedatum_input"
        ]),
        gewicht: pickNumber(row, [
            "gewicht"
        ]) ?? pickString(row, [
            "gewicht"
        ]) ?? null,
        win: pickNumber(row, [
            "record_w"
        ]),
        loss: pickNumber(row, [
            "record_l"
        ]),
        draw: pickNumber(row, [
            "record_d"
        ]),
        demo: null,
        fp_naam: pickString(row, [
            "fp_naam"
        ]),
        fp_geboortedatum: pickString(row, [
            "fp_geboortedatum"
        ]),
        fp_gym: pickString(row, [
            "fp_gym"
        ]),
        fp_klasse: pickString(row, [
            "fp_klasse"
        ]),
        uitslagen_count: pickNumber(row, [
            "uitslagen_count"
        ]),
        laatste_partij_datum: pickString(row, [
            "laatste_partij_datum"
        ]),
        nulmeting_opmerking: pickString(row, [
            "nulmeting_opmerking"
        ]),
        heeft_keurmerk: pickString(row, [
            "heeft_keurmerk"
        ]),
        naam_match: row?.naam_match ?? null,
        geboortedatum_match: row?.geboortedatum_match ?? null,
        gym_match: row?.gym_match ?? null,
        opmerkingen: pickString(row, [
            "opmerkingen"
        ]),
        raw: row,
        scrape_status: pickString(row, [
            "scrape_status"
        ]),
        scraped_at: pickString(row, [
            "scraped_at"
        ])
    };
}
function deriveMatchmakingFromRows(matchmakingId, rows) {
    const first = rows?.[0] ?? {};
    return {
        id: matchmakingId,
        naam: pickString(first, [
            "evenement_naam",
            "naam",
            "event_naam"
        ]),
        datum: pickString(first, [
            "evenement_datum",
            "datum",
            "event_datum"
        ]),
        locatie: pickString(first, [
            "locatie",
            "evenement_locatie"
        ]),
        promotor: pickString(first, [
            "promotor"
        ]),
        bondteam: pickString(first, [
            "bondteam"
        ]),
        status: pickString(first, [
            "status"
        ])
    };
}
function mapMatchRow(row) {
    return {
        id: String(row.id),
        partij_nr: row.partij_nr ?? null,
        rood_fighter_id: row.rood_fighter_id ?? null,
        blauw_fighter_id: row.blauw_fighter_id ?? null,
        rood_fighter_context_id: row.rood_fighter_context_id ?? null,
        blauw_fighter_context_id: row.blauw_fighter_context_id ?? null,
        rood_naam: row.rood_naam ?? null,
        blauw_naam: row.blauw_naam ?? null,
        advice: row.advice ?? null,
        warnings: Array.isArray(row.warnings) ? row.warnings : null
    };
}
function normalizeGender(value) {
    const v = String(value ?? "").trim().toLowerCase();
    if (!v) return "Onbekend";
    if (v === "vrouw" || v === "v" || v === "female" || v === "f" || v === "dame" || v === "meisje") {
        return "Vrouwelijk";
    }
    if (v === "man" || v === "m" || v === "male" || v === "heer" || v === "jongen") {
        return "Mannelijk";
    }
    return value?.trim() || "Onbekend";
}
function klasseLabelForTab(value) {
    const raw = String(value ?? "").trim();
    const v = raw.toLowerCase();
    if (!raw) return "";
    if (v.includes("jeugd")) return "Jeugd";
    if (v === "a" || v.startsWith("a ") || v.includes("a-klasse")) return "A";
    if (v === "b" || v.startsWith("b ") || v.includes("b-klasse")) return "B";
    if (v === "c" || v.startsWith("c ") || v.includes("c-klasse")) return "C";
    if (v === "n" || v.startsWith("n ") || v.includes("n-klasse")) return "N";
    return raw;
}
function klasseDisplayLabel(tab) {
    if (tab === "A") return "A-Klasse";
    if (tab === "B") return "B-Klasse";
    if (tab === "C") return "C-Klasse";
    if (tab === "N") return "N-Klasse";
    return tab;
}
function klasseRank(tab) {
    if (tab === "A") return 0;
    if (tab === "B") return 1;
    if (tab === "C") return 2;
    if (tab === "N") return 3;
    if (tab === "Jeugd") return 4;
    return 999;
}
function getRecordText(f) {
    if (!f) return "-";
    const win = toNum(f.win) ?? 0;
    const loss = toNum(f.loss) ?? 0;
    const draw = toNum(f.draw) ?? 0;
    const demo = toNum(f.demo) ?? 0;
    return `${win}-${loss}-${draw}${demo ? ` (${demo} demo)` : ""}`;
}
function getTotalFights(f) {
    if (!f) return 0;
    return (toNum(f.win) ?? 0) + (toNum(f.loss) ?? 0) + (toNum(f.draw) ?? 0) + (toNum(f.demo) ?? 0);
}
function isYouthKlasse(value) {
    return String(value ?? "").toLowerCase().includes("jeugd");
}
function getMatchLinkedId(match, side) {
    if (side === "red") {
        return String(match.rood_fighter_context_id ?? match.rood_fighter_id ?? "").trim();
    }
    return String(match.blauw_fighter_context_id ?? match.blauw_fighter_id ?? "").trim();
}
function HeaderButton({ onClick, children }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
        onClick: onClick,
        style: silverButton,
        children: children
    }, void 0, false, {
        fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/match/page.tsx",
        lineNumber: 409,
        columnNumber: 5
    }, this);
}
_c = HeaderButton;
function MatchmakerMatchPage() {
    _s();
    const params = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useParams"])();
    const searchParams = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useSearchParams"])();
    const router = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRouter"])();
    const matchmakingId = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useMemo"])({
        "MatchmakerMatchPage.useMemo[matchmakingId]": ()=>{
            const fromPath = Array.isArray(params?.matchmakingId) ? params.matchmakingId[0] : params?.matchmakingId;
            const fromQuery = searchParams.get("matchmaking_id") ?? "";
            return String(fromPath || fromQuery || "").trim();
        }
    }["MatchmakerMatchPage.useMemo[matchmakingId]"], [
        params,
        searchParams
    ]);
    const [matchmaking, setMatchmaking] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [fighters, setFighters] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])([]);
    const [matches, setMatches] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])([]);
    const [selectedIds, setSelectedIds] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])([]);
    const [selectedRed, setSelectedRed] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [selectedBlue, setSelectedBlue] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [busy, setBusy] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [scrapeBusy, setScrapeBusy] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [handmatigBusy, setHandmatigBusy] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [showCompareModal, setShowCompareModal] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [showManualModal, setShowManualModal] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [showUploadModal, setShowUploadModal] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [uploadFile, setUploadFile] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [uploadBusy, setUploadBusy] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [uploadResult, setUploadResult] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [activeDiscipline, setActiveDiscipline] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])("");
    const [activeKlasse, setActiveKlasse] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])("");
    const [filter, setFilter] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])({
        query: "",
        onlyUnmatched: true
    });
    const [manualForm, setManualForm] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])({
        voornaam: "",
        achternaam: "",
        discipline: "",
        klasse: "",
        geslacht: "",
        gym: "",
        va_nummer: "",
        geboortedatum: "",
        gewicht: "",
        win: "",
        loss: "",
        draw: "",
        demo: "",
        opmerkingen: ""
    });
    async function load() {
        if (!matchmakingId) return;
        if (!isUuid(matchmakingId)) {
            alert("Ongeldige matchmakingId");
            return;
        }
        const { data: { user }, error: userError } = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabaseClient$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["supabase"].auth.getUser();
        if (userError || !user) {
            alert("Niet ingelogd.");
            return;
        }
        let loadedMatchmaking = null;
        const matchmakingQuery = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabaseClient$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["supabase"].from("matchmaker_matchmakings").select("*").eq("id", matchmakingId).maybeSingle();
        if (!matchmakingQuery.error && matchmakingQuery.data) {
            const mm = matchmakingQuery.data;
            loadedMatchmaking = {
                id: String(mm.id),
                naam: pickString(mm, [
                    "naam",
                    "evenement_naam"
                ]),
                datum: pickString(mm, [
                    "datum",
                    "evenement_datum"
                ]),
                locatie: pickString(mm, [
                    "locatie"
                ]),
                promotor: pickString(mm, [
                    "promotor"
                ]),
                bondteam: pickString(mm, [
                    "bondteam"
                ]),
                status: pickString(mm, [
                    "status"
                ])
            };
        }
        const fighterContextQuery = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabaseClient$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["supabase"].from("matchmaker_fighter_context").select("*").eq("matchmaking_id", matchmakingId);
        let mappedFighters = [];
        if (!fighterContextQuery.error && (fighterContextQuery.data ?? []).length > 0) {
            const fighterContextRows = fighterContextQuery.data ?? [];
            mappedFighters = fighterContextRows.map(mapFighterContextToFighter);
            if (!loadedMatchmaking) {
                loadedMatchmaking = deriveMatchmakingFromRows(matchmakingId, fighterContextRows);
            }
        } else {
            const inschrijvingenQuery = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabaseClient$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["supabase"].from("matchmaker_inschrijvingen").select("*").eq("matchmaking_id", matchmakingId).order("row_nr", {
                ascending: true
            });
            if (inschrijvingenQuery.error) {
                alert(inschrijvingenQuery.error.message || "Laden van vechters mislukt");
                return;
            }
            const inschrijvingen = inschrijvingenQuery.data ?? [];
            mappedFighters = inschrijvingen.map(mapInschrijvingToFighter);
            if (!loadedMatchmaking) {
                loadedMatchmaking = deriveMatchmakingFromRows(matchmakingId, inschrijvingen);
            }
        }
        setMatchmaking(loadedMatchmaking ?? {
            id: matchmakingId,
            naam: null,
            datum: null,
            locatie: null,
            promotor: null,
            bondteam: null,
            status: null
        });
        setFighters(mappedFighters);
        const matchesQuery = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabaseClient$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["supabase"].from("matchmaker_matches").select("*").eq("matchmaking_id", matchmakingId).order("partij_nr", {
            ascending: true
        });
        if (matchesQuery.error) {
            setMatches([]);
        } else {
            setMatches((matchesQuery.data ?? []).map(mapMatchRow));
        }
    }
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "MatchmakerMatchPage.useEffect": ()=>{
            if (!matchmakingId) return;
            void load();
        }
    }["MatchmakerMatchPage.useEffect"], [
        matchmakingId
    ]);
    const matchedIds = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useMemo"])({
        "MatchmakerMatchPage.useMemo[matchedIds]": ()=>{
            const s = new Set();
            for (const m of matches){
                const redId = getMatchLinkedId(m, "red");
                const blueId = getMatchLinkedId(m, "blue");
                if (redId) s.add(redId);
                if (blueId) s.add(blueId);
            }
            return s;
        }
    }["MatchmakerMatchPage.useMemo[matchedIds]"], [
        matches
    ]);
    const baseFiltered = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useMemo"])({
        "MatchmakerMatchPage.useMemo[baseFiltered]": ()=>{
            const q = filter.query.trim().toLowerCase();
            return fighters.filter({
                "MatchmakerMatchPage.useMemo[baseFiltered]": (f)=>!filter.onlyUnmatched || !matchedIds.has(String(f.id))
            }["MatchmakerMatchPage.useMemo[baseFiltered]"]).filter({
                "MatchmakerMatchPage.useMemo[baseFiltered]": (f)=>{
                    if (!q) return true;
                    return [
                        toName(f),
                        f.gym,
                        f.gym_input,
                        f.fp_gym,
                        f.fp_naam,
                        f.va_nummer,
                        f.discipline,
                        f.klasse,
                        normalizeGender(f.geslacht)
                    ].join(" ").toLowerCase().includes(q);
                }
            }["MatchmakerMatchPage.useMemo[baseFiltered]"]);
        }
    }["MatchmakerMatchPage.useMemo[baseFiltered]"], [
        fighters,
        filter,
        matchedIds
    ]);
    const disciplineTabs = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useMemo"])({
        "MatchmakerMatchPage.useMemo[disciplineTabs]": ()=>{
            return Array.from(new Set(baseFiltered.map({
                "MatchmakerMatchPage.useMemo[disciplineTabs]": (f)=>String(f.discipline ?? "").trim()
            }["MatchmakerMatchPage.useMemo[disciplineTabs]"]).filter(Boolean))).sort({
                "MatchmakerMatchPage.useMemo[disciplineTabs]": (a, b)=>a.localeCompare(b, "nl")
            }["MatchmakerMatchPage.useMemo[disciplineTabs]"]);
        }
    }["MatchmakerMatchPage.useMemo[disciplineTabs]"], [
        baseFiltered
    ]);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "MatchmakerMatchPage.useEffect": ()=>{
            if (!disciplineTabs.length) {
                setActiveDiscipline("");
                return;
            }
            if (!activeDiscipline || !disciplineTabs.includes(activeDiscipline)) {
                setActiveDiscipline(disciplineTabs[0]);
            }
        }
    }["MatchmakerMatchPage.useEffect"], [
        disciplineTabs,
        activeDiscipline
    ]);
    const klasseTabs = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useMemo"])({
        "MatchmakerMatchPage.useMemo[klasseTabs]": ()=>{
            if (!activeDiscipline) return [];
            const values = Array.from(new Set(baseFiltered.filter({
                "MatchmakerMatchPage.useMemo[klasseTabs].values": (f)=>String(f.discipline ?? "").trim() === activeDiscipline
            }["MatchmakerMatchPage.useMemo[klasseTabs].values"]).map({
                "MatchmakerMatchPage.useMemo[klasseTabs].values": (f)=>klasseLabelForTab(f.klasse)
            }["MatchmakerMatchPage.useMemo[klasseTabs].values"]).filter(Boolean)));
            return values.sort({
                "MatchmakerMatchPage.useMemo[klasseTabs]": (a, b)=>klasseRank(a) - klasseRank(b) || a.localeCompare(b, "nl")
            }["MatchmakerMatchPage.useMemo[klasseTabs]"]);
        }
    }["MatchmakerMatchPage.useMemo[klasseTabs]"], [
        baseFiltered,
        activeDiscipline
    ]);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "MatchmakerMatchPage.useEffect": ()=>{
            if (!klasseTabs.length) {
                setActiveKlasse("");
                return;
            }
            if (!activeKlasse || !klasseTabs.includes(activeKlasse)) {
                setActiveKlasse(klasseTabs[0]);
            }
        }
    }["MatchmakerMatchPage.useEffect"], [
        klasseTabs,
        activeKlasse
    ]);
    const visibleFighters = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useMemo"])({
        "MatchmakerMatchPage.useMemo[visibleFighters]": ()=>{
            const rows = baseFiltered.filter({
                "MatchmakerMatchPage.useMemo[visibleFighters].rows": (f)=>{
                    const disciplineOk = activeDiscipline ? String(f.discipline ?? "").trim() === activeDiscipline : true;
                    const klasseOk = activeKlasse ? klasseLabelForTab(f.klasse) === activeKlasse : true;
                    return disciplineOk && klasseOk;
                }
            }["MatchmakerMatchPage.useMemo[visibleFighters].rows"]);
            return [
                ...rows
            ].sort({
                "MatchmakerMatchPage.useMemo[visibleFighters]": (a, b)=>{
                    const genderA = normalizeGender(a.geslacht);
                    const genderB = normalizeGender(b.geslacht);
                    if (genderA !== genderB) {
                        return genderA.localeCompare(genderB, "nl");
                    }
                    const ageA = calcAgeOnDate(a.geboortedatum ?? a.geboortedatum_input ?? a.fp_geboortedatum ?? null, matchmaking?.datum ?? null);
                    const ageB = calcAgeOnDate(b.geboortedatum ?? b.geboortedatum_input ?? b.fp_geboortedatum ?? null, matchmaking?.datum ?? null);
                    if ((ageA ?? 999) !== (ageB ?? 999)) {
                        return (ageA ?? 999) - (ageB ?? 999);
                    }
                    const weightA = toNum(a.gewicht);
                    const weightB = toNum(b.gewicht);
                    if ((weightA ?? 9999) !== (weightB ?? 9999)) {
                        return (weightA ?? 9999) - (weightB ?? 9999);
                    }
                    return toName(a).localeCompare(toName(b), "nl");
                }
            }["MatchmakerMatchPage.useMemo[visibleFighters]"]);
        }
    }["MatchmakerMatchPage.useMemo[visibleFighters]"], [
        baseFiltered,
        activeDiscipline,
        activeKlasse,
        matchmaking?.datum
    ]);
    const groupedVisibleFighters = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useMemo"])({
        "MatchmakerMatchPage.useMemo[groupedVisibleFighters]": ()=>{
            const groups = {};
            for (const fighter of visibleFighters){
                const key = normalizeGender(fighter.geslacht);
                if (!groups[key]) groups[key] = [];
                groups[key].push(fighter);
            }
            return groups;
        }
    }["MatchmakerMatchPage.useMemo[groupedVisibleFighters]"], [
        visibleFighters
    ]);
    const compareSummary = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useMemo"])({
        "MatchmakerMatchPage.useMemo[compareSummary]": ()=>{
            if (!selectedRed || !selectedBlue) return null;
            const redAge = calcAgeOnDate(selectedRed.geboortedatum ?? selectedRed.geboortedatum_input ?? selectedRed.fp_geboortedatum ?? null, matchmaking?.datum ?? null);
            const blueAge = calcAgeOnDate(selectedBlue.geboortedatum ?? selectedBlue.geboortedatum_input ?? selectedBlue.fp_geboortedatum ?? null, matchmaking?.datum ?? null);
            const redWeight = toNum(selectedRed.gewicht);
            const blueWeight = toNum(selectedBlue.gewicht);
            const youth = isYouthKlasse(selectedRed.klasse) || isYouthKlasse(selectedBlue.klasse);
            return {
                rood: toName(selectedRed),
                blauw: toName(selectedBlue),
                discipline: selectedRed.discipline || selectedBlue.discipline || "-",
                klasse: selectedRed.klasse || selectedBlue.klasse || "-",
                geslacht: selectedRed.geslacht || selectedBlue.geslacht || "-",
                gewichtDiff: redWeight != null && blueWeight != null ? Math.abs(redWeight - blueWeight).toFixed(2) : "-",
                leeftijdDiff: redAge != null && blueAge != null ? Math.abs(redAge - blueAge) : "-",
                roodLeeftijd: redAge ?? "-",
                blauwLeeftijd: blueAge ?? "-",
                roodGym: selectedRed.gym_input || selectedRed.fp_gym || selectedRed.gym || "-",
                blauwGym: selectedBlue.gym_input || selectedBlue.fp_gym || selectedBlue.gym || "-",
                roodVA: selectedRed.va_nummer || "-",
                blauwVA: selectedBlue.va_nummer || "-",
                roodRecord: getRecordText(selectedRed),
                blauwRecord: getRecordText(selectedBlue),
                roodPartijen: getTotalFights(selectedRed),
                blauwPartijen: getTotalFights(selectedBlue),
                isJeugd: youth
            };
        }
    }["MatchmakerMatchPage.useMemo[compareSummary]"], [
        selectedRed,
        selectedBlue,
        matchmaking?.datum
    ]);
    function toggleSelected(id) {
        setSelectedIds((prev)=>prev.includes(id) ? prev.filter((x)=>x !== id) : [
                ...prev,
                id
            ]);
    }
    function clearSelection() {
        setSelectedIds([]);
    }
    function resetMatchChoice() {
        setSelectedRed(null);
        setSelectedBlue(null);
        setShowCompareModal(false);
    }
    function handleMatchClick(fighter) {
        if (!selectedRed) {
            setSelectedRed(fighter);
            setSelectedBlue(null);
            setShowCompareModal(false);
            return;
        }
        if (String(selectedRed.id) === String(fighter.id)) {
            setSelectedRed(null);
            setSelectedBlue(null);
            setShowCompareModal(false);
            return;
        }
        setSelectedBlue(fighter);
        setShowCompareModal(true);
    }
    async function scrapeAll() {
        try {
            if (!matchmakingId) return;
            setScrapeBusy(true);
            const res = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$api$2f$authedFetch$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["authedFetch"])(`/api/matchmaker/start`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    matchmaking_id: matchmakingId,
                    mode: "auto"
                })
            });
            const json = await res.json().catch(()=>null);
            if (!res.ok) {
                alert(json?.error ?? "Scrapen mislukt");
                return;
            }
            await load();
        } finally{
            setScrapeBusy(false);
        }
    }
    async function scrapeSelected() {
        try {
            if (!matchmakingId) return;
            if (!selectedIds.length) {
                alert("Selecteer eerst vechters.");
                return;
            }
            setScrapeBusy(true);
            const selectedFighters = fighters.filter((f)=>selectedIds.includes(String(f.id)));
            const fighterContextIds = selectedFighters.filter((f)=>f.source === "fighter_context").map((f)=>f.id);
            const inschrijvingIds = selectedFighters.filter((f)=>f.source === "inschrijving").map((f)=>f.id);
            const res = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$api$2f$authedFetch$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["authedFetch"])(`/api/matchmaker/scrape-fighters`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    matchmaking_id: matchmakingId,
                    mode: "selected",
                    fighter_ids: selectedIds,
                    fighter_context_ids: fighterContextIds,
                    inschrijving_ids: inschrijvingIds
                })
            });
            const json = await res.json().catch(()=>null);
            if (!res.ok) {
                alert(json?.error ?? "Scrapen mislukt");
                return;
            }
            await load();
        } finally{
            setScrapeBusy(false);
        }
    }
    async function saveMatch() {
        if (!matchmakingId || !selectedRed || !selectedBlue) return;
        if (String(selectedRed.id) === String(selectedBlue.id)) {
            alert("Rood en blauw mogen niet dezelfde vechter zijn.");
            return;
        }
        setBusy(true);
        const res = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$api$2f$authedFetch$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["authedFetch"])(`/api/matchmaker/create-match`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                matchmaking_id: matchmakingId,
                rood_fighter_id: selectedRed.id,
                blauw_fighter_id: selectedBlue.id,
                rood_fighter_context_id: selectedRed.source === "fighter_context" ? selectedRed.id : null,
                blauw_fighter_context_id: selectedBlue.source === "fighter_context" ? selectedBlue.id : null,
                rood_inschrijving_id: selectedRed.source === "inschrijving" ? selectedRed.inschrijving_id ?? selectedRed.id : selectedRed.inschrijving_id ?? null,
                blauw_inschrijving_id: selectedBlue.source === "inschrijving" ? selectedBlue.inschrijving_id ?? selectedBlue.id : selectedBlue.inschrijving_id ?? null
            })
        });
        const json = await res.json().catch(()=>null);
        setBusy(false);
        if (!res.ok) {
            alert(json?.error ?? "Opslaan mislukt");
            return;
        }
        setSelectedRed(null);
        setSelectedBlue(null);
        setShowCompareModal(false);
        await load();
    }
    async function addManualFighter() {
        try {
            if (!matchmakingId) return;
            if (!manualForm.voornaam.trim() && !manualForm.achternaam.trim()) {
                alert("Vul minimaal een naam in.");
                return;
            }
            setHandmatigBusy(true);
            const res = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$api$2f$authedFetch$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["authedFetch"])(`/api/matchmaker/add-fighter`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    matchmaking_id: matchmakingId,
                    ...manualForm
                })
            });
            const json = await res.json().catch(()=>null);
            if (!res.ok) {
                alert(json?.error ?? "Handmatig toevoegen mislukt");
                return;
            }
            setManualForm({
                voornaam: "",
                achternaam: "",
                discipline: "",
                klasse: "",
                geslacht: "",
                gym: "",
                va_nummer: "",
                geboortedatum: "",
                gewicht: "",
                win: "",
                loss: "",
                draw: "",
                demo: "",
                opmerkingen: ""
            });
            setShowManualModal(false);
            await load();
        } finally{
            setHandmatigBusy(false);
        }
    }
    async function handleUpload() {
        if (!uploadFile || !matchmakingId) return;
        setUploadBusy(true);
        setUploadResult(null);
        try {
            const { data: { user } } = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabaseClient$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["supabase"].auth.getUser();
            if (!user) {
                alert("Niet ingelogd.");
                return;
            }
            // Collect existing VA nummers for dedup check
            const existingVaNummers = new Set(fighters.map((f)=>String(f.va_nummer ?? "").trim().toLowerCase()).filter(Boolean));
            const formData = new FormData();
            formData.append("file", uploadFile);
            formData.append("matchmaking_id", matchmakingId);
            formData.append("uploaded_by", user.id);
            const token = (await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabaseClient$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["supabase"].auth.getSession()).data.session?.access_token ?? "";
            const res = await fetch("/api/matchmaker/submit-inschrijvingen", {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`
                },
                body: formData
            });
            const json = await res.json().catch(()=>({}));
            if (!res.ok) {
                alert(json?.error ?? "Upload mislukt");
                return;
            }
            // Reload fighters and count duplicates
            await load();
            // Re-collect after load to count dupes
            const newFightersQuery = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabaseClient$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["supabase"].from("matchmaker_inschrijvingen").select("va_nummer").eq("matchmaking_id", matchmakingId).eq("upload_id", json.upload_id);
            const newVaNummers = (newFightersQuery.data ?? []).map((r)=>String(r.va_nummer ?? "").trim().toLowerCase());
            const duplicates = newVaNummers.filter((va)=>va && existingVaNummers.has(va)).length;
            const inserted = Math.max(0, (json.inserted ?? 0) - duplicates);
            setUploadResult({
                inserted,
                duplicates,
                message: `${inserted} nieuwe vechter${inserted !== 1 ? "s" : ""} toegevoegd${duplicates > 0 ? `, ${duplicates} dubbel${duplicates !== 1 ? "en" : ""} overgeslagen` : ""}.`
            });
            setUploadFile(null);
        } finally{
            setUploadBusy(false);
        }
    }
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("main", {
        style: pageBackground,
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                style: topShell,
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        style: topLogoWrap,
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$image$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                            src: "/branding/fightsupport/excel-logo.png",
                            alt: "FightSupport",
                            width: 560,
                            height: 140,
                            priority: true,
                            style: {
                                height: "auto",
                                width: "100%",
                                maxWidth: 560
                            }
                        }, void 0, false, {
                            fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/match/page.tsx",
                            lineNumber: 1041,
                            columnNumber: 11
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/match/page.tsx",
                        lineNumber: 1040,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        style: portalBand,
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                style: portalTitle,
                                children: "MATCH PORTAAL"
                            }, void 0, false, {
                                fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/match/page.tsx",
                                lineNumber: 1052,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                style: portalSub,
                                children: "INSCHRIJVINGEN EN MATCHEN"
                            }, void 0, false, {
                                fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/match/page.tsx",
                                lineNumber: 1053,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/match/page.tsx",
                        lineNumber: 1051,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        style: headerActionRow,
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(HeaderButton, {
                                onClick: ()=>router.push("/dashboard/matchmaker/matchmaking"),
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$arrow$2d$left$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__ArrowLeft$3e$__["ArrowLeft"], {
                                        size: 16,
                                        style: {
                                            marginRight: 8
                                        }
                                    }, void 0, false, {
                                        fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/match/page.tsx",
                                        lineNumber: 1060,
                                        columnNumber: 13
                                    }, this),
                                    "Overzicht"
                                ]
                            }, void 0, true, {
                                fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/match/page.tsx",
                                lineNumber: 1057,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(HeaderButton, {
                                onClick: ()=>void load(),
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$refresh$2d$ccw$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__RefreshCcw$3e$__["RefreshCcw"], {
                                        size: 16,
                                        style: {
                                            marginRight: 8
                                        }
                                    }, void 0, false, {
                                        fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/match/page.tsx",
                                        lineNumber: 1065,
                                        columnNumber: 13
                                    }, this),
                                    "Ververs"
                                ]
                            }, void 0, true, {
                                fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/match/page.tsx",
                                lineNumber: 1064,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/match/page.tsx",
                        lineNumber: 1056,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/match/page.tsx",
                lineNumber: 1039,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                style: contentWrap,
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        style: titleCard,
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                style: titleMain,
                                children: "Matchmaking bouwen"
                            }, void 0, false, {
                                fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/match/page.tsx",
                                lineNumber: 1073,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                style: titleSub,
                                children: "Kies eerst de rode hoek en klik daarna bij de volgende vechter op match"
                            }, void 0, false, {
                                fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/match/page.tsx",
                                lineNumber: 1074,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                style: metaRow,
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("strong", {
                                                children: "Evenement:"
                                            }, void 0, false, {
                                                fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/match/page.tsx",
                                                lineNumber: 1079,
                                                columnNumber: 15
                                            }, this),
                                            " ",
                                            matchmaking?.naam ?? "-"
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/match/page.tsx",
                                        lineNumber: 1078,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("strong", {
                                                children: "Datum:"
                                            }, void 0, false, {
                                                fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/match/page.tsx",
                                                lineNumber: 1082,
                                                columnNumber: 15
                                            }, this),
                                            " ",
                                            formatDate(matchmaking?.datum)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/match/page.tsx",
                                        lineNumber: 1081,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("strong", {
                                                children: "Locatie:"
                                            }, void 0, false, {
                                                fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/match/page.tsx",
                                                lineNumber: 1085,
                                                columnNumber: 15
                                            }, this),
                                            " ",
                                            matchmaking?.locatie ?? "-"
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/match/page.tsx",
                                        lineNumber: 1084,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("strong", {
                                                children: "Bondteam:"
                                            }, void 0, false, {
                                                fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/match/page.tsx",
                                                lineNumber: 1088,
                                                columnNumber: 15
                                            }, this),
                                            " ",
                                            matchmaking?.bondteam ?? "-"
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/match/page.tsx",
                                        lineNumber: 1087,
                                        columnNumber: 13
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/match/page.tsx",
                                lineNumber: 1077,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/match/page.tsx",
                        lineNumber: 1072,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        style: actionGrid,
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(ActionCard, {
                                title: "Upload",
                                text: "Voeg extra vechters toe via Excel (meerdere uploads mogelijk)",
                                icon: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$upload$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Upload$3e$__["Upload"], {
                                    size: 34
                                }, void 0, false, {
                                    fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/match/page.tsx",
                                    lineNumber: 1097,
                                    columnNumber: 19
                                }, void 0),
                                onClick: ()=>{
                                    setUploadResult(null);
                                    setUploadFile(null);
                                    setShowUploadModal(true);
                                }
                            }, void 0, false, {
                                fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/match/page.tsx",
                                lineNumber: 1094,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(ActionCard, {
                                title: "Handmatig toevoegen",
                                text: "Voeg een losse vechter toe",
                                icon: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$user$2d$plus$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__UserPlus$3e$__["UserPlus"], {
                                    size: 34
                                }, void 0, false, {
                                    fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/match/page.tsx",
                                    lineNumber: 1108,
                                    columnNumber: 19
                                }, void 0),
                                onClick: ()=>setShowManualModal(true)
                            }, void 0, false, {
                                fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/match/page.tsx",
                                lineNumber: 1105,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(ActionCard, {
                                title: "Autocheck vechters",
                                text: "Stuur de volledige lijst naar Fightpaspoort",
                                icon: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$radar$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Radar$3e$__["Radar"], {
                                    size: 34
                                }, void 0, false, {
                                    fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/match/page.tsx",
                                    lineNumber: 1115,
                                    columnNumber: 19
                                }, void 0),
                                onClick: ()=>void scrapeAll(),
                                disabled: scrapeBusy || !matchmakingId
                            }, void 0, false, {
                                fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/match/page.tsx",
                                lineNumber: 1112,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(ActionCard, {
                                title: "Autocheck selectie",
                                text: `Autocheck alleen geselecteerde vechters (${selectedIds.length})`,
                                icon: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$users$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Users$3e$__["Users"], {
                                    size: 34
                                }, void 0, false, {
                                    fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/match/page.tsx",
                                    lineNumber: 1123,
                                    columnNumber: 19
                                }, void 0),
                                onClick: ()=>void scrapeSelected(),
                                disabled: scrapeBusy || !selectedIds.length || !matchmakingId
                            }, void 0, false, {
                                fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/match/page.tsx",
                                lineNumber: 1120,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/match/page.tsx",
                        lineNumber: 1093,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        style: filterCard,
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                style: filterTopRow,
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                style: sectionTitle,
                                                children: "Tabs en filters"
                                            }, void 0, false, {
                                                fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/match/page.tsx",
                                                lineNumber: 1132,
                                                columnNumber: 15
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                style: sectionSub,
                                                children: "Discipline en klasse staan nu in vaste tabbalken"
                                            }, void 0, false, {
                                                fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/match/page.tsx",
                                                lineNumber: 1133,
                                                columnNumber: 15
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/match/page.tsx",
                                        lineNumber: 1131,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        style: selectedCount,
                                        children: [
                                            selectedIds.length,
                                            " geselecteerd",
                                            selectedRed ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                style: {
                                                    marginLeft: 14,
                                                    color: "#ffd9c8"
                                                },
                                                children: [
                                                    "· rood: ",
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("strong", {
                                                        children: toName(selectedRed)
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/match/page.tsx",
                                                        lineNumber: 1141,
                                                        columnNumber: 27
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/match/page.tsx",
                                                lineNumber: 1140,
                                                columnNumber: 17
                                            }, this) : null
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/match/page.tsx",
                                        lineNumber: 1137,
                                        columnNumber: 13
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/match/page.tsx",
                                lineNumber: 1130,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                style: filterGrid,
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        style: fieldWrapWide,
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                style: labelStyle,
                                                children: "Zoeken"
                                            }, void 0, false, {
                                                fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/match/page.tsx",
                                                lineNumber: 1149,
                                                columnNumber: 15
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                style: searchInputWrap,
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$search$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Search$3e$__["Search"], {
                                                        size: 16,
                                                        style: {
                                                            color: "#6b7280"
                                                        }
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/match/page.tsx",
                                                        lineNumber: 1151,
                                                        columnNumber: 17
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                        style: textInputBare,
                                                        placeholder: "Zoek naam, gym, VA, discipline of klasse",
                                                        value: filter.query,
                                                        onChange: (e)=>setFilter((s)=>({
                                                                    ...s,
                                                                    query: e.target.value
                                                                }))
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/match/page.tsx",
                                                        lineNumber: 1152,
                                                        columnNumber: 17
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/match/page.tsx",
                                                lineNumber: 1150,
                                                columnNumber: 15
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/match/page.tsx",
                                        lineNumber: 1148,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                        style: checkboxWrap,
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                type: "checkbox",
                                                checked: filter.onlyUnmatched,
                                                onChange: (e)=>setFilter((s)=>({
                                                            ...s,
                                                            onlyUnmatched: e.target.checked
                                                        }))
                                            }, void 0, false, {
                                                fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/match/page.tsx",
                                                lineNumber: 1164,
                                                columnNumber: 15
                                            }, this),
                                            "Alleen ongekoppeld"
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/match/page.tsx",
                                        lineNumber: 1163,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        style: filterActionArea,
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                style: tinyButton,
                                                onClick: clearSelection,
                                                children: "Selectie wissen"
                                            }, void 0, false, {
                                                fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/match/page.tsx",
                                                lineNumber: 1178,
                                                columnNumber: 15
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                style: tinyButton,
                                                onClick: resetMatchChoice,
                                                children: "Rood wissen"
                                            }, void 0, false, {
                                                fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/match/page.tsx",
                                                lineNumber: 1181,
                                                columnNumber: 15
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/match/page.tsx",
                                        lineNumber: 1177,
                                        columnNumber: 13
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/match/page.tsx",
                                lineNumber: 1147,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                style: {
                                    marginTop: 18
                                },
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        style: tabLabel,
                                        children: "Discipline"
                                    }, void 0, false, {
                                        fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/match/page.tsx",
                                        lineNumber: 1188,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        style: tabRail,
                                        children: disciplineTabs.length === 0 ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            style: sectionSub,
                                            children: "Geen disciplines gevonden."
                                        }, void 0, false, {
                                            fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/match/page.tsx",
                                            lineNumber: 1191,
                                            columnNumber: 17
                                        }, this) : disciplineTabs.map((tab)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                style: {
                                                    ...tabBtn,
                                                    ...activeDiscipline === tab ? activeTabBtn : {}
                                                },
                                                onClick: ()=>setActiveDiscipline(tab),
                                                children: tab
                                            }, tab, false, {
                                                fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/match/page.tsx",
                                                lineNumber: 1194,
                                                columnNumber: 19
                                            }, this))
                                    }, void 0, false, {
                                        fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/match/page.tsx",
                                        lineNumber: 1189,
                                        columnNumber: 13
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/match/page.tsx",
                                lineNumber: 1187,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                style: {
                                    marginTop: 18
                                },
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        style: tabLabel,
                                        children: "Klasse"
                                    }, void 0, false, {
                                        fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/match/page.tsx",
                                        lineNumber: 1210,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        style: tabRail,
                                        children: klasseTabs.length === 0 ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            style: sectionSub,
                                            children: "Geen klasses gevonden."
                                        }, void 0, false, {
                                            fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/match/page.tsx",
                                            lineNumber: 1213,
                                            columnNumber: 17
                                        }, this) : klasseTabs.map((tab)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                style: {
                                                    ...subTabBtn,
                                                    ...activeKlasse === tab ? activeSubTabBtn : {}
                                                },
                                                onClick: ()=>setActiveKlasse(tab),
                                                children: klasseDisplayLabel(tab)
                                            }, tab, false, {
                                                fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/match/page.tsx",
                                                lineNumber: 1216,
                                                columnNumber: 19
                                            }, this))
                                    }, void 0, false, {
                                        fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/match/page.tsx",
                                        lineNumber: 1211,
                                        columnNumber: 13
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/match/page.tsx",
                                lineNumber: 1209,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/match/page.tsx",
                        lineNumber: 1129,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        style: fighterTableCard,
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                style: tableTitleRow,
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            style: sectionTitle,
                                            children: "Vechterslijst"
                                        }, void 0, false, {
                                            fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/match/page.tsx",
                                            lineNumber: 1235,
                                            columnNumber: 15
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            style: sectionSub,
                                            children: [
                                                "Tab: ",
                                                activeDiscipline || "-",
                                                " / ",
                                                klasseDisplayLabel(activeKlasse || "-")
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/match/page.tsx",
                                            lineNumber: 1236,
                                            columnNumber: 15
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/match/page.tsx",
                                    lineNumber: 1234,
                                    columnNumber: 13
                                }, this)
                            }, void 0, false, {
                                fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/match/page.tsx",
                                lineNumber: 1233,
                                columnNumber: 11
                            }, this),
                            Object.keys(groupedVisibleFighters).length === 0 ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                style: emptyStateCard,
                                children: "Geen vechters gevonden in deze discipline/klasse."
                            }, void 0, false, {
                                fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/match/page.tsx",
                                lineNumber: 1243,
                                columnNumber: 13
                            }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                style: {
                                    display: "grid",
                                    gap: 18
                                },
                                children: [
                                    "Vrouwelijk",
                                    "Mannelijk",
                                    "Onbekend"
                                ].filter((gender)=>(groupedVisibleFighters[gender] ?? []).length > 0).map((gender)=>{
                                    const rows = groupedVisibleFighters[gender] ?? [];
                                    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        style: genderBlock,
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                style: genderDivider,
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        style: genderDividerLine
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/match/page.tsx",
                                                        lineNumber: 1256,
                                                        columnNumber: 25
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                        style: genderDividerLabel,
                                                        children: gender
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/match/page.tsx",
                                                        lineNumber: 1257,
                                                        columnNumber: 25
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        style: genderDividerLine
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/match/page.tsx",
                                                        lineNumber: 1258,
                                                        columnNumber: 25
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/match/page.tsx",
                                                lineNumber: 1255,
                                                columnNumber: 23
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                style: tableWrap,
                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("table", {
                                                    style: tableStyle,
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("thead", {
                                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("tr", {
                                                                children: [
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                                        style: thStyle,
                                                                        children: "Sel"
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/match/page.tsx",
                                                                        lineNumber: 1265,
                                                                        columnNumber: 31
                                                                    }, this),
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                                        style: thStyle,
                                                                        children: "Naam"
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/match/page.tsx",
                                                                        lineNumber: 1266,
                                                                        columnNumber: 31
                                                                    }, this),
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                                        style: thStyle,
                                                                        children: "Leeftijd"
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/match/page.tsx",
                                                                        lineNumber: 1267,
                                                                        columnNumber: 31
                                                                    }, this),
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                                        style: thStyle,
                                                                        children: "Gewicht"
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/match/page.tsx",
                                                                        lineNumber: 1268,
                                                                        columnNumber: 31
                                                                    }, this),
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                                        style: thStyle,
                                                                        children: "Record"
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/match/page.tsx",
                                                                        lineNumber: 1269,
                                                                        columnNumber: 31
                                                                    }, this),
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                                        style: thStyle,
                                                                        children: "Partijen"
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/match/page.tsx",
                                                                        lineNumber: 1270,
                                                                        columnNumber: 31
                                                                    }, this),
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                                        style: thStyle,
                                                                        children: "Gym"
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/match/page.tsx",
                                                                        lineNumber: 1271,
                                                                        columnNumber: 31
                                                                    }, this),
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                                        style: thStyle,
                                                                        children: "VA"
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/match/page.tsx",
                                                                        lineNumber: 1272,
                                                                        columnNumber: 31
                                                                    }, this),
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                                        style: thStyle,
                                                                        children: "Scrape"
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/match/page.tsx",
                                                                        lineNumber: 1273,
                                                                        columnNumber: 31
                                                                    }, this),
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                                        style: thStyle,
                                                                        children: "Detail"
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/match/page.tsx",
                                                                        lineNumber: 1274,
                                                                        columnNumber: 31
                                                                    }, this),
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                                        style: thStyle,
                                                                        children: "Actie"
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/match/page.tsx",
                                                                        lineNumber: 1275,
                                                                        columnNumber: 31
                                                                    }, this)
                                                                ]
                                                            }, void 0, true, {
                                                                fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/match/page.tsx",
                                                                lineNumber: 1264,
                                                                columnNumber: 29
                                                            }, this)
                                                        }, void 0, false, {
                                                            fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/match/page.tsx",
                                                            lineNumber: 1263,
                                                            columnNumber: 27
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("tbody", {
                                                            children: rows.map((f, i)=>{
                                                                const selected = selectedIds.includes(String(f.id));
                                                                const age = calcAgeOnDate(f.geboortedatum ?? f.geboortedatum_input ?? f.fp_geboortedatum ?? null, matchmaking?.datum ?? null);
                                                                const isRed = selectedRed?.id === f.id;
                                                                return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("tr", {
                                                                    style: {
                                                                        background: isRed ? "linear-gradient(180deg, rgba(255,77,0,0.22) 0%, rgba(255,77,0,0.08) 100%)" : i % 2 === 0 ? "#fff" : "#0d0d0d",
                                                                        color: isRed ? "#fff" : i % 2 === 0 ? "#111" : "#fff",
                                                                        outline: isRed ? "2px solid rgba(255,77,0,0.75)" : "none"
                                                                    },
                                                                    children: [
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                                            style: tdStyle,
                                                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                                                type: "checkbox",
                                                                                checked: selected,
                                                                                onChange: ()=>toggleSelected(String(f.id))
                                                                            }, void 0, false, {
                                                                                fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/match/page.tsx",
                                                                                lineNumber: 1306,
                                                                                columnNumber: 37
                                                                            }, this)
                                                                        }, void 0, false, {
                                                                            fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/match/page.tsx",
                                                                            lineNumber: 1305,
                                                                            columnNumber: 35
                                                                        }, this),
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                                            style: tdStyleStrong,
                                                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                                style: {
                                                                                    display: "grid",
                                                                                    gap: 4
                                                                                },
                                                                                children: [
                                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                                        children: toName(f)
                                                                                    }, void 0, false, {
                                                                                        fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/match/page.tsx",
                                                                                        lineNumber: 1314,
                                                                                        columnNumber: 39
                                                                                    }, this),
                                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                                        style: subCellText,
                                                                                        children: [
                                                                                            f.discipline ?? "-",
                                                                                            " · ",
                                                                                            f.klasse ?? "-"
                                                                                        ]
                                                                                    }, void 0, true, {
                                                                                        fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/match/page.tsx",
                                                                                        lineNumber: 1315,
                                                                                        columnNumber: 39
                                                                                    }, this)
                                                                                ]
                                                                            }, void 0, true, {
                                                                                fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/match/page.tsx",
                                                                                lineNumber: 1313,
                                                                                columnNumber: 37
                                                                            }, this)
                                                                        }, void 0, false, {
                                                                            fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/match/page.tsx",
                                                                            lineNumber: 1312,
                                                                            columnNumber: 35
                                                                        }, this),
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                                            style: tdStyle,
                                                                            children: age ?? "-"
                                                                        }, void 0, false, {
                                                                            fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/match/page.tsx",
                                                                            lineNumber: 1320,
                                                                            columnNumber: 35
                                                                        }, this),
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                                            style: tdStyle,
                                                                            children: formatWeight(f.gewicht)
                                                                        }, void 0, false, {
                                                                            fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/match/page.tsx",
                                                                            lineNumber: 1321,
                                                                            columnNumber: 35
                                                                        }, this),
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                                            style: tdStyle,
                                                                            children: getRecordText(f)
                                                                        }, void 0, false, {
                                                                            fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/match/page.tsx",
                                                                            lineNumber: 1322,
                                                                            columnNumber: 35
                                                                        }, this),
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                                            style: tdStyle,
                                                                            children: getTotalFights(f)
                                                                        }, void 0, false, {
                                                                            fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/match/page.tsx",
                                                                            lineNumber: 1323,
                                                                            columnNumber: 35
                                                                        }, this),
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                                            style: tdStyle,
                                                                            children: f.gym_input ?? f.fp_gym ?? f.gym ?? "-"
                                                                        }, void 0, false, {
                                                                            fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/match/page.tsx",
                                                                            lineNumber: 1324,
                                                                            columnNumber: 35
                                                                        }, this),
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                                            style: tdStyle,
                                                                            children: f.va_nummer ?? "-"
                                                                        }, void 0, false, {
                                                                            fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/match/page.tsx",
                                                                            lineNumber: 1327,
                                                                            columnNumber: 35
                                                                        }, this),
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                                            style: tdStyle,
                                                                            children: f.scrape_status ?? "-"
                                                                        }, void 0, false, {
                                                                            fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/match/page.tsx",
                                                                            lineNumber: 1328,
                                                                            columnNumber: 35
                                                                        }, this),
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                                            style: tdStyle,
                                                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                                                                                href: `/dashboard/matchmaker/matchmaking/${matchmakingId}/fighter/${f.id}`,
                                                                                style: detailLink,
                                                                                children: [
                                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$link$2d$2$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Link2$3e$__["Link2"], {
                                                                                        size: 14,
                                                                                        style: {
                                                                                            marginRight: 6
                                                                                        }
                                                                                    }, void 0, false, {
                                                                                        fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/match/page.tsx",
                                                                                        lineNumber: 1334,
                                                                                        columnNumber: 39
                                                                                    }, this),
                                                                                    "Detail"
                                                                                ]
                                                                            }, void 0, true, {
                                                                                fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/match/page.tsx",
                                                                                lineNumber: 1330,
                                                                                columnNumber: 37
                                                                            }, this)
                                                                        }, void 0, false, {
                                                                            fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/match/page.tsx",
                                                                            lineNumber: 1329,
                                                                            columnNumber: 35
                                                                        }, this),
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                                            style: tdStyle,
                                                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                                                style: {
                                                                                    ...matchPickButton,
                                                                                    ...isRed ? activePickButton : {}
                                                                                },
                                                                                onClick: ()=>handleMatchClick(f),
                                                                                children: [
                                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$swords$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Swords$3e$__["Swords"], {
                                                                                        size: 14,
                                                                                        style: {
                                                                                            marginRight: 6
                                                                                        }
                                                                                    }, void 0, false, {
                                                                                        fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/match/page.tsx",
                                                                                        lineNumber: 1346,
                                                                                        columnNumber: 39
                                                                                    }, this),
                                                                                    isRed ? "Rood gekozen" : selectedRed ? "Match" : "Kies rood"
                                                                                ]
                                                                            }, void 0, true, {
                                                                                fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/match/page.tsx",
                                                                                lineNumber: 1339,
                                                                                columnNumber: 37
                                                                            }, this)
                                                                        }, void 0, false, {
                                                                            fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/match/page.tsx",
                                                                            lineNumber: 1338,
                                                                            columnNumber: 35
                                                                        }, this)
                                                                    ]
                                                                }, String(f.id), true, {
                                                                    fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/match/page.tsx",
                                                                    lineNumber: 1291,
                                                                    columnNumber: 33
                                                                }, this);
                                                            })
                                                        }, void 0, false, {
                                                            fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/match/page.tsx",
                                                            lineNumber: 1278,
                                                            columnNumber: 27
                                                        }, this)
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/match/page.tsx",
                                                    lineNumber: 1262,
                                                    columnNumber: 25
                                                }, this)
                                            }, void 0, false, {
                                                fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/match/page.tsx",
                                                lineNumber: 1261,
                                                columnNumber: 23
                                            }, this)
                                        ]
                                    }, gender, true, {
                                        fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/match/page.tsx",
                                        lineNumber: 1254,
                                        columnNumber: 21
                                    }, this);
                                })
                            }, void 0, false, {
                                fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/match/page.tsx",
                                lineNumber: 1247,
                                columnNumber: 13
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/match/page.tsx",
                        lineNumber: 1232,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        style: selectionSummaryGrid,
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                style: selectionCard,
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        style: {
                                            ...sectionTitle,
                                            color: NVB_ORANGE
                                        },
                                        children: "Rode hoek"
                                    }, void 0, false, {
                                        fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/match/page.tsx",
                                        lineNumber: 1365,
                                        columnNumber: 13
                                    }, this),
                                    !selectedRed ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        style: sectionSub,
                                        children: "Nog geen rode hoek gekozen."
                                    }, void 0, false, {
                                        fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/match/page.tsx",
                                        lineNumber: 1367,
                                        columnNumber: 15
                                    }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(SelectionBlock, {
                                        fighter: selectedRed,
                                        eventDate: matchmaking?.datum ?? null
                                    }, void 0, false, {
                                        fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/match/page.tsx",
                                        lineNumber: 1369,
                                        columnNumber: 15
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/match/page.tsx",
                                lineNumber: 1364,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                style: selectionCard,
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        style: {
                                            ...sectionTitle,
                                            color: "#f1f5f9"
                                        },
                                        children: "Tegenstander"
                                    }, void 0, false, {
                                        fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/match/page.tsx",
                                        lineNumber: 1374,
                                        columnNumber: 13
                                    }, this),
                                    !selectedBlue ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        style: sectionSub,
                                        children: "Klik daarna bij een tweede vechter op match."
                                    }, void 0, false, {
                                        fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/match/page.tsx",
                                        lineNumber: 1376,
                                        columnNumber: 15
                                    }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(SelectionBlock, {
                                        fighter: selectedBlue,
                                        eventDate: matchmaking?.datum ?? null
                                    }, void 0, false, {
                                        fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/match/page.tsx",
                                        lineNumber: 1378,
                                        columnNumber: 15
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/match/page.tsx",
                                lineNumber: 1373,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/match/page.tsx",
                        lineNumber: 1363,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/match/page.tsx",
                lineNumber: 1071,
                columnNumber: 7
            }, this),
            showCompareModal && compareSummary ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                style: modalBackdrop,
                onClick: ()=>setShowCompareModal(false),
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    style: modalCard,
                    onClick: (e)=>e.stopPropagation(),
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            style: modalHeader,
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            style: sectionTitle,
                                            children: "Verschillen vergelijken"
                                        }, void 0, false, {
                                            fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/match/page.tsx",
                                            lineNumber: 1389,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            style: sectionSub,
                                            children: "Controleer deze partij voordat je opslaat"
                                        }, void 0, false, {
                                            fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/match/page.tsx",
                                            lineNumber: 1390,
                                            columnNumber: 17
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/match/page.tsx",
                                    lineNumber: 1388,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                    style: closeBtn,
                                    onClick: ()=>setShowCompareModal(false),
                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$x$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__X$3e$__["X"], {
                                        size: 18
                                    }, void 0, false, {
                                        fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/match/page.tsx",
                                        lineNumber: 1398,
                                        columnNumber: 17
                                    }, this)
                                }, void 0, false, {
                                    fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/match/page.tsx",
                                    lineNumber: 1394,
                                    columnNumber: 15
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/match/page.tsx",
                            lineNumber: 1387,
                            columnNumber: 13
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            style: compareHeaderRow,
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {}, void 0, false, {
                                    fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/match/page.tsx",
                                    lineNumber: 1403,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    style: compareFighterHeader,
                                    children: "Rood"
                                }, void 0, false, {
                                    fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/match/page.tsx",
                                    lineNumber: 1404,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    style: compareFighterHeader,
                                    children: "Blauw"
                                }, void 0, false, {
                                    fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/match/page.tsx",
                                    lineNumber: 1405,
                                    columnNumber: 15
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/match/page.tsx",
                            lineNumber: 1402,
                            columnNumber: 13
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            style: compareTable,
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(CompareRow, {
                                    label: "Naam",
                                    left: compareSummary.rood,
                                    right: compareSummary.blauw
                                }, void 0, false, {
                                    fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/match/page.tsx",
                                    lineNumber: 1409,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(CompareRow, {
                                    label: "Geslacht",
                                    left: selectedRed?.geslacht ?? "-",
                                    right: selectedBlue?.geslacht ?? "-"
                                }, void 0, false, {
                                    fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/match/page.tsx",
                                    lineNumber: 1410,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(CompareRow, {
                                    label: "Discipline",
                                    left: selectedRed?.discipline ?? "-",
                                    right: selectedBlue?.discipline ?? "-"
                                }, void 0, false, {
                                    fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/match/page.tsx",
                                    lineNumber: 1415,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(CompareRow, {
                                    label: "Klasse",
                                    left: selectedRed?.klasse ?? "-",
                                    right: selectedBlue?.klasse ?? "-"
                                }, void 0, false, {
                                    fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/match/page.tsx",
                                    lineNumber: 1420,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(CompareRow, {
                                    label: "Leeftijd",
                                    left: String(compareSummary.roodLeeftijd),
                                    right: String(compareSummary.blauwLeeftijd)
                                }, void 0, false, {
                                    fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/match/page.tsx",
                                    lineNumber: 1425,
                                    columnNumber: 15
                                }, this),
                                compareSummary.isJeugd ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(CompareRow, {
                                    label: "Leeftijdsverschil",
                                    left: `${compareSummary.leeftijdDiff} jaar`,
                                    right: ""
                                }, void 0, false, {
                                    fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/match/page.tsx",
                                    lineNumber: 1431,
                                    columnNumber: 17
                                }, this) : null,
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(CompareRow, {
                                    label: "Gewicht",
                                    left: formatWeight(selectedRed?.gewicht),
                                    right: formatWeight(selectedBlue?.gewicht)
                                }, void 0, false, {
                                    fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/match/page.tsx",
                                    lineNumber: 1437,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(CompareRow, {
                                    label: "Gewichtsverschil",
                                    left: `${compareSummary.gewichtDiff} kg`,
                                    right: ""
                                }, void 0, false, {
                                    fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/match/page.tsx",
                                    lineNumber: 1442,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(CompareRow, {
                                    label: "Record",
                                    left: compareSummary.roodRecord,
                                    right: compareSummary.blauwRecord
                                }, void 0, false, {
                                    fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/match/page.tsx",
                                    lineNumber: 1447,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(CompareRow, {
                                    label: "Aantal partijen",
                                    left: String(compareSummary.roodPartijen),
                                    right: String(compareSummary.blauwPartijen)
                                }, void 0, false, {
                                    fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/match/page.tsx",
                                    lineNumber: 1452,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(CompareRow, {
                                    label: "Gym",
                                    left: compareSummary.roodGym,
                                    right: compareSummary.blauwGym
                                }, void 0, false, {
                                    fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/match/page.tsx",
                                    lineNumber: 1457,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(CompareRow, {
                                    label: "VA",
                                    left: compareSummary.roodVA,
                                    right: compareSummary.blauwVA
                                }, void 0, false, {
                                    fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/match/page.tsx",
                                    lineNumber: 1462,
                                    columnNumber: 15
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/match/page.tsx",
                            lineNumber: 1408,
                            columnNumber: 13
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            style: modalActionRow,
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                    style: secondaryButton,
                                    onClick: ()=>setShowCompareModal(false),
                                    children: "Terug"
                                }, void 0, false, {
                                    fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/match/page.tsx",
                                    lineNumber: 1470,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                    style: primaryButton,
                                    disabled: !matchmakingId || busy,
                                    onClick: ()=>void saveMatch(),
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$save$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Save$3e$__["Save"], {
                                            size: 16,
                                            style: {
                                                marginRight: 8
                                            }
                                        }, void 0, false, {
                                            fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/match/page.tsx",
                                            lineNumber: 1481,
                                            columnNumber: 17
                                        }, this),
                                        busy ? "Opslaan..." : "Match opslaan"
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/match/page.tsx",
                                    lineNumber: 1476,
                                    columnNumber: 15
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/match/page.tsx",
                            lineNumber: 1469,
                            columnNumber: 13
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/match/page.tsx",
                    lineNumber: 1386,
                    columnNumber: 11
                }, this)
            }, void 0, false, {
                fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/match/page.tsx",
                lineNumber: 1385,
                columnNumber: 9
            }, this) : null,
            showManualModal ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                style: modalBackdrop,
                onClick: ()=>setShowManualModal(false),
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    style: modalCardLarge,
                    onClick: (e)=>e.stopPropagation(),
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            style: modalHeader,
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    style: sectionTitle,
                                    children: "Vechter handmatig toevoegen"
                                }, void 0, false, {
                                    fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/match/page.tsx",
                                    lineNumber: 1493,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                    style: closeBtn,
                                    onClick: ()=>setShowManualModal(false),
                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$x$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__X$3e$__["X"], {
                                        size: 18
                                    }, void 0, false, {
                                        fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/match/page.tsx",
                                        lineNumber: 1495,
                                        columnNumber: 17
                                    }, this)
                                }, void 0, false, {
                                    fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/match/page.tsx",
                                    lineNumber: 1494,
                                    columnNumber: 15
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/match/page.tsx",
                            lineNumber: 1492,
                            columnNumber: 13
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            style: manualGrid,
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(ManualInput, {
                                    label: "Voornaam",
                                    value: manualForm.voornaam,
                                    onChange: (v)=>setManualForm((s)=>({
                                                ...s,
                                                voornaam: v
                                            }))
                                }, void 0, false, {
                                    fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/match/page.tsx",
                                    lineNumber: 1500,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(ManualInput, {
                                    label: "Achternaam",
                                    value: manualForm.achternaam,
                                    onChange: (v)=>setManualForm((s)=>({
                                                ...s,
                                                achternaam: v
                                            }))
                                }, void 0, false, {
                                    fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/match/page.tsx",
                                    lineNumber: 1505,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(ManualInput, {
                                    label: "Geslacht",
                                    value: manualForm.geslacht,
                                    onChange: (v)=>setManualForm((s)=>({
                                                ...s,
                                                geslacht: v
                                            }))
                                }, void 0, false, {
                                    fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/match/page.tsx",
                                    lineNumber: 1512,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(ManualInput, {
                                    label: "Discipline",
                                    value: manualForm.discipline,
                                    onChange: (v)=>setManualForm((s)=>({
                                                ...s,
                                                discipline: v
                                            }))
                                }, void 0, false, {
                                    fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/match/page.tsx",
                                    lineNumber: 1517,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(ManualInput, {
                                    label: "Klasse",
                                    value: manualForm.klasse,
                                    onChange: (v)=>setManualForm((s)=>({
                                                ...s,
                                                klasse: v
                                            }))
                                }, void 0, false, {
                                    fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/match/page.tsx",
                                    lineNumber: 1524,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(ManualInput, {
                                    label: "Gym",
                                    value: manualForm.gym,
                                    onChange: (v)=>setManualForm((s)=>({
                                                ...s,
                                                gym: v
                                            }))
                                }, void 0, false, {
                                    fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/match/page.tsx",
                                    lineNumber: 1529,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(ManualInput, {
                                    label: "VA nummer",
                                    value: manualForm.va_nummer,
                                    onChange: (v)=>setManualForm((s)=>({
                                                ...s,
                                                va_nummer: v
                                            }))
                                }, void 0, false, {
                                    fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/match/page.tsx",
                                    lineNumber: 1534,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(ManualInput, {
                                    label: "Geboortedatum",
                                    type: "date",
                                    value: manualForm.geboortedatum,
                                    onChange: (v)=>setManualForm((s)=>({
                                                ...s,
                                                geboortedatum: v
                                            }))
                                }, void 0, false, {
                                    fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/match/page.tsx",
                                    lineNumber: 1541,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(ManualInput, {
                                    label: "Gewicht",
                                    value: manualForm.gewicht,
                                    onChange: (v)=>setManualForm((s)=>({
                                                ...s,
                                                gewicht: v
                                            }))
                                }, void 0, false, {
                                    fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/match/page.tsx",
                                    lineNumber: 1549,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(ManualInput, {
                                    label: "Win",
                                    value: manualForm.win,
                                    onChange: (v)=>setManualForm((s)=>({
                                                ...s,
                                                win: v
                                            }))
                                }, void 0, false, {
                                    fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/match/page.tsx",
                                    lineNumber: 1554,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(ManualInput, {
                                    label: "Loss",
                                    value: manualForm.loss,
                                    onChange: (v)=>setManualForm((s)=>({
                                                ...s,
                                                loss: v
                                            }))
                                }, void 0, false, {
                                    fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/match/page.tsx",
                                    lineNumber: 1559,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(ManualInput, {
                                    label: "Draw",
                                    value: manualForm.draw,
                                    onChange: (v)=>setManualForm((s)=>({
                                                ...s,
                                                draw: v
                                            }))
                                }, void 0, false, {
                                    fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/match/page.tsx",
                                    lineNumber: 1564,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(ManualInput, {
                                    label: "Demo",
                                    value: manualForm.demo,
                                    onChange: (v)=>setManualForm((s)=>({
                                                ...s,
                                                demo: v
                                            }))
                                }, void 0, false, {
                                    fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/match/page.tsx",
                                    lineNumber: 1569,
                                    columnNumber: 15
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/match/page.tsx",
                            lineNumber: 1499,
                            columnNumber: 13
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            style: {
                                marginTop: 12
                            },
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                    style: labelStyle,
                                    children: "Opmerkingen"
                                }, void 0, false, {
                                    fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/match/page.tsx",
                                    lineNumber: 1577,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("textarea", {
                                    style: textareaStyle,
                                    value: manualForm.opmerkingen,
                                    onChange: (e)=>setManualForm((s)=>({
                                                ...s,
                                                opmerkingen: e.target.value
                                            }))
                                }, void 0, false, {
                                    fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/match/page.tsx",
                                    lineNumber: 1578,
                                    columnNumber: 15
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/match/page.tsx",
                            lineNumber: 1576,
                            columnNumber: 13
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            style: modalActionRow,
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                    style: secondaryButton,
                                    onClick: ()=>setShowManualModal(false),
                                    children: "Annuleren"
                                }, void 0, false, {
                                    fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/match/page.tsx",
                                    lineNumber: 1588,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                    style: primaryButton,
                                    disabled: handmatigBusy || !matchmakingId,
                                    onClick: ()=>void addManualFighter(),
                                    children: handmatigBusy ? "Opslaan..." : "Toevoegen"
                                }, void 0, false, {
                                    fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/match/page.tsx",
                                    lineNumber: 1594,
                                    columnNumber: 15
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/match/page.tsx",
                            lineNumber: 1587,
                            columnNumber: 13
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/match/page.tsx",
                    lineNumber: 1491,
                    columnNumber: 11
                }, this)
            }, void 0, false, {
                fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/match/page.tsx",
                lineNumber: 1490,
                columnNumber: 9
            }, this) : null,
            showUploadModal ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                style: modalBackdrop,
                onClick: ()=>!uploadBusy && setShowUploadModal(false),
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    style: modalCard,
                    onClick: (e)=>e.stopPropagation(),
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            style: modalHeader,
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            style: sectionTitle,
                                            children: "Vechters uploaden"
                                        }, void 0, false, {
                                            fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/match/page.tsx",
                                            lineNumber: 1611,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            style: sectionSub,
                                            children: "Upload een Excel bestand met nieuwe vechters. Meerdere uploads zijn mogelijk."
                                        }, void 0, false, {
                                            fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/match/page.tsx",
                                            lineNumber: 1612,
                                            columnNumber: 17
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/match/page.tsx",
                                    lineNumber: 1610,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                    style: closeBtn,
                                    onClick: ()=>!uploadBusy && setShowUploadModal(false),
                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$x$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__X$3e$__["X"], {
                                        size: 18
                                    }, void 0, false, {
                                        fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/match/page.tsx",
                                        lineNumber: 1620,
                                        columnNumber: 17
                                    }, this)
                                }, void 0, false, {
                                    fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/match/page.tsx",
                                    lineNumber: 1616,
                                    columnNumber: 15
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/match/page.tsx",
                            lineNumber: 1609,
                            columnNumber: 13
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            style: {
                                padding: "20px 24px"
                            },
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    style: {
                                        marginBottom: 16
                                    },
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                            style: {
                                                display: "block",
                                                marginBottom: 6,
                                                fontSize: 13,
                                                fontWeight: 600,
                                                color: "#e2e8f0"
                                            },
                                            children: "Excel bestand (.xlsx, .xls)"
                                        }, void 0, false, {
                                            fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/match/page.tsx",
                                            lineNumber: 1626,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                            type: "file",
                                            accept: ".xlsx,.xls",
                                            style: {
                                                width: "100%",
                                                padding: "10px 12px",
                                                background: "rgba(255,255,255,0.08)",
                                                border: "1px solid rgba(255,255,255,0.18)",
                                                borderRadius: 6,
                                                color: "#e2e8f0",
                                                fontSize: 13
                                            },
                                            onChange: (e)=>{
                                                const f = e.target.files?.[0] ?? null;
                                                setUploadFile(f);
                                                setUploadResult(null);
                                            }
                                        }, void 0, false, {
                                            fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/match/page.tsx",
                                            lineNumber: 1629,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            style: {
                                                fontSize: 11,
                                                color: "#94a3b8",
                                                marginTop: 6
                                            },
                                            children: "1 vechter per rij · Kolommen: naam, discipline, klasse, VA nummer, gewicht, gym"
                                        }, void 0, false, {
                                            fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/match/page.tsx",
                                            lineNumber: 1647,
                                            columnNumber: 17
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/match/page.tsx",
                                    lineNumber: 1625,
                                    columnNumber: 15
                                }, this),
                                uploadResult && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    style: {
                                        padding: "10px 14px",
                                        borderRadius: 6,
                                        background: uploadResult.duplicates > 0 ? "rgba(234,179,8,0.15)" : "rgba(34,197,94,0.15)",
                                        border: uploadResult.duplicates > 0 ? "1px solid rgba(234,179,8,0.4)" : "1px solid rgba(34,197,94,0.4)",
                                        color: uploadResult.duplicates > 0 ? "#fef08a" : "#86efac",
                                        fontSize: 13,
                                        fontWeight: 600,
                                        marginBottom: 12
                                    },
                                    children: uploadResult.message
                                }, void 0, false, {
                                    fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/match/page.tsx",
                                    lineNumber: 1653,
                                    columnNumber: 17
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/match/page.tsx",
                            lineNumber: 1624,
                            columnNumber: 13
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            style: modalActionRow,
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                    style: secondaryButton,
                                    onClick: ()=>!uploadBusy && setShowUploadModal(false),
                                    disabled: uploadBusy,
                                    children: "Sluiten"
                                }, void 0, false, {
                                    fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/match/page.tsx",
                                    lineNumber: 1675,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                    style: {
                                        ...primaryButton,
                                        opacity: !uploadFile || uploadBusy ? 0.55 : 1,
                                        cursor: !uploadFile || uploadBusy ? "not-allowed" : "pointer"
                                    },
                                    disabled: !uploadFile || uploadBusy || !matchmakingId,
                                    onClick: ()=>void handleUpload(),
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$upload$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Upload$3e$__["Upload"], {
                                            size: 16,
                                            style: {
                                                marginRight: 8
                                            }
                                        }, void 0, false, {
                                            fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/match/page.tsx",
                                            lineNumber: 1691,
                                            columnNumber: 17
                                        }, this),
                                        uploadBusy ? "Uploaden..." : "Upload bestand"
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/match/page.tsx",
                                    lineNumber: 1682,
                                    columnNumber: 15
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/match/page.tsx",
                            lineNumber: 1674,
                            columnNumber: 13
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/match/page.tsx",
                    lineNumber: 1608,
                    columnNumber: 11
                }, this)
            }, void 0, false, {
                fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/match/page.tsx",
                lineNumber: 1607,
                columnNumber: 9
            }, this) : null
        ]
    }, void 0, true, {
        fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/match/page.tsx",
        lineNumber: 1038,
        columnNumber: 5
    }, this);
}
_s(MatchmakerMatchPage, "ktFk4a9UfbNlJpdehsmUs2FoKJI=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useParams"],
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useSearchParams"],
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRouter"]
    ];
});
_c1 = MatchmakerMatchPage;
function CompareRow({ label, left, right }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        style: compareRow,
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                style: compareLabel,
                children: label
            }, void 0, false, {
                fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/match/page.tsx",
                lineNumber: 1713,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                style: compareValue,
                children: left || "-"
            }, void 0, false, {
                fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/match/page.tsx",
                lineNumber: 1714,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                style: compareValue,
                children: right || "-"
            }, void 0, false, {
                fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/match/page.tsx",
                lineNumber: 1715,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/match/page.tsx",
        lineNumber: 1712,
        columnNumber: 5
    }, this);
}
_c2 = CompareRow;
function ManualInput({ label, value, onChange, type = "text" }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                style: labelStyle,
                children: label
            }, void 0, false, {
                fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/match/page.tsx",
                lineNumber: 1733,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                type: type,
                style: inputStyle,
                value: value,
                onChange: (e)=>onChange(e.target.value)
            }, void 0, false, {
                fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/match/page.tsx",
                lineNumber: 1734,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/match/page.tsx",
        lineNumber: 1732,
        columnNumber: 5
    }, this);
}
_c3 = ManualInput;
function SelectionBlock({ fighter, eventDate }) {
    const age = calcAgeOnDate(fighter.geboortedatum ?? fighter.geboortedatum_input ?? fighter.fp_geboortedatum ?? null, eventDate);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        style: {
            display: "grid",
            gap: 8
        },
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("strong", {
                        children: "Naam:"
                    }, void 0, false, {
                        fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/match/page.tsx",
                        lineNumber: 1762,
                        columnNumber: 9
                    }, this),
                    " ",
                    toName(fighter)
                ]
            }, void 0, true, {
                fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/match/page.tsx",
                lineNumber: 1761,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("strong", {
                        children: "Geslacht:"
                    }, void 0, false, {
                        fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/match/page.tsx",
                        lineNumber: 1765,
                        columnNumber: 9
                    }, this),
                    " ",
                    fighter.geslacht ?? "-"
                ]
            }, void 0, true, {
                fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/match/page.tsx",
                lineNumber: 1764,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("strong", {
                        children: "Discipline:"
                    }, void 0, false, {
                        fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/match/page.tsx",
                        lineNumber: 1768,
                        columnNumber: 9
                    }, this),
                    " ",
                    fighter.discipline ?? "-"
                ]
            }, void 0, true, {
                fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/match/page.tsx",
                lineNumber: 1767,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("strong", {
                        children: "Klasse:"
                    }, void 0, false, {
                        fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/match/page.tsx",
                        lineNumber: 1771,
                        columnNumber: 9
                    }, this),
                    " ",
                    fighter.klasse ?? "-"
                ]
            }, void 0, true, {
                fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/match/page.tsx",
                lineNumber: 1770,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("strong", {
                        children: "Leeftijd:"
                    }, void 0, false, {
                        fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/match/page.tsx",
                        lineNumber: 1774,
                        columnNumber: 9
                    }, this),
                    " ",
                    age ?? "-"
                ]
            }, void 0, true, {
                fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/match/page.tsx",
                lineNumber: 1773,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("strong", {
                        children: "Gewicht:"
                    }, void 0, false, {
                        fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/match/page.tsx",
                        lineNumber: 1777,
                        columnNumber: 9
                    }, this),
                    " ",
                    formatWeight(fighter.gewicht)
                ]
            }, void 0, true, {
                fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/match/page.tsx",
                lineNumber: 1776,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("strong", {
                        children: "Record:"
                    }, void 0, false, {
                        fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/match/page.tsx",
                        lineNumber: 1780,
                        columnNumber: 9
                    }, this),
                    " ",
                    getRecordText(fighter)
                ]
            }, void 0, true, {
                fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/match/page.tsx",
                lineNumber: 1779,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("strong", {
                        children: "Aantal partijen:"
                    }, void 0, false, {
                        fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/match/page.tsx",
                        lineNumber: 1783,
                        columnNumber: 9
                    }, this),
                    " ",
                    getTotalFights(fighter)
                ]
            }, void 0, true, {
                fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/match/page.tsx",
                lineNumber: 1782,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("strong", {
                        children: "Gym:"
                    }, void 0, false, {
                        fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/match/page.tsx",
                        lineNumber: 1786,
                        columnNumber: 9
                    }, this),
                    " ",
                    fighter.gym_input ?? fighter.fp_gym ?? fighter.gym ?? "-"
                ]
            }, void 0, true, {
                fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/match/page.tsx",
                lineNumber: 1785,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("strong", {
                        children: "VA:"
                    }, void 0, false, {
                        fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/match/page.tsx",
                        lineNumber: 1789,
                        columnNumber: 9
                    }, this),
                    " ",
                    fighter.va_nummer ?? "-"
                ]
            }, void 0, true, {
                fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/match/page.tsx",
                lineNumber: 1788,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/match/page.tsx",
        lineNumber: 1760,
        columnNumber: 5
    }, this);
}
_c4 = SelectionBlock;
function ActionCard({ title, text, icon, onClick, disabled }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
        onClick: onClick,
        disabled: disabled,
        style: {
            ...portalCard,
            opacity: disabled ? 0.55 : 1,
            cursor: disabled ? "not-allowed" : "pointer"
        },
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                style: iconBox,
                children: icon
            }, void 0, false, {
                fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/match/page.tsx",
                lineNumber: 1818,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                style: {
                    flex: 1,
                    textAlign: "left"
                },
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        style: portalCardTitle,
                        children: title
                    }, void 0, false, {
                        fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/match/page.tsx",
                        lineNumber: 1820,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        style: portalCardText,
                        children: text
                    }, void 0, false, {
                        fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/match/page.tsx",
                        lineNumber: 1821,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/match/page.tsx",
                lineNumber: 1819,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/app/dashboard/matchmaker/matchmaking/[matchmakingId]/match/page.tsx",
        lineNumber: 1809,
        columnNumber: 5
    }, this);
}
_c5 = ActionCard;
const pageBackground = {
    minHeight: "100vh",
    background: "radial-gradient(900px 520px at 18% 0%, rgba(255,77,0,0.14), transparent 56%), radial-gradient(780px 520px at 82% 18%, rgba(255,255,255,0.08), transparent 62%), linear-gradient(180deg,#040404 0%, #050505 55%, #000000 100%)",
    color: "#fff"
};
const topShell = {
    position: "relative",
    paddingBottom: 18,
    borderBottom: "1px solid rgba(255,255,255,0.08)",
    background: "linear-gradient(180deg, rgba(255,77,0,0.10) 0%, rgba(0,0,0,0) 55%)"
};
const topLogoWrap = {
    display: "flex",
    justifyContent: "center",
    paddingTop: 8
};
const portalBand = {
    marginTop: 6,
    background: "linear-gradient(180deg, rgba(22,28,40,0.95) 0%, rgba(6,10,16,0.95) 100%)",
    borderTop: "1px solid rgba(255,255,255,0.15)",
    borderBottom: "1px solid rgba(255,255,255,0.12)",
    textAlign: "center",
    padding: "10px 16px 14px",
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.08)"
};
const portalTitle = {
    fontSize: 44,
    fontWeight: 900,
    lineHeight: 1,
    letterSpacing: "0.03em",
    color: "#efefef",
    textShadow: "0 2px 10px rgba(0,0,0,0.55)"
};
const portalSub = {
    marginTop: 6,
    fontSize: 14,
    letterSpacing: "0.28em",
    color: NVB_ORANGE
};
const headerActionRow = {
    maxWidth: 1500,
    margin: "12px auto 0",
    display: "flex",
    justifyContent: "flex-end",
    gap: 12,
    padding: "0 20px"
};
const silverButton = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48,
    padding: "0 18px",
    border: "1px solid rgba(0,0,0,0.35)",
    background: "linear-gradient(180deg,#ffffff 0%,#dedede 38%,#b8b8b8 50%,#f7f7f7 100%)",
    color: "#111",
    fontWeight: 800,
    fontSize: 14,
    cursor: "pointer",
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.9), 0 8px 18px rgba(0,0,0,0.25)"
};
const contentWrap = {
    maxWidth: 1700,
    margin: "0 auto",
    padding: 18,
    display: "grid",
    gap: 18
};
const titleCard = {
    border: "2px solid rgba(255,255,255,0.20)",
    background: "linear-gradient(180deg, rgba(10,14,20,0.98) 0%, rgba(2,5,9,0.98) 100%)",
    padding: 18,
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.08)"
};
const titleMain = {
    fontSize: 22,
    fontWeight: 900,
    color: "#fff"
};
const titleSub = {
    marginTop: 4,
    fontSize: 14,
    color: "#c9d1db"
};
const metaRow = {
    marginTop: 10,
    display: "flex",
    flexWrap: "wrap",
    gap: 18,
    fontSize: 13,
    color: "#d9d9d9"
};
const actionGrid = {
    display: "grid",
    gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
    gap: 16
};
const portalCard = {
    display: "flex",
    alignItems: "center",
    gap: 16,
    padding: 16,
    border: "6px solid rgba(230,230,230,0.9)",
    background: "linear-gradient(180deg, rgba(16,19,26,0.98) 0%, rgba(5,8,13,0.98) 100%)",
    boxShadow: "inset 0 0 0 2px rgba(255,255,255,0.30), 0 14px 28px rgba(0,0,0,0.35)"
};
const iconBox = {
    width: 96,
    height: 96,
    display: "grid",
    placeItems: "center",
    color: "#fff",
    background: "linear-gradient(180deg, #ff680f 0%, #ff4d00 55%, #cc3f00 100%)",
    boxShadow: "0 10px 24px rgba(255,77,0,0.22)",
    flexShrink: 0
};
const portalCardTitle = {
    fontSize: 20,
    fontWeight: 900,
    color: "#efefef"
};
const portalCardText = {
    marginTop: 8,
    fontSize: 14,
    color: "#d0d6df"
};
const filterCard = {
    border: "2px solid rgba(255,255,255,0.20)",
    background: "linear-gradient(180deg, rgba(10,14,20,0.98) 0%, rgba(2,5,9,0.98) 100%)",
    padding: 18
};
const filterTopRow = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 14
};
const selectedCount = {
    fontSize: 14,
    fontWeight: 700,
    color: "#d8d8d8"
};
const sectionTitle = {
    fontSize: 18,
    fontWeight: 900,
    color: "#fff"
};
const sectionSub = {
    marginTop: 4,
    fontSize: 14,
    color: "#aeb8c5"
};
const filterGrid = {
    display: "grid",
    gridTemplateColumns: "2fr auto auto",
    gap: 12,
    alignItems: "end"
};
const filterActionArea = {
    display: "flex",
    gap: 8,
    flexWrap: "wrap"
};
const fieldWrapWide = {
    display: "grid",
    gap: 6
};
const labelStyle = {
    fontSize: 12,
    fontWeight: 800,
    letterSpacing: "0.12em",
    textTransform: "uppercase",
    color: "#c4ccd7"
};
const inputStyle = {
    height: 46,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(255,255,255,0.04)",
    color: "#fff",
    padding: "0 12px",
    outline: "none"
};
const searchInputWrap = {
    display: "flex",
    alignItems: "center",
    gap: 8,
    height: 46,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(255,255,255,0.04)",
    padding: "0 12px"
};
const textInputBare = {
    flex: 1,
    height: "100%",
    background: "transparent",
    border: "none",
    color: "#fff",
    outline: "none"
};
const checkboxWrap = {
    display: "flex",
    alignItems: "center",
    gap: 8,
    minHeight: 46,
    fontSize: 14,
    color: "#d6dbe2"
};
const tabLabel = {
    marginBottom: 8,
    fontSize: 12,
    fontWeight: 900,
    letterSpacing: "0.14em",
    textTransform: "uppercase",
    color: "#d6dee8"
};
const tabRail = {
    display: "flex",
    flexWrap: "wrap",
    gap: 12,
    padding: 12,
    border: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(255,255,255,0.03)"
};
const tabBtn = {
    minHeight: 52,
    padding: "0 18px",
    border: "1px solid rgba(255,255,255,0.16)",
    background: "linear-gradient(180deg, rgba(17,24,39,0.9) 0%, rgba(8,12,18,0.9) 100%)",
    color: "#fff",
    fontWeight: 900,
    fontSize: 16,
    cursor: "pointer",
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.05)"
};
const activeTabBtn = {
    background: "linear-gradient(180deg, #ff6a14 0%, #ff4d00 55%, #df3f00 100%)",
    color: "#fff",
    border: "1px solid rgba(255,77,0,0.8)",
    boxShadow: "0 10px 22px rgba(255,77,0,0.24)"
};
const subTabBtn = {
    minHeight: 46,
    padding: "0 18px",
    border: "1px solid rgba(255,255,255,0.16)",
    background: "linear-gradient(180deg, rgba(8,14,22,0.95) 0%, rgba(4,8,13,0.95) 100%)",
    color: "#fff",
    fontWeight: 800,
    fontSize: 15,
    cursor: "pointer"
};
const activeSubTabBtn = {
    background: "linear-gradient(180deg, #5b6678 0%, #374151 100%)",
    color: "#fff",
    border: "1px solid rgba(255,255,255,0.30)",
    boxShadow: "0 8px 18px rgba(148,163,184,0.18)"
};
const fighterTableCard = {
    border: "2px solid rgba(255,255,255,0.20)",
    background: "linear-gradient(180deg, rgba(10,14,20,0.98) 0%, rgba(2,5,9,0.98) 100%)",
    padding: 18
};
const tableTitleRow = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    marginBottom: 14
};
const tinyButton = {
    border: "1px solid rgba(255,255,255,0.18)",
    background: "rgba(255,255,255,0.06)",
    color: "#fff",
    padding: "8px 12px",
    cursor: "pointer",
    fontWeight: 700
};
const emptyStateCard = {
    padding: 24,
    border: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(255,255,255,0.03)",
    color: "#cbd5e1"
};
const genderBlock = {
    display: "grid",
    gap: 12
};
const genderDivider = {
    display: "flex",
    alignItems: "center",
    gap: 14
};
const genderDividerLine = {
    flex: 1,
    height: 1,
    background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.22), transparent)"
};
const genderDividerLabel = {
    display: "inline-flex",
    alignItems: "center",
    minHeight: 34,
    padding: "0 14px",
    border: "1px solid rgba(255,255,255,0.16)",
    background: "rgba(255,255,255,0.06)",
    color: "#fff",
    fontWeight: 900,
    letterSpacing: "0.05em"
};
const tableWrap = {
    overflowX: "auto",
    border: "2px solid rgba(255,255,255,0.18)"
};
const tableStyle = {
    width: "100%",
    borderCollapse: "collapse"
};
const thStyle = {
    background: "linear-gradient(180deg, #ff6a00 0%, #ff5400 100%)",
    color: "#fff",
    padding: "12px 10px",
    textAlign: "left",
    fontWeight: 900,
    whiteSpace: "nowrap"
};
const tdStyle = {
    padding: "10px",
    borderTop: "1px solid rgba(0,0,0,0.08)",
    whiteSpace: "nowrap"
};
const tdStyleStrong = {
    ...tdStyle,
    fontWeight: 800
};
const subCellText = {
    fontSize: 12,
    fontWeight: 600,
    opacity: 0.82
};
const detailLink = {
    display: "inline-flex",
    alignItems: "center",
    color: "#111",
    textDecoration: "none",
    fontWeight: 800,
    background: "#ececec",
    padding: "7px 10px"
};
const matchPickButton = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 34,
    padding: "0 12px",
    border: "1px solid rgba(0,0,0,0.2)",
    background: "#efefef",
    color: "#111",
    cursor: "pointer",
    fontWeight: 800
};
const activePickButton = {
    background: "linear-gradient(180deg,#ff8b45 0%,#ff4d00 100%)",
    color: "#fff"
};
const selectionSummaryGrid = {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 16
};
const selectionCard = {
    border: "2px solid rgba(255,255,255,0.20)",
    background: "linear-gradient(180deg, rgba(10,14,20,0.98) 0%, rgba(2,5,9,0.98) 100%)",
    padding: 18
};
const modalBackdrop = {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.62)",
    display: "grid",
    placeItems: "center",
    zIndex: 1000,
    padding: 20
};
const modalCard = {
    width: "100%",
    maxWidth: 920,
    border: "3px solid rgba(255,255,255,0.20)",
    background: "linear-gradient(180deg, rgba(16,19,26,0.99) 0%, rgba(5,8,13,0.99) 100%)",
    padding: 18,
    boxShadow: "0 22px 70px rgba(0,0,0,0.55)"
};
const modalCardLarge = {
    ...modalCard,
    maxWidth: 1100
};
const modalHeader = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 16
};
const closeBtn = {
    width: 40,
    height: 40,
    border: "1px solid rgba(255,255,255,0.18)",
    background: "rgba(255,255,255,0.05)",
    color: "#fff",
    cursor: "pointer"
};
const compareHeaderRow = {
    display: "grid",
    gridTemplateColumns: "180px 1fr 1fr",
    gap: 10,
    marginBottom: 8
};
const compareFighterHeader = {
    fontWeight: 900,
    color: "#fff",
    padding: "0 4px"
};
const compareTable = {
    display: "grid",
    gap: 8
};
const compareRow = {
    display: "grid",
    gridTemplateColumns: "180px 1fr 1fr",
    gap: 10,
    alignItems: "center"
};
const compareLabel = {
    fontWeight: 900,
    color: "#fff"
};
const compareValue = {
    minHeight: 42,
    display: "flex",
    alignItems: "center",
    padding: "0 12px",
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.10)",
    color: "#e5e7eb"
};
const primaryButton = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 44,
    padding: "0 14px",
    border: "1px solid rgba(255,77,0,0.55)",
    background: "linear-gradient(180deg, #ff6a14 0%, #ff4d00 55%, #df3f00 100%)",
    color: "#fff",
    fontWeight: 900,
    cursor: "pointer"
};
const secondaryButton = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 44,
    padding: "0 14px",
    border: "1px solid rgba(255,255,255,0.20)",
    background: "rgba(255,255,255,0.06)",
    color: "#fff",
    fontWeight: 900,
    cursor: "pointer"
};
const modalActionRow = {
    marginTop: 18,
    display: "flex",
    justifyContent: "flex-end",
    gap: 12
};
const manualGrid = {
    display: "grid",
    gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
    gap: 12
};
const textareaStyle = {
    width: "100%",
    minHeight: 100,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(255,255,255,0.04)",
    color: "#fff",
    padding: 12,
    outline: "none",
    resize: "vertical"
};
var _c, _c1, _c2, _c3, _c4, _c5;
__turbopack_context__.k.register(_c, "HeaderButton");
__turbopack_context__.k.register(_c1, "MatchmakerMatchPage");
__turbopack_context__.k.register(_c2, "CompareRow");
__turbopack_context__.k.register(_c3, "ManualInput");
__turbopack_context__.k.register(_c4, "SelectionBlock");
__turbopack_context__.k.register(_c5, "ActionCard");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
]);

//# sourceMappingURL=_b98a2391._.js.map