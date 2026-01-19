import { useEffect, useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { MarketProvider } from "@/contexts/MarketContext";
import { BlurGateProvider } from "@/contexts/BlurGateContext";
import { trackPageView } from "@/lib/analytics";
import DashboardLayout from "@/components/layout/DashboardLayout";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Unlock from "./pages/Unlock";
import Dashboard from "./pages/Dashboard";
import Products from "./pages/Products";
import Creators from "./pages/Creators";
import Talent from "./pages/Talent";
import Favorites from "./pages/Favorites";
import Library from "./pages/Library";
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
import Campaigns from "./pages/Campaigns";
import CampaignDetail from "./pages/CampaignDetail";
import MySubmissions from "./pages/MySubmissions";
import BrandDashboard from "./pages/brand/BrandDashboard";
import BrandCampaigns from "./pages/brand/BrandCampaigns";
import BrandSubmissions from "./pages/brand/BrandSubmissions";
import BrandUpgrade from "./pages/brand/BrandUpgrade";
import BrandRegister from "./pages/brand/BrandRegister";
import CreatorProgram from "./pages/CreatorProgram";
import Redeem from "./pages/Redeem";

const queryClient = new QueryClient();

// Page tracking component that uses useLocation inside BrowserRouter
const PageTracker = () => {
  const location = useLocation();
  
  useEffect(() => {
    trackPageView(location.pathname);
  }, [location.pathname]);
  
  return null;
};


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
        <MarketProvider>
          <LanguageProvider>
              <Toaster />
              <Sonner />
              <BrowserRouter>
                <PageTracker />
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
                  <Route path="/programa-creadores" element={<CreatorProgram />} />
                  <Route path="/canjear" element={<Redeem />} />
                  
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
                    path="/ranking-creadores"
                    element={
                      <AppRoute session={session}>
                        <Creators />
                      </AppRoute>
                    }
                  />
                  <Route path="/creadores" element={<Navigate to="/ranking-creadores" replace />} />
                  <Route path="/contrata-creadores" element={<Navigate to="/talento" replace />} />
                  <Route
                    path="/talento"
                    element={
                      <AppRoute session={session}>
                        <Talent />
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
                    path="/library"
                    element={
                      <AppRoute session={session}>
                        <Library />
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
                  
                  {/* Campaigns routes */}
                  <Route
                    path="/campaigns"
                    element={
                      <AppRoute session={session}>
                        <Campaigns />
                      </AppRoute>
                    }
                  />
                  <Route
                    path="/campaigns/:id"
                    element={
                      <AppRoute session={session}>
                        <CampaignDetail />
                      </AppRoute>
                    }
                  />
                  <Route
                    path="/my-submissions"
                    element={
                      <AppRoute session={session}>
                        <MySubmissions />
                      </AppRoute>
                    }
                  />
                  
                  {/* Brand routes - require auth */}
                  <Route
                    path="/brand/dashboard"
                    element={
                      <AppRoute session={session} requiresAuth>
                        <BrandDashboard />
                      </AppRoute>
                    }
                  />
                  <Route
                    path="/brand/campaigns"
                    element={
                      <AppRoute session={session} requiresAuth>
                        <BrandCampaigns />
                      </AppRoute>
                    }
                  />
                  <Route
                    path="/brand/campaigns/:id/submissions"
                    element={
                      <AppRoute session={session} requiresAuth>
                        <BrandSubmissions />
                      </AppRoute>
                    }
                  />
                  <Route
                    path="/brand/upgrade"
                    element={
                      <AppRoute session={session} requiresAuth>
                        <BrandUpgrade />
                      </AppRoute>
                    }
                    />
                  <Route
                    path="/brand/register"
                    element={
                      <AppRoute session={session} requiresAuth>
                        <BrandRegister />
                      </AppRoute>
                    }
                  />
                  <Route
                    path="/brand"
                    element={<Navigate to="/brand/dashboard" replace />}
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
          </LanguageProvider>
        </MarketProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;