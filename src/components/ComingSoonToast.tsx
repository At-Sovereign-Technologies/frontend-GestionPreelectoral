import { useEffect } from "react"
import { X } from "lucide-react"

interface ComingSoonToastProps {
  isVisible: boolean
  onClose: () => void
  message?: string
  duration?: number
}

export default function ComingSoonToast({
  isVisible,
  onClose,
  message = "Esta función estará disponible próximamente.",
  duration = 3500,
}: ComingSoonToastProps) {
  useEffect(() => {
    if (!isVisible) return
    const timer = setTimeout(onClose, duration)
    return () => clearTimeout(timer)
  }, [isVisible, onClose, duration])

  if (!isVisible) return null

  return (
    <div className="fixed bottom-6 right-6 z-50 animate-slide-up">
      <div className="flex items-center gap-3 bg-white border rounded-lg shadow-lg px-5 py-3 text-sm text-gray-700">
        <span>{message}</span>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-700 transition ml-2"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  )
}