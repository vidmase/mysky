"use client"

import { useEffect, useState } from "react"
import { X, Search as SearchIcon } from "lucide-react"
import { parse } from "date-fns"
import { useDebounce } from "@/hooks/use-debounce"
import s from "@/app/flights/flights.module.css"

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
    <div className={s.filingHead}>
      <div className={s.search}>
        <SearchIcon className={s.searchIcon} />
        <input
          className={s.searchInput}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="A reservation number, an airport, a date — the page filters as you type"
          aria-label="Search by reservation number or date"
        />
        {value && (
          <button type="button" className={s.searchClear} onClick={clearAll} title="Clear" aria-label="Clear search">
            Clear
            <X className="h-3 w-3" />
          </button>
        )}
      </div>
    </div>
  )
}

export default SearchBar
