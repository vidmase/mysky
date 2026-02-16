"use client"

import { useUser } from "@clerk/nextjs"
import { useRouter } from "next/navigation"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { useAuth } from "@/contexts/auth-context"

const ProfilePage = () => {
  const router = useRouter()
  const { user: clerkUser, isLoaded } = useUser()
  const { signOut } = useAuth()

  const fullName = clerkUser?.fullName || null
  const nickname = clerkUser?.username || null
  const email = clerkUser?.primaryEmailAddress?.emailAddress || null
  const avatarUrl = clerkUser?.imageUrl || null

  const initials = fullName
    ? fullName
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
    : email?.[0].toUpperCase() || "U"

  if (!isLoaded) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Skeleton className="h-20 w-20 rounded-full mb-4" />
        <Skeleton className="h-6 w-40 mb-2" />
        <Skeleton className="h-4 w-32" />
      </div>
    )
  }

  if (!clerkUser) {
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
          {avatarUrl && <AvatarImage src={avatarUrl} alt={fullName || "User"} />}
          <AvatarFallback className="bg-flight/10 text-flight text-3xl">{initials}</AvatarFallback>
        </Avatar>
        <h1 className="text-2xl font-bold mb-1 text-foreground">{fullName || "User"}</h1>
        <div className="text-flight text-sm mb-1">{nickname && <span>@{nickname}</span>}</div>
        <div className="text-muted-foreground text-sm mb-6">{email}</div>
        <Button
          variant="destructive"
          className="w-full"
          onClick={signOut}
          aria-label="Sign out"
        >
          Sign Out
        </Button>
      </div>
    </div>
  )
}

export default ProfilePage