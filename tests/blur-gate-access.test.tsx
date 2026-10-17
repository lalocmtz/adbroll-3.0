import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useBlurGate } from "@/hooks/useBlurGate";

const mocks = vi.hoisted(() => ({ getSession: vi.fn(), read: vi.fn(), authChange: null as any, unsubscribe: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: {
  auth: { getSession: mocks.getSession, onAuthStateChange: (callback: any) => { mocks.authChange = callback; return { data: { subscription: { unsubscribe: mocks.unsubscribe } } }; } },
  from: (table: string) => {
    let userId = "";
    const query: any = { select: () => query, eq: (key: string, value: string) => { if (key === "user_id") userId = value; return query; }, maybeSingle: () => mocks.read(table, userId) };
    return query;
  },
} }));

const session = { user: { id: "creator" } };
let rows: Record<string, unknown>;
beforeEach(() => {
  vi.clearAllMocks();
  rows = {};
  mocks.getSession.mockResolvedValue({ data: { session } });
  mocks.read.mockImplementation(async (table: string) => ({ data: rows[table] || null, error: null }));
});

describe("shared catalog entitlement rules", () => {
  it.each([
    ["founder", "user_roles", { role: "founder" }],
    ["active subscription", "subscriptions", { status: "active", renew_at: "2099-01-01" }],
    ["subscription trial", "subscriptions", { status: "trialing", renew_at: "2099-01-01" }],
    ["approved lifetime creator", "creator_program_applications", { status: "active", access_kind: "lifetime", approved_at: "2026-10-01", subscription_ends_at: null }],
    ["valid limited grant", "creator_program_applications", { status: "pending_review", access_kind: "limited", approved_at: "2026-10-01", subscription_ends_at: "2099-01-01" }],
  ])("preserves access for %s", async (_name, table, data) => {
    rows[table as string] = data;
    const { result } = renderHook(() => useBlurGate());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.hasPaid).toBe(true);
    expect(result.current.accessLevel).toBe("paid");
    expect(result.current.isFounder).toBe(table === "user_roles");
  });

  it.each([
    ["free", null, null],
    ["expired subscription", "subscriptions", { status: "active", renew_at: "2020-01-01" }],
    ["cancelled subscription", "subscriptions", { status: "cancelled", renew_at: "2099-01-01" }],
    ["expired grant", "creator_program_applications", { status: "active", access_kind: "limited", approved_at: "2026-10-01", subscription_ends_at: "2020-01-01" }],
    ["unapproved lifetime", "creator_program_applications", { status: "active", access_kind: "lifetime", approved_at: null, subscription_ends_at: null }],
  ])("keeps %s gated", async (_name, table, data) => {
    if (table) rows[table as string] = data;
    const { result } = renderHook(() => useBlurGate());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.hasPaid).toBe(false);
    expect(result.current.accessLevel).toBe("free");
  });

  it("does not query entitlements for a visitor", async () => {
    mocks.getSession.mockResolvedValue({ data: { session: null } });
    const { result } = renderHook(() => useBlurGate());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.accessLevel).toBe("visitor");
    expect(mocks.read).not.toHaveBeenCalled();
  });

  it("cannot restore founder access from a stale response after logout", async () => {
    let resolveRole!: (value: unknown) => void;
    mocks.read.mockImplementation((table: string) => table === "user_roles"
      ? new Promise(resolve => { resolveRole = resolve; }) : Promise.resolve({ data: null, error: null }));
    const { result } = renderHook(() => useBlurGate());
    await waitFor(() => expect(mocks.read).toHaveBeenCalledTimes(3));
    act(() => { mocks.authChange("SIGNED_OUT", null); });
    await act(async () => { resolveRole({ data: { role: "founder" }, error: null }); });
    expect(result.current.accessLevel).toBe("visitor");
    expect(result.current.hasPaid).toBe(false);
    expect(result.current.isFounder).toBe(false);
  });
});
