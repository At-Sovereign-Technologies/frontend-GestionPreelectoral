import { buildGatewayUrl, createJsonHeaders, getErrorMessage } from "./apiClient"
import { getToken } from "../services/authService"

export type EstadoCandidatura =
  | "BORRADOR"
  | "POSTULADO"
  | "EN_VALIDACION"
  | "APROBADO"
  | "RECHAZADO"
  | "PUBLICADO"
  | "BLOQUEADO"
  | "REEMPLAZADA"
  | "REVOCADA"

export type TipoOrdenamiento = "ALFABETICO" | "ALEATORIO_AUDITADO"

export interface CandidaturaRespuesta {
  id: number
  eleccionId: number
  nombreCandidato: string
  documento: string
  partido: string
  circunscripcion: string
  fotoUrl: string | null
  estado: EstadoCandidatura
  candidaturaReemplazadaId: number | null
  motivoReemplazo: string | null
  justificacionReemplazo: string | null
  actorUltimaModificacion: string
  fechaInscripcion: string
  fechaActualizacion: string
  version: number
}

export interface TarjetonEntrada {
  orden: number
  nombreCandidato: string
  partido: string | null
  fotoUrl: string | null
  tipo: "CANDIDATO" | "VOTO_BLANCO"
}

export interface TarjetonRespuesta {
  eleccionId: number
  circunscripcion: string | null
  fechaGeneracion: string
  semillaUsada: number | null
  entradas: TarjetonEntrada[]
}

export interface CandidaturaVersion {
  id: number
  candidaturaId: number
  versionNumber: number
  nombreCandidato: string
  documento: string
  partido: string
  circunscripcion: string
  fotoUrl: string | null
  estado: EstadoCandidatura
  actorModificacion: string
  fechaVersion: string
}

export interface RegistrarCandidaturaPayload {
  eleccionId: number
  nombreCandidato: string
  documento: string
  partido: string
  circunscripcion: string
  fotoUrl?: string | null
  actor: string
}

export interface TransicionEstadoPayload {
  estado: EstadoCandidatura
  actor: string
  justificacion?: string | null
  rol: string
}

export interface GenerarTarjetonPayload {
  circunscripcion?: string | null
  tipoOrdenamiento: TipoOrdenamiento
  semillaAleatoria?: number | null
  actor: string
}

const CANDIDATURAS_BASE = "/api/candidaturas"

async function procesarRespuesta<T>(response: Response, fallbackMessage: string): Promise<T> {
  if (!response.ok) {
    throw new Error(await getErrorMessage(response, fallbackMessage))
  }
  return response.json() as Promise<T>
}

export async function listarCandidaturasPorEleccion(eleccionId: number): Promise<CandidaturaRespuesta[]> {
  const response = await fetch(buildGatewayUrl(`${CANDIDATURAS_BASE}/elecciones/${eleccionId}`), {
    headers: createJsonHeaders(getToken()),
  })
  return procesarRespuesta<CandidaturaRespuesta[]>(response, "No fue posible listar las candidaturas")
}

export async function registrarCandidatura(payload: RegistrarCandidaturaPayload): Promise<CandidaturaRespuesta> {
  const response = await fetch(buildGatewayUrl(CANDIDATURAS_BASE), {
    method: "POST",
    headers: createJsonHeaders(getToken()),
    body: JSON.stringify(payload),
  })
  return procesarRespuesta<CandidaturaRespuesta>(response, "No fue posible registrar la candidatura")
}

export async function transicionarEstado(
  candidaturaId: number,
  payload: TransicionEstadoPayload
): Promise<CandidaturaRespuesta> {
  const response = await fetch(buildGatewayUrl(`${CANDIDATURAS_BASE}/${candidaturaId}/transicion`), {
    method: "PUT",
    headers: createJsonHeaders(getToken()),
    body: JSON.stringify(payload),
  })
  return procesarRespuesta<CandidaturaRespuesta>(response, "No fue posible transicionar el estado")
}

export async function generarTarjeton(
  eleccionId: number,
  payload: GenerarTarjetonPayload
): Promise<TarjetonRespuesta> {
  const response = await fetch(buildGatewayUrl(`${CANDIDATURAS_BASE}/elecciones/${eleccionId}/tarjeton`), {
    method: "POST",
    headers: createJsonHeaders(getToken()),
    body: JSON.stringify(payload),
  })
  return procesarRespuesta<TarjetonRespuesta>(response, "No fue posible generar el tarjetón")
}

export async function obtenerUltimoTarjeton(eleccionId: number): Promise<TarjetonRespuesta> {
  const response = await fetch(buildGatewayUrl(`${CANDIDATURAS_BASE}/elecciones/${eleccionId}/tarjeton`), {
    headers: createJsonHeaders(getToken()),
  })
  return procesarRespuesta<TarjetonRespuesta>(response, "No fue posible obtener el último tarjetón")
}

export async function listarVersiones(candidaturaId: number): Promise<CandidaturaVersion[]> {
  const response = await fetch(buildGatewayUrl(`${CANDIDATURAS_BASE}/${candidaturaId}/versiones`), {
    headers: createJsonHeaders(getToken()),
  })
  return procesarRespuesta<CandidaturaVersion[]>(response, "No fue posible listar las versiones")
}
