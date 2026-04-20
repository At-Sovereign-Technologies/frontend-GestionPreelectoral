import { useState } from "react"
import { BarChart3, PenLine } from "lucide-react"
import ComingSoonToast from "./ComingSoonToast"

export default function Hero() {
  const [showToast, setShowToast] = useState(false)

  return (
    <section className="px-10 py-20 bg-white">
      <h1 className="text-5xl md:text-6xl font-bold leading-tight">
        Garantizando la <br />
        <span className="text-red-500">Integridad</span> de la <br />
        Democracia <br />
        Colombiana
      </h1>

      <p className="mt-6 text-gray-600 max-w-xl">
        Tecnología híbrida con custodia criptográfica para elecciones transparentes,
        seguras e inclusivas en todo el territorio nacional.
      </p>

      <div className="mt-8 flex gap-4">
        <button
          onClick={() => setShowToast(true)}
          className="flex items-center gap-2 bg-red-500 text-white px-6 py-3 rounded-lg hover:bg-red-600 transition"
        >
          <PenLine size={18} />
          Consultar mi Voto
        </button>

        <button
          onClick={() => setShowToast(true)}
          className="flex items-center gap-2 border px-6 py-3 rounded-lg hover:bg-gray-100 transition"
        >
          <BarChart3 size={18} />
          Ver Resultados en Vivo
        </button>
      </div>

      <ComingSoonToast isVisible={showToast} onClose={() => setShowToast(false)} />
    </section>
  )
}