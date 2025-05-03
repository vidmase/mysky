'use client'

import { Toaster, toast } from 'react-hot-toast'
import React, { createContext, useContext } from 'react'

type NotificationContextType = {
  showSuccess: (message: string) => void
  showError: (message: string) => void
  showWarning: (message: string) => void
  showInfo: (message: string) => void
}

const NotificationContext = createContext<NotificationContextType>({
  showSuccess: () => {},
  showError: () => {},
  showWarning: () => {},
  showInfo: () => {},
})

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const showSuccess = (message: string) => {
    toast.success(message, {
      duration: 3000,
      position: 'top-right',
      style: {
        background: '#10B981',
        color: 'white',
      },
    })
  }

  const showError = (message: string) => {
    toast.error(message, {
      duration: 4000,
      position: 'top-right',
      style: {
        background: '#EF4444',
        color: 'white',
      },
    })
  }

  const showWarning = (message: string) => {
    toast(message, {
      duration: 3000,
      position: 'top-right',
      icon: '⚠️',
      style: {
        background: '#F59E0B',
        color: 'white',
      },
    })
  }

  const showInfo = (message: string) => {
    toast(message, {
      duration: 3000,
      position: 'top-right',
      icon: 'ℹ️',
      style: {
        background: '#3B82F6',
        color: 'white',
      },
    })
  }

  return (
    <NotificationContext.Provider value={{ showSuccess, showError, showWarning, showInfo }}>
      {children}
      <Toaster />
    </NotificationContext.Provider>
  )
}

export const useNotification = () => {
  const context = useContext(NotificationContext)
  if (context === undefined) {
    throw new Error('useNotification must be used within a NotificationProvider')
  }
  return context
} 