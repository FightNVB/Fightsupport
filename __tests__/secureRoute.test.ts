jest.mock("@/app/api/_utils/authz", () => ({
  requireUserWithRole: jest.fn(),
  assertCanAccessMatchmaking: jest.fn(),
  requireAdmin: jest.fn(),
}));

import { assertCanAccessMatchmaking, requireAdmin, requireUserWithRole } from "@/app/api/_utils/authz";
import { requireAdminAccess, requireMatchmakingAccess } from "@/lib/api/secureRoute";

const user = { userId: "owner", authUserId: "auth-owner", role: "matchmaker" } as any;
const req = new Request("http://localhost/api/test", { headers: { Authorization: "Bearer test" } });

describe("central secure-route guards", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns 401 for an anonymous request before object access", async () => {
    (requireUserWithRole as jest.Mock).mockRejectedValue(new Response("Unauthorized", { status: 401 }));
    await expect(requireMatchmakingAccess(new Request("http://localhost"), "mm-a")).rejects.toMatchObject({ status: 401 });
    expect(assertCanAccessMatchmaking).not.toHaveBeenCalled();
  });

  it("returns 403 for a wrong role before object access", async () => {
    (requireUserWithRole as jest.Mock).mockRejectedValue(new Response("Forbidden", { status: 403 }));
    await expect(requireMatchmakingAccess(req, "mm-a")).rejects.toMatchObject({ status: 403 });
    expect(assertCanAccessMatchmaking).not.toHaveBeenCalled();
  });

  it("returns 403 when the right role cannot access the object", async () => {
    (requireUserWithRole as jest.Mock).mockResolvedValue(user);
    (assertCanAccessMatchmaking as jest.Mock).mockRejectedValue(new Response("Forbidden", { status: 403 }));
    await expect(requireMatchmakingAccess(req, "mm-b")).rejects.toMatchObject({ status: 403 });
  });

  it("allows an authorized owner", async () => {
    (requireUserWithRole as jest.Mock).mockResolvedValue(user);
    (assertCanAccessMatchmaking as jest.Mock).mockResolvedValue(undefined);
    await expect(requireMatchmakingAccess(req, "mm-a")).resolves.toBe(user);
  });

  it("delegates admin checks to the central helper", async () => {
    (requireAdmin as jest.Mock).mockResolvedValue({ ...user, role: "admin" });
    await expect(requireAdminAccess(req)).resolves.toMatchObject({ role: "admin" });
    expect(requireAdmin).toHaveBeenCalledWith(req);
  });
});
