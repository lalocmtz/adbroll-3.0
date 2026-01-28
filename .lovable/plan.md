
## Plan: Descargador de Video HD de TikTok

### Resumen
Agregar una nueva herramienta en la página Tools que permita a los usuarios pegar un link de TikTok y descargar el video HD sin marca de agua directamente a su dispositivo.

---

## Arquitectura

### Flujo de Descarga

```text
Usuario pega URL → Edge Function obtiene MP4 → Retorna URL → Usuario descarga a su dispositivo
```

La diferencia con la función existente `download-tiktok-video` es que:
- **Función existente**: Descarga el video, lo sube a Supabase Storage, y actualiza la DB
- **Nueva función**: Solo obtiene la URL del MP4 y la retorna al cliente para descarga directa

---

## Nueva Edge Function

**Archivo:** `supabase/functions/get-tiktok-download-url/index.ts`

Esta función:
1. Recibe una URL de TikTok
2. Llama a la API de RapidAPI (elisbushaj2) que ya está configurada
3. Retorna la URL del MP4 sin marca de agua
4. El navegador del usuario descarga directamente desde esa URL

```typescript
// Usa la misma API que download-tiktok-video
// pero solo retorna la URL de descarga, no la guarda
```

---

## Cambios en UI

**Archivo:** `src/pages/Tools.tsx`

### Nuevo Estado:
```typescript
// Video Downloader State
const [downloadUrl, setDownloadUrl] = useState("");
const [isGettingDownloadUrl, setIsGettingDownloadUrl] = useState(false);
const [downloadLink, setDownloadLink] = useState<string | null>(null);
const [downloadError, setDownloadError] = useState<string | null>(null);
```

### Nueva Función:
```typescript
const handleGetDownloadUrl = async () => {
  // Valida URL de TikTok
  // Llama a get-tiktok-download-url
  // Obtiene MP4 URL
  // Inicia descarga automáticamente usando <a download>
};
```

### Nueva Card de Herramienta:

Se añade una nueva Card debajo del Script Extractor (o como tercera herramienta) con:

```text
┌────────────────────────────────────────────────────────────┐
│ 📥 Descargador de Video                                    │
│ Descarga videos de TikTok en HD sin marca de agua          │
├────────────────────────────────────────────────────────────┤
│ [🔗 Input: https://tiktok.com/...    ] [📥 Descargar]     │
│                                                            │
│ ✓ Video listo - 3.2 MB                [⬇️ Descargar]      │
└────────────────────────────────────────────────────────────┘
```

**Estados de la UI:**
1. **Idle**: Input vacío + botón "Obtener Video"
2. **Loading**: Spinner + "Procesando video..."
3. **Success**: Muestra tamaño + botón de descarga directa
4. **Error**: Mensaje de error + botón reintentar

---

## Archivos a Crear

| Archivo | Propósito |
|---------|-----------|
| `supabase/functions/get-tiktok-download-url/index.ts` | Edge function ligera que retorna URL de descarga |

## Archivos a Modificar

| Archivo | Cambios |
|---------|---------|
| `src/pages/Tools.tsx` | Agregar nueva sección Descargador de Video |
| `supabase/config.toml` | Registrar la nueva function |
| `docs/tasks.md` | Agregar nueva tarea completada |

---

## Consideraciones Técnicas

### Descarga en Cliente

Para iniciar la descarga desde el navegador, se usa una técnica que fuerza descarga:

```typescript
// Crear link temporal para forzar descarga
const link = document.createElement('a');
link.href = mp4Url;
link.download = 'tiktok-video.mp4';
link.target = '_blank';
document.body.appendChild(link);
link.click();
document.body.removeChild(link);
```

**Nota:** Algunos navegadores bloquean descargas cross-origin. Si esto ocurre, se mostrará el link para que el usuario lo abra manualmente.

### Reutilización de Infraestructura

- Se usa la misma `RAPIDAPI_KEY` ya configurada
- Se usa la misma API de elisbushaj2 (plan gratuito)
- No se guarda nada en Supabase Storage (ahorra espacio)
- No se requiere autenticación (herramienta pública para visitantes)

---

## Orden de las Herramientas (Después del Cambio)

```text
HERRAMIENTAS:
1. Extractor de Guiones     ← Existente
2. Descargador de Video HD  ← NUEVO
3. Generador de Hooks IA    ← Existente
4. Generador de Guiones IA  ← Existente
```

---

## Beneficio para Usuarios

- Descargar videos virales sin marca de agua para estudiarlos
- No necesitan instalar apps externas o visitar sitios con anuncios
- Calidad HD preservada
- Descarga rápida y directa al dispositivo
