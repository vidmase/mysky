"use client"

import { SignIn, SignUp } from '@clerk/nextjs'
import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

import s from "./auth.module.css"

/**
 * Clerk ships its own chrome — a titled card, a bordered box, a footer band.
 * All of that is switched off here so the form sits inside the boarding pass
 * rather than in a second card of its own; what is left is styled to the
 * printed palette. `!` is needed on the resets because Clerk's own rules land
 * at the same specificity.
 */
const clerkAppearance = {
  layout: {
    socialButtonsPlacement: 'bottom' as const,
    socialButtonsVariant: 'blockButton' as const,
  },
  variables: {
    colorPrimary: '#ce3b1e',
    colorText: '#17130e',
    colorTextSecondary: '#5b5142',
    colorBackground: 'transparent',
    colorInputBackground: '#f2ece1',
    colorInputText: '#17130e',
    colorDanger: '#a32c14',
    // Nothing in the print aesthetic is rounded.
    borderRadius: '0',
    fontFamily: 'var(--body)',
  },
  elements: {
    rootBox: 'w-full',
    cardBox: '!w-full !max-w-none !shadow-none !border-0 !bg-transparent !rounded-none',
    card: '!bg-transparent !shadow-none !border-0 !rounded-none !w-full !p-0 !gap-5',
    // The pass supplies its own title, so Clerk's would be a second one.
    header: 'hidden',
    main: '!gap-5',

    formFieldLabel:
      'font-[family-name:var(--code)] text-[0.5rem] font-semibold uppercase tracking-[0.2em] text-[var(--ink-3)]',
    formFieldInput:
      '!rounded-none !bg-[var(--paper)] !border !border-[var(--rule-strong)] !text-[var(--ink)] !shadow-none px-3 py-2.5 focus:!border-[var(--vermillion)] focus:!ring-1 focus:!ring-[var(--vermillion)]',
    formFieldInputShowPasswordButton: 'text-[var(--ink-3)] hover:text-[var(--ink)]',
    formButtonPrimary:
      '!rounded-none !bg-[var(--ink)] !text-[var(--paper)] !shadow-none !border-0 !py-3 font-[family-name:var(--code)] !text-[0.5625rem] !font-bold uppercase !tracking-[0.2em] after:!hidden hover:!bg-[var(--vermillion)] transition-colors duration-300',
    formResendCodeLink: 'text-[var(--vermillion)] hover:text-[var(--vermillion-dk)]',

    dividerRow: '!my-1',
    dividerLine: '!bg-[var(--rule)]',
    dividerText:
      'font-[family-name:var(--code)] text-[0.5rem] font-semibold uppercase tracking-[0.2em] text-[var(--ink-3)]',

    socialButtons: '!gap-2',
    socialButtonsBlockButton:
      '!rounded-none !bg-[var(--paper)] !border !border-[var(--rule-strong)] !shadow-none hover:!bg-[var(--paper-2)] !py-2.5 transition-colors duration-300',
    socialButtonsBlockButtonText:
      'font-[family-name:var(--code)] !text-[0.5625rem] !font-bold uppercase !tracking-[0.16em] !text-[var(--ink)]',
    socialButtonsIconButton:
      '!rounded-none !bg-[var(--paper)] !border !border-[var(--rule-strong)] hover:!bg-[var(--paper-2)]',

    // The dark band in Clerk's default footer is what broke the page: it is
    // reset to paper so the card ends on the perforation, not on a black slab.
    footer: '!bg-transparent !bg-none !border-0 !shadow-none !p-0 !mt-1',
    footerAction: '!bg-transparent !border-0 !p-0',
    footerActionText: 'text-[0.75rem] text-[var(--ink-3)]',
    footerActionLink:
      'text-[0.75rem] font-semibold text-[var(--vermillion)] hover:text-[var(--vermillion-dk)]',

    identityPreview: '!rounded-none !bg-[var(--paper)] !border !border-[var(--rule)]',
    identityPreviewText: 'text-[var(--ink-2)]',
    identityPreviewEditButton: 'text-[var(--vermillion)]',
    otpCodeFieldInput:
      '!rounded-none !border !border-[var(--rule-strong)] !bg-[var(--paper)] !text-[var(--ink)]',
    alert:
      '!rounded-none !bg-[var(--wash-accent)] !border !border-[color-mix(in_srgb,var(--vermillion)_30%,transparent)]',
    alertText: 'text-[var(--vermillion-dk)]',
    formFieldErrorText: 'text-[var(--vermillion-dk)] text-[0.75rem]',
  },
}

/** Decorative only — a real code would encode something. */
const BARS = [10, 4, 7, 3, 9, 4, 5, 8, 3, 6, 10, 4, 7]

function AuthPageInner() {
  const searchParams = useSearchParams()
  const defaultTab = searchParams?.get('mode') === 'sign-up' ? 'sign-up' : 'sign-in'

  return (
    <div className={`paper-stock ${s.root}`}>
      <div className={s.sheet}>
        <Tabs defaultValue={defaultTab}>
          <div className={s.pass}>
            <div className={s.main}>
              <div className={s.masthead}>
                <span className={s.brandMark}>
                  My<em>Sky</em>
                </span>
                <span className={s.tag}>Flight Record</span>
              </div>

              <div className={s.counter}>
                <span>Check-in</span>
                <span>Counter 01</span>
              </div>

              <TabsList className={s.tabs}>
                <TabsTrigger value="sign-in" className={s.tab}>
                  Sign in
                </TabsTrigger>
                <TabsTrigger value="sign-up" className={s.tab}>
                  Create account
                </TabsTrigger>
              </TabsList>

              <div className={s.well}>
                <TabsContent value="sign-in" className="mt-0 focus-visible:outline-none">
                  <SignIn routing="hash" forceRedirectUrl="/flights" appearance={clerkAppearance} />
                </TabsContent>

                <TabsContent value="sign-up" className="mt-0 focus-visible:outline-none">
                  <SignUp routing="hash" forceRedirectUrl="/flights" appearance={clerkAppearance} />
                </TabsContent>
              </div>

              <p className={s.foot}>Your log · Your data · Export any time</p>
            </div>

            <aside className={s.stub} aria-hidden="true">
              <span className={`${s.notch} ${s.notchTop}`} />
              <svg
                className={s.stubPlane}
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
              >
                <path d="M2 12h14l4-5-1.6 5H22l-3 4h-4l-2 4-1-4H4z" />
              </svg>
              <span className={s.stubMark}>MySky</span>
              <span className={s.stubBars}>
                {BARS.map((w, i) => (
                  <span key={i} style={{ height: `${w / 5}px` }} />
                ))}
              </span>
              <span className={`${s.notch} ${s.notchBottom}`} />
            </aside>
          </div>
        </Tabs>

        <div className={s.accent} />

        <nav className={s.links}>
          <a href="/pricing" className={s.link}>Pricing</a>
          <a href="/" className={s.link}>Home</a>
          <a href="mailto:hello@mysky.app" className={s.link}>Contact</a>
        </nav>
      </div>
    </div>
  )
}

export default function AuthPage() {
  return (
    <Suspense
      fallback={
        <div className={`paper-stock ${s.root}`}>
          <span className={s.tag}>Opening the counter…</span>
        </div>
      }
    >
      <AuthPageInner />
    </Suspense>
  )
}
