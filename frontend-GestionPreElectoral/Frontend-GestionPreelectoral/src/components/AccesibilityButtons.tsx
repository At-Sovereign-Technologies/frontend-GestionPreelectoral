import { useState } from "react"
import { Ear, Eye, Hand } from "lucide-react"
import ComingSoonToast from "./ComingSoonToast"

export default function AccessibilityButtons() {
  const [showToast, setShowToast] = useState(false)

  return (
    <>
      <div className="fixed left-4 top-1/2 -translate-y-1/2 flex flex-col gap-3 z-50">
        <button
          onClick={() => setShowToast(true)}
          className="w-12 h-12 bg-white text-black border rounded-xl flex items-center justify-center shadow-md hover:scale-105 transition"
        >
          <Ear size={20} />
        </button>
        <button
          onClick={() => setShowToast(true)}
          className="w-12 h-12 bg-white text-black border rounded-xl flex items-center justify-center shadow-md hover:scale-105 transition"
        >
          <Eye size={20} />
        </button>
      </div>

      <div className="fixed right-4 top-1/2 -translate-y-1/2 z-50">
        <button
          onClick={() => setShowToast(true)}
          className="w-14 h-14 bg-white text-black border rounded-2xl flex items-center justify-center shadow-md hover:scale-105 transition"
        >
          <Hand size={22} />
        </button>
      </div>

      <ComingSoonToast isVisible={showToast} onClose={() => setShowToast(false)} />
    </>
  )
}