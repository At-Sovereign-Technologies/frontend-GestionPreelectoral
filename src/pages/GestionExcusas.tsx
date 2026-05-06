import { useEffect, useState } from "react"
import {
  Search,
  FileText,
  CircleAlert,
  X,
  CheckCircle,
  XCircle,
  RefreshCw,
  UserX,
  ShieldAlert,
} from "lucide-react"
import { useNavigate } from "react-router-dom"
import PageHeader from "../components/PageHeader"
import ComingSoonToast from "../components/ComingSoonToast"
import Footer from "../components/Footer"
import {
  listarTodosJurados,
  listarTodasExcusas,
  presentarExcusa,
  resolverExcusa,
  type Jurado,
  type Excusa,
  type EstadoJurado,
} from "../api/juradosApi"

const TABS = [
  { label: "Sorteo de Jurados", path: "/jurados/sorteo" },
  { label: "Excusas y Reemplazos", path: "/jurados/excusas" },
  { label: "Control de Asistencia", path: "/jurados/asistencia" },
]

function BadgeEstadoJurado({ estado }: { estado: EstadoJurado }) {
  const estilos: Record<string, string> = {
    ASIGNADO:   "bg-gray-100 text-gray-700 border border-gray-200",
    EXCUSADO:   "bg-orange-100 text-orange-700 border border-orange-200",
    REEMPLAZADO:"bg-red-100 text-red-700 border border-red-200",
    ACTIVO:     "bg-green-100 text-green-700 border border-green-200",
  }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${estilos[estado] || "bg-gray-100 text-gray-700"}`}>
      {estado}
    </span>
  )
}

function BadgeEstadoExcusa({ estado }: { estado: Excusa["estado"] }) {
  const estilos: Record<string, string> = {
    PENDIENTE:  "bg-yellow-100 text-yellow-700 border border-yellow-200",
    APROBADA:   "bg-green-100 text-green-700 border border-green-200",
    RECHAZADA:  "bg-red-100 text-red-700 border border-red-200",
  }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${estilos[estado]}`}>
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

type ModalActivo = "NINGUNO" | "EXCUSA" | "RESOLVER"

export default function GestionExcusas() {
  const navigate = useNavigate()
  const [jurados, setJurados] = useState<Jurado[]>([])
  const [excusas, setExcusas] = useState<Excusa[]>([])
  const [busquedaJurado, setBusquedaJurado] = useState("")
  const [busquedaExcusa, setBusquedaExcusa] = useState("")
  const [cargando, setCargando] = useState(true)
  const [procesando, setProcesando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mostrarToast, setMostrarToast] = useState(false)
  const [mensajeToast, setMensajeToast] = useState("")
  const [modalActivo, setModalActivo] = useState<ModalActivo>("NINGUNO")
  const [juradoSeleccionado, setJuradoSeleccionado] = useState<Jurado | null>(null)
  const [excusaSeleccionada, setExcusaSeleccionada] = useState<Excusa | null>(null)
  const [motivoExcusa, setMotivoExcusa] = useState("")
  const [documentoSoporte, setDocumentoSoporte] = useState("")
  const [resolucion, setResolucion] = useState<"APROBADA" | "RECHAZADA">("APROBADA")
  const [motivoRechazo, setMotivoRechazo] = useState("")

  function abrirToast(mensaje: string) {
    setMensajeToast(mensaje)
    setMostrarToast(true)
  }

  async function cargarDatos() {
    setCargando(true)
    setError(null)
    try {
      const [juradosData, excusasData] = await Promise.all([
        listarTodosJurados(),
        listarTodasExcusas(),
      ])
      setJurados(juradosData)
      setExcusas(excusasData)
    } catch (err) {
      setError(err instanceof Error ? err.message : "No fue posible cargar los datos")
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    void cargarDatos()
  }, [])

  function puedeExcusarse(jurado: Jurado): boolean {
    if (jurado.estado === "REEMPLAZADO" || jurado.estado === "EXCUSADO") return false
    const tieneExcusaPendiente = excusas.some(
      (e) => e.juradoId === jurado.id && e.estado === "PENDIENTE"
    )
    return !tieneExcusaPendiente
  }

  function abrirModalExcusa(jurado: Jurado) {
    setJuradoSeleccionado(jurado)
    setMotivoExcusa("")
    setDocumentoSoporte("")
    setModalActivo("EXCUSA")
  }

  function abrirModalResolver(excusa: Excusa) {
    setExcusaSeleccionada(excusa)
    setResolucion("APROBADA")
    setMotivoRechazo("")
    setModalActivo("RESOLVER")
  }

  function cerrarModal() {
    setModalActivo("NINGUNO")
    setJuradoSeleccionado(null)
    setExcusaSeleccionada(null)
    setMotivoExcusa("")
    setDocumentoSoporte("")
    setMotivoRechazo("")
  }

  async function manejarPresentarExcusa() {
    if (!juradoSeleccionado) return
    if (!motivoExcusa.trim()) {
      setError("El motivo de la excusa es obligatorio")
      return
    }
    setProcesando(true)
    setError(null)
    try {
      await presentarExcusa({
        juradoId: juradoSeleccionado.id,
        mesaId: juradoSeleccionado.mesaId,
        motivo: motivoExcusa.trim(),
        documentoSoporte: documentoSoporte.trim() || undefined,
      })
      await cargarDatos()
      cerrarModal()
      abrirToast("Excusa presentada correctamente")
    } catch (err) {
      setError(err instanceof Error ? err.message : "No fue posible presentar la excusa")
    } finally {
      setProcesando(false)
    }
  }

  async function manejarResolverExcusa() {
    if (!excusaSeleccionada) return
    if (resolucion === "RECHAZADA" && !motivoRechazo.trim()) {
      setError("Debes indicar el motivo del rechazo")
      return
    }
    setProcesando(true)
    setError(null)
    try {
      await resolverExcusa(excusaSeleccionada.id, {
        estado: resolucion,
        motivoRechazo: resolucion === "RECHAZADA" ? motivoRechazo.trim() : undefined,
      })
      await cargarDatos()
      cerrarModal()
      abrirToast(`Excusa ${resolucion.toLowerCase()} correctamente`)
    } catch (err) {
      setError(err instanceof Error ? err.message : "No fue posible resolver la excusa")
    } finally {
      setProcesando(false)
    }
  }

  const juradosFiltrados = jurados.filter((j) => {
    const termino = busquedaJurado.trim().toLowerCase()
    if (!termino) return true
    return (
      j.cedula.includes(termino) ||
      `${j.nombre} ${j.apellido}`.toLowerCase().includes(termino) ||
      j.rol.toLowerCase().includes(termino)
    )
  })

  const excusasFiltradas = excusas.filter((e) => {
    const termino = busquedaExcusa.trim().toLowerCase()
    if (!termino) return true
    const jurado = jurados.find((j) => j.id === e.juradoId)
    return (
      e.motivo.toLowerCase().includes(termino) ||
      e.estado.toLowerCase().includes(termino) ||
      (jurado && `${jurado.nombre} ${jurado.apellido}`.toLowerCase().includes(termino))
    )
  })

  const excusasPendientes = excusas.filter((e) => e.estado === "PENDIENTE").length
  const excusasAprobadas = excusas.filter((e) => e.estado === "APROBADA").length
  const excusasRechazadas = excusas.filter((e) => e.estado === "RECHAZADA").length

  return (
    <div className="notranslate min-h-screen bg-gray-50 flex flex-col" translate="no">
      {/* ── Encabezado ─────────────────────────────────────────────────────── */}
      <PageHeader />

      {/* ── Contenido principal ─────────────────────────────────────────────── */}
      <main className="flex-1 px-8 py-6 w-full">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Gestión de Jurados de Votación</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Sorteo, excusas, reemplazos y control de asistencia de jurados.
          </p>

          <div className="mt-4 flex items-center gap-2">
            {TABS.map((tab) => {
              const activo = tab.path === "/jurados/excusas"
              return (
                <button
                  key={tab.path}
                  onClick={() => navigate(tab.path)}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
                    activo
                      ? "bg-red-500 text-white"
                      : "text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  {tab.label}
                </button>
              )
            })}
          </div>
        </div>

        {error && (
          <div className="mb-5 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <CircleAlert size={18} className="mt-0.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex gap-6 items-start">
          {/* ── Columna izquierda ─────────────────────────────────────────── */}
          <div className="flex-1 min-w-0 space-y-6">
            {/* Jurados */}
            <div className="bg-white border rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <UserX size={18} className="text-red-500" />
                  Jurados disponibles
                </h2>
                <button
                  onClick={() => void cargarDatos()}
                  disabled={cargando}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-600 transition hover:bg-gray-50"
                >
                  <RefreshCw size={13} />
                  Actualizar
                </button>
              </div>

              <div className="relative flex-1 max-w-xs mb-4">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={busquedaJurado}
                  onChange={(e) => setBusquedaJurado(e.target.value)}
                  placeholder="Buscar por cédula o nombre..."
                  className="w-full border border-gray-300 rounded-lg pl-9 pr-3 py-2 text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-300"
                />
              </div>

              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wide pb-2 pr-4">Cédula</th>
                    <th className="text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wide pb-2 pr-4">Nombre</th>
                    <th className="text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wide pb-2 pr-4">Rol</th>
                    <th className="text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wide pb-2 pr-4">Estado</th>
                    <th className="text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wide pb-2">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {cargando && (
                    <tr>
                      <td colSpan={5} className="py-10 text-center text-sm text-gray-400">
                        Cargando jurados...
                      </td>
                    </tr>
                  )}
                  {!cargando && juradosFiltrados.map((jurado) => (
                    <tr key={jurado.id} className="border-b last:border-0 hover:bg-gray-50 transition">
                      <td className="py-3 pr-4 font-mono text-sm text-gray-700">
                        <div className="notranslate" translate="no">{jurado.cedula}</div>
                      </td>
                      <td className="py-3 pr-4 text-gray-900 font-medium">
                        {jurado.nombre} {jurado.apellido}
                      </td>
                      <td className="py-3 pr-4 text-xs text-gray-600">{jurado.rol.replace("_", " ")}</td>
                      <td className="py-3 pr-4">
                        <BadgeEstadoJurado estado={jurado.estado} />
                      </td>
                      <td className="py-3">
                        {puedeExcusarse(jurado) ? (
                          <button
                            onClick={() => abrirModalExcusa(jurado)}
                            className="inline-flex items-center gap-1 rounded-lg bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-600 transition hover:bg-red-100"
                          >
                            <FileText size={12} />
                            Excusar
                          </button>
                        ) : (
                          <span className="text-xs text-gray-400">No aplica</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {!cargando && juradosFiltrados.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-10 text-center text-sm text-gray-400">
                        No se encontraron jurados.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Excusas */}
            <div className="bg-white border rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <ShieldAlert size={18} className="text-red-500" />
                  Solicitudes de excusa
                </h2>
              </div>

              <div className="relative flex-1 max-w-xs mb-4">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={busquedaExcusa}
                  onChange={(e) => setBusquedaExcusa(e.target.value)}
                  placeholder="Buscar excusa..."
                  className="w-full border border-gray-300 rounded-lg pl-9 pr-3 py-2 text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-300"
                />
              </div>

              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wide pb-2 pr-4">Jurado</th>
                    <th className="text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wide pb-2 pr-4">Motivo</th>
                    <th className="text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wide pb-2 pr-4">Estado</th>
                    <th className="text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wide pb-2 pr-4">Resolución</th>
                    <th className="text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wide pb-2">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {cargando && (
                    <tr>
                      <td colSpan={5} className="py-10 text-center text-sm text-gray-400">
                        Cargando excusas...
                      </td>
                    </tr>
                  )}
                  {!cargando && excusasFiltradas.map((excusa) => {
                    const jurado = jurados.find((j) => j.id === excusa.juradoId)
                    return (
                      <tr key={excusa.id} className="border-b last:border-0 hover:bg-gray-50 transition">
                        <td className="py-3 pr-4">
                          <div className="text-sm font-medium text-gray-900">
                            {jurado ? `${jurado.nombre} ${jurado.apellido}` : "Desconocido"}
                          </div>
                          <div className="text-xs text-gray-500">
                            {jurado ? `C.C. ${jurado.cedula}` : excusa.juradoId}
                          </div>
                        </td>
                        <td className="py-3 pr-4 text-sm text-gray-700 max-w-xs truncate">
                          {excusa.motivo}
                        </td>
                        <td className="py-3 pr-4">
                          <BadgeEstadoExcusa estado={excusa.estado} />
                        </td>
                        <td className="py-3 pr-4 text-xs text-gray-500">
                          {excusa.fechaResolucion
                            ? new Date(excusa.fechaResolucion).toLocaleString("es-CO")
                            : "—"}
                          {excusa.motivoRechazo && (
                            <div className="text-red-600 mt-0.5">{excusa.motivoRechazo}</div>
                          )}
                          {excusa.juradoReemplazoId && (
                            <div className="text-green-600 mt-0.5">Reemplazo generado</div>
                          )}
                        </td>
                        <td className="py-3">
                          {excusa.estado === "PENDIENTE" ? (
                            <button
                              onClick={() => abrirModalResolver(excusa)}
                              className="inline-flex items-center gap-1 rounded-lg bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-700 transition hover:bg-gray-200"
                            >
                              <CheckCircle size={12} />
                              Resolver
                            </button>
                          ) : (
                            <span className="text-xs text-gray-400">Cerrada</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                  {!cargando && excusasFiltradas.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-10 text-center text-sm text-gray-400">
                        No hay solicitudes de excusa registradas.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* ── Columna derecha ───────────────────────────────────────────── */}
          <div className="w-64 flex-shrink-0 flex flex-col gap-4">
            <div className="bg-white border rounded-xl p-4">
              <p className="text-[10px] font-semibold text-gray-400 tracking-widest uppercase mb-3">
                Resumen de Excusas
              </p>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Pendientes</span>
                  <span className="text-base font-bold text-yellow-600">{excusasPendientes}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Aprobadas</span>
                  <span className="text-base font-bold text-green-600">{excusasAprobadas}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Rechazadas</span>
                  <span className="text-base font-bold text-red-600">{excusasRechazadas}</span>
                </div>
                <div className="border-t pt-3 flex items-center justify-between">
                  <span className="text-sm text-gray-600">Total</span>
                  <span className="text-base font-bold text-gray-900">{excusas.length}</span>
                </div>
              </div>
            </div>

            <div className="bg-white border rounded-xl p-4">
              <p className="text-[10px] font-semibold text-gray-400 tracking-widest uppercase mb-3">
                Reglas de Reemplazo
              </p>
              <ul className="space-y-2 text-xs text-gray-600">
                <li className="flex items-start gap-2">
                  <CheckCircle size={13} className="mt-0.5 text-green-500 flex-shrink-0" />
                  Aprobada: genera jurado reemplazo automáticamente.
                </li>
                <li className="flex items-start gap-2">
                  <XCircle size={13} className="mt-0.5 text-red-500 flex-shrink-0" />
                  Rechazada: jurado vuelve a estado ASIGNADO.
                </li>
                <li className="flex items-start gap-2">
                  <ShieldAlert size={13} className="mt-0.5 text-orange-500 flex-shrink-0" />
                  Un jurado no puede tener dos excusas pendientes.
                </li>
              </ul>
            </div>
          </div>
        </div>
      </main>

      {/* Modal: Presentar excusa */}
      {modalActivo === "EXCUSA" && juradoSeleccionado && (
        <ModalBase
          titulo="Presentar excusa"
          subtitulo={`Jurado: ${juradoSeleccionado.nombre} ${juradoSeleccionado.apellido} (C.C. ${juradoSeleccionado.cedula})`}
          onClose={cerrarModal}
        >
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Motivo de la excusa</label>
              <textarea
                value={motivoExcusa}
                onChange={(e) => setMotivoExcusa(e.target.value)}
                rows={3}
                placeholder="Ej: Enfermedad comprobada, viaje programado..."
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-red-300"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Documento de soporte (opcional)</label>
              <input
                type="text"
                value={documentoSoporte}
                onChange={(e) => setDocumentoSoporte(e.target.value)}
                placeholder="URL o referencia del documento"
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
              onClick={manejarPresentarExcusa}
              disabled={procesando}
              className="inline-flex items-center gap-2 rounded-lg bg-red-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-600 disabled:bg-red-300"
            >
              <FileText size={15} />
              {procesando ? "Guardando..." : "Presentar excusa"}
            </button>
          </div>
        </ModalBase>
      )}

      {/* Modal: Resolver excusa */}
      {modalActivo === "RESOLVER" && excusaSeleccionada && (
        <ModalBase
          titulo="Resolver solicitud de excusa"
          subtitulo={`Motivo: ${excusaSeleccionada.motivo}`}
          onClose={cerrarModal}
        >
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Resolución</label>
              <div className="flex gap-3">
                <button
                  onClick={() => setResolucion("APROBADA")}
                  className={`flex-1 rounded-lg border px-4 py-2 text-sm font-semibold transition ${
                    resolucion === "APROBADA"
                      ? "bg-green-50 border-green-300 text-green-700"
                      : "border-gray-200 text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  <CheckCircle size={14} className="inline mr-1" />
                  Aprobar
                </button>
                <button
                  onClick={() => setResolucion("RECHAZADA")}
                  className={`flex-1 rounded-lg border px-4 py-2 text-sm font-semibold transition ${
                    resolucion === "RECHAZADA"
                      ? "bg-red-50 border-red-300 text-red-700"
                      : "border-gray-200 text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  <XCircle size={14} className="inline mr-1" />
                  Rechazar
                </button>
              </div>
            </div>
            {resolucion === "RECHAZADA" && (
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">Motivo del rechazo</label>
                <textarea
                  value={motivoRechazo}
                  onChange={(e) => setMotivoRechazo(e.target.value)}
                  rows={2}
                  placeholder="Indica por qué se rechaza la excusa"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-red-300"
                />
              </div>
            )}
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
              onClick={manejarResolverExcusa}
              disabled={procesando}
              className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white transition disabled:opacity-50 ${
                resolucion === "APROBADA" ? "bg-green-500 hover:bg-green-600" : "bg-red-500 hover:bg-red-600"
              }`}
            >
              {resolucion === "APROBADA" ? <CheckCircle size={15} /> : <XCircle size={15} />}
              {procesando ? "Procesando..." : resolucion === "APROBADA" ? "Aprobar excusa" : "Rechazar excusa"}
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
