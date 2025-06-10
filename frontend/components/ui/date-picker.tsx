"use client"

import React from "react"
import { format } from "date-fns"
import { CalendarIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"

interface DatePickerProps extends React.HTMLAttributes<HTMLDivElement> {
  date: Date | undefined
  onDateChange: (date: Date | undefined) => void
}

export function DatePicker({ className, date, onDateChange, ...props }: DatePickerProps) {
  const [open, setOpen] = React.useState(false)

  return (
    <div className={cn("grid gap-2", className)} {...props}>
      <Button
        variant={"outline"}
        className={cn("w-full justify-start text-left font-normal", !date && "text-muted-foreground")}
        onClick={() => setOpen(!open)}
      >
        <CalendarIcon className="mr-2 h-4 w-4" />
        {date ? format(date, "PPP") : <span>Pick a date</span>}
      </Button>
      {open && (
        <div className="absolute z-50 mt-2 rounded-md border bg-background shadow-md">
          <Calendar
            mode="single"
            selected={date}
            onSelect={(date) => {
              onDateChange(date)
              setOpen(false)
            }}
            initialFocus
          />
        </div>
      )}
    </div>
  )
}
