"use client"

import { useState, useEffect, useRef, useMemo } from 'react';
import mapboxgl, { Map as MapboxMap } from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { createClient } from '../lib/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { haversineDistance, getGreatCirclePoints } from '@/lib/utils';
import { NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN as MAPBOX_ACCESS_TOKEN } from '@/lib/env';

// --- TYPE DEFINITIONS ---
type Flight = {
  id: string;
  departure_airport: Airport;
  arrival_airport: Airport;
};

type Airport = {
  iata: string;
  name: string;
  city: string;
  country: string;
  latitude: number;
  longitude: number;
};

type Route = {
  from: string;
  to: string;
  count: number;
};

interface FlightPathFeature extends GeoJSON.Feature<GeoJSON.LineString> {
  properties: {
    from: string;
    to: string;
    count: number;
    isHighlighted: boolean;
  };
}

// --- CONSTANTS ---
// Mapbox token sourced via centralized env helper

// --- COMPONENT ---
export default function MapPage() {
  const mapContainer = useRef<HTMLDivElement | null>(null);
  const map = useRef<MapboxMap | null>(null);
  const [loading, setLoading] = useState(true);
  const [flights, setFlights] = useState<Flight[]>([]);
  const [airports, setAirports] = useState<Airport[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [highlightedRoute, setHighlightedRoute] = useState<string | null>(null);
  const { toast } = useToast();

  // --- DATA FETCHING ---
  useEffect(() => {
    const fetchFlightData = async () => {
      if (!MAPBOX_ACCESS_TOKEN) {
        toast({ title: 'Configuration Error', description: 'Mapbox token not found.', variant: 'destructive' });
        setLoading(false);
        return;
      }

      const supabase = createClient();
      setLoading(true);

      const { data, error } = await supabase.from('flights').select(`
        id,
        departure_airport:airports!flights_departure_airport_fkey(iata, name, city, country, latitude, longitude),
        arrival_airport:airports!flights_arrival_airport_fkey(iata, name, city, country, latitude, longitude)
      `);

      if (error) {
        toast({ title: 'Error fetching flights', description: error.message, variant: 'destructive' });
        setFlights([]);
      } else if (data) {
        setFlights(data as Flight[]);
      }
      setLoading(false);
    };

    fetchFlightData();
  }, [toast]);

  // --- DATA PROCESSING ---
  useEffect(() => {
    const allAirports = new global.Map<string, Airport>();
    const routeCounts = new global.Map<string, number>();

    flights.forEach(flight => {
      if (flight.departure_airport && flight.arrival_airport) {
        allAirports.set(flight.departure_airport.iata, flight.departure_airport);
        allAirports.set(flight.arrival_airport.iata, flight.arrival_airport);

        const routeKey = `${flight.departure_airport.iata}-${flight.arrival_airport.iata}`;
        routeCounts.set(routeKey, (routeCounts.get(routeKey) || 0) + 1);
      }
    });

    setAirports(Array.from(allAirports.values()));
    setRoutes(Array.from(routeCounts.entries()).map(([key, count]) => {
      const [from, to] = key.split('-');
      return { from, to, count };
    }));
  }, [flights]);

  const flightPathFeatures = useMemo((): FlightPathFeature[] => {
    return routes.map(route => {
      const fromAirport = airports.find(a => a.iata === route.from);
      const toAirport = airports.find(a => a.iata === route.to);

      if (!fromAirport || !toAirport) return null;

      const points = getGreatCirclePoints(
        [fromAirport.longitude, fromAirport.latitude],
        [toAirport.longitude, toAirport.latitude]
      );

      // Coerce to strict [number, number][] for GeoJSON typing
      const coordinates = (points as any[]).map((p: any) => [Number(p[0]), Number(p[1])] as [number, number]);

      const feature: FlightPathFeature = {
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates,
        },
        properties: {
          from: route.from,
          to: route.to,
          count: route.count,
          isHighlighted: highlightedRoute === `${route.from}-${route.to}`,
        },
      };
      return feature;
    }).filter((feature): feature is FlightPathFeature => feature !== null);
  }, [routes, airports, highlightedRoute]);

  // --- MAP INITIALIZATION ---
  useEffect(() => {
    if (!mapContainer.current || !MAPBOX_ACCESS_TOKEN) return;
    if (map.current) return; // already initialized

    const containerEl = mapContainer.current as any;

    // Defensive: if a previous map instance is attached to this container (Fast Refresh/StrictMode), remove it
    try {
      if (containerEl && containerEl._map && typeof containerEl._map.remove === 'function') {
        containerEl._map.remove();
      }
    } catch (_) {
      // ignore
    }

    // Also clear any leftover DOM children
    try {
      while (mapContainer.current.firstChild) {
        mapContainer.current.removeChild(mapContainer.current.firstChild);
      }
    } catch (_) {
      // ignore
    }

    mapboxgl.accessToken = MAPBOX_ACCESS_TOKEN;

    const createMap = () => new MapboxMap({
      container: mapContainer.current as HTMLElement,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: [4, 34],
      zoom: 1.5,
    });

    try {
      map.current = createMap();
      map.current.on('load', () => {
        // Add sources and layers here
      });
    } catch (err) {
      const message = (err as Error)?.message || '';
      if (message.includes('Map container is already initialized') && mapContainer.current) {
        // Clear and retry once
        mapContainer.current.innerHTML = '';
        map.current = createMap();
      } else {
        console.error('Map init error:', err);
      }
    }

    // Cleanup
    return () => {
      try { map.current?.remove(); } catch (_) {}
      map.current = null;
      if (mapContainer.current) {
        try { mapContainer.current.innerHTML = ''; } catch (_) {}
      }
    };
  }, []); // run once

  // --- MAP LAYERS AND SOURCES ---
  useEffect(() => {
    const currentMap = map.current;
    if (!currentMap || !currentMap.isStyleLoaded()) return;

    const sourceId = 'flight-paths';
    const layerId = 'flight-paths-layer';

    const source = currentMap.getSource(sourceId) as mapboxgl.GeoJSONSource;

    const geojson: GeoJSON.FeatureCollection<GeoJSON.LineString, FlightPathFeature['properties']> = {
      type: 'FeatureCollection',
      features: flightPathFeatures,
    };

    if (source) {
      source.setData(geojson);
    } else {
      currentMap.addSource(sourceId, { type: 'geojson', data: geojson });
      currentMap.addLayer({
        id: layerId,
        type: 'line',
        source: sourceId,
        paint: {
          'line-color': [
            'case',
            ['boolean', ['get', 'isHighlighted'], false],
            '#FFD700', // Highlight color
            '#FFFFFF'
          ],
          'line-width': [
            'case',
            ['boolean', ['get', 'isHighlighted'], false],
            2.5,
            1
          ],
          'line-opacity': [
            'case',
            ['boolean', ['get', 'isHighlighted'], false],
            0.9,
            0.4
          ],
        },
      });
    }
  }, [flightPathFeatures]);

  // --- MAP INTERACTIVITY ---
  useEffect(() => {
    const currentMap = map.current;
    if (!currentMap || !airports.length) return;

    const popup = new mapboxgl.Popup({
      closeButton: false,
      closeOnClick: false,
    });

    const handleMouseMove = (e: mapboxgl.MapLayerMouseEvent) => {
      if (e.features && e.features.length > 0) {
        currentMap.getCanvas().style.cursor = 'pointer';
        const feature = e.features[0] as unknown as FlightPathFeature;
        const { from, to, count } = feature.properties;

        const fromAirport = airports.find(a => a.iata === from);
        const toAirport = airports.find(a => a.iata === to);

        if (fromAirport && toAirport) {
          const description = `
            <div class="text-sm">
              <strong>${fromAirport.name} (${from})</strong>
              <br/>
              to <strong>${toAirport.name} (${to})</strong>
              <br/>
              Flights: <strong>${count}</strong>
            </div>
          `;
          popup.setLngLat(e.lngLat).setHTML(description).addTo(currentMap);
        }

        setHighlightedRoute(`${from}-${to}`);
      }
    };

    const handleMouseLeave = () => {
      currentMap.getCanvas().style.cursor = '';
      popup.remove();
      setHighlightedRoute(null);
    };

    currentMap.on('mousemove', 'flight-paths-layer', handleMouseMove);
    currentMap.on('mouseleave', 'flight-paths-layer', handleMouseLeave);

    return () => {
      if (currentMap.isStyleLoaded()) {
          currentMap.off('mousemove', 'flight-paths-layer', handleMouseMove);
          currentMap.off('mouseleave', 'flight-paths-layer', handleMouseLeave);
          popup.remove();
      }
    };
  }, [airports, flightPathFeatures]); // Rerun if airports or features change

  // --- RENDER ---
  if (!MAPBOX_ACCESS_TOKEN) {
    return <div className="p-4">Mapbox access token is not configured.</div>;
  }

  return (
    <div className="relative w-full h-screen">
      {loading && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10">
          <Skeleton className="h-10 w-48 rounded-md" />
        </div>
      )}
      <div ref={mapContainer} className="w-full h-full" />
    </div>
  );
}
