import * as React from "react"
import { Check, User } from "lucide-react"

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
import { Label } from "@/components/ui/label"
import { Passenger, searchPassengers } from "@/lib/passengers"

interface PassengerSelectorProps {
  value?: Passenger
  onChange: (value: Passenger) => void
  label?: string
  required?: boolean
}

export function PassengerSelector({
  value,
  onChange,
  label = "Passenger",
  required = false,
}: PassengerSelectorProps) {
  const [open, setOpen] = React.useState(false)
  const [query, setQuery] = React.useState("")
  const passengers = searchPassengers(query)

  return (
    <div className="space-y-2">
      <Label className="flex items-center">
        <User className="h-4 w-4 mr-1 text-flight" />
        {label} {required && "*"}
      </Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
          >
            {value ? (
              <span>{value.title} {value.name}</span>
            ) : (
              <span className="text-muted-foreground">Select passenger...</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="paper-surface p-0" align="start">
          <Command>
            <CommandInput
              placeholder="Search passengers..."
              value={query}
              onValueChange={setQuery}
            />
            <CommandGroup>
              {passengers.map((passenger) => (
                <CommandItem
                  key={passenger.id}
                  value={passenger.name}
                  onSelect={() => {
                    onChange(passenger)
                    setOpen(false)
                  }}
                  className="cursor-pointer"
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value?.id === passenger.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {passenger.title} {passenger.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  )
} 