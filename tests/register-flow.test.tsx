import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import Register from "@/pages/Register";

const mocks = vi.hoisted(() => ({ rpc: vi.fn(), signUp: vi.fn(), signInWithOAuth: vi.fn(), getSession: vi.fn(), persistRefCode: vi.fn(), clearStoredRefCode: vi.fn(), toast: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { rpc: mocks.rpc, auth: { signUp: mocks.signUp, signInWithOAuth: mocks.signInWithOAuth, getSession: mocks.getSession } } }));
vi.mock("@/lib/attribution", () => ({ getStoredRefCode: () => null, persistRefCode: mocks.persistRefCode, clearStoredRefCode: mocks.clearStoredRefCode }));
vi.mock("@/lib/analytics", () => ({ trackSignUp: vi.fn() }));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: mocks.toast }) }));

function openRegister(query = "") {
  render(<MemoryRouter initialEntries={[`/register${query}`]}><Routes>
    <Route path="/register" element={<Register />} />
    <Route path="/auth/continue" element={<h1>Confirmación</h1>} />
  </Routes></MemoryRouter>);
}
const pauseForValidation = () => act(async () => { await new Promise(resolve => setTimeout(resolve, 380)); });
beforeEach(() => {
  vi.resetAllMocks();
  mocks.getSession.mockResolvedValue({ data: { session: null } });
  mocks.rpc.mockResolvedValue({ data: true, error: null });
  mocks.signUp.mockResolvedValue({ data: { user: { id: "user" }, session: null }, error: null });
  mocks.signInWithOAuth.mockResolvedValue({ error: null });
});

describe("registration onboarding", () => {
  it("distinguishes the free account from paid Pro before choosing email or Google", () => {
    openRegister();
    expect(screen.getByText(/Tu cuenta y la vista previa son gratis, sin tarjeta/)).toBeVisible();
    expect(screen.queryByLabelText("Contraseña")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Continuar con correo" }));
    expect(screen.getByLabelText("Contraseña")).toBeVisible();
  });
  it("ignores a stale referral response and blocks OAuth while the current code is pending or invalid", async () => {
    let finishFirst!: (value: unknown) => void;
    let finishSecond!: (value: unknown) => void;
    mocks.rpc.mockImplementationOnce(() => new Promise(resolve => { finishFirst = resolve; }))
      .mockImplementationOnce(() => new Promise(resolve => { finishSecond = resolve; }));
    openRegister("?ref=LALO");
    await pauseForValidation();
    fireEvent.change(screen.getByLabelText("Código del creador (opcional)"), { target: { value: "OTHER" } });
    await pauseForValidation();
    await act(async () => finishFirst({ data: true, error: null }));
    expect(screen.getByRole("button", { name: "Continuar con Google" })).toBeDisabled();
    await act(async () => finishSecond({ data: false, error: null }));
    expect(screen.getByText(/Código no válido/)).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Continuar con Google" }));
    expect(mocks.signInWithOAuth).not.toHaveBeenCalled();
  });
  it.each(["GUS", "A".repeat(32)])("keeps validated referral %s across email confirmation", async (code) => {
    openRegister(`?ref=${code}&redirect=%2Fpricing`);
    await screen.findByText(/Código válido:/);
    fireEvent.click(screen.getByRole("button", { name: "Continuar con correo" }));
    fireEvent.change(screen.getByLabelText("Nombre completo"), { target: { value: "Lalo Corona" } });
    fireEvent.change(screen.getByLabelText("Correo electrónico"), { target: { value: "lalo@example.com" } });
    fireEvent.change(screen.getByLabelText("Contraseña"), { target: { value: "MyPassword1!" } });
    fireEvent.click(screen.getByRole("button", { name: "Crear cuenta gratis" }));
    await screen.findByRole("heading", { name: "Confirmación" });
    expect(mocks.signUp).toHaveBeenCalledWith(expect.objectContaining({ options: {
      emailRedirectTo: expect.stringContaining("/auth/continue?redirect=%2Fpricing"),
      data: { full_name: "Lalo Corona", referral_code: code },
    } }));
    expect(mocks.persistRefCode).toHaveBeenCalledWith(code);
  });
  it("preserves the affiliate destination for Google sign-up", async () => {
    openRegister("?ref=gus&redirect=%2Faffiliates%3Fleader%3Dgus");
    await screen.findByText(/Código válido:/);
    fireEvent.click(screen.getByRole("button", { name: "Continuar con Google" }));
    expect(mocks.signInWithOAuth).toHaveBeenCalledWith({ provider: "google", options: { redirectTo: expect.stringContaining("redirect=%2Faffiliates%3Fleader%3DGUS") } });
    expect(mocks.persistRefCode).toHaveBeenCalledWith("GUS");
  });
  it("clears stored attribution when the creator code is explicitly removed", async () => {
    openRegister("?ref=LALO");
    await screen.findByText(/Código válido:/);
    fireEvent.change(screen.getByLabelText("Código del creador (opcional)"), { target: { value: "" } });
    fireEvent.click(screen.getByRole("button", { name: "Continuar con Google" }));
    expect(mocks.clearStoredRefCode).toHaveBeenCalled();
    expect(mocks.persistRefCode).not.toHaveBeenCalled();
  });
  it("continues an existing session instead of asking for another account", async () => {
    mocks.getSession.mockResolvedValue({ data: { session: { user: { id: "existing" } } } });
    openRegister("?redirect=%2Fpricing");
    await screen.findByRole("heading", { name: "Confirmación" });
    expect(mocks.signUp).not.toHaveBeenCalled();
  });
});
