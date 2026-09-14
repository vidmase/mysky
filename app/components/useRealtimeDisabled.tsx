'use client'
import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { Dialog } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { CalendarX, Clock, AlertTriangle } from 'lucide-react'

export const useRealtimeDisabled = () => {
  const [show, setShow] = useState(false)
  const [loading, setLoading] = useState(false)
  const [remainingTime, setRemainingTime] = useState<string | null>(null)
  const [isPermanent, setIsPermanent] = useState(true)
  const [endDate, setEndDate] = useState<Date | null>(null)
  const { user, signOut } = useAuth()

  const formatTimeRemaining = (endDateStr: string) => {
    const end = new Date(endDateStr);
    const now = new Date();
    const diffMs = end.getTime() - now.getTime();
    if (diffMs <= 0) return null;

    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHrs = Math.floor(diffMin / 60);
    const diffDays = Math.floor(diffHrs / 24);

    if (diffDays > 0) return `${diffDays} day${diffDays !== 1 ? 's' : ''}`;
    if (diffHrs > 0) return `${diffHrs} hour${diffHrs !== 1 ? 's' : ''}`;
    if (diffMin > 0) return `${diffMin} minute${diffMin !== 1 ? 's' : ''}`;
    return 'less than a minute';
  };

  useEffect(() => {
    if (!user) return

    let timer: NodeJS.Timeout | null = null

    const checkDisabled = async () => {
      try {
        const res = await fetch('/api/check-disabled')
        const data = await res.json()

        if (data?.disabled) {
          if (data.deactivation_end_date) {
            const deactivationEnd = new Date(data.deactivation_end_date);
            const now = new Date();

            if (deactivationEnd > now) {
              setIsPermanent(false);
              setEndDate(deactivationEnd);
              setRemainingTime(formatTimeRemaining(data.deactivation_end_date));
              setShow(true);

              if (timer) clearInterval(timer);
              timer = setInterval(() => {
                const timeLeft = formatTimeRemaining(data.deactivation_end_date);
                if (timeLeft) {
                  setRemainingTime(timeLeft);
                } else {
                  window.location.reload();
                }
              }, 60000);
            }
          } else {
            setIsPermanent(true);
            setShow(true);
          }
        }
      } catch {
        // Silently ignore check failures
      }
    }

    checkDisabled()

    return () => {
      if (timer) clearInterval(timer)
    }
  }, [user])

  const handleAcknowledge = async () => {
    setLoading(true)
    try {
      await signOut()
      window.location.href = `/auth?disabled=1${isPermanent ? '' : '&temporary=1'}`
    } catch (error) {
      console.error('Error signing out:', error)
      window.location.href = `/auth?disabled=1${isPermanent ? '' : '&temporary=1'}`
    }
  }

  const DisabledDialog = show ? (
    <Dialog open={show} onOpenChange={setShow}>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
        <div className="bg-[var(--vermillion-dk)] border border-[var(--vermillion-dk)] rounded-xl p-6 shadow-2xl max-w-md w-full mx-4">
          <div className="flex items-center gap-3 mb-4">
            <AlertTriangle className="h-8 w-8 text-[var(--vermillion-dk)]" />
            <h2 className="text-xl font-bold text-[var(--ink)]">Account Deactivated</h2>
          </div>

          <p className="text-[var(--vermillion-dk)] mb-4">
            {isPermanent ? (
              "Your account has been deactivated by an administrator. You no longer have access to the system."
            ) : (
              "Your account has been temporarily deactivated by an administrator."
            )}
          </p>

          {!isPermanent && remainingTime && (
            <div className="bg-[var(--vermillion-dk)] border border-[var(--vermillion-dk)] rounded-lg p-4 mb-4">
              <div className="flex items-center gap-2 text-[var(--brass)] font-medium mb-2">
                <Clock className="h-5 w-5" />
                <span>Temporary Deactivation</span>
              </div>
              <p className="text-[var(--vermillion-dk)]">
                Your account will be automatically reactivated in <strong className="text-[var(--ink)]">{remainingTime}</strong>.
              </p>
              {endDate && (
                <div className="flex items-center gap-2 mt-2 text-[var(--vermillion-dk)] text-sm">
                  <CalendarX className="h-4 w-4" />
                  <span>Ends on: {endDate.toLocaleString()}</span>
                </div>
              )}
            </div>
          )}

          <p className="text-[var(--vermillion-dk)] text-sm mb-6">
            If you believe this is a mistake, please contact your system administrator.
          </p>

          <Button
            onClick={handleAcknowledge}
            className="w-full bg-[var(--vermillion-dk)] hover:bg-[var(--vermillion)] text-[var(--paper)] py-2 rounded-lg transition"
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