'use client'

import { createContext, useContext, useEffect, useState, useRef } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import type { User } from '@supabase/auth-helpers-nextjs'
import { useNotification } from './notification-context'
import { useRouter } from 'next/navigation'

type AuthContextType = {
  user: User | null
  loading: boolean
  error: Error | null
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  error: null,
  signOut: async () => {},
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const supabase = createClientComponentClient()
  const { showSuccess, showError } = useNotification()
  const initialLoadRef = useRef(true)
  const router = useRouter()

  useEffect(() => {
    const getUser = async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser()
        if (error) throw error
        setUser(user)
      } catch (error) {
        setError(error instanceof Error ? error : new Error('An error occurred'))
        showError(error instanceof Error ? error.message : 'An error occurred during authentication')
      } finally {
        setLoading(false)
        initialLoadRef.current = false
      }
    }

    // Set up auth state listener
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const newUser = session?.user ?? null
      setUser(newUser)
      setLoading(false)
      
      // Only show notifications after initial load and when there's an actual change
      if (!initialLoadRef.current && user?.id !== newUser?.id) {
        if (newUser) {
          showSuccess('Successfully signed in')
        } else if (user) { // Only show sign out message if there was a previous user
          showSuccess('Successfully signed out')
          // Redirect to home page after logout
          router.push('/')
        }
      }
    })

    getUser()

    return () => {
      subscription.unsubscribe()
    }
  }, [supabase.auth, showSuccess, showError, router])

  const signOut = async () => {
    try {
      await supabase.auth.signOut()
      setUser(null)
      // Clear any local storage or session data if needed
      localStorage.clear()
      sessionStorage.clear()
      // Don't show success message here as it will be handled by the auth state change listener
    } catch (error) {
      setError(error instanceof Error ? error : new Error('An error occurred during sign out'))
      showError(error instanceof Error ? error.message : 'An error occurred during sign out')
    }
  }

  return (
    <AuthContext.Provider value={{ user, loading, error, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
} 