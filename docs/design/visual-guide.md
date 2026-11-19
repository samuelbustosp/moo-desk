# Guía Visual y Sistema de Diseño — Moo Desk (Etapa 0)

## 1. Identidad y Logo (`logo-moo.svg`)

El isotipo original de **Moo** está compuesto por una silueta compacta de dos bloques redondeados superpuestos (cabeza `1024 × 560` sobre base `1176 × 560`, radio `192`) y dos ojos rectangulares redondeados con expresión asimétrica característica:
- **Ojo izquierdo:** `226 × 226 px` (`rx: 44`), abierto y atento.
- **Ojo derecho:** `224 × 168 px` (`rx: 44`), ligeramente entrecerrado, aportando personalidad propia sin recurrir a un avatar humanoide.

### Variantes de uso en `public/brand/`
- `logo-moo.svg` / `logo-moo.png`: activo original de marca.
- `logo-moo-vector.svg`: reconstrucción vectorial exacta (`viewBox="0 0 1176 1024"`) para escalado nítido en cualquier DPI, bandeja del sistema y animaciones de estado de la mascota.

---

## 2. Paleta y Tokens Visuales

| Token CSS | Rol | Valor Base | Uso |
|---|---|---|---|
| `--moo-bg` | Fondo principal | `#111315` | Fondo de la ventana principal |
| `--moo-elevated` | Superficie elevada | `#1A1E21` | Tarjetas, header, burbujas y paneles |
| `--moo-secondary` | Superficie secundaria | `#23292D` | Inputs, botones secundarios y selectores |
| `--moo-text` | Texto principal | `#F2F4F3` | Contenido principal de alto contraste |
| `--moo-muted` | Texto secundario | `#A3ADA8` | Subtítulos, estados, marcas de tiempo y etiquetas |
| `--moo-border` | Borde sutil | `#30383A` | Contornos de ventana y divisores (`1px`) |
| `--moo-accent` | Acento principal | `#F59E0B` | Ámbar cálido (recomendado por defecto) |
| `--moo-accent-hover` | Acento hover | `#FBBF24` | Interacción y foco activo |

### Variantes de acento configurables
1. **Ámbar Cálido (Predeterminado):** `#F59E0B` / hover `#FBBF24`
2. **Verde Natural:** `#8BCF9B` / hover `#75B88A`
3. **Violeta Digital:** `#A78BFA` / hover `#C4B5FD`

---

## 3. Dimensiones de Ventana y Estructura

- **Modo Compacto (`300 × 160 px`):**
  - Barra superior de arrastre con identidad **Moo**, indicador de estado y controles rápidos (ocultar a bandeja, expandir).
  - Mascota expresiva a la izquierda con selector/estado actual.
  - Mensaje breve de estado contextual.
  - Acciones rápidas: abrir conversación, botón visual de micrófono (modo prueba sin captura real) y expandir ventana.
- **Modo Expandido (`360 × 520 px`):**
  - **Header:** Mascota interactiva, título Moo, badge de estado, selector de vista (Conversación, Ajustes) y botón de volver a modo compacto.
  - **Área central:**
    - *Conversación:* Aviso transparente de modo demostración (sin modelo conectado), mensajes de ejemplo interactivos, sugerencias rápidas y prueba de estados visuales.
    - *Configuración:* Atajo global configurable (`Ctrl+Shift+M`), selector de color de acento, opción de **Reducir movimiento**, control de privacidad de micrófono y persistencia de posición.
  - **Composer:** Input de texto, botón de micrófono de prueba y envío.

---

## 4. Estados Visuales de la Mascota

| Estado | Identificador | Comportamiento visual |
|---|---|---|
| **Reposo** | `idle` | Silueta serena, parpadeo suave ocasional, mirada asimétrica característica de Moo. |
| **Escuchando** | `listening` | Ojos más abiertos y atentos, halo ámbar sutil alrededor de la mascota y ondas de captura visual. |
| **Procesando** | `processing` | Mirada alternante pensativa y pulso rítmico en los ojos e indicador de espera. |
| **Respondiendo** | `responding` | Expresión animada con destello cálido sincronizado con la entrega del mensaje. |
| **Atención** | `attention` | Insignia de aviso ámbar e inclinación/alerta sutil para notificaciones pendientes. |

> **Accesibilidad:** Cuando la preferencia `reduceMotion` está activa (o `prefers-reduced-motion: reduce` en el sistema), todas las animaciones continuas se desactivan y los estados se comunican mediante cambios estáticos claros de forma y color.
