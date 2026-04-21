import { useEffect, useState } from "react"
import {
  Search,
  Pencil,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Plus,
  Clock,
  Upload,
  X,
  FileUp,
  UserPlus,
  CircleAlert,
} from "lucide-react"
import UserMenu from "../components/UserMenu"
import ComingSoonToast from "../components/ComingSoonToast"
import Footer from "../components/Footer"
import {
  actualizarRegistroCenso,
  importarCensoCsv,
  listarElecciones,
  listarRegistrosCenso,
  obtenerCausalesEleccion,
  registrarCiudadanoCenso,
  type CausalCenso,
  type CausalItem,
  type CausalesEleccion,
  type EleccionResumen,
  type EstadoCenso,
  type RegistroCensoRespuesta,
} from "../api/censoApi"

interface RegistroCenso {
  id: number
  cedula: string
  nombreCompleto: string
  estado: EstadoCenso
  ultimaModificacion: string
  tipoDocumento: string
  causalEstado: CausalCenso | null
  observacion: string | null
  actorUltimaModificacion: string
}

const REGISTROS_POR_PAGINA = 10
const TIPOS_DOCUMENTO = ["CC", "TI", "CE", "PA"]

const CAUSALES_DEFECTO: CausalesEleccion = {
  excluido: [
    { valor: "INTERDICCION_JUDICIAL", etiqueta: "Interdicción judicial" },
    { valor: "CONDENA_CON_PENA_ACCESORIA", etiqueta: "Condena con pena accesoria" },
  ],
  exento: [
    { valor: "FUERZA_PUBLICA_ACTIVA", etiqueta: "Personal activo fuerzas militares y policía" },
    { valor: "MAYOR_LIMITE_EDAD", etiqueta: "Mayor del límite de edad" },
    { valor: "DISCAPACIDAD_REGISTRADA", etiqueta: "Discapacidad registrada" },
  ],
}

type FiltroActivo = "TODOS" | EstadoCenso
type ModalActivo = "NINGUNO" | "IMPORTAR" | "MANUAL" | "EDITAR"

interface FormularioEditar {
  estado: EstadoCenso
  causalEstado: CausalCenso | ""
  observacion: string
}

const FORMULARIO_EDITAR_INICIAL: FormularioEditar = {
  estado: "HABILITADO",
  causalEstado: "",
  observacion: "",
}
interface FormularioManual {
  tipoDocumento: string
  numeroDocumento: string
  nombres: string
  apellidos: string
  fechaNacimiento: string
  estado: EstadoCenso
  causalEstado: CausalCenso | ""
  observacion: string
}

const FORMULARIO_INICIAL: FormularioManual = {
  tipoDocumento: "CC",
  numeroDocumento: "",
  nombres: "",
  apellidos: "",
  fechaNacimiento: "",
  estado: "HABILITADO",
  causalEstado: "",
  observacion: "",
}

