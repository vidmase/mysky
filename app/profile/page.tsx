"use client"

import { useEffect, useState } from "react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { useRouter } from "next/navigation"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"

const ProfilePage = () => {
  const router = useRouter()
  const supabase = createClientComponentClient()
  const [userData, setUserData] = useState<{
    full_name: string | null
    nickname: string | null
    email: string | null
  } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchUserData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUserData({
          full_name: user.user_metadata.full_name || null,
          nickname: user.user_metadata.nickname || null,
          email: user.email || null,
        })
      }
      setLoading(false)
    }
    fetchUserData()
  }, [supabase.auth])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push("/auth")
  }

  const initials = userData?.full_name
    ? userData.full_name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
    : userData?.email?.[0].toUpperCase() || "U"

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Skeleton className="h-20 w-20 rounded-full mb-4" />
        <Skeleton className="h-6 w-40 mb-2" />
        <Skeleton className="h-4 w-32" />
      </div>
    )
  }

  if (!userData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <p className="text-lg text-muted-foreground mb-4">You are not signed in.</p>
        <Button onClick={() => router.push("/auth")}>Sign In</Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
      <div className="bg-background border border-flight rounded-2xl shadow-xl p-8 w-full max-w-md flex flex-col items-center">
        <Avatar className="h-20 w-20 mb-4">
          <AvatarFallback className="bg-flight/10 text-flight text-3xl">{initials}</AvatarFallback>
        </Avatar>
        <h1 className="text-2xl font-bold mb-1 text-foreground">{userData.full_name || "User"}</h1>
        <div className="text-flight text-sm mb-1">{userData.nickname && <span>@{userData.nickname}</span>}</div>
        <div className="text-muted-foreground text-sm mb-6">{userData.email}</div>
        <Button
          variant="destructive"
          className="w-full"
          onClick={handleSignOut}
          aria-label="Sign out"
        >
          Sign Out
        </Button>
      </div>
    </div>
  )
}

export default ProfilePage 