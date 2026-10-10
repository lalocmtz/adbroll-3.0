import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import AuthContinue from "@/pages/AuthContinue";

const mocks = vi.hoisted(() => ({ getUser: vi.fn(), rpc: vi.fn(), getStoredRefCode: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { auth: { getUser: mocks.getUser }, rpc: mocks.rpc } }));
vi.mock("@/lib/attribution", () => ({ getStoredRefCode: mocks.getStoredRefCode }));

function openCallback() {
  render(<MemoryRouter initialEntries={["/auth/continue?redirect=%2Faffiliates"]}><Routes>
    <Route path="/auth/continue" element={<AuthContinue />} />
    <Route path="/affiliates" element={<h1>Mi panel de afiliados</h1>} />
  </Routes></MemoryRouter>);
}

beforeEach(() => {
  vi.resetAllMocks();
  mocks.rpc.mockResolvedValue({ error: null });
  mocks.getStoredRefCode.mockReturnValue(null);
});

describe("post-auth referral attribution", () => {
  it("retains the signup code when email confirmation opens on another device", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: { id: "new-user", email_confirmed_at: "2026-10-10", user_metadata: { referral_code: "LALO" } } }, error: null });
    openCallback();
    await screen.findByRole("heading", { name: "Mi panel de afiliados" });
    expect(mocks.rpc).toHaveBeenCalledWith("apply_referral_code", { p_user_id: "new-user", p_code: "LALO" });
  });
  it("uses the stored referral for Google users without signup metadata", async () => {
    mocks.getStoredRefCode.mockReturnValue("ALICIA");
    mocks.getUser.mockResolvedValue({ data: { user: { id: "google-user", email_confirmed_at: "2026-10-10", user_metadata: {} } }, error: null });
    openCallback();
    await screen.findByRole("heading", { name: "Mi panel de afiliados" });
    expect(mocks.rpc).toHaveBeenCalledWith("apply_referral_code", { p_user_id: "google-user", p_code: "ALICIA" });
  });
  it("keeps the submitted signup code when a later link changes browser attribution", async () => {
    mocks.getStoredRefCode.mockReturnValue("LATER");
    mocks.getUser.mockResolvedValue({ data: { user: { id: "new-user", email_confirmed_at: "2026-10-10", user_metadata: { referral_code: "LALO" } } }, error: null });
    openCallback();
    await waitFor(() => expect(mocks.rpc).toHaveBeenCalledWith("apply_referral_code", { p_user_id: "new-user", p_code: "LALO" }));
  });
  it("provides a usable next step when the session lookup fails", async () => {
    mocks.getUser.mockRejectedValue(new Error("Network unavailable"));
    openCallback();
    expect(await screen.findByRole("link", { name: "Ya confirmé, continuar" })).toBeVisible();
    expect(screen.getByText(/Registrarte no inicia una suscripción/)).toBeVisible();
  });
  it("keeps an unconfirmed session on the confirmation step", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: { id: "pending", email_confirmed_at: null } }, error: null });
    openCallback();
    await screen.findByText("Confirma tu correo e inicia sesión para continuar.");
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it("does not apply a referral before authentication", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null }, error: null });
    openCallback();
    await screen.findByText("Confirma tu correo e inicia sesión para continuar.");
    expect(mocks.rpc).not.toHaveBeenCalled();
    expect(screen.getByText(/Crear tu cuenta es gratis/)).toBeVisible();
    expect(screen.getByRole("link", { name: "Ya confirmé, continuar" })).toHaveAttribute("href", "/login?redirect=%2Faffiliates");
  });
});
