"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { BarChart3, Home, List, MapPin, PlaneTakeoff, Plus, Menu, X, CreditCard, MessageCircle } from "lucide-react"
import { useState } from "react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { UserMenu } from "@/components/user-menu"
import { useAuth } from "@/contexts/auth-context"
import { Skeleton } from "@/components/ui/skeleton"

export function MainNav() {
  const pathname = usePathname()
  const { user, loading, signOut } = useAuth()
  const [isOpen, setIsOpen] = useState(false)

  const navItems = [
    {
      name: "Home",
      href: "/",
      icon: Home,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      name: "Add Flight",
      href: "/add-flight",
      icon: Plus,
      color: "text-flight",
      bgColor: "bg-flight/10",
    },
    {
      name: "Flights",
      href: "/flights",
      icon: List,
      color: "text-flight",
      bgColor: "bg-flight/10",
    },
    {
      name: "Map",
      href: "/map",
      icon: MapPin,
      color: "text-airport",
      bgColor: "bg-airport/10",
    },
    {
      name: "Stats",
      href: "/stats",
      icon: BarChart3,
      color: "text-stats",
      bgColor: "bg-stats/10",
    },
    {
      name: "Chat",
      href: "/chat",
      icon: MessageCircle,
      color: "text-purple-400",
      bgColor: "bg-purple-400/10",
    },
    {
      name: "Pricing",
      href: "/pricing",
      icon: CreditCard,
      color: "text-flight",
      bgColor: "bg-flight/10",
    },
  ]

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-md">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center">
          <Link href="/" className="flex items-center gap-2 font-bold">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-gradient-airline text-white">
              <PlaneTakeoff className="h-4 w-4" />
            </div>
            <span className="hidden sm:inline-block text-white">FlightsTrack</span>
          </Link>
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center space-x-1">
          {navItems.map((item) => (
            <Button
              key={item.href}
              variant={pathname === item.href ? "default" : "ghost"}
              size="sm"
              asChild
              className={cn("gap-2", pathname === item.href ? "" : `hover:${item.bgColor} hover:${item.color}`)}
            >
              <Link href={item.href} className="flex items-center">
                <item.icon className={cn("h-4 w-4", pathname === item.href ? "" : item.color)} />
                <span>{item.name}</span>
              </Link>
            </Button>
          ))}
          <div className="ml-2">
            <UserMenu />
          </div>
        </nav>

        {/* Mobile Navigation */}
        <div className="md:hidden flex items-center gap-2">
          <UserMenu />
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[250px] sm:w-[300px]">
              <div className="flex flex-col gap-6 py-4">
                <div className="flex items-center justify-between">
                  <Link href="/" className="flex items-center gap-2 font-bold" onClick={() => setIsOpen(false)}>
                    <div className="flex h-8 w-8 items-center justify-center rounded-md bg-gradient-airline text-white">
                      <PlaneTakeoff className="h-4 w-4" />
                    </div>
                    <span>FlightTrack</span>
                  </Link>
                  <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)}>
                    <X className="h-5 w-5" />
                    <span className="sr-only">Close</span>
                  </Button>
                </div>
                <nav className="flex flex-col space-y-3">
                  {navItems.map((item) => (
                    <Button
                      key={item.href}
                      variant={pathname === item.href ? "default" : "ghost"}
                      size="sm"
                      asChild
                      className={cn(
                        "justify-start gap-2 px-2",
                        pathname === item.href ? "" : `hover:${item.bgColor} hover:${item.color}`,
                      )}
                      onClick={() => setIsOpen(false)}
                    >
                      <Link href={item.href} className="flex items-center">
                        <item.icon className={cn("h-5 w-5 mr-2", pathname === item.href ? "" : item.color)} />
                        <span>{item.name}</span>
                      </Link>
                    </Button>
                  ))}
                </nav>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  )
}

