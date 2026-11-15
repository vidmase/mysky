// mysky light logbook — prototype behaviour. No framework, no network.
// Field names follow mysky's `vidmaflights` table so this can later be wired
// to the real API without renaming anything.
"use strict";

/* ---------- sample data (fictional) ---------- */
const SAMPLE = [
  { id: "s1", departure_date: "2026-11-09", departure_time: "06:25", arrival_time: "10:05", departure_iata: "BRS", departure_airport: "Bristol", arrival_iata: "KUN", arrival_airport: "Kaunas", airline: "Ryanair", flight_number: "FR8681", aircraft_registration: "EI-DCL", flight_duration: "2:40", total_receipt: "€34.99", reservation_number: "K7QX2M", seat: "14A", notes: "", cancelled: false },
  { id: "s2", departure_date: "2026-11-07", departure_time: "11:40", arrival_time: "15:50", departure_iata: "LPA", departure_airport: "Gran Canaria", arrival_iata: "BRS", arrival_airport: "Bristol", airline: "Ryanair", flight_number: "FR4758", aircraft_registration: "EI-EVT", flight_duration: "4:10", total_receipt: "£48.20", reservation_number: "P2LM8D", seat: "22C", notes: "Strong headwind over Biscay.", cancelled: false },
  { id: "s3", departure_date: "2026-11-02", departure_time: "17:10", arrival_time: "18:45", departure_iata: "KUN", departure_airport: "Kaunas", arrival_iata: "BRS", arrival_airport: "Bristol", airline: "Ryanair", flight_number: "FR8682", aircraft_registration: "", flight_duration: "2:35", total_receipt: "€22.50", reservation_number: "K7QX2M", seat: "3F", notes: "", cancelled: false },
  { id: "s4", departure_date: "2026-09-01", departure_time: "09:00", arrival_time: "12:20", departure_iata: "BRS", departure_airport: "Bristol", arrival_iata: "BCN", arrival_airport: "Barcelona", airline: "easyJet", flight_number: "U22631", aircraft_registration: "", flight_duration: "2:20", total_receipt: "£64.00", reservation_number: "EZ4K9T", seat: "", notes: "Trip called off.", cancelled: true },
  { id: "s5", departure_date: "2026-07-12", departure_time: "13:15", arrival_time: "16:55", departure_iata: "LTN", departure_airport: "London Luton", arrival_iata: "VNO", arrival_airport: "Vilnius", airline: "Wizz Air", flight_number: "W61622", aircraft_registration: "HA-LXA", flight_duration: "2:40", total_receipt: "£19.99", reservation_number: "WZ8812", seat: "7D", notes: "", cancelled: false },
  { id: "s6", departure_date: "2025-12-20", departure_time: "07:05", arrival_time: "10:30", departure_iata: "BRS", departure_airport: "Bristol", arrival_iata: "KUN", arrival_airport: "Kaunas", airline: "Ryanair", flight_number: "FR8681", aircraft_registration: "EI-FOZ", flight_duration: "2:25", total_receipt: "€89.99", reservation_number: "XH3B7Q", seat: "1A", notes: "Christmas fares.", cancelled: false },
  { id: "s7", departure_date: "2027-01-14", departure_time: "06:25", arrival_time: "10:05", departure_iata: "BRS", departure_airport: "Bristol", arrival_iata: "KUN", arrival_airport: "Kaunas", airline: "Ryanair", flight_number: "FR8681", aircraft_registration: "", flight_duration: "2:40", total_receipt: "€27.99", reservation_number: "N4RT6W", seat: "", notes: "", cancelled: false },
];

const STORE_KEY = "mysky-light-logbook";
const today = new Date().toISOString().slice(0, 10);
const $ = (s, el = document) => el.querySelector(s);

/* ---------- storage: per-browser convenience, never required ---------- */
function load() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORE_KEY) || "null");
    if (Array.isArray(saved)) return saved;
  } catch { /* private mode or blocked storage: fall back to the sample */ }
  return SAMPLE.slice();
}
function save() {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(flights)); } catch { /* ignore */ }
}

let flights = load();
const state = { q: "", year: "all", status: "all" };

