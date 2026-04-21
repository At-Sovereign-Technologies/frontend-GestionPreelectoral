import { Lock, Link2, Globe } from "lucide-react"

export default function Features() {
  return (
    <section className="px-10 py-20 bg-[#f8f6f3]">
      
      <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto">

        {/* Tarjeta 1 */}
        <div className="bg-white p-6 rounded-xl shadow-sm border hover:shadow-md transition">
          <div className="mb-4">
            <div className="w-12 h-12 flex items-center justify-center rounded-lg bg-gray-100">
              <Lock className="w-5 h-5 text-black" />
            </div>
          </div>
          <h3 className="font-semibold text-lg mb-2">
            Seguridad Criptográfica
          </h3>
          <p className="text-gray-600 text-sm">
            Infraestructura de punta que protege cada sufragio mediante algoritmos de cifrado asimétrico inquebrantables.
          </p>
        </div>

        {/* Tarjeta 2 */}
        <div className="bg-white p-6 rounded-xl shadow-sm border hover:shadow-md transition">
          <div className="mb-4">
            <div className="w-12 h-12 flex items-center justify-center rounded-lg bg-gray-100">
              <Link2 className="w-5 h-5 text-black" />
            </div>
          </div>
          <h3 className="font-semibold text-lg mb-2">
            Transparencia Blockchain
          </h3>
          <p className="text-gray-600 text-sm">
            Libro de registro inmutable que permite la trazabilidad completa del proceso electoral desde la emisión hasta el escrutinio.
          </p>
        </div>

        {/* Tarjeta 3 */}
        <div className="bg-white p-6 rounded-xl shadow-sm border hover:shadow-md transition">
          <div className="mb-4">
            <div className="w-12 h-12 flex items-center justify-center rounded-lg bg-gray-100">
              <Globe className="w-5 h-5 text-black" />
            </div>
          </div>
          <h3 className="font-semibold text-lg mb-2">
            Accesibilidad Universal
          </h3>
          <p className="text-gray-600 text-sm">
            Diseñado para que cada colombiano, sin importar su ubicación o condición, ejerza su derecho de forma autónoma.
          </p>
        </div>

      </div>
    </section>
  )
}