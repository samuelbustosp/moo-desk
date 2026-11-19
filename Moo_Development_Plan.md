# Moo — Plan de desarrollo de Desk

**Versión:** 0.1  
**Producto:** Moo Desk  
**Enfoque:** Aplicación de escritorio flotante con una mascota compacta.  
**Estrategia:** Construir primero la experiencia de escritorio; incorporar el asistente inteligente en una segunda etapa.

---

## 1. Visión del producto

Moo será un compañero de escritorio personal: una aplicación liviana, discreta y agradable de usar, que más adelante podrá conversar, recordar contexto y ejecutar acciones autorizadas.

La primera entrega no necesita inteligencia artificial. Su objetivo es establecer una experiencia visual y técnica sólida sobre la que después se conectará el asistente.

### Principios de diseño

- **Presencia discreta:** Moo acompaña sin invadir ni permanecer encima de todo.
- **Acceso rápido:** debe poder mostrarse y ocultarse fácilmente.
- **Personalidad:** la mascota y sus estados deben transmitir carácter.
- **Claridad:** interfaz sencilla, sin paneles ni controles innecesarios.
- **Privacidad y control:** el usuario decide cuándo activar voz y qué permisos conceder.
- **Evolución modular:** la interfaz no debe depender de un proveedor específico de IA.

## 2. Dirección visual

### Paleta propuesta

Se recomienda una base oscura con acentos cálidos. El verde no es obligatorio: aunque lo use Troko, Moo puede diferenciarse mediante su tono, proporciones, tipografía, mascota y lenguaje visual. Para evitar una asociación demasiado directa, la primera opción recomendada es **naranja ámbar**.

| Rol | Color sugerido | Uso |
|---|---|---|
| Fondo principal | `#111315` | Fondo de la ventana |
| Superficie elevada | `#1A1E21` | Paneles y tarjetas |
| Superficie secundaria | `#23292D` | Inputs y controles |
| Texto principal | `#F2F4F3` | Texto de alto contraste |
| Texto secundario | `#A3ADA8` | Etiquetas y metadatos |
| Borde sutil | `#30383A` | Separadores y contornos |
| Acento principal | `#F59E0B` | Acciones, foco y detalles |
| Acento hover | `#FBBF24` | Interacción y estados hover |

**Alternativa verde:** `#8BCF9B` o `#75B88A`, con un tono más apagado y natural que el verde brillante habitual en productos tecnológicos.

**Alternativa violeta:** `#A78BFA`, si se busca una identidad más digital y menos cálida.

La recomendación inicial es usar naranja ámbar como acento principal y reservar los colores de estado (éxito, advertencia y error) para su significado funcional. No conviene colorear toda la interfaz: el acento debe aparecer en pequeñas dosis.

### Estilo de interfaz

- Superficies oscuras, limpias y con profundidad moderada.
- Esquinas redondeadas, sin abusar del efecto glassmorphism.
- Bordes sutiles y sombras discretas.
- Tipografía moderna y legible.
- Animaciones cortas, suaves y funcionales.
- Iconografía consistente.
- El logo existente de Moo será la referencia de identidad; no se debe rediseñar ni sustituir sin necesidad.

### Mascota

La mascota será compacta y expresiva, pero no debe convertirse en un avatar humanoide genérico.

Debe contar con estados visuales diferenciados:
- Reposo.
- Escuchando.
- Procesando.
- Respondiendo.
- Notificación o atención.

Las animaciones deben ser sutiles y respetar la opción de reducir movimiento. La mascota no tiene que permanecer visible cuando la aplicación está oculta.

## 3. Experiencia y estructura de Desk

### 3.1 Ventana compacta

La ventana inicial será flotante y pequeña, con una dimensión de referencia aproximada de **300 × 160 px**. La medida final se ajustará durante el prototipado.

Elementos:
- Mascota compacta.
- Nombre o identidad de Moo.
- Mensaje breve o estado.
- Acceso a conversación.
- Acceso a voz, inicialmente como control visual sin conexión real.
- Acción para expandir.

El contenido debe ser mínimo. La ventana compacta no será un dashboard.

### 3.2 Ventana expandida

Al expandirse, la ventana tendrá una dimensión de referencia aproximada de **360 × 520 px**, adaptable al tamaño de pantalla.

Estructura:
1. **Header:** logo o mascota, nombre Moo, estado y controles de ventana.
2. **Conversación:** área de mensajes y estados vacíos.
3. **Composer:** campo de texto, botón de enviar y acceso al micrófono.
4. **Accesos secundarios:** historial, ajustes y personalización.

En la primera etapa, la conversación será una interfaz de demostración con mensajes de ejemplo o respuestas simuladas claramente identificadas. No se debe fingir que existe un modelo conectado.

### 3.3 Estados de la aplicación

