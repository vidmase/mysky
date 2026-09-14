// Centralized airline logo and code mappings
// This file contains only data (no logic) so it can be shared across features

export const LOCAL_AIRLINE_LOGOS: Record<string, string> = {
  FR: "/ryanair.png",   // Ryanair
  W6: "/wizzair.png",   // Wizz Air
  U2: "/easyjet.png",   // easyJet
  BT: "/airbaltic.png", // airBaltic
}

export const AIRLINE_NAME_TO_CODE: Record<string, string> = {
  ryanair: "FR",
  "wizz air": "W6",
  wizzair: "W6",
  easyjet: "U2",
  airbaltic: "BT",
  "air baltic": "BT",
}

/**
 * The carrier a flight-number prefix belongs to. Airlines are filed under both
 * their IATA code (FR) and their ICAO code (RYR), and a flight number may carry
 * either, so both are listed against the same name.
 */
export const AIRLINE_CODE_TO_NAME: Record<string, string> = {
  FR: "Ryanair",
  RYR: "Ryanair",
  W6: "Wizz Air",
  WZZ: "Wizz Air",
  U2: "easyJet",
  EZY: "easyJet",
  EJU: "easyJet Europe",
  BT: "airBaltic",
  BTI: "airBaltic",
  LS: "Jet2",
  EXS: "Jet2",
  BA: "British Airways",
  BAW: "British Airways",
  LH: "Lufthansa",
  DLH: "Lufthansa",
  AF: "Air France",
  KL: "KLM",
  SK: "SAS",
  TP: "TAP Air Portugal",
  VY: "Vueling",
  IB: "Iberia",
  AY: "Finnair",
  LO: "LOT",
  OS: "Austrian",
  LX: "SWISS",
  TK: "Turkish Airlines",
  EW: "Eurowings",
  DY: "Norwegian",
  D8: "Norwegian",
  PC: "Pegasus",
  QR: "Qatar Airways",
  EK: "Emirates",
}

/**
 * How a carrier's boarding pass is printed: the header band, the text that sits
 * on it, and the chip colour for the seat and the reference. Keyed by IATA code,
 * the same key the logos and names use.
 *
 * These are the carriers' own colours, used to print the user's own tickets —
 * the wordmark is set in type rather than reproducing a logo on a coloured band.
 */
export type AirlineBrand = {
  band: string
  onBand: string
  accent: string
  onAccent: string
  tagline: string
}

export const AIRLINE_BRANDS: Record<string, AirlineBrand> = {
  BT: { band: '#c4d600', onBand: '#0c2340', accent: '#c4d600', onAccent: '#0c2340', tagline: 'Better journeys' },
  FR: { band: '#073590', onBand: '#ffffff', accent: '#f1c933', onAccent: '#073590', tagline: 'Low fares. Great care.' },
  W6: { band: '#c6007e', onBand: '#ffffff', accent: '#c6007e', onAccent: '#ffffff', tagline: "Let's fly further" },
  U2: { band: '#ff6600', onBand: '#ffffff', accent: '#ff6600', onAccent: '#ffffff', tagline: 'Enjoy your flight' },
  LS: { band: '#e4022d', onBand: '#ffffff', accent: '#e4022d', onAccent: '#ffffff', tagline: 'Friendly low fares' },
  EXS: { band: '#e4022d', onBand: '#ffffff', accent: '#e4022d', onAccent: '#ffffff', tagline: 'Friendly low fares' },
  BA: { band: '#075aaa', onBand: '#ffffff', accent: '#c8102e', onAccent: '#ffffff', tagline: 'To fly. To serve.' },
  LH: { band: '#05164d', onBand: '#ffffff', accent: '#f9ba00', onAccent: '#05164d', tagline: 'Say yes to the world' },
  VY: { band: '#ffcc2f', onBand: '#1a1a1a', accent: '#1a1a1a', onAccent: '#ffcc2f', tagline: 'Vuela' },
  EI: { band: '#00847d', onBand: '#ffffff', accent: '#00847d', onAccent: '#ffffff', tagline: 'Fly Aer Lingus' },
}

/** An unknown carrier prints on the app's own stock rather than a guessed colour. */
export const DEFAULT_AIRLINE_BRAND: AirlineBrand = {
  band: '#17130e',
  onBand: '#f2ece1',
  accent: '#ce3b1e',
  onAccent: '#ffffff',
  tagline: 'Boarding pass',
}
