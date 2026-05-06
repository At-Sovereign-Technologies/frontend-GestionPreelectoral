import { useEffect, useState } from "react"
import {
  Search,
  RefreshCw,
  Plus,
  X,
  History,
  Ticket,
  ArrowRightLeft,
  UserPlus,
  Printer,
} from "lucide-react"
import PageHeader from "../components/PageHeader"
import ComingSoonToast from "../components/ComingSoonToast"
import Footer from "../components/Footer"
import {
  listarCandidaturasPorEleccion,
  registrarCandidatura,
  transicionarEstado,
  generarTarjeton,
  subirFotoCandidatura,
  listarVersiones,
  type CandidaturaRespuesta,
  type CandidaturaVersion,
  type EstadoCandidatura,
  type TarjetonRespuesta,
} from "../api/candidaturasApi"
import { listarElecciones, type EleccionResumen } from "../api/censoApi"
import { buildGatewayUrl } from "../api/apiClient"

const ESTADOS_TRANSICION: Record<EstadoCandidatura, EstadoCandidatura[]> = {
  BORRADOR: ["POSTULADO", "RECHAZADO"],
  POSTULADO: ["EN_VALIDACION", "RECHAZADO"],
  EN_VALIDACION: ["APROBADO", "RECHAZADO"],
  APROBADO: ["PUBLICADO", "RECHAZADO"],
  PUBLICADO: ["BLOQUEADO"],
  RECHAZADO: [],
  BLOQUEADO: [],
  REEMPLAZADA: [],
  REVOCADA: [],
}

const COLORES_ESTADO: Record<EstadoCandidatura, string> = {
  BORRADOR: "bg-gray-100 text-gray-700 border border-gray-200",
  POSTULADO: "bg-blue-100 text-blue-700 border border-blue-200",
  EN_VALIDACION: "bg-yellow-100 text-yellow-700 border border-yellow-200",
  APROBADO: "bg-green-100 text-green-700 border border-green-200",
  RECHAZADO: "bg-red-100 text-red-600 border border-red-200",
  PUBLICADO: "bg-purple-100 text-purple-700 border border-purple-200",
  BLOQUEADO: "bg-orange-100 text-orange-700 border border-orange-200",
  REEMPLAZADA: "bg-gray-100 text-gray-500 border border-gray-200",
  REVOCADA: "bg-gray-100 text-gray-500 border border-gray-200",
}

