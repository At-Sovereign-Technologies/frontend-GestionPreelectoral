import { Navigate, Outlet } from "react-router-dom"
import { isAuthenticated } from "../services/authService"
import { debugLog } from "../utils/debugLogger"

export default function ProtectedRoute() {
  const autenticado = isAuthenticated()

  if (!autenticado) {
    debugLog("route", "Redirigiendo a /login por falta de sesión")
    return <Navigate to="/login" replace />
  }

  debugLog("route", "Acceso permitido: usuario autenticado")
  return <Outlet />
}
