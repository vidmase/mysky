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
