import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useGoogleSignIn } from "@/hooks/useGoogleSignIn";

const mocks = vi.hoisted(() => ({ signInWithOAuth: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { auth: { signInWithOAuth: mocks.signInWithOAuth } } }));

beforeEach(() => {
  vi.resetAllMocks();
  mocks.signInWithOAuth.mockResolvedValue({ error: null });
});

describe("Google sign-in navigation", () => {
  it("starts only one OAuth navigation for two taps before a render", async () => {
    const beforeRedirect = vi.fn();
    const { result } = renderHook(() => useGoogleSignIn("/app"));
    await act(async () => {
      await Promise.all([result.current.startGoogleSignIn(beforeRedirect), result.current.startGoogleSignIn(beforeRedirect)]);
    });
    expect(beforeRedirect).toHaveBeenCalledTimes(1);
    expect(mocks.signInWithOAuth).toHaveBeenCalledTimes(1);
    expect(result.current.isGoogleLoading).toBe(true);
  });

  it("allows a fresh attempt after Safari restores the page from the back/forward cache", async () => {
    const { result } = renderHook(() => useGoogleSignIn("/pricing"));
    await act(async () => { await result.current.startGoogleSignIn(); });
    const restore = new Event("pageshow");
    Object.defineProperty(restore, "persisted", { value: true });
    act(() => { window.dispatchEvent(restore); });
    expect(result.current.isGoogleLoading).toBe(false);
    await act(async () => { await result.current.startGoogleSignIn(); });
    expect(mocks.signInWithOAuth).toHaveBeenCalledTimes(2);
    expect(mocks.signInWithOAuth).toHaveBeenLastCalledWith({ provider: "google", options: { redirectTo: expect.stringContaining("/auth/continue?redirect=%2Fpricing") } });
  });

  it("keeps the pending navigation locked for an ordinary pageshow event", async () => {
    const { result } = renderHook(() => useGoogleSignIn("/app"));
    await act(async () => { await result.current.startGoogleSignIn(); });
    act(() => { window.dispatchEvent(new Event("pageshow")); });
    expect(result.current.isGoogleLoading).toBe(true);
  });

  it("offers retry without exposing provider details when preparation or OAuth fails", async () => {
    mocks.signInWithOAuth.mockResolvedValueOnce({ error: new Error("Private provider diagnostic") });
    const { result } = renderHook(() => useGoogleSignIn("/app"));
    await act(async () => { await result.current.startGoogleSignIn(); });
    expect(result.current.isGoogleLoading).toBe(false);
    expect(result.current.googleError).toBe("No pudimos conectar con Google. Inténtalo de nuevo o entra con tu correo.");
    await act(async () => { await result.current.startGoogleSignIn(); });
    expect(result.current.googleError).toBeNull();
    expect(mocks.signInWithOAuth).toHaveBeenCalledTimes(2);
  });
});
