import type React from "react"
import type { Metadata, Viewport } from "next"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"

import "./globals.css"
import "./styles/paper.css"
import { ClerkProvider } from '@clerk/nextjs'
import { AuthProvider } from '@/contexts/auth-context'
import { NotificationProvider } from '@/contexts/notification-context'

import { ThemeProvider } from "@/components/theme-provider"
import { paperFontVars } from "./styles/paper-fonts"
import { SiteNav } from "./components/site-nav"
import { Heartbeat } from "./components/heartbeat"
import 'leaflet/dist/leaflet.css'
import { ReactQueryProvider } from "./providers"

export const metadata: Metadata = {
  title: "FlightTrack - Track Your Flight History",
  description: "Keep track of your flights, visualize your travels, and gain insights into your journey.",
  generator: 'v0.dev'
}

// Next emits this as the page's only viewport tag. Pinch-zoom stays enabled
// (WCAG 1.4.4); viewport-fit=cover lets env(safe-area-inset-*) apply on notched phones.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <ClerkProvider>

      <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable} ${paperFontVars}`} suppressHydrationWarning style={{ colorScheme: 'light' }}>
        <body className="bg-background text-foreground">
          <Heartbeat>
            <AuthProvider>
              <NotificationProvider>
                <div suppressHydrationWarning>
                  <ThemeProvider
                    attribute="class"
                    defaultTheme="light"
                    enableSystem={false}
                    forcedTheme="light"
                    disableTransitionOnChange
                  >
                    <ReactQueryProvider>
                      <div className="flex min-h-screen flex-col">
                        <SiteNav />
                        <div className="flex-1">{children}</div>
                      </div>
                    </ReactQueryProvider>
                  </ThemeProvider>
                </div>
              </NotificationProvider>
            </AuthProvider>
          </Heartbeat>
        </body>
      </html>

    </ClerkProvider>
  )
}