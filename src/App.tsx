import { lazy, Suspense, useEffect, useState } from "react";
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
import { Events, track, trackPageView } from "@/lib/analytics";
import { captureAttribution } from "@/lib/attribution";
import DashboardLayout from "@/components/layout/DashboardLayout";
// Landing is the first paint route — keep it eager so the hero renders immediately.
import Landing from "./pages/Landing";

// All other routes lazy-loaded so the landing payload stays small.
const Login = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Register"));
const Unlock = lazy(() => import("./pages/Unlock"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Products = lazy(() => import("./pages/Products"));
const Creators = lazy(() => import("./pages/Creators"));
const Talent = lazy(() => import("./pages/Talent"));
const Favorites = lazy(() => import("./pages/Favorites"));
const Library = lazy(() => import("./pages/Library"));
const Tools = lazy(() => import("./pages/Tools"));
const Settings = lazy(() => import("./pages/Settings"));
const Support = lazy(() => import("./pages/Support"));
const Admin = lazy(() => import("./pages/Admin"));
const RelatedVideos = lazy(() => import("./pages/RelatedVideos"));
const Affiliates = lazy(() => import("./pages/Affiliates"));
const FAQ = lazy(() => import("./pages/FAQ"));
const Privacy = lazy(() => import("./pages/Privacy"));
const Terms = lazy(() => import("./pages/Terms"));
const RefundPolicy = lazy(() => import("./pages/RefundPolicy"));
const About = lazy(() => import("./pages/About"));
const Pricing = lazy(() => import("./pages/Pricing"));
const CheckoutSuccess = lazy(() => import("./pages/CheckoutSuccess"));
const CheckoutCancel = lazy(() => import("./pages/CheckoutCancel"));
const NotFound = lazy(() => import("./pages/NotFound"));
const CreatorProgram = lazy(() => import("./pages/CreatorProgram"));
const Redeem = lazy(() => import("./pages/Redeem"));
const VideoAttribution = lazy(() => import("./pages/admin/VideoAttribution"));
const RecruitGDL = lazy(() => import("./pages/RecruitGDL"));

const RouteFallback = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="h-8 w-8 rounded-full border-2 border-brand-pink/30 border-t-brand-pink animate-spin" />
  </div>
);

const queryClient = new QueryClient();

// Page tracking + first-touch attribution. On "/" we also fire
// landing.viewed with the full UTM payload and partner_link_clicked
// once per SPA session when a ref_code is present.
const PageTracker = () => {
  const location = useLocation();

  useEffect(() => {
    trackPageView(location.pathname + location.search);

    if (location.pathname === "/") {
      const { payload, isNewPartnerSession } = captureAttribution();

      track(Events.LandingViewed, {
        utm_source: payload.utm_source,
        utm_medium: payload.utm_medium,
        utm_campaign: payload.utm_campaign,
        utm_content: payload.utm_content,
        utm_term: payload.utm_term,
        referrer: payload.referrer,
        ref_code: payload.ref_code,
      });

      if (payload.ref_code && isNewPartnerSession) {
        track(Events.PartnerLinkClicked, {
          ref_code: payload.ref_code,
          landing_path: payload.landing_path,
          utm_source: payload.utm_source,
        });
      }
    }
  }, [location.pathname, location.search]);

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
    } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);

      // Fire TrialStarted once-per-user on first SIGNED_IN after OAuth.
      // The email/password path fires it inline in Register.tsx, but the
      // Google OAuth path redirects away before we can fire — catch it
      // here. localStorage guard keyed by user id prevents re-fire on
      // subsequent logins.
      if (event === "SIGNED_IN" && session?.user) {
        const userId = session.user.id;
        const guardKey = `adbroll_trial_fired_${userId}`;
        if (!localStorage.getItem(guardKey)) {
          const provider = session.user.app_metadata?.provider || "email";
          track(Events.TrialStarted, {
            method: provider,
            email: session.user.email || null,
          });
          localStorage.setItem(guardKey, "1");
        }
      }
    });

    return () => subscription.unsubscribe();
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
                <Suspense fallback={<RouteFallback />}>
                <Routes>
                  {/* Public marketing landing (Variante E) */}
                  <Route path="/" element={<Landing />} />
                  
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
                  <Route path="/reclutamiento-gdl" element={<RecruitGDL />} />
                  
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
                    path="/admin/attribution"
                    element={
                      <AppRoute session={session} requiresAuth>
                        <VideoAttribution />
                      </AppRoute>
                    }
                  />
                  <Route
                    path="/admin"
                    element={<Navigate to="/admin/import" replace />}
                  />
                  
                <Route path="*" element={<NotFound />} />
                </Routes>
                </Suspense>
                </BlurGateProvider>
              </BrowserRouter>
          </LanguageProvider>
        </MarketProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;