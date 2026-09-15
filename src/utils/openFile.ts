/**
 * Utility for opening files, URLs, and local paths using OS default applications
 * Compatible with Tauri v2, Electron, and Web browser environments.
 */

import { openPath, openUrl } from "@tauri-apps/plugin-opener";

export async function openDesktopFile(target: { path?: string; url?: string; name?: string; type?: string } | string) {
  let path = typeof target === "string" ? target : target.path;
  let url = typeof target === "string" ? undefined : target.url;
  const fileName = typeof target === "object" ? target.name || "dosya" : "dosya";

  // 1. Try local filesystem path first via Tauri v2 plugin-opener
  if (path) {
    try {
      await openPath(path);
      return true;
    } catch (err) {
      console.warn("Tauri openPath error:", err);
    }

    // Try Electron openPath if present
    const win = window as any;
    if (win.electronAPI?.openPath) {
      try {
        win.electronAPI.openPath(path);
        return true;
      } catch (err) {
        console.warn("Electron openPath error:", err);
      }
    }
    if (win.electron?.shell?.openPath) {
      try {
        win.electron.shell.openPath(path);
        return true;
      } catch (err) {
        console.warn("Electron shell openPath error:", err);
      }
    }
  }

  // 2. Try URL (http, https, file://) via Tauri v2 openUrl
  const targetUrl = url || (path && (path.startsWith("http") || path.startsWith("file://")) ? path : undefined);
  if (targetUrl) {
    if (targetUrl.startsWith("http://") || targetUrl.startsWith("https://")) {
      try {
        await openUrl(targetUrl);
        return true;
      } catch {
        window.open(targetUrl, "_blank", "noopener,noreferrer");
        return true;
      }
    }

    if (targetUrl.startsWith("file://")) {
      const cleanPath = decodeURIComponent(targetUrl.replace("file:///", "").replace("file://", ""));
      try {
        await openPath(cleanPath);
        return true;
      } catch {
        // Fallback to window.open
        window.open(targetUrl, "_blank");
        return true;
      }
    }
  }

  // 3. Fallback for Blob / Object URLs or Data URLs or downloaded files:
  if (url && (url.startsWith("blob:") || url.startsWith("data:"))) {
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    a.target = "_blank";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    return true;
  }

  // 4. Default fallback: trigger browser open
  if (url) {
    window.open(url, "_blank", "noopener,noreferrer");
    return true;
  }

  if (path) {
    // If path is string without protocol, try window.open or alert
    window.open(path, "_blank");
    return true;
  }

  return false;
}

export async function openDesktopUrl(url: string) {
  if (!url) return;
  try {
    await openUrl(url);
  } catch {
    window.open(url, "_blank", "noopener,noreferrer");
  }
}
