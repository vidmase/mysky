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

export function UserMenu() {
  const router = useRouter()
  const supabase = createClientComponentClient()
  const [userData, setUserData] = useState<{
    full_name: string | null
    nickname: string | null
    email: string | null
  } | null>(null)

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
    }
    fetchUserData()
  }, [supabase.auth])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push("/auth")
  }

  if (!userData) return null

  const initials = userData.full_name
    ? userData.full_name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
    : userData.email?.[0].toUpperCase() || "U"

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-10 w-10 rounded-full">
          <Avatar className="h-10 w-10">
            <AvatarFallback className="bg-flight/10 text-flight">
              {initials}
            </AvatarFallback>
          </Avatar>
          <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-background bg-emerald-500" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{userData.full_name || "User"}</p>
            <p className="text-xs leading-none text-muted-foreground">
              {userData.nickname && <span className="text-flight">@{userData.nickname}</span>}
              {userData.nickname && userData.email && " • "}
              {userData.email}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="text-red-600 cursor-pointer"
          onClick={handleSignOut}
        >
          <LogOut className="mr-2 h-4 w-4" />
          <span>Sign out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
} 