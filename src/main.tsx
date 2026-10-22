import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import { AppRecovery, AppRecoveryBoundary } from "./components/AppRecovery";
import { createChunkRecovery, installChunkRecovery } from "./lib/chunk-recovery";
import "./index.css";

const rootElement = document.getElementById("root");

if (rootElement) {
  const root = createRoot(rootElement);
  const recover = createChunkRecovery({
    // Access storage inside the guarded operation, since the getter itself may
    // throw when browser privacy settings disable persistence.
    storage: {
      getItem: key => window.sessionStorage.getItem(key),
      setItem: (key, value) => window.sessionStorage.setItem(key, value),
    },
    online: () => navigator.onLine !== false,
    reload: () => window.location.reload(),
    showFallback: () => root.render(<AppRecovery />),
  });
  installChunkRecovery(window, recover);
  root.render(
    <StrictMode>
      <AppRecoveryBoundary><App /></AppRecoveryBoundary>
    </StrictMode>
  );
}
