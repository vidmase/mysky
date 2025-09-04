"use client"

import { useState, useEffect, Suspense } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useRouter, useSearchParams } from 'next/navigation'
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PlaneTakeoff, Clock, AlertTriangle } from "lucide-react"
import { toast } from 'sonner'
import { formatDistanceToNow, formatDistance } from 'date-fns'

function AuthPageInner() {
  const router = useRouter()
  const supabase = createClientComponentClient()
  const searchParams = useSearchParams()
  const [isDisabled, setIsDisabled] = useState(searchParams?.get('disabled') === '1')
  const [showReactivatedMessage, setShowReactivatedMessage] = useState(false)
  const [deactivationInfo, setDeactivationInfo] = useState<{
    endDate: Date | null;
    remainingTime: string | null;
  }>({ endDate: null, remainingTime: null })
  
  // Sign Up state
  const [signUpEmail, setSignUpEmail] = useState('')
  const [signUpPassword, setSignUpPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [nickname, setNickname] = useState('')
  const [signUpError, setSignUpError] = useState<string | null>(null)
  const [signUpLoading, setSignUpLoading] = useState(false)

  // Sign In state
  const [signInEmail, setSignInEmail] = useState('')
  const [signInPassword, setSignInPassword] = useState('')
  const [signInError, setSignInError] = useState<string | null>(null)
  const [signInLoading, setSignInLoading] = useState(false)

  // Function to format remaining time
  const formatRemainingTime = (endDate: string | null) => {
    if (!endDate) return null
    try {
      const end = new Date(endDate)
      const now = new Date()
      if (end <= now) return null
      return formatDistanceToNow(end, { addSuffix: true })
    } catch {
      return null
    }
  }

  // Effect to check deactivation status and set up timer
  useEffect(() => {
    if (!isDisabled) return

    const checkDeactivationStatus = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profile } = await supabase
        .from('profiles')
        .select('disabled, deactivation_end_date')
        .eq('id', user.id)
        .single()

      if (profile?.deactivation_end_date) {
        const remainingTime = formatRemainingTime(profile.deactivation_end_date)
        setDeactivationInfo({
          endDate: new Date(profile.deactivation_end_date),
          remainingTime
        })
      }
    }

    // Initial check
    checkDeactivationStatus()

    // Update countdown every minute
    const timer = setInterval(() => {
      checkDeactivationStatus()
    }, 10000) // Update every 10 seconds for smoother countdown

    return () => clearInterval(timer)
  }, [isDisabled, supabase])

  useEffect(() => {
    if (!isDisabled) return

    // Set up realtime subscription to watch for profile changes
    const subscription = supabase
      .channel('profile-status')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `disabled=eq.false`
        },
        async () => {
          // Check if this update applies to current user
          const { data: { user } } = await supabase.auth.getUser()
          if (!user) return

          const { data: profile } = await supabase
            .from('profiles')
            .select('disabled')
            .eq('id', user.id)
            .single()

          if (profile && !profile.disabled) {
            setIsDisabled(false)
            setShowReactivatedMessage(true)
            setDeactivationInfo({ endDate: null, remainingTime: null })
            // Show success message
            toast.success('Your account has been reactivated!', {
              description: 'You can now sign in to access your account.'
            })
            // Clear the disabled parameter from URL
            const newUrl = new URL(window.location.href)
            newUrl.searchParams.delete('disabled')
            window.history.replaceState({}, '', newUrl)
            // Hide reactivated message after 5 seconds
            setTimeout(() => {
              setShowReactivatedMessage(false)
            }, 5000)
          }
        }
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [supabase, isDisabled])

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setSignUpError(null)
    setSignUpLoading(true)

    try {
      const { data, error } = await supabase.auth.signUp({
        email: signUpEmail,
        password: signUpPassword,
        options: {
          data: {
            full_name: fullName,
            nickname: nickname,
          },
          emailRedirectTo: `${window.location.origin}/auth/callback`
        }
      })

      if (error) throw error

      if (data.user) {
        router.push('/flights')
      }
    } catch (error) {
      setSignUpError(error instanceof Error ? error.message : 'An error occurred during sign up')
    } finally {
      setSignUpLoading(false)
    }
  }

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setSignInError(null)
    setSignInLoading(true)

    try {
      // First attempt to sign in
      const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
        email: signInEmail,
        password: signInPassword,
      })

      if (signInError) {
        throw signInError
      }

      if (authData.user) {
        // After successful sign in, check if user is disabled
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('disabled')
          .eq('id', authData.user.id)
          .single()

        if (profileError) throw profileError

        if (profile?.disabled) {
          // If disabled, sign out and show error
          await supabase.auth.signOut()
          throw new Error('Your account has been disabled by an administrator. Please contact support.')
        }

        // If not disabled, proceed to dashboard
        router.push('/flights')
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Invalid email or password'
      setSignInError(errorMessage)
      
      if (error instanceof Error && error.message.includes('disabled')) {
        router.push('/auth?disabled=1')
      }
    } finally {
      setSignInLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center py-2">
      <div className="w-full max-w-md space-y-8 px-4">
        {isDisabled && (
          <div className="mb-4 p-4 rounded-xl bg-red-950/90 border border-red-800 text-red-100 shadow-lg animate-fade-in">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="h-5 w-5 text-red-400" />
              <span className="text-lg font-semibold">Account Disabled</span>
            </div>
            <div className="text-red-200">
              Your account has been disabled by an administrator.
              Please contact support if you believe this is a mistake.
            </div>
          </div>
        )}
        {showReactivatedMessage && (
          <div className="mb-4 p-4 rounded-xl bg-green-700/20 border border-green-600 text-green-200 text-center text-lg font-semibold shadow animate-fade-in">
            Your account has been reactivated! You can now sign in.
          </div>
        )}
        <div className="flex flex-col items-center space-y-2">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-airline">
            <PlaneTakeoff className="h-6 w-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold">Welcome to FlightTrack</h1>
          <p className="text-muted-foreground">Sign in to manage your flights</p>
        </div>

        <Card>
          <Tabs defaultValue="sign-in">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="sign-in">Sign In</TabsTrigger>
              <TabsTrigger value="sign-up">Sign Up</TabsTrigger>
            </TabsList>

            <TabsContent value="sign-in">
              <form onSubmit={handleSignIn}>
                <CardHeader>
                  <CardTitle>Sign In</CardTitle>
                  <CardDescription>Enter your email and password to sign in</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="Enter your email"
                      value={signInEmail}
                      onChange={(e) => setSignInEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="Enter your password"
                      value={signInPassword}
                      onChange={(e) => setSignInPassword(e.target.value)}
                      required
                    />
                  </div>
                  
                  {signInError && (
                    <div className="text-sm text-red-600">{signInError}</div>
                  )}
                </CardContent>
                <CardFooter>
                  <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={signInLoading}
                  >
                    {signInLoading ? 'Signing In...' : 'Sign In'}
                  </Button>
                </CardFooter>
              </form>
            </TabsContent>

            <TabsContent value="sign-up">
              <form onSubmit={handleSignUp}>
                <CardHeader>
                  <CardTitle>Create Account</CardTitle>
                  <CardDescription>Enter your details to create a new account</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="full-name">Full Name</Label>
                    <Input
                      id="full-name"
                      placeholder="John Doe"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="nickname">Nickname (Optional)</Label>
                    <Input
                      id="nickname"
                      placeholder="johndoe"
                      value={nickname}
                      onChange={(e) => setNickname(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sign-up-email">Email</Label>
                    <Input
                      id="sign-up-email"
                      type="email"
                      placeholder="you@example.com"
                      value={signUpEmail}
                      onChange={(e) => setSignUpEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sign-up-password">Password</Label>
                    <Input
                      id="sign-up-password"
                      type="password"
                      value={signUpPassword}
                      onChange={(e) => setSignUpPassword(e.target.value)}
                      required
                    />
                  </div>
                  {signUpError && (
                    <p className="text-sm text-red-500">{signUpError}</p>
                  )}
                </CardContent>
                <CardFooter>
                  <Button type="submit" className="w-full bg-flight hover:bg-flight/90" disabled={signUpLoading}>
                    {signUpLoading ? 'Creating account...' : 'Create Account'}
                  </Button>
                </CardFooter>
              </form>
            </TabsContent>
          </Tabs>
        </Card>
      </div>
    </div>
  )
}

export default function AuthPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Loading...</div>}>
      <AuthPageInner />
    </Suspense>
  )
}