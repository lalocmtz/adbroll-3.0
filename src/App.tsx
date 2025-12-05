import { useEffect, useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { SubscriptionGate } from "@/components/SubscriptionGate";
import { LanguageProvider } from "@/contexts/LanguageContext";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Products from "./pages/Products";
import Creators from "./pages/Creators";
import Favorites from "./pages/Favorites";
import Admin from "./pages/Admin";
import RelatedVideos from "./pages/RelatedVideos";
import FAQ from "./pages/FAQ";
import Privacy from "./pages/Privacy";
import Terms from "./pages/Terms";
import About from "./pages/About";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

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
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
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
            <Routes>
              {/* Public routes */}
              <Route path="/" element={<Landing />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/faq" element={<FAQ />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/terms" element={<Terms />} />
              <Route path="/about" element={<About />} />
              
              {/* Protected routes */}
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
                path="/creadores"
                element={
                  <ProtectedRoute session={session}>
                    <Creators />
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
                path="/admin/import"
                element={
                  <ProtectedRoute session={session}>
                    <Admin />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin"
                element={<Navigate to="/admin/import" replace />}
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
