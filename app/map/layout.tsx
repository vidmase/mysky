import type { ReactNode } from 'react'

/* The atlas is printed on the same press as the landing page and the logbook. The palette is
   app-wide; `paper-stock` adds the grain and the printed-surface treatment. */
export default function MapLayout({ children }: { children: ReactNode }) {
  return <div className="paper-stock">{children}</div>
}
