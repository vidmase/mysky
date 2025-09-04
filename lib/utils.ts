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

export const getGreatCirclePoints = (start: [number, number], end: [number, number], numPoints: number = 100): [number, number][] => {
  const [lon1, lat1] = start.map(toRad);
  const [lon2, lat2] = end.map(toRad);

  const d = 2 * Math.asin(Math.sqrt(Math.pow(Math.sin((lat1 - lat2) / 2), 2) + Math.cos(lat1) * Math.cos(lat2) * Math.pow(Math.sin((lon1 - lon2) / 2), 2)));
  
  const points: [number, number][] = [];
  for (let i = 0; i <= numPoints; i++) {
    const f = i / numPoints;
    const A = Math.sin((1 - f) * d) / Math.sin(d);
    const B = Math.sin(f * d) / Math.sin(d);

    const x = A * Math.cos(lat1) * Math.cos(lon1) + B * Math.cos(lat2) * Math.cos(lon2);
    const y = A * Math.cos(lat1) * Math.sin(lon1) + B * Math.cos(lat2) * Math.sin(lon2);
    const z = A * Math.sin(lat1) + B * Math.sin(lat2);

    const lat = Math.atan2(z, Math.sqrt(x * x + y * y));
    const lon = Math.atan2(y, x);

    points.push([lon * 180 / Math.PI, lat * 180 / Math.PI]);
  }
  return points;
};

export const getBearing = (start: [number, number], end: [number, number]): number => {
    const [lon1, lat1] = start.map(toRad);
    const [lon2, lat2] = end.map(toRad);

    const y = Math.sin(lon2 - lon1) * Math.cos(lat2);
    const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(lon2 - lon1);
    const brng = Math.atan2(y, x) * 180 / Math.PI;
    return (brng + 360) % 360;
};
