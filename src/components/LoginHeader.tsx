import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { ChevronLeft } from "lucide-react"
import ComingSoonToast from "./ComingSoonToast"

export default function Header() {
  const navigate = useNavigate()
  const [showToast, setShowToast] = useState(false)

  return (
    <header className="w-full border-b bg-white px-10 py-4 flex justify-between items-center">
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900 border rounded-lg px-3 py-2 transition"
        >
          <ChevronLeft size={16} />
          Volver
        </button>
        <div>
          <h1 className="font-bold text-lg">Sello Legítimo</h1>
          <p className="text-xs text-red-500 font-semibold">SISTEMA ELECTORAL COLOMBIANO</p>
        </div>
      </div>
      <div className="flex items-center gap-6 text-sm text-gray-600">
        <button onClick={() => setShowToast(true)} className="hover:text-gray-900 transition">
          Acceso Remoto
        </button>
        <button onClick={() => setShowToast(true)} className="hover:text-gray-900 transition">
          Módulo M3-RF
        </button>
        <button onClick={() => setShowToast(true)} className="bg-gray-100 px-3 py-1 rounded-lg hover:bg-gray-200 transition">
          Guía
        </button>
      </div>

      <ComingSoonToast isVisible={showToast} onClose={() => setShowToast(false)} />
    </header>
  )
}