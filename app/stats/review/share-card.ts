import { MONTHS, type YearReview } from '@/lib/year-review'

/**
 * The share card is drawn straight onto a canvas rather than rasterised from
 * the DOM: the output is identical in every browser, needs no extra library,
 * and the paper palette survives intact. Fonts are the same next/font faces
 * the page uses, resolved from the live CSS variables.
 */

const W = 1080
const H = 1350

const PAPER = '#f2ece1'
const PAPER_2 = '#e8dfcd'
const INK = '#17130e'
const INK_2 = '#5b5142'
const INK_3 = '#8c8071'
const VERMILLION = '#ce3b1e'
const RULE = 'rgba(23, 19, 14, 0.2)'

function resolveFamily(host: HTMLElement, variable: string, fallback: string) {
  const probe = document.createElement('span')
  probe.style.fontFamily = `var(${variable})`
  probe.style.position = 'absolute'
  probe.style.visibility = 'hidden'
  host.appendChild(probe)
  const family = getComputedStyle(probe).fontFamily || fallback
  probe.remove()
  return family
}

function fitText(ctx: CanvasRenderingContext2D, text: string, font: (size: number) => string, size: number, max: number) {
  let s = size
  ctx.font = font(s)
  while (s > 12 && ctx.measureText(text).width > max) {
    s -= 2
    ctx.font = font(s)
  }
  return s
}

export async function renderShareCard(review: YearReview, host: HTMLElement): Promise<Blob> {
  const display = resolveFamily(host, '--display', 'Didot, serif')
  const body = resolveFamily(host, '--body', 'Helvetica, sans-serif')
  const code = resolveFamily(host, '--code', 'ui-monospace, monospace')

  await Promise.all([
    document.fonts.load(`500 200px ${display}`),
    document.fonts.load(`italic 500 80px ${display}`),
    document.fonts.load(`700 40px ${display}`),
    document.fonts.load(`600 24px ${code}`),
    document.fonts.load(`500 28px ${body}`),
  ]).catch(() => undefined)

  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')!
  const M = 84

  ctx.fillStyle = PAPER
  ctx.fillRect(0, 0, W, H)

  const tag = (text: string, x: number, y: number, color = INK_2, align: CanvasTextAlign = 'left') => {
    ctx.font = `600 20px ${code}`
    ctx.fillStyle = color
    ctx.textAlign = align
    ctx.letterSpacing = '5px'
    ctx.fillText(text.toUpperCase(), x, y)
    ctx.letterSpacing = '0px'
    ctx.textAlign = 'left'
  }
  const rule = (y: number, strong = false) => {
    ctx.fillStyle = strong ? INK : RULE
    ctx.fillRect(M, y, W - M * 2, strong ? 2 : 1)
  }

  // ── masthead
  ctx.font = `700 46px ${display}`
  ctx.fillStyle = INK
  ctx.textBaseline = 'alphabetic'
  ctx.fillText('My', M, 132)
  const myW = ctx.measureText('My').width
  ctx.font = `italic 700 46px ${display}`
  ctx.fillStyle = VERMILLION
  ctx.fillText('Sky', M + myW, 132)
  tag(review.isPartial ? 'Year in review · so far' : 'Year in review', W - M, 126, INK_2, 'right')
  rule(162, true)

  // ── the year
  ctx.font = `500 300px ${display}`
  ctx.fillStyle = INK
  ctx.letterSpacing = '-10px'
  ctx.fillText(String(review.year), M - 12, 440)
  ctx.letterSpacing = '0px'

  const personaSize = fitText(ctx, review.persona.name, (s) => `italic 500 ${s}px ${display}`, 76, W - M * 2)
  ctx.font = `italic 500 ${personaSize}px ${display}`
  ctx.fillStyle = VERMILLION
  ctx.fillText(review.persona.name, M, 536)

  // ── map plate
  const mapTop = 584
  const mapH = 380
  const mapW = W - M * 2
  ctx.fillStyle = PAPER_2
  ctx.fillRect(M, mapTop, mapW, mapH)

  if (review.map) {
    const { aspect } = review.map
    const inner = { w: mapW - 48, h: mapH - 48 }
    let dw = inner.w
    let dh = dw / aspect
    if (dh > inner.h) { dh = inner.h; dw = dh * aspect }
    const ox = M + (mapW - dw) / 2
    const oy = mapTop + (mapH - dh) / 2
    const P = ([x, y]: [number, number]) => [ox + x * dw, oy + y * dh] as const

    ctx.save()
    ctx.beginPath()
    ctx.rect(M, mapTop, mapW, mapH)
    ctx.clip()
    ctx.strokeStyle = RULE
    ctx.lineWidth = 1
    ctx.setLineDash([3, 6])
    for (const g of review.map.graticule) {
      ctx.beginPath()
      const [a, b] = g.points
      ctx.moveTo(...P(a)); ctx.lineTo(...P(b))
      ctx.stroke()
    }
    ctx.setLineDash([])
    ctx.restore()

    ctx.strokeStyle = VERMILLION
    ctx.lineCap = 'round'
    for (const arc of review.map.arcs) {
      ctx.lineWidth = Math.min(6, 2 + arc.count * 0.8)
      ctx.globalAlpha = 0.85
      ctx.beginPath()
      arc.points.forEach((p, i) => (i ? ctx.lineTo(...P(p)) : ctx.moveTo(...P(p))))
      ctx.stroke()
    }
    ctx.globalAlpha = 1

    const labelled: string[] = []
    const placed: (readonly [number, number])[] = []
    for (const a of review.map.airports) {
      if (labelled.length >= 6) break
      const [x, y] = P([a.x, a.y])
      if (placed.some(([px, py]) => Math.abs(px - x) < 60 && Math.abs(py - y) < 24)) continue
      labelled.push(a.iata)
      placed.push([x, y])
    }
    for (const a of review.map.airports) {
      const [x, y] = P([a.x, a.y])
      ctx.fillStyle = PAPER
      ctx.beginPath(); ctx.arc(x, y, 9, 0, Math.PI * 2); ctx.fill()
      ctx.fillStyle = INK
      ctx.beginPath(); ctx.arc(x, y, 5.5, 0, Math.PI * 2); ctx.fill()
      if (labelled.includes(a.iata)) {
        ctx.font = `600 17px ${code}`
        ctx.letterSpacing = '2px'
        ctx.fillText(a.iata, x + 12, y - 10)
        ctx.letterSpacing = '0px'
      }
    }
  }
  tag('Fig. 1 · The shape of the year', M + 20, mapTop + mapH - 20, INK_3)

  // ── ledger
  const cells: [string, string][] = [
    ['Legs', review.legs.toLocaleString()],
    ['Kilometres', review.km.toLocaleString()],
    ['Hours aloft', review.hours.toLocaleString()],
    ['Countries', String(review.countries.length)],
    ['Airports', String(review.airports)],
    review.busiestMonth
      ? ['Busiest month', MONTHS[review.busiestMonth.month].slice(0, 3)]
      : ['Pairs', String(review.pairs)],
  ]
  const top = 1010
  const colW = (W - M * 2) / 3
  const rowH = 118
  rule(top, true)
  cells.forEach(([label, value], i) => {
    const col = i % 3
    const row = Math.floor(i / 3)
    const x = M + col * colW + (col ? 26 : 0)
    const y = top + row * rowH
    if (col) {
      ctx.fillStyle = RULE
      ctx.fillRect(M + col * colW, y + 18, 1, rowH - 36)
    }
    if (row) {
      ctx.fillStyle = RULE
      ctx.fillRect(M, y, W - M * 2, 1)
    }
    tag(label, x, y + 42, INK_3)
    const size = fitText(ctx, value, (s) => `500 ${s}px ${display}`, 58, colW - 40)
    ctx.font = `500 ${size}px ${display}`
    ctx.fillStyle = i === 0 ? VERMILLION : INK
    ctx.fillText(value, x, y + 100)
  })
  rule(top + rowH * 2, true)

  // ── colophon
  const carrier = review.airlines[0]?.airline
  ctx.font = `500 22px ${body}`
  ctx.fillStyle = INK_2
  ctx.fillText(carrier ? `Mostly with ${carrier}` : 'Filed in MySky', M, H - 62)
  tag('Great-circle estimates', W - M, H - 64, INK_3, 'right')

  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Could not draw the card'))), 'image/png')
  )
}
