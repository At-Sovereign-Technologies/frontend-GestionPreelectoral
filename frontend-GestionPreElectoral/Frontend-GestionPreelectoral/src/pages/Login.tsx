import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { Eye, EyeOff, Lock, User } from "lucide-react"
import { login } from "../services/authService"

export default function Login() {
  const navigate = useNavigate()

  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const hasError = Boolean(error)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!username.trim() || !password.trim()) {
      setError("Por favor ingresa usuario y contraseña.")
      return
    }

    setLoading(true)
    try {
      await login({ username: username.trim(), password })
      navigate("/censo/gestion")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al iniciar sesión")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="notranslate min-h-screen bg-gray-50 flex flex-col" translate="no">

      {/* Header minimal */}
      <header className="bg-white border-b px-8 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-red-500 rounded flex items-center justify-center">
            <span className="text-white text-xs font-bold">SL</span>
          </div>
          <div className="leading-tight">
            <p className="font-bold text-sm text-gray-900">Sello Legítimo</p>
            <p className="text-red-500 text-[10px] font-semibold tracking-wider">
              SISTEMA ELECTORAL COLOMBIANO
            </p>
          </div>
        </div>

        {/* Placeholder avatar */}
        <div className="w-8 h-8 rounded-full bg-gray-200" />
      </header>

      {/* Center card */}
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">

          {/* Card */}
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm px-8 py-10">

            {/* Icon + title */}
            <div className="flex flex-col items-center mb-8">
              <div className="w-14 h-14 bg-red-50 border border-red-200 rounded-2xl flex items-center justify-center mb-4">
                <Lock className="w-6 h-6 text-red-500" />
              </div>
              <h1 className="text-xl font-bold text-gray-900">Acceso al Sistema</h1>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">

              {/* Username */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Usuario
                </label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                    <User size={15} />
                  </div>
                  <input
                    type="text"
                    autoComplete="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="usuario@registraduria.gov.co"
                    className="w-full border border-gray-300 rounded-lg pl-9 pr-3 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-300 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Contraseña
                </label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                    <Lock size={15} />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full border border-gray-300 rounded-lg pl-9 pr-10 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-300 focus:border-transparent"
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition"
                    aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                  >
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              {/* Error message */}
              <div
                className={`min-h-10 flex items-start gap-2 rounded-lg px-3 py-2.5 text-xs transition ${
                  hasError
                    ? "border border-red-200 bg-red-50 text-red-600 opacity-100"
                    : "border border-transparent bg-transparent text-transparent opacity-0"
                }`}
                aria-live="polite"
              >
                <span className="mt-px flex-shrink-0">&#9888;</span>
                <span>{error ?? "Sin errores"}</span>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-red-500 hover:bg-red-600 disabled:bg-red-300 text-white font-semibold rounded-lg py-2.5 text-sm transition mt-1 flex items-center justify-center gap-2"
              >
                <span
                  className={`w-4 h-4 border-2 border-white border-t-transparent rounded-full ${loading ? "animate-spin opacity-100" : "opacity-0"}`}
                  aria-hidden={!loading}
                />
                <span>{loading ? "Verificando credenciales" : "Ingresar al Sistema"}</span>
              </button>
            </form>


          </div>

          {/* Footer note */}
          <p className="text-center text-xs text-gray-400 mt-4">
            Acceso restringido a funcionarios autorizados — República de Colombia
          </p>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t bg-white py-3 px-8 text-center text-xs text-gray-400">
        © 2026 Sello Legítimo — Sistema Electoral Colombiano — Certificado ISO 27001
      </footer>

    </div>
  )
}
