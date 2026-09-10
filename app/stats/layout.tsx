import type { ReactNode } from 'react'
import { Archivo, Bodoni_Moda, Martian_Mono } from 'next/font/google'

import '@/app/styles/paper.css'

/* Same press as the landing page, the logbook and the atlas. Loaded in a layout
   rather than page.tsx because that file is a Client Component. */
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

export default function StatsLayout({ children }: { children: ReactNode }) {
  return (
    <div className={`paper-stock ${display.variable} ${body.variable} ${code.variable}`}>
      {children}
    </div>
  )
}