/* ---------- derived values ---------- */
function statusOf(f) {
  if (f.cancelled) return "cancelled";
  return f.departure_date > today ? "upcoming" : "flown";
}
/** "2:35", "2h 35m" or "155" (minutes) → minutes; null when unreadable. */
function minutes(d) {
  if (!d) return null;
  const hm = String(d).match(/(\d+)\s*[:h]\s*(\d+)/);
  if (hm) return +hm[1] * 60 + +hm[2];
  const n = Number(d);
  return Number.isFinite(n) ? n : null;
}
/** "€34.99" → { cur: "€", amount: 34.99 }; null when there is no number. */
function fare(r) {
  if (!r) return null;
  const m = String(r).replace(",", ".").match(/^\s*([^\d\s.]*)\s*(\d+(?:\.\d+)?)\s*([A-Z]{3})?/);
  if (!m) return null;
  return { cur: m[1] || m[3] || "", amount: parseFloat(m[2]) };
}
const fmtMin = (m) => (m == null ? "—" : `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, "0")}m`);
const fmtDate = (d) =>
  new Date(d + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
const esc = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

/* ---------- render: stats ---------- */
function renderStats() {
  const flown = flights.filter((f) => statusOf(f) === "flown");
  const mins = flown.reduce((t, f) => t + (minutes(f.flight_duration) || 0), 0);
  const airports = new Set(flown.flatMap((f) => [f.departure_iata, f.arrival_iata]).filter(Boolean));
  // Spend is kept per currency (cancelled fares excluded), never summed across them.
  const spend = {};
  for (const f of flights) {
    if (f.cancelled) continue;
    const p = fare(f.total_receipt);
    if (p) spend[p.cur] = (spend[p.cur] || 0) + p.amount;
  }
  const spendTop = Object.entries(spend).sort((a, b) => b[1] - a[1]);
  const upcoming = flights.filter((f) => statusOf(f) === "upcoming").length;

  const tiles = [
    ["Flights flown", flown.length, upcoming ? `${upcoming} upcoming` : "none upcoming"],
    ["Time aloft", fmtMin(mins), "block time, flown legs"],
    ["Airports", airports.size, "departed or landed"],
    ["Spent", spendTop.length ? `${spendTop[0][0]}${spendTop[0][1].toFixed(0)}` : "—",
      spendTop.length > 1 ? "also " + spendTop.slice(1).map(([c, v]) => `${c}${v.toFixed(0)}`).join(" · ") : "cancelled fares excluded"],
  ];
  $("#stats").innerHTML = tiles
    .map(([l, v, s]) => `<div class="tile"><div class="tile-label">${l}</div><div class="tile-value mono">${esc(v)}</div><div class="tile-sub">${esc(s)}</div></div>`)
    .join("");
}

/* ---------- render: filters + list ---------- */
function renderYears() {
  const years = [...new Set(flights.map((f) => f.departure_date.slice(0, 4)))].sort().reverse();
  const sel = $("#year");
  sel.innerHTML = `<option value="all">All years</option>` + years.map((y) => `<option>${y}</option>`).join("");
  sel.value = years.includes(state.year) ? state.year : "all";
}

function matches(f) {
  if (state.year !== "all" && !f.departure_date.startsWith(state.year)) return false;
  if (state.status !== "all" && statusOf(f) !== state.status) return false;
  if (!state.q) return true;
  const hay = [f.departure_iata, f.arrival_iata, f.departure_airport, f.arrival_airport, f.airline, f.flight_number, f.reservation_number, f.aircraft_registration, f.notes].join(" ").toLowerCase();
  return hay.includes(state.q.toLowerCase());
}

function renderRows() {
  const list = flights.filter(matches).sort((a, b) => b.departure_date.localeCompare(a.departure_date));
  $("#count").textContent = `${list.length} of ${flights.length} flights`;

  if (!list.length) {
    $("#rows").innerHTML = `
      <div class="empty">
        <div class="empty-icon"><svg class="icon"><use href="#i-plane"/></svg></div>
        <h3>${flights.length ? "No flights match" : "No flights yet"}</h3>
        <p class="muted">${flights.length ? "Try another search or clear the filters." : "Log your first flight to start the record."}</p>
        <button class="btn" type="button" data-action="${flights.length ? "clear" : "new"}">${flights.length ? "Clear filters" : "Log a flight"}</button>
      </div>`;
    return;
  }

  $("#rows").innerHTML = list
    .map((f) => {
      const st = statusOf(f);
      const p = fare(f.total_receipt);
      return `
      <button class="row" type="button" data-id="${esc(f.id)}" aria-label="${esc(`${f.departure_iata} to ${f.arrival_iata}, ${fmtDate(f.departure_date)}`)}">
        <span class="c-date"><span class="mono">${fmtDate(f.departure_date)}</span><span class="sub">${esc(f.departure_time || "")}</span></span>
        <span class="c-route"><span class="route mono">${esc(f.departure_iata)}<svg class="icon arrow"><use href="#i-arrow"/></svg>${esc(f.arrival_iata)}</span><span class="sub">${esc(f.departure_airport)} → ${esc(f.arrival_airport)}</span></span>
        <span class="c-airline">${esc(f.airline || "—")}<span class="sub mono">${esc(f.flight_number || "")}</span></span>
        <span class="c-time num mono">${fmtMin(minutes(f.flight_duration))}</span>
        <span class="c-fare num mono">${p ? esc(p.cur + p.amount.toFixed(2)) : "—"}</span>
        <span class="c-status"><span class="badge badge-${st}">${st[0].toUpperCase() + st.slice(1)}</span></span>
      </button>`;
    })
    .join("");
}

function render() {
  renderStats();
  renderYears();
  renderRows();
}

/* ---------- drawers ---------- */
let lastFocus = null;
function openDrawer(id) {
  lastFocus = document.activeElement;
  const d = document.getElementById(id);
  d.hidden = false;
  requestAnimationFrame(() => { d.classList.add("open"); $("#scrim").classList.add("open"); });
  setTimeout(() => (d.querySelector("input, button") || d).focus(), 50);
}
function closeDrawers() {
  document.querySelectorAll(".drawer.open").forEach((d) => {
    d.classList.remove("open");
    setTimeout(() => (d.hidden = true), 300);
  });
  $("#scrim").classList.remove("open");
  lastFocus?.focus?.();
}

function showDetail(id) {
  const f = flights.find((x) => x.id === id);
  if (!f) return;
  const st = statusOf(f);
  const p = fare(f.total_receipt);
  $("#detail-title").textContent = `${f.airline || "Flight"} ${f.flight_number || ""}`.trim();
  const fact = (label, value, wide) => `<div class="${wide ? "wide" : ""}"><dt>${label}</dt><dd>${value ? esc(value) : "—"}</dd></div>`;
  $("#detail-body").innerHTML = `
    <span class="badge badge-${st}">${st[0].toUpperCase() + st.slice(1)}</span>
    <div class="ticket">
      <div class="ticket-route">
        <div><div class="ticket-iata mono">${esc(f.departure_iata)}</div><div class="muted">${esc(f.departure_airport)}</div><div class="mono">${esc(f.departure_time || "")}</div></div>
        <div class="ticket-line"></div>
        <div><div class="ticket-iata mono">${esc(f.arrival_iata)}</div><div class="muted">${esc(f.arrival_airport)}</div><div class="mono">${esc(f.arrival_time || "")}</div></div>
      </div>
    </div>
    <dl class="facts">
      ${fact("Date", fmtDate(f.departure_date))}
      ${fact("Block time", fmtMin(minutes(f.flight_duration)))}
      ${fact("Aircraft", f.aircraft_registration)}
      ${fact("Seat", f.seat)}
      ${fact("Fare", p ? p.cur + p.amount.toFixed(2) : "")}
      ${fact("Booking ref", f.reservation_number)}
      ${fact("Remarks", f.notes, true)}
    </dl>`;
  openDrawer("detail");
}

/* ---------- entry form ---------- */
function submitEntry(e) {
  e.preventDefault();
  const form = e.target;
  const data = Object.fromEntries(new FormData(form));
  const iata = /^[A-Za-z]{3}$/;
  let err = "";
  if (!data.departure_date) err = "Add the date of the flight.";
  else if (!iata.test(data.departure_iata) || !iata.test(data.arrival_iata)) err = "Airports need their 3-letter IATA codes, e.g. BRS.";
  else if (data.flight_duration && minutes(data.flight_duration) == null) err = "Block time reads as h:mm, e.g. 2:35.";
  $("#entry-error").textContent = err;
  if (err) return;

  flights.push({
    ...data,
    id: "u" + Date.now(),
    departure_iata: data.departure_iata.toUpperCase(),
    arrival_iata: data.arrival_iata.toUpperCase(),
    flight_number: (data.flight_number || "").toUpperCase(),
    aircraft_registration: (data.aircraft_registration || "").toUpperCase(),
    departure_airport: data.departure_iata.toUpperCase(),
    arrival_airport: data.arrival_iata.toUpperCase(),
    reservation_number: "",
    seat: "",
    cancelled: false,
  });
  save();
  form.reset();
  closeDrawers();
  render();
}

/* ---------- wiring ---------- */
document.addEventListener("click", (e) => {
  const row = e.target.closest(".row");
  if (row) return showDetail(row.dataset.id);
  const chip = e.target.closest(".chip");
  if (chip) {
    state.status = chip.dataset.status;
    document.querySelectorAll(".chip").forEach((c) => c.setAttribute("aria-pressed", String(c === chip)));
    return renderRows();
  }
  const action = e.target.closest("[data-action]")?.dataset.action;
  if (action === "new") { $("#entry-error").textContent = ""; openDrawer("entry"); }
  if (action === "close") closeDrawers();
  if (action === "clear") {
    Object.assign(state, { q: "", year: "all", status: "all" });
    $("#q").value = "";
    document.querySelectorAll(".chip").forEach((c) => c.setAttribute("aria-pressed", String(c.dataset.status === "all")));
    render();
  }
  if (action === "menu") {
    const nav = $("#nav");
    const open = nav.classList.toggle("open");
    e.target.closest("button").setAttribute("aria-expanded", String(open));
  }
});
$("#scrim").addEventListener("click", closeDrawers);
document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeDrawers(); });
$("#q").addEventListener("input", (e) => { state.q = e.target.value.trim(); renderRows(); });
$("#year").addEventListener("change", (e) => { state.year = e.target.value; renderRows(); });
$("#entry-form").addEventListener("submit", submitEntry);

render();
