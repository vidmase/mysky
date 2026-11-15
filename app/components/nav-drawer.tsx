"use client"

import { useEffect, useState, type ReactNode } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import * as Dialog from "@radix-ui/react-dialog"
import { Menu, X } from "lucide-react"

export type NavItem = { label: string; href: string }

/**
 * The narrow-screen menu for the paper mastheads. Below the masthead's
 * breakpoint the inline links are hidden, so this drawer is the only way to
 * reach them: every link the desktop nav shows must be passed in here.
 *
 * Styling lives in app/styles/paper.css (`paper-drawer*`). The toggle is
 * hidden by default; each masthead shows it at its own breakpoint via
 * `toggleClassName`.
 */
export function NavDrawer({
  links,
  toggleClassName,
  children,
}: {
  links: NavItem[]
  toggleClassName?: string
  /** Extra actions under the links (CTA, user menu). */
  children?: ReactNode
}) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  // Navigating by any other route (browser back, a child link) also closes it.
  useEffect(() => setOpen(false), [pathname])

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button
          type="button"
          className={`paper-navtoggle ${toggleClassName ?? ""}`}
          aria-label={open ? "Close menu" : "Open menu"}
        >
          {open ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
          <span>Menu</span>
        </button>
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className="paper-drawer-overlay" />
        <Dialog.Content className="paper-drawer" aria-describedby={undefined}>
          <div className="paper-drawer-head">
            <Dialog.Title className="paper-tag">Menu</Dialog.Title>
            <Dialog.Close className="paper-drawer-close" aria-label="Close menu">
              <X aria-hidden="true" />
            </Dialog.Close>
          </div>

          <nav className="paper-drawer-links" aria-label="Main">
            {links.map((item) => {
              const active = pathname === item.href || !!pathname?.startsWith(`${item.href}/`)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`paper-drawer-link ${active ? "paper-drawer-link-active" : ""}`}
                  aria-current={active ? "page" : undefined}
                  onClick={() => setOpen(false)}
                >
                  {item.label}
                </Link>
              )
            })}
          </nav>

          {children && <div className="paper-drawer-actions">{children}</div>}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
