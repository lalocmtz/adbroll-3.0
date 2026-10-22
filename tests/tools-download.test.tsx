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
      query.single = async () => ({ data: { id: `history-${mocks.insert.mock.calls.length}`, created_at: new Date().toISOString(), ...payload }, error: null });
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
  it("opens the sales offer for an unpaid creator before requiring a video URL", async () => {
    mocks.hasPaid = false;
    await act(async () => { render(<MemoryRouter><Tools /></MemoryRouter>); });
    fireEvent.click(screen.getByRole("button", { name: "Analizar", exact: true }));
    expect(mocks.openPaywall).toHaveBeenCalledWith("analizar-video");
    expect(mocks.invoke).not.toHaveBeenCalled();
    expect(screen.queryByText(/Pega el enlace completo/)).not.toBeInTheDocument();
  });
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

  it.each([
    "Descargas pausadas. El equipo debe revisar el plan, saldo o permisos del servicio de descarga.",
    "Descargas pausadas: se agotó la cuota mensual del servicio de descarga.",
  ])("offers the catalog and saved analyses when downloads are unavailable: %s", async (message) => {
    mocks.history = [{ id: "saved-video", video_url: url, created_at: new Date().toISOString(), result: {
      transcript: "Guion que ya estaba guardado.", segments: [], insights: null, variants: [],
    } }];
    mocks.invoke.mockResolvedValueOnce({ data: null, error: { context: { json: async () => ({ error: message }) } } });
    await start();
    expect(screen.getByRole("alert")).toHaveTextContent("Descargas temporalmente pausadas");
    expect(screen.getByRole("link", { name: "Explorar videos disponibles" })).toHaveAttribute("href", "/app");
    expect(screen.queryByText(/Llegaste al límite/)).not.toBeInTheDocument();
    expect(mocks.invoke).toHaveBeenCalledOnce();
    expect(mocks.insert).not.toHaveBeenCalled();
    await act(async () => { fireEvent.click(screen.getAllByRole("button", { name: /tiktok.com/ })[0]); });
    expect(screen.getByText("Guion que ya estaba guardado.")).toBeVisible();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(mocks.invoke).toHaveBeenCalledOnce();
  });

  it("checks the same link directly after service restoration instead of only resetting the form", async () => {
    mocks.invoke
      .mockResolvedValueOnce({ data: null, error: { context: { json: async () => ({ error: "Descargas pausadas: se agotó la cuota mensual del servicio de descarga." }) } } })
      .mockResolvedValueOnce({ data: { status: "ready" }, error: null })
      .mockResolvedValueOnce({ data: sharedAnalysis, error: null });
    await start();
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Volver a comprobar" })); });
    expect(mocks.invoke.mock.calls.map(([name]) => name)).toEqual(["catalog-download", "catalog-download", "analyze-catalog-link"]);
    expect(mocks.invoke.mock.calls.every(([, args]) => args.body.videoUrl === url)).toBe(true);
    expect(screen.getByText(sharedAnalysis.transcript)).toBeVisible();
    expect(mocks.insert).toHaveBeenCalledOnce();
  });

  it("directs ambiguous download starts to support without offering an unsafe retry", async () => {
    mocks.invoke.mockResolvedValueOnce({ data: null, error: { context: { json: async () => ({ error: "No se pudo confirmar el inicio de la descarga. Contacta a soporte para revisarla." }) } } });
    await start();
    expect(screen.getByRole("alert")).toHaveTextContent("Necesitamos revisar esta descarga");
    expect(screen.getByRole("link", { name: "Contactar soporte" })).toHaveAttribute("href", "/support");
    expect(screen.queryByRole("button", { name: /Intentar de nuevo|Volver a comprobar/ })).not.toBeInTheDocument();
    expect(mocks.invoke).toHaveBeenCalledOnce();
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
    expect(screen.getByRole("button", { name: "Consultar estado" })).toBeEnabled();
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

  it("accepts legacy base analysis without variants and creates variants only on explicit request", async () => {
    mocks.invoke
      .mockResolvedValueOnce({ data: { status: "ready" }, error: null })
      .mockResolvedValueOnce({ data: { ...sharedAnalysis, analysis: { hook: "Una demostración", body: "Explica el producto", cta: null }, variants: null }, error: null })
      .mockResolvedValueOnce({ data: { variants: [1, 2, 3].map(n => ({ hook: `Inicio ${n}`, body: `Cuerpo ${n}`, cta: `Acción ${n}`, strategy_note: "Otra forma de contarlo" })) }, error: null });
    await start();
    expect(screen.queryByText("No se pudo analizar")).not.toBeInTheDocument();
    expect(mocks.insert.mock.calls[0][0].result.variants).toEqual([]);
    expect(mocks.invoke).toHaveBeenCalledTimes(2);
    await act(async () => { fireEvent.mouseDown(screen.getByRole("tab", { name: "Variantes" }), { button: 0, ctrlKey: false }); });
    expect(mocks.invoke).toHaveBeenCalledTimes(2);
    // Editing the input must not reattribute the saved analysis/variants to another video.
    fireEvent.change(screen.getByRole("textbox", { name: "Enlace completo del video de TikTok" }), { target: { value: "https://www.tiktok.com/@other/video/123456" } });
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Generar 3 variantes" })); });
    expect(mocks.invoke).toHaveBeenLastCalledWith("generate-script-variants", { body: { transcript: sharedAnalysis.transcript, variantCount: 3, changeLevel: "medium" } });
    expect(screen.getByText("Inicio 1")).toBeInTheDocument();
    expect(mocks.insert.mock.calls[1][0]).toMatchObject({ video_url: url, result: { variants: [{ hook: "Inicio 1" }, { hook: "Inicio 2" }, { hook: "Inicio 3" }] } });
  });

  it("does not expose provider details when explicit variant generation fails", async () => {
    mocks.invoke
      .mockResolvedValueOnce({ data: { status: "ready" }, error: null })
      .mockResolvedValueOnce({ data: { ...sharedAnalysis, variants: null }, error: null })
      .mockResolvedValueOnce({ data: { error: "Gemini rejected API_KEY token" }, error: null });
    await start();
    await act(async () => { fireEvent.mouseDown(screen.getByRole("tab", { name: "Variantes" }), { button: 0, ctrlKey: false }); });
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Generar 3 variantes" })); });
    expect(screen.getByRole("alert")).toHaveTextContent("No se pudieron crear las variantes. Inténtalo de nuevo.");
    expect(screen.queryByText(/Gemini|API_KEY/)).not.toBeInTheDocument();
    expect(mocks.insert).toHaveBeenCalledOnce();
  });

  it("keeps variant generation Pro-only when opening a saved analysis", async () => {
    mocks.hasPaid = false;
    mocks.history = [{ id: "saved-video", video_url: url, created_at: new Date().toISOString(), result: { transcript: "Guion guardado.", insights: null, variants: [] } }];
    await act(async () => { render(<MemoryRouter><Tools /></MemoryRouter>); });
    await act(async () => { fireEvent.click(screen.getAllByRole("button", { name: /tiktok.com/ })[0]); });
    await act(async () => { fireEvent.mouseDown(screen.getByRole("tab", { name: "Variantes" }), { button: 0, ctrlKey: false }); });
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Generar 3 variantes" })); });
    expect(mocks.openPaywall).toHaveBeenCalledWith("Variantes de guion");
    expect(mocks.invoke).not.toHaveBeenCalled();
  });

  it("discards a late variant result after switching to another saved video", async () => {
    mocks.history = [{ id: "saved-video", video_url: url, created_at: new Date().toISOString(), result: { transcript: "Otro guion guardado.", insights: null, variants: [] } }];
    let finishVariants!: (value: unknown) => void;
    mocks.invoke
      .mockResolvedValueOnce({ data: { status: "ready" }, error: null })
      .mockResolvedValueOnce({ data: { ...sharedAnalysis, variants: null }, error: null })
      .mockImplementationOnce(() => new Promise(resolve => { finishVariants = resolve; }));
    await start();
    await act(async () => { fireEvent.mouseDown(screen.getByRole("tab", { name: "Variantes" }), { button: 0, ctrlKey: false }); });
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Generar 3 variantes" })); });
    expect(screen.getByRole("button", { name: "Preparando variantes…" })).toBeDisabled();
    await act(async () => { fireEvent.click(screen.getAllByRole("button", { name: /tiktok.com/ })[1]); });
    await act(async () => { finishVariants({ data: { variants: [1, 2, 3].map(n => ({ hook: `Fuera de fecha ${n}`, body: "Cuerpo viejo", cta: "CTA vieja" })) }, error: null }); });
    expect(screen.getByText("Otro guion guardado.")).toBeInTheDocument();
    expect(screen.queryByText(/Fuera de fecha/)).not.toBeInTheDocument();
    expect(mocks.insert).toHaveBeenCalledOnce();
  });

  it("keeps the complete transcript and hides unverified timing in Tools", async () => {
    mocks.invoke
      .mockResolvedValueOnce({ data: { status: "ready" }, error: null })
      .mockResolvedValueOnce({ data: { ...sharedAnalysis, segments: [{ start_seconds: 66, end_seconds: 121, text: "Solo un fragmento" }] }, error: null });
    await start();
    expect(screen.getByText(sharedAnalysis.transcript)).toBeVisible();
    expect(screen.queryByRole('list', { name: 'Guion por segundos' })).not.toBeInTheDocument();
    expect(screen.queryByText(/2:01/)).not.toBeInTheDocument();
    await act(async () => { fireEvent.mouseDown(screen.getByRole('tab', { name: 'Análisis' }), { button: 0, ctrlKey: false }); });
    expect(screen.queryByText(/Primera frase transcrita/)).not.toBeInTheDocument();
    expect(screen.getByText('Abre con una demostración')).toBeVisible();
    expect(document.querySelectorAll('video')).toHaveLength(0);
  });

});
