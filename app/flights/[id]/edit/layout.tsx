import type { ReactNode } from 'react'
import { Archivo, Bodoni_Moda, Martian_Mono } from 'next/font/google'

import '@/app/styles/paper.css'

/* Same press as the landing page, the logbook, the atlas and the numbers.
   Scoped to this route rather than all of /flights, because the flight detail
   page beneath it still wears the dark app theme and would break under the
   paper tokens. Loaded in a layout because page.tsx is a Client Component. */
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

export default function EditFlightLayout({ children }: { children: ReactNode }) {
  return (
    <div className={`paper-stock ${display.variable} ${body.variable} ${code.variable}`}>
      {children}
    </div>
  )
}
