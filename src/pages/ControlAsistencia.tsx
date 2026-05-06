import { useEffect, useState } from "react"
import {
  Search,
  CircleAlert,
  X,
  CheckCircle,
  XCircle,
  RefreshCw,
  UserCheck,
  ClipboardCheck,
  AlertTriangle,
} from "lucide-react"
import { useNavigate } from "react-router-dom"
import PageHeader from "../components/PageHeader"
import ComingSoonToast from "../components/ComingSoonToast"
import Footer from "../components/Footer"
import {
  listarTodosJurados,
  listarTodasAsistencias,
  registrarAsistencia,
  type Jurado,
  type Asistencia,
  type EstadoAsistencia,
} from "../api/juradosApi"
import {
  listarElecciones,
  type EleccionResumen,
} from "../api/censoApi"

const TABS = [
  { label: "Sorteo de Jurados", path: "/jurados/sorteo" },
  { label: "Excusas y Reemplazos", path: "/jurados/excusas" },
  { label: "Control de Asistencia", path: "/jurados/asistencia" },
]

function BadgeEstadoAsistencia({ estado }: { estado: EstadoAsistencia }) {
  const estilos: Record<string, string> = {
    PENDIENTE: "bg-yellow-100 text-yellow-700 border border-yellow-200",
    PRESENTE:  "bg-green-100 text-green-700 border border-green-200",
    AUSENTE:   "bg-red-100 text-red-700 border border-red-200",
  }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${estilos[estado]}`}>
      {estado}
    </span>
  )
}

function BadgeEstadoJurado({ estado }: { estado: Jurado["estado"] }) {
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
      <div className="w-full max-w-lg rounded-2xl border border-gray-200 bg-white shadow-2xl">
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

type ModalActivo = "NINGUNO" | "ASISTENCIA"

export default function ControlAsistencia() {
  const navigate = useNavigate()
  const [jurados, setJurados] = useState<Jurado[]>([])
  const [asistencias, setAsistencias] = useState<Asistencia[]>([])
  const [busqueda, setBusqueda] = useState("")
  const [cargando, setCargando] = useState(true)
  const [procesando, setProcesando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mostrarToast, setMostrarToast] = useState(false)
  const [mensajeToast, setMensajeToast] = useState("")
  const [modalActivo, setModalActivo] = useState<ModalActivo>("NINGUNO")
  const [juradoSeleccionado, setJuradoSeleccionado] = useState<Jurado | null>(null)
  const [estadoAsistencia, setEstadoAsistencia] = useState<"PRESENTE" | "AUSENTE">("PRESENTE")
  const [observacion, setObservacion] = useState("")
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [elecciones, setElecciones] = useState<EleccionResumen[]>([])
  const [eleccionSeleccionadaId, setEleccionSeleccionadaId] = useState<number | null>(null)

  async function cargarDatos() {
    setCargando(true)
    try {
      const [j, a] = await Promise.all([listarTodosJurados(), listarTodasAsistencias()])
      setJurados(j)
      setAsistencias(a)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar datos")
    } finally {
      setCargando(false)
    }
  }

  function asistenciaDeJurado(juradoId: string): Asistencia | undefined {
    return asistenciasDeEleccion.find((a) => a.juradoId === juradoId)
  }

  function abrirModalAsistencia(jurado: Jurado, estado: "PRESENTE" | "AUSENTE") {
    setJuradoSeleccionado(jurado)
    setEstadoAsistencia(estado)
    setObservacion("")
    setModalActivo("ASISTENCIA")
  }

  function cerrarModal() {
    setModalActivo("NINGUNO")
    setJuradoSeleccionado(null)
    setFormErrors({})
  }

  async function manejarRegistrarAsistencia() {
    if (!juradoSeleccionado) return
    setProcesando(true)
    try {
      await registrarAsistencia({
        juradoId: juradoSeleccionado.id,
        mesaId: juradoSeleccionado.mesaId,
        estado: estadoAsistencia,
        observacion: observacion || undefined,
      })
      setMensajeToast("Asistencia registrada correctamente")
      setMostrarToast(true)
      cerrarModal()
      await cargarDatos()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al registrar asistencia")
    } finally {
      setProcesando(false)
    }
  }

  const juradosDeEleccion = eleccionSeleccionadaId === null
    ? jurados
    : jurados.filter((j) => j.eleccionId === eleccionSeleccionadaId)

  const asistenciasDeEleccion = eleccionSeleccionadaId === null
    ? asistencias
    : asistencias.filter((a) => {
        const jurado = jurados.find((j) => j.id === a.juradoId)
        return jurado?.eleccionId === eleccionSeleccionadaId
      })

  const juradosFiltrados = juradosDeEleccion.filter((j) => {
    const termino = busqueda.trim().toLowerCase()
    if (!termino) return true
    return (
      j.cedula.includes(termino) ||
      `${j.nombre} ${j.apellido}`.toLowerCase().includes(termino) ||
      j.rol.toLowerCase().includes(termino)
    )
  })

  const presentes = asistenciasDeEleccion.filter((a) => a.estado === "PRESENTE").length
  const ausentes = asistenciasDeEleccion.filter((a) => a.estado === "AUSENTE").length
  const pendientes = juradosDeEleccion.length - asistenciasDeEleccion.length

  useEffect(() => {
    void cargarDatos()
    listarElecciones()
      .then(setElecciones)
      .catch(() => setElecciones([]))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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
              const activo = tab.path === "/jurados/asistencia"
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
            {/* Control de asistencia */}
            <div className="bg-white border rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <ClipboardCheck size={18} className="text-red-500" />
                  Control de asistencia por jurado
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

              <div className="flex flex-wrap items-center gap-3 mb-4">
                <div className="relative flex-1 min-w-[12rem] max-w-xs">
                  <label className="block text-[10px] font-semibold text-gray-400 tracking-widest uppercase mb-1">
                    Elección
                  </label>
                  <select
                    value={eleccionSeleccionadaId ?? ""}
                    onChange={(e) => {
                      const val = e.target.value
                      setEleccionSeleccionadaId(val ? Number(val) : null)
                    }}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-red-300"
                  >
                    <option value="">Todas las elecciones</option>
                    {elecciones.map((eleccion) => (
                      <option key={eleccion.id} value={eleccion.id}>
                        {eleccion.nombreOficial}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="relative flex-1 min-w-[12rem] max-w-xs">
                  <label className="block text-[10px] font-semibold text-gray-400 tracking-widest uppercase mb-1">
                    Búsqueda
                  </label>
                  <div className="relative">
                    <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      value={busqueda}
                      onChange={(e) => setBusqueda(e.target.value)}
                      placeholder="Buscar por cédula o nombre..."
                      className="w-full border border-gray-300 rounded-lg pl-9 pr-3 py-2 text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-300"
                    />
                  </div>
                </div>
              </div>

              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wide pb-2 pr-4">Cédula</th>
                    <th className="text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wide pb-2 pr-4">Nombre</th>
                    <th className="text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wide pb-2 pr-4">Rol</th>
                    <th className="text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wide pb-2 pr-4">Estado</th>
                    <th className="text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wide pb-2 pr-4">Asistencia</th>
                    <th className="text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wide pb-2">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {cargando && (
                    <tr>
                      <td colSpan={6} className="py-10 text-center text-sm text-gray-400">
                        Cargando jurados...
                      </td>
                    </tr>
                  )}
                  {!cargando && juradosFiltrados.map((jurado) => {
                    const asistencia = asistenciaDeJurado(jurado.id)
                    return (
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
                        <td className="py-3 pr-4">
                          {asistencia ? (
                            <BadgeEstadoAsistencia estado={asistencia.estado} />
                          ) : (
                            <span className="text-xs text-gray-400">Sin registrar</span>
                          )}
                        </td>
                        <td className="py-3">
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => abrirModalAsistencia(jurado, "PRESENTE")}
                              className="inline-flex items-center gap-1 rounded-lg bg-green-50 px-2 py-1 text-xs font-semibold text-green-700 transition hover:bg-green-100"
                            >
                              <CheckCircle size={11} />
                              Presente
                            </button>
                            <button
                              onClick={() => abrirModalAsistencia(jurado, "AUSENTE")}
                              className="inline-flex items-center gap-1 rounded-lg bg-red-50 px-2 py-1 text-xs font-semibold text-red-700 transition hover:bg-red-100"
                            >
                              <XCircle size={11} />
                              Ausente
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                  {!cargando && juradosFiltrados.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-10 text-center text-sm text-gray-400">
                        No se encontraron jurados.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Historial de asistencias */}
            <div className="bg-white border rounded-xl p-5">
              <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <UserCheck size={18} className="text-red-500" />
                Historial de asistencias registradas
              </h2>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wide pb-2 pr-4">Jurado</th>
                    <th className="text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wide pb-2 pr-4">Estado</th>
                    <th className="text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wide pb-2 pr-4">Observación</th>
                    <th className="text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wide pb-2">Fecha</th>
                  </tr>
                </thead>
                <tbody>
                  {asistenciasDeEleccion.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-10 text-center text-sm text-gray-400">
                        No hay registros de asistencia.
                      </td>
                    </tr>
                  )}
                  {asistenciasDeEleccion.map((asistencia) => {
                    const jurado = jurados.find((j) => j.id === asistencia.juradoId)
                    return (
                      <tr key={asistencia.id} className="border-b last:border-0 hover:bg-gray-50 transition">
                        <td className="py-3 pr-4">
                          <div className="text-sm font-medium text-gray-900">
                            {jurado ? `${jurado.nombre} ${jurado.apellido}` : "Desconocido"}
                          </div>
                          <div className="text-xs text-gray-500">
                            {jurado ? `C.C. ${jurado.cedula}` : asistencia.juradoId}
                          </div>
                        </td>
                        <td className="py-3 pr-4">
                          <BadgeEstadoAsistencia estado={asistencia.estado} />
                        </td>
                        <td className="py-3 pr-4 text-xs text-gray-600">
                          {asistencia.observacion || "—"}
                        </td>
                        <td className="py-3 text-xs text-gray-500">
                          {new Date(asistencia.fechaRegistro).toLocaleString("es-CO")}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* ── Columna derecha ───────────────────────────────────────────── */}
          <div className="w-64 flex-shrink-0 flex flex-col gap-4">
            <div className="bg-white border rounded-xl p-4">
              <p className="text-[10px] font-semibold text-gray-400 tracking-widest uppercase mb-3">
                Resumen de Asistencia
              </p>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Presentes</span>
                  <span className="text-base font-bold text-green-600">{presentes}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Ausentes</span>
                  <span className="text-base font-bold text-red-600">{ausentes}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Sin registrar</span>
                  <span className="text-base font-bold text-yellow-600">{Math.max(0, pendientes)}</span>
                </div>
                <div className="border-t pt-3 flex items-center justify-between">
                  <span className="text-sm text-gray-600">Total jurados</span>
                  <span className="text-base font-bold text-gray-900">{juradosDeEleccion.length}</span>
                </div>
              </div>
            </div>

            <div className="bg-white border rounded-xl p-4">
              <p className="text-[10px] font-semibold text-gray-400 tracking-widest uppercase mb-3">
                Reglas de Asistencia
              </p>
              <ul className="space-y-2 text-xs text-gray-600">
                <li className="flex items-start gap-2">
                  <CheckCircle size={13} className="mt-0.5 text-green-500 flex-shrink-0" />
                  PRESENTE: confirma que el jurado asistió a la mesa.
                </li>
                <li className="flex items-start gap-2">
                  <AlertTriangle size={13} className="mt-0.5 text-red-500 flex-shrink-0" />
                  AUSENTE: genera un reemplazo automáticamente.
                </li>
                <li className="flex items-start gap-2">
                  <ClipboardCheck size={13} className="mt-0.5 text-gray-500 flex-shrink-0" />
                  Puedes registrar asistencia múltiples veces; la última prevalece.
                </li>
              </ul>
            </div>
          </div>
        </div>
      </main>

      {/* Modal: Registrar asistencia */}
      {modalActivo === "ASISTENCIA" && juradoSeleccionado && (
        <ModalBase
          titulo="Registrar asistencia"
          subtitulo={`${juradoSeleccionado.nombre} ${juradoSeleccionado.apellido} — Mesa ${juradoSeleccionado.mesaId.slice(0, 8)}...`}
          onClose={cerrarModal}
        >
          <div className="space-y-4">
            {formErrors.juradoId && (
              <p className="text-xs text-red-600">{formErrors.juradoId}</p>
            )}
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Estado</label>
              <div className="flex gap-3">
                <button
                  onClick={() => setEstadoAsistencia("PRESENTE")}
                  className={`flex-1 rounded-lg border px-4 py-2 text-sm font-semibold transition ${
                    estadoAsistencia === "PRESENTE"
                      ? "bg-green-50 border-green-300 text-green-700"
                      : "border-gray-200 text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  <CheckCircle size={14} className="inline mr-1" />
                  Presente
                </button>
                <button
                  onClick={() => setEstadoAsistencia("AUSENTE")}
                  className={`flex-1 rounded-lg border px-4 py-2 text-sm font-semibold transition ${
                    estadoAsistencia === "AUSENTE"
                      ? "bg-red-50 border-red-300 text-red-700"
                      : "border-gray-200 text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  <XCircle size={14} className="inline mr-1" />
                  Ausente
                </button>
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Observación (opcional)</label>
              <textarea
                value={observacion}
                onChange={(e) => setObservacion(e.target.value)}
                rows={2}
                placeholder="Ej: Llegó tarde, se retiró temprano..."
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-red-300"
              />
            </div>
            {estadoAsistencia === "AUSENTE" && (
              <div className="rounded-lg bg-orange-50 border border-orange-200 px-3 py-2 text-xs text-orange-700 flex items-start gap-2">
                <AlertTriangle size={14} className="mt-0.5 flex-shrink-0" />
                Al marcar como AUSENTE se generará automáticamente un jurado de reemplazo con el mismo rol.
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
              onClick={manejarRegistrarAsistencia}
              disabled={procesando}
              className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white transition disabled:opacity-50 ${
                estadoAsistencia === "PRESENTE" ? "bg-green-500 hover:bg-green-600" : "bg-red-500 hover:bg-red-600"
              }`}
            >
              {estadoAsistencia === "PRESENTE" ? <CheckCircle size={15} /> : <XCircle size={15} />}
              {procesando ? "Guardando..." : "Confirmar asistencia"}
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
