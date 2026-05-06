import { NavLink, useLocation } from "react-router-dom"
import { Users, FileText, Gavel } from "lucide-react"

const LINKS = [
  { to: "/censo/gestion", label: "Censo", icon: Users },
  { to: "/candidaturas/gestion", label: "Candidaturas", icon: FileText },
  { to: "/jurados/sorteo", label: "Jurados", icon: Gavel },
]

export default function AppNav() {
  const location = useLocation()

  return (
    <nav className="flex items-center gap-1 rounded-lg bg-gray-100 p-1">
      {LINKS.map((link) => {
        const isActive =
          link.to === "/jurados/sorteo"
            ? location.pathname.startsWith("/jurados")
            : location.pathname === link.to

        const Icon = link.icon
        return (
          <NavLink
            key={link.to}
            to={link.to}
            className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold transition ${
              isActive
                ? "bg-red-500 text-white shadow-sm"
                : "text-gray-600 hover:bg-white hover:text-gray-900"
            }`}
          >
            <Icon size={16} />
            {link.label}
          </NavLink>
        )
      })}
    </nav>
  )
}
