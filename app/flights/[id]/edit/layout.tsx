import type { ReactNode } from 'react'

/* Same press as the landing page, the logbook, the atlas and the numbers. The palette is
   app-wide; `paper-stock` adds the grain and the printed-surface treatment. */
export default function EditFlightLayout({ children }: { children: ReactNode }) {
  return <div className="paper-stock">{children}</div>
}
