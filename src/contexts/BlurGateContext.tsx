import { createContext, useContext, ReactNode } from "react";
import { useBlurGate, BlurGateState } from "@/hooks/useBlurGate";
import { useProOffer } from "@/hooks/useProOffer";

interface BlurGateContextValue extends BlurGateState {
  openPaywall: (feature?: string) => void;
  closePaywall: () => void;
}

const BlurGateContext = createContext<BlurGateContextValue | null>(null);

export const BlurGateProvider = ({ children }: { children: ReactNode }) => {
  const blurState = useBlurGate();
  const showProOffer = useProOffer();

  const openPaywall = (_feature?: string) => {
    if (blurState.loading || blurState.hasPaid) return;
    showProOffer();
  };

  const closePaywall = () => {
    // Retained for legacy callers; Pro now has its own page, not a modal.
  };

  return (
    <BlurGateContext.Provider value={{ ...blurState, openPaywall, closePaywall }}>
      {children}
    </BlurGateContext.Provider>
  );
};

export const useBlurGateContext = () => {
  const context = useContext(BlurGateContext);
  if (!context) {
    throw new Error("useBlurGateContext must be used within a BlurGateProvider");
  }
  return context;
};

export default BlurGateContext;
