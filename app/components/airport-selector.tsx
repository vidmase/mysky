import { useEffect, useState } from 'react'
import { Check, ChevronsUpDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
} from "@/components/ui/command"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { Airport, europeanAirports } from '@/lib/airports'
import { getCachedAirports, setCachedAirports } from '@/lib/cache'

interface AirportSelectorProps {
    value?: Airport
    onChange: (airport: Airport) => void
    label?: string
    required?: boolean
}

export function AirportSelector({ value, onChange, label = "Select airport", required = false }: AirportSelectorProps) {
    const [open, setOpen] = useState(false)
    const [airports, setAirports] = useState<Airport[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const loadAirports = async () => {
            try {
                // Try to get airports from cache first
                const cachedAirports = getCachedAirports()
                if (cachedAirports) {
                    setAirports(cachedAirports)
                    setLoading(false)
                    return
                }

                // If not in cache, use the imported airports data
                setAirports(europeanAirports)
                // Cache the airports for future use
                setCachedAirports(europeanAirports)
            } catch (error) {
                console.error('Error loading airports:', error)
                // Fallback to imported data if cache fails
                setAirports(europeanAirports)
            } finally {
                setLoading(false)
            }
        }

        loadAirports()
    }, [])

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className="w-full justify-between"
                >
                    {value
                        ? `${value.name} (${value.iata})`
                        : label}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-full p-0">
                <Command>
                    <CommandInput placeholder="Search airports..." />
                    <CommandEmpty>No airport found.</CommandEmpty>
                    <CommandGroup className="max-h-64 overflow-auto">
                        {airports.map((airport) => (
                            <CommandItem
                                key={airport.iata}
                                value={airport.iata}
                                onSelect={() => {
                                    onChange(airport)
                                    setOpen(false)
                                }}
                            >
                                <Check
                                    className={cn(
                                        "mr-2 h-4 w-4",
                                        value?.iata === airport.iata ? "opacity-100" : "opacity-0"
                                    )}
                                />
                                {airport.name} ({airport.iata})
                            </CommandItem>
                        ))}
                    </CommandGroup>
                </Command>
            </PopoverContent>
        </Popover>
    )
} 