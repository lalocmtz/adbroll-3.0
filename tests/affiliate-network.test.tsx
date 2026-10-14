import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { AffiliateNetworkPanel, type AffiliateNetwork } from "@/components/AffiliateNetworkPanel";

const mocks = vi.hoisted(() => ({ rpc: vi.fn(), toast: vi.fn(), refresh: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { rpc: mocks.rpc } }));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: mocks.toast }) }));
const network: AffiliateNetwork = {
  leader: null, can_join: true, direct_creators: 3, indirect_creators: 8,
  direct_customers: 10, direct_active_customers: 6, indirect_customers: 20, indirect_active_customers: 15,
  direct_earned: 143.5, indirect_earned: 21.75,
  members: [{ code: "CREATOR", email_masked: "c***@test.com", joined_at: "2026-10-13", customers: 20, active_customers: 15, leader_earned: 21.75 }],
  indirect_commissions: [{ amount: 1.45, type: "leader_recurring", month: "2026-10", status: "pending", date: "2026-10-13" }],
};
function open(path = "/affiliates?leader=LALO") {
  return render(<MemoryRouter initialEntries={[path]}><AffiliateNetworkPanel code="MYCODE" onJoined={mocks.refresh} /></MemoryRouter>);
}
beforeEach(() => {
  vi.resetAllMocks();
  mocks.rpc.mockResolvedValue({ data: network, error: null });
});
describe("affiliate community", () => {
  it("does not link a creator from the invite URL until they explicitly accept", async () => {
    open();
    const button = await screen.findByRole("button", { name: "Aceptar invitación de comunidad" });
    expect(screen.getByLabelText("Código del líder")).toHaveValue("LALO");
    expect(button).toBeDisabled();
    expect(mocks.rpc).toHaveBeenCalledTimes(1);
    expect(mocks.rpc).toHaveBeenCalledWith("get_affiliate_network");
    fireEvent.click(screen.getByRole("checkbox"));
    mocks.rpc.mockImplementation(async (name: string) => name === "join_affiliate_network"
      ? { data: { success: true }, error: null }
      : { data: { ...network, leader: { code: "LALO", joined_at: "2026-10-13" } }, error: null });
    fireEvent.click(button);
    await waitFor(() => expect(mocks.rpc).toHaveBeenCalledWith("join_affiliate_network", { p_leader_code: "LALO", p_accept_terms: true }));
    expect(await screen.findByText("Tu comunidad:")).toBeInTheDocument();
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
    expect(mocks.refresh).toHaveBeenCalledOnce();
  });
  it("clears consent when the leader code changes and surfaces server rejection", async () => {
    open();
    await screen.findByRole("checkbox");
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.change(screen.getByLabelText("Código del líder"), { target: { value: "OTHER" } });
    expect(screen.getByRole("checkbox")).not.toBeChecked();
    expect(screen.getByRole("button", { name: "Aceptar invitación de comunidad" })).toBeDisabled();
    fireEvent.click(screen.getByRole("checkbox"));
    mocks.rpc.mockResolvedValueOnce({ data: null, error: { message: "No puedes invitarte a ti mismo" } });
    fireEvent.click(screen.getByRole("button", { name: "Aceptar invitación de comunidad" }));
    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith(expect.objectContaining({ description: "No puedes invitarte a ti mismo", variant: "destructive" })));
    expect(mocks.refresh).not.toHaveBeenCalled();
  });
  it("distinguishes members, customers and earned indirect commission with no deeper-level promise", async () => {
    open();
    expect(await screen.findByText("Creadores invitados directamente")).toBeInTheDocument();
    expect(screen.getByText("Clientes indirectos registrados")).toBeInTheDocument();
    expect(screen.getByText("Ganado por renovaciones indirectas (5%)")).toBeInTheDocument();
    expect(screen.getByText(/sus ventas no te generan comisión/)).toBeInTheDocument();
    expect(screen.getByText("CREATOR")).toBeInTheDocument();
    expect(screen.getByText("c***@test.com")).toBeInTheDocument();
    // Historical earned amounts are server data, not recalculated at today's price.
    expect(screen.getByText(/1\.45 USD/)).toBeInTheDocument();
    expect(screen.getByText(/US\$15 × 5% = US\$0\.75/)).toBeInTheDocument();
    expect(screen.getByLabelText("Enlace para invitar creadores a tu comunidad")).toHaveValue("https://tokxray.com/programa-creadores?leader=MYCODE");
  });
  it("does not present failed RPC loads as a zero balance and can retry", async () => {
    mocks.rpc.mockRejectedValueOnce(new Error("offline"));
    open();
    expect(await screen.findByRole("alert")).toHaveTextContent("No pudimos cargar tu comunidad");
    expect(screen.queryByText("Ganado por renovaciones indirectas (5%)")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(await screen.findByText("Ganado por renovaciones indirectas (5%)")).toBeInTheDocument();
  });
});
