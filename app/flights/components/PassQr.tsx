"use client"

import { useEffect, useState } from "react"

import s from "./boarding-pass.module.css"

/**
 * The code on the back that does something when a phone is pointed at it.
 *
 * The stub's PDF417 is the pass's own code: it decodes to the booking record,
 * which is what an airline prints, but a plain camera app will not act on it.
 * This one holds the address of the leg in this app, so a camera opens the
 * flight on the phone.
 *
 * The address is read off the page rather than configured, so it is right on a
 * laptop, on a preview build and on the live site without anything to keep in
 * step. That can only be read in the browser, so the symbol appears once the
 * page is running rather than on the server.
 */
export default function PassQr({ flightId }: { flightId: string | number }) {
  const [modules, setModules] = useState<boolean[][] | null>(null)

  useEffect(() => {
    let live = true

    import("qrcode-generator").then(({ default: qrcode }) => {
      if (!live) return
      // Type 0 lets the encoder pick the smallest symbol that fits, and level M
      // carries enough redundancy for a screen without spending modules that
      // would make each one smaller — and harder to read — at this size.
      const code = qrcode(0, "M")
      code.addData(`${window.location.origin}/flights/${flightId}`)
      code.make()

      const count = code.getModuleCount()
      setModules(
        Array.from({ length: count }, (_, row) =>
          Array.from({ length: count }, (_, column) => code.isDark(row, column))
        )
      )
    })

    return () => {
      live = false
    }
  }, [flightId])

  if (!modules) return null

  const count = modules.length
  // The format asks for four clear modules around the symbol, and it means it:
  // with a caption sitting beside it and a dashed rule nearby, a narrower
  // margin left readers unable to find the symbol's edges at all.
  const quiet = 4
  const box = count + quiet * 2

  // Drawn rather than rasterised: the symbol is sharp at whatever size the card
  // gives it, which is the thing a camera needs most.
  return (
    <figure className={s.qr}>
      <svg viewBox={`${-quiet} ${-quiet} ${box} ${box}`} role="img" aria-label="Opens this flight">
        <rect x={-quiet} y={-quiet} width={box} height={box} fill="#ffffff" />
        {modules.map((row, y) =>
          row.map((dark, x) =>
            dark ? <rect key={`${x}-${y}`} x={x} y={y} width={1.02} height={1.02} /> : null
          )
        )}
      </svg>
      <figcaption>Scan to open this flight</figcaption>
    </figure>
  )
}
