import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Tools from "@/pages/Tools";

const mocks = vi.hoisted(() => ({ invoke: vi.fn(), insert: vi.fn(), toast: vi.fn(), hasPaid: true, openPaywall: vi.fn(), getUser: vi.fn(), history: [] as any[] }));
vi.mock("@/contexts/LanguageContext", () => ({ useLanguage: () => ({ language: "es" }) }));
vi.mock("@/contexts/BlurGateContext", () => ({ useBlurGateContext: () => ({ hasPaid: mocks.hasPaid, isLoggedIn: true, openPaywall: mocks.openPaywall }) }));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: mocks.toast }) }));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: { getUser: mocks.getUser },
    functions: { invoke: mocks.invoke },
    from: () => {
      let payload: any;
      const query: any = {};
      for (const method of ["select", "eq", "order", "limit", "gte"]) query[method] = () => query;
      query.insert = (value: any) => { payload = value; mocks.insert(value); return query; };
      query.single = async () => ({ data: { id: "history-1", created_at: new Date().toISOString(), ...payload }, error: null });
      query.then = (resolve: any) => resolve({ data: mocks.history, count: 0, error: null });
      return query;
    },
  },
}));

const url = "https://www.tiktok.com/@julietaskin/video/7652957372519959828";
const sharedAnalysis = {
  cached: true,
  transcript: "Este es el guion compartido del video.",
  segments: [{ start_ms: 0, end_ms: 2000, text: "Este es el guion compartido del video." }],
  analysis: {
    hook: "Abre con una demostración", body: "Explica y demuestra", cta: "Revisa los detalles",
    visual_observations: ["Muestra el producto"], beginner_takeaways: ["Demuestra el uso"], uncertainties: ["No demuestra causalidad de ventas"],
  },
  variants: { hooks: ["Prueba esto", "Mira este detalle", "Así lo uso"], body_variant: "Un cuerpo adaptable" },
};

async function start() {
  await act(async () => { render(<MemoryRouter><Tools /></MemoryRouter>); });
  await act(async () => {
    fireEvent.change(screen.getByPlaceholderText("https://tiktok.com/@usuario/video/..."), { target: { value: url } });
    fireEvent.click(screen.getByRole("button", { name: "Analizar", exact: true }));
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.hasPaid = true;
  mocks.history = [];
  mocks.getUser.mockResolvedValue({ data: { user: { id: "paid-user" } }, error: null });
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }));
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe("download and shared analysis flow", () => {
  it("waits for pending media before analysis, then saves the shared result without extra AI calls", async () => {
    vi.useFakeTimers();
    mocks.invoke
      .mockResolvedValueOnce({ data: { status: "pending", retryAfterSeconds: 3 }, error: null })
      .mockResolvedValueOnce({ data: { status: "ready" }, error: null })
      .mockResolvedValueOnce({ data: sharedAnalysis, error: null });
    await start();
    expect(screen.getByText("Obteniendo el video…")).toBeInTheDocument();
    expect(mocks.invoke.mock.calls.map(([name]) => name)).toEqual(["catalog-download"]);
    expect(mocks.insert).not.toHaveBeenCalled();
    await act(async () => { await vi.advanceTimersByTimeAsync(3000); });
    expect(mocks.invoke.mock.calls.map(([name]) => name)).toEqual(["catalog-download", "catalog-download", "analyze-catalog-link"]);
    expect(mocks.invoke.mock.calls.every(([, args]) => args.body.videoUrl === url)).toBe(true);
    expect(mocks.insert).toHaveBeenCalledOnce();
    const saved = mocks.insert.mock.calls[0][0];
    expect(saved.result.transcript).toBe(sharedAnalysis.transcript);
    expect(saved.result.insights.fortalezas).toEqual(["Demuestra el uso"]);
    expect(saved.result.variants).toHaveLength(3);
    expect(saved.result.variants[2]).toMatchObject({ hook: "Así lo uso", body: "Un cuerpo adaptable", cta: "Revisa los detalles" });
    expect(screen.getByText("Tus análisis (1)")).toBeInTheDocument();
    // Opening the saved result must never download or regenerate it again.
    await act(async () => { fireEvent.click(screen.getAllByRole("button", { name: /tiktok.com/ })[0]); });
    expect(mocks.invoke).toHaveBeenCalledTimes(3);
    expect(mocks.insert).toHaveBeenCalledOnce();
  });

  it("shows a download failure without invoking analysis or saving an empty history item", async () => {
    mocks.invoke.mockResolvedValueOnce({ data: { status: "failed", error: "El video es privado o fue eliminado." }, error: null });
    await start();
    expect(screen.getByText("El video es privado o fue eliminado.")).toBeInTheDocument();
    expect(mocks.invoke.mock.calls.map(([name]) => name)).toEqual(["catalog-download"]);
    expect(mocks.insert).not.toHaveBeenCalled();
  });

  it("bounds polling and explains that retrying reuses the same download", async () => {
    vi.useFakeTimers();
    mocks.invoke.mockResolvedValue({ data: { status: "pending", retryAfterSeconds: 3 }, error: null });
    await start();
    await act(async () => { await vi.advanceTimersByTimeAsync(90_000); });
    expect(mocks.invoke).toHaveBeenCalledTimes(30);
    expect(mocks.invoke.mock.calls.every(([name]) => name === "catalog-download")).toBe(true);
    expect(screen.getByText(/La descarga sigue en proceso/)).toBeInTheDocument();
    expect(mocks.insert).not.toHaveBeenCalled();
  });

  it("keeps unpaid users out of the provider flow", async () => {
    mocks.hasPaid = false;
    await start();
    expect(mocks.openPaywall).toHaveBeenCalledWith("analizar-video");
    expect(mocks.invoke).not.toHaveBeenCalled();
    expect(mocks.insert).not.toHaveBeenCalled();
  });

  it("reports a session failure without starting a paid provider request", async () => {
    mocks.getUser.mockRejectedValue(new Error("No se pudo verificar la sesión."));
    await start();
    expect(screen.getByText("No se pudo verificar la sesión.")).toBeInTheDocument();
    expect(mocks.invoke).not.toHaveBeenCalled();
    expect(mocks.insert).not.toHaveBeenCalled();
  });

  it("keeps the selected history item when a previous download finishes", async () => {
    mocks.history = [{ id: "saved-video", video_url: url, created_at: new Date().toISOString(), result: {
      transcript: "Guion guardado que eligió el usuario.", segments: [], insights: null, variants: [],
    } }];
    let resolveDownload!: (value: unknown) => void;
    mocks.invoke.mockImplementationOnce(() => new Promise(resolve => { resolveDownload = resolve; }));
    await start();
    await act(async () => { fireEvent.click(screen.getAllByRole("button", { name: /tiktok.com/ })[0]); });
    await act(async () => { resolveDownload({ data: { status: "ready" }, error: null }); });
    expect(screen.getByText("Guion guardado que eligió el usuario.")).toBeInTheDocument();
    expect(mocks.invoke).toHaveBeenCalledOnce();
    expect(mocks.insert).not.toHaveBeenCalled();
  });

});
