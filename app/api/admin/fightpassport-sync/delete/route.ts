// app/api/admin/fightpassport-sync/delete/route.ts
import { NextResponse } from "next/server";
import { requireRole, supabaseAdmin } from "@/lib/api/requireRole";

type DeleteType = "total" | "team";

export async function DELETE(req: Request) {
  try {
    await requireRole(req, ["admin", "superadmin"]);

    const body = await req.json().catch(() => ({}));
    const type = String(body?.type || "").trim().toLowerCase() as DeleteType;

    if (type !== "total" && type !== "team") {
      return NextResponse.json(
        { error: 'Ongeldig type. Gebruik "total" of "team".' },
        { status: 400 }
      );
    }

    if (type === "team") {
      const { error } = await supabaseAdmin
        .from("fightpassport_school_fighters")
        .delete()
        .not("id", "is", null);

      if (error) throw error;

      return NextResponse.json({
        ok: true,
        type: "team",
        message: "Sportschool-VA koppelingen verwijderd.",
      });
    }

    // Volgorde is bewust van afhankelijke tabellen naar hoofdtabel.
    // Niet iedere tabel heeft een "id"-kolom; fightpassport_fighters
    // gebruikt bijvoorbeeld va_nummer.
    const deletes = [
      { table: "fightpassport_sync_items", column: "id" },
      { table: "fightpassport_startbans", column: "id" },
      { table: "fightpassport_licenses", column: "id" },
      { table: "fightpassport_fighter_gyms", column: "id" },
      { table: "fightpassport_results", column: "id" },
      { table: "fightpassport_sync_runs", column: "id" },
      { table: "fightpassport_fighters", column: "va_nummer" },
    ];

    for (const item of deletes) {
      const { error } = await supabaseAdmin
        .from(item.table)
        .delete()
        .not(item.column, "is", null);

      if (error) {
        throw new Error(`${item.table}: ${error.message}`);
      }
    }

    return NextResponse.json({
      ok: true,
      type: "total",
      message: "Centrale FightPaspoort scraperdata verwijderd.",
    });
  } catch (err: any) {
    if (err instanceof NextResponse) return err;

    console.error("[fightpassport-sync/delete] verwijderen mislukt:", err);

    return NextResponse.json(
      {
        error:
          err?.message ||
          "FightPaspoort scraperdata verwijderen mislukt.",
      },
      { status: 500 }
    );
  }
}
