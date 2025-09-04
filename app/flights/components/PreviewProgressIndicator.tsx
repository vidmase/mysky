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
  connecting: { icon: ModernSpinner, color: "text-blue-500", bgColor: "bg-blue-500/10" },
  searching: { icon: Search, color: "text-blue-500", bgColor: "bg-blue-500/10" },
  processing: { icon: Mail, color: "text-yellow-500", bgColor: "bg-yellow-500/10" },
  complete: { icon: CheckCircle, color: "text-green-500", bgColor: "bg-green-500/10" }
}

export function PreviewProgressIndicator({ progress, isVisible }: PreviewProgressIndicatorProps) {
  if (!isVisible || !progress) return null

  const config = stepConfig[progress.step as keyof typeof stepConfig] || stepConfig.connecting
  const Icon = config.icon

  return (
    <div className="flex items-center space-x-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border">
      <div className={cn("p-2 rounded-full", config.bgColor)}>
        {progress.step === 'connecting' ? (
          <ModernSpinner size="sm" className={config.color} />
        ) : (
          <Icon className={cn("h-4 w-4", config.color)} />
        )}
      </div>
      <div className="flex-1">
        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
          {progress.message}
        </p>
        {progress.step !== 'complete' && (
          <div className="mt-1 flex space-x-1">
            <div className="w-1 h-1 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full animate-bounce"></div>
            <div className="w-1 h-1 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
            <div className="w-1 h-1 bg-gradient-to-r from-pink-500 to-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
          </div>
        )}
      </div>
    </div>
  )
}
