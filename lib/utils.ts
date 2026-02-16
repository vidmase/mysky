import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import countryList from 'react-select-country-list';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const getCountryCode = (countryName: string): string => {
  const country = countryList().getLabel(countryName) || countryList().getValue(countryName);
  if (country) {
    return country.toLowerCase();
  }
  // Manual fallbacks
  const lowerCountryName = countryName.toLowerCase();
  if (lowerCountryName.includes('slovakia')) return 'sk';
  if (lowerCountryName.includes('malta')) return 'mt';
  return 'xx'; // Return a placeholder for unknown countries
};

const toRad = (deg: number) => deg * Math.PI / 180;

export const haversineDistance = (coords1: [number, number], coords2: [number, number]): number => {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(coords2[1] - coords1[1]);
  const dLon = toRad(coords2[0] - coords1[0]);
  const lat1 = toRad(coords1[1]);
  const lat2 = toRad(coords2[1]);

  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
};

/**
 * Calculate great circle (geodesic) path between two points on Earth's surface
 * Uses spherical interpolation for accurate geodesic lines
 * Handles edge cases like crossing the date line and polar regions
 */
export const getGreatCirclePoints = (
  start: [number, number], 
  end: [number, number], 
  numPoints: number = 200
): [number, number][] => {
  const [lon1, lat1] = start;
  const [lon2, lat2] = end;

  // Convert to radians
  const lat1Rad = toRad(lat1);
  const lon1Rad = toRad(lon1);
  const lat2Rad = toRad(lat2);
  const lon2Rad = toRad(lon2);

  // Calculate great circle distance
  const dLat = lat2Rad - lat1Rad;
  const dLon = lon2Rad - lon1Rad;
  
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1Rad) * Math.cos(lat2Rad) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = c; // Angular distance in radians

  // Handle edge case: if points are very close, return simple line
  if (distance < 0.001) {
    return [start, end];
  }

  // Calculate initial bearing
  const y = Math.sin(dLon) * Math.cos(lat2Rad);
  const x = Math.cos(lat1Rad) * Math.sin(lat2Rad) - 
            Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLon);
  const initialBearing = Math.atan2(y, x);

  // Generate points along the great circle
  const points: [number, number][] = [start];
  
  // Use adaptive number of points based on distance for smoother curves
  const adaptivePoints = Math.max(numPoints, Math.ceil(distance * 180 / Math.PI * 2));
  
  for (let i = 1; i < adaptivePoints; i++) {
    const f = i / adaptivePoints;
    
    // Spherical interpolation using slerp (spherical linear interpolation)
    const A = Math.sin((1 - f) * distance) / Math.sin(distance);
    const B = Math.sin(f * distance) / Math.sin(distance);

    // Calculate point on sphere
    const x = A * Math.cos(lat1Rad) * Math.cos(lon1Rad) + 
              B * Math.cos(lat2Rad) * Math.cos(lon2Rad);
    const y = A * Math.cos(lat1Rad) * Math.sin(lon1Rad) + 
              B * Math.cos(lat2Rad) * Math.sin(lon2Rad);
    const z = A * Math.sin(lat1Rad) + B * Math.sin(lat2Rad);

    // Convert back to lat/lon
    const lat = Math.atan2(z, Math.sqrt(x * x + y * y));
    const lon = Math.atan2(y, x);

    // Normalize longitude to [-180, 180]
    let normalizedLon = (lon * 180 / Math.PI);
    if (normalizedLon > 180) normalizedLon -= 360;
    if (normalizedLon < -180) normalizedLon += 360;

    points.push([normalizedLon, lat * 180 / Math.PI]);
  }
  
  points.push(end);
  
  // Handle date line crossing - split into segments if needed
  const result: [number, number][] = [];
  for (let i = 0; i < points.length - 1; i++) {
    const p1 = points[i];
    const p2 = points[i + 1];
    
    // Check if crossing the date line (180/-180 meridian)
    if (Math.abs(p1[0] - p2[0]) > 180) {
      // Cross the date line - add intermediate point
      const midLon = p1[0] > 0 ? 180 : -180;
      const midLat = p1[1] + (p2[1] - p1[1]) * 0.5;
      result.push(p1);
      result.push([midLon, midLat]);
      result.push([p2[0] > 0 ? -180 : 180, midLat]);
    } else {
      result.push(p1);
    }
  }
  result.push(points[points.length - 1]);
  
  return result;
};

export const getBearing = (start: [number, number], end: [number, number]): number => {
    const [lon1, lat1] = start.map(toRad);
    const [lon2, lat2] = end.map(toRad);

    const y = Math.sin(lon2 - lon1) * Math.cos(lat2);
    const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(lon2 - lon1);
    const brng = Math.atan2(y, x) * 180 / Math.PI;
    return (brng + 360) % 360;
};
