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
            <div className="absolute inset-0 rounded-full border-2 border-[var(--rule)]"></div>
            {/* Spinning gradient ring */}
            <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-[var(--vermillion)] animate-spin-gradient"></div>
            {/* Inner pulsing circle */}
            <div className="absolute inset-2 rounded-full bg-[var(--wash-ink)] animate-pulse"></div>
        </div>
    )
} 