import '../app/globals.css';
import type { AppProps } from 'next/app';
import { useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

function useHeartbeat() {
  const supabase = createClientComponentClient();
  useEffect(() => {
    const interval = setInterval(async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from('profiles')
          .update({ last_active_at: new Date().toISOString() })
          .eq('id', user.id);
      }
    }, 30000); // every 30 seconds
    return () => clearInterval(interval);
  }, []);
}

export default function MyApp({ Component, pageProps }: AppProps) {
  useHeartbeat();
  return <Component {...pageProps} />;
} 