"use client"

import { SignIn, SignUp } from '@clerk/nextjs'
import { useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { PlaneTakeoff } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

function AuthPageInner() {
  const searchParams = useSearchParams()
  const defaultTab = searchParams?.get('mode') === 'sign-up' ? 'sign-up' : 'sign-in'

  // Common appearance props for both SignIn and SignUp
  const clerkAppearance = {
    layout: {
      socialButtonsPlacement: 'bottom' as const,
      socialButtonsVariant: 'iconButton' as const,
    },
    variables: {
      colorPrimary: '#ce3b1e', // vermillion
      colorText: '#17130e', // ink
      colorTextSecondary: '#5b5142', // ink-2
      colorBackground: 'transparent',
      colorInputBackground: '#f2ece1', // paper
      colorInputText: '#17130e',
      borderRadius: '0.5rem',
    },
    elements: {
      rootBox: 'w-full',
      card: 'bg-transparent shadow-none border-none w-full p-0',
      headerTitle: 'text-2xl font-bold text-[var(--ink)]',
      headerSubtitle: 'text-[var(--ink-2)]',
      socialButtonsBlockButton: 'bg-[var(--paper-2)] hover:bg-[var(--paper-3)] border border-[var(--rule)] text-[var(--ink)]',
      socialButtonsBlockButtonText: 'text-[var(--ink)] font-medium',
      socialButtonsIconButton: 'bg-[var(--paper-2)] hover:bg-[var(--paper-3)] border border-[var(--rule)] w-10 h-10',
      formFieldInput: 'bg-[var(--paper)] border-[var(--rule)] text-[var(--ink)] focus:border-[var(--vermillion)] focus:ring-[var(--vermillion)]',
      formButtonPrimary: 'bg-[var(--ink)] hover:bg-[var(--vermillion)] border-none shadow-none transition-all duration-300',
      footerActionLink: 'text-[var(--vermillion)] hover:text-[var(--vermillion-dk)] font-medium',
      identityPreviewText: 'text-[var(--ink-2)]',
      formFieldLabel: 'text-[var(--ink-2)]',
      dividerLine: 'bg-[var(--rule)]',
      dividerText: 'text-[var(--ink-3)]',
      alert: 'bg-[var(--wash-accent)] border-[color-mix(in_srgb,var(--vermillion)_30%,transparent)] text-[var(--vermillion-dk)]',
      alertText: 'text-[var(--vermillion-dk)]',
    },
  }

  return (
    <div className="paper-stock flex min-h-screen items-center justify-center p-4">
      <div className="relative z-10 w-full max-w-md">
        {/* Printed card */}
        <div className="overflow-hidden border border-[var(--rule-strong)] bg-[hsl(var(--card))] shadow-sm">
          <div className="p-8">
            <div className="mb-8 flex flex-col items-center space-y-4 text-center">
              <div className="flex h-16 w-16 items-center justify-center bg-[var(--ink)]">
                <PlaneTakeoff className="h-8 w-8 text-[var(--paper)]" />
              </div>
              <div>
                <h1 className="text-3xl font-bold tracking-tight text-[var(--ink)]">FlightTrack</h1>
                <p className="mt-2 text-[var(--ink-2)]">Your personal flight companion</p>
              </div>
            </div>

            <Tabs defaultValue={defaultTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2 bg-[var(--paper-2)] p-1 mb-8 border border-[var(--rule)]">
                <TabsTrigger
                  value="sign-in"
                  className="data-[state=active]:bg-[var(--ink)] data-[state=active]:text-[var(--paper)] transition-all duration-300"
                >
                  Sign In
                </TabsTrigger>
                <TabsTrigger
                  value="sign-up"
                  className="data-[state=active]:bg-[var(--ink)] data-[state=active]:text-[var(--paper)] transition-all duration-300"
                >
                  Sign Up
                </TabsTrigger>
              </TabsList>

              <div className="min-h-[400px]">
                <TabsContent value="sign-in" className="mt-0 focus-visible:outline-none">
                  <SignIn
                    routing="hash"
                    forceRedirectUrl="/flights"
                    appearance={clerkAppearance}
                  />
                </TabsContent>

                <TabsContent value="sign-up" className="mt-0 focus-visible:outline-none">
                  <SignUp
                    routing="hash"
                    forceRedirectUrl="/flights"
                    appearance={clerkAppearance}
                  />
                </TabsContent>
              </div>
            </Tabs>
          </div>

          {/* Bottom decorative bar */}
          <div className="h-2 w-full bg-[var(--vermillion)]" />
        </div>

        {/* Footer links */}
        <div className="mt-8 text-center text-sm text-[var(--ink-3)]">
          <div className="flex justify-center space-x-6">
            <a href="#" className="hover:text-[var(--vermillion)] transition-colors">Privacy</a>
            <a href="#" className="hover:text-[var(--vermillion)] transition-colors">Terms</a>
            <a href="#" className="hover:text-[var(--vermillion)] transition-colors">Contact</a>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function AuthPage() {
  return (
    <Suspense fallback={<div className="paper-stock flex min-h-screen items-center justify-center text-[var(--ink-2)]">Loading...</div>}>
      <AuthPageInner />
    </Suspense>
  )
}