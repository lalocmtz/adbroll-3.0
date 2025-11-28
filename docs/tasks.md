# 📋 adbroll Implementation Tasks

**Source of Truth:** This document tracks all implementation tasks in execution order.
**Instructions:** Mark tasks as `[x]` when completed. Add notes/blockers inline.

---

## 🏗️ PHASE 1: Foundation (Week 1)

### Task 1.1: Enable Lovable Cloud
**Priority:** Critical | **Estimated Time:** 5 min

- [ ] Enable Lovable Cloud integration
- [ ] Verify Supabase project is provisioned
- [ ] Confirm access to Cloud tab in Lovable UI

**References:** 
- `docs/masterplan.md` → Tech Stack section
- Lovable docs: https://docs.lovable.dev/features/cloud

---

### Task 1.2: Create Database Schema
**Priority:** Critical | **Estimated Time:** 30 min

#### Subtask 1.2.1: Create `daily_feed` table

```sql
-- Main table for top 20 videos
create table public.daily_feed (
  id uuid primary key default gen_random_uuid(),
  rango_fechas text not null,
  descripcion_video text not null,
  duracion text not null,
  creador text not null,
  fecha_publicacion text not null,
  ingresos_mxn numeric(12,2) not null,
  ventas integer not null,
  visualizaciones integer not null,
  gpm_mxn numeric(12,2),
  cpa_mxn numeric(12,2) not null,
  ratio_ads numeric(5,2),
  coste_publicitario_mxn numeric(12,2) not null,
  roas numeric(5,2) not null,
  tiktok_url text not null,
  transcripcion_original text,
  guion_ia text,
  created_at timestamptz default now()
);

-- Index for faster sorting by revenue
create index idx_daily_feed_ingresos on public.daily_feed(ingresos_mxn desc);

-- Enable RLS
alter table public.daily_feed enable row level security;

-- Policy: All authenticated users can read
create policy "Authenticated users can view daily feed"
  on public.daily_feed
  for select
  to authenticated
  using (true);

-- Policy: No direct inserts/updates (only via edge function)
create policy "No direct modifications"
  on public.daily_feed
  for all
  to authenticated
  using (false);
```

**Notes:**
- No direct user modifications → controlled via admin edge function
- RLS allows reads only for authenticated users

---

#### Subtask 1.2.2: Create `guiones_personalizados` table (versioned custom scripts)

```sql
-- User's custom script versions
create table public.guiones_personalizados (
  id uuid primary key default gen_random_uuid(),
  video_id uuid not null references public.daily_feed(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  contenido text not null,
  version_number integer not null default 1,
  created_at timestamptz default now(),
  unique(video_id, user_id, version_number)
);

-- Index for user's script history
create index idx_guiones_user_video on public.guiones_personalizados(user_id, video_id, created_at desc);

-- Enable RLS
alter table public.guiones_personalizados enable row level security;

-- Policy: Users can only read their own scripts
create policy "Users can view own scripts"
  on public.guiones_personalizados
  for select
  to authenticated
  using (auth.uid() = user_id);

-- Policy: Users can insert their own scripts
create policy "Users can create own scripts"
  on public.guiones_personalizados
  for insert
  to authenticated
  with check (auth.uid() = user_id);

-- Policy: Users can update their own scripts
create policy "Users can update own scripts"
  on public.guiones_personalizados
  for update
  to authenticated
  using (auth.uid() = user_id);

-- Policy: Users can delete their own scripts
create policy "Users can delete own scripts"
  on public.guiones_personalizados
  for delete
  to authenticated
  using (auth.uid() = user_id);
```

**References:** User answer → "Multiple saved versions"

---

#### Subtask 1.2.3: Create User Roles System (Security Definer)

```sql
-- Create role enum
create type public.app_role as enum ('user', 'founder');

-- Create user_roles table (NEVER store roles in profiles!)
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz default now(),
  unique(user_id, role)
);

-- Enable RLS
alter table public.user_roles enable row level security;

-- Security definer function to check roles (prevents recursive RLS)
create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = _user_id and role = _role
  )
$$;

-- Policy: Users can view their own roles
create policy "Users can view own roles"
  on public.user_roles
  for select
  to authenticated
  using (auth.uid() = user_id);

-- Policy: Only founders can insert roles (managed manually)
create policy "Only founders manage roles"
  on public.user_roles
  for all
  to authenticated
  using (public.has_role(auth.uid(), 'founder'));
```

**Post-deployment manual step:**
After first founder signs up, run in SQL Editor:
```sql
-- Replace 'YOUR_USER_ID_HERE' with founder's auth.users.id
insert into public.user_roles (user_id, role)
values ('YOUR_USER_ID_HERE', 'founder');
```

**References:** 
- `docs/app-flow-pages-and-roles.md` → Roles table
- Security best practice: separate roles table

---

#### Subtask 1.2.4: Create Profiles Table (Optional but Recommended)

```sql
-- User profiles for display names, avatars, etc.
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  avatar_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Enable RLS
alter table public.profiles enable row level security;

-- Trigger to auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name'
  );
  
  -- Auto-assign 'user' role to everyone
  insert into public.user_roles (user_id, role)
  values (new.id, 'user');
  
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- RLS Policies
create policy "Users can view all profiles"
  on public.profiles
  for select
  to authenticated
  using (true);

create policy "Users can update own profile"
  on public.profiles
  for update
  to authenticated
  using (auth.uid() = id);
```

**Notes:**
- Auto-creates profile + assigns 'user' role on signup
- Founder role must still be manually added (see Task 1.2.3)

---

### Task 1.3: Implement Authentication Flow
**Priority:** Critical | **Estimated Time:** 1 hour

#### Subtask 1.3.1: Update Auth Pages with Real Supabase Integration

**File:** `src/pages/Register.tsx`

```typescript
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const Register = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/app`,
          data: {
            full_name: fullName,
          },
        },
      });

      if (error) throw error;

      toast({
        title: "¡Cuenta creada!",
        description: "Revisa tu correo para confirmar tu cuenta.",
      });

      // Auto-redirect after 2s
      setTimeout(() => navigate("/app"), 2000);
    } catch (error: any) {
      toast({
        title: "Error al registrarse",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Crear cuenta en adbroll</CardTitle>
          <CardDescription>
            Accede a los 20 videos más rentables cada día
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleRegister} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Nombre completo</Label>
              <Input
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Creando cuenta..." : "Crear cuenta gratuita"}
            </Button>
            <p className="text-sm text-center text-muted-foreground">
              ¿Ya tienes cuenta?{" "}
              <Link to="/login" className="text-primary hover:underline">
                Inicia sesión
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Register;
```

**File:** `src/pages/Login.tsx`

```typescript
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      toast({
        title: "¡Bienvenido de vuelta!",
      });

      navigate("/app");
    } catch (error: any) {
      toast({
        title: "Error al iniciar sesión",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Bienvenido a adbroll</CardTitle>
          <CardDescription>
            Inicia sesión para ver los videos ganadores
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Iniciando sesión..." : "Iniciar sesión"}
            </Button>
            <p className="text-sm text-center text-muted-foreground">
              ¿No tienes cuenta?{" "}
              <Link to="/register" className="text-primary hover:underline">
                Regístrate gratis
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;
```

**References:**
- `docs/design-guidelines.md` → Voice & Tone (Spanish microcopy)
- `docs/app-flow-pages-and-roles.md` → Auth pages purpose

---

#### Subtask 1.3.2: Add Auth State Management & Protected Routes

**File:** `src/App.tsx` (add auth check)

```typescript
import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import Landing from "@/pages/Landing";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import Dashboard from "@/pages/Dashboard";
import Admin from "@/pages/Admin";
import NotFound from "@/pages/NotFound";

// Protected Route Component
const ProtectedRoute = ({ 
  children, 
  session 
}: { 
  children: React.ReactNode; 
  session: Session | null;
}) => {
  if (!session) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    // Listen for auth changes
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
          path="/admin"
          element={
            <ProtectedRoute session={session}>
              <Admin />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
```

**Notes:**
- Auto-redirects to `/login` if not authenticated
- Handles session persistence across refreshes

---

#### Subtask 1.3.3: Update Dashboard with Real Logout

**File:** `src/pages/Dashboard.tsx` (update logout handler)

```typescript
const handleLogout = async () => {
  await supabase.auth.signOut();
  navigate("/");
};
```

---

### Task 1.4: Disable Email Confirmation (Testing Speed)
**Priority:** Medium | **Estimated Time:** 2 min

- [ ] Go to Lovable Cloud → Authentication → Settings
- [ ] Disable "Confirm email" toggle
- [ ] Save changes

**References:** User answer → Mock first, test quickly

---

## 🎨 PHASE 2: UI & Mock Data (Week 2)

### Task 2.1: Populate Mock Data in Database
**Priority:** High | **Estimated Time:** 20 min

**Use Supabase Insert Tool** to add 20 mock videos:

```sql
insert into public.daily_feed (
  rango_fechas, descripcion_video, duracion, creador, fecha_publicacion,
  ingresos_mxn, ventas, visualizaciones, gpm_mxn, cpa_mxn, ratio_ads,
  coste_publicitario_mxn, roas, tiktok_url, transcripcion_original, guion_ia
) values
(
  '2025-01-20 - 2025-01-21',
  'Tutorial de maquillaje viral con producto estrella',
  '0:45',
  '@beautyguru',
  '2025-01-20',
  125000.50,
  450,
  2500000,
  277.78,
  277.78,
  0.85,
  25000.00,
  5.0,
  'https://www.tiktok.com/@example/video/123',
  'Hola chicas, hoy les traigo este producto increíble que me ha cambiado la vida. Miren qué cobertura tan perfecta, y lo mejor es que dura todo el día. El link está en mi bio, no se lo pierdan porque está en oferta.',
  '¿Cansada de bases que no duran? Este producto es EL CAMBIO que necesitas. Cobertura perfecta, 24 horas de duración, y ahora en oferta exclusiva. Haz clic en el link de mi bio y transforma tu rutina HOY. No te quedes sin el tuyo.'
),
(
  '2025-01-20 - 2025-01-21',
  'Review honesto de producto tech con demostración',
  '1:20',
  '@techreview',
  '2025-01-20',
  98500.00,
  320,
  1800000,
  307.81,
  307.81,
  0.78,
  22000.00,
  4.5,
  'https://www.tiktok.com/@example/video/124',
  'Este gadget lo compré hace un mes y no puedo creer que funcione tan bien. Miren cómo se conecta instantáneamente, la batería dura días, y el precio es súper accesible comparado con otras marcas.',
  'Si buscas tecnología que FUNCIONE sin gastar de más, esto es para ti. Conexión instantánea, batería de días, y calidad premium a precio real. Miles ya lo tienen. ¿Vas a quedarte atrás? Link en bio.'
),
-- Add 18 more similar entries...
(
  '2025-01-20 - 2025-01-21',
  'Producto de fitness con antes/después impactante',
  '0:55',
  '@fitlife',
  '2025-01-19',
  15200.00,
  52,
  450000,
  292.31,
  292.31,
  0.65,
  3500.00,
  4.3,
  'https://www.tiktok.com/@example/video/143',
  'Hace 3 meses empecé con esto y miren la diferencia. No es magia, es constancia y el producto correcto. Si yo pude, tú también puedes.',
  'Resultados REALES en 90 días. No promesas vacías, solo transformación visible. Si estás lista para el cambio, este es tu momento. Link en bio antes de que se agote.'
);
```

**Notes:**
- 20 entries total (abbreviated here for space)
- Mock Spanish transcripts + rewritten sales scripts
- Ordered by `ingresos_mxn` descending

---

### Task 2.2: Connect Dashboard to Real Data
**Priority:** High | **Estimated Time:** 1 hour

#### Subtask 2.2.1: Update Dashboard to Fetch from Supabase

**File:** `src/pages/Dashboard.tsx`

```typescript
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import VideoCard from "@/components/VideoCard";
import { useToast } from "@/hooks/use-toast";

interface DailyFeedVideo {
  id: string;
  rango_fechas: string;
  descripcion_video: string;
  duracion: string;
  creador: string;
  fecha_publicacion: string;
  ingresos_mxn: number;
  ventas: number;
  visualizaciones: number;
  gpm_mxn: number | null;
  cpa_mxn: number;
  ratio_ads: number | null;
  coste_publicitario_mxn: number;
  roas: number;
  tiktok_url: string;
  transcripcion_original: string | null;
  guion_ia: string | null;
  created_at: string;
}

const Dashboard = () => {
  const [videos, setVideos] = useState<DailyFeedVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    fetchVideos();
  }, []);

  const fetchVideos = async () => {
    try {
      const { data, error } = await supabase
        .from("daily_feed")
        .select("*")
        .order("ingresos_mxn", { ascending: false })
        .limit(20);

      if (error) throw error;

      setVideos(data || []);
      
      // Get latest created_at for timestamp display
      if (data && data.length > 0) {
        setLastUpdate(new Date(data[0].created_at));
      }
    } catch (error: any) {
      toast({
        title: "Error al cargar videos",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Cargando videos...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border sticky top-0 bg-background z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-foreground">adbroll</h1>
          <Button variant="ghost" onClick={handleLogout}>
            <LogOut className="h-4 w-4 mr-2" />
            Cerrar sesión
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-foreground mb-2">
            Top 20 Videos del Día
          </h2>
          {lastUpdate && (
            <p className="text-muted-foreground">
              Última actualización:{" "}
              {lastUpdate.toLocaleDateString("es-MX", {
                day: "numeric",
                month: "long",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          )}
        </div>

        {videos.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground text-lg">
              No hay videos disponibles. El fundador subirá datos pronto.
            </p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {videos.map((video, index) => (
              <VideoCard key={video.id} video={video} ranking={index + 1} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default Dashboard;
```

---

#### Subtask 2.2.2: Update VideoCard Component

**File:** `src/components/VideoCard.tsx`

```typescript
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TrendingUp, Eye, DollarSign, Target } from "lucide-react";
import { useState } from "react";
import ScriptModal from "./ScriptModal";

interface VideoCardProps {
  video: {
    id: string;
    tiktok_url: string;
    descripcion_video: string;
    creador: string;
    ingresos_mxn: number;
    ventas: number;
    visualizaciones: number;
    cpa_mxn: number;
    roas: number;
    transcripcion_original: string | null;
    guion_ia: string | null;
  };
  ranking: number;
}

const VideoCard = ({ video, ranking }: VideoCardProps) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat("es-MX").format(num);
  };

  return (
    <>
      <Card className="hover:shadow-lg transition-shadow duration-200">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between mb-2">
            <Badge variant="default" className="text-lg font-bold">
              #{ranking}
            </Badge>
            <Badge variant="secondary">{video.creador}</Badge>
          </div>
          
          {/* TikTok Embed Placeholder */}
          <div className="aspect-[9/16] bg-muted rounded-md flex items-center justify-center mb-3">
            <p className="text-sm text-muted-foreground px-4 text-center">
              {video.descripcion_video}
            </p>
          </div>
        </CardHeader>

        <CardContent className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center text-muted-foreground">
              <DollarSign className="h-4 w-4 mr-1" />
              Ingresos
            </span>
            <span className="font-semibold text-positive">
              {formatCurrency(video.ingresos_mxn)}
            </span>
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center text-muted-foreground">
              <TrendingUp className="h-4 w-4 mr-1" />
              Ventas
            </span>
            <span className="font-semibold">{formatNumber(video.ventas)}</span>
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center text-muted-foreground">
              <Eye className="h-4 w-4 mr-1" />
              Vistas
            </span>
            <span className="font-semibold">
              {formatNumber(video.visualizaciones)}
            </span>
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center text-muted-foreground">
              <Target className="h-4 w-4 mr-1" />
              ROAS
            </span>
            <span className="font-semibold">{video.roas.toFixed(1)}x</span>
          </div>
        </CardContent>

        <CardFooter>
          <Button 
            className="w-full" 
            onClick={() => setIsModalOpen(true)}
            disabled={!video.transcripcion_original && !video.guion_ia}
          >
            Ver Guión IA
          </Button>
        </CardFooter>
      </Card>

      <ScriptModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        video={video}
      />
    </>
  );
};

export default VideoCard;
```

---

#### Subtask 2.2.3: Update ScriptModal with Save Functionality

**File:** `src/components/ScriptModal.tsx`

```typescript
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Save, History } from "lucide-react";

interface ScriptModalProps {
  isOpen: boolean;
  onClose: () => void;
  video: {
    id: string;
    transcripcion_original: string | null;
    guion_ia: string | null;
    descripcion_video: string;
  };
}

interface CustomScript {
  id: string;
  contenido: string;
  version_number: number;
  created_at: string;
}

const ScriptModal = ({ isOpen, onClose, video }: ScriptModalProps) => {
  const [customScript, setCustomScript] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [savedVersions, setSavedVersions] = useState<CustomScript[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      fetchSavedVersions();
    }
  }, [isOpen, video.id]);

  const fetchSavedVersions = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("guiones_personalizados")
        .select("*")
        .eq("video_id", video.id)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setSavedVersions(data || []);
    } catch (error: any) {
      console.error("Error fetching saved versions:", error);
    }
  };

  const handleSave = async () => {
    if (!customScript.trim()) {
      toast({
        title: "Campo vacío",
        description: "Escribe tu guión personalizado antes de guardar.",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No autenticado");

      // Calculate next version number
      const nextVersion = savedVersions.length + 1;

      const { error } = await supabase
        .from("guiones_personalizados")
        .insert({
          video_id: video.id,
          user_id: user.id,
          contenido: customScript,
          version_number: nextVersion,
        });

      if (error) throw error;

      toast({
        title: "¡Guión guardado!",
        description: `Versión ${nextVersion} guardada exitosamente.`,
      });

      setCustomScript("");
      fetchSavedVersions();
    } catch (error: any) {
      toast({
        title: "Error al guardar",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{video.descripcion_video}</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="original" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="original">📝 Original</TabsTrigger>
            <TabsTrigger value="ia">✨ IA</TabsTrigger>
            <TabsTrigger value="personalizado">✍️ Tuyo</TabsTrigger>
            <TabsTrigger value="historial">
              <History className="h-4 w-4 mr-1" />
              Historial
            </TabsTrigger>
          </TabsList>

          <TabsContent value="original" className="space-y-4">
            <div className="bg-muted p-4 rounded-lg">
              <pre className="whitespace-pre-wrap font-mono text-sm">
                {video.transcripcion_original || "No disponible"}
              </pre>
            </div>
          </TabsContent>

          <TabsContent value="ia" className="space-y-4">
            <div className="bg-muted p-4 rounded-lg">
              <pre className="whitespace-pre-wrap font-mono text-sm">
                {video.guion_ia || "No disponible"}
              </pre>
            </div>
          </TabsContent>

          <TabsContent value="personalizado" className="space-y-4">
            <Textarea
              placeholder="Adapta el guión a tu producto..."
              value={customScript}
              onChange={(e) => setCustomScript(e.target.value)}
              className="min-h-[300px] font-mono"
            />
            <Button onClick={handleSave} disabled={isSaving} className="w-full">
              <Save className="h-4 w-4 mr-2" />
              {isSaving ? "Guardando..." : "Guardar Nueva Versión"}
            </Button>
          </TabsContent>

          <TabsContent value="historial" className="space-y-4">
            {savedVersions.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Aún no tienes versiones guardadas
              </p>
            ) : (
              <div className="space-y-4">
                {savedVersions.map((version) => (
                  <div key={version.id} className="bg-muted p-4 rounded-lg">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-semibold">
                        Versión {version.version_number}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {new Date(version.created_at).toLocaleDateString("es-MX", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    <pre className="whitespace-pre-wrap font-mono text-sm">
                      {version.contenido}
                    </pre>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default ScriptModal;
```

**References:**
- User answer → Multiple saved versions with history
- `docs/app-flow-pages-and-roles.md` → User journey #1

---

### Task 2.3: Protect Admin Panel with Role Check
**Priority:** High | **Estimated Time:** 30 min

#### Subtask 2.3.1: Create Admin Route Guard

**File:** `src/pages/Admin.tsx` (add role check)

```typescript
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, Database, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const Admin = () => {
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isFounder, setIsFounder] = useState(false);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    checkFounderRole();
  }, []);

  const checkFounderRole = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/login");
        return;
      }

      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "founder")
        .single();

      if (error || !data) {
        toast({
          title: "Acceso denegado",
          description: "Solo el fundador puede acceder a este panel.",
          variant: "destructive",
        });
        navigate("/app");
        return;
      }

      setIsFounder(true);
    } catch (error) {
      console.error("Error checking founder role:", error);
      navigate("/app");
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setIsUploading(true);
    try {
      // TODO: Call edge function to process Excel (Phase 3)
      console.log("Uploading file:", file.name);
      
      toast({
        title: "Función en desarrollo",
        description: "El procesamiento de Excel se implementará en Fase 3.",
      });
    } catch (error: any) {
      toast({
        title: "Error al subir archivo",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      setFile(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Verificando permisos...</p>
      </div>
    );
  }

  if (!isFounder) return null;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-foreground">Panel de Administración</h1>
          <Button variant="ghost" onClick={() => navigate("/app")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver al Dashboard
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Upload className="h-5 w-5 mr-2" />
                Subir Datos de Kalodata
              </CardTitle>
              <CardDescription>
                Carga el archivo Excel exportado desde Kalodata. Este reemplazará completamente
                los datos actuales del feed.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="file">Archivo Excel (.xlsx)</Label>
                <Input
                  id="file"
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileChange}
                />
                {file && (
                  <p className="text-sm text-muted-foreground">
                    Archivo seleccionado: {file.name}
                  </p>
                )}
              </div>

              <Button 
                onClick={handleUpload} 
                disabled={!file || isUploading}
                className="w-full"
              >
                <Database className="h-4 w-4 mr-2" />
                {isUploading ? "Procesando..." : "Procesar y Actualizar Feed (Próximamente)"}
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-muted">
            <CardHeader>
              <CardTitle className="text-lg">Proceso de Actualización</CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                <li>Se eliminan todos los registros existentes</li>
                <li>Se leen y validan las columnas del archivo</li>
                <li>Se ordenan por ingresos descendente</li>
                <li>Se seleccionan los Top 20 videos</li>
                <li>Se transcribe el audio con Whisper API</li>
                <li>Se reescribe el guión con GPT-4 Turbo</li>
                <li>Se guardan todos los datos en la base de datos</li>
              </ol>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Admin;
```

**Notes:**
- Checks `user_roles` table for founder role
- Auto-redirects non-founders to `/app`
- Upload button disabled until Phase 3 implementation

---

## 🤖 PHASE 3: AI & Excel Processing (Week 3)

### Task 3.1: Install Required Dependencies
**Priority:** Critical | **Estimated Time:** 5 min

```bash
# Backend Excel parsing (edge function)
npm install xlsx
```

**References:** Excel file structure in masterplan.md

---

### Task 3.2: Create Excel Processing Edge Function
**Priority:** Critical | **Estimated Time:** 3 hours

**File:** `supabase/functions/process-kalodata/index.ts`

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import * as XLSX from "https://cdn.sheetjs.com/xlsx-0.20.0/package/xlsx.mjs";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ExcelRow {
  "Rango de fechas": string;
  "Descripción del vídeo": string;
  "Duración": string;
  "Usuario del creador": string;
  "Fecha de publicación": string;
  "Ingresos (M$)": number;
  "Ventas": number;
  "Visualizaciones": number;
  "GPM (M$)": number;
  "CPA (M$)": number;
  "Ratio de visualizaciones de Ads": number;
  "Coste publicitario (M$)": number;
  "ROAS": number;
  "Enlace de TikTok": string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify founder role (critical security check)
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization")! },
        },
      }
    );

    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      throw new Error("No autenticado");
    }

    // Check founder role
    const { data: roleData, error: roleError } = await supabaseClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "founder")
      .single();

    if (roleError || !roleData) {
      throw new Error("Acceso denegado: solo fundador puede procesar archivos");
    }

    // Parse Excel file
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      throw new Error("No se proporcionó archivo");
    }

    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: "array" });
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows: ExcelRow[] = XLSX.utils.sheet_to_json(worksheet);

    console.log(`Procesando ${rows.length} filas del Excel`);

    // Sort by revenue and take top 20
    const top20 = rows
      .sort((a, b) => b["Ingresos (M$)"] - a["Ingresos (M$)"])
      .slice(0, 20);

    console.log(`Top 20 seleccionados, iniciando procesamiento...`);

    // Delete existing data
    const { error: deleteError } = await supabaseClient
      .from("daily_feed")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000"); // Delete all

    if (deleteError) {
      throw new Error(`Error al limpiar datos: ${deleteError.message}`);
    }

    console.log("Datos anteriores eliminados");

    // Process each video (with AI in background)
    const processedVideos = [];

    for (const row of top20) {
      try {
        // Extract TikTok video ID for transcription (Phase 3.3)
        const videoId = extractTikTokId(row["Enlace de TikTok"]);
        
        // For now, use placeholder transcripts
        const transcripcion = `[Transcripción automática pendiente para: ${row["Descripción del vídeo"]}]`;
        const guionIA = `[Guión IA pendiente para: ${row["Descripción del vídeo"]}]`;

        // Insert into database
        const { error: insertError } = await supabaseClient
          .from("daily_feed")
          .insert({
            rango_fechas: row["Rango de fechas"],
            descripcion_video: row["Descripción del vídeo"],
            duracion: row["Duración"],
            creador: row["Usuario del creador"],
            fecha_publicacion: row["Fecha de publicación"],
            ingresos_mxn: row["Ingresos (M$)"],
            ventas: row["Ventas"],
            visualizaciones: row["Visualizaciones"],
            gpm_mxn: row["GPM (M$)"],
            cpa_mxn: row["CPA (M$)"],
            ratio_ads: row["Ratio de visualizaciones de Ads"],
            coste_publicitario_mxn: row["Coste publicitario (M$)"],
            roas: row["ROAS"],
            tiktok_url: row["Enlace de TikTok"],
            transcripcion_original: transcripcion,
            guion_ia: guionIA,
          });

        if (insertError) {
          console.error(`Error insertando video: ${insertError.message}`);
          // Skip and continue (per user answer)
          continue;
        }

        processedVideos.push(row["Descripción del vídeo"]);
      } catch (videoError) {
        console.error(`Error procesando video: ${videoError}`);
        // Skip and continue
        continue;
      }
    }

    console.log(`Procesados ${processedVideos.length} videos exitosamente`);

    return new Response(
      JSON.stringify({
        success: true,
        processed: processedVideos.length,
        total: top20.length,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error en process-kalodata:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

function extractTikTokId(url: string): string {
  // Extract video ID from TikTok URL
  const match = url.match(/\/video\/(\d+)/);
  return match ? match[1] : "";
}
```

**File:** `supabase/config.toml` (add function config)

```toml
[functions.process-kalodata]
verify_jwt = true
```

**Notes:**
- Founder-only access verified via `user_roles` table
- Deletes all existing `daily_feed` before inserting new data
- Sorts by revenue, processes top 20
- AI transcription/rewriting placeholders (implemented in Task 3.3)
- Skip-on-failure per user answer

---

### Task 3.3: Integrate Whisper + GPT-4 (Real AI)
**Priority:** High | **Estimated Time:** 2 hours

**Note:** This task will use **Lovable AI** instead of direct OpenAI calls.

#### Subtask 3.3.1: Enable Lovable AI

- [ ] Call tool to enable Lovable AI integration
- [ ] Verify `LOVABLE_API_KEY` is auto-provisioned

---

#### Subtask 3.3.2: Create Transcription Edge Function

**File:** `supabase/functions/transcribe-video/index.ts`

```typescript
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { audioBase64 } = await req.json();

    if (!audioBase64) {
      throw new Error("No se proporcionó audio");
    }

    // Decode base64 audio
    const binaryAudio = Uint8Array.from(atob(audioBase64), (c) => c.charCodeAt(0));
    const blob = new Blob([binaryAudio], { type: "audio/mp3" });

    // Prepare form data for Whisper
    const formData = new FormData();
    formData.append("file", blob, "audio.mp3");
    formData.append("model", "whisper-1");
    formData.append("language", "es");

    // Call Lovable AI Gateway (Whisper endpoint)
    const response = await fetch("https://ai.gateway.lovable.dev/v1/audio/transcriptions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${Deno.env.get("LOVABLE_API_KEY")}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Lovable AI transcription error:", errorText);
      throw new Error(`Transcription failed: ${response.status}`);
    }

    const result = await response.json();

    return new Response(
      JSON.stringify({ text: result.text }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in transcribe-video:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
```

**File:** `supabase/config.toml` (add)

```toml
[functions.transcribe-video]
verify_jwt = false
```

---

#### Subtask 3.3.3: Create Script Rewriting Edge Function

**File:** `supabase/functions/rewrite-script/index.ts`

```typescript
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `Eres un experto en guiones de ventas para TikTok Shop.
Tu trabajo es tomar una transcripción de un video viral que generó altas ventas y reescribirla con un enfoque comercial, directo y emocional.
Tu objetivo es hacer que otro creador pueda adaptar este guión a su producto y vender más.
Escribe en español neutro, ideal para voice-over o locución. Mantén un tono convincente pero sencillo.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { transcription } = await req.json();

    if (!transcription) {
      throw new Error("No se proporcionó transcripción");
    }

    // Call Lovable AI Gateway (GPT-4 equivalent: google/gemini-2.5-flash)
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${Deno.env.get("LOVABLE_API_KEY")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: `Reescribe este guión con enfoque de ventas:\n\n${transcription}`,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Lovable AI rewrite error:", errorText);
      throw new Error(`Rewrite failed: ${response.status}`);
    }

    const result = await response.json();
    const rewrittenScript = result.choices[0].message.content;

    return new Response(
      JSON.stringify({ script: rewrittenScript }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in rewrite-script:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
```

**File:** `supabase/config.toml` (add)

```toml
[functions.rewrite-script]
verify_jwt = false
```

**References:**
- `docs/masterplan.md` → GPT-4 Turbo prompt
- User preference: Lovable AI over direct OpenAI

---

#### Subtask 3.3.4: Integrate AI Functions into Excel Processor

**Update:** `supabase/functions/process-kalodata/index.ts`

Replace placeholder section:

```typescript
// Extract TikTok video ID for transcription
const videoId = extractTikTokId(row["Enlace de TikTok"]);

// Download TikTok audio (pseudo-code, requires TikTok API or scraper)
let transcripcion = "";
let guionIA = "";

try {
  // Step 1: Download audio from TikTok (implementation depends on TikTok API)
  const audioBase64 = await downloadTikTokAudio(row["Enlace de TikTok"]);

  // Step 2: Transcribe with Whisper
  const transcribeResponse = await fetch(
    `${Deno.env.get("SUPABASE_URL")}/functions/v1/transcribe-video`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}`,
      },
      body: JSON.stringify({ audioBase64 }),
    }
  );

  if (!transcribeResponse.ok) throw new Error("Transcription failed");

  const transcribeData = await transcribeResponse.json();
  transcripcion = transcribeData.text;

  // Step 3: Rewrite with GPT-4
  const rewriteResponse = await fetch(
    `${Deno.env.get("SUPABASE_URL")}/functions/v1/rewrite-script`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}`,
      },
      body: JSON.stringify({ transcription: transcripcion }),
    }
  );

  if (!rewriteResponse.ok) throw new Error("Rewrite failed");

  const rewriteData = await rewriteResponse.json();
  guionIA = rewriteData.script;
} catch (aiError) {
  console.error(`AI processing failed for ${row["Descripción del vídeo"]}:`, aiError);
  // Use placeholders (skip and continue per user answer)
  transcripcion = `[Error en transcripción: ${aiError}]`;
  guionIA = `[Error en reescritura: ${aiError}]`;
}
```

**TODO for implementer:**
- TikTok audio download requires external library or API (e.g., `yt-dlp`, TikTok API)
- Consider background task for slow AI processing (see Supabase background tasks docs)

---

### Task 3.4: Connect Admin Upload to Edge Function
**Priority:** High | **Estimated Time:** 30 min

**Update:** `src/pages/Admin.tsx`

```typescript
const handleUpload = async () => {
  if (!file) return;

  setIsUploading(true);
  try {
    const formData = new FormData();
    formData.append("file", file);

    const { data, error } = await supabase.functions.invoke("process-kalodata", {
      body: formData,
    });

    if (error) throw error;

    toast({
      title: "¡Archivo procesado!",
      description: `${data.processed} de ${data.total} videos actualizados.`,
    });

    // Refresh page to show new data
    setTimeout(() => {
      window.location.href = "/app";
    }, 2000);
  } catch (error: any) {
    toast({
      title: "Error al procesar archivo",
      description: error.message,
      variant: "destructive",
    });
  } finally {
    setIsUploading(false);
    setFile(null);
  }
};
```

---

## 💳 PHASE 4: Payments & Polish (Week 4)

### Task 4.1: Enable Stripe Integration
**Priority:** High | **Estimated Time:** 10 min

- [ ] Call tool to enable Stripe integration
- [ ] Follow prompts to add Stripe secret key
- [ ] Verify connection in Cloud tab

**References:** 
- `docs/masterplan.md` → $25 USD/month plan
- Stripe docs: https://docs.lovable.dev/integrations/stripe

---

### Task 4.2: Create Stripe Subscription Logic
**Priority:** High | **Estimated Time:** 2 hours

**TBD:** Stripe implementation details will be provided after enabling integration.

Expected flow:
1. User registers → free trial or immediate payment prompt
2. Stripe Checkout Session → redirect to `/app` on success
3. Webhook handles subscription creation/cancellation
4. RLS policies check subscription status before allowing `/app` access

---

### Task 4.3: Add Subscription Gate to Dashboard
**Priority:** High | **Estimated Time:** 30 min

**Update:** `src/pages/Dashboard.tsx` (add subscription check)

```typescript
useEffect(() => {
  checkSubscription();
}, []);

const checkSubscription = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  // Check if user has active subscription (Stripe webhook updates this)
  const { data, error } = await supabase
    .from("subscriptions")
    .select("status")
    .eq("user_id", user.id)
    .eq("status", "active")
    .single();

  if (error || !data) {
    // Redirect to payment page
    navigate("/subscribe");
    return;
  }

  // Proceed to fetch videos
  fetchVideos();
};
```

---

### Task 4.4: Final UI Polish
**Priority:** Medium | **Estimated Time:** 1 hour

- [ ] Add loading skeletons to video cards
- [ ] Implement error boundaries for failed AI scripts
- [ ] Add empty states with helpful messages
- [ ] Test responsive design on mobile/tablet
- [ ] Add favicon and meta tags for SEO
- [ ] Test dark mode (if implemented)

**References:**
- `docs/design-guidelines.md` → All sections
- `docs/app-flow-pages-and-roles.md` → User journeys

---

## 📝 Post-Launch Maintenance

### Task 5.1: Monitor AI Processing Errors
**Priority:** Ongoing

- [ ] Set up Supabase logging alerts for edge function failures
- [ ] Review failed transcriptions weekly
- [ ] Manually correct critical errors in `daily_feed`

---

### Task 5.2: User Feedback Loop
**Priority:** Ongoing

- [ ] Add feedback button in dashboard
- [ ] Track most-viewed videos (analytics)
- [ ] Monitor custom script save rates

---

## ✅ Completion Checklist

Before marking project as "MVP Complete":

- [ ] All Phase 1 tasks complete (auth + database)
- [ ] All Phase 2 tasks complete (UI + mock data)
- [ ] All Phase 3 tasks complete (real Excel + AI)
- [ ] All Phase 4 tasks complete (Stripe + polish)
- [ ] Founder role assigned to correct user
- [ ] Test full flow: register → login → view videos → save script
- [ ] Test admin flow: upload Excel → verify top 20 updated
- [ ] Mobile responsiveness verified
- [ ] Production deployment tested

---

## 🚀 Phase 2 Ideas (Future)

- [ ] B-roll uploader for users
- [ ] Video generator (MakeUGC style)
- [ ] Analytics: which scripts convert best
- [ ] Export scripts as PDF
- [ ] Community forum for script sharing

**References:** `docs/masterplan.md` → V2 Roadmap
