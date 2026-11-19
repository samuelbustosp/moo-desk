import { WINDOW_DIMENSIONS, type WindowMode, type WindowPosition } from "@/types";

export function isTauriEnvironment(): boolean {
  if (typeof window === "undefined") return false;
  return Boolean("__TAURI_INTERNALS__" in window || "__TAURI__" in window);
}

export async function syncTauriWindowMode(mode: WindowMode): Promise<void> {
  if (!isTauriEnvironment()) return;

  try {
    const {
      getCurrentWindow,
      LogicalSize,
      LogicalPosition,
      currentMonitor,
    } = await import("@tauri-apps/api/window");
    const appWindow = getCurrentWindow();

    if (mode === "hidden") {
      await appWindow.hide();
      return;
    }

    const target =
      mode === "notch" ? WINDOW_DIMENSIONS.notch : WINDOW_DIMENSIONS.expanded;

    await appWindow.setSize(new LogicalSize(target.width, target.height));

    const monitor = await currentMonitor();
    if (monitor) {
      const scale = monitor.scaleFactor || 1;
      const screenWidthLogical = monitor.size.width / scale;
      const monitorXLogical = monitor.position.x / scale;
      const monitorYLogical = monitor.position.y / scale;
      const centeredX = Math.round(
        monitorXLogical + (screenWidthLogical - target.width) / 2
      );
      await appWindow.setPosition(
        new LogicalPosition(centeredX, Math.round(monitorYLogical))
      );
    }

    await appWindow.show();
    if (mode === "expanded") {
      await appWindow.setFocus();
    }
  } catch (err) {
    console.warn("[Moo] No se pudo sincronizar la ventana Tauri:", err);
  }
}

export async function startNativeWindowDrag(): Promise<boolean> {
  if (!isTauriEnvironment()) return false;

  try {
    const { getCurrentWindow } = await import("@tauri-apps/api/window");
    await getCurrentWindow().startDragging();
    return true;
  } catch {
    return false;
  }
}

export async function applyNativeWindowPosition(pos: WindowPosition): Promise<void> {
  if (!isTauriEnvironment()) return;
  if (pos.x === 0 && pos.y === 0) return;

  try {
    const { getCurrentWindow, LogicalPosition } = await import("@tauri-apps/api/window");
    await getCurrentWindow().setPosition(new LogicalPosition(pos.x, pos.y));
  } catch {
    // ignore
  }
}

export async function registerNativeGlobalShortcut(
  shortcut: string,
  onTrigger: () => void
): Promise<() => void> {
  if (!isTauriEnvironment()) return () => {};

  let cleanedUp = false;
  try {
    const { register, unregisterAll } = await import(
      "@tauri-apps/plugin-global-shortcut"
    );
    await unregisterAll();
    if (!cleanedUp && shortcut.trim()) {
      await register(shortcut, (event) => {
        if (event.state === "Pressed") {
          onTrigger();
        }
      });
    }
    return () => {
      cleanedUp = true;
      unregisterAll().catch(() => {});
    };
  } catch {
    return () => {};
  }
}
