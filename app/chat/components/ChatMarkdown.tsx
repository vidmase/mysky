import type { ReactNode } from "react"

/**
 * The small slice of Markdown the assistant writes: paragraphs, "-"/"*" and
 * "1." lists, "#" headings, **bold**, *italic* / _italic_ and `code`.
 * Builds React elements only (no innerHTML), so a reply cannot inject markup.
 * Anything else is shown as the plain text it is.
 */
export function ChatMarkdown({ text }: { text: string }) {
  const blocks: ReactNode[] = []
  const lines = text.replace(/\r\n/g, "\n").split("\n")
  let i = 0

  while (i < lines.length) {
    const line = lines[i]

    if (!line.trim()) {
      i++
      continue
    }

    const heading = line.match(/^#{1,6}\s+(.*)$/)
    if (heading) {
      blocks.push(
        <p key={i} className="font-semibold mt-3 first:mt-0">
          {inline(heading[1])}
        </p>
      )
      i++
      continue
    }

    const listKind = listItem(line)
    if (listKind) {
      const items: ReactNode[] = []
      while (i < lines.length && listItem(lines[i]) === listKind) {
        items.push(<li key={i}>{inline(lines[i].replace(LIST_MARKER, ""))}</li>)
        i++
      }
      const cls = "my-2 first:mt-0 last:mb-0 pl-5 space-y-1 " + (listKind === "ol" ? "list-decimal" : "list-disc")
      blocks.push(listKind === "ol" ? <ol key={i} className={cls}>{items}</ol> : <ul key={i} className={cls}>{items}</ul>)
      continue
    }

    // A paragraph runs until a blank line, a heading or a list.
    const para: string[] = []
    while (i < lines.length && lines[i].trim() && !/^#{1,6}\s/.test(lines[i]) && !listItem(lines[i])) {
      para.push(lines[i])
      i++
    }
    blocks.push(
      <p key={i} className="my-2 first:mt-0 last:mb-0 whitespace-pre-wrap">
        {inline(para.join("\n"))}
      </p>
    )
  }

  return <div className="break-words">{blocks}</div>
}

const LIST_MARKER = /^\s*(?:[-*•]|\d+[.)])\s+/

function listItem(line: string): "ul" | "ol" | null {
  if (/^\s*\d+[.)]\s+/.test(line)) return "ol"
  if (/^\s*[-*•]\s+/.test(line)) return "ul"
  return null
}

/** `code`, **bold**, *italic* and _italic_ within one block. */
function inline(text: string): ReactNode[] {
  const out: ReactNode[] = []
  const token = /`([^`]+)`|\*\*([^*]+)\*\*|\*([^*\s][^*]*)\*|(?<![\w])_([^_]+)_(?![\w])/g
  let last = 0
  let m: RegExpExecArray | null
  while ((m = token.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index))
    const k = m.index
    if (m[1] !== undefined) out.push(<code key={k} className="font-mono text-[0.85em] px-1 bg-[var(--paper)]">{m[1]}</code>)
    else if (m[2] !== undefined) out.push(<strong key={k}>{m[2]}</strong>)
    else out.push(<em key={k}>{m[3] ?? m[4]}</em>)
    last = token.lastIndex
  }
  if (last < text.length) out.push(text.slice(last))
  return out
}
