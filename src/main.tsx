import { createRoot } from "react-dom/client";
import * as Sentry from "@sentry/react";
import App from "./App.tsx";
import "./index.css";
import { initSentry } from "./lib/sentry";
import { initPostHog } from "./lib/analytics";

initSentry();
initPostHog();

const FallbackError = ({ resetError }: { resetError: () => void }) => (
  <div className="min-h-screen flex items-center justify-center px-6">
    <div className="max-w-md text-center space-y-4">
      <h1 className="text-2xl font-bold">Algo salió mal</h1>
      <p className="text-muted-foreground text-sm">
        Ya registramos el error y lo estamos revisando. Intenta recargar.
      </p>
      <button
        onClick={resetError}
        className="inline-flex items-center justify-center rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90"
      >
        Reintentar
      </button>
    </div>
  </div>
);

createRoot(document.getElementById("root")!).render(
  <Sentry.ErrorBoundary fallback={FallbackError}>
    <App />
  </Sentry.ErrorBoundary>,
);
