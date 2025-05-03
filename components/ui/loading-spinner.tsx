'use client'

interface LoadingSpinnerProps {
    size?: 'sm' | 'md' | 'lg'
    className?: string
}

export function LoadingSpinner({ size = 'md', className = '' }: LoadingSpinnerProps) {
    const sizeClasses = {
        sm: 'h-4 w-4',
        md: 'h-6 w-6',
        lg: 'h-8 w-8'
    }

    return (
        <div className={`relative ${sizeClasses[size]} ${className}`}>
            {/* Outer ring */}
            <div className="absolute inset-0 rounded-full border-2 border-white/20"></div>
            {/* Spinning gradient ring */}
            <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-white animate-spin-gradient"></div>
            {/* Inner pulsing circle */}
            <div className="absolute inset-2 rounded-full bg-white/20 animate-pulse"></div>
        </div>
    )
} 