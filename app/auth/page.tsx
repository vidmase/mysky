"use client"

import { useState } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useRouter } from 'next/navigation'
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PlaneTakeoff } from "lucide-react"

export default function AuthPage() {
  const router = useRouter()
  const supabase = createClientComponentClient()
  
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
      const { data, error } = await supabase.auth.signInWithPassword({
        email: signInEmail,
        password: signInPassword,
      })

      if (error) throw error

      if (data.user) {
        router.push('/flights')
      }
    } catch (error) {
      setSignInError(error instanceof Error ? error.message : 'Invalid email or password')
    } finally {
      setSignInLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center py-2">
      <div className="w-full max-w-md space-y-8 px-4">
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
                    <Label htmlFor="sign-in-email">Email</Label>
                    <Input
                      id="sign-in-email"
                      type="email"
                      placeholder="you@example.com"
                      value={signInEmail}
                      onChange={(e) => setSignInEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sign-in-password">Password</Label>
                    <Input
                      id="sign-in-password"
                      type="password"
                      value={signInPassword}
                      onChange={(e) => setSignInPassword(e.target.value)}
                      required
                    />
                  </div>
                  {signInError && (
                    <p className="text-sm text-red-500">{signInError}</p>
                  )}
                </CardContent>
                <CardFooter>
                  <Button type="submit" className="w-full bg-flight hover:bg-flight/90" disabled={signInLoading}>
                    {signInLoading ? 'Signing in...' : 'Sign In'}
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