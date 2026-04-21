import { useEffect, useRef, useState } from "react"
import { LogOut, ChevronDown } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { getDisplayInitial, getDisplayUsername, logout } from "../services/authService"

export default function UserMenu() {
  const navigate = useNavigate()
  const menuRef = useRef<HTMLDivElement | null>(null)
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  function handleLogout() {
    logout()
    setIsOpen(false)
    navigate("/login", { replace: true })
  }

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        className="flex items-center gap-2 rounded-full border border-gray-200 bg-white px-2 py-1 text-sm text-gray-700 transition hover:border-gray-300 hover:bg-gray-50"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-label="Abrir menú de usuario"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-200 text-sm font-semibold text-gray-700">
          {getDisplayInitial()}
        </span>
        <span className="hidden max-w-32 truncate text-sm font-medium md:block">
          {getDisplayUsername()}
        </span>
        <ChevronDown size={16} className={`text-gray-400 transition ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 z-20 mt-2 w-56 rounded-xl border border-gray-200 bg-white p-2 shadow-lg">
          <div className="border-b border-gray-100 px-3 py-2">
            <p className="truncate text-sm font-semibold text-gray-900">{getDisplayUsername()}</p>
            <p className="text-xs text-gray-500">Sesión autenticada</p>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="mt-2 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-red-600 transition hover:bg-red-50"
          >
            <LogOut size={16} />
            Cerrar sesión
          </button>
        </div>
      )}
    </div>
  )
}