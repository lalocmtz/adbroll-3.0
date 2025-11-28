## 🗺️ Site Map

- `/` → Landing pública
- `/login` → Inicio de sesión
- `/register` → Registro de cuenta
- `/app` → Dashboard de videos
- `/admin` → Subida de archivo Kalodata (solo fundador)

---

## 🧭 Propósito de cada página

- **`/` Landing pública**
  - Mostrar beneficio clave del producto y CTA claro: “Entrar al panel de análisis”
- **`/login`**
  - Permitir acceso a usuarios existentes
- **`/register`**
  - Crear nueva cuenta gratuita con email y contraseña
- **`/app`**
  - Mostrar los 20 videos más rentables del día con sus métricas y guiones
- **`/admin`**
  - Subir el archivo `.xlsx` diario que alimenta el feed (solo rol `founder`)

---

## 👤 Roles y niveles de acceso

| Rol       | Permisos principales                                               |
|-----------|--------------------------------------------------------------------|
| `user`    | Ver feed, editar y guardar guiones personalizados                  |
| `founder` | Todo lo anterior + acceso exclusivo al panel `/admin` para subir Excel |
| `anon`    | Solo puede ver landing pública y registrarse                       |

---

## 🧑‍💼 User Journeys (máximo 3 pasos)

### 1. Ver videos ganadores y adaptar guión

1. Usuario entra al dashboard `/app`
2. Encuentra un video relevante y hace clic en “Ver guión IA”
3. Edita y guarda su versión personalizada

---

### 2. Subir archivo Kalodata

1. Fundador inicia sesión y entra a `/admin`
2. Sube el `.xlsx` del día
3. El sistema borra y reemplaza el feed completo, genera IA y muestra timestamp

---

### 3. Crear cuenta y empezar

1. Usuario llega desde la landing `/`
2. Se registra en `/register`
3. Entra directo al dashboard con acceso completo