function formatearFecha(fechaIso: string): string {
  const fecha = new Date(fechaIso)
  if (Number.isNaN(fecha.getTime())) return fechaIso

  return new Intl.DateTimeFormat("es-CO", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(fecha)
}

function mapearRegistro(registro: RegistroCensoRespuesta): RegistroCenso {
  return {
    id: registro.id,
    cedula: registro.numeroDocumento,
    nombreCompleto: `${registro.nombres} ${registro.apellidos}`.trim(),
    estado: registro.estado,
    ultimaModificacion: formatearFecha(registro.fechaActualizacion),
    tipoDocumento: registro.tipoDocumento,
    causalEstado: registro.causalEstado,
    observacion: registro.observacion,
    actorUltimaModificacion: registro.actorUltimaModificacion,
  }
}

function BadgeEstado({ estado }: { estado: EstadoCenso }) {
  const estilos: Record<EstadoCenso, string> = {
    HABILITADO: "bg-green-100 text-green-700 border border-green-200",
    EXCLUIDO:   "bg-red-100 text-red-600 border border-red-200",
    EXENTO:     "bg-yellow-100 text-yellow-700 border border-yellow-200",
  }
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${estilos[estado]}`}>
      {estado}
    </span>
  )
}

function ModalBase({
  titulo,
  subtitulo,
  onClose,
  children,
}: {
  titulo: string
  subtitulo: string
  onClose: () => void
  children: React.ReactNode
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/35 px-4">
      <div className="w-full max-w-2xl rounded-2xl border border-gray-200 bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b px-6 py-5">
          <div>
            <h2 className="text-xl font-bold text-gray-900">{titulo}</h2>
            <p className="mt-1 text-sm text-gray-500">{subtitulo}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
            aria-label="Cerrar modal"
          >
            <X size={18} />
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  )
}

function obtenerResumen(registros: RegistroCenso[]) {
  const total = registros.length
  const habilitados = registros.filter((registro) => registro.estado === "HABILITADO").length
  const excluidos = registros.filter((registro) => registro.estado === "EXCLUIDO").length
  const exentos = registros.filter((registro) => registro.estado === "EXENTO").length

  return { total, habilitados, excluidos, exentos }
}

export default function GestionCenso() {
  const [busqueda, setBusqueda] = useState("")
  const [filtroActivo, setFiltroActivo] = useState<FiltroActivo>("TODOS")
  const [paginaActual, setPaginaActual] = useState(1)
  const [mostrarToast, setMostrarToast] = useState(false)
  const [mensajeToast, setMensajeToast] = useState("La edición de registros estará disponible próximamente.")
  const [registros, setRegistros] = useState<RegistroCenso[]>([])
  const [elecciones, setElecciones] = useState<EleccionResumen[]>([])
  const [eleccionActivaId, setEleccionActivaId] = useState<number | null>(null)
  const [cargando, setCargando] = useState(true)
  const [procesando, setProcesando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [modalActivo, setModalActivo] = useState<ModalActivo>("NINGUNO")
  const [archivoCsv, setArchivoCsv] = useState<File | null>(null)
  const [registroEditando, setRegistroEditando] = useState<RegistroCenso | null>(null)
  const [formularioEditar, setFormularioEditar] = useState<FormularioEditar>(FORMULARIO_EDITAR_INICIAL)
  const [formularioManual, setFormularioManual] = useState<FormularioManual>(FORMULARIO_INICIAL)
  const [causalesEleccion, setCausalesEleccion] = useState<CausalesEleccion>(CAUSALES_DEFECTO)

  useEffect(() => {
    async function cargarElecciones() {
      setCargando(true)
      setError(null)

      try {
        const eleccionesCargadas = await listarElecciones()
        setElecciones(eleccionesCargadas)

        if (eleccionesCargadas.length === 0) {
          setError("No hay elecciones configuradas. Debes crear una elección antes de administrar el censo.")
          setRegistros([])
          setEleccionActivaId(null)
          return
        }

        const primeraEleccionId = eleccionesCargadas[0].id
        setEleccionActivaId(primeraEleccionId)
      } catch (errorCargando) {
        setError(errorCargando instanceof Error ? errorCargando.message : "No fue posible cargar las elecciones")
      } finally {
        setCargando(false)
      }
    }

    void cargarElecciones()
  }, [])

  useEffect(() => {
    if (!eleccionActivaId) return

    const eleccionId = eleccionActivaId

    async function cargarRegistros() {
      setCargando(true)
      setError(null)

      try {
        const registrosCargados = await listarRegistrosCenso(eleccionId)
        setRegistros(registrosCargados.map(mapearRegistro))
      } catch (errorCargando) {
        setError(errorCargando instanceof Error ? errorCargando.message : "No fue posible cargar los registros del censo")
        setRegistros([])
      } finally {
        setCargando(false)
      }
    }

    void cargarRegistros()
  }, [eleccionActivaId])

  useEffect(() => {
    if (!eleccionActivaId) return
    const eleccionId = eleccionActivaId

    obtenerCausalesEleccion(eleccionId)
      .then((causales) => setCausalesEleccion(causales))
      .catch(() => setCausalesEleccion(CAUSALES_DEFECTO))
  }, [eleccionActivaId])

  const registrosFiltrados = registros.filter((r) => {
    const coincideBusqueda =
      busqueda.trim() === "" ||
      r.cedula.replace(/\./g, "").includes(busqueda.replace(/\./g, "")) ||
      r.nombreCompleto.toLowerCase().includes(busqueda.toLowerCase())

    const coincideFiltro = filtroActivo === "TODOS" || r.estado === filtroActivo

    return coincideBusqueda && coincideFiltro
  })

  const totalPaginas = Math.max(1, Math.ceil(registrosFiltrados.length / REGISTROS_POR_PAGINA))
  const paginaSegura = Math.min(paginaActual, totalPaginas)
  const registrosPagina = registrosFiltrados.slice(
    (paginaSegura - 1) * REGISTROS_POR_PAGINA,
    paginaSegura * REGISTROS_POR_PAGINA
  )

  function cambiarFiltro(filtro: FiltroActivo) {
    setFiltroActivo(filtro)
    setPaginaActual(1)
  }

  function abrirToast(mensaje: string) {
    setMensajeToast(mensaje)
    setMostrarToast(true)
  }

  function cerrarModal() {
    setModalActivo("NINGUNO")
    setArchivoCsv(null)
    setRegistroEditando(null)
    setFormularioEditar(FORMULARIO_EDITAR_INICIAL)
    setFormularioManual(FORMULARIO_INICIAL)
  }

  function abrirEdicion(registro: RegistroCenso) {
    setRegistroEditando(registro)
    setFormularioEditar({
      estado: registro.estado,
      causalEstado: registro.causalEstado ?? "",
      observacion: registro.observacion ?? "",
    })
    setModalActivo("EDITAR")
  }

  async function manejarGuardarEdicion() {
    if (!registroEditando) return
    if (formularioEditar.estado !== "HABILITADO" && !formularioEditar.causalEstado) {
      setError("Debes indicar la causal cuando el estado sea EXCLUIDO o EXENTO")
      return
    }
    setProcesando(true)
    setError(null)
    try {
      const actualizado = await actualizarRegistroCenso(registroEditando.id, {
        estado: formularioEditar.estado,
        causalEstado: formularioEditar.causalEstado || null,
        observacion: formularioEditar.observacion,
      })
      setRegistros((prev) =>
        prev.map((r) =>
          r.id === registroEditando.id
            ? {
                ...r,
                estado: actualizado.estado,
                causalEstado: actualizado.causalEstado ?? null,
                observacion: actualizado.observacion ?? null,
                ultimaModificacion: formatearFecha(actualizado.fechaActualizacion),
                actorUltimaModificacion: actualizado.actorUltimaModificacion,
              }
            : r
        )
      )
      cerrarModal()
      abrirToast("Registro actualizado correctamente")
    } catch (err) {
      setError(err instanceof Error ? err.message : "No fue posible actualizar el registro")
    } finally {
      setProcesando(false)
    }
  }

  async function recargarRegistros(): Promise<boolean> {
    if (!eleccionActivaId) return false

    const eleccionId = eleccionActivaId

    setCargando(true)
    setError(null)

    try {
      const registrosCargados = await listarRegistrosCenso(eleccionId)
      setRegistros(registrosCargados.map(mapearRegistro))
      return true
    } catch (errorCarga) {
      setError(errorCarga instanceof Error ? errorCarga.message : "No fue posible sincronizar el censo")
      return false
    } finally {
      setCargando(false)
    }
  }

  async function manejarActualizarCenso() {
    const actualizado = await recargarRegistros()
    if (actualizado) {
      abrirToast("Censo actualizado desde gestion_pre_electoral.registros_censo")
    }
  }

  async function manejarImportacionCsv() {
    if (!eleccionActivaId || !archivoCsv) {
      setError("Debes seleccionar una elección y adjuntar un archivo CSV")
      return
    }

    setProcesando(true)
    setError(null)

    try {
      const mensaje = await importarCensoCsv(eleccionActivaId, archivoCsv)
      await recargarRegistros()
      cerrarModal()
      abrirToast(mensaje)
    } catch (errorImportando) {
      setError(errorImportando instanceof Error ? errorImportando.message : "No fue posible importar el archivo CSV")
    } finally {
      setProcesando(false)
    }
  }

  async function manejarRegistroManual() {
    if (!eleccionActivaId) {
      setError("Debes seleccionar una elección antes de registrar ciudadanos")
      return
    }

    if (
      !formularioManual.numeroDocumento.trim() ||
      !formularioManual.nombres.trim() ||
      !formularioManual.apellidos.trim()
    ) {
      setError("Documento, nombres y apellidos son obligatorios")
      return
    }

    if (formularioManual.estado !== "HABILITADO" && !formularioManual.causalEstado) {
      setError("Debes indicar la causal cuando el estado sea EXCLUIDO o EXENTO")
      return
    }

    setProcesando(true)
    setError(null)

    try {
      await registrarCiudadanoCenso({
        eleccionId: eleccionActivaId,
        tipoDocumento: formularioManual.tipoDocumento,
        numeroDocumento: formularioManual.numeroDocumento.trim(),
        nombres: formularioManual.nombres.trim(),
        apellidos: formularioManual.apellidos.trim(),
        fechaNacimiento: formularioManual.fechaNacimiento || null,
        estado: formularioManual.estado,
        causalEstado: formularioManual.estado === "HABILITADO" ? null : (formularioManual.causalEstado as CausalCenso),
        observacion: formularioManual.observacion.trim(),
      })
      await recargarRegistros()
      cerrarModal()
      abrirToast("Registro manual de censo completado")
    } catch (errorRegistrando) {
      setError(errorRegistrando instanceof Error ? errorRegistrando.message : "No fue posible registrar el ciudadano")
    } finally {
      setProcesando(false)
    }
  }

  const resumen = obtenerResumen(registros)
  const porcentajeHabilitados = resumen.total === 0 ? 0 : Math.round((resumen.habilitados / resumen.total) * 100)
  const causalesDisponibles: CausalItem[] =
    formularioManual.estado === "HABILITADO"
      ? []
      : formularioManual.estado === "EXCLUIDO"
        ? causalesEleccion.excluido
        : causalesEleccion.exento

  return (
    <div className="notranslate min-h-screen bg-gray-50 flex flex-col" translate="no">

      {/* ── Encabezado ─────────────────────────────────────────────────────── */}
      <header className="bg-white border-b px-8 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-red-500 rounded flex items-center justify-center">
            <span className="text-white text-xs font-bold">SL</span>
          </div>
          <div className="leading-tight">
            <p className="font-bold text-sm text-gray-900">Sello Legítimo</p>
            <p className="text-red-500 text-[10px] font-semibold tracking-wider">
              M2: GESTIÓN PRE-ELECTORAL
            </p>
          </div>
        </div>

        <div className="flex items-center gap-6">
          {/* Historial de auditoría */}
          <button
            onClick={() => abrirToast("El historial de auditoría se integrará en la siguiente iteración.")}
            className="hidden md:flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 transition"
          >
            <Clock size={15} />
            Historial de Auditoría
          </button>

          {/* Importar censo */}
          <button
            onClick={() => setModalActivo("IMPORTAR")}
            className="flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white text-sm font-semibold px-4 py-2 rounded-lg transition"
          >
            <Upload size={14} />
            Importar Censo
          </button>

          <UserMenu />
        </div>
      </header>

      {/* ── Contenido principal ─────────────────────────────────────────────── */}
      <main className="flex-1 px-8 py-6 w-full">

        {/* Título de página */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Gestión de Censo Electoral</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Administración y validación de ciudadanos habilitados para el proceso electoral (RF-M2-001).
          </p>
          <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-3">
              <label className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                Elección activa
              </label>
              <select
                value={eleccionActivaId ?? ""}
                onChange={(event) => {
                  setEleccionActivaId(Number(event.target.value))
                  setPaginaActual(1)
                }}
                className="notranslate rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-red-300"
                translate="no"
              >
                {elecciones.map((eleccion) => (
                  <option key={eleccion.id} value={eleccion.id}>
                    {eleccion.nombreOficial} ({eleccion.estado})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-5 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <CircleAlert size={18} className="mt-0.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex gap-6 items-start">

          {/* ── Columna izquierda: tabla ───────────────────────────────────── */}
          <div className="flex-1 min-w-0">
            <div className="bg-white border rounded-xl p-5">

              {/* Barra de herramientas */}
              <div className="flex items-center gap-3 mb-5">
                {/* Buscador */}
                <div className="relative flex-1 max-w-xs">
                  <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={busqueda}
                    onChange={(e) => { setBusqueda(e.target.value); setPaginaActual(1) }}
                    placeholder="Buscar por Cédula o Nombre..."
                    className="w-full border border-gray-300 rounded-lg pl-9 pr-3 py-2 text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-300"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => void manejarActualizarCenso()}
                  className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-600 transition hover:bg-gray-50 hover:text-gray-900"
                >
                  <RefreshCw size={14} />
                  Actualizar
                </button>

                {/* Filtros */}
                <div className="flex items-center gap-1">
                  {(["TODOS", "HABILITADO", "EXCLUIDO", "EXENTO"] as FiltroActivo[]).map((filtro) => (
                    <button
                      key={filtro}
                      onClick={() => cambiarFiltro(filtro)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                        filtroActivo === filtro
                          ? "bg-red-500 text-white"
                          : "text-gray-500 hover:bg-gray-100"
                      }`}
                    >
                      {filtro}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tabla */}
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wide pb-2 pr-4">
                      Documento<br />(Cédula)
                    </th>
                    <th className="text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wide pb-2 pr-4">
                      Nombre Completo
                    </th>
                    <th className="text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wide pb-2 pr-4">
                      Estado de<br />Censo
                    </th>
                    <th className="text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wide pb-2 pr-4">
                      Última<br />Modificación
                    </th>
                    <th className="text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wide pb-2">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {cargando && (
                    <tr>
                      <td colSpan={5} className="py-10 text-center text-sm text-gray-400">
                        Cargando registros de censo...
                      </td>
                    </tr>
                  )}

                  {!cargando && registrosPagina.map((registro) => (
                    <tr key={registro.cedula} className="border-b last:border-0 hover:bg-gray-50 transition">
                      <td className="py-3.5 pr-4 font-mono text-sm text-gray-700">
                        <div className="notranslate" translate="no">{registro.cedula}</div>
                        <div className="notranslate text-xs text-gray-400" translate="no">{registro.tipoDocumento}</div>
                      </td>
                      <td className="py-3.5 pr-4 text-gray-900 font-medium">
                        <div>{registro.nombreCompleto}</div>
                        {registro.observacion && (
                          <div className="mt-1 text-xs font-normal text-gray-400">{registro.observacion}</div>
                        )}
                      </td>
                      <td className="py-3.5 pr-4">
                        <BadgeEstado estado={registro.estado} />
                        {registro.causalEstado && (
                          <div className="mt-1 text-xs text-gray-400">{registro.causalEstado.replaceAll("_", " ")}</div>
                        )}
                      </td>
                      <td className="py-3.5 pr-4 text-sm text-gray-500">
                        <div>{registro.ultimaModificacion}</div>
                        <div className="mt-1 text-xs text-gray-400">{registro.actorUltimaModificacion}</div>
                      </td>
                      <td className="py-3.5">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => abrirEdicion(registro)}
                            className="text-gray-400 hover:text-gray-700 transition"
                            aria-label="Editar registro"
                          >
                            <Pencil size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}

                  {!cargando && registrosPagina.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-10 text-center text-sm text-gray-400">
                        No se encontraron registros.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>

              {/* Paginación */}
              <div className="flex items-center justify-between mt-5 pt-4 border-t">
                <p className="text-xs text-gray-400">
                  {registrosFiltrados.length === 0
                    ? "Sin resultados para mostrar"
                    : `Mostrando ${(paginaSegura - 1) * REGISTROS_POR_PAGINA + 1}–${Math.min(paginaSegura * REGISTROS_POR_PAGINA, registrosFiltrados.length)} de ${registrosFiltrados.length.toLocaleString("es-CO")} registros`}
                </p>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setPaginaActual((p) => Math.max(1, p - 1))}
                    disabled={paginaSegura === 1}
                    className="p-1.5 rounded text-gray-400 hover:text-gray-700 disabled:opacity-30 transition"
                    aria-label="Página anterior"
                  >
                    <ChevronLeft size={16} />
                  </button>

                  {Array.from({ length: Math.min(totalPaginas, 3) }, (_, i) => i + 1).map((num) => (
                    <button
                      key={num}
                      onClick={() => setPaginaActual(num)}
                      className={`w-7 h-7 rounded text-xs font-semibold transition ${
                        paginaSegura === num
                          ? "bg-red-500 text-white"
                          : "text-gray-500 hover:bg-gray-100"
                      }`}
                    >
                      {num}
                    </button>
                  ))}

                  <button
                    onClick={() => setPaginaActual((p) => Math.min(totalPaginas, p + 1))}
                    disabled={paginaSegura === totalPaginas}
                    className="p-1.5 rounded text-gray-400 hover:text-gray-700 disabled:opacity-30 transition"
                    aria-label="Página siguiente"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* ── Columna derecha: paneles laterales ────────────────────────── */}
          <div className="w-64 flex-shrink-0 flex flex-col gap-4">

            {/* Resumen general */}
            <div className="bg-white border rounded-xl p-4">
              <p className="text-[10px] font-semibold text-gray-400 tracking-widest uppercase mb-3">
                Resumen General
              </p>

              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-gray-600">Total Censo</span>
                <span className="text-xl font-bold text-gray-900">
                  {resumen.total.toLocaleString("es-CO")}
                </span>
              </div>

              {/* Barra de progreso */}
              <div className="w-full h-1.5 bg-gray-200 rounded-full mb-3">
                <div
                  className="h-1.5 bg-red-500 rounded-full"
                  style={{ width: `${porcentajeHabilitados}%` }}
                />
              </div>

              <div className="flex justify-between">
                <div>
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">
                    Habilitados
                  </p>
                  <p className="text-base font-bold text-gray-900">
                    {resumen.habilitados.toLocaleString("es-CO")}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">
                    Excluidos
                  </p>
                  <p className="text-base font-bold text-red-500">
                    {resumen.excluidos.toLocaleString("es-CO")}
                  </p>
                </div>
              </div>

              <div className="mt-3 border-t pt-3">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                  Exentos
                </p>
                <p className="text-base font-bold text-yellow-600">
                  {resumen.exentos.toLocaleString("es-CO")}
                </p>
              </div>
            </div>



          </div>
        </div>
      </main>

      {/* ── Botón flotante ───────────────────────────────────────────────────── */}
      <button
        onClick={() => setModalActivo("MANUAL")}
        className="fixed bottom-6 right-6 w-12 h-12 bg-red-500 hover:bg-red-600 text-white rounded-full shadow-lg flex items-center justify-center transition"
        aria-label="Agregar registro"
      >
        <Plus size={22} />
      </button>

      {modalActivo === "IMPORTAR" && (
        <ModalBase
          titulo="Importar censo electoral"
          subtitulo="Carga ciudadanos desde un archivo CSV."
          onClose={cerrarModal}
        >
          <div className="space-y-4">
            <label className="block rounded-xl border border-dashed border-gray-300 px-4 py-6 text-center text-sm text-gray-500">
              <input
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={(event) => setArchivoCsv(event.target.files?.[0] ?? null)}
              />
              <span className="font-medium text-gray-700">{archivoCsv ? archivoCsv.name : "Seleccionar archivo CSV"}</span>
              <span className="mt-1 block text-xs text-gray-400">Máximo 10MB. Usa UTF-8 y encabezados válidos.</span>
            </label>

            <div className="flex justify-end gap-3">
              <button type="button" onClick={cerrarModal} className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50">
                Cancelar
              </button>
              <button
                type="button"
                onClick={manejarImportacionCsv}
                disabled={procesando}
                className="rounded-lg bg-red-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-600 disabled:bg-red-300"
              >
                {procesando ? "Importando..." : "Importar CSV"}
              </button>
            </div>
          </div>
        </ModalBase>
      )}

      {modalActivo === "EDITAR" && registroEditando && (
        <ModalBase
          titulo="Editar registro del censo"
          subtitulo={`Modifica el estado de ${registroEditando.nombreCompleto} (${registroEditando.tipoDocumento} ${registroEditando.cedula})`}
          onClose={cerrarModal}
        >
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Estado</label>
              <select
                value={formularioEditar.estado}
                onChange={(e) => {
                  const estado = e.target.value as EstadoCenso
                  setFormularioEditar((f) => ({
                    ...f,
                    estado,
                    causalEstado: estado === "HABILITADO" ? "" : f.causalEstado,
                  }))
                }}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-red-300"
              >
                <option value="HABILITADO">Habilitado</option>
                <option value="EXCLUIDO">Excluido</option>
                <option value="EXENTO">Exento</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Causal</label>
              <select
                value={formularioEditar.causalEstado}
                disabled={formularioEditar.estado === "HABILITADO"}
                onChange={(e) => setFormularioEditar((f) => ({ ...f, causalEstado: e.target.value as CausalCenso | "" }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-red-300 disabled:bg-gray-100"
              >
                <option value="">Sin causal</option>
                {formularioEditar.estado !== "HABILITADO" &&
                  (formularioEditar.estado === "EXCLUIDO" ? causalesEleccion.excluido : causalesEleccion.exento).map((c) => (
                    <option key={c.valor} value={c.valor}>{c.etiqueta}</option>
                  ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Observación</label>
              <textarea
                value={formularioEditar.observacion}
                onChange={(e) => setFormularioEditar((f) => ({ ...f, observacion: e.target.value }))}
                rows={3}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-red-300"
              />
            </div>
          </div>

          {error && (
            <div className="mt-3 flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
              <CircleAlert size={15} />
              {error}
            </div>
          )}

          <div className="mt-5 flex justify-end gap-3">
            <button type="button" onClick={cerrarModal} className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50">
              Cancelar
            </button>
            <button
              type="button"
              onClick={manejarGuardarEdicion}
              disabled={procesando}
              className="inline-flex items-center gap-2 rounded-lg bg-red-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-600 disabled:bg-red-300"
            >
              <Pencil size={15} />
              {procesando ? "Guardando..." : "Guardar cambios"}
            </button>
          </div>
        </ModalBase>
      )}

      {modalActivo === "MANUAL" && (
        <ModalBase
          titulo="Registrar ciudadano manualmente"
          subtitulo="Agrega o actualiza un ciudadano dentro del censo electoral de la elección activa."
          onClose={cerrarModal}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Tipo de documento</label>
              <select
                value={formularioManual.tipoDocumento}
                onChange={(event) => setFormularioManual((actual) => ({ ...actual, tipoDocumento: event.target.value }))}
                className="notranslate w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-red-300"
                translate="no"
              >
                {TIPOS_DOCUMENTO.map((tipo) => (
                  <option key={tipo} value={tipo}>{tipo}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Número de documento</label>
              <input
                type="text"
                value={formularioManual.numeroDocumento}
                onChange={(event) => setFormularioManual((actual) => ({ ...actual, numeroDocumento: event.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-red-300"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Nombres</label>
              <input
                type="text"
                value={formularioManual.nombres}
                onChange={(event) => setFormularioManual((actual) => ({ ...actual, nombres: event.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-red-300"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Apellidos</label>
              <input
                type="text"
                value={formularioManual.apellidos}
                onChange={(event) => setFormularioManual((actual) => ({ ...actual, apellidos: event.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-red-300"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Fecha de nacimiento</label>
              <input
                type="date"
                value={formularioManual.fechaNacimiento}
                onChange={(event) => setFormularioManual((actual) => ({ ...actual, fechaNacimiento: event.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-red-300"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Estado</label>
              <select
                value={formularioManual.estado}
                onChange={(event) => {
                  const estado = event.target.value as EstadoCenso
                  setFormularioManual((actual) => ({
                    ...actual,
                    estado,
                    causalEstado: estado === "HABILITADO" ? "" : actual.causalEstado,
                  }))
                }}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-red-300"
              >
                <option value="HABILITADO">Habilitado</option>
                <option value="EXCLUIDO">Excluido</option>
                <option value="EXENTO">Exento</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-medium text-gray-600">Causal</label>
              <select
                value={formularioManual.causalEstado}
                disabled={formularioManual.estado === "HABILITADO"}
                onChange={(event) => setFormularioManual((actual) => ({ ...actual, causalEstado: event.target.value as CausalCenso | "" }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-red-300 disabled:bg-gray-100"
              >
                <option value="">Selecciona una causal</option>
                {causalesDisponibles.map((causal) => (
                  <option key={causal.valor} value={causal.valor}>{causal.etiqueta}</option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-medium text-gray-600">Observación</label>
              <textarea
                value={formularioManual.observacion}
                onChange={(event) => setFormularioManual((actual) => ({ ...actual, observacion: event.target.value }))}
                rows={3}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-red-300"
              />
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <button type="button" onClick={cerrarModal} className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50">
              Cancelar
            </button>
            <button
              type="button"
              onClick={manejarRegistroManual}
              disabled={procesando}
              className="inline-flex items-center gap-2 rounded-lg bg-red-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-600 disabled:bg-red-300"
            >
              <UserPlus size={16} />
              {procesando ? "Guardando..." : "Guardar ciudadano"}
            </button>
          </div>
        </ModalBase>
      )}

      {/* Toast */}
      <ComingSoonToast
        isVisible={mostrarToast}
        onClose={() => setMostrarToast(false)}
        message={mensajeToast}
      />

      <Footer />
    </div>
  )
}
