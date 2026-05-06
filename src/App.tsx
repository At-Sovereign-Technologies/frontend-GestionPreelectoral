import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import GestionCenso from "./pages/GestionCenso"
import GestionCandidaturas from "./pages/GestionCandidaturas"
import SorteoJurados from "./pages/SorteoJurados"
import GestionExcusas from "./pages/GestionExcusas"
import ControlAsistencia from "./pages/ControlAsistencia"
import Login from "./pages/Login"
import Callback from "./pages/Callback"

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/callback" element={<Callback />} />
        <Route path="/" element={<Navigate to="/censo/gestion" replace />} />
        <Route path="/censo/gestion" element={<GestionCenso />} />
        <Route path="/candidaturas/gestion" element={<GestionCandidaturas />} />
        <Route path="/jurados/sorteo" element={<SorteoJurados />} />
        <Route path="/jurados/excusas" element={<GestionExcusas />} />
        <Route path="/jurados/asistencia" element={<ControlAsistencia />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
