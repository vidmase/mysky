import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export function DisabledUserMessage() {
  const router = useRouter();
  const supabase = createClientComponentClient();

  useEffect(() => {
    const handleDisabledUser = async () => {
      const searchParams = new URLSearchParams(window.location.search);
      const isDisabled = searchParams.get('disabled') === '1';
      
      if (isDisabled) {
        await supabase.auth.signOut();
      }
    };

    handleDisabledUser();
  }, [supabase.auth]);

  // Get disabled status from URL
  const searchParams = new URLSearchParams(window.location.search);
  const isDisabled = searchParams.get('disabled') === '1';
  
  if (!isDisabled) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <div className="bg-blue-900 rounded-2xl shadow-2xl p-8 max-w-md w-full text-center border-2 border-red-600">
        <h2 className="text-2xl font-bold text-red-400 mb-4">Account Disabled</h2>
        <p className="text-cyan-100 mb-6">
          Your account has been disabled by an administrator.<br />
          Please contact support if you believe this is a mistake.
        </p>
        <button
          onClick={() => router.push('/auth')}
          className="px-4 py-2 bg-blue-700 text-white rounded-lg hover:bg-blue-600 transition"
        >
          Return to Login
        </button>
      </div>
    </div>
  );
} 