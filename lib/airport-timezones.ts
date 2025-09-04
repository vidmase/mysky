// Centralized mapping of IATA codes to IANA timezones
// Extracted from app/flights/[id]/page.tsx and shared for reuse
export const AIRPORT_TIMEZONES: Record<string, string> = {
  // United Kingdom
  LHR: "Europe/London",
  LGW: "Europe/London",
  STN: "Europe/London",
  LTN: "Europe/London",
  LCY: "Europe/London",
  MAN: "Europe/London",
  BHX: "Europe/London",
  EDI: "Europe/London",
  GLA: "Europe/London",
  BRS: "Europe/London",
  NCL: "Europe/London",

  // Ireland
  DUB: "Europe/Dublin",
  SNN: "Europe/Dublin",
  ORK: "Europe/Dublin",

  // France
  CDG: "Europe/Paris",
  ORY: "Europe/Paris",
  BVA: "Europe/Paris",
  MRS: "Europe/Paris",
  NCE: "Europe/Paris",
  LYS: "Europe/Paris",

  // Germany
  FRA: "Europe/Berlin",
  MUC: "Europe/Berlin",
  BER: "Europe/Berlin",
  DUS: "Europe/Berlin",
  HAM: "Europe/Berlin",
  CGN: "Europe/Berlin",

  // Spain
  MAD: "Europe/Madrid",
  BCN: "Europe/Madrid",
  PMI: "Europe/Madrid",
  ALC: "Europe/Madrid",
  AGP: "Europe/Madrid",
  IBZ: "Europe/Madrid",

  // Italy
  FCO: "Europe/Rome",
  MXP: "Europe/Rome",
  VCE: "Europe/Rome",
  NAP: "Europe/Rome",
  BGY: "Europe/Rome",
  PSA: "Europe/Rome",

  // Netherlands
  AMS: "Europe/Amsterdam",
  RTM: "Europe/Amsterdam",
  EIN: "Europe/Amsterdam",

  // Belgium
  BRU: "Europe/Brussels",
  CRL: "Europe/Brussels",

  // Switzerland
  ZRH: "Europe/Zurich",
  GVA: "Europe/Zurich",
  BSL: "Europe/Zurich",

  // Austria
  VIE: "Europe/Vienna",
  SZG: "Europe/Vienna",

  // Portugal
  LIS: "Europe/Lisbon",
  OPO: "Europe/Lisbon",
  FAO: "Europe/Lisbon",

  // Denmark
  CPH: "Europe/Copenhagen",
  BLL: "Europe/Copenhagen",
  AAL: "Europe/Copenhagen",

  // Sweden
  ARN: "Europe/Stockholm",
  GOT: "Europe/Stockholm",
  MMX: "Europe/Stockholm",

  // Norway
  OSL: "Europe/Oslo",
  BGO: "Europe/Oslo",
  TRD: "Europe/Oslo",

  // Finland
  HEL: "Europe/Helsinki",
  TMP: "Europe/Helsinki",

  // Poland
  WAW: "Europe/Warsaw",
  KRK: "Europe/Warsaw",
  GDN: "Europe/Warsaw",
  WRO: "Europe/Warsaw",
  POZ: "Europe/Warsaw",

  // Hungary
  BUD: "Europe/Budapest",

  // Czech Republic
  PRG: "Europe/Prague",

  // Greece
  ATH: "Europe/Athens",
  HER: "Europe/Athens",
  RHO: "Europe/Athens",
  SKG: "Europe/Athens",

  // Malta
  MLA: "Europe/Malta",

  // Lithuania
  VNO: "Europe/Vilnius",
  KUN: "Europe/Vilnius",
  PLQ: "Europe/Vilnius",

  // Latvia
  RIX: "Europe/Riga",

  // Estonia
  TLL: "Europe/Tallinn",

  // Iceland
  KEF: "Atlantic/Reykjavik",
}
