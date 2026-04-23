import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import GestionCenso from "./pages/GestionCenso"
import ProtectedRoute from "./components/ProtectedRoute"

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<Navigate to="/censo/gestion" replace />} />
          <Route path="/censo/gestion" element={<GestionCenso />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
