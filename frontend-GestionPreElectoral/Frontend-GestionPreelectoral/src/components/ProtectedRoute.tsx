import { Navigate, Outlet } from "react-router-dom"
import { isAuthenticated, tieneRol } from "../services/authService"
import { debugLog } from "../utils/debugLogger"

const ROL_REQUERIDO = "registraduria"

export default function ProtectedRoute() {
  const autenticado = isAuthenticated()

  if (!autenticado) {
    debugLog("route", "Redirigiendo a /login por falta de sesión")
    return <Navigate to="/login" replace />
  }

  const autorizado = tieneRol(ROL_REQUERIDO)

  if (!autorizado) {
    debugLog("route", `Acceso denegado: el usuario no tiene el rol '${ROL_REQUERIDO}'`)
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="bg-white border border-red-200 rounded-xl p-8 max-w-md w-full text-center shadow-sm">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-red-500 text-xl font-bold">!</span>
          </div>
          <h1 className="text-lg font-bold text-gray-900 mb-2">Acceso restringido</h1>
          <p className="text-sm text-gray-500 mb-6">
            Este módulo es exclusivo para usuarios con el rol{" "}
            <span className="font-semibold text-red-600">registraduria</span>. Tu cuenta no
            cuenta con los permisos necesarios.
          </p>
          <button
            type="button"
            onClick={() => {
              // Cerrar sesión y volver al login
              import("../services/authService").then(({ logout }) => {
                logout()
                window.location.href = "/login"
              })
            }}
            className="px-5 py-2 bg-red-500 text-white rounded-lg text-sm font-semibold hover:bg-red-600 transition"
          >
            Cerrar sesión
          </button>
        </div>
      </div>
    )
  }

  debugLog("route", `Acceso permitido: usuario tiene el rol '${ROL_REQUERIDO}'`)
  return <Outlet />
}