function BadgeEstado({ estado }: { estado: EstadoCandidatura }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${COLORES_ESTADO[estado]}`}>
      {estado}
    </span>
  )
}

function getColorPartido(partido: string): string {
  const mapa: Record<string, string> = {
    "Partido Liberal": "#c41e3a",
    "Partido Conservador": "#0033a0",
    "Partido Verde": "#008f39",
    "Movimiento Independiente": "#ff6600",
    "Partido Cambio Radical": "#ffd700",
    "Partido de la U": "#e60026",
    "Partido Centro Democratico": "#1a1a1a",
    "Partido Alianza Verde": "#008f39",
    "Pacto Historico": "#6b2c91",
    "Nuevo Liberalismo": "#00a3e0",
  }
  // Hash simple como fallback
  let hash = 0
  for (let i = 0; i < partido.length; i++) {
    hash = partido.charCodeAt(i) + ((hash << 5) - hash)
  }
  const fallback = `hsl(${Math.abs(hash) % 360}, 65%, 40%)`
  return mapa[partido] || fallback
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

export default function GestionCandidaturas() {
  const [busqueda, setBusqueda] = useState("")
  const [eleccionId, setEleccionId] = useState<number>(1)
  const [elecciones, setElecciones] = useState<EleccionResumen[]>([])
  const [candidaturas, setCandidaturas] = useState<CandidaturaRespuesta[]>([])
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mostrarToast, setMostrarToast] = useState(false)
  const [mensajeToast, setMensajeToast] = useState("")
  const [modalActivo, setModalActivo] = useState<"NINGUNO" | "TRANSICION" | "VERSIONES" | "TARJETON" | "REGISTRAR">("NINGUNO")
  const [candidaturaSeleccionada, setCandidaturaSeleccionada] = useState<CandidaturaRespuesta | null>(null)
  const [tarjeton, setTarjeton] = useState<TarjetonRespuesta | null>(null)
  const [versiones, setVersiones] = useState<CandidaturaVersion[]>([])
  const [procesando, setProcesando] = useState(false)

  const [nuevoEstado, setNuevoEstado] = useState<EstadoCandidatura>("POSTULADO")
  const [rolTransicion, setRolTransicion] = useState("REGISTRADURIA")
  const [justificacion, setJustificacion] = useState("")
  const [actor, setActor] = useState("admin")

  const [formRegistro, setFormRegistro] = useState({
    nombreCandidato: "",
    documento: "",
    partido: "",
    circunscripcion: "NACIONAL",
    fotoUrl: "",
    foto: null as File | null,
  })
  const [fotoPreview, setFotoPreview] = useState<string | null>(null)
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})

  function validarFormulario(): boolean {
    const errores: Record<string, string> = {}
    if (!formRegistro.nombreCandidato.trim()) {
      errores.nombreCandidato = "El nombre del candidato es obligatorio"
    } else if (formRegistro.nombreCandidato.trim().length > 180) {
      errores.nombreCandidato = "Máximo 180 caracteres"
    }
    if (!formRegistro.documento.trim()) {
      errores.documento = "El documento es obligatorio"
    } else if (formRegistro.documento.trim().length > 30) {
      errores.documento = "Máximo 30 caracteres"
    }
    if (!formRegistro.partido.trim()) {
      errores.partido = "El partido es obligatorio"
    } else if (formRegistro.partido.trim().length > 120) {
      errores.partido = "Máximo 120 caracteres"
    }
    if (!formRegistro.circunscripcion.trim()) {
      errores.circunscripcion = "La circunscripción es obligatoria"
    } else if (formRegistro.circunscripcion.trim().length > 120) {
      errores.circunscripcion = "Máximo 120 caracteres"
    }
    setFormErrors(errores)
    return Object.keys(errores).length === 0
  }

  async function cargarCandidaturas() {
    setCargando(true)
    setError(null)
    try {
      const data = await listarCandidaturasPorEleccion(eleccionId)
      setCandidaturas(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar candidaturas")
      setCandidaturas([])
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    void cargarCandidaturas()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eleccionId])

  useEffect(() => {
    listarElecciones()
      .then((data) => {
        setElecciones(data)
        if (data.length > 0 && !data.find((e) => e.id === eleccionId)) {
          setEleccionId(data[0].id)
        }
      })
      .catch(() => setElecciones([]))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const candidaturasFiltradas = candidaturas.filter((c) => {
    const q = busqueda.trim().toLowerCase()
    if (!q) return true
    return (
      c.nombreCandidato.toLowerCase().includes(q) ||
      c.documento.toLowerCase().includes(q) ||
      c.partido.toLowerCase().includes(q)
    )
  })

  function abrirToast(mensaje: string) {
    setMensajeToast(mensaje)
    setMostrarToast(true)
  }

  function cerrarModal() {
    setModalActivo("NINGUNO")
    setCandidaturaSeleccionada(null)
    setTarjeton(null)
    setVersiones([])
    setJustificacion("")
    setFormErrors({})
    if (fotoPreview) URL.revokeObjectURL(fotoPreview)
    setFotoPreview(null)
  }

  async function handleTransicionar() {
    if (!candidaturaSeleccionada) return
    setProcesando(true)
    try {
      await transicionarEstado(candidaturaSeleccionada.id, {
        estado: nuevoEstado,
        actor,
        justificacion: justificacion || null,
        rol: rolTransicion,
      })
      abrirToast(`Estado actualizado a ${nuevoEstado}`)
      await cargarCandidaturas()
      cerrarModal()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al transicionar estado")
    } finally {
      setProcesando(false)
    }
  }

  async function handleGenerarTarjeton() {
    setProcesando(true)
    try {
      const data = await generarTarjeton(eleccionId, {
        tipoOrdenamiento: "ALFABETICO",
        actor,
      })
      setTarjeton(data)
      setModalActivo("TARJETON")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al generar tarjetón")
    } finally {
      setProcesando(false)
    }
  }

  async function handleVerVersiones(candidatura: CandidaturaRespuesta) {
    setCargando(true)
    try {
      const data = await listarVersiones(candidatura.id)
      setVersiones(data)
      setCandidaturaSeleccionada(candidatura)
      setModalActivo("VERSIONES")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar versiones")
    } finally {
      setCargando(false)
    }
  }

  async function handleRegistrar() {
    if (!validarFormulario()) return
    setProcesando(true)
    try {
      const candidaturaCreada = await registrarCandidatura({
        eleccionId,
        nombreCandidato: formRegistro.nombreCandidato,
        documento: formRegistro.documento,
        partido: formRegistro.partido,
        circunscripcion: formRegistro.circunscripcion,
        fotoUrl: formRegistro.fotoUrl || null,
        actor,
      })
      if (formRegistro.foto) {
        await subirFotoCandidatura(candidaturaCreada.id, formRegistro.foto)
      }
      abrirToast("Candidatura registrada")
      setFormRegistro({ nombreCandidato: "", documento: "", partido: "", circunscripcion: "NACIONAL", fotoUrl: "", foto: null })
      if (fotoPreview) URL.revokeObjectURL(fotoPreview)
      setFotoPreview(null)
      await cargarCandidaturas()
      cerrarModal()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al registrar candidatura")
    } finally {
      setProcesando(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <PageHeader />

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Gestión de Candidaturas</h1>
            <p className="text-sm text-gray-500 mt-1">Administrar candidatos, estados y tarjetones</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => { setFormErrors({}); setFormRegistro((p) => ({ ...p, foto: null })); setFotoPreview(null); setModalActivo("REGISTRAR") }}
              className="inline-flex items-center gap-2 rounded-lg bg-red-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-600"
            >
              <Plus size={16} />
              Nueva candidatura
            </button>
            <button
              onClick={handleGenerarTarjeton}
              disabled={procesando}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
            >
              <Ticket size={16} />
              Generar tarjetón
            </button>
            
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="mb-4 flex items-center gap-4">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-600">Elección:</label>
            <select
              value={eleccionId}
              onChange={(e) => setEleccionId(Number(e.target.value))}
              className="notranslate rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-red-300"
              translate="no"
            >
              {elecciones.map((el) => (
                <option key={el.id} value={el.id}>
                  {el.nombreOficial} ({el.estado})
                </option>
              ))}
            </select>
          </div>
          <div className="relative flex-1 max-w-md">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por nombre, documento o partido..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full rounded-lg border border-gray-300 pl-9 pr-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-red-300"
            />
          </div>
          <button
            onClick={cargarCandidaturas}
            disabled={cargando}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-600 transition hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw size={14} className={cargando ? "animate-spin" : ""} />
            Actualizar
          </button>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Nombre</th>
                <th className="px-4 py-3 text-left font-medium">Documento</th>
                <th className="px-4 py-3 text-left font-medium">Partido</th>
                <th className="px-4 py-3 text-left font-medium">Circunscripción</th>
                <th className="px-4 py-3 text-left font-medium">Estado</th>
                <th className="px-4 py-3 text-left font-medium">Versión</th>
                <th className="px-4 py-3 text-left font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {candidaturasFiltradas.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                    {cargando ? "Cargando..." : "No hay candidaturas registradas"}
                  </td>
                </tr>
              )}
              {candidaturasFiltradas.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50 transition">
                  <td className="px-4 py-3 font-medium text-gray-900">{c.nombreCandidato}</td>
                  <td className="px-4 py-3 text-gray-600">{c.documento}</td>
                  <td className="px-4 py-3 text-gray-600">{c.partido}</td>
                  <td className="px-4 py-3 text-gray-600">{c.circunscripcion}</td>
                  <td className="px-4 py-3">
                    <BadgeEstado estado={c.estado} />
                  </td>
                  <td className="px-4 py-3 text-gray-600">{c.version}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setCandidaturaSeleccionada(c)
                          const posibles = ESTADOS_TRANSICION[c.estado]
                          setNuevoEstado(posibles[0] ?? c.estado)
                          setModalActivo("TRANSICION")
                        }}
                        className="inline-flex items-center gap-1 rounded-md border border-gray-200 bg-white px-2 py-1 text-xs text-gray-600 transition hover:bg-gray-50"
                        title="Transicionar estado"
                      >
                        <ArrowRightLeft size={12} />
                        Estado
                      </button>
                      <button
                        onClick={() => handleVerVersiones(c)}
                        className="inline-flex items-center gap-1 rounded-md border border-gray-200 bg-white px-2 py-1 text-xs text-gray-600 transition hover:bg-gray-50"
                        title="Ver versiones"
                      >
                        <History size={12} />
                        Historial
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Transición */}
      {modalActivo === "TRANSICION" && candidaturaSeleccionada && (
        <ModalBase
          titulo="Transicionar Estado"
          subtitulo={`${candidaturaSeleccionada.nombreCandidato} — estado actual: ${candidaturaSeleccionada.estado}`}
          onClose={cerrarModal}
        >
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Nuevo estado</label>
              <select
                value={nuevoEstado}
                onChange={(e) => setNuevoEstado(e.target.value as EstadoCandidatura)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-red-300"
              >
                {ESTADOS_TRANSICION[candidaturaSeleccionada.estado].map((est) => (
                  <option key={est} value={est}>
                    {est}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Rol</label>
              <select
                value={rolTransicion}
                onChange={(e) => setRolTransicion(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-red-300"
              >
                <option value="REGISTRADURIA">Registraduría</option>
                <option value="PARTIDO">Partido</option>
                <option value="CANDIDATO_IND">Candidato Independiente</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Actor</label>
              <input
                type="text"
                value={actor}
                onChange={(e) => setActor(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-red-300"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Justificación</label>
              <textarea
                value={justificacion}
                onChange={(e) => setJustificacion(e.target.value)}
                rows={3}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-red-300"
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button onClick={cerrarModal} className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50">
                Cancelar
              </button>
              <button
                onClick={handleTransicionar}
                disabled={procesando}
                className="inline-flex items-center gap-2 rounded-lg bg-red-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-600 disabled:bg-red-300"
              >
                <ArrowRightLeft size={16} />
                {procesando ? "Procesando..." : "Confirmar transición"}
              </button>
            </div>
          </div>
        </ModalBase>
      )}

      {/* Modal Versiones */}
      {modalActivo === "VERSIONES" && candidaturaSeleccionada && (
        <ModalBase
          titulo="Historial de Versiones"
          subtitulo={`${candidaturaSeleccionada.nombreCandidato}`}
          onClose={cerrarModal}
        >
          <div className="max-h-96 overflow-y-auto">
            {versiones.length === 0 ? (
              <p className="text-sm text-gray-500">No hay versiones registradas.</p>
            ) : (
              <ul className="space-y-3">
                {versiones.map((v) => (
                  <li key={v.id} className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-gray-500">Versión #{v.versionNumber}</span>
                      <span className="text-xs text-gray-400">{new Date(v.fechaVersion).toLocaleString("es-CO")}</span>
                    </div>
                    <div className="mt-1 text-sm text-gray-800">
                      {v.nombreCandidato} — <BadgeEstado estado={v.estado} />
                    </div>
                    <div className="text-xs text-gray-500 mt-1">Modificado por: {v.actorModificacion}</div>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="flex justify-end pt-4">
            <button onClick={cerrarModal} className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50">
              Cerrar
            </button>
          </div>
        </ModalBase>
      )}

      {/* Modal Tarjetón */}
      {modalActivo === "TARJETON" && tarjeton && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/50 px-4 overflow-y-auto">
          <div className="w-full max-w-4xl rounded-sm border-2 border-gray-800 bg-white shadow-2xl my-8">
            {/* Encabezado oficial */}
            <div className="border-b-2 border-gray-800 bg-gray-50 px-6 py-4 text-center">
              <h2 className="text-lg font-black uppercase tracking-wide text-gray-900">
                Voto para Cámara de Representantes
              </h2>
              <p className="mt-1 text-xs font-bold uppercase tracking-wider text-gray-600">
                Circunscripción {tarjeton.circunscripcion || "Nacional"}
              </p>
              <p className="mt-0.5 text-[10px] uppercase tracking-widest text-gray-500">
                Elección #{tarjeton.eleccionId} — {new Date(tarjeton.fechaGeneracion).toLocaleDateString("es-CO", { day: "numeric", month: "long", year: "numeric" })}
              </p>
            </div>

            {/* Grid de candidaturas */}
            <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2">
              {tarjeton.entradas
                .filter((e) => e.tipo === "CANDIDATO")
                .map((entrada) => {
                  const iniciales = entrada.nombreCandidato
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase()
                  const colorPartido = getColorPartido(entrada.partido || "")
                  return (
                    <div
                      key={entrada.orden}
                      className="relative flex flex-col gap-2 rounded-sm border-2 border-gray-700 bg-white p-3"
                    >
                      {/* Barra de color del partido */}
                      <div className="absolute left-0 top-0 h-full w-1.5" style={{ backgroundColor: colorPartido }} />

                      <div className="flex items-start gap-3 pl-2">
                        {/* Foto / Avatar */}
                        <div className="flex flex-col items-center gap-0.5 flex-shrink-0">
                          {entrada.fotoUrl ? (
                            <img
                              src={buildGatewayUrl(entrada.fotoUrl)}
                              alt={entrada.nombreCandidato}
                              className="h-14 w-14 object-cover rounded-sm border border-gray-300"
                              onError={(e) => {
                                const img = e.currentTarget
                                img.style.display = "none"
                                const fallback = img.nextElementSibling as HTMLElement | null
                                if (fallback) fallback.style.display = "flex"
                              }}
                            />
                          ) : null}
                          <div
                            className="flex h-14 w-14 items-center justify-center rounded-sm border border-gray-300 text-lg font-black text-white shadow-sm"
                            style={{ backgroundColor: colorPartido, display: entrada.fotoUrl ? "none" : "flex" }}
                          >
                            {iniciales}
                          </div>
                          {!entrada.fotoUrl && (
                            <span className="text-[8px] font-semibold uppercase tracking-wider text-gray-400">Sin foto</span>
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold uppercase leading-tight text-gray-900">
                            {entrada.nombreCandidato}
                          </p>
                          <p className="mt-0.5 text-[10px] font-bold uppercase tracking-wide text-gray-600">
                            {entrada.partido}
                          </p>
                          <p className="mt-1 text-[9px] font-semibold uppercase tracking-wider text-gray-400">
                            Preferente
                          </p>
                        </div>

                        {/* Número de orden */}
                        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-sm border-2 border-gray-800 bg-white">
                          <span className="text-sm font-black text-gray-900">{entrada.orden}</span>
                        </div>
                      </div>

                      {/* Casillas de preferencia */}
                      <div className="mt-1 grid grid-cols-6 gap-1 pl-2">
                        {[101, 102, 103, 104, 105, 106].map((num) => (
                          <div
                            key={num}
                            className="flex aspect-square items-center justify-center rounded-sm border border-gray-400 bg-white"
                          >
                            <span className="text-[9px] font-bold text-gray-500">{num}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
            </div>

            {/* Voto en blanco */}
            {tarjeton.entradas.some((e) => e.tipo === "VOTO_BLANCO") && (
              <div className="mx-4 mb-4 rounded-sm border-2 border-gray-700 bg-gray-50 p-6 text-center">
                <p className="text-xl font-black uppercase tracking-widest text-gray-800">
                  Voto en Blanco
                </p>
              </div>
            )}

            {/* Pie de página */}
            <div className="border-t-2 border-gray-800 bg-gray-50 px-6 py-3">
              <div className="flex items-center justify-between">
                <div className="text-[10px] text-gray-500">
                  <p className="font-bold uppercase">Registraduría Nacional del Estado Civil</p>
                  <p>Total entradas: {tarjeton.entradas.length}</p>
                  {tarjeton.semillaUsada != null && (
                    <p>Semilla de auditoría: {tarjeton.semillaUsada}</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => window.print()}
                    className="inline-flex items-center gap-1.5 rounded-sm border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 transition hover:bg-gray-100"
                  >
                    <Printer size={13} />
                    Imprimir
                  </button>
                  <button
                    onClick={cerrarModal}
                    className="rounded-sm bg-gray-800 px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-gray-700"
                  >
                    Cerrar
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Registrar */}
      {modalActivo === "REGISTRAR" && (
        <ModalBase titulo="Registrar Candidatura" subtitulo="Complete los datos del nuevo candidato" onClose={cerrarModal}>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-medium text-gray-600">Nombre candidato <span className="text-red-500">*</span></label>
              <input
                type="text"
                value={formRegistro.nombreCandidato}
                onChange={(e) => { setFormRegistro((p) => ({ ...p, nombreCandidato: e.target.value })); setFormErrors((prev) => { const { nombreCandidato, ...rest } = prev; return rest; }) }}
                className={`w-full rounded-lg border ${formErrors.nombreCandidato ? "border-red-400" : "border-gray-300"} px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-red-300`}
              />
              {formErrors.nombreCandidato && <p className="mt-1 text-xs text-red-500">{formErrors.nombreCandidato}</p>}
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Documento <span className="text-red-500">*</span></label>
              <input
                type="text"
                value={formRegistro.documento}
                onChange={(e) => { setFormRegistro((p) => ({ ...p, documento: e.target.value })); setFormErrors((prev) => { const { documento, ...rest } = prev; return rest; }) }}
                className={`w-full rounded-lg border ${formErrors.documento ? "border-red-400" : "border-gray-300"} px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-red-300`}
              />
              {formErrors.documento && <p className="mt-1 text-xs text-red-500">{formErrors.documento}</p>}
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Partido <span className="text-red-500">*</span></label>
              <input
                type="text"
                value={formRegistro.partido}
                onChange={(e) => { setFormRegistro((p) => ({ ...p, partido: e.target.value })); setFormErrors((prev) => { const { partido, ...rest } = prev; return rest; }) }}
                className={`w-full rounded-lg border ${formErrors.partido ? "border-red-400" : "border-gray-300"} px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-red-300`}
              />
              {formErrors.partido && <p className="mt-1 text-xs text-red-500">{formErrors.partido}</p>}
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Circunscripción</label>
              <input
                type="text"
                value={formRegistro.circunscripcion}
                onChange={(e) => { setFormRegistro((p) => ({ ...p, circunscripcion: e.target.value })); setFormErrors((prev) => { const { circunscripcion, ...rest } = prev; return rest; }) }}
                className={`w-full rounded-lg border ${formErrors.circunscripcion ? "border-red-400" : "border-gray-300"} px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-red-300`}
              />
              {formErrors.circunscripcion && <p className="mt-1 text-xs text-red-500">{formErrors.circunscripcion}</p>}
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Foto del candidato</label>
              <div className="flex items-center gap-4">
                {fotoPreview ? (
                  <img src={fotoPreview} alt="Vista previa" className="h-16 w-16 rounded-lg object-cover border border-gray-200" />
                ) : (
                  <div className="flex h-16 w-16 items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 text-xs text-gray-400">
                    Sin foto
                  </div>
                )}
                <label className="cursor-pointer rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-600 transition hover:bg-gray-50">
                  <span>Seleccionar archivo</span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0] ?? null
                      setFormRegistro((p) => ({ ...p, foto: file }))
                      if (fotoPreview) URL.revokeObjectURL(fotoPreview)
                      if (file) {
                        setFotoPreview(URL.createObjectURL(file))
                      } else {
                        setFotoPreview(null)
                      }
                    }}
                  />
                </label>
                {formRegistro.foto && (
                  <button
                    type="button"
                    onClick={() => {
                      setFormRegistro((p) => ({ ...p, foto: null }))
                      if (fotoPreview) URL.revokeObjectURL(fotoPreview)
                      setFotoPreview(null)
                    }}
                    className="text-xs text-red-500 hover:text-red-700"
                  >
                    Eliminar
                  </button>
                )}
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Actor</label>
              <input
                type="text"
                value={actor}
                onChange={(e) => setActor(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-red-300"
              />
            </div>
          </div>
          <div className="mt-6 flex justify-end gap-3">
            <button onClick={cerrarModal} className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50">
              Cancelar
            </button>
            <button
              onClick={handleRegistrar}
              disabled={procesando}
              className="inline-flex items-center gap-2 rounded-lg bg-red-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-600 disabled:bg-red-300"
            >
              <UserPlus size={16} />
              {procesando ? "Guardando..." : "Registrar"}
            </button>
          </div>
        </ModalBase>
      )}

      <ComingSoonToast isVisible={mostrarToast} onClose={() => setMostrarToast(false)} message={mensajeToast} />
      <Footer />
    </div>
  )
}
