# 🐮 Moo Desk

<p align="center">
  <img src="public/brand/logo-moo.svg" alt="Moo Desk Logo" width="120" height="120" />
</p>

<p align="center">
  <strong>Compañero de escritorio flotante, inteligente y discreto con notch interactivo, hábitos con lore, recordatorios y agente de voz local en sandbox.</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-15.1-black?style=flat-square&logo=next.js" alt="Next.js" />
  <img src="https://img.shields.io/badge/React-19-blue?style=flat-square&logo=react" alt="React 19" />
  <img src="https://img.shields.io/badge/Tauri-2.2-24C8D8?style=flat-square&logo=tauri" alt="Tauri 2" />
  <img src="https://img.shields.io/badge/TypeScript-5.7-blue?style=flat-square&logo=typescript" alt="TypeScript" />
  <img src="https://img.shields.io/badge/TailwindCSS-3.4-38B2AC?style=flat-square&logo=tailwind-css" alt="Tailwind CSS" />
  <img src="https://img.shields.io/badge/Whisper-Local_ONNX-orange?style=flat-square&logo=huggingface" alt="Whisper" />
  <img src="https://img.shields.io/badge/Database-SQLite_Local-003B57?style=flat-square&logo=sqlite" alt="SQLite" />
  <img src="https://img.shields.io/badge/Privacy-100%25_Offline-emerald?style=flat-square" alt="100% Offline" />
</p>

---

## 🌟 Características Principales

### 🛸 1. Notch Flotante Dinámico & Mascota Viva
- **Diseño flotante discreto:** Se sitúa en la parte superior de la pantalla ocupando un espacio mínimo (`210 × 44 px`) y se expande suavemente (`820 × 520 px`) cuando lo necesitas.
- **Mascota interactiva (Moo):**
  - Ojos con seguimiento dinámico del cursor del ratón.
  - Ciclo de pestañeo natural y estados emocionales reactivos (*Reposo*, *Escuchando*, *Pensando*, *Completado*, *Amor*).
  - Modo **Reducir movimiento** disponible para entornos de máxima sobriedad.

### 🎙️ 2. Voz y Transcripción Local (100% Offline y Privada)
- **Whisper Cuantizado en Local:** Transcripción de voz integrada mediante `@huggingface/transformers` (`onnx-community/whisper-base`), procesada íntegramente en tu máquina mediante Web Audio API (16 kHz mono con normalización de ganancia y recorte automático de silencios).
- **Cero envío a la nube:** Tus audios nunca salen de tu ordenador.
- **Comprensión natural en español:** Entiende frases habladas fluidas, asignaciones explícitas de nombres (*"que se llame 2"*, *"con nombre reunión"*) y fechas relativas (*"mañana a las 10"*, *"el 6 de febrero"*).

### 🛡️ 3. Agente Inteligente con Sandbox Estricto
- **Seguridad garantizada por diseño:** Moo tiene **estrictamente prohibido** acceder a archivos de tu sistema operativo, ejecutar scripts externos o eliminar datos.
- **Alcance controlado:** Únicamente puede **Crear**, **Modificar** y **Completar** elementos en sus 3 módulos:
  - 🔔 **Recordatorios** (con fecha, hora y estado).
  - 📋 **Tareas** (recurrentes: diarias, semanales, mensuales).
  - 🌱 **Hábitos** (con categorías y rachas).
- **Acciones masivas:** Soporta comandos inteligentes en lote como *"completa todos los hábitos de hoy"* o *"marca todas las tareas diarias como hechas"*.
- **Compatibilidad híbrida:** Funciona con su motor seguro local integrado y es compatible opcionalmente con cualquier modelo local de **Ollama** (`llama3.2`, `qwen2.5`, etc.).

### 💬 4. Sección de Chat Efímera
- Al dictar una orden por voz o enviar un mensaje, se abre una vista de chat interactiva que muestra la transcripción exacta y las acciones tomadas por Moo.
- **Máxima privacidad:** Los mensajes del chat son efímeros; no se guardan en disco y se limpian automáticamente al cerrar o colapsar el notch.

### ⚡ 5. Productividad: Recordatorios, Tareas y Hábitos con Lore
- **Recordatorios con Fechas:** Filtros por *Hoy*, *Próximos*, *Pasados* y *Todos*, con selector visual emergente de fecha y hora.
- **Tareas Programadas:** Agrupadas por frecuencia (*Diarias*, *Semanales*, *Mensuales*) con contador de pendientes.
- **Hábitos con Lore & Rachas:** Cada hábito incluye arte de lore temático animado (*Planta*, *Fuego*, *Libros*, *Cristal*) y registro visual de rachas.

