import type React from "react"
import type { Metadata } from "next"
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <ClerkProvider>

      <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable} ${paperFontVars}`} suppressHydrationWarning style={{ colorScheme: 'light' }}>
        <head>
          {/* Add this to ensure proper mobile viewport */}
          <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        </head>
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