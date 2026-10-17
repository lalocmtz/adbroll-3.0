import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { BlurGateProvider, useBlurGateContext } from "@/contexts/BlurGateContext";
import { SubscriptionGate } from "@/components/SubscriptionGate";
import PricingModal from "@/components/PricingModal";
import PreviewBanner from "@/components/PreviewBanner";
import Pricing from "@/pages/Pricing";
import Unlock from "@/pages/Unlock";
import { proReturnTo } from "@/hooks/useProOffer";

const mocks = vi.hoisted(() => ({ paid: false, loggedIn: false, loading: false, start: vi.fn() }));
vi.mock("@/hooks/useBlurGate", () => ({ useBlurGate: () => ({ hasPaid: mocks.paid, isLoggedIn: mocks.loggedIn, loading: mocks.loading }) }));
vi.mock("@/hooks/useSubscription", () => ({ useSubscription: () => ({ isPro: mocks.paid, loading: mocks.loading }) }));
vi.mock("@/lib/checkout", () => ({ useStartCheckout: () => ({ startWithReferral: mocks.start, loading: false }) }));
vi.mock("@/lib/attribution", () => ({ getStoredRefCode: () => null, persistRefCode: vi.fn(), clearStoredRefCode: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { auth: { getSession: async () => ({ data: { session: null }, error: null }) } } }));

const Target = () => { const location = useLocation(); return <><p>{location.pathname + location.search}</p><p>{location.state?.returnTo}</p></>; };
const Trigger = () => { const { openPaywall } = useBlurGateContext(); return <button onClick={() => openPaywall("Guion")}>Abrir función Pro</button>; };
function routeContent(content: React.ReactNode, from = "/tools") {
  render(<MemoryRouter initialEntries={[from]}><Routes><Route path="*" element={content} /><Route path="/pricing" element={<Target />} /></Routes></MemoryRouter>);
}
beforeEach(() => {
  vi.clearAllMocks(); mocks.paid = false; mocks.loggedIn = false; mocks.loading = false;
  vi.spyOn(window, "scrollTo").mockImplementation(() => {});
});

describe("one Pro sales destination", () => {
  it.each([false, true])("sends unpaid access to /pricing for loggedIn=%s without opening checkout", async loggedIn => {
    mocks.loggedIn = loggedIn;
    routeContent(<BlurGateProvider><Trigger /></BlurGateProvider>, "/products?name=Producto");
    fireEvent.click(screen.getByRole("button", { name: "Abrir función Pro" }));
    expect(await screen.findByText("/pricing")).toBeVisible();
    expect(screen.getByText("/products?name=Producto")).toBeVisible();
    expect(mocks.start).not.toHaveBeenCalled();
  });
  it.each([[true, false], [false, true]])("does not open a paywall for paid=%s, loading=%s", (paid, loading) => {
    mocks.paid = paid;
    mocks.loading = loading;
    routeContent(<BlurGateProvider><Trigger /></BlurGateProvider>);
    fireEvent.click(screen.getByRole("button", { name: "Abrir función Pro" }));
    expect(screen.queryByText("/pricing")).not.toBeInTheDocument();
  });
  it("routes legacy pricing modals to the full sales page", async () => {
    routeContent(<PricingModal open onOpenChange={vi.fn()} />);
    expect(await screen.findByText("/pricing")).toBeVisible();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(mocks.start).not.toHaveBeenCalled();
  });
  it("routes a denied subscription gate to pricing and preserves allowed content", async () => {
    routeContent(<SubscriptionGate><h1>Contenido Pro</h1></SubscriptionGate>);
    expect(await screen.findByText("/pricing")).toBeVisible();
    expect(screen.queryByRole("heading", { name: "Contenido Pro" })).not.toBeInTheDocument();
  });
  it("leaves authorized content visible", () => {
    mocks.paid = true;
    routeContent(<SubscriptionGate><h1>Contenido Pro</h1></SubscriptionGate>);
    expect(screen.getByRole("heading", { name: "Contenido Pro" })).toBeVisible();
  });
  it("opens pricing from the preview banner without creating a checkout session", async () => {
    routeContent(<PreviewBanner />);
    fireEvent.click(screen.getByRole("button", { name: "Continuar con Pro" }));
    expect(await screen.findByText("/pricing")).toBeVisible();
    expect(mocks.start).not.toHaveBeenCalled();
  });
  it("canonicalizes old /unlock links while retaining a referral code", async () => {
    routeContent(<Unlock />, "/unlock?ref=GUS");
    expect(await screen.findByText("/pricing?ref=GUS")).toBeVisible();
  });
  it("keeps the explicit purchase CTA functional and links back to the prior content", async () => {
    render(<MemoryRouter initialEntries={[{ pathname: "/pricing", state: { returnTo: "/videos/product/product-1" } }]}><Pricing /></MemoryRouter>);
    expect(screen.getByRole("link", { name: "Volver al catálogo" })).toHaveAttribute("href", "/videos/product/product-1");
    fireEvent.click(await screen.findByRole("button", { name: "Crear cuenta y ver Pro" }));
    expect(mocks.start).toHaveBeenCalledWith("");
    expect(screen.getByText("US$15")).toBeVisible();
  });
});

describe("safe sales return locations", () => {
  it.each(["https://evil.example", "//evil.example", "/\\evil.example", "/pricing", "/login", "/admin", "/app/../admin", null])("rejects %s", value => {
    expect(proReturnTo(value)).toBe("/app");
  });
  it.each(["/tools", "/opportunities", "/products?name=Un%20producto", "/videos/creator/abc-123"])("retains %s", value => {
    expect(proReturnTo(value)).toBe(value);
  });
});
