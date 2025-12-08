import { useEffect, useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { MarketProvider } from "@/contexts/MarketContext";
import { BlurGateProvider } from "@/contexts/BlurGateContext";
import DashboardLayout from "@/components/layout/DashboardLayout";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Unlock from "./pages/Unlock";
import Dashboard from "./pages/Dashboard";
import Products from "./pages/Products";
import Creators from "./pages/Creators";
import Favorites from "./pages/Favorites";
import Tools from "./pages/Tools";
import Settings from "./pages/Settings";
import Support from "./pages/Support";
import Admin from "./pages/Admin";
import RelatedVideos from "./pages/RelatedVideos";
import Opportunities from "./pages/Opportunities";
import Affiliates from "./pages/Affiliates";
import FAQ from "./pages/FAQ";
import Privacy from "./pages/Privacy";
import Terms from "./pages/Terms";
import RefundPolicy from "./pages/RefundPolicy";
import About from "./pages/About";
import Pricing from "./pages/Pricing";
import CheckoutSuccess from "./pages/CheckoutSuccess";
import CheckoutCancel from "./pages/CheckoutCancel";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

// APP-FIRST: All app routes are viewable, but gated by blur/paywall
const AppRoute = ({ 
  children, 
  session,
  requiresAuth = false 
}: { 
  children: React.ReactNode; 
  session: Session | null;
  requiresAuth?: boolean;
}) => {
  // Admin routes require auth
  if (requiresAuth && !session) {
    return <Navigate to="/login" replace />;
  }
  
  return (
    <DashboardLayout>
      {children}
    </DashboardLayout>
  );
};

const App = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Capture referral code from URL on initial load and save to localStorage
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const refCode = urlParams.get("ref");
    if (refCode) {
      localStorage.setItem("adbroll_ref_code", refCode.toUpperCase());
    }
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Cargando...</p>
      </div>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <LanguageProvider>
          <MarketProvider>
              <Toaster />
              <Sonner />
              <BrowserRouter>
                <BlurGateProvider>
                <Routes>
                  {/* APP-FIRST: Redirect home to app */}
                  <Route path="/" element={<Navigate to="/app" replace />} />
                  
                  {/* Auth routes */}
                  <Route path="/login" element={<Login />} />
                  <Route path="/register" element={<Register />} />
                  
                  {/* Unlock page (paywall landing) */}
                  <Route path="/unlock" element={<Unlock />} />
                  
                  {/* Public info pages */}
                  <Route path="/faq" element={<FAQ />} />
                  <Route path="/privacy" element={<Privacy />} />
                  <Route path="/terms" element={<Terms />} />
                  <Route path="/refund-policy" element={<RefundPolicy />} />
                  <Route path="/about" element={<About />} />
                  <Route path="/pricing" element={<Pricing />} />
                  <Route path="/checkout/success" element={<CheckoutSuccess />} />
                  <Route path="/checkout/cancel" element={<CheckoutCancel />} />
                  
                  {/* APP-FIRST: Main app routes (viewable by all, gated by blur) */}
                  <Route
                    path="/app"
                    element={
                      <AppRoute session={session}>
                        <Dashboard />
                      </AppRoute>
                    }
                  />
                  <Route
                    path="/products"
                    element={
                      <AppRoute session={session}>
                        <Products />
                      </AppRoute>
                    }
                  />
                  <Route
                    path="/creadores"
                    element={
                      <AppRoute session={session}>
                        <Creators />
                      </AppRoute>
                    }
                  />
                  <Route
                    path="/favorites"
                    element={
                      <AppRoute session={session}>
                        <Favorites />
                      </AppRoute>
                    }
                  />
                  <Route
                    path="/tools"
                    element={
                      <AppRoute session={session}>
                        <Tools />
                      </AppRoute>
                    }
                  />
                  <Route
                    path="/settings"
                    element={
                      <AppRoute session={session}>
                        <Settings />
                      </AppRoute>
                    }
                  />
                  <Route
                    path="/support"
                    element={
                      <AppRoute session={session}>
                        <Support />
                      </AppRoute>
                    }
                  />
                  <Route
                    path="/opportunities"
                    element={
                      <AppRoute session={session}>
                        <Opportunities />
                      </AppRoute>
                    }
                  />
                  <Route
                    path="/affiliates"
                    element={
                      <AppRoute session={session}>
                        <Affiliates />
                      </AppRoute>
                    }
                  />
                  <Route
                    path="/videos/product/:productId"
                    element={
                      <AppRoute session={session}>
                        <RelatedVideos />
                      </AppRoute>
                    }
                  />
                  <Route
                    path="/videos/creator/:creatorId"
                    element={
                      <AppRoute session={session}>
                        <RelatedVideos />
                      </AppRoute>
                    }
                  />
                  
                  {/* Admin routes - require auth */}
                  <Route
                    path="/admin/import"
                    element={
                      <AppRoute session={session} requiresAuth>
                        <Admin />
                      </AppRoute>
                    }
                  />
                  <Route
                    path="/admin"
                    element={<Navigate to="/admin/import" replace />}
                  />
                  
                  <Route path="*" element={<NotFound />} />
                </Routes>
                </BlurGateProvider>
              </BrowserRouter>
          </MarketProvider>
        </LanguageProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;