

## Plan: Limpiar Secciones y Agregar Traducción de Guiones

### Resumen
Este plan cubre tres cambios solicitados:
1. Eliminar "Mi Biblioteca" de la sección "Tu Centro" en el sidebar
2. Eliminar "Generador de Videos UGC" de la página de Herramientas
3. Agregar opción de traducción al Extractor de Guiones (ES ↔ EN)

---

## Cambio 1: Eliminar "Mi Biblioteca" del Sidebar

**Archivo:** `src/components/layout/DashboardSidebar.tsx`

**Qué se elimina:**
```javascript
// Línea 68 - Se elimina esta entrada:
{ to: "/library", labelEs: "Mi Biblioteca", labelEn: "My Library", icon: FolderOpen, lockedForVisitor: true },
```

**Resultado:**
- La sección "TU CENTRO" mostrará: Herramientas (solo founders), Favoritos, Afiliados
- La ruta `/library` seguirá existiendo pero no aparecerá en navegación

---

## Cambio 2: Eliminar "Generador de Videos UGC" de Herramientas

**Archivo:** `src/pages/Tools.tsx`

**Qué se elimina:**
- Card completa del UGC Generator (líneas 950-1144)
- Estados relacionados (líneas 97-102): `ugcProductImage`, `ugcProductDescription`, `ugcAvatarType`, `ugcImagePreview`
- Funciones relacionadas (líneas 104-124): `handleUgcImageChange`, `handleGenerateUGC`
- Import del hook `useUGCGeneration` (línea 20)
- Iconos no usados: `Video`, `Upload`, `Image`, `Volume2`, `User` (línea 13)

**Resultado:**
- La página Tools mostrará solo 3 herramientas:
  1. Extractor de Guiones
  2. Generador de Hooks IA  
  3. Generador de Guiones IA

---

## Cambio 3: Agregar Traducción al Extractor de Guiones

**Archivo:** `src/pages/Tools.tsx`

### Nuevo estado:
```typescript
const [isTranslating, setIsTranslating] = useState(false);
const [translatedTranscript, setTranslatedTranscript] = useState<string | null>(null);
const [translationDirection, setTranslationDirection] = useState<'es-to-en' | 'en-to-es' | null>(null);
```

### Nueva función:
```typescript
const handleTranslate = async (direction: 'es-to-en' | 'en-to-es') => {
  setIsTranslating(true);
  setTranslationDirection(direction);
  
  try {
    const { data, error } = await supabase.functions.invoke("translate-script", {
      body: { 
        text: transcript,
        targetLanguage: direction === 'es-to-en' ? 'en' : 'es'
      }
    });
    
    if (error) throw error;
    if (data?.translation) {
      setTranslatedTranscript(data.translation);
    }
  } catch (err) {
    toast({ title: "Error", description: err.message, variant: "destructive" });
  } finally {
    setIsTranslating(false);
  }
};
```

### Nueva UI en el tab "Script":
Se agregan dos botones de traducción junto a los botones de Descargar y Copiar:

```text
┌─────────────────────────────────────────────────────┐
│  Transcripción        [🇪🇸→🇬🇧] [🇬🇧→🇪🇸] [⬇️] [📋] │
├─────────────────────────────────────────────────────┤
│                                                     │
│  [Contenido del guión original o traducido]        │
│                                                     │
└─────────────────────────────────────────────────────┘
```

- Botón "ES → EN": Traduce de español a inglés
- Botón "EN → ES": Traduce de inglés a español
- Al hacer clic, muestra spinner y luego el texto traducido
- Botón "Original" aparece después de traducir para volver al texto original

### Nueva Edge Function:
**Archivo:** `supabase/functions/translate-script/index.ts`

```typescript
// Usa Lovable AI Gateway (google/gemini-3-flash-preview)
// Prompt de sistema optimizado para traducciones de scripts de venta

const systemPrompt = targetLanguage === 'en' 
  ? "You are a professional translator. Translate the following TikTok sales script from Spanish to English. Keep the same tone, style, and selling energy. Preserve any emojis or special formatting."
  : "Eres un traductor profesional. Traduce el siguiente guión de ventas de TikTok de inglés a español. Mantén el mismo tono, estilo y energía de venta. Preserva emojis y formato especial.";
```

---

## Archivos a Crear

| Archivo | Propósito |
|---------|-----------|
| `supabase/functions/translate-script/index.ts` | Edge function para traducción con Lovable AI |

## Archivos a Modificar

| Archivo | Cambios |
|---------|---------|
| `src/components/layout/DashboardSidebar.tsx` | Eliminar "Mi Biblioteca" de workspaceItems |
| `src/pages/Tools.tsx` | Eliminar sección UGC, agregar traducción |
| `docs/tasks.md` | Marcar tareas como completadas |

---

## Resumen Visual de Cambios

```text
ANTES:                          DESPUÉS:
                               
TU CENTRO                       TU CENTRO
├── Herramientas               ├── Herramientas
├── Mi Biblioteca  ← ELIMINAR  ├── Favoritos
├── Favoritos                  └── Afiliados
└── Afiliados                  

HERRAMIENTAS:                   HERRAMIENTAS:
1. Extractor de Guiones        1. Extractor de Guiones + 🌐 Traducir
2. Generador de Hooks IA       2. Generador de Hooks IA
3. Generador de Guiones IA     3. Generador de Guiones IA
4. Generador UGC ← ELIMINAR
```

---

## Impacto

- **Navegación simplificada:** Menos opciones = menos confusión
- **Herramientas enfocadas:** Solo las 3 herramientas core de scripts
- **Nueva funcionalidad:** Traducción bidireccional ES ↔ EN para scripts extraídos
- **Internacionalización:** Creadores pueden adaptar guiones exitosos de otros mercados

