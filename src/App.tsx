import { useEffect, useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import {
  Events,
  identify,
  reset as resetAnalytics,
  track,
  trackPageView,
} from "@/lib/analytics";
import { captureAttribution } from "@/lib/attribution";
import { SubscriptionGate } from "@/components/SubscriptionGate";
import { LanguageProvider } from "@/contexts/LanguageContext";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Products from "./pages/Products";
import Favorites from "./pages/Favorites";
import Creators from "./pages/Creators";
import Affiliates from "./pages/Affiliates";
import Admin from "./pages/Admin";
import RelatedVideos from "./pages/RelatedVideos";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const RouteTracker = () => {
  const location = useLocation();
  useEffect(() => {
    trackPageView(location.pathname + location.search);

    // First-touch attribution + landing-specific events. We only fire
    // landing.viewed on the public root so /app, /login, /register etc.
    // keep their own dedicated events.
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
      // Meta PageView already fires via the pixel script in index.html;
      // no need to re-emit here.

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

const ProtectedRoute = ({
  children,
  session
}: {
  children: React.ReactNode;
  session: Session | null;
}) => {
  if (!session) return <Navigate to="/login" replace />;
  return (
    <SubscriptionGate>
      {children}
    </SubscriptionGate>
  );
};

const App = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        identify(session.user.id, { email: session.user.email });
      }
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      if (session?.user) {
        identify(session.user.id, { email: session.user.email });
      } else if (event === "SIGNED_OUT") {
        resetAnalytics();
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
        <LanguageProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <RouteTracker />
            <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route
              path="/app"
              element={
                <ProtectedRoute session={session}>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/products"
              element={
                <ProtectedRoute session={session}>
                  <Products />
                </ProtectedRoute>
              }
            />
            <Route
              path="/favorites"
              element={
                <ProtectedRoute session={session}>
                  <Favorites />
                </ProtectedRoute>
              }
            />
            <Route
              path="/creadores"
              element={
                <ProtectedRoute session={session}>
                  <Creators />
                </ProtectedRoute>
              }
            />
            <Route
              path="/afiliados"
              element={
                <ProtectedRoute session={session}>
                  <Affiliates />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin"
              element={
                <ProtectedRoute session={session}>
                  <Admin />
                </ProtectedRoute>
              }
            />
            <Route
              path="/videos/product/:productId"
              element={
                <ProtectedRoute session={session}>
                  <RelatedVideos />
                </ProtectedRoute>
              }
            />
            <Route
              path="/videos/creator/:creatorId"
              element={
                <ProtectedRoute session={session}>
                  <RelatedVideos />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
        </LanguageProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
