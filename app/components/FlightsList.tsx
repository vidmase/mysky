'use client'
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';

interface Flight {
  id: string;
  created_at: string;
}

export default function FlightsList() {
  const [flights, setFlights] = useState<Flight[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!user) {
      setFlights([]);
      setLoading(false);
      return;
    }

    const fetchFlights = async () => {
      try {
        const res = await fetch('/api/flights');
        if (!res.ok) {
          if (res.status === 401) {
            setFlights([]);
            setLoading(false);
            return;
          }
          throw new Error('Failed to fetch flights');
        }
        const data = await res.json();
        setFlights(data.data || data || []);
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'An error occurred';
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    fetchFlights();
  }, [user]);

  if (loading) return <div>Loading flights...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div className="flights-list">
      {flights.map((flight) => (
        <div key={flight.id} className="flight-item">
          <span>{new Date(flight.created_at).toLocaleString()}</span>
        </div>
      ))}
    </div>
  );
}