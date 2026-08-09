import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'SPOT - Sport Pitch Online Ticketing',
  description: 'Book sports venues online',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
