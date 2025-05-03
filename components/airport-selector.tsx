import * as React from "react"
import { Check, ChevronsUpDown, MapPin, Search } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Airport, searchAirports } from "@/lib/airports"
import { useDebounce } from "@/hooks/use-debounce"

interface AirportSelectorProps {
  value?: Airport
  onChange: (airport: Airport) => void
  placeholder?: string
  required?: boolean
  label?: string
}

export function AirportSelector({
  value,
  onChange,
  placeholder = "Select an airport...",
  required = false,
  label,
}: AirportSelectorProps) {
  const [open, setOpen] = React.useState(false)
  const [searchQuery, setSearchQuery] = React.useState("")
  const [suggestions, setSuggestions] = React.useState<Airport[]>([])
  const debouncedSearchQuery = useDebounce(searchQuery, 100)

  React.useEffect(() => {
    const results = searchAirports(debouncedSearchQuery)
    setSuggestions(results)
  }, [debouncedSearchQuery])

  const handleSelect = (airport: Airport) => {
    onChange(airport)
    setOpen(false)
    setSearchQuery("")
  }

  return (
    <div className="space-y-2">
      {label && (
        <label className="flex items-center text-sm font-medium">
          <MapPin className="h-4 w-4 mr-1 text-airport" />
          {label}
        </label>
      )}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
          >
            {value ? (
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-airport" />
                <span>{value.city} ({value.iata})</span>
              </div>
            ) : (
              <span className="text-muted-foreground">{placeholder}</span>
            )}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0" align="start">
          <Command shouldFilter={false}>
            <div className="flex items-center border-b px-3">
              <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
              <CommandInput 
                placeholder="Type city name or airport code..." 
                value={searchQuery}
                onValueChange={setSearchQuery}
                className="h-9"
              />
            </div>
            <CommandGroup className="max-h-[300px] overflow-auto">
              {suggestions.map((airport) => (
                <CommandItem
                  key={airport.iata}
                  value={airport.iata}
                  onSelect={() => handleSelect(airport)}
                  className="flex items-center gap-2 px-3 py-2 cursor-pointer"
                >
                  <Check
                    className={cn(
                      "h-4 w-4 shrink-0",
                      value?.iata === airport.iata ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{airport.city}</span>
                    <span className="text-sm text-muted-foreground">({airport.iata})</span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  )
} 