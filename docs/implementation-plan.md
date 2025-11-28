## 🛠️ Secuencia paso a paso

### Semana 1: Fundamentos funcionales

- [ ] Crear proyecto en Supabase (con tabla `daily_feed`)
- [ ] Implementar auth básica: email + contraseña (en español)
- [ ] Definir esquema de tabla `daily_feed` con todos los campos del Excel
- [ ] Subida manual de archivo `.xlsx` en panel `/admin`
- [ ] Automatizar:
  - Borrar registros existentes
  - Leer y mapear columnas del Excel
  - Ordenar por `ingresos_mxn` y limitar a top 20
  - Descargar audio desde `tiktok_url`
  - Llamar a Whisper API → `transcripcion_original`
  - Llamar a GPT-4 Turbo → `guion_ia`
  - Guardar todos los campos

---

### Semana 2: Interfaz de usuario

- [ ] Crear landing pública `/`
  - Título, subtítulo, beneficios visuales
  - CTA claro: "Entrar al panel de análisis"
- [ ] Crear login `/login` y registro `/register` con microcopy personalizado
- [ ] Estilizar con Tailwind + shadcn/ui
- [ ] Asegurar grid responsive: 4 columnas desktop, 2 tablet, 1 móvil
- [ ] Añadir animaciones suaves (hover, modales, etc.)

---

### Semana 3: Dashboard `/app`

- [ ] Mostrar 20 tarjetas con:
  - Video embebido (TikTok URL)
  - Ranking visual (#1, #2…)
  - Métricas clave (ventas, ingresos, ROAS, etc.)
  - Botón "Ver guión IA" que abre modal
- [ ] Modal con:
  - Transcripción original (`transcripcion_original`)
  - Reescritura IA (`guion_ia`)
  - Campo editable para guardar `guion_personalizado`
- [ ] Guardar versión personalizada por usuario (opcional en V1)

---

### Semana 4: Integraciones y pagos

- [ ] Conectar Stripe (plan único de $25 USD/mes)
- [ ] Proteger rutas privadas según rol (`user`, `admin`)
- [ ] Subida de archivo limitada a fundador (por correo o rol)
- [ ] Mostrar timestamp `created_at` en el dashboard

---

## 📆 Línea de tiempo

| Semana | Hitos                                                                 |
|--------|-----------------------------------------------------------------------|
| 1      | Backend funcional + parser de Excel + conexión con APIs de IA        |
| 2      | UI pública + Auth + layout base con diseño responsive                |
| 3      | Dashboard completo con tarjetas + modales funcionales                |
| 4      | Stripe + roles + protección de rutas + ajustes finales para MVP      |

---

## 🧑‍💻 Roles de equipo sugeridos

- **PM / Fundador:** carga manual del feed diario, ajustes de guión, testeo UX
- **Dev frontend:** implementación UI (React, Tailwind, shadcn/ui)
- **Dev backend:** conexión Supabase, transcripción IA, subida Excel
- **Diseñador UI (opcional):** validar estética SaaS, grid, microinteracciones
- **Tester guerrilla:** 3 creadores reales para probar flujo y usabilidad (semanal)

---

## 🎯 Rituales recomendados

- ✅ Revisión diaria del feed generado por IA (1 creador de confianza)
- 🔁 Pruebas de usabilidad semanales (30 min, 3 usuarios)
- 📦 Deploy semanal de mejoras en bloque
- 📈 Tracking de uso básico: qué guiones se editan y guardan

---

## 🎁 Integraciones opcionales y metas futuras

- 🧠 Sugerencias automáticas de hashtags o hooks para el guión
- 📼 Integración con herramientas de edición de video (CapCut, Descript)
- 🎥 Generación automática de video con B-roll cargado por el usuario (fase 2)
- 🔗 API pública para agencias o dashboards externos
