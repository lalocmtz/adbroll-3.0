import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import Opportunities from "@/pages/Opportunities";
import { getComparisonProducts, salesForCommissionGoal } from "@/lib/opportunity-comparison";

const mocks = vi.hoisted(() => ({ loggedIn: true, query: vi.fn() }));
vi.mock("@/contexts/BlurGateContext", () => ({ useBlurGateContext: () => ({ isLoggedIn: mocks.loggedIn }) }));
vi.mock("@/contexts/MarketContext", () => ({ useMarket: () => ({ market: "mx" }) }));
vi.mock("@/contexts/LanguageContext", () => ({ useLanguage: () => ({ language: "es", formatMoney: (amount: number) => `$${amount}` }) }));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock("@/lib/checkout", () => ({ useStartCheckout: () => ({ start: vi.fn(), loading: false }) }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { from: mocks.query } }));

const products = [
  { id: "one", producto_nombre: "Producto Uno", earning_per_sale: 33, gmv_30d_calc: 5000, creators_active_calc: 7 },
  { id: "two", producto_nombre: "Producto Dos", earning_per_sale: 50, gmv_30d_calc: 6000, creators_active_calc: 10 },
  { id: "three", producto_nombre: "Producto Tres", earning_per_sale: null, gmv_30d_calc: null, creators_active_calc: null },
  { id: "four", producto_nombre: "Producto Cuatro", earning_per_sale: 75, gmv_30d_calc: 8000, creators_active_calc: 12 },
].map((product, index) => ({ ...product, imagen_url: null, categoria: "Belleza", opportunity_index: 100 - index, opportunity_reasons: [] }));

beforeEach(() => {
  mocks.loggedIn = true;
  mocks.query.mockImplementation(() => {
    const query: Record<string, unknown> = {};
    for (const name of ["select", "eq", "not", "order"]) query[name] = () => query;
    query.limit = async () => ({ data: products, error: null });
    return query;
  });
});

describe("commission goal arithmetic", () => {
  it("rounds up only to whole eligible sales and preserves exact multiples", () => {
    expect(salesForCommissionGoal(1000, 33)).toBe(31);
    expect(salesForCommissionGoal(1000, 50)).toBe(20);
    expect(salesForCommissionGoal(10, 50)).toBe(1);
    expect(salesForCommissionGoal(1, 0.01)).toBe(100);
  });
  it.each([null, undefined, 0, -4, NaN, Infinity])("does not invent a result for unavailable commission %s", commission => {
    expect(salesForCommissionGoal(1000, commission)).toBeNull();
  });
  it.each([0, -1, NaN, Infinity])("rejects invalid goal %s", goal => {
    expect(salesForCommissionGoal(goal, 50)).toBeNull();
  });
  it("does not display overflow or imprecise integers", () => {
    expect(salesForCommissionGoal(Number.MAX_VALUE, 0.001)).toBeNull();
  });
});

describe("comparison access", () => {
  it("drops gated and stale IDs, deduplicates selection and caps it at two", () => {
    expect(getComparisonProducts(["four", "missing", "one", "one", "two", "three"], products, false, 3).map(product => product.id)).toEqual(["one", "two"]);
    expect(getComparisonProducts(["four", "one"], products, true, 3).map(product => product.id)).toEqual(["four", "one"]);
    expect(getComparisonProducts(["four", "one"], products.slice(1), false, 2)).toEqual([]);
  });

  it("allows only the three guest previews to be selected and keeps video navigation gated", async () => {
    mocks.loggedIn = false;
    const Location = () => <p>{useLocation().pathname}</p>;
    render(<MemoryRouter initialEntries={["/oportunidades"]}><Routes><Route path="/oportunidades" element={<Opportunities />} /><Route path="/pricing" element={<Location />} /></Routes></MemoryRouter>);
    fireEvent.click(await screen.findByRole("button", { name: "Comparar: Producto Uno" }));
    expect(screen.queryByRole("button", { name: "Comparar: Producto Cuatro" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Comparar: Producto Dos" }));
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText("Producto Uno")).toBeInTheDocument();
    expect(within(dialog).queryByText("Producto Cuatro")).not.toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole("button", { name: "Ver videos de A" }));
    expect(await screen.findByText("/pricing")).toBeInTheDocument();
  });

  it("updates the scenario immediately, explains report periods and prevents adding a third product", async () => {
    render(<MemoryRouter><Opportunities /></MemoryRouter>);
    fireEvent.click(await screen.findByRole("button", { name: "Comparar: Producto Uno" }));
    fireEvent.click(screen.getByRole("button", { name: "Comparar: Producto Dos" }));
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText("31")).toBeVisible();
    expect(within(dialog).getByText("20")).toBeVisible();
    expect(within(dialog).getByText(/Los períodos pueden variar/)).toBeVisible();
    expect(within(dialog).getByText(/Es un escenario, no una predicción/)).toBeVisible();
    fireEvent.change(within(dialog).getByLabelText("Tu meta de comisiones"), { target: { value: "2000" } });
    expect(within(dialog).getByText("61")).toBeVisible();
    expect(within(dialog).getByText("40")).toBeVisible();
    fireEvent.change(within(dialog).getByLabelText("Tu meta de comisiones"), { target: { value: "" } });
    expect(within(dialog).getByRole("alert")).toHaveTextContent("mayor a $0 MXN");
    expect(within(dialog).queryByText("40")).not.toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole("button", { name: "Close" }));
    expect(screen.getByRole("button", { name: "Comparar: Producto Tres" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Limpiar comparación" }));
    expect(screen.getByRole("button", { name: "Comparar: Producto Tres" })).toBeEnabled();
  });

  it("removes previously selected private data as soon as account access changes", async () => {
    const view = render(<MemoryRouter><Opportunities /></MemoryRouter>);
    fireEvent.click(await screen.findByRole("button", { name: "Comparar: Producto Cuatro" }));
    fireEvent.click(screen.getByRole("button", { name: "Comparar: Producto Uno" }));
    expect(within(screen.getByRole("dialog")).getByText("Producto Cuatro")).toBeVisible();
    mocks.loggedIn = false;
    view.rerender(<MemoryRouter><Opportunities /></MemoryRouter>);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByRole("status", { name: "1 de 2 productos seleccionados" })).toBeVisible();
  });

  it("shows unavailable data instead of a made-up sales target", async () => {
    render(<MemoryRouter><Opportunities /></MemoryRouter>);
    fireEvent.click(await screen.findByRole("button", { name: "Comparar: Producto Uno" }));
    fireEvent.click(screen.getByRole("button", { name: "Comparar: Producto Tres" }));
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getAllByText("Sin dato")).toHaveLength(3);
    expect(within(dialog).getByText("Sin cálculo disponible")).toBeVisible();
    expect(within(dialog).getByText("31")).toBeVisible();
  });
});
