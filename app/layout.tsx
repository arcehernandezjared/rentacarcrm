import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Toaster } from 'react-hot-toast'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'RentaCar CRM — Cotizaciones y seguimiento automático',
  description: 'Lee, clasifica y responde correos de tu rent a car: ventas, soporte, cobros y cotizaciones automáticas',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className={inter.className}>
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3000,
            style: { borderRadius: '10px', background: '#1c1917', color: '#fafaf9' },
            success: { iconTheme: { primary: '#22c55e', secondary: '#fafaf9' } },
            error: { iconTheme: { primary: '#ef4444', secondary: '#fafaf9' } },
          }}
        />
      </body>
    </html>
  )
}
