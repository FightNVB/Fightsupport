import { POST as archiveMatchmaking } from "@/app/api/admin/archief/verplaats/route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Parameters<typeof archiveMatchmaking>[0]) {
  return archiveMatchmaking(req);
}
