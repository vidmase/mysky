import Link from "next/link"

import { HomeHeartbeat } from "./components/home-heartbeat"
import { LandingAuthLink } from "./components/landing-auth-link"
import s from "./landing.module.css"

const NAV = [
  { label: "Log", href: "/flights" },
  { label: "Atlas", href: "/map" },
  { label: "Numbers", href: "/stats" },
  { label: "Delays", href: "/delays" },
  { label: "Pricing", href: "/pricing" },
]

const FEATURES = [
  {
    n: "01",
    title: "File a leg",
    desc: "Carrier, route, aircraft, seat and fare. Or photograph the boarding pass and let the form fill itself in.",
    href: "/add-flight",
    meta: "Add flight",
  },
  {
    n: "02",
    title: "The logbook",
    desc: "Every flight you have filed, sorted, filtered and searchable down to a single tail number.",
    href: "/flights",
    meta: "Flights",
  },
  {
    n: "03",
    title: "Route atlas",
    desc: "Great-circle arcs drawn over the whole world, thickening on the pairs you fly again and again.",
    href: "/map",
    meta: "Map",
  },
  {
    n: "04",
    title: "The numbers",
    desc: "Distance covered, hours aloft, countries touched, and the carrier that has had most of your year.",
    href: "/stats",
    meta: "Stats",
  },
  {
    n: "05",
    title: "Delay watch",
    desc: "Departure conditions at the airports that actually appear in your log, not a generic national feed.",
    href: "/delays",
    meta: "Delays",
  },
  {
    n: "06",
    title: "Month view",
    desc: "Upcoming and past legs laid out on a calendar, so a travel month reads at a glance.",
    href: "/calendar",
    meta: "Calendar",
  },
  {
    n: "07",
    title: "Ask the log",
    desc: "Plain questions about your own history. How far this year, which airport most, what did I fly in March.",
    href: "/chat",
    meta: "Chat",
  },
]

const DEPARTURES = [
  {
    city: "Tokyo",
    iata: "NRT",
    flight: "BT 0417",
    std: "09:40",
    gate: "A12",
    status: "Boarding",
    cls: s.statusBoarding,
  },
  {
    city: "Lisbon",
    iata: "LIS",
    flight: "FR 2231",
    std: "11:05",
    gate: "B04",
    status: "On time",
    cls: s.statusOnTime,
  },
  {
    city: "Reykjavík",
    iata: "KEF",
    flight: "W6 1180",
    std: "13:20",
    gate: "C31",
    status: "Delayed 0:35",
    cls: s.statusDelayed,
  },
  {
    city: "Marrakesh",
    iata: "RAK",
    flight: "BT 0662",
    std: "15:55",
    gate: "A07",
    status: "On time",
    cls: s.statusOnTime,
  },
  {
    city: "Buenos Aires",
    iata: "EZE",
    flight: "IB 6841",
    std: "18:30",
    gate: "D19",
    status: "On time",
    cls: s.statusOnTime,
  },
]

const MARQUEE = [
  "RIX", "LHR", "CDG", "JFK", "NRT", "SIN", "DXB", "GRU", "KEF", "AKL",
  "YYZ", "HEL", "IST", "CPT", "BKK", "SFO", "VIE", "OSL", "LIS", "DEL",
]

const Arrow = () => (
  <svg width="16" height="8" viewBox="0 0 16 8" fill="none" aria-hidden="true">
    <path d="M0 4h14M10.5 1L14 4l-3.5 3" stroke="currentColor" strokeWidth="1.2" />
  </svg>
)

