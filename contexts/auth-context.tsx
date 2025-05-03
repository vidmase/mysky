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
  const lastNotificationRef = useRef<string | null>(null)
  const router = useRouter()

  const showNotification = (message: string, type: 'success' | 'error') => {
    // Prevent duplicate notifications within 2 seconds
    const now = Date.now()
    if (lastNotificationRef.current === message) {
      return
    }
    lastNotificationRef.current = message
    setTimeout(() => {
      if (lastNotificationRef.current === message) {
        lastNotificationRef.current = null
      }
    }, 2000)

    if (type === 'success') {
      showSuccess(message)
    } else {
      showError(message)
    }
  }

  const createUserProfile = async (user: User) => {
    try {
      // Check if profile already exists
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (existingProfile) {
        return // Profile already exists
      }

      // Create new profile
      const { error: insertError } = await supabase
        .from('profiles')
        .insert([
          {
            id: user.id,
            username: user.email?.split('@')[0] || `user_${user.id.substring(0, 8)}`,
            email: user.email,
            full_name: user.user_metadata?.full_name || null,
            avatar_url: user.user_metadata?.avatar_url || null,
            updated_at: new Date().toISOString(),
          },
        ])

      if (insertError) {
        throw insertError
      }
    } catch (error) {
      console.error('Error creating user profile:', error)
      showNotification(
        'Failed to create user profile. Please update your profile information.',
        'error'
      )
    }
  }

  useEffect(() => {
    const getUser = async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser()
        if (error) throw error
        setUser(user)
        if (user) {
          await createUserProfile(user)
        }
      } catch (error) {
        setError(error instanceof Error ? error : new Error('An error occurred'))
        showNotification(
          error instanceof Error ? error.message : 'An error occurred during authentication',
          'error'
        )
      } finally {
        setLoading(false)
        initialLoadRef.current = false
      }
    }

    // Set up auth state listener
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const newUser = session?.user ?? null
      
      // Only update user and show notification if there's an actual change
      if (user?.id !== newUser?.id) {
        setUser(newUser)
        setLoading(false)

        if (!initialLoadRef.current) {
          if (newUser) {
            await createUserProfile(newUser)
            showNotification('Successfully signed in', 'success')
          } else if (user) {
            showNotification('Successfully signed out', 'success')
            router.push('/')
          }
        }
      }
    })

    getUser()

    return () => {
      subscription.unsubscribe()
    }
  }, [supabase.auth, showSuccess, showError, router, user])

  const signOut = async () => {
    try {
      await supabase.auth.signOut()
      setUser(null)
      localStorage.clear()
      sessionStorage.clear()
    } catch (error) {
      setError(error instanceof Error ? error : new Error('An error occurred during sign out'))
      showNotification(
        error instanceof Error ? error.message : 'An error occurred during sign out',
        'error'
      )
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