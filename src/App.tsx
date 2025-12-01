import { useEffect, useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { SubscriptionGate } from "@/components/SubscriptionGate";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Products from "./pages/Products";
import Opportunities from "./pages/Opportunities";
import Favorites from "./pages/Favorites";
import Creators from "./pages/Creators";
import Affiliates from "./pages/Affiliates";
import Admin from "./pages/Admin";
import AdminImport from "./pages/AdminImport";
import RelatedVideos from "./pages/RelatedVideos";
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
        <Toaster />
        <Sonner />
        <BrowserRouter>
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
              path="/opportunities"
              element={
                <ProtectedRoute session={session}>
                  <Opportunities />
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
              path="/admin/import"
              element={
                <ProtectedRoute session={session}>
                  <AdminImport />
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
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
