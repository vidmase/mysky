import { useEffect, useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useRouter } from 'next/router';

interface Flight {
  id: string;
  created_at: string;
  // Add other flight properties here
}

export default function FlightsList() {
  const [flights, setFlights] = useState<Flight[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClientComponentClient();
  const router = useRouter();

  useEffect(() => {
    const fetchFlights = async () => {
      try {
        // First check if user is disabled
        const { data: profile } = await supabase
          .from('profiles')
          .select('disabled')
          .single();

        if (profile?.disabled) {
          // If disabled, clear data and redirect
          setFlights([]);
          router.push('/auth?disabled=1');
          return;
        }

        // Only fetch flights if user is not disabled
        const { data, error } = await supabase
          .from('flights')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) throw error;
        setFlights(data || []);
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'An error occurred';
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    fetchFlights();

    // Set up realtime subscription
    const subscription = supabase
      .channel('flights')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'flights' },
        async (payload) => {
          // Check disabled status before processing updates
          const { data: profile } = await supabase
            .from('profiles')
            .select('disabled')
            .single();

          if (profile?.disabled) {
            // If disabled, clear data and redirect
            setFlights([]);
            subscription.unsubscribe();
            router.push('/auth?disabled=1');
            return;
          }

          // Process updates only if not disabled
          fetchFlights();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase, router]);

  if (loading) return <div>Loading flights...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div className="flights-list">
      {flights.map((flight) => (
        <div key={flight.id} className="flight-item">
          {/* Add your flight item rendering code here */}
          <span>{new Date(flight.created_at).toLocaleString()}</span>
        </div>
      ))}
    </div>
  );
} 