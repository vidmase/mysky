"use client"

import { usePathname } from "next/navigation"

import { PaperNav } from "./paper-nav"

/**
 * The app-wide masthead. The print surfaces render <PaperNav /> themselves,
 * inside their own shell, so the nav lines up with the page's measure; the
 * landing page inlines its own poster masthead. Everywhere else this puts the
 * same nav at the top of the page.
 */
const SELF_NAV_ROUTES = ["/", "/flights", "/map", "/stats", "/stats/review", "/calendar"]

/** Same, for routes with a dynamic segment. */
const SELF_NAV_PATTERNS = [/^\/flights\/[^/]+\/edit\/?$/]

function rendersOwnNav(pathname: string) {
  return SELF_NAV_ROUTES.includes(pathname) || SELF_NAV_PATTERNS.some((p) => p.test(pathname))
}

export function SiteNav() {
  const pathname = usePathname()

  if (pathname && rendersOwnNav(pathname)) return null

  return (
    <div className="paper-shell">
      <PaperNav />
    </div>
  )
}
