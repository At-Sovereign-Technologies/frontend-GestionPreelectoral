import AppNav from "./AppNav"
import UserMenu from "./UserMenu"

export default function PageHeader() {
  return (
    <header className="bg-white border-b px-8 py-3 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-red-500 rounded flex items-center justify-center">
          <span className="text-white text-xs font-bold">SL</span>
        </div>
        <div className="leading-tight">
          <p className="font-bold text-sm text-gray-900">Sello Legítimo</p>
          <p className="text-red-500 text-[10px] font-semibold tracking-wider">
            M2: GESTIÓN PRE-ELECTORAL
          </p>
        </div>
      </div>

      <div className="flex items-center gap-6">
        <AppNav />
        <UserMenu />
      </div>
    </header>
  )
}
