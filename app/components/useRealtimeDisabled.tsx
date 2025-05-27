import { useEffect, useState } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Dialog } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { CalendarX, Clock, AlertTriangle } from 'lucide-react'

export const useRealtimeDisabled = () => {
  const [show, setShow] = useState(false)
  const [loading, setLoading] = useState(false)
  const [remainingTime, setRemainingTime] = useState<string | null>(null)
  const [isPermanent, setIsPermanent] = useState(true)
  const [endDate, setEndDate] = useState<Date | null>(null)
  const supabase = createClientComponentClient()

  // Format time remaining in a human-readable way
  const formatTimeRemaining = (endDateStr: string) => {
    const end = new Date(endDateStr);
    const now = new Date();
    
    // Calculate the difference in milliseconds
    const diffMs = end.getTime() - now.getTime();
    
    if (diffMs <= 0) return null; // Already expired
    
    // Convert to minutes, hours, and days
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHrs = Math.floor(diffMin / 60);
    const diffDays = Math.floor(diffHrs / 24);
    
    // Format based on the duration
    if (diffDays > 0) {
      return `${diffDays} day${diffDays !== 1 ? 's' : ''}`;
    } else if (diffHrs > 0) {
      return `${diffHrs} hour${diffHrs !== 1 ? 's' : ''}`;
    } else if (diffMin > 0) {
      return `${diffMin} minute${diffMin !== 1 ? 's' : ''}`;
    } else {
      return 'less than a minute';
    }
  };

  useEffect(() => {
    let subscription: any
    let userId: string | null = null
    let timer: NodeJS.Timeout | null = null

    const setup = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      userId = user.id

      // First check if already disabled
      const { data: profile } = await supabase
        .from('profiles')
        .select('disabled, deactivation_end_date')
        .eq('id', userId)
        .single()
        
      if (profile?.disabled) {
        if (profile.deactivation_end_date) {
          const deactivationEnd = new Date(profile.deactivation_end_date);
          const now = new Date();
          
          if (deactivationEnd > now) {
            // Account is temporarily disabled
            setIsPermanent(false);
            setEndDate(deactivationEnd);
            setRemainingTime(formatTimeRemaining(profile.deactivation_end_date));
            setShow(true);
            
            // Set up a timer to update the remaining time
            timer = setInterval(() => {
              const timeLeft = formatTimeRemaining(profile.deactivation_end_date);
              if (timeLeft) {
                setRemainingTime(timeLeft);
              } else {
                // Time expired, refresh the page to allow login
                window.location.reload();
              }
            }, 60000); // Update every minute
          }
        } else {
          // Account is permanently disabled
          setIsPermanent(true);
          setShow(true);
        }
        return;
      }

      // Subscribe to changes on this user's profile
      subscription = supabase
        .channel('realtime-disabled')
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'profiles',
            filter: `id=eq.${userId}`,
          },
          (payload: any) => {
            if (payload.new.disabled) {
              if (payload.new.deactivation_end_date) {
                // Account is temporarily disabled
                const deactivationEnd = new Date(payload.new.deactivation_end_date);
                const now = new Date();
                
                if (deactivationEnd > now) {
                  setIsPermanent(false);
                  setEndDate(deactivationEnd);
                  setRemainingTime(formatTimeRemaining(payload.new.deactivation_end_date));
                  
                  // Set up a timer to update the remaining time
                  if (timer) clearInterval(timer);
                  timer = setInterval(() => {
                    const timeLeft = formatTimeRemaining(payload.new.deactivation_end_date);
                    if (timeLeft) {
                      setRemainingTime(timeLeft);
                    } else {
                      // Time expired, refresh the page to allow login
                      window.location.reload();
                    }
                  }, 60000); // Update every minute
                }
              } else {
                // Account is permanently disabled
                setIsPermanent(true);
              }
              setShow(true);
            }
          }
        )
        .subscribe()
    }

    setup()

    return () => {
      if (subscription) supabase.removeChannel(subscription)
      if (timer) clearInterval(timer)
    }
  }, [supabase])

  const handleAcknowledge = async () => {
    setLoading(true)
    try {
      await supabase.auth.signOut()
      window.location.href = `/auth?disabled=1${isPermanent ? '' : '&temporary=1'}`
    } catch (error) {
      console.error('Error signing out:', error)
      window.location.href = `/auth?disabled=1${isPermanent ? '' : '&temporary=1'}`
    }
  }

  // Render the dialog component
  const DisabledDialog = show ? (
    <Dialog open={show} onOpenChange={setShow}>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
        <div className="bg-gradient-to-br from-red-950 to-red-900 border border-red-800 rounded-xl p-6 shadow-2xl max-w-md w-full mx-4">
          <div className="flex items-center gap-3 mb-4">
            <AlertTriangle className="h-8 w-8 text-red-400" />
            <h2 className="text-xl font-bold text-white">Account Deactivated</h2>
          </div>
          
          <p className="text-red-200 mb-4">
            {isPermanent ? (
              "Your account has been deactivated by an administrator. You no longer have access to the system."
            ) : (
              "Your account has been temporarily deactivated by an administrator."
            )}
          </p>
          
          {!isPermanent && remainingTime && (
            <div className="bg-red-950 border border-red-800 rounded-lg p-4 mb-4">
              <div className="flex items-center gap-2 text-amber-400 font-medium mb-2">
                <Clock className="h-5 w-5" />
                <span>Temporary Deactivation</span>
              </div>
              <p className="text-red-200">
                Your account will be automatically reactivated in <strong className="text-white">{remainingTime}</strong>.
              </p>
              {endDate && (
                <div className="flex items-center gap-2 mt-2 text-red-300 text-sm">
                  <CalendarX className="h-4 w-4" />
                  <span>Ends on: {endDate.toLocaleString()}</span>
                </div>
              )}
            </div>
          )}
          
          <p className="text-red-300 text-sm mb-6">
            If you believe this is a mistake, please contact your system administrator.
          </p>
          
          <Button
            onClick={handleAcknowledge}
            className="w-full bg-red-700 hover:bg-red-600 text-white py-2 rounded-lg transition"
            disabled={loading}
          >
            {loading ? "Signing out..." : "Sign Out"}
          </Button>
        </div>
      </div>
    </Dialog>
  ) : null;

  return DisabledDialog;
} 