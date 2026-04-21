import { debugLog } from "../utils/debugLogger"

const DEFAULT_KEYCLOAK_BASE_URL = "http://localhost:8090"
const DEFAULT_KEYCLOAK_REALM = "sello-legitimo-auth"

function getRequiredEnv(name: string, fallback?: string): string {
  const value = (import.meta.env[name] as string | undefined)?.trim()
  if (value) return value
  if (fallback) return fallback
  throw new Error(`Falta configurar ${name} en el frontend.`)
}

function buildTokenUrl(): string {
  const baseUrl = getRequiredEnv("VITE_KEYCLOAK_BASE_URL", DEFAULT_KEYCLOAK_BASE_URL)
  const realm = getRequiredEnv("VITE_KEYCLOAK_REALM", DEFAULT_KEYCLOAK_REALM)
  return `${baseUrl}/realms/${realm}/protocol/openid-connect/token`
}

export interface LoginPayload {
  username: string
  password: string
}

export interface LoginResponse {
  token: string
  refreshToken?: string
  expiresIn?: number
}

function normalizeKeycloakError(status: number, body: unknown): string {
  const payload = body && typeof body === "object" ? body as Record<string, unknown> : {}
  const errorCode = typeof payload.error === "string" ? payload.error : ""
  const errorDescription = typeof payload.error_description === "string" ? payload.error_description : ""
  const message = typeof payload.message === "string" ? payload.message : ""

  if (errorCode === "invalid_client") {
    return "El cliente de Keycloak configurado en el frontend no existe o no permite este tipo de login."
  }

  if (errorCode === "invalid_grant" || status === 401) {
    return "Credenciales incorrectas o usuario no autorizado en Keycloak."
  }

  return errorDescription || message || "Error al iniciar sesión con Keycloak"
}

export async function postLogin(payload: LoginPayload): Promise<LoginResponse> {
  const tokenUrl = buildTokenUrl()
  const clientId = getRequiredEnv("VITE_KEYCLOAK_CLIENT_ID")
  const body = new URLSearchParams({
    client_id: clientId,
    grant_type: "password",
    username: payload.username,
    password: payload.password,
  })

  const scope = (import.meta.env.VITE_KEYCLOAK_SCOPE as string | undefined)?.trim()
  if (scope) {
    body.set("scope", scope)
  }

  debugLog("auth", "Solicitando token a Keycloak", {
    url: tokenUrl,
    clientId,
    username: payload.username,
    scope,
  })

  let response: Response

  try {
    response = await fetch(tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    })
  } catch (error) {
    debugLog("auth", "Fallo de red al solicitar token", {
      url: tokenUrl,
      error: error instanceof Error ? error.message : String(error),
    })
    throw error
  }

  debugLog("auth", "Respuesta recibida desde Keycloak", {
    url: tokenUrl,
    status: response.status,
    ok: response.ok,
  })

  const responseBody = await response.json().catch(() => null)

  if (!response.ok) {
    debugLog("auth", "Keycloak rechazó el login", responseBody)
    throw new Error(normalizeKeycloakError(response.status, responseBody))
  }

  const data = (responseBody ?? {}) as {
    access_token: string
    refresh_token?: string
    expires_in?: number
  }

  if (typeof data.access_token !== "string" || !data.access_token.trim()) {
    debugLog("auth", "Keycloak respondió sin access_token válido", {
      clientId,
      body: responseBody,
    })
    throw new Error("Keycloak respondió correctamente, pero no entregó un JWT válido.")
  }

  debugLog("auth", "Token recibido correctamente", {
    expiresIn: data.expires_in,
    hasAccessToken: Boolean(data.access_token),
    hasRefreshToken: Boolean(data.refresh_token),
  })

  return {
    token: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in,
  }
}
