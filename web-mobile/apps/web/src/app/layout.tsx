import './globals.css'
import type { ReactNode } from 'react'

export const metadata = {
  title: 'Web',
  description: 'Web app',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-white text-gray-900 antialiased">
        {children}
      </body>
    </html>
  )
}
