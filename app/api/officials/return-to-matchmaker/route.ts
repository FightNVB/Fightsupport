import { POST as returnMatchmaking } from "@/app/api/admin/controle/return-to-matchmaker/route";

export const runtime = "nodejs";

export async function POST(req: Parameters<typeof returnMatchmaking>[0]) {
  return returnMatchmaking(req);
}
