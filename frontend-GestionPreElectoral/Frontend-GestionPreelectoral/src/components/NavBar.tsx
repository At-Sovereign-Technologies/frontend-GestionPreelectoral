import { useState } from "react"
import { useNavigate } from "react-router-dom"
import ComingSoonToast from "../components/ComingSoonToast"

export default function NavBar() {
  const navigate = useNavigate()
  const [showToast, setShowToast] = useState(false)

  return (
    <nav className="flex justify-between items-center px-10 py-6 border-b bg-white">
      <div className="flex flex-col leading-tight">
        <span className="font-bold text-lg">Sello Legítimo</span>
        <span className="text-red-500 text-xs font-semibold tracking-wide">
          SISTEMA ELECTORAL COLOMBIANO
        </span>
      </div>

      <div className="hidden md:flex gap-8 text-sm">
        {["Inicio", "Transparencia", "Resultados", "Auditoría", "Contacto"].map(
          (label) => (
            <button
              key={label}
              onClick={() => setShowToast(true)}
              className="hover:text-gray-900 text-gray-600 transition"
            >
              {label}
            </button>
          )
        )}
      </div>

      <button
        onClick={() => navigate("/login")}
        className="bg-red-500 text-white px-4 py-2 rounded-lg"
      >
        Ingresar al Sistema
      </button>

      <ComingSoonToast isVisible={showToast} onClose={() => setShowToast(false)} />
    </nav>
  )
}