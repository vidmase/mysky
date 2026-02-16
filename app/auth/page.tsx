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
      colorPrimary: '#3b82f6', // blue-500
      colorText: '#f8fafc', // slate-50
      colorTextSecondary: '#94a3b8', // slate-400
      colorBackground: 'transparent',
      colorInputBackground: 'rgba(15, 23, 42, 0.5)', // slate-900/50
      colorInputText: '#f8fafc',
      borderRadius: '0.5rem',
    },
    elements: {
      rootBox: 'w-full',
      card: 'bg-transparent shadow-none border-none w-full p-0',
      headerTitle: 'text-2xl font-bold text-white',
      headerSubtitle: 'text-slate-400',
      socialButtonsBlockButton: 'bg-slate-800/50 hover:bg-slate-800 border border-slate-700 text-white',
      socialButtonsBlockButtonText: 'text-white font-medium',
      socialButtonsIconButton: 'bg-slate-800/50 hover:bg-slate-800 border border-slate-700 w-10 h-10',
      formFieldInput: 'bg-slate-900/50 border-slate-700 text-white focus:border-blue-500 focus:ring-blue-500',
      formButtonPrimary: 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 border-none shadow-lg shadow-blue-900/20 transition-all duration-300',
      footerActionLink: 'text-blue-400 hover:text-blue-300 font-medium',
      identityPreviewText: 'text-slate-300',
      formFieldLabel: 'text-slate-400',
      dividerLine: 'bg-slate-700',
      dividerText: 'text-slate-500',
      alert: 'bg-red-900/20 border-red-900 text-red-200',
      alertText: 'text-red-200',
    },
  }

  return (
    <div className="flex min-h-screen items-center justify-center aurora-bg p-4">
      <div className="relative z-10 w-full max-w-md">
        {/* Glassmorphism Card */}
        <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/20 backdrop-blur-xl shadow-2xl">
          <div className="p-8">
            <div className="mb-8 flex flex-col items-center space-y-4 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 shadow-lg shadow-blue-900/30">
                <PlaneTakeoff className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold tracking-tight text-white">FlightTrack</h1>
                <p className="mt-2 text-slate-400">Your personal flight companion</p>
              </div>
            </div>

            <Tabs defaultValue={defaultTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2 bg-black/40 p-1 mb-8 rounded-xl border border-white/5">
                <TabsTrigger
                  value="sign-in"
                  className="rounded-lg data-[state=active]:bg-white/10 data-[state=active]:text-white data-[state=active]:backdrop-blur-sm transition-all duration-300"
                >
                  Sign In
                </TabsTrigger>
                <TabsTrigger
                  value="sign-up"
                  className="rounded-lg data-[state=active]:bg-white/10 data-[state=active]:text-white data-[state=active]:backdrop-blur-sm transition-all duration-300"
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
          <div className="h-2 w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 opacity-80" />
        </div>

        {/* Footer links */}
        <div className="mt-8 text-center text-sm text-slate-500">
          <div className="flex justify-center space-x-6">
            <a href="#" className="hover:text-slate-400 transition-colors">Privacy</a>
            <a href="#" className="hover:text-slate-400 transition-colors">Terms</a>
            <a href="#" className="hover:text-slate-400 transition-colors">Contact</a>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function AuthPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center aurora-bg text-white">Loading...</div>}>
      <AuthPageInner />
    </Suspense>
  )
}