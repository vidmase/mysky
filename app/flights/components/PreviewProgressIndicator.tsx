import { Mail, Search, CheckCircle } from "lucide-react"
import { ModernSpinner } from "./ModernSpinner"
import { cn } from "@/lib/utils"

interface PreviewProgressIndicatorProps {
  progress: {
    step: string
    message: string
  } | null
  isVisible: boolean
}

const stepConfig = {
  connecting: { icon: ModernSpinner, color: "text-[var(--vermillion)]", bgColor: "bg-[var(--wash-accent)]" },
  searching: { icon: Search, color: "text-[var(--vermillion)]", bgColor: "bg-[var(--wash-accent)]" },
  processing: { icon: Mail, color: "text-[var(--brass)]", bgColor: "bg-[var(--wash-brass)]" },
  complete: { icon: CheckCircle, color: "text-[var(--jade)]", bgColor: "bg-[var(--wash-jade)]" }
}

export function PreviewProgressIndicator({ progress, isVisible }: PreviewProgressIndicatorProps) {
  if (!isVisible || !progress) return null

  const config = stepConfig[progress.step as keyof typeof stepConfig] || stepConfig.connecting
  const Icon = config.icon

  return (
    <div className="flex items-center space-x-3 p-4 bg-[var(--paper-2)] rounded-lg border">
      <div className={cn("p-2 rounded-full", config.bgColor)}>
        {progress.step === 'connecting' ? (
          <ModernSpinner size="sm" className={config.color} />
        ) : (
          <Icon className={cn("h-4 w-4", config.color)} />
        )}
      </div>
      <div className="flex-1">
        <p className="text-sm font-medium text-[var(--ink)]">
          {progress.message}
        </p>
        {progress.step !== 'complete' && (
          <div className="mt-1 flex space-x-1">
            <div className="w-1 h-1 bg-[var(--vermillion)] rounded-full animate-bounce"></div>
            <div className="w-1 h-1 bg-gradient-to-r from-[var(--vermillion)] to-[var(--vermillion-dk)] rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
            <div className="w-1 h-1 bg-gradient-to-r from-[var(--vermillion-dk)] to-[var(--vermillion)] rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
          </div>
        )}
      </div>
    </div>
  )
}
