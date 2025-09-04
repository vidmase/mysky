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
  preparing: { icon: ModernSpinner, color: "text-blue-500", bgColor: "bg-blue-500/10" },
  connecting: { icon: Mail, color: "text-blue-500", bgColor: "bg-blue-500/10" },
  processing: { icon: Database, color: "text-yellow-500", bgColor: "bg-yellow-500/10" },
  complete: { icon: CheckCircle, color: "text-green-500", bgColor: "bg-green-500/10" },
  error: { icon: AlertCircle, color: "text-red-500", bgColor: "bg-red-500/10" }
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
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
        <div className="flex items-center space-x-3 mb-4">
          <div className={cn("p-2 rounded-full", config.bgColor)}>
            {progress.step === 'preparing' ? (
              <ModernSpinner size="sm" className={config.color} />
            ) : (
              <Icon className={cn("h-5 w-5", config.color)} />
            )}
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">
              Importing Flights
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {progress.message}
            </p>
          </div>
        </div>

        {progress.total > 0 && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
              <span>Progress</span>
              <span>{progress.current} / {progress.total}</span>
            </div>
            <Progress value={progressPercentage} className="h-2" />
          </div>
        )}

        {progress.step === 'complete' && (
          <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 rounded-md">
            <div className="flex items-center space-x-2">
              <Check className="h-4 w-4 text-green-500" />
              <span className="text-sm text-green-700 dark:text-green-300">
                Import completed successfully!
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