export default function Home() {
  return (
    <div className={s.root}>
      <HomeHeartbeat />

      {/* ── NAV ───────────────────────────────────────────── */}
      <div className={s.shell}>
        <nav className={s.nav}>
          <Link href="/" className={s.brand} aria-label="MySky, home">
            <span className={s.brandMark}>
              My<em>Sky</em>
            </span>
            <span className={s.tag}>Flight Record</span>
          </Link>

          <div className={s.navLinks}>
            {NAV.map((item) => (
              <Link key={item.href} href={item.href} className={s.navLink}>
                {item.label}
              </Link>
            ))}
            <LandingAuthLink className={s.navCta} />
          </div>
        </nav>
      </div>

      {/* ── HERO ──────────────────────────────────────────── */}
      <header className={s.shell}>
        <section className={s.hero}>
          {/* great-circle plate bleeding off the right margin */}
          <svg
            className={s.heroPlate}
            viewBox="0 0 900 620"
            fill="none"
            aria-hidden="true"
          >
            <g opacity="0.5">
              {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
                <ellipse
                  key={`lat-${i}`}
                  cx="450"
                  cy="310"
                  rx="300"
                  ry={38 * (i + 1)}
                  stroke="#17130e"
                  strokeWidth="0.6"
                  opacity="0.32"
                />
              ))}
              {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
                <ellipse
                  key={`lon-${i}`}
                  cx="450"
                  cy="310"
                  rx={37.5 * (i + 1)}
                  ry="300"
                  stroke="#17130e"
                  strokeWidth="0.6"
                  opacity="0.32"
                />
              ))}
            </g>
            <circle cx="450" cy="310" r="300" stroke="#17130e" strokeWidth="1.1" opacity="0.55" />
            <path
              d="M170 400 C 320 150, 620 130, 760 250"
              stroke="#ce3b1e"
              strokeWidth="1.6"
              strokeDasharray="6 8"
              opacity="0.85"
            />
            <circle cx="170" cy="400" r="5" fill="#ce3b1e" />
            <circle cx="760" cy="250" r="5" fill="#ce3b1e" />
          </svg>

          <div className={s.heroGrid}>
            <div className={s.heroCopy}>
              <p
                className={`${s.heroStamp} ${s.tag} ${s.rise}`}
                style={{ animationDelay: "40ms" }}
              >
                <span />
                <span>Personal flight record · Est. MMXXV</span>
              </p>

              <h1 className={`${s.title} ${s.rise}`} style={{ animationDelay: "120ms" }}>
                Every flight
                <span className={s.titleHang}>
                  you have <em>ever</em>
                </span>
                taken, filed.
              </h1>

              <p className={`${s.lede} ${s.rise}`} style={{ animationDelay: "230ms" }}>
                A logbook for the whole of your flying — routes drawn on a world map,
                distance and hours totalled, delays watched at the airports you actually use.
              </p>

              <div className={`${s.heroActions} ${s.rise}`} style={{ animationDelay: "330ms" }}>
                <Link href="/add-flight" className={s.btnPrimary}>
                  Start the log
                  <Arrow />
                </Link>
                <Link href="/map" className={s.btnGhost}>
                  See the atlas
                </Link>
              </div>
            </div>

            {/* ── BOARDING PASS ───────────────────────────── */}
            <div className={`${s.passWrap} ${s.passRise}`} style={{ animationDelay: "420ms" }}>
              <article className={s.pass}>
                <div className={s.passMain}>
                  <div className={s.passHead}>
                    <span className={s.passAirline}>
                      My<em>Sky</em>
                    </span>
                    <span className={s.passClass}>BOARDING PASS</span>
                  </div>

                  <div className={s.passRoute}>
                    <div className={s.iata}>
                      RIX
                      <small>RIGA</small>
                    </div>

                    <svg className={s.passArc} viewBox="0 0 104 30" fill="none" aria-hidden="true">
                      <path className={s.passArcPath} d="M2 26 C 28 2, 76 2, 102 26" />
                      <path className={s.passPlane} d="M0,-3.4 L7.4,0 L0,3.4 L1.7,0 Z" />
                    </svg>

                    <div className={s.iata} style={{ textAlign: "right" }}>
                      NRT
                      <small>TOKYO</small>
                    </div>
                  </div>

                  <dl className={s.passData}>
                    <div className={s.passField}>
                      <dt>FLIGHT</dt>
                      <dd>BT 0417</dd>
                    </div>
                    <div className={s.passField}>
                      <dt>DATE</dt>
                      <dd>24 SEP</dd>
                    </div>
                    <div className={s.passField}>
                      <dt>GATE</dt>
                      <dd className={s.hot}>A12</dd>
                    </div>
                    <div className={s.passField}>
                      <dt>BOARD</dt>
                      <dd>09:05</dd>
                    </div>
                  </dl>

                  <dl className={s.passName}>
                    <dt>PASSENGER</dt>
                    <dd>Your name here</dd>
                  </dl>
                </div>

                <aside className={s.passStub}>
                  <span className={`${s.notch} ${s.notchTop}`} aria-hidden="true" />
                  <span className={`${s.notch} ${s.notchBottom}`} aria-hidden="true" />

                  <dl className={s.stubSeat}>
                    <dt>SEAT</dt>
                    <dd>14A</dd>
                  </dl>
                  <div className={s.barcode} aria-hidden="true" />
                  <span className={s.stubCode}>BT0417</span>
                </aside>
              </article>
            </div>

            <dl className={`${s.heroFacts} ${s.rise}`} style={{ animationDelay: "520ms" }}>
              <div className={s.fact}>
                <dt>Intake</dt>
                <dd>Scan a boarding pass, or pull itineraries straight out of Gmail.</dd>
              </div>
              <div className={s.fact}>
                <dt>Output</dt>
                <dd>Maps, statistics and printable passes generated from what you have filed.</dd>
              </div>
              <div className={s.fact}>
                <dt>Access</dt>
                <dd>Signed in and private. The record belongs to your account alone.</dd>
              </div>
            </dl>
          </div>
        </section>
      </header>

      {/* ── DEPARTURE BOARD ───────────────────────────────── */}
      <section className={s.board}>
        <div className={s.shell}>
          <div className={s.marquee} aria-hidden="true">
            <div className={s.marqueeTrack}>
              {[...MARQUEE, ...MARQUEE].map((c, i) => (
                <span key={`${c}-${i}`}>{c}</span>
              ))}
            </div>
          </div>

          <div className={s.boardHead}>
            <h2 className={s.boardTitle}>
              Departures, <em>as you keep them</em>
            </h2>
            <span className={`${s.tag} ${s.boardTag}`}>Fig. 1 — Board view</span>
          </div>

          <div className={s.boardScroll}>
            <table className={s.boardTable}>
              <thead>
                <tr>
                  <th scope="col">Destination</th>
                  <th scope="col">Flight</th>
                  <th scope="col">Sched</th>
                  <th scope="col" className={s.hideSm}>
                    Gate
                  </th>
                  <th scope="col">Status</th>
                </tr>
              </thead>
              <tbody>
                {DEPARTURES.map((d, i) => (
                  <tr
                    key={d.flight}
                    className={s.boardRow}
                    style={{ animationDelay: `${140 + i * 110}ms` }}
                  >
                    <td className={s.destCell}>
                      {d.city}
                      <b>{d.iata}</b>
                    </td>
                    <td>{d.flight}</td>
                    <td>{d.std}</td>
                    <td className={s.hideSm}>{d.gate}</td>
                    <td className={d.cls}>{d.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className={s.boardNote}>
            Specimen board — illustrative rows, not your data. Sign in to see your own.
          </p>
        </div>
      </section>

      {/* ── TIMETABLE ─────────────────────────────────────── */}
      <section className={s.shell}>
        <div className={s.timetable}>
          <div className={s.sectionHead}>
            <div style={{ gridColumn: "1 / span 7" }}>
              <span className={s.tag}>Contents</span>
              <h2 className={s.sectionTitle}>
                Seven ways to read <em>a life of flying</em>
              </h2>
            </div>
            <p className={s.sectionAside}>
              Each entry is a working page in the application. The timetable below is the
              whole of it — nothing hidden behind a tour.
            </p>
          </div>

          <ol className={s.rows}>
            {FEATURES.map((f) => (
              <li key={f.href} className={s.row}>
                <Link href={f.href} className={s.rowLink}>
                  <span className={s.rowNum}>{f.n}</span>
                  <h3 className={s.rowTitle}>{f.title}</h3>
                  <p className={s.rowDesc}>{f.desc}</p>
                  <span className={s.rowMeta}>
                    {f.meta}
                    <Arrow />
                  </span>
                </Link>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ── ATLAS ─────────────────────────────────────────── */}
      <section className={s.atlas}>
        <div className={s.shell}>
          <div className={s.atlasInner}>
            <div className={s.atlasCopy}>
              <span className={s.tag}>Plate II</span>
              <h2 className={s.atlasTitle}>
                The shape of <em>where you go</em>
              </h2>
              <p>
                Every filed leg becomes a great circle. Fly a pair often enough and the
                line darkens, until the map is unmistakably yours.
              </p>
              <Link href="/map" className={s.btnGhost}>
                Open the atlas
              </Link>
            </div>

            <svg className={s.atlasMap} viewBox="0 0 640 340" fill="none" aria-hidden="true">
              {/* latitude guides */}
              {[70, 130, 190, 250].map((y) => (
                <line
                  key={y}
                  x1="10"
                  y1={y}
                  x2="630"
                  y2={y}
                  stroke="#17130e"
                  strokeOpacity="0.09"
                  strokeWidth="1"
                />
              ))}

              {/* faded historical routes */}
              <path className={s.arcTrace} d="M96 214 C 190 118, 330 104, 428 152" />
              <path className={s.arcTrace} d="M96 214 C 170 268, 300 292, 392 254" />
              <path className={s.arcTrace} d="M428 152 C 500 108, 570 122, 592 176" />
              <path className={s.arcTrace} d="M96 214 C 210 60, 420 44, 592 176" />

              {/* the live one */}
              <path className={s.arcLive} d="M96 214 C 236 74, 448 78, 592 176" />

              {/* nodes */}
              <circle className={s.nodeHot} cx="96" cy="214" r="4" />
              <circle className={s.node} cx="96" cy="214" r="4" />
              <text className={s.nodeLabel} x="86" y="236">
                RIX
              </text>

              <circle className={s.node} cx="428" cy="152" r="3.5" />
              <text className={s.nodeLabel} x="418" y="140">
                DXB
              </text>

              <circle className={s.node} cx="392" cy="254" r="3.5" />
              <text className={s.nodeLabel} x="382" y="276">
                CPT
              </text>

              <circle className={s.nodeHot} cx="592" cy="176" r="4" />
              <circle className={s.node} cx="592" cy="176" r="4" />
              <text className={s.nodeLabel} x="576" y="198">
                NRT
              </text>
            </svg>
          </div>
        </div>
      </section>

      {/* ── CTA ───────────────────────────────────────────── */}
      <section className={s.shell}>
        <div className={s.cta}>
          <div className={s.ticket}>
            <div>
              <span className={`${s.tag} ${s.ticketEyebrow}`}>Boarding now</span>
              <h2 className={s.ticketTitle}>
                Begin with the flight <em>you remember best</em>
              </h2>
            </div>
            <div className={s.ticketActions}>
              <Link href="/add-flight" className={s.btnLight}>
                File a flight
                <Arrow />
              </Link>
              <LandingAuthLink className={s.btnOutline} />
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ────────────────────────────────────────── */}
      <footer className={s.shell}>
        <div className={s.footer}>
          <div className={s.footerTop}>
            <span className={s.brandMark}>
              My<em>Sky</em>
            </span>
            <nav className={s.footerNav}>
              {[...NAV, { label: "Calendar", href: "/calendar" }, { label: "Chat", href: "/chat" }].map(
                (item) => (
                  <Link key={item.href} href={item.href} className={s.navLink}>
                    {item.label}
                  </Link>
                )
              )}
            </nav>
          </div>
          <p className={s.footerNote}>
            A personal flight record. Airport, airline and delay data are supplied by third
            parties and shown for reference only.
          </p>
        </div>
      </footer>
    </div>
  )
}
