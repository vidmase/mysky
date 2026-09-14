"use client"

import * as React from "react"
import { Check, ChevronsUpDown, MapPin } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { searchAirports, type Airport } from "@/lib/airports"
import { useDebounce } from "@/hooks/use-debounce"

interface AirportCodeFieldProps {
  id?: string
  label: string
  value: string
  onChange: (iata: string) => void
  placeholder?: string
}

export function AirportCodeField({
  id,
  label,
  value,
  onChange,
  placeholder = "City or IATA",
}: AirportCodeFieldProps) {
  const [open, setOpen] = React.useState(false)
  const [query, setQuery] = React.useState("")
  const debounced = useDebounce(query, 120)
  const [suggestions, setSuggestions] = React.useState<Airport[]>([])

  React.useEffect(() => {
    setSuggestions(searchAirports(debounced || value).slice(0, 20))
  }, [debounced, value])

  const selected =
    suggestions.find((a) => a.iata.toUpperCase() === value.toUpperCase()) ||
    searchAirports(value).find((a) => a.iata.toUpperCase() === value.toUpperCase())

  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-sm font-medium text-[var(--ink-2)]">
        {label}
      </label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id={id}
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="h-10 w-full justify-between border-[var(--rule)] bg-[hsl(var(--card))] px-3 font-normal text-[var(--ink)] hover:bg-[hsl(var(--card))] hover:text-[var(--vermillion)]"
          >
            <span className="flex min-w-0 items-center gap-2 truncate">
              <MapPin className="h-3.5 w-3.5 shrink-0 text-[var(--vermillion)]" />
              {value ? (
                <span className="truncate">
                  <span className="font-semibold">{value}</span>
                  {selected ? (
                    <span className="text-[var(--ink-3)]"> · {selected.city}</span>
                  ) : null}
                </span>
              ) : (
                <span className="text-[var(--ink-3)]">{placeholder}</span>
              )}
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-[min(22rem,calc(100vw-2rem))] border-[var(--rule)] bg-[hsl(var(--card))] p-0"
          align="start"
        >
          <Command shouldFilter={false} className="bg-[hsl(var(--card))] text-[var(--ink)]">
            <CommandInput
              placeholder="Search city or code…"
              value={query}
              onValueChange={setQuery}
              className="text-[var(--ink)]"
            />
            <CommandList>
              <CommandEmpty className="py-4 text-sm text-[var(--ink-3)]">
                No airports found.
              </CommandEmpty>
              <CommandGroup>
                {suggestions.map((airport) => (
                  <CommandItem
                    key={`${airport.iata}-${airport.name}`}
                    value={airport.iata}
                    onSelect={() => {
                      onChange(airport.iata.toUpperCase())
                      setOpen(false)
                      setQuery("")
                    }}
                    className="aria-selected:bg-[hsl(var(--card))]"
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value.toUpperCase() === airport.iata.toUpperCase()
                          ? "opacity-100"
                          : "opacity-0"
                      )}
                    />
                    <span className="font-semibold tabular-nums">{airport.iata}</span>
                    <span className="ml-2 truncate text-[var(--ink-3)]">
                      {airport.city} — {airport.name}
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  )
}
