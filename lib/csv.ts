// Simple CSV parser and stringifier that handles quoted fields and newlines
// Not RFC-perfect but sufficient for our import/export needs.
export function parseCSV(text: string): { headers: string[]; rows: string[][] } {
  const rows: string[][] = []
  let i = 0
  const len = text.length
  let current: string[] = []
  let field = ''
  let inQuotes = false

  const pushField = () => {
    current.push(field)
    field = ''
  }
  const pushRow = () => {
    // Skip empty trailing row
    if (current.length > 1 || (current.length === 1 && current[0].trim() !== '')) {
      rows.push(current)
    }
    current = []
  }

  while (i < len) {
    const ch = text[i]
    if (inQuotes) {
      if (ch === '"') {
        // Escaped quote
        if (i + 1 < len && text[i + 1] === '"') {
          field += '"'
          i += 2
          continue
        } else {
          inQuotes = false
          i++
          continue
        }
      } else {
        field += ch
        i++
        continue
      }
    } else {
      if (ch === '"') {
        inQuotes = true
        i++
        continue
      }
      if (ch === ',') {
        pushField()
        i++
        continue
      }
      if (ch === '\n') {
        pushField()
        pushRow()
        i++
        continue
      }
      if (ch === '\r') {
        // handle CRLF
        pushField()
        if (i + 1 < len && text[i + 1] === '\n') i++
        pushRow()
        i++
        continue
      }
      field += ch
      i++
    }
  }
  // Push last field/row
  pushField()
  pushRow()

  if (rows.length === 0) return { headers: [], rows: [] }
  const headers = rows[0].map(h => h.trim())
  const dataRows = rows.slice(1)
  return { headers, rows: dataRows }
}

export function stringifyCSV(headers: string[], rows: (string | number | null | undefined)[][]): string {
  const esc = (v: any) => {
    if (v === null || v === undefined) return ''
    const s = String(v)
    if (/[",\n\r]/.test(s)) {
      return '"' + s.replace(/"/g, '""') + '"'
    }
    return s
  }
  const lines = [headers.map(esc).join(',')]
  for (const row of rows) {
    lines.push(row.map(esc).join(','))
  }
  return lines.join('\r\n') + '\r\n'
}
