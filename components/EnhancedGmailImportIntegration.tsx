'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Mail, CheckCircle, XCircle, AlertCircle, Settings } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface ImportResult {
  success: boolean
  imported: number
  skipped: number
  duplicates: number
  errorCount: number
  processingTime: number
  stats: {
    totalMessages: number
    validMessages: number
    filteredMessages: number
    duplicateMessages: number
    errorMessages: number
  }
  errors: Array<{
    stage: string
    message: string
    messageId?: string
  }>
}

interface EnhancedGmailImportIntegrationProps {
  onImportComplete?: () => void
  className?: string
}

export function EnhancedGmailImportIntegration({ 
  onImportComplete, 
  className = '' 
}: EnhancedGmailImportIntegrationProps) {
  const [isImporting, setIsImporting] = useState(false)
  const [progress, setProgress] = useState<{ percentage: number; message: string } | null>(null)
  const [result, setResult] = useState<ImportResult | null>(null)
  const { toast } = useToast()

  const handleEnhancedImport = async () => {
    setIsImporting(true)
    setProgress(null)
    setResult(null)

    try {
      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          if (!prev) return { percentage: 0, message: 'Starting enhanced import...' }
          if (prev.percentage >= 90) {
            clearInterval(progressInterval)
            return { percentage: 90, message: 'Finalizing import...' }
          }
          return { 
            percentage: prev.percentage + 10, 
            message: `Processing... ${prev.percentage + 10}%` 
          }
        })
      }, 500)

      const response = await fetch('/api/gmail/import-enhanced', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filterPreset: 'comprehensive',
          startDate: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10), // Last 90 days
          endDate: new Date().toISOString().slice(0, 10),
          maxMessages: 1000,
          concurrency: 5,
          customFilters: {
            minConfidence: 0.7,
            requireValidAirports: true
          }
        })
      })

      clearInterval(progressInterval)

      if (response.status === 401) {
        const data = await response.json()
        if (data?.authUrl) {
          window.location.href = data.authUrl
          return
        }
        toast({
          title: 'Authentication Required',
          description: 'Please connect your Gmail account first.',
          variant: 'destructive'
        })
        return
      }

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.message || data.error || 'Enhanced import failed')
      }

      const importResult: ImportResult = await response.json()
      setResult(importResult)
      setProgress({ percentage: 100, message: 'Import completed!' })

      if (importResult.success) {
        toast({
          title: 'Enhanced Import Completed',
          description: `Successfully imported ${importResult.imported} flights. ${importResult.duplicates} duplicates skipped.`,
        })
        onImportComplete?.()
      } else {
        toast({
          title: 'Enhanced Import Failed',
          description: `Failed to import flights. ${importResult.errorCount} errors occurred.`,
          variant: 'destructive'
        })
      }
    } catch (error) {
      toast({
        title: 'Enhanced Import Error',
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        variant: 'destructive'
      })
    } finally {
      setIsImporting(false)
    }
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Enhanced Import Button */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5" />
            Enhanced Gmail Import
            <Badge variant="secondary" className="ml-auto">New</Badge>
          </CardTitle>
          <CardDescription>
            Advanced filtering and intelligent parsing for better import results.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button 
            onClick={handleEnhancedImport} 
            disabled={isImporting}
            className="w-full"
            variant="outline"
          >
            {isImporting ? 'Enhanced Importing...' : 'Start Enhanced Import'}
          </Button>
        </CardContent>
      </Card>

      {/* Progress Indicator */}
      {progress && (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>{progress.message}</span>
                <span>{progress.percentage}%</span>
              </div>
              <Progress value={progress.percentage} className="w-full" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results Summary */}
      {result && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {result.success ? (
                <CheckCircle className="w-5 h-5 text-green-600" />
              ) : (
                <XCircle className="w-5 h-5 text-red-600" />
              )}
              Enhanced Import Results
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{result.imported}</div>
                <div className="text-sm text-muted-foreground">Imported</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600">{result.skipped}</div>
                <div className="text-sm text-muted-foreground">Skipped</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{result.duplicates}</div>
                <div className="text-sm text-muted-foreground">Duplicates</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{result.errorCount}</div>
                <div className="text-sm text-muted-foreground">Errors</div>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
              <div>Total Messages: <Badge variant="outline">{result.stats.totalMessages}</Badge></div>
              <div>Valid Messages: <Badge variant="outline">{result.stats.validMessages}</Badge></div>
              <div>Processing Time: <Badge variant="outline">{result.processingTime}ms</Badge></div>
            </div>

            {/* Error Summary */}
            {result.errors.length > 0 && (
              <Alert className="mt-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {result.errors.length} errors occurred during import. 
                  Check the detailed logs for more information.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {/* Advanced Configuration Link */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium">Need Advanced Configuration?</h4>
              <p className="text-sm text-muted-foreground">
                Access detailed filtering options and custom presets.
              </p>
            </div>
            <Button variant="ghost" size="sm" className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Advanced
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Example integration with existing FlightsClient
export function FlightsClientWithEnhancedImport() {
  const [showEnhancedImport, setShowEnhancedImport] = useState(false)

  return (
    <div className="space-y-6">
      {/* Existing FlightsClient content would go here */}
      
      {/* Enhanced Import Section */}
      <div className="border-t pt-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Import Flights</h3>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowEnhancedImport(!showEnhancedImport)}
          >
            {showEnhancedImport ? 'Hide Enhanced Import' : 'Show Enhanced Import'}
          </Button>
        </div>
        
        {showEnhancedImport && (
          <EnhancedGmailImportIntegration 
            onImportComplete={() => {
              // Refresh flights list
              console.log('Import completed, refreshing flights...')
            }}
          />
        )}
      </div>
    </div>
  )
}



