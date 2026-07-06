'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Sidebar } from '@/components/Sidebar'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()

  useEffect(() => {
    fetch('/api/auth/me').then(res => { if (!res.ok) router.replace('/login') })
  }, [router])

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar />
      {/* pt-14 compensa la barra fija en móvil; en desktop la barra no existe */}
      <main className="flex-1 overflow-y-auto pt-14 md:pt-0">{children}</main>
    </div>
  )
}
