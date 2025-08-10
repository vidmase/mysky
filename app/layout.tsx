import type React from "react"
import type { Metadata } from "next"
import { Inter, Plus_Jakarta_Sans } from "next/font/google"
import "./globals.css"
import { AuthProvider } from '@/contexts/auth-context'
import { NotificationProvider } from '@/contexts/notification-context'

import { ThemeProvider } from "@/components/theme-provider"
import { MainNav } from "@/components/main-nav"
import { Heartbeat } from "./components/heartbeat"
import 'leaflet/dist/leaflet.css'
import "mapbox-gl/dist/mapbox-gl.css"
import { ReactQueryProvider } from "./providers"

const inter = Inter({ subsets: ["latin"] })
const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  display: 'swap',
  weight: ['300', '400', '500', '600'],
})

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
    <html lang="en" className={`dark`} suppressHydrationWarning style={{ colorScheme: 'dark' }}>
      <head>
        {/* Add this to ensure proper mobile viewport */}
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
      </head>
      <body className="font-jakarta font-light tracking-wide">
        <Heartbeat>
        <AuthProvider>
          <NotificationProvider>
            <div suppressHydrationWarning>
              <ThemeProvider 
                attribute="class" 
                defaultTheme="dark" 
                enableSystem={false} 
                forcedTheme="dark"
                disableTransitionOnChange
              >
                <ReactQueryProvider>
                  <div className="flex min-h-screen flex-col">
                    <MainNav />
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
  )
}

import './globals.css'