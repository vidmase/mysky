"use client"

import { useState, useEffect } from "react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { LogOut, User } from "lucide-react"
import { useRouter } from "next/navigation"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Skeleton } from "@/components/ui/skeleton"
import { UserManagement } from "../src/components/user-management/UserManagement"

export function UserMenu() {
  const router = useRouter()
  const supabase = createClientComponentClient()
  const [userData, setUserData] = useState<{
    full_name: string | null
    nickname: string | null
    email: string | null
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [showUserManagement, setShowUserManagement] = useState(false)

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
      <Button variant="ghost" className="relative h-10 w-10 rounded-full" disabled>
        <Skeleton className="h-10 w-10 rounded-full" />
      </Button>
    )
  }

  if (!userData) {
    return (
      <Button
        asChild
        variant="default"
        className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white font-medium px-4 py-2 rounded-full shadow-md hover:shadow-lg transition-all duration-300 animate-pulse-subtle"
        aria-label="Sign In"
        tabIndex={0}
      >
        <a href="/auth" className="flex items-center gap-1">Sign In</a>
      </Button>
    )
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="relative h-10 w-10 rounded-full" aria-label="User menu" tabIndex={0}>
            <Avatar className="h-10 w-10">
              <AvatarFallback className="bg-flight/10 text-flight">
                {initials}
              </AvatarFallback>
            </Avatar>
            <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-background bg-emerald-500" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-64" align="end" forceMount>
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-1">
              <p className="text-base font-semibold leading-none text-foreground">{userData.full_name || "User"}</p>
              <p className="text-xs leading-none text-muted-foreground">
                {userData.nickname && <span className="text-flight">@{userData.nickname}</span>}
                {userData.nickname && userData.email && " • "}
                {userData.email}
              </p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="cursor-pointer text-foreground hover:bg-flight/10 focus:bg-flight/10"
            onClick={() => router.push("/profile")}
            aria-label="Profile"
            tabIndex={0}
          >
            <User className="mr-2 h-4 w-4 text-flight" />
            <span>Profile</span>
          </DropdownMenuItem>
          <DropdownMenuItem
            className="cursor-pointer text-foreground hover:bg-flight/10 focus:bg-flight/10"
            onClick={() => setShowUserManagement(true)}
            aria-label="User Management"
            tabIndex={0}
          >
            <User className="mr-2 h-4 w-4 text-flight" />
            <span>User Management</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-red-600 cursor-pointer"
            onClick={handleSignOut}
            aria-label="Sign out"
            tabIndex={0}
          >
            <LogOut className="mr-2 h-4 w-4" />
            <span>Sign out</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      {showUserManagement && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="relative w-full max-w-4xl bg-background rounded-2xl shadow-2xl p-6 border border-flight">
            <button
              className="absolute top-4 right-4 text-2xl text-flight hover:text-red-500 focus:outline-none"
              aria-label="Close user management"
              tabIndex={0}
              onClick={() => setShowUserManagement(false)}
            >
              ×
            </button>
            <UserManagement />
          </div>
        </div>
      )}
    </>
  )
} 