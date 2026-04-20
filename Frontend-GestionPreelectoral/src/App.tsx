import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import Login from "./pages/Login"
import GestionCenso from "./pages/GestionCenso"
import ProtectedRoute from "./components/ProtectedRoute"

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Ruta p�blica */}
        <Route path="/login" element={<Login />} />

        {/* Rutas protegidas � requieren JWT v�lido */}
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<Navigate to="/censo/gestion" replace />} />
          <Route path="/censo/gestion" element={<GestionCenso />} />
        </Route>

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