| Estado | Comportamiento esperado |
|---|---|
| Compacto | Muestra la mascota y accesos esenciales |
| Expandido | Muestra la conversación completa |
| Oculto | La ventana desaparece, pero la app sigue ejecutándose |
| Escuchando | Indicador visual de captura de voz |
| Procesando | Animación de espera |
| Respondiendo | Presentación de respuesta |
| Configuración | Preferencias y controles de la aplicación |

Los estados de voz, procesamiento y respuesta se implementarán inicialmente como estados visuales de prueba.

### 3.4 Comportamiento de ventana

- Mover la ventana mediante el área prevista para arrastrar.
- Recordar la última posición y tamaño apropiados.
- Mostrar y ocultar sin cerrar el proceso.
- Acceso desde la bandeja del sistema.
- Atajo global configurable para invocar u ocultar Moo.
- No forzar la ventana a permanecer siempre encima de otras aplicaciones.
- Permitir cerrar la ventana o salir completamente desde el menú de bandeja.
- Comportarse correctamente con distintas resoluciones y escalado de pantalla.

## 4. Alcance por etapas

### Etapa 0 — Definición y preparación

**Objetivo:** cerrar las decisiones de producto y preparar el proyecto.

Tareas:
- Incorporar el logo existente y definir sus variantes de uso.
- Confirmar la paleta final y tipografía.
- Definir dimensiones iniciales de ventana compacta y expandida.
- Diseñar los estados de la mascota.
- Definir navegación y controles.
- Crear repositorio y estructura inicial.
- Preparar criterios de aceptación y tareas.

**Resultado:** guía visual breve, prototipo de pantallas y proyecto inicial.

### Etapa 1 — UI de Desk

**Objetivo:** construir la experiencia visual sin IA.

Tareas:
- Implementar tema oscuro y tokens de diseño.
- Crear ventana compacta.
- Crear ventana expandida.
- Implementar componentes de conversación.
- Implementar campo de texto y controles visuales.
- Crear estados vacíos, mensajes de ejemplo y estados de actividad.
- Incorporar mascota y animaciones.
- Crear pantalla de configuración inicial.
- Adaptar la interfaz a diferentes tamaños.

**Resultado:** UI navegable y coherente, todavía sin conexión a un agente.

### Etapa 2 — Aplicación de escritorio

**Objetivo:** convertir la interfaz en una aplicación de escritorio funcional.

Tareas:
- Integrar Tauri 2.
- Configurar ventana sin bordes o con el estilo elegido.
- Implementar arrastre y comportamiento de ventana.
- Implementar minimizar, ocultar y mostrar.
- Agregar bandeja del sistema.
- Implementar atajo global configurable.
- Guardar preferencias y última posición.
- Configurar inicio y cierre controlados.
- Probar empaquetado e instalación en Windows.

**Resultado:** Moo Desk instalable y utilizable como aplicación de escritorio.

### Etapa 3 — Pulido y estabilidad

**Objetivo:** asegurar que Desk sea agradable y confiable antes de agregar inteligencia.

Tareas:
- Revisar consumo de memoria y CPU en reposo.
- Evitar animaciones o procesos innecesarios cuando está oculto.
- Probar múltiples monitores y escalado.
- Mejorar accesibilidad, contraste y navegación por teclado.
- Incorporar opción de reducir movimiento.
- Revisar persistencia de preferencias.
- Probar recuperación ante cierres inesperados.
- Corregir detalles de interacción y diseño.

**Resultado:** primera versión estable de Moo Desk.

### Etapa 4 — Integración del asistente

**Objetivo:** conectar Desk con un Agent Core independiente.

Esta etapa comienza una vez que Desk esté definido y estable.

Componentes previstos:
- Agent Core como servicio separado de la interfaz.
- API local para comunicación entre Desk y el agente.
- Abstracción de proveedores de modelos.
- Chat real.
- Gestión de contexto y memoria.
- Estados reales de procesamiento.
- Manejo de errores y desconexiones.

La interfaz deberá poder cambiar de proveedor de IA sin tener que reescribir sus componentes.

### Etapa 5 — Voz, memoria y herramientas

**Objetivo:** transformar Moo en un asistente personal útil.

Posibles capacidades, incorporadas gradualmente:
- Entrada y salida de voz.
- Memoria persistente con controles para revisar y modificar información.
- Recordatorios y tareas.
- Gestión de archivos dentro de espacios autorizados.
- Consultas web.
- Integración con calendario.
- Automatizaciones y herramientas con permisos explícitos.
- Registro de acciones y confirmación antes de operaciones sensibles.

Estas capacidades no forman parte del alcance de la primera versión de Desk.

## 5. Stack tecnológico propuesto

