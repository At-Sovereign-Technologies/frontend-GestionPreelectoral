import { buildGatewayUrl, createJsonHeaders, getErrorMessage } from "./apiClient"
import { getDisplayUsername, getToken } from "../services/authService"

export type EstadoCenso = "HABILITADO" | "EXCLUIDO" | "EXENTO"
export type CausalCenso =
  | "FUERZA_PUBLICA_ACTIVA"
  | "INTERDICCION_JUDICIAL"
  | "CONDENA_CON_PENA_ACCESORIA"
  | "MAYOR_LIMITE_EDAD"
  | "DISCAPACIDAD_REGISTRADA"

export interface EleccionResumen {
  id: number
  nombreOficial: string
  estado: string
}

export interface RegistroCensoRespuesta {
  id: number
  eleccionId: number
  tipoDocumento: string
  numeroDocumento: string
  nombres: string
  apellidos: string
  fechaNacimiento: string | null
  estado: EstadoCenso
  causalEstado: CausalCenso | null
  observacion: string | null
  actorUltimaModificacion: string
  fechaActualizacion: string
}

export interface RegistrarCiudadanoCensoPayload {
  eleccionId: number
  tipoDocumento: string
  numeroDocumento: string
  nombres: string
  apellidos: string
  fechaNacimiento: string | null
  estado: EstadoCenso
  causalEstado: CausalCenso | null
  observacion: string
}

export interface ImportarCensoApiPayload {
  eleccionId: number
  url: string
}

const CENSO_BASE = "/api/gestion-pre-electoral/censo"
const ELECCIONES_BASE = `${CENSO_BASE}/elecciones`

async function procesarRespuesta<T>(response: Response, fallbackMessage: string): Promise<T> {
  if (!response.ok) {
    throw new Error(await getErrorMessage(response, fallbackMessage))
  }

  return response.json() as Promise<T>
}

function crearHeadersCsv(token: string | null): HeadersInit {
  return token ? { Authorization: `Bearer ${token}` } : {}
}

function obtenerActor(): string {
  return getDisplayUsername() || "Administrador RNEC"
}

export async function listarElecciones(): Promise<EleccionResumen[]> {
  const response = await fetch(buildGatewayUrl(ELECCIONES_BASE), {
    method: "GET",
    headers: createJsonHeaders(getToken()),
  })

  return procesarRespuesta<EleccionResumen[]>(response, "No fue posible cargar las elecciones configuradas")
}

export async function listarRegistrosCenso(eleccionId: number): Promise<RegistroCensoRespuesta[]> {
  const response = await fetch(buildGatewayUrl(`${CENSO_BASE}/elecciones/${eleccionId}/registros`), {
    method: "GET",
    headers: createJsonHeaders(getToken()),
  })

  return procesarRespuesta<RegistroCensoRespuesta[]>(response, "No fue posible cargar el censo electoral")
}

export async function registrarCiudadanoCenso(payload: RegistrarCiudadanoCensoPayload): Promise<RegistroCensoRespuesta> {
  const response = await fetch(buildGatewayUrl(`${CENSO_BASE}/registros`), {
    method: "POST",
    headers: createJsonHeaders(getToken()),
    body: JSON.stringify({
      ...payload,
      actor: obtenerActor(),
      observacion: payload.observacion || null,
    }),
  })

  return procesarRespuesta<RegistroCensoRespuesta>(response, "No fue posible registrar el ciudadano en el censo")
}

export interface ActualizarRegistroCensoPayload {
  estado: EstadoCenso
  causalEstado: CausalCenso | null
  observacion: string
}

export async function actualizarRegistroCenso(
  registroId: number,
  payload: ActualizarRegistroCensoPayload
): Promise<RegistroCensoRespuesta> {
  const response = await fetch(buildGatewayUrl(`${CENSO_BASE}/registros/${registroId}`), {
    method: "PUT",
    headers: createJsonHeaders(getToken()),
    body: JSON.stringify({
      estado: payload.estado,
      causalEstado: payload.causalEstado || null,
      observacion: payload.observacion || null,
      actor: obtenerActor(),
    }),
  })

  return procesarRespuesta<RegistroCensoRespuesta>(response, "No fue posible actualizar el registro del censo")
}

export async function importarCensoCsv(eleccionId: number, archivo: File): Promise<string> {
  const datos = new FormData()
  datos.append("eleccionId", String(eleccionId))
  datos.append("actor", obtenerActor())
  datos.append("archivo", archivo)

  const response = await fetch(buildGatewayUrl(`${CENSO_BASE}/importaciones/csv`), {
    method: "POST",
    headers: crearHeadersCsv(getToken()),
    body: datos,
  })

  const resultado = await procesarRespuesta<{ mensaje?: string }>(response, "No fue posible importar el archivo CSV")
  return resultado.mensaje || "Importación CSV completada"
}

export interface CausalItem {
  valor: CausalCenso
  etiqueta: string
}

export interface CausalesEleccion {
  excluido: CausalItem[]
  exento: CausalItem[]
}

export async function obtenerCausalesEleccion(eleccionId: number): Promise<CausalesEleccion> {
  const response = await fetch(buildGatewayUrl(`${ELECCIONES_BASE}/${eleccionId}/causales`), {
    method: "GET",
    headers: createJsonHeaders(getToken()),
  })

  return procesarRespuesta<CausalesEleccion>(response, "No fue posible obtener las causales configuradas")
}

export async function importarCensoApi(payload: ImportarCensoApiPayload): Promise<string> {
  const response = await fetch(buildGatewayUrl(`${CENSO_BASE}/importaciones/api`), {
    method: "POST",
    headers: createJsonHeaders(getToken()),
    body: JSON.stringify({
      ...payload,
      actor: obtenerActor(),
    }),
  })

  const resultado = await procesarRespuesta<{ mensaje?: string }>(response, "No fue posible importar el censo desde la API externa")
  return resultado.mensaje || "Importación API completada"
}