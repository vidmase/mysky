import { Progress } from "@/components/ui/progress"
import { CheckCircle, AlertCircle, Mail, Database, Check } from "lucide-react"
import { ModernSpinner } from "./ModernSpinner"
import { cn } from "@/lib/utils"

interface ImportProgressIndicatorProps {
  progress: {
    step: string
    current: number
    total: number
    message: string
  } | null
  isVisible: boolean
}

const stepConfig = {
  preparing: { icon: ModernSpinner, color: "text-[var(--vermillion)]", bgColor: "bg-[var(--wash-accent)]" },
  connecting: { icon: Mail, color: "text-[var(--vermillion)]", bgColor: "bg-[var(--wash-accent)]" },
  processing: { icon: Database, color: "text-[var(--brass)]", bgColor: "bg-[var(--wash-brass)]" },
  complete: { icon: CheckCircle, color: "text-[var(--jade)]", bgColor: "bg-[var(--wash-jade)]" },
  error: { icon: AlertCircle, color: "text-[var(--vermillion-dk)]", bgColor: "bg-[var(--wash-accent)]" }
}

export function ImportProgressIndicator({ progress, isVisible }: ImportProgressIndicatorProps) {
  if (!isVisible || !progress) return null

  const config = stepConfig[progress.step as keyof typeof stepConfig] || stepConfig.preparing
  const Icon = config.icon
  const progressPercentage = progress.total > 0 ? (progress.current / progress.total) * 100 : 0

  return (
    <div className={cn(
      "fixed inset-0 bg-black/50 flex items-center justify-center z-50",
      "transition-opacity duration-300"
    )}>
      <div className="bg-[hsl(var(--card))] rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
        <div className="flex items-center space-x-3 mb-4">
          <div className={cn("p-2 rounded-full", config.bgColor)}>
            {progress.step === 'preparing' ? (
              <ModernSpinner size="sm" className={config.color} />
            ) : (
              <Icon className={cn("h-5 w-5", config.color)} />
            )}
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-[var(--ink)]">
              Importing Flights
            </h3>
            <p className="text-sm text-[var(--ink-2)]">
              {progress.message}
            </p>
          </div>
        </div>

        {progress.total > 0 && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-[var(--ink-2)]">
              <span>Progress</span>
              <span>{progress.current} / {progress.total}</span>
            </div>
            <Progress value={progressPercentage} className="h-2" />
          </div>
        )}

        {progress.step === 'complete' && (
          <div className="mt-4 p-3 bg-[var(--jade)] rounded-md">
            <div className="flex items-center space-x-2">
              <Check className="h-4 w-4 text-[var(--jade)]" />
              <span className="text-sm text-[var(--jade)]">
                Import completed successfully!
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
