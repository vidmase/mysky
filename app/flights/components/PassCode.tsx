"use client"

import { useEffect, useRef } from "react"

import s from "./boarding-pass.module.css"

/**
 * The stub's code, encoded rather than drawn.
 *
 * The payload is built upstream; this only puts it on a canvas as the PDF417
 * symbol a printed boarding pass carries, so a phone pointed at the card reads
 * the booking back.
 */
export default function PassCode({ payload, label }: { payload: string; label: string }) {
  const canvas = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    let live = true

    // The encoder reaches for a canvas and is wanted only once a pass is on
    // screen, so it is fetched in the browser rather than bundled into every
    // page that imports a pass.
    import("pdf417-generator").then(({ PDF417 }) => {
      // A squarer symbol spends its modules on rows rather than columns, which
      // is what a strip this narrow needs, and drawing it three times over the
      // size it is shown at leaves the bars sharp when the browser scales it.
      if (live && canvas.current) PDF417.draw(payload, canvas.current, 3, undefined, 3)
    })

    return () => {
      live = false
    }
  }, [payload])

  return <canvas ref={canvas} className={s.codeSymbol} role="img" aria-label={label} />
}
