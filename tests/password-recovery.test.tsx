import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import PasswordRecovery from "@/pages/PasswordRecovery";
const auth = vi.hoisted(() => ({ getSession: vi.fn(), resetPasswordForEmail: vi.fn(), updateUser: vi.fn(), signOut: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { auth } }));
beforeEach(() => { vi.clearAllMocks(); auth.getSession.mockResolvedValue({ data: { session: null }, error: null }); });
describe("password recovery", () => {
  it("requests a recovery email with a local reset destination and neutral account disclosure", async () => {
    auth.resetPasswordForEmail.mockResolvedValue({ error: null });
    render(<MemoryRouter><PasswordRecovery /></MemoryRouter>);
    fireEvent.change(screen.getByLabelText("Correo electrónico"), { target: { value: "creator@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: "Enviar enlace de recuperación" }));
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Si existe una cuenta"));
    expect(auth.resetPasswordForEmail).toHaveBeenCalledWith("creator@example.com", { redirectTo: `${window.location.origin}/actualizar-contrasena` });
  });
  it("cannot change passwords without a valid session", async () => {
    render(<MemoryRouter><PasswordRecovery update /></MemoryRouter>);
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("El enlace venció"));
    expect(screen.getByRole("button", { name: "Guardar contraseña" })).toBeDisabled();
    expect(auth.updateUser).not.toHaveBeenCalled();
  });
  it("requires matching strong passwords and signs out after a successful update", async () => {
    auth.getSession.mockResolvedValue({ data: { session: { user: { id: "test" } } }, error: null });
    auth.updateUser.mockResolvedValue({ error: null }); auth.signOut.mockResolvedValue({ error: null });
    render(<MemoryRouter><PasswordRecovery update /></MemoryRouter>);
    await waitFor(() => expect(screen.getByRole("button", { name: "Guardar contraseña" })).toBeEnabled());
    fireEvent.change(screen.getByLabelText("Nueva contraseña"), { target: { value: "StrongPass123!" } });
    fireEvent.change(screen.getByLabelText("Repite la contraseña"), { target: { value: "Different123!" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar contraseña" }));
    expect(screen.getByRole("alert")).toHaveTextContent("no coinciden"); expect(auth.updateUser).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText("Repite la contraseña"), { target: { value: "StrongPass123!" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar contraseña" }));
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("quedó actualizada"));
    expect(auth.signOut).toHaveBeenCalledWith({ scope: "local" });
  });
});
