import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import QuickSignupModal from "@/components/creators/QuickSignupModal";

const mocks = vi.hoisted(() => ({ signInWithOAuth: vi.fn(), signUp: vi.fn(), toast: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { auth: { signInWithOAuth: mocks.signInWithOAuth, signUp: mocks.signUp } } }));
vi.mock("@/contexts/LanguageContext", () => ({ useLanguage: () => ({ language: "es" }) }));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: mocks.toast }) }));

function openSignup() {
  render(<QuickSignupModal open onOpenChange={vi.fn()} email="creator@example.com" fullName="Creator" onSuccess={vi.fn()} />);
}

beforeEach(() => {
  vi.resetAllMocks();
  localStorage.clear();
  mocks.signInWithOAuth.mockResolvedValue({ error: null });
});

describe("creator quick signup Google flow", () => {
  it("uses the shared auth callback and the active creator program route", async () => {
    openSignup();
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Google" })); });
    expect(mocks.signInWithOAuth).toHaveBeenCalledWith({ provider: "google", options: { redirectTo: expect.stringContaining("/auth/continue?redirect=%2Fcolaboraciones") } });
    expect(localStorage.getItem("pendingCreatorApplication")).toBe("true");
    expect(screen.getByRole("button", { name: "Conectando..." })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Crear cuenta y enviar" })).toBeDisabled();
  });

  it("allows retry when Safari restores the dialog after returning from Google", async () => {
    openSignup();
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Google" })); });
    const restored = new Event("pageshow");
    Object.defineProperty(restored, "persisted", { value: true });
    act(() => { window.dispatchEvent(restored); });
    expect(screen.getByRole("button", { name: "Google" })).toBeEnabled();
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Google" })); });
    expect(mocks.signInWithOAuth).toHaveBeenCalledTimes(2);
  });

  it("shows a safe inline error and enables retry instead of provider diagnostics", async () => {
    mocks.signInWithOAuth.mockResolvedValueOnce({ error: new Error("Private provider diagnostic") });
    openSignup();
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Google" })); });
    expect(screen.getByRole("alert")).toHaveTextContent("No pudimos conectar con Google");
    expect(screen.queryByText(/Private provider diagnostic/)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Google" })).toBeEnabled();
  });
});
