import { postLogin, type LoginPayload } from "../api/authApi"
import { validarTokenConGateway } from "../api/gatewayValidation"
import { debugLog } from "../utils/debugLogger"

const TOKEN_KEY = "sello_token"
const USER_KEY = "sello_user"
const REFRESH_TOKEN_KEY = "sello_refresh_token"
const TOKEN_EXP_KEY = "sello_token_exp"

export interface AuthUser {
  id: string
  name: string
  role: string
}

interface TokenProfile {
  preferred_username?: string
  name?: string
}

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const [, payload] = token.split(".")
    if (!payload) return null
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/")
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=")
    return JSON.parse(window.atob(padded)) as Record<string, unknown>
  } catch {
    return null
  }
}

function getTokenProfile(): TokenProfile | null {
  const token = getToken()
  if (!token) return null
  return decodeJwtPayload(token) as TokenProfile | null
}

function resolveTokenExpiration(token: string, expiresIn?: number): number | null {
  const payload = decodeJwtPayload(token)
  if (typeof payload?.exp === "number") {
    return payload.exp * 1000
  }
  if (typeof expiresIn === "number") {
    return Date.now() + expiresIn * 1000
  }
  return null
}

function ensureToken(token: string | undefined): string {
  if (typeof token === "string" && token.trim()) {
    return token
  }
  throw new Error("No se recibió un JWT válido desde Keycloak.")
}

export async function login(payload: LoginPayload): Promise<void> {
  debugLog("auth-service", "Iniciando login en frontend", {
    username: payload.username,
  })

  const data = await postLogin(payload)
  const token = ensureToken(data.token)

  localStorage.setItem(TOKEN_KEY, token)
  if (data.refreshToken) {
    localStorage.setItem(REFRESH_TOKEN_KEY, data.refreshToken)
  } else {
    localStorage.removeItem(REFRESH_TOKEN_KEY)
  }

  const expiresAt = resolveTokenExpiration(token, data.expiresIn)
  if (expiresAt) {
    localStorage.setItem(TOKEN_EXP_KEY, String(expiresAt))
  } else {
    localStorage.removeItem(TOKEN_EXP_KEY)
  }

  localStorage.removeItem(USER_KEY)

  debugLog("auth-service", "Sesión almacenada en localStorage", {
    hasToken: true,
    hasRefreshToken: Boolean(data.refreshToken),
    expiresAt,
  })

  try {
    await validarTokenConGateway(token)
    debugLog("auth-service", "Token validado exitosamente con el gateway")
  } catch (error) {
    debugLog("auth-service", "Gateway rechazó el token, revirtiendo sesión", { error })
    logout()
    throw error
  }
}

export function logout(): void {
  debugLog("auth-service", "Cerrando sesión y limpiando almacenamiento")
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
  localStorage.removeItem(REFRESH_TOKEN_KEY)
  localStorage.removeItem(TOKEN_EXP_KEY)
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_TOKEN_KEY)
}

export function isTokenExpired(): boolean {
  const expiresAtRaw = localStorage.getItem(TOKEN_EXP_KEY)
  if (!expiresAtRaw) return false
  const expiresAt = Number(expiresAtRaw)
  return Number.isFinite(expiresAt) && Date.now() >= expiresAt
}

export function getUser(): AuthUser | null {
  const raw = localStorage.getItem(USER_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as AuthUser
  } catch {
    return null
  }
}

export function getDisplayUsername(): string {
  const profile = getTokenProfile()
  return profile?.preferred_username || profile?.name || "Usuario"
}

export function getDisplayInitial(): string {
  return getDisplayUsername().charAt(0).toUpperCase() || "U"
}

export function isAuthenticated(): boolean {
  const token = getToken()
  if (!token) {
    debugLog("auth-service", "Sin token en localStorage")
    return false
  }
  if (isTokenExpired()) {
    debugLog("auth-service", "Token expirado, se forzará logout")
    logout()
    return false
  }

  debugLog("auth-service", "Token válido, usuario autenticado")
  return true
}