### ⚙️ 6. Panel de Ajustes Organizado por Pestañas
- 🤖 **IA y Sandbox:** Estado del servidor Ollama, prueba de conexión en tiempo real e inspección de los límites de seguridad.
- 🎙️ **Voz y Micrófono:** Prueba interactiva de permisos de micrófono y estado de Whisper.
- 🎨 **Apariencia:** Paleta principal personalizable (**Naranja Ámbar** `#F59E0B`, **Verde Natural** `#8BCF9B` o **Violeta Digital** `#A78BFA`) y conmutador de reducción de movimiento.
- ⌨️ **Atajos y Sistema:** Grabador interactivo del atajo global de teclado, comportamiento de ventana y estado de la base de datos local.

---

## 🏗️ Arquitectura Técnica

```
Moo Desk
├── Frontend: Next.js 15 (App Router) + React 19 + Tailwind CSS + Lucide
│   ├── src/components/layout/     # Notch compacto y ventana expandida
│   ├── src/features/mascot/       # Mascota Moo interactiva y arte de lore
│   ├── src/features/conversation/ # Grabadora de voz, chat efímero y hook de audio
│   ├── src/features/preferences/  # Panel de ajustes en pestañas y temas
│   ├── src/lib/local-whisper.ts   # Pipeline de Whisper cuantizado ONNX (Transformers.js)
│   ├── src/lib/agent-client.ts    # Cliente del agente y parser de lenguaje natural
│   └── src/lib/db.ts              # Capa de sincronización y fallback offline
├── Backend: Node.js 22 (Servidor local ligero)
│   ├── backend/server.mjs         # API REST + SQLite (node:sqlite) + Sandbox Guardrails
│   └── backend/moo.sqlite         # Base de datos local (ignorada en git)
└── Desktop: Tauri 2 (Rust)
    ├── src-tauri/src/lib.rs       # Ventana flotante, bandeja del sistema y atajos globales
    └── src-tauri/tauri.conf.json  # Configuración y permisos mínimos nativos
```

---

## 🚀 Puesta en Marcha

### Prerrequisitos
- [Node.js](https://nodejs.org/) v20 o superior.
- [pnpm](https://pnpm.io/) v9 o v10 (`npm i -g pnpm`).
- *(Opcional)* [Ollama](https://ollama.ai/) si deseas conectar un modelo local de lenguaje.
- *(Opcional)* [Rust & Cargo](https://www.rust-lang.org/) si deseas compilar el binario nativo de escritorio con Tauri 2.

### 1. Clonar el repositorio e instalar dependencias

```bash
git clone https://github.com/tu-usuario/moo-desk.git
cd moo-desk

# Instalar paquetes con pnpm
pnpm install
```

### 2. Configurar variables de entorno (Opcional)

Moo incluye valores predeterminados seguros listos para funcionar sin configuración extra. Si deseas personalizar puertos o URLs, puedes copiar el archivo de ejemplo:

```bash
cp .env.example .env.local
```

### 3. Ejecutar en modo desarrollo

Inicia simultáneamente el servidor backend local (`backend/server.mjs` en el puerto 8000) y la interfaz de Next.js (en `http://localhost:3000`):

```bash
pnpm dev
```

Abre tu navegador en [http://localhost:3000](http://localhost:3000) para interactuar con el notch flotante de Moo.

---

## 🖥️ Ejecución y Compilación con Tauri 2 (Escritorio)

Para ejecutar Moo como aplicación de escritorio nativa para Windows:

```bash
# Modo desarrollo con recarga en vivo en Tauri
pnpm tauri:dev

# Generar el instalador ejecutable optimizado (.exe / .msi)
pnpm tauri:build
```

---

## ⌨️ Atajos y Controles de Teclado

| Atajo | Acción |
|---|---|
| `Ctrl + Shift + M` | Desplegar / plegar el Notch de Moo (personalizable en Ajustes) |
| `Escape` | Colapsar ventana expandida / Cerrar modales |
| `Espacio` / Mantener pulsado botón de micro | Iniciar grabación de audio y dictado por voz |

---

## 🔒 Privacidad y Seguridad

- **100% Local:** Ningún dato personal, tarea, hábito o audio grabado se transfiere a servidores externos.
- **Sin telemetría invasiva:** La base de datos SQLite permanece estrictamente en tu equipo.
- **Sandbox estricto:** El asistente no tiene capacidades de borrado ni de interacción fuera del ámbito de Moo Desk.

---

## 📄 Licencia

Distribuido bajo la licencia MIT. Consulta el archivo `LICENSE` para más detalles.
