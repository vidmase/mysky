import type { ReactNode } from 'react'
import { Archivo, Bodoni_Moda, Martian_Mono } from 'next/font/google'

import '@/app/styles/paper.css'

/* The atlas is printed on the same press as the landing page and the logbook.
   Loaded here rather than in page.tsx because that file is a Client Component. */
const display = Bodoni_Moda({
  subsets: ['latin'],
  style: ['normal', 'italic'],
  weight: ['400', '500', '700'],
  variable: '--font-display',
  display: 'swap',
})

const body = Archivo({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-body',
  display: 'swap',
})

const code = Martian_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-code',
  display: 'swap',
})

export default function MapLayout({ children }: { children: ReactNode }) {
  return (
    <div className={`paper-stock ${display.variable} ${body.variable} ${code.variable}`}>
      {children}
    </div>
  )
}
