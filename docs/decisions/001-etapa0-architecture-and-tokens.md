# ADR 001 — Arquitectura de Moo Desk (Etapas 0 a 3) y Preparación para Agent Core

**Estado:** Aprobado  
**Fecha:** 2026-11-18  

## Contexto

Siguiendo el Plan de Desarrollo de Moo Desk (`Moo_Development_Plan.md`), la primera versión prioriza una experiencia de escritorio sólida, liviana y discreta en Windows antes de conectar cualquier modelo de inteligencia artificial.

## Decisiones Técnicas

1. **Frontend Desacoplado (Next.js + React + TypeScript + Tailwind CSS):**
   - Configurado con `output: "export"` para generar activos estáticos puros (`out/`) que Tauri 2 empaqueta sin requerir servidor Node en producción.
   - Rutas dedicadas (`/compact`, `/expanded`, `/settings`) y vista unificada en `/` que permite alternar instantáneamente entre los estados de ventana sin recargar el proceso.

2. **Capa de Escritorio Híbrida (`src/lib/desktop-bridge.ts` + `src-tauri/`):**
   - En **Tauri 2**, la aplicación utiliza las APIs nativas de ventana (`@tauri-apps/api/window`), bandeja del sistema (`TrayIcon` en Rust), atajos globales (`plugin-global-shortcut`) y almacenamiento local.
   - En **Navegador Web (Modo Desarrollo / Previsualización)**, el bridge activa automáticamente un entorno de escritorio simulado que permite arrastrar la ventana flotante, probar las dimensiones exactas (`300 × 160 px` y `360 × 520 px`), simular la bandeja del sistema (ocultar/mostrar) y usar el atajo de teclado configurado.

3. **Sin Simulaciones Engañosas de IA:**
   - La conversación incluye un indicador explícito de **Modo Demostración (Etapa 1–3 — Sin IA conectada)**.
   - El usuario puede enviar mensajes y recorrer flujos de demostración o activar manualmente cada estado de la mascota (`Reposo`, `Escuchando`, `Procesando`, `Respondiendo`, `Atención`) para validar la interfaz.

4. **Contrato Futuro para Agent Core (`src/types/agent-contract.ts`):**
   - Se define la interfaz `AgentProviderContract` desacoplada de proveedores específicos (Gemini API, modelos locales, FastAPI) para que la Etapa 4 solo requiera inyectar el adaptador HTTP/WebSocket local sin modificar los componentes visuales.
