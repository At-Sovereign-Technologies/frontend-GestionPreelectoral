export default function Organization() {
  return (
    <section className="px-10 py-20 bg-[#f1e4e2]">
      
      <div className="max-w-6xl mx-auto text-center">

        {/* subtítulo */}
        <p className="text-xs tracking-widest text-red-500 font-semibold mb-2">
          INSTITUCIONALIDAD
        </p>

        {/* título */}
        <h2 className="text-3xl md:text-4xl font-bold">
          Organización Electoral
        </h2>

        {/* descripción */}
        <p className="mt-4 text-gray-600 max-w-2xl mx-auto">
          El Consejo Nacional Electoral (CNE) y la Registraduría Nacional del Estado Civil (RNEC) trabajan conjuntamente para asegurar la transparencia y legitimidad de cada voto en el territorio colombiano.
        </p>

        <p className="mt-4 text-gray-600 max-w-2xl mx-auto">
          A través de <b>sello legítimo</b>, se implementa una supervisión técnica rigurosa que garantiza que la voluntad popular sea respetada y protegidabajo los más altos estándares internacionales de integridad electoral.
        </p>
        
      </div>
    </section>
  )
}