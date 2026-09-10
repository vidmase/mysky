"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import { UserMenu } from "@/components/user-menu"

/**
 * The masthead used by the paper-stock surfaces. The landing page inlines its
 * own copy (it is a fully self-contained poster); every other paper page —
 * the logbook, the atlas — renders this one instead of <MainNav />, whose dark
 * app chrome would sit badly on the warm stock.
 *
 * Styling lives in app/styles/paper.css as global `paper-*` classes so the nav
 * looks identical on every surface without each page's module restating it.
 */
const LINKS = [
  { label: "Log", href: "/flights" },
  { label: "Atlas", href: "/map" },
  { label: "Numbers", href: "/stats" },
  { label: "Delays", href: "/delays" },
  { label: "Month", href: "/calendar" },
  { label: "Ask", href: "/chat" },
]

export function PaperNav({ className }: { className?: string }) {
  const pathname = usePathname()

  return (
    <nav className={`paper-nav ${className ?? ""}`}>
      <Link href="/" className="paper-brand" aria-label="MySky, home">
        <span className="paper-brandmark">
          My<em>Sky</em>
        </span>
      </Link>

      <div className="paper-navlinks">
        {LINKS.map((item) => {
          const active = pathname === item.href || !!pathname?.startsWith(`${item.href}/`)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`paper-navlink ${active ? "paper-navlink-active" : ""}`}
              aria-current={active ? "page" : undefined}
            >
              {item.label}
            </Link>
          )
        })}

        <Link href="/add-flight" className="paper-navcta">
          File a flight
        </Link>

        <span className="paper-navuser">
          <UserMenu />
        </span>
      </div>
    </nav>
  )
}
