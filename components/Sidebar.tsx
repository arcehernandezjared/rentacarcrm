'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Car, LayoutDashboard, Users, FileText, BellRing, Settings, LogOut, Menu, X, CreditCard, BarChart3 } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'

const LINKS = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/vehiculos', label: 'Vehículos', icon: Car },
  { href: '/dashboard/clientes', label: 'Clientes', icon: Users },
  { href: '/dashboard/cotizaciones', label: 'Cotizaciones', icon: FileText },
  { href: '/dashboard/cobros', label: 'Cobros', icon: CreditCard },
  { href: '/dashboard/reportes', label: 'Reportes', icon: BarChart3 },
  { href: '/dashboard/seguimientos', label: 'Seguimientos', icon: BellRing },
  { href: '/dashboard/configuracion', label: 'Configuración', icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()
  const { profile, logout } = useAuth()
  const [open, setOpen] = useState(false)

  // Cierra el drawer al navegar
  useEffect(() => { setOpen(false) }, [pathname])

  return (
    <>
      {/* Barra superior solo en móvil */}
      <header className="md:hidden fixed top-0 inset-x-0 h-14 z-40 bg-sidebar text-white flex items-center justify-between px-4 shadow-md">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-orange-600 rounded-lg flex items-center justify-center flex-shrink-0">
            <Car className="w-4 h-4" />
          </div>
          <span className="font-bold text-sm">RentaCar CRM</span>
        </div>
        <button
          onClick={() => setOpen(true)}
          className="p-2 rounded-lg hover:bg-white/10 transition-colors"
          aria-label="Abrir menú"
        >
          <Menu className="w-5 h-5" />
        </button>
      </header>

      {/* Fondo oscuro al abrir el drawer */}
      {open && (
        <div
          className="md:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={[
          'fixed top-0 left-0 h-full w-64 bg-sidebar text-white flex flex-col z-50',
          'transition-transform duration-200 ease-in-out',
          open ? 'translate-x-0' : '-translate-x-full',
          'md:relative md:w-60 md:translate-x-0 md:h-screen md:flex-shrink-0',
        ].join(' ')}
      >
        <div className="flex items-center justify-between px-5 py-5 border-b border-white/10">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-orange-600 rounded-lg flex items-center justify-center flex-shrink-0">
              <Car className="w-4 h-4" />
            </div>
            <span className="font-bold text-lg">RentaCar CRM</span>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="md:hidden p-1.5 rounded-lg hover:bg-white/10 transition-colors"
            aria-label="Cerrar menú"
          >
            <X className="w-5 h-5 text-white/70" />
          </button>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {LINKS.map(({ href, label, icon: Icon }) => {
            const active = href === '/dashboard' ? pathname === href : pathname.startsWith(href)
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  active ? 'bg-orange-600 text-white' : 'text-stone-300 hover:bg-white/5'
                }`}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                {label}
              </Link>
            )
          })}
        </nav>

        <div className="px-3 py-4 border-t border-white/10">
          {profile && <p className="text-xs text-stone-400 px-3 mb-2 truncate">{profile.email}</p>}
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-stone-300 hover:bg-white/5 transition-colors"
          >
            <LogOut className="w-4 h-4 flex-shrink-0" />
            Cerrar sesión
          </button>
        </div>
      </aside>
    </>
  )
}
