/**
 * Utility functions for displaying flight information
 * Handles missing IATA codes and other flight data gracefully
 */

/**
 * Format an airport display with city and IATA code
 * Returns "City (IATA)" when IATA is available, otherwise just "City"
 * 
 * Examples:
 * - formatAirportDisplay("Bristol", "BRS") -> "Bristol (BRS)"
 * - formatAirportDisplay("Bristol", null) -> "Bristol"
 * - formatAirportDisplay("Bristol", "None") -> "Bristol"
 */
export function formatAirportDisplay(cityOrAirportName: string, iata: string | null | undefined): string {
  if (!iata || iata === "None" || iata === "null" || iata === "undefined") {
    return cityOrAirportName;
  }
  return `${cityOrAirportName} (${iata})`;
}

/**
 * Format an airport display with fallback to first 3 letters of name
 * Used when IATA is missing but you want to show something
 * 
 * Examples:
 * - formatAirportWithFallback("Bristol", "BRS") -> "Bristol (BRS)"
 * - formatAirportWithFallback("Bristol", null) -> "Bristol (BRI)"
 */
export function formatAirportWithFallback(cityOrAirportName: string, iata: string | null | undefined): string {
  if (!iata || iata === "None" || iata === "null" || iata === "undefined") {
    // Use first 3 uppercase letters of the airport name as fallback
    const fallback = cityOrAirportName.slice(0, 3).toUpperCase();
    return `${cityOrAirportName} (${fallback})`;
  }
  return `${cityOrAirportName} (${iata})`;
}

/**
 * Get just the IATA code with fallback
 * Returns the IATA code, or first 3 letters of airport name if missing
 */
export function getIataOrFallback(iata: string | null | undefined, airportName: string): string {
  if (!iata || iata === "None" || iata === "null" || iata === "undefined") {
    return airportName.slice(0, 3).toUpperCase();
  }
  return iata;
}

/**
 * Check if an IATA code is valid (not null, undefined, or "None")
 */
export function isValidIata(iata: string | null | undefined): iata is string {
  return !!iata && iata !== "None" && iata !== "null" && iata !== "undefined";
}
