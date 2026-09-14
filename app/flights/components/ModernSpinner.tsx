import { cn } from "@/lib/utils"

interface ModernSpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function ModernSpinner({ size = 'md', className }: ModernSpinnerProps) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6'
  }

  return (
    <div className={cn("relative", sizeClasses[size], className)}>
      {/* Modern gradient spinner with blur effect */}
      <div className="absolute inset-0 rounded-full bg-gradient-to-r from-[var(--vermillion)] via-[var(--vermillion)] to-[var(--vermillion-dk)] animate-spin">
        <div className="absolute inset-1 rounded-full bg-background"></div>
      </div>
      
      {/* Pulsing dot in center */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="h-1 w-1 bg-[var(--vermillion)] rounded-full animate-pulse"></div>
      </div>
      
      {/* Glow effect */}
      <div className="absolute inset-0 rounded-full bg-gradient-to-r from-[color-mix(in_srgb,var(--vermillion)_20%,transparent)] via-[color-mix(in_srgb,var(--vermillion)_20%,transparent)] to-[color-mix(in_srgb,var(--vermillion-dk)_20%,transparent)] blur-sm animate-pulse"></div>
    </div>
  )
}

// Alternative modern spinner with dots
export function ModernDotsSpinner({ size = 'md', className }: ModernSpinnerProps) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6'
  }

  return (
    <div className={cn("flex items-center space-x-1", className)}>
      <div className={cn("bg-[var(--vermillion)] rounded-full animate-bounce", sizeClasses[size])} 
           style={{ animationDelay: '0ms' }}></div>
      <div className={cn("bg-gradient-to-r from-[var(--vermillion)] to-[var(--vermillion-dk)] rounded-full animate-bounce", sizeClasses[size])} 
           style={{ animationDelay: '150ms' }}></div>
      <div className={cn("bg-gradient-to-r from-[var(--vermillion-dk)] to-[var(--vermillion)] rounded-full animate-bounce", sizeClasses[size])} 
           style={{ animationDelay: '300ms' }}></div>
    </div>
  )
}

// Modern wave spinner
export function ModernWaveSpinner({ size = 'md', className }: ModernSpinnerProps) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6'
  }

  return (
    <div className={cn("flex items-center space-x-1", className)}>
      {[...Array(3)].map((_, i) => (
        <div
          key={i}
          className={cn(
            "bg-[var(--vermillion)] rounded-sm animate-pulse",
            sizeClasses[size]
          )}
          style={{
            animationDelay: `${i * 100}ms`,
            animationDuration: '1s'
          }}
        />
      ))}
    </div>
  )
}





