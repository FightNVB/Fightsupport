import { spawn } from "node:child_process";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { requireRole, supabaseAdmin } from "@/lib/api/requireRole";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_VA_NUMBERS = 100;
const WRITER_TIMEOUT_MS = 15 * 60 * 1000;

type WriterResult = {
  va: string;
  ok: boolean;
  status: "written" | "already_present" | "failed";
  error?: string;
};

function normalizeVa(value: unknown): string | null {
  const digits = String(value ?? "").replace(/\D/g, "");
  return /^\d{3,5}$/.test(digits) ? digits : null;
}

function runWriter(
  vaNummers: string[]
): Promise<{ results: WriterResult[]; output: string }> {
  return new Promise((resolve, reject) => {
    const scriptPath = path.join(
      process.cwd(),
      "ControlEngine",
      "scrapers",
      "fp_doping",
      "scraper_fp_doping_writer.js"
    );

    const child = spawn(process.execPath, [scriptPath, ...vaNummers], {
      cwd: process.cwd(),
      env: process.env,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let output = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      output += String(chunk);
    });

    child.stderr.on("data", (chunk) => {
      stderr += String(chunk);
    });

    const timeout = setTimeout(() => {
      child.kill("SIGTERM");
      reject(new Error("FightPassport-writer duurde langer dan 15 minuten."));
    }, WRITER_TIMEOUT_MS);

    child.on("error", (error) => {
      clearTimeout(timeout);
      reject(error);
    });

    child.on("close", (code) => {
      clearTimeout(timeout);

      const combined = `${output}\n${stderr}`.trim();
      const marker = output
        .split(/\r?\n/)
        .find((line) => line.startsWith("DOPING_WRITER_RESULT="));

      if (!marker) {
        reject(
          new Error(combined || `Writer stopte met code ${code ?? "onbekend"}.`)
        );
        return;
      }

      try {
        const parsed = JSON.parse(
          marker.slice("DOPING_WRITER_RESULT=".length)
        );
        resolve({
          results: Array.isArray(parsed.results) ? parsed.results : [],
          output: combined,
        });
      } catch {
        reject(new Error("Writer gaf geen leesbaar resultaat terug."));
      }
    });
  });
}

export async function POST(request: NextRequest) {
  try {
    await requireRole(request, ["admin", "superadmin"]);

    const body = await request.json().catch(() => ({}));
    const supplied = Array.isArray(body?.va_nummers) ? body.va_nummers : [];
    const vaNummers = [
      ...new Set(supplied.map(normalizeVa).filter(Boolean)),
    ] as string[];

    if (!vaNummers.length) {
      return NextResponse.json(
        { error: "Selecteer minimaal één vechter." },
        { status: 400 }
      );
    }

    if (vaNummers.length > MAX_VA_NUMBERS) {
      return NextResponse.json(
        {
          error: `Je kunt maximaal ${MAX_VA_NUMBERS} vechters per opdracht verwerken.`,
        },
        { status: 400 }
      );
    }

    const { results } = await runWriter(vaNummers);
    const written = results.filter((item) => item.status === "written").length;
    const alreadyPresent = results.filter(
      (item) => item.status === "already_present"
    ).length;
    const failed = results.filter((item) => !item.ok).length;

    const successfulVaNummers = results
      .filter(
        (item) =>
          item.ok &&
          (item.status === "written" || item.status === "already_present")
      )
      .map((item) => item.va);

    if (successfulVaNummers.length) {
      const workflowRows = successfulVaNummers.map((vaNummer) => ({
        va_nummer: vaNummer,
        fightpassport_status: "verwerkt",
      }));

      const { error: workflowError } = await supabaseAdmin
        .from("doping_fighters")
        .upsert(workflowRows, { onConflict: "va_nummer" });

      if (workflowError) {
        console.error(
          "[doping/fightpassport] FightPassport gelukt, maar doping_fighters upsert mislukt:",
          workflowError
        );

        return NextResponse.json(
          {
            error:
              "FightPassport is bijgewerkt, maar de status in het dopingdossier kon niet worden opgeslagen.",
            requested: vaNummers.length,
            written,
            already_present: alreadyPresent,
            failed,
            results,
          },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      ok: failed === 0,
      requested: vaNummers.length,
      written,
      already_present: alreadyPresent,
      failed,
      results,
    });
  } catch (error) {
    console.error("[doping/fightpassport] writer fout:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "FightPassport schrijven mislukt.",
      },
      { status: 500 }
    );
  }
}
