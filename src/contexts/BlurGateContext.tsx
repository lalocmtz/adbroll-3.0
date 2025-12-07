import { createContext, useContext, ReactNode, useState } from "react";
import { useBlurGate, BlurGateState } from "@/hooks/useBlurGate";
import { PaywallModal } from "@/components/PaywallModal";

interface BlurGateContextValue extends BlurGateState {
  openPaywall: (feature?: string) => void;
  closePaywall: () => void;
}

const BlurGateContext = createContext<BlurGateContextValue | null>(null);

export const BlurGateProvider = ({ children }: { children: ReactNode }) => {
  const blurState = useBlurGate();
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [paywallFeature, setPaywallFeature] = useState<string | undefined>();

  const openPaywall = (feature?: string) => {
    setPaywallFeature(feature);
    setPaywallOpen(true);
  };

  const closePaywall = () => {
    setPaywallOpen(false);
    setPaywallFeature(undefined);
  };

  return (
    <BlurGateContext.Provider value={{ ...blurState, openPaywall, closePaywall }}>
      {children}
      <PaywallModal 
        open={paywallOpen} 
        onClose={closePaywall} 
        feature={paywallFeature}
      />
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