'use client'

import { createContext, useContext } from 'react'
import { useUser, useClerk } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'

type AuthUser = {
  id: string
  email: string | undefined
  user_metadata: {
    full_name: string | null
    nickname: string | null
    avatar_url: string | null
  }
}

type AuthContextType = {
  user: AuthUser | null
  loading: boolean
  error: Error | null
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  error: null,
  signOut: async () => { },
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { user: clerkUser, isLoaded } = useUser()
  const { signOut: clerkSignOut } = useClerk()
  const router = useRouter()

  // Map Clerk user to our AuthUser shape so existing consumers don't break
  const user: AuthUser | null = clerkUser
    ? {
      id: clerkUser.id,
      email: clerkUser.primaryEmailAddress?.emailAddress,
      user_metadata: {
        full_name: clerkUser.fullName,
        nickname: clerkUser.username,
        avatar_url: clerkUser.imageUrl,
      },
    }
    : null

  const signOut = async () => {
    await clerkSignOut()
    router.push('/')
  }

  return (
    <AuthContext.Provider value={{ user, loading: !isLoaded, error: null, signOut }}>
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