import { useEffect, useRef, useState } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { handleOidcCallback } from "../services/authService"
import { debugLog } from "../utils/debugLogger"

export default function Callback() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)
  const processed = useRef(false)

  useEffect(() => {
    if (processed.current) return
    processed.current = true

    const code = searchParams.get("code")
    const state = searchParams.get("state")
    const errorParam = searchParams.get("error")

    if (errorParam) {
      const description = searchParams.get("error_description") ?? errorParam
      debugLog("callback", "Authelia devolvio error en callback", { error: errorParam })
      setError(`Error de autenticación: ${description}`)
      return
    }

    if (!code || !state) {
      setError("Respuesta de autenticación inválida. Vuelve a iniciar sesión.")
      return
    }

    handleOidcCallback(code, state)
      .then(() => {
        debugLog("callback", "Sesion iniciada, redirigiendo a inicio")
        navigate("/", { replace: true })
      })
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : "No se pudo completar el inicio de sesión."
        debugLog("callback", "Error al procesar callback", { message })
        setError(message)
      })
  }, [navigate, searchParams])

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white border border-red-200 rounded-2xl shadow-sm px-8 py-10 w-full max-w-md text-center">
          <p className="text-red-600 font-semibold mb-4">Error de autenticación</p>
          <p className="text-gray-600 text-sm mb-6">{error}</p>
          <button
            onClick={() => navigate("/login", { replace: true })}
            className="bg-red-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-red-600"
          >
            Volver al login
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="w-8 h-8 border-4 border-red-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-500 text-sm">Iniciando sesión...</p>
      </div>
    </div>
  )
}
