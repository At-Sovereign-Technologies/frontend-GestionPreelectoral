import { debugLog } from "../utils/debugLogger"

const DEFAULT_AUTHELIA_URL = "https://127.0.0.1:9091"

function getEnv(name: string, fallback?: string): string {
  const value = (import.meta.env[name] as string | undefined)?.trim()
  if (value) return value
  if (fallback !== undefined) return fallback
  throw new Error(`Falta configurar ${name} en el frontend.`)
}

function getAutheliaUrl(): string {
  return getEnv("VITE_AUTHELIA_URL", DEFAULT_AUTHELIA_URL)
}

function getClientId(): string {
  return getEnv("VITE_OIDC_CLIENT_ID")
}

function getRedirectUri(): string {
  return getEnv("VITE_OIDC_REDIRECT_URI", `${window.location.origin}/callback`)
}

// ─── PKCE helpers ────────────────────────────────────────────────────────────

function generateRandomString(byteLength: number): string {
  const array = new Uint8Array(byteLength)
  crypto.getRandomValues(array)
  return Array.from(array, (b) => b.toString(16).padStart(2, "0")).join("")
}

async function sha256(plain: string): Promise<ArrayBuffer> {
  const data = new TextEncoder().encode(plain)
  return crypto.subtle.digest("SHA-256", data)
}

function base64UrlEncode(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf)
  let str = ""
  for (const byte of bytes) str += String.fromCharCode(byte)
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "")
}

// ─── Public API ──────────────────────────────────────────────────────────────

export interface LoginResponse {
  token: string
  idToken?: string
  refreshToken?: string
  expiresIn?: number
}

/**
 * Genera la URL de autorizacion OIDC con PKCE y guarda el verifier/state
 * en sessionStorage. Redirige al portal de login de Authelia.
 */
export async function initiateAutheliaLogin(): Promise<void> {
  const codeVerifier = generateRandomString(64)
  const state = generateRandomString(32)

  const hashed = await sha256(codeVerifier)
  const codeChallenge = base64UrlEncode(hashed)

  sessionStorage.setItem("pkce_verifier", codeVerifier)
  sessionStorage.setItem("oauth_state", state)

  const params = new URLSearchParams({
    response_type: "code",
    client_id: getClientId(),
    redirect_uri: getRedirectUri(),
    scope: "openid profile email groups",
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
    state,
  })

  const url = `${getAutheliaUrl()}/api/oidc/authorization?${params.toString()}`
  debugLog("auth", "Redirigiendo a Authelia para autenticacion", { url })
  window.location.href = url
}

/**
 * Intercambia el authorization code por tokens.
 * Valida el state para prevenir ataques CSRF.
 */
export async function exchangeCodeForToken(code: string, state: string): Promise<LoginResponse> {
  const storedState = sessionStorage.getItem("oauth_state")
  if (!storedState || state !== storedState) {
    throw new Error("Estado OAuth2 invalido. Posible ataque CSRF, inicia sesion nuevamente.")
  }

  const codeVerifier = sessionStorage.getItem("pkce_verifier")
  if (!codeVerifier) {
    throw new Error("PKCE verifier no encontrado. Inicia sesion nuevamente.")
  }

  sessionStorage.removeItem("pkce_verifier")
  sessionStorage.removeItem("oauth_state")

  const tokenUrl = "/authelia-proxy/api/oidc/token"
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: getClientId(),
    redirect_uri: getRedirectUri(),
    code,
    code_verifier: codeVerifier,
  })

  debugLog("auth", "Intercambiando codigo por token en Authelia", {
    url: tokenUrl,
    clientId: getClientId(),
  })

  let response: Response
  try {
    response = await fetch(tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    })
  } catch (error) {
    debugLog("auth", "Fallo de red al conectar con Authelia", { error })
    throw new Error("No se pudo conectar con Authelia. Verifica que el servicio este activo.")
  }

  const responseBody = await response.json().catch(() => null)

  if (!response.ok) {
    const data = (responseBody ?? {}) as Record<string, unknown>
    const description = typeof data.error_description === "string" ? data.error_description : ""
    const code_ = typeof data.error === "string" ? data.error : ""

    if (code_ === "invalid_grant") {
      throw new Error("Codigo de autorizacion invalido o expirado.")
    }
    if (response.status === 401 || response.status === 403) {
      throw new Error("Acceso no autorizado en Authelia.")
    }
    throw new Error(description || "Error al obtener token de Authelia.")
  }

  const data = (responseBody ?? {}) as {
    access_token: string
    id_token?: string
    refresh_token?: string
    expires_in?: number
  }

  if (typeof data.access_token !== "string" || !data.access_token.trim()) {
    throw new Error("Authelia respondio sin access_token valido.")
  }

  debugLog("auth", "Tokens recibidos desde Authelia", {
    hasAccessToken: true,
    hasIdToken: Boolean(data.id_token),
    expiresIn: data.expires_in,
  })

  return {
    token: data.access_token,
    idToken: data.id_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in,
  }
}

/**
 * Login headless con formulario propio: envía usuario/contraseña directamente a la API de
 * Authelia a través del proxy de Vite (/authelia-proxy), sin redirigir al portal de Authelia.
 * Al autenticar correctamente navega al /callback con el authorization code.
 */
export async function loginWithCredentials(username: string, password: string): Promise<void> {
  const codeVerifier = generateRandomString(64)
  const state = generateRandomString(32)
  const hashed = await sha256(codeVerifier)
  const codeChallenge = base64UrlEncode(hashed)

  sessionStorage.setItem("pkce_verifier", codeVerifier)
  sessionStorage.setItem("oauth_state", state)

  const authParams = new URLSearchParams({
    response_type: "code",
    client_id: getClientId(),
    redirect_uri: getRedirectUri(),
    scope: "openid profile email groups",
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
    state,
  })

  const proxyBase = "/authelia-proxy"

  // Paso 1: Iniciar el flujo OIDC para crear la solicitud de autorización pendiente en sesión
  await fetch(`${proxyBase}/api/oidc/authorization?${authParams.toString()}`, {
    credentials: "include",
    redirect: "manual",
  })

  // Paso 2: Enviar credenciales al firstfactor de Authelia
  const resp = await fetch(`${proxyBase}/api/firstfactor`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ username, password, keepMeLoggedIn: false }),
  })

  if (!resp.ok) {
    let message = "Usuario o contraseña incorrectos."
    try {
      const body = (await resp.json()) as { message?: string; status?: string }
      if (body.message) message = body.message
    } catch { /* ignore */ }
    throw new Error(message)
  }

  const resData = (await resp.json()) as { status: string; data?: { redirect?: string } }

  if (resData.status !== "OK") {
    throw new Error("Usuario o contraseña incorrectos.")
  }

  debugLog("auth", "Firstfactor exitoso, redirigiendo con codigo", { hasRedirect: Boolean(resData.data?.redirect) })

  // Paso 3: Navegar al callback con el codigo de autorización
  if (resData.data?.redirect) {
    window.location.href = resData.data.redirect
  } else {
    // Fallback: completar autorización directamente vía proxy
    window.location.href = `${proxyBase}/api/oidc/authorization?${authParams.toString()}`
  }
}

