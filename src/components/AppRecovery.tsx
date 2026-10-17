import { Component, type ErrorInfo, type ReactNode } from 'react';

export function AppRecovery() {
  return <main className="min-h-dvh bg-brand-ink text-brand-mist flex items-center justify-center p-6">
    <section role="alert" aria-labelledby="recovery-title" className="w-full max-w-md rounded-2xl border border-white/15 p-6 sm:p-8">
      <p className="text-xl font-bold">Tok<span className="text-brand-pink">Xray</span></p>
      <h1 id="recovery-title" className="mt-6 text-2xl font-bold">No pudimos abrir esta página</h1>
      <p className="mt-3 text-sm leading-relaxed text-brand-mist/70">Puede haber una actualización o un problema de conexión. Revisa tu internet y vuelve a intentarlo. Conservarás el enlace en el que estás.</p>
      <button type="button" onClick={() => window.location.reload()} className="mt-6 min-h-11 w-full rounded-xl bg-brand-pink px-4 py-3 font-semibold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-cyan">Volver a intentar</button>
      <a href="mailto:contacto@tokxray.com" className="mt-3 flex min-h-11 items-center justify-center text-sm underline underline-offset-4">Contactar a soporte</a>
    </section>
  </main>;
}

/** React can still reject a lazy component after Vite suppresses its import
 * error; keep that rejection from leaving a blank root. */
export class AppRecoveryBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(_error: Error, _info: ErrorInfo) { /* Never expose raw URLs or auth tokens in fallback copy. */ }
  render() { return this.state.failed ? <AppRecovery /> : this.props.children; }
}
