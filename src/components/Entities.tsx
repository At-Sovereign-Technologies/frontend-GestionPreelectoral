export default function Entities() {
  return (
    <section className="px-10 py-20 bg-white">
      
      <div className="max-w-6xl mx-auto">

        <div className="grid md:grid-cols-3 gap-6">

          {/* Gobierno */}
          <div className="h-40 bg-gray-100 rounded-xl flex items-center justify-center text-gray-400 font-semibold text-lg hover:shadow-md transition">
            GOBIERNO
          </div>

          {/* CNE */}
          <div className="h-40 bg-gray-100 rounded-xl flex items-center justify-center text-gray-400 font-semibold text-lg hover:shadow-md transition">
            CNE
          </div>

          {/* RNEC */}
          <div className="h-40 bg-gray-100 rounded-xl flex items-center justify-center text-gray-400 font-semibold text-lg hover:shadow-md transition">
            RNEC
          </div>

        </div>

      </div>
    </section>
  )
}