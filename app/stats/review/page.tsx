"use client"

import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react"
import { ArrowLeft, Download, Pause, Play, RotateCcw, Share2, X } from "lucide-react"

import {
  buildYearReview,
  fmtDate,
  fmtMoney,
  fmtTime,
  MONTHS,
  reviewYears,
  todayISO,
  toLegs,
  WEEKDAYS,
  type Leg,
  type ReviewFlight,
  type ReviewMap,
  type YearReview,
} from "@/lib/year-review"
import { renderShareCard } from "./share-card"
import s from "./review.module.css"

const SLIDE_MS = 7000

type Tone = "paper" | "ink" | "navy" | "vermillion"
type Slide = { key: string; tone: Tone; render: (tag: string) => React.ReactNode; hold?: boolean }

/* ------------------------------------------------------------------
   SMALL PIECES
   ------------------------------------------------------------------ */
const prefersReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches

function CountUp({ value, decimals = 0, duration = 1800, delay = 250 }: { value: number; decimals?: number; duration?: number; delay?: number }) {
  const [shown, setShown] = useState(() => (prefersReducedMotion() ? value : 0))
  useEffect(() => {
    if (prefersReducedMotion()) { setShown(value); return }
    let raf = 0
    let start: number | null = null
    const step = (ts: number) => {
      if (start === null) start = ts + delay
      const p = Math.max(0, Math.min(1, (ts - start) / duration))
      setShown(value * (1 - Math.pow(1 - p, 4)))
      if (p < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [value, duration, delay])
  return (
    <>
      {shown.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}
    </>
  )
}

const Tag = ({ children }: { children: React.ReactNode }) => (
  <p className={`${s.tag} ${s.rise}`} style={{ animationDelay: "60ms" }}>
    <span className={s.tagRule} />
    {children}
  </p>
)

const Rise = ({ delay = 0, className = "", children }: { delay?: number; className?: string; children: React.ReactNode }) => (
  <div className={`${s.rise} ${className}`} style={{ animationDelay: `${delay}ms` }}>
    {children}
  </div>
)

function RouteMap({ map, large = false }: { map: ReviewMap; large?: boolean }) {
  const W = 1000
  const H = Math.round(W / Math.max(0.6, Math.min(3.2, map.aspect)))
  // Busiest airports label first; a neighbour too close to read is left as a dot.
  const labelled = new Set<string>()
  const placed: [number, number][] = []
  for (const a of map.airports) {
    if (labelled.size >= (large ? 10 : 6)) break
    const x = a.x * W
    const y = a.y * H
    if (placed.some(([px, py]) => Math.abs(px - x) < 70 && Math.abs(py - y) < 26)) continue
    labelled.add(a.iata)
    placed.push([x, y])
  }
  const path = (pts: [number, number][]) =>
    pts.map(([x, y], i) => `${i ? "L" : "M"}${(x * W).toFixed(1)} ${(y * H).toFixed(1)}`).join(" ")

  return (
    <svg className={s.map} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Map of ${map.arcs.length} routes flown`}>
      {map.graticule.map((g, i) => (
        <path key={`g${i}`} d={path(g.points)} className={s.mapGrid} />
      ))}
      {map.arcs.map((arc, i) => (
        <path
          key={`a${i}`}
          d={path(arc.points)}
          pathLength={1}
          className={s.mapArc}
          style={{
            strokeWidth: Math.min(7, 2.4 + arc.count),
            animationDelay: `${300 + (i * 1400) / Math.max(1, map.arcs.length)}ms`,
          }}
        />
      ))}
      {map.airports.map((a, i) => (
        <g
          key={a.iata}
          className={s.mapDot}
          style={{ animationDelay: `${200 + i * 60}ms` }}
          transform={`translate(${(a.x * W).toFixed(1)} ${(a.y * H).toFixed(1)})`}
        >
          <circle r={9} className={s.mapDotHalo} />
          <circle r={5.5} />
          {labelled.has(a.iata) && (
            <text x={a.x > 0.85 ? -13 : 13} y={-11} textAnchor={a.x > 0.85 ? "end" : "start"} className={s.mapLabel}>
              {a.iata}
            </text>
          )}
        </g>
      ))}
    </svg>
  )
}

const LegLine = ({ leg }: { leg: Leg }) => (
  <span className={s.legLine}>
    {leg.from}
    <span className={s.legArrow}>→</span>
    {leg.to}
  </span>
)

/* ------------------------------------------------------------------
   THE STORY
   ------------------------------------------------------------------ */
function buildSlides(r: YearReview, years: number[], onYear: (y: number) => void, begin: () => void): Slide[] {
  const slides: Slide[] = []
  const suffix = r.isPartial ? " so far" : ""

  slides.push({
    key: "cover",
    tone: "paper",
    hold: true,
    render: () => (
      <div className={s.coverWrap}>
        <div className={s.cover}>
          <Tag>MySky · Year in review{r.isPartial ? ` · filed to ${fmtDate(todayISO())}` : ""}</Tag>
          <h1 className={`${s.coverYear} ${s.rise}`} style={{ animationDelay: "140ms" }}>
            {r.year}
          </h1>
          <Rise delay={260}>
            <p className={s.coverTitle}>
              Your year <em>in the air</em>
            </p>
          </Rise>
          <Rise delay={360}>
            <p className={s.lede}>
              {r.legs} {r.legs === 1 ? "leg" : "legs"}, {r.countries.length}{" "}
              {r.countries.length === 1 ? "country" : "countries"}, one long look back.
            </p>
          </Rise>
          <Rise delay={460} className={s.coverActions}>
            <button type="button" className={s.btnSolid} onClick={begin}>
              Begin <span aria-hidden>→</span>
            </button>
            {years.length > 1 && (
              <div className={s.years} role="group" aria-label="Choose a year">
                {years.map((y) => (
                  <button
                    key={y}
                    type="button"
                    className={`${s.yearChip} ${y === r.year ? s.yearChipOn : ""}`}
                    aria-pressed={y === r.year}
                    onClick={() => onYear(y)}
                  >
                    {y}
                  </button>
                ))}
              </div>
            )}
          </Rise>
          <Rise delay={600}>
            <p className={s.hint}>Tap or use ← → · hold or press space to pause</p>
          </Rise>
        </div>
        {r.map && (
          <div className={s.coverMap} aria-hidden>
            <RouteMap map={r.map} />
          </div>
        )}
      </div>
    ),
  })

  const delta = r.previous ? r.legs - r.previous.legs : null
  slides.push({
    key: "legs",
    tone: "paper",
    render: (tag) => (
      <div className={s.stack}>
        <Tag>{tag} · The log</Tag>
        <Rise delay={120}><h2 className={s.headline}>You took to the sky</h2></Rise>
        <p className={`${s.giant} ${s.rise}`} style={{ animationDelay: "200ms" }}>
          <CountUp value={r.legs} />
          <span className={s.giantUnit}>{r.legs === 1 ? "leg" : "legs"}</span>
        </p>
        <Rise delay={500}>
          <p className={s.gloss}>
            Across {r.travelDays} travel {r.travelDays === 1 ? "day" : "days"}{suffix}.
            {delta == null && " The first year on your record."}
          </p>
        </Rise>
        {delta != null && r.previous && (
          <Rise delay={700}>
            <p className={`${s.delta} ${delta > 0 ? s.deltaUp : ""}`}>
              {delta === 0
                ? `Level with ${r.previous.year}`
                : `${delta > 0 ? "+" : "−"}${Math.abs(delta)} on ${r.previous.year}`}
            </p>
          </Rise>
        )}
      </div>
    ),
  })

  if (r.km > 0) {
    const laps = r.equatorLaps
    slides.push({
      key: "distance",
      tone: "ink",
      render: (tag) => (
        <div className={s.stack}>
          <Tag>{tag} · Distance</Tag>
          <Rise delay={120}><h2 className={s.headline}>You covered</h2></Rise>
          <p className={`${s.giant} ${s.rise}`} style={{ animationDelay: "200ms" }}>
            <CountUp value={r.km} />
            <span className={s.giantUnit}>km</span>
          </p>
          <Rise delay={600}>
            <p className={s.gloss}>
              {laps >= 1
                ? <>That is <strong>{laps.toFixed(1)}×</strong> around the equator.</>
                : <>That is <strong>{Math.round(laps * 100)}%</strong> of the way around the equator.</>}
              {r.moonShare >= 0.05 && <> Or {Math.round(r.moonShare * 100)}% of the way to the Moon.</>}
            </p>
          </Rise>
          <Rise delay={800} className={s.meterWrap}>
            <div className={s.meter}>
              <div
                className={s.meterFill}
                style={{ ["--to" as string]: `${Math.min(100, (laps / Math.max(1, Math.ceil(laps))) * 100)}%` }}
              />
            </div>
            <div className={s.meterScale}>
              <span>0</span>
              <span>{Math.max(1, Math.ceil(laps))}× the equator</span>
            </div>
          </Rise>
        </div>
      ),
    })

    const days = Math.floor(r.hours / 24)
    slides.push({
      key: "hours",
      tone: "paper",
      render: (tag) => (
        <div className={s.stack}>
          <Tag>{tag} · Time aloft</Tag>
          <Rise delay={120}><h2 className={s.headline}>Above the weather for</h2></Rise>
          <p className={`${s.giant} ${s.rise}`} style={{ animationDelay: "200ms" }}>
            <CountUp value={r.hours} />
            <span className={s.giantUnit}>hours</span>
          </p>
          <Rise delay={600} className={s.split}>
            <div className={s.splitCell}>
              <span className={s.label}>Days</span>
              <span className={s.splitValue}>{days}</span>
            </div>
            <div className={s.splitCell}>
              <span className={s.label}>Hours</span>
              <span className={s.splitValue}>{r.hours % 24}</span>
            </div>
            <div className={s.splitCell}>
              <span className={s.label}>Per leg</span>
              <span className={s.splitValue}>{(r.hours / Math.max(1, r.legs)).toFixed(1)}h</span>
            </div>
          </Rise>
          <Rise delay={800}><p className={s.note}>Estimated from great-circle distance, with taxi time.</p></Rise>
        </div>
      ),
    })
  }

  if (r.map) {
    const map = r.map
    slides.push({
      key: "map",
      tone: "paper",
      render: (tag) => (
        <div className={s.mapSlide}>
          <div className={s.mapCopy}>
            <Tag>{tag} · The shape of it</Tag>
            <Rise delay={120}><h2 className={s.headline}>Your year, <em>drawn</em></h2></Rise>
            <Rise delay={300}>
              <dl className={s.ledger}>
                <div><dt className={s.label}>Airports</dt><dd><CountUp value={r.airports} duration={900} /></dd></div>
                <div><dt className={s.label}>Countries</dt><dd><CountUp value={r.countries.length} duration={900} /></dd></div>
                <div><dt className={s.label}>Pairs</dt><dd><CountUp value={r.pairs} duration={900} /></dd></div>
              </dl>
            </Rise>
          </div>
          <Rise delay={100} className={s.mapPlate}>
            <RouteMap map={map} large />
          </Rise>
        </div>
      ),
    })
  }

  if (r.countries.length) {
    const fresh = new Set(r.newCountries)
    slides.push({
      key: "countries",
      tone: "navy",
      render: (tag) => (
        <div className={s.stack}>
          <Tag>{tag} · Passport</Tag>
          <Rise delay={120}>
            <h2 className={s.headline}>
              {r.newCountries.length
                ? <><em>{r.newCountries.length}</em> new to your log</>
                : <>{r.countries.length} {r.countries.length === 1 ? "country" : "countries"}, touched</>}
            </h2>
          </Rise>
          <ul className={s.chips}>
            {r.countries.map((c, i) => (
              <li
                key={c}
                className={`${s.chip} ${fresh.has(c) ? s.chipNew : ""} ${s.pop}`}
                style={{ animationDelay: `${300 + i * 90}ms` }}
              >
                {c}
                {fresh.has(c) && <span className={s.chipFlag}>new</span>}
              </li>
            ))}
          </ul>
          {r.newAirports.length > 0 && (
            <Rise delay={400 + r.countries.length * 90}>
              <p className={s.gloss}>
                And {r.newAirports.length} {r.newAirports.length === 1 ? "airport" : "airports"} you had never used before.
              </p>
            </Rise>
          )}
        </div>
      ),
    })
  }

  if (r.busiestMonth && r.legs > 1) {
    const max = Math.max(...r.months)
    slides.push({
      key: "months",
      tone: "paper",
      render: (tag) => (
        <div className={s.stack}>
          <Tag>{tag} · When you flew</Tag>
          <Rise delay={120}><h2 className={s.headline}>Your busiest month was</h2></Rise>
          <Rise delay={220}><p className={s.bigWord}><em>{MONTHS[r.busiestMonth!.month]}</em></p></Rise>
          <div className={s.bars} aria-hidden>
            {r.months.map((c, m) => (
              <div key={m} className={s.barCol}>
                <div
                  className={`${s.bar} ${m === r.busiestMonth!.month ? s.barHot : ""}`}
                  style={{ ["--h" as string]: `${max ? (c / max) * 100 : 0}%`, animationDelay: `${400 + m * 50}ms` }}
                />
                <span className={s.barLabel}>{MONTHS[m][0]}</span>
              </div>
            ))}
          </div>
          <Rise delay={1100}>
            <p className={s.gloss}>
              {r.busiestMonth!.count} {r.busiestMonth!.count === 1 ? "leg" : "legs"} that month.
              {r.favouriteWeekday && r.favouriteWeekday.count > 1 && <> Favourite day to fly: <strong>{WEEKDAYS[r.favouriteWeekday.weekday]}</strong>.</>}
            </p>
          </Rise>
        </div>
      ),
    })
  }

  if (r.airlines.length) {
    const top = r.airlines[0]
    const share = Math.round((top.count / r.legs) * 100)
    slides.push({
      key: "carrier",
      tone: "vermillion",
      render: (tag) => (
        <div className={s.stack}>
          <Tag>{tag} · Who flew you</Tag>
          <Rise delay={120}><h2 className={s.headline}>Mostly, it was</h2></Rise>
          <Rise delay={240}><p className={s.bigWord}>{top.airline}</p></Rise>
          <Rise delay={420}>
            <p className={s.gloss}>
              <strong>{top.count}</strong> of your {r.legs} legs · {share}% of the year.
            </p>
          </Rise>
          {r.airlines.length > 1 && (
            <Rise delay={620} className={s.runners}>
              {r.airlines.slice(1, 4).map((a, i) => (
                <div key={a.airline} className={s.runner}>
                  <span className={s.runnerNo}>{i + 2}</span>
                  <span className={s.runnerName}>{a.airline}</span>
                  <span className={s.runnerCount}>{a.count}</span>
                </div>
              ))}
            </Rise>
          )}
        </div>
      ),
    })
  }

  if (r.topAirport) {
    slides.push({
      key: "base",
      tone: "paper",
      render: (tag) => (
        <div className={s.stack}>
          <Tag>{tag} · Home base</Tag>
          <Rise delay={120}><h2 className={s.headline}>The gate you knew best</h2></Rise>
          <p className={`${s.code} ${s.rise}`} style={{ animationDelay: "220ms" }}>{r.topAirport!.iata}</p>
          <Rise delay={400}>
            <p className={s.gloss}>
              {r.topAirport!.name !== r.topAirport!.iata && <>{r.topAirport!.name} · </>}
              <strong>{r.topAirport!.visits}</strong> times through its doors.
            </p>
          </Rise>
          {r.topPair && (
            <Rise delay={650} className={s.pairBox}>
              <span className={s.label}>Pair flown most</span>
              <span className={s.pairValue}>
                {r.topPair.a}<span className={s.legArrow}>⇄</span>{r.topPair.b}
                <span className={s.pairCount}>{r.topPair.count}×</span>
              </span>
            </Rise>
          )}
        </div>
      ),
    })
  }

  if (r.longest) {
    slides.push({
      key: "extremes",
      tone: "ink",
      render: (tag) => (
        <div className={s.stack}>
          <Tag>{tag} · Extremes</Tag>
          <div className={s.extremes}>
            <Rise delay={150} className={s.extreme}>
              <span className={s.label}>Longest leg</span>
              <LegLine leg={r.longest!} />
              <span className={s.extremeKm}><CountUp value={Math.round(r.longest!.km ?? 0)} duration={1200} delay={400} /> km</span>
              <span className={s.extremeWhen}>{fmtDate(r.longest!.date)} · {r.longest!.fromName} to {r.longest!.toName}</span>
            </Rise>
            {r.shortest && (
              <Rise delay={550} className={s.extreme}>
                <span className={s.label}>Shortest leg</span>
                <LegLine leg={r.shortest} />
                <span className={s.extremeKm}><CountUp value={Math.round(r.shortest.km ?? 0)} duration={1200} delay={800} /> km</span>
                <span className={s.extremeWhen}>{fmtDate(r.shortest.date)} · {r.shortest.fromName} to {r.shortest.toName}</span>
              </Rise>
            )}
          </div>
        </div>
      ),
    })
  }

  if (r.earliest?.minutes != null || r.first) {
    slides.push({
      key: "hours-of-day",
      tone: "paper",
      render: (tag) => (
        <div className={s.stack}>
          <Tag>{tag} · Odd hours</Tag>
          {r.earliest?.minutes != null && (
            <>
              <Rise delay={120}><h2 className={s.headline}>Your earliest wheels-up</h2></Rise>
              <p className={`${s.code} ${s.rise}`} style={{ animationDelay: "220ms" }}>{fmtTime(r.earliest.minutes)}</p>
              <Rise delay={400}>
                <p className={s.gloss}>
                  <LegLine leg={r.earliest} /> on {fmtDate(r.earliest.date)}.
                  {r.nightLegs > 0 && <> Plus <strong>{r.nightLegs}</strong> {r.nightLegs === 1 ? "departure" : "departures"} in the dead of night.</>}
                </p>
              </Rise>
            </>
          )}
          {r.first && (
            <Rise delay={650} className={s.bookends}>
              <div>
                <span className={s.label}>First of the year</span>
                <span className={s.bookendValue}><LegLine leg={r.first} /></span>
                <span className={s.extremeWhen}>{fmtDate(r.first.date)}</span>
              </div>
              {r.last && (
                <div>
                  <span className={s.label}>{r.isPartial ? "Most recent" : "Last of the year"}</span>
                  <span className={s.bookendValue}><LegLine leg={r.last} /></span>
                  <span className={s.extremeWhen}>{fmtDate(r.last.date)}</span>
                </div>
              )}
            </Rise>
          )}
        </div>
      ),
    })
  }

  if (r.spend) {
    const sp = r.spend
    slides.push({
      key: "spend",
      tone: "paper",
      render: (tag) => (
        <div className={s.stack}>
          <Tag>{tag} · The bill</Tag>
          <Rise delay={120}><h2 className={s.headline}>What the sky cost you</h2></Rise>
          <p className={`${s.giant} ${s.giantMoney} ${s.rise}`} style={{ animationDelay: "200ms" }}>
            €<CountUp value={sp.total} decimals={2} />
          </p>
          <Rise delay={600} className={s.split}>
            <div className={s.splitCell}>
              <span className={s.label}>Average leg</span>
              <span className={s.splitValue}>{fmtMoney(sp.average)}</span>
            </div>
            {sp.cheapest && (
              <div className={s.splitCell}>
                <span className={s.label}>Best fare · {sp.cheapest.from}→{sp.cheapest.to}</span>
                <span className={s.splitValue}>{fmtMoney(sp.cheapest.price ?? 0)}</span>
              </div>
            )}
            {sp.per100km != null && (
              <div className={s.splitCell}>
                <span className={s.label}>Per 100 km</span>
                <span className={s.splitValue}>{fmtMoney(sp.per100km)}</span>
              </div>
            )}
          </Rise>
          <Rise delay={800}>
            <p className={s.note}>
              From {sp.priced} of {r.legs} legs with a fare on record. Fares shown as filed, not converted.
            </p>
          </Rise>
        </div>
      ),
    })
  }

  slides.push({
    key: "persona",
    tone: "vermillion",
    render: (tag) => (
      <div className={s.stack}>
        <Tag>{tag} · The verdict</Tag>
        <Rise delay={150}><h2 className={s.headline}>In {r.year}, you were</h2></Rise>
        <p className={`${s.persona} ${s.stamp}`} style={{ animationDelay: "450ms" }}>
          {r.persona.name}
        </p>
        <Rise delay={1000}><p className={s.gloss}>{r.persona.reason}</p></Rise>
      </div>
    ),
  })

  return slides
}

function ShareSlide({ review, years, onYear, onReplay }: { review: YearReview; years: number[]; onYear: (y: number) => void; onReplay: () => void }) {
  const hostRef = useRef<HTMLDivElement>(null)
  const [blob, setBlob] = useState<Blob | null>(null)
  const [url, setUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [canShare, setCanShare] = useState(false)

  useEffect(() => {
    let cancelled = false
    let objectUrl: string | null = null
    setBlob(null)
    setError(null)
    renderShareCard(review, hostRef.current ?? document.body)
      .then((b) => {
        if (cancelled) return
        objectUrl = URL.createObjectURL(b)
        setBlob(b)
        setUrl(objectUrl)
        const file = new File([b], `mysky-${review.year}.png`, { type: "image/png" })
        setCanShare(typeof navigator.canShare === "function" && navigator.canShare({ files: [file] }))
      })
      .catch((e) => !cancelled && setError(e instanceof Error ? e.message : "Could not draw the card"))
    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [review])

  const filename = `mysky-year-in-review-${review.year}.png`

  const download = () => {
    if (!url) return
    const a = document.createElement("a")
    a.href = url
    a.download = filename
    a.click()
  }

  const share = async () => {
    if (!blob) return
    try {
      await navigator.share({
        files: [new File([blob], filename, { type: "image/png" })],
        title: `My ${review.year} in the air`,
        text: `${review.legs} legs, ${review.km.toLocaleString()} km, ${review.countries.length} countries. ${review.persona.name}.`,
      })
    } catch {
      /* dismissed */
    }
  }

  return (
    <div className={s.shareSlide} ref={hostRef}>
      <div className={s.shareCopy}>
        <Tag>Fin · Keep it</Tag>
        <Rise delay={120}><h2 className={s.headline}>That was <em>{review.year}</em></h2></Rise>
        <Rise delay={240}>
          <p className={s.gloss}>
            One card with the whole year on it. Post it, send it, or keep it for the log.
          </p>
        </Rise>
        <Rise delay={360} className={s.shareActions}>
          {canShare && (
            <button type="button" className={s.btnSolid} onClick={share} disabled={!blob}>
              <Share2 aria-hidden /> Share
            </button>
          )}
          <button type="button" className={canShare ? s.btnOutline : s.btnSolid} onClick={download} disabled={!url}>
            <Download aria-hidden /> Save image
          </button>
          <button type="button" className={s.btnOutline} onClick={onReplay}>
            <RotateCcw aria-hidden /> Replay
          </button>
        </Rise>
        {years.length > 1 && (
          <Rise delay={480}>
            <p className={s.label}>Another year</p>
            <div className={s.years}>
              {years.map((y) => (
                <button
                  key={y}
                  type="button"
                  className={`${s.yearChip} ${y === review.year ? s.yearChipOn : ""}`}
                  aria-pressed={y === review.year}
                  onClick={() => onYear(y)}
                >
                  {y}
                </button>
              ))}
            </div>
          </Rise>
        )}
        <Rise delay={560}>
          <Link href="/stats" className={s.backLink}>
            <ArrowLeft aria-hidden /> Back to the numbers
          </Link>
        </Rise>
      </div>
      <Rise delay={200} className={s.cardFrame}>
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt={`Year in review card for ${review.year}`} className={s.cardImg} />
        ) : (
          <div className={s.cardPlaceholder}>{error ?? "Setting the card"}</div>
        )}
      </Rise>
    </div>
  )
}

function ReviewStory() {
  const router = useRouter()
  const params = useSearchParams()
  const [flights, setFlights] = useState<ReviewFlight[] | null>(null)
  const [failed, setFailed] = useState<string | null>(null)
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const [held, setHeld] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const elapsedRef = useRef(0)
  const pointer = useRef<{ x: number; y: number; t: number } | null>(null)
  const holdTimer = useRef<number | null>(null)

  useEffect(() => {
    fetch("/api/flights")
      .then(async (res) => {
        if (res.status === 401) throw new Error("Sign in to see your year.")
        if (!res.ok) throw new Error("Could not load your flights.")
        const body = await res.json()
        setFlights(Array.isArray(body) ? body : body.data ?? [])
      })
      .catch((e) => setFailed(e instanceof Error ? e.message : "Could not load your flights."))
  }, [])

  const legs = useMemo(() => (flights ? toLegs(flights) : []), [flights])
  const years = useMemo(() => reviewYears(legs), [legs])
  const requested = Number(params?.get("year"))
  const year = years.includes(requested) ? requested : years[0]
  const review = useMemo(
    () => (flights && year ? buildYearReview(legs, flights, year) : null),
    [legs, flights, year]
  )

  const chooseYear = useCallback(
    (y: number) => {
      router.replace(`/stats/review?year=${y}`, { scroll: false })
      setIndex(0)
      setElapsed(0)
      setPaused(false)
    },
    [router]
  )

  const slides = useMemo(() => {
    if (!review) return []
    const story = buildSlides(review, years, chooseYear, () => { setIndex(1); setElapsed(0) })
    story.push({
      key: "share",
      tone: "paper",
      hold: true,
      render: () => (
        <ShareSlide review={review} years={years} onYear={chooseYear} onReplay={() => { setIndex(1); setElapsed(0); setPaused(false) }} />
      ),
    })
    return story
  }, [review, years, chooseYear])

  const total = slides.length
  const current = slides[Math.min(index, Math.max(0, total - 1))]

  const go = useCallback(
    (to: number) => {
      setIndex(Math.max(0, Math.min(total - 1, to)))
      elapsedRef.current = 0
      setElapsed(0)
    },
    [total]
  )

  // Every way of changing slide (tap, key, year chip, replay) restarts its clock.
  useEffect(() => {
    elapsedRef.current = 0
    setElapsed(0)
  }, [index, review])

  // Autoplay clock — frozen while paused, held, hidden, or on a holding slide.
  useEffect(() => {
    if (!current || current.hold || paused || held) return
    let raf = 0
    let last = performance.now()
    const tick = (now: number) => {
      if (!document.hidden) {
        elapsedRef.current += now - last
        if (elapsedRef.current >= SLIDE_MS) {
          elapsedRef.current = 0
          setIndex((i) => Math.min(total - 1, i + 1))
        }
        setElapsed(elapsedRef.current)
      }
      last = now
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [current, paused, held, total])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLElement && e.target.closest("input, textarea, select")) return
      // A focused button already turns space into its own click.
      if (e.key === " " && e.target instanceof HTMLElement && e.target.closest("button, a")) return
      if (e.key === "ArrowRight") { e.preventDefault(); go(index + 1) }
      else if (e.key === "ArrowLeft") { e.preventDefault(); go(index - 1) }
      else if (e.key === " ") { e.preventDefault(); if (index === 0) go(1); else setPaused((p) => !p) }
      else if (e.key === "Escape") router.push("/stats")
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [go, index, router])

  const isControl = (t: EventTarget) => t instanceof HTMLElement && !!t.closest("button, a, input, select")

  const onPointerDown = (e: React.PointerEvent) => {
    if (isControl(e.target)) return
    pointer.current = { x: e.clientX, y: e.clientY, t: Date.now() }
    holdTimer.current = window.setTimeout(() => setHeld(true), 220)
  }

  const onPointerUp = (e: React.PointerEvent) => {
    if (holdTimer.current) window.clearTimeout(holdTimer.current)
    const start = pointer.current
    pointer.current = null
    const wasHeld = held
    setHeld(false)
    if (!start || isControl(e.target)) return
    const dx = e.clientX - start.x
    const dy = e.clientY - start.y
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) {
      go(index + (dx < 0 ? 1 : -1))
      return
    }
    if (wasHeld || Date.now() - start.t > 220) return
    const third = window.innerWidth / 3
    go(index + (e.clientX < third ? -1 : 1))
  }

  if (failed) {
    return (
      <div className={`${s.screen} ${s.tonepaper}`}>
        <div className={s.state}>
          <h1 className={s.headline}>{failed}</h1>
          <Link href="/stats" className={s.backLink}><ArrowLeft aria-hidden /> Back to the numbers</Link>
        </div>
      </div>
    )
  }

  if (!flights || (years.length && !review)) {
    return (
      <div className={`${s.screen} ${s.tonepaper}`}>
        <div className={s.state}>
          <p className={s.loadingYear}>
            <span className={s.loadingDot} />
            <span className={s.loadingDot} />
            <span className={s.loadingDot} />
          </p>
          <p className={s.label}>Pulling the year from the log</p>
        </div>
      </div>
    )
  }

  if (!review || !current) {
    return (
      <div className={`${s.screen} ${s.tonepaper}`}>
        <div className={s.state}>
          <h1 className={s.headline}>Nothing flown yet</h1>
          <p className={s.gloss}>File a leg or two and your year will write itself.</p>
          <Link href="/add-flight" className={s.btnSolid}>File a flight</Link>
        </div>
      </div>
    )
  }

  const numbered = slides.slice(1, -1).findIndex((sl) => sl.key === current.key)
  const tag = numbered >= 0 ? String(numbered + 1).padStart(2, "0") : ""

  return (
    <div
      className={`${s.screen} ${s[`tone${current.tone}`]}`}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerCancel={() => { setHeld(false); pointer.current = null }}
      onContextMenu={(e) => e.preventDefault()}
    >
      <header className={s.chrome}>
        <div className={s.progress} role="progressbar" aria-valuemin={1} aria-valuemax={total} aria-valuenow={index + 1} aria-label="Story progress">
          {slides.map((sl, i) => (
            <span key={sl.key} className={s.progressTrack}>
              <span
                className={s.progressFill}
                style={{ transform: `scaleX(${i < index ? 1 : i > index ? 0 : sl.hold ? 1 : elapsed / SLIDE_MS})` }}
              />
            </span>
          ))}
        </div>
        <div className={s.chromeRow}>
          <span className={s.brand}>
            My<em>Sky</em> <span className={s.brandYear}>{review.year}</span>
          </span>
          <div className={s.chromeActions}>
            {!current.hold && (
              <button
                type="button"
                className={s.iconBtn}
                onClick={() => setPaused((p) => !p)}
                aria-label={paused ? "Play" : "Pause"}
              >
                {paused ? <Play aria-hidden /> : <Pause aria-hidden />}
              </button>
            )}
            <Link href="/stats" className={s.iconBtn} aria-label="Close year in review">
              <X aria-hidden />
            </Link>
          </div>
        </div>
      </header>

      <main className={s.stage} key={`${review.year}-${current.key}`} aria-live="polite">
        {current.render(tag)}
      </main>

      {index > 0 && (
        <p className={s.counter} aria-hidden>
          {String(index + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}
          {(paused || held) && !current.hold && <span className={s.pausedFlag}> · paused</span>}
        </p>
      )}
    </div>
  )
}

export default function YearInReviewPage() {
  return (
    <Suspense fallback={null}>
      <ReviewStory />
    </Suspense>
  )
}
