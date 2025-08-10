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