| Capa | Tecnología | Responsabilidad |
|---|---|---|
| Desktop runtime | Tauri 2 | Ventanas, bandeja, atajos y empaquetado |
| Frontend | Next.js + React | Interfaz de usuario |
| Lenguaje | TypeScript | Tipado y lógica de UI |
| Estilos | Tailwind CSS | Sistema visual y componentes |
| Backend futuro | Python + FastAPI | Agent Core y herramientas |
| Persistencia inicial | SQLite | Preferencias y datos locales |
| Modelos futuros | Gemini API / modelos locales | Generación y comprensión |

**Nota técnica:** Tauri puede alojar una interfaz web compilada; Next.js debe configurarse para exportación estática si se elige mantenerlo dentro de Tauri. No se necesita desplegar un servidor Next.js en la nube para la aplicación de escritorio.

La comunicación con el futuro Agent Core debe pasar por una interfaz definida, evitando acoplar la UI a detalles internos del backend.

## 6. Arquitectura conceptual

```text
Moo Desk
│
├── UI
│   ├── Compact Window
│   ├── Expanded Window
│   ├── Conversation
│   ├── Mascot
│   └── Settings
│
├── Desktop Layer (Tauri)
│   ├── Window Management
│   ├── Tray
│   ├── Global Shortcuts
│   └── Local Preferences
│
└── Future Agent Core
    ├── Conversation API
    ├── Model Providers
    ├── Memory
    ├── Tools
    ├── Permissions
    └── Scheduler
```

En la primera entrega se implementan la UI y Desktop Layer. Agent Core queda como módulo futuro, sin simular integraciones reales.

## 7. Organización inicial del proyecto

Una estructura posible, organizada por funcionalidades:

```text
moo/
├── src/
│   ├── app/
│   │   ├── compact/
│   │   ├── expanded/
│   │   └── settings/
│   ├── features/
│   │   ├── mascot/
│   │   │   ├── components/
│   │   │   ├── types/
│   │   │   └── hooks/
│   │   ├── conversation/
│   │   │   ├── components/
│   │   │   ├── types/
│   │   │   └── hooks/
│   │   ├── window-controls/
│   │   └── preferences/
│   ├── components/
│   │   ├── ui/
│   │   └── layout/
│   ├── lib/
│   ├── styles/
│   └── types/
├── src-tauri/
│   ├── src/
│   ├── capabilities/
│   └── tauri.conf.json
├── public/
│   └── brand/
└── docs/
    ├── design/
    └── decisions/
```

La estructura se puede ajustar al crear el proyecto. Conviene evitar abstraer demasiado antes de tener componentes reales.

## 8. Seguridad y privacidad desde el inicio

Aunque la primera versión no ejecute acciones inteligentes, la arquitectura debe prepararse para hacerlo de forma segura:

- No dar acceso irrestricto al sistema de archivos ni a la terminal.
- Solicitar permisos solo cuando una función los necesite.
- Separar interfaz, agente y herramientas.
- Validar las acciones en el backend, no solo en la UI.
- Pedir confirmación para acciones sensibles o destructivas.
- Registrar las acciones relevantes.
- Permitir desactivar micrófono y otras integraciones.
- No almacenar conversaciones o audio sin una decisión explícita de producto y controles adecuados.

## 9. Criterios de finalización de la primera versión

Moo Desk se considerará listo para integrar el asistente cuando:

- [ ] La ventana compacta se vea correctamente.
- [ ] La ventana pueda expandirse y volver al modo compacto.
- [ ] La ventana pueda moverse y recuerde su posición.
- [ ] Se pueda ocultar y recuperar desde la bandeja.
- [ ] El atajo global funcione y sea configurable.
- [ ] El logo y la identidad visual estén aplicados consistentemente.
- [ ] La mascota tenga estados visuales básicos.
- [ ] La conversación permita recorrer una experiencia de demostración.
- [ ] Las preferencias básicas persistan entre sesiones.
- [ ] La aplicación pueda instalarse y ejecutarse en Windows.
- [ ] El modo reposo sea liviano y no consuma recursos innecesariamente.
- [ ] No haya integraciones simuladas que se presenten como funcionalidades reales.

## 10. Orden de trabajo recomendado

1. Cerrar identidad visual: logo, paleta, tipografía y mascota.
2. Diseñar la ventana compacta.
3. Diseñar la ventana expandida.
4. Definir componentes y tokens visuales.
5. Implementar la UI en React.
6. Integrar Tauri 2 y el comportamiento de escritorio.
7. Incorporar bandeja, atajos y persistencia.
8. Probar, pulir y empaquetar para Windows.
9. Recién entonces comenzar Agent Core.

---

## Decisiones iniciales

- **Nombre:** Moo.
- **Producto inicial:** Moo Desk.
- **Interfaz:** ventana flotante que se expande al interactuar.
- **Mascota:** compacta y discreta.
- **Tema:** oscuro.
- **Acento recomendado:** naranja ámbar.
- **Primera plataforma:** Windows.
- **Prioridad:** experiencia de escritorio antes que inteligencia artificial.
