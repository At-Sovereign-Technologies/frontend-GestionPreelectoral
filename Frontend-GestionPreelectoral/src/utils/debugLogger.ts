const debugEnabled = import.meta.env.DEV || import.meta.env.VITE_DEBUG_FRONTEND === "true"

export function debugLog(scope: string, message: string, details?: unknown): void {
  if (!debugEnabled) return

  const prefix = `[debug:${scope}] ${message}`
  if (typeof details === "undefined") {
    console.info(prefix)
    return
  }

  console.info(prefix, details)
}
