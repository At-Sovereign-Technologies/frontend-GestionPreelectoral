import { createJsonHeaders, getErrorMessage } from "./apiClient"

const DEFAULT_JURADOS_URL = "http://localhost:8083"

function getJuradosBaseUrl(): string {
  const configuredUrl = (import.meta.env.VITE_JURADOS_API_URL as string | undefined)?.trim()
  return (configuredUrl || DEFAULT_JURADOS_URL).replace(/\/+$/, "")
}

function buildJuradosUrl(path: string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`
  return `${getJuradosBaseUrl()}${normalizedPath}`
}

async function procesarRespuesta<T>(response: Response, fallbackMessage: string): Promise<T> {
  if (!response.ok) {
    throw new Error(await getErrorMessage(response, fallbackMessage))
  }
  return response.json() as Promise<T>
}

/* ── Tipos ─────────────────────────────────────────────────────────────── */

export type RolJurado = "PRESIDENTE" | "SECRETARIO" | "VOCAL_1" | "VOCAL_2"
export type EstadoJurado = "ASIGNADO" | "EXCUSADO" | "REEMPLAZADO" | "ACTIVO"
export type EstadoExcusa = "PENDIENTE" | "APROBADA" | "RECHAZADA"
export type EstadoAsistencia = "PENDIENTE" | "PRESENTE" | "AUSENTE"

export interface Jurado {
  id: string
  cedula: string
  nombre: string
  apellido: string
  mesaId: string
  puestoId: string
  rol: RolJurado
  estado: EstadoJurado
  reemplazaA: string | null
  fechaCreacion: string
}

export interface Mesa {
  id: string
  numero: number
  jurados: Jurado[]
}

export interface SorteoResultado {
  eleccionId: string
  departamento: string
  municipio: string
  seed: number
  totalMesas: number
  totalJurados: number
  mesas: Mesa[]
}

export interface Excusa {
  id: string
  juradoId: string
  mesaId: string
  motivo: string
  documentoSoporte: string | null
  estado: EstadoExcusa
  juradoReemplazoId: string | null
  motivoRechazo: string | null
  fechaSolicitud: string
  fechaResolucion: string | null
}

export interface Asistencia {
  id: string
  juradoId: string
  mesaId: string
  estado: EstadoAsistencia
  observacion: string | null
  fechaRegistro: string
}

export interface MockState {
  totalJurados: number
  totalExcusas: number
  totalAsistencias: number
  totalEventosOutbox: number
  timestamp: string
}

export interface SolicitudSorteo {
  eleccionId: string
  departamento: string
  municipio: string
  numeroMesas: number
  juradosPorMesa: number
  seed: number
}

export interface SolicitudExcusa {
  juradoId: string
  mesaId: string
  motivo: string
  documentoSoporte?: string
}

export interface SolicitudResolverExcusa {
  estado: "APROBADA" | "RECHAZADA"
  motivoRechazo?: string
}

export interface SolicitudAsistencia {
  juradoId: string
  mesaId: string
  estado: "PRESENTE" | "AUSENTE"
  observacion?: string
}

/* ── API funcional ─────────────────────────────────────────────────────── */

export async function realizarSorteo(payload: SolicitudSorteo): Promise<SorteoResultado> {
  const response = await fetch(buildJuradosUrl("/api/jurados/sorteo"), {
    method: "POST",
    headers: createJsonHeaders(),
    body: JSON.stringify(payload),
  })
  return procesarRespuesta<SorteoResultado>(response, "No fue posible realizar el sorteo de jurados")
}

export async function presentarExcusa(payload: SolicitudExcusa): Promise<Excusa> {
  const response = await fetch(buildJuradosUrl("/api/jurados/excusa"), {
    method: "POST",
    headers: createJsonHeaders(),
    body: JSON.stringify(payload),
  })
  return procesarRespuesta<Excusa>(response, "No fue posible presentar la excusa")
}

export async function resolverExcusa(id: string, payload: SolicitudResolverExcusa): Promise<Excusa> {
  const response = await fetch(buildJuradosUrl(`/api/jurados/excusa/${id}/resolver`), {
    method: "POST",
    headers: createJsonHeaders(),
    body: JSON.stringify(payload),
  })
  return procesarRespuesta<Excusa>(response, "No fue posible resolver la excusa")
}

export async function registrarAsistencia(payload: SolicitudAsistencia): Promise<Asistencia> {
  const response = await fetch(buildJuradosUrl("/api/jurados/asistencia"), {
    method: "POST",
    headers: createJsonHeaders(),
    body: JSON.stringify(payload),
  })
  return procesarRespuesta<Asistencia>(response, "No fue posible registrar la asistencia")
}

export async function consultarJuradosPorMesa(mesaId: string): Promise<Jurado[]> {
  const response = await fetch(buildJuradosUrl(`/api/jurados/mesa/${mesaId}`), {
    method: "GET",
    headers: createJsonHeaders(),
  })
  return procesarRespuesta<Jurado[]>(response, "No fue posible consultar los jurados de la mesa")
}

export async function consultarJuradoPorCedula(cedula: string): Promise<Jurado> {
  const response = await fetch(buildJuradosUrl(`/api/jurados/cedula/${cedula}`), {
    method: "GET",
    headers: createJsonHeaders(),
  })
  return procesarRespuesta<Jurado>(response, "No fue posible consultar el jurado por cédula")
}

/* ── Endpoints debug / mock ────────────────────────────────────────────── */

export async function listarTodosJurados(): Promise<Jurado[]> {
  const response = await fetch(buildJuradosUrl("/mock/jurados"), {
    method: "GET",
    headers: createJsonHeaders(),
  })
  return procesarRespuesta<Jurado[]>(response, "No fue posible listar los jurados")
}

export async function listarTodasExcusas(): Promise<Excusa[]> {
  const response = await fetch(buildJuradosUrl("/mock/excusas"), {
    method: "GET",
    headers: createJsonHeaders(),
  })
  return procesarRespuesta<Excusa[]>(response, "No fue posible listar las excusas")
}

export async function listarTodasAsistencias(): Promise<Asistencia[]> {
  const response = await fetch(buildJuradosUrl("/mock/asistencias"), {
    method: "GET",
    headers: createJsonHeaders(),
  })
  return procesarRespuesta<Asistencia[]>(response, "No fue posible listar las asistencias")
}

export async function obtenerEstadoMock(): Promise<MockState> {
  const response = await fetch(buildJuradosUrl("/mock/state"), {
    method: "GET",
    headers: createJsonHeaders(),
  })
  return procesarRespuesta<MockState>(response, "No fue posible obtener el estado del mock")
}

export async function resetearMock(): Promise<{ mensaje: string }> {
  const response = await fetch(buildJuradosUrl("/mock/reset"), {
    method: "DELETE",
    headers: createJsonHeaders(),
  })
  return procesarRespuesta<{ mensaje: string }>(response, "No fue posible reiniciar el mock")
}
