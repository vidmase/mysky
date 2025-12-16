"use client"

import { useState, useEffect, useRef, useMemo } from 'react';
import mapboxgl, { Map as MapboxMap } from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { createClient } from '../lib/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { getGreatCirclePoints } from '@/lib/utils';
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

// --- COMPONENT ---
export default function MapPage() {
  const mapContainer = useRef<HTMLDivElement | null>(null);
  const map = useRef<MapboxMap | null>(null);
  const animationRef = useRef<number>(0);
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
    if (map.current) return;

    const containerEl = mapContainer.current as any;
    try {
      if (containerEl && containerEl._map && typeof containerEl._map.remove === 'function') {
        containerEl._map.remove();
      }
    } catch (_) {}
    try {
      while (mapContainer.current.firstChild) {
        mapContainer.current.removeChild(mapContainer.current.firstChild);
      }
    } catch (_) {}

    mapboxgl.accessToken = MAPBOX_ACCESS_TOKEN;

    const createMap = () => new MapboxMap({
      container: mapContainer.current as HTMLElement,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: [20, 30],
      zoom: 1.5,
      projection: { name: 'globe' }
    });

    try {
      map.current = createMap();
      
      map.current.on('style.load', () => {
        map.current?.setFog({
          color: 'rgb(186, 210, 235)',
          'high-color': 'rgb(36, 92, 223)',
          'horizon-blend': 0.02,
          'space-color': 'rgb(11, 11, 25)',
          'star-intensity': 0.6
        });
      });

    } catch (err) {
      console.error('Map init error:', err);
    }

    return () => {
      try { map.current?.remove(); } catch (_) {}
      map.current = null;
    };
  }, []);

  // --- MAP LAYERS AND ANIMATION ---
  useEffect(() => {
    const currentMap = map.current;
    if (!currentMap) return;

    const updateLayers = () => {
        if (!currentMap.isStyleLoaded()) {
            currentMap.once('style.load', updateLayers);
            return;
        }
        
        const sourceId = 'flight-paths';
        const bgLayerId = 'flight-paths-bg';
        const animLayerId = 'flight-paths-anim';

        if (currentMap.getLayer('flight-paths-layer')) {
            currentMap.removeLayer('flight-paths-layer');
        }

        const geojson: GeoJSON.FeatureCollection<GeoJSON.LineString, FlightPathFeature['properties']> = {
          type: 'FeatureCollection',
          features: flightPathFeatures,
        };

        const source = currentMap.getSource(sourceId) as mapboxgl.GeoJSONSource;

        if (source) {
          source.setData(geojson);
        } else {
          currentMap.addSource(sourceId, { type: 'geojson', data: geojson });
        }

        // Static Background Layer
        if (!currentMap.getLayer(bgLayerId)) {
             currentMap.addLayer({
                id: bgLayerId,
                type: 'line',
                source: sourceId,
                layout: {
                    'line-join': 'round',
                    'line-cap': 'round'
                },
                paint: {
                    'line-color': '#ffffff',
                    'line-opacity': 0.1,
                    'line-width': 1
                }
            });
        }

        // Animated Layer
        if (!currentMap.getLayer(animLayerId)) {
            currentMap.addLayer({
                id: animLayerId,
                type: 'line',
                source: sourceId,
                layout: {
                    'line-join': 'round',
                    'line-cap': 'round'
                },
                paint: {
                    'line-color': [
                        'case',
                        ['boolean', ['get', 'isHighlighted'], false],
                        '#FFD700', // Gold highlight
                        '#4dabf7'  // Bright Blue
                    ],
                    'line-width': [
                        'case',
                        ['boolean', ['get', 'isHighlighted'], false],
                        3,
                        2
                    ],
                    'line-opacity': [
                         'case',
                        ['boolean', ['get', 'isHighlighted'], false],
                        1,
                        0.7
                    ],
                    'line-dasharray': [0, 4, 3]
                }
            });
             currentMap.setPaintProperty(animLayerId, 'line-dasharray', [2, 4]);
        }

        // Animation Loop
        const startTime = Date.now();
        const animate = () => {
            const time = Date.now() - startTime;
            const dashArray = [2, 4];
            const totalLength = dashArray[0] + dashArray[1];
            // Animate offset to make it flow
            const offset = (totalLength - (time / 50) % totalLength); 
            
            if (currentMap.getLayer(animLayerId)) {
                 currentMap.setPaintProperty(animLayerId, 'line-dashoffset', offset);
                 animationRef.current = requestAnimationFrame(animate);
            }
        };

        if (animationRef.current) cancelAnimationFrame(animationRef.current);
        animationRef.current = requestAnimationFrame(animate);
    };

    updateLayers();

    return () => {
        if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [flightPathFeatures]);

  // --- MAP INTERACTIVITY ---
  useEffect(() => {
    const currentMap = map.current;
    if (!currentMap || !airports.length) return;

    const popup = new mapboxgl.Popup({
      closeButton: false,
      closeOnClick: false,
      className: 'bg-background text-foreground'
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
            <div class="text-slate-900 dark:text-slate-100 p-2">
              <div class="font-bold text-base mb-1">${fromAirport.city} ✈ ${toAirport.city}</div>
              <div class="text-xs opacity-80">
                 ${from} - ${to}<br/>
                 Flights: ${count}
              </div>
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

    const layerId = 'flight-paths-bg';
    
    const attachListeners = () => {
       if (currentMap.getLayer(layerId)) {
          currentMap.on('mousemove', layerId, handleMouseMove);
          currentMap.on('mouseleave', layerId, handleMouseLeave);
       } else {
          // If layer not ready, retry slightly later or wait for style load
          // But usually layer is added in the other effect immediately if style is loaded
          if (currentMap.isStyleLoaded()) {
             // If style loaded but layer not there, it might be added next tick
             setTimeout(() => {
                 if (currentMap.getLayer(layerId)) {
                     currentMap.on('mousemove', layerId, handleMouseMove);
                     currentMap.on('mouseleave', layerId, handleMouseLeave);
                 }
             }, 100);
          } else {
             currentMap.once('style.load', attachListeners);
          }
       }
    }
    
    attachListeners();

    return () => {
      if (currentMap.isStyleLoaded()) {
           try {
              currentMap.off('mousemove', layerId, handleMouseMove);
              currentMap.off('mouseleave', layerId, handleMouseLeave);
           } catch (_) {}
           popup.remove();
      }
    };
  }, [airports, flightPathFeatures]);

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
