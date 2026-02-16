import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/auth-context'

export const useDisabledUserModal = () => {
  const [show, setShow] = useState(false)
  const [checked, setChecked] = useState(false)
  const { user, signOut } = useAuth()

  useEffect(() => {
    const checkDisabled = async () => {
      if (user) {
        try {
          const res = await fetch('/api/check-disabled')
          const data = await res.json()
          if (data?.disabled) {
            setShow(true)
            await signOut()
            window.location.href = '/auth?disabled=1'
          } else {
            setShow(false)
          }
        } catch {
          setShow(false)
        }
      } else {
        setShow(false)
      }
      setChecked(true)
    }
    checkDisabled()
    const interval = setInterval(checkDisabled, 30000)
    return () => clearInterval(interval)
  }, [user, signOut])

  // Modal is now only a fallback in case redirect fails
  const modal = show ? (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <div className="bg-blue-900 rounded-2xl shadow-2xl p-8 max-w-md w-full text-center border-2 border-red-600">
        <h2 className="text-2xl font-bold text-red-400 mb-4">Account Disabled</h2>
        <p className="text-cyan-100 mb-6">
          Sorry, your account has been disabled by an administrator.<br />
          Please contact support if you believe this is a mistake.
        </p>
      </div>
    </div>
  ) : null

  return { DisabledUserModal: modal, isDisabled: show }
}