

## Plan: Mejorar la Seccion de Emails en Admin

### Problema Actual
- La seccion "Emails Capturados" solo muestra la tabla `email_captures` (leads de checkout)
- Hay correos repetidos (ej: `lalocmtz@gmail.com` aparece 6 veces)
- No muestra todos los usuarios registrados (ej: `geraas.santiago@gmail.com` no aparece)
- No hay seccion de suscriptores activos con fecha de renovacion

### Solucion

Reemplazar el componente `EmailLeadsList` con un componente mejorado que tenga **3 secciones con tabs**:

---

### Tab 1: Usuarios Registrados
Muestra todos los correos de la tabla `profiles` (usuarios que crearon cuenta):

```text
Usuarios Registrados (7)
----------------------------------------
geraas.santiago@gmail.com   29 ene 2026
test3@gmail.com             08 dic 2025
test2@gmail.com             08 dic 2025
test@gmail.com              08 dic 2025
data2bet@gmail.com          08 dic 2025
adbrollapp@gmail.com        08 dic 2025
lalocmtz@gmail.com          28 nov 2025
```

- Sin duplicados (cada email aparece una sola vez)
- Muestra nombre completo si existe
- Fecha de registro

### Tab 2: Suscriptores Activos
Muestra los usuarios con suscripcion activa y su fecha de renovacion:

```text
Suscriptores Activos (2)
----------------------------------------
geraas.santiago@gmail.com   Activa   Renueva: 31 dic 2099
lalocmtz@gmail.com          Activa   Renueva: --
```

- Email del suscriptor
- Estado (activa/cancelada)
- Fecha de renovacion (`renew_at`)
- Badge verde para activos

### Tab 3: Email Leads (actual)
Mantiene la funcionalidad actual de `email_captures` pero **deduplicado**:
- Agrupa por email, muestra solo el registro mas reciente
- Mantiene botones de seguimiento
- Mantiene indicador de convertido/pendiente

---

### Cambios Tecnicos

**Archivo:** `src/components/admin/EmailLeadsList.tsx`

1. Agregar consulta a `profiles` para obtener todos los usuarios registrados
2. Agregar consulta a `subscriptions` (join con `profiles`) para suscriptores activos  
3. Agregar tabs internos: "Registrados", "Suscriptores", "Leads"
4. Deduplicar leads de `email_captures` agrupando por email (conservar el mas reciente)
5. Contar totales para cada tab

**Archivos a modificar:**

| Archivo | Cambio |
|---------|--------|
| `src/components/admin/EmailLeadsList.tsx` | Reescribir con 3 tabs y datos deduplicados |

**Sin cambios en base de datos** - solo se leen tablas existentes (`profiles`, `subscriptions`, `email_captures`).

---

### Resultado Visual

```text
+---------------------------------------------------+
| Directorio de Emails (7 registrados)   [Actualizar]|
|                                                     |
| [Registrados (7)] [Suscriptores (2)] [Leads (2)]   |
|                                                     |
| Tab Registrados:                                    |
|  geraas.santiago@gmail.com  Gerardo Santiago  29ene |
|  test3@gmail.com            Armando cuellar   08dic |
|  ...                                               |
|                                                     |
| Tab Suscriptores:                                   |
|  geraas.santiago@gmail.com  Activa  Renueva: 2099  |
|  lalocmtz@gmail.com         Activa  Renueva: --    |
|                                                     |
| Tab Leads:                                          |
|  lalocmtz@gmail.com   (mas reciente)   [Seguimiento]|
|  data2bet@gmail.com   (mas reciente)   [Seguimiento]|
+---------------------------------------------------+
```

