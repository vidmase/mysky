"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"
import { useNotification } from "@/contexts/notification-context"

const CSV_HEADERS = [
  'passenger_name',
  'reservation_number',
  'flight_number',
  'departure_airport',
  'arrival_airport',
  'departure_date',
  'departure_time',
  'arrival_time',
  'arrival_date',
  'airline',
  'departure_iata',
  'arrival_iata',
  'seat',
  'notes',
  'total_receipt',
  'purchased_date',
  'purchase_time',
]

export function CsvImportDialog({ open, onOpenChange, onImported }: { open: boolean; onOpenChange: (v: boolean) => void; onImported: () => Promise<void> | void }) {
  const [file, setFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const { showSuccess, showError } = useNotification()

  const handleUpload = async () => {
    if (!file) {
      showError("Choose a CSV file first")
      return
    }
    setIsUploading(true)
    try {
      const form = new FormData()
      form.append('file', file)
      const res = await fetch('/api/flights/import', { method: 'POST', body: form })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        showError(data?.error || 'Import failed')
        return
      }
      const msg = `Imported ${data.inserted || 0} flights${data.skipped_duplicates ? ` (${data.skipped_duplicates} duplicates skipped)` : ''}`
      showSuccess(msg)
      setFile(null)
      onOpenChange(false)
      await onImported()
    } catch (e) {
      showError('Import error')
    } finally {
      setIsUploading(false)
    }
  }

  const downloadTemplate = () => {
    const content = CSV_HEADERS.join(',') + "\r\n"
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'flights_template.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Import flights from CSV</DialogTitle>
          <DialogDescription>
            Upload a CSV with headers:
            <span className="block mt-2 font-mono text-xs break-words">{CSV_HEADERS.join(', ')}</span>
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <input
            type="file"
            accept=".csv,text/csv"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
          />
          <div>
            <Button type="button" variant="ghost" size="sm" onClick={downloadTemplate}>Download template</Button>
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleUpload} disabled={isUploading || !file}>
            {isUploading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Import CSV
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
