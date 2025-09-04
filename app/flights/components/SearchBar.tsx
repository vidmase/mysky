"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { X, Search as SearchIcon } from "lucide-react"
import { parse } from "date-fns"
import { useDebounce } from "@/hooks/use-debounce"

export type SearchBarProps = {
  setSearchTerm: (v: string) => void
  setDateRange: (range: { from: Date; to: Date } | undefined) => void
}

// Try to parse common date formats. Returns a Date if valid; otherwise null
function tryParseDate(value: string): Date | null {
  const v = value.trim()
  if (!v) return null

  // Accept several common formats
  const formats = [
    "yyyy-MM-dd",
    "MM/dd/yyyy",
    "dd/MM/yyyy",
    "dd.MM.yyyy",
    "MMM d, yyyy",
  ]
  for (const fmt of formats) {
    try {
      const d = parse(v, fmt, new Date())
      if (!isNaN(d.getTime())) return d
    } catch {}
  }
  // Also attempt native Date parsing (as a last resort)
  const native = new Date(v)
  if (!isNaN(native.getTime())) return native
  return null
}

export function SearchBar({ setSearchTerm, setDateRange }: SearchBarProps) {
  const [value, setValue] = useState("")
  const debounced = useDebounce(value, 300)

  // Auto-apply search when user stops typing
  useEffect(() => {
    const trimmed = debounced.trim()
    if (trimmed === "") {
      setSearchTerm("")
      setDateRange(undefined)
      return
    }
    const asDate = tryParseDate(trimmed)
    if (asDate) {
      const start = new Date(asDate)
      start.setHours(0, 0, 0, 0)
      const end = new Date(asDate)
      end.setHours(23, 59, 59, 999)
      setDateRange({ from: start, to: end })
      setSearchTerm("")
    } else {
      setSearchTerm(trimmed)
      setDateRange(undefined)
    }
  }, [debounced, setSearchTerm, setDateRange])

  const clearAll = () => {
    setValue("")
    setSearchTerm("")
    setDateRange(undefined)
  }

  return (
    <div className="mb-4">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Type a reservation number or a date. Results update automatically"
            className="pl-9"
            aria-label="Search by reservation number or date"
          />
          <SearchIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        </div>
        <Button variant="ghost" onClick={clearAll} title="Clear" aria-label="Clear search" size="icon">
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

export default SearchBar
