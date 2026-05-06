import { useState } from "react"
import {
  Dices,
  CircleAlert,
  ChevronDown,
  ChevronUp,
  Users,
  MapPin,
  Hash,
  RefreshCw,
} from "lucide-react"
import { useNavigate } from "react-router-dom"
import PageHeader from "../components/PageHeader"
import ComingSoonToast from "../components/ComingSoonToast"
import Footer from "../components/Footer"
import {
  realizarSorteo,
  resetearMock,
  obtenerEstadoMock,
  type SorteoResultado,
  type Jurado,
  type MockState,
} from "../api/juradosApi"

interface FormularioSorteo {
  eleccionId: string
  departamento: string
  municipio: string
  numeroMesas: number
  juradosPorMesa: number
  seed: number
}

const FORMULARIO_INICIAL: FormularioSorteo = {
  eleccionId: "1",
  departamento: "Cundinamarca",
  municipio: "Bogota",
  numeroMesas: 3,
  juradosPorMesa: 4,
  seed: 42,
}

const TABS = [
  { label: "Sorteo de Jurados", path: "/jurados/sorteo" },
  { label: "Excusas y Reemplazos", path: "/jurados/excusas" },
  { label: "Control de Asistencia", path: "/jurados/asistencia" },
]

function BadgeRol({ rol }: { rol: Jurado["rol"] }) {
  const estilos: Record<Jurado["rol"], string> = {
    PRESIDENTE: "bg-purple-100 text-purple-700 border border-purple-200",
    SECRETARIO: "bg-blue-100 text-blue-700 border border-blue-200",
    VOCAL_1:    "bg-green-100 text-green-700 border border-green-200",
    VOCAL_2:    "bg-yellow-100 text-yellow-700 border border-yellow-200",
  }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${estilos[rol]}`}>
      {rol.replace("_", " ")}
    </span>
  )
}

function BadgeEstado({ estado }: { estado: Jurado["estado"] }) {
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

export default function SorteoJurados() {
  const navigate = useNavigate()
  const [formulario, setFormulario] = useState<FormularioSorteo>(FORMULARIO_INICIAL)
  const [resultado, setResultado] = useState<SorteoResultado | null>(null)
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mostrarToast, setMostrarToast] = useState(false)
  const [mensajeToast, setMensajeToast] = useState("")
  const [mesaExpandida, setMesaExpandida] = useState<string | null>(null)
  const [estadoMock, setEstadoMock] = useState<MockState | null>(null)

  function abrirToast(mensaje: string) {
    setMensajeToast(mensaje)
    setMostrarToast(true)
  }

  async function cargarEstadoMock() {
    try {
      const estado = await obtenerEstadoMock()
      setEstadoMock(estado)
    } catch {
      setEstadoMock(null)
    }
  }

  async function manejarSorteo() {
    setCargando(true)
    setError(null)
    try {
      const respuesta = await realizarSorteo({
        ...formulario,
        numeroMesas: Number(formulario.numeroMesas),
        juradosPorMesa: Number(formulario.juradosPorMesa),
        seed: Number(formulario.seed),
      })
      setResultado(respuesta)
      await cargarEstadoMock()
      abrirToast(`Sorteo completado: ${respuesta.totalJurados} jurados en ${respuesta.totalMesas} mesas`)
    } catch (err) {
      setError(err instanceof Error ? err.message : "No fue posible realizar el sorteo")
    } finally {
      setCargando(false)
    }
  }

  async function manejarReset() {
    setCargando(true)
    setError(null)
    try {
      await resetearMock()
      setResultado(null)
      await cargarEstadoMock()
      abrirToast("Estado del mock reiniciado correctamente")
    } catch (err) {
      setError(err instanceof Error ? err.message : "No fue posible reiniciar el mock")
    } finally {
      setCargando(false)
    }
  }

  function toggleMesa(mesaId: string) {
    setMesaExpandida((actual) => (actual === mesaId ? null : mesaId))
  }

  return (
    <div className="notranslate min-h-screen bg-gray-50 flex flex-col" translate="no">
      {/* ── Encabezado ─────────────────────────────────────────────────────── */}
      <PageHeader />

      {/* ── Contenido principal ─────────────────────────────────────────────── */}
      <main className="flex-1 px-8 py-6 w-full">
        {/* Título y tabs */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Gestión de Jurados de Votación</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Sorteo, excusas, reemplazos y control de asistencia de jurados.
          </p>

          <div className="mt-4 flex items-center gap-2">
            {TABS.map((tab) => {
              const activo = tab.path === "/jurados/sorteo"
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
          {/* ── Columna izquierda: formulario y resultados ───────────────────── */}
          <div className="flex-1 min-w-0 space-y-6">
            {/* Formulario de sorteo */}
            <div className="bg-white border rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <Dices size={18} className="text-red-500" />
                  Configurar Sorteo
                </h2>
                <div className="flex items-center gap-2">
                  <button
                    onClick={manejarReset}
                    disabled={cargando}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-600 transition hover:bg-gray-50"
                  >
                    <RefreshCw size={13} />
                    Reiniciar mock
                  </button>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">ID Elección</label>
                  <input
                    type="text"
                    value={formulario.eleccionId}
                    onChange={(e) => setFormulario((f) => ({ ...f, eleccionId: e.target.value }))}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-red-300"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">Departamento</label>
                  <input
                    type="text"
                    value={formulario.departamento}
                    onChange={(e) => setFormulario((f) => ({ ...f, departamento: e.target.value }))}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-red-300"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">Municipio</label>
                  <input
                    type="text"
                    value={formulario.municipio}
                    onChange={(e) => setFormulario((f) => ({ ...f, municipio: e.target.value }))}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-red-300"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">Número de mesas</label>
                  <input
                    type="number"
                    min={1}
                    value={formulario.numeroMesas}
                    onChange={(e) => setFormulario((f) => ({ ...f, numeroMesas: Number(e.target.value) }))}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-red-300"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">Jurados por mesa</label>
                  <input
                    type="number"
                    min={1}
                    value={formulario.juradosPorMesa}
                    onChange={(e) => setFormulario((f) => ({ ...f, juradosPorMesa: Number(e.target.value) }))}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-red-300"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">Semilla (seed)</label>
                  <input
                    type="number"
                    value={formulario.seed}
                    onChange={(e) => setFormulario((f) => ({ ...f, seed: Number(e.target.value) }))}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-red-300"
                  />
                </div>
              </div>

              <div className="mt-4 flex justify-end">
                <button
                  onClick={manejarSorteo}
                  disabled={cargando}
                  className="inline-flex items-center gap-2 rounded-lg bg-red-500 px-5 py-2 text-sm font-semibold text-white transition hover:bg-red-600 disabled:bg-red-300"
                >
                  <Dices size={16} />
                  {cargando ? "Ejecutando sorteo..." : "Realizar sorteo"}
                </button>
              </div>
            </div>

            {/* Resultados del sorteo */}
            {resultado && (
              <div className="bg-white border rounded-xl p-5">
                <h2 className="text-lg font-bold text-gray-900 mb-4">Resultados del Sorteo</h2>
                <div className="grid gap-3 sm:grid-cols-4 mb-5">
                  <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Total Mesas</p>
                    <p className="text-xl font-bold text-gray-900">{resultado.totalMesas}</p>
                  </div>
                  <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Total Jurados</p>
                    <p className="text-xl font-bold text-gray-900">{resultado.totalJurados}</p>
                  </div>
                  <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Departamento</p>
                    <p className="text-sm font-semibold text-gray-900">{resultado.departamento}</p>
                  </div>
                  <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Municipio</p>
                    <p className="text-sm font-semibold text-gray-900">{resultado.municipio}</p>
                  </div>
                </div>

                <div className="space-y-3">
                  {resultado.mesas.map((mesa) => {
                    const expandida = mesaExpandida === mesa.id
                    return (
                      <div key={mesa.id} className="rounded-lg border border-gray-200 overflow-hidden">
                        <button
                          onClick={() => toggleMesa(mesa.id)}
                          className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition text-left"
                        >
                          <div className="flex items-center gap-3">
                            <Hash size={16} className="text-gray-400" />
                            <span className="text-sm font-semibold text-gray-900">Mesa {mesa.numero}</span>
                            <span className="text-xs text-gray-500">({mesa.jurados.length} jurados)</span>
                          </div>
                          {expandida ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                        </button>

                        {expandida && (
                          <div className="px-4 py-3">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="border-b">
                                  <th className="text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wide pb-2 pr-4">Cédula</th>
                                  <th className="text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wide pb-2 pr-4">Nombre</th>
                                  <th className="text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wide pb-2 pr-4">Rol</th>
                                  <th className="text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wide pb-2">Estado</th>
                                </tr>
                              </thead>
                              <tbody>
                                {mesa.jurados.map((jurado) => (
                                  <tr key={jurado.id} className="border-b last:border-0 hover:bg-gray-50 transition">
                                    <td className="py-2.5 pr-4 font-mono text-sm text-gray-700">
                                      <div className="notranslate" translate="no">{jurado.cedula}</div>
                                    </td>
                                    <td className="py-2.5 pr-4 text-gray-900 font-medium">
                                      {jurado.nombre} {jurado.apellido}
                                    </td>
                                    <td className="py-2.5 pr-4">
                                      <BadgeRol rol={jurado.rol as Jurado["rol"]} />
                                    </td>
                                    <td className="py-2.5">
                                      <BadgeEstado estado={jurado.estado as Jurado["estado"]} />
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {!resultado && !cargando && (
              <div className="bg-white border rounded-xl p-10 text-center">
                <Dices size={40} className="mx-auto text-gray-300 mb-3" />
                <p className="text-sm text-gray-500">Configura los parámetros y ejecuta el sorteo para ver los resultados.</p>
              </div>
            )}
          </div>

          {/* ── Columna derecha: paneles laterales ────────────────────────── */}
          <div className="w-64 flex-shrink-0 flex flex-col gap-4">
            {/* Estado del mock */}
            <div className="bg-white border rounded-xl p-4">
              <p className="text-[10px] font-semibold text-gray-400 tracking-widest uppercase mb-3">
                Estado del Mock
              </p>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Jurados</span>
                  <span className="text-base font-bold text-gray-900">{estadoMock?.totalJurados ?? 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Excusas</span>
                  <span className="text-base font-bold text-gray-900">{estadoMock?.totalExcusas ?? 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Asistencias</span>
                  <span className="text-base font-bold text-gray-900">{estadoMock?.totalAsistencias ?? 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Eventos</span>
                  <span className="text-base font-bold text-gray-900">{estadoMock?.totalEventosOutbox ?? 0}</span>
                </div>
              </div>
              <button
                onClick={() => void cargarEstadoMock()}
                className="mt-3 w-full inline-flex items-center justify-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-600 transition hover:bg-gray-50"
              >
                <RefreshCw size={12} />
                Actualizar estado
              </button>
            </div>

            {/* Ayuda rápida */}
            <div className="bg-white border rounded-xl p-4">
              <p className="text-[10px] font-semibold text-gray-400 tracking-widest uppercase mb-3">
                Ayuda Rápida
              </p>
              <ul className="space-y-2 text-xs text-gray-600">
                <li className="flex items-start gap-2">
                  <Users size={13} className="mt-0.5 text-red-500 flex-shrink-0" />
                  Cada mesa requiere 4 jurados con roles definidos.
                </li>
                <li className="flex items-start gap-2">
                  <MapPin size={13} className="mt-0.5 text-red-500 flex-shrink-0" />
                  El sorteo es determinístico: misma semilla = mismos jurados.
                </li>
                <li className="flex items-start gap-2">
                  <Hash size={13} className="mt-0.5 text-red-500 flex-shrink-0" />
                  Usa "Reiniciar mock" para limpiar todo el estado en memoria.
                </li>
              </ul>
            </div>
          </div>
        </div>
      </main>

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
