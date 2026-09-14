'use client'

import { useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Calendar, CalendarDays, Filter, Mail, Download, Upload, Search, Clock, Globe, Star, FileText, Zap, CheckCircle, AlertCircle, XCircle, Plane, Settings, ChevronDown, ChevronRight, Paperclip } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface FilterPreset {
  name: string
  description: string
  config: any
}

interface ImportProgress {
  stage: 'searching' | 'fetching' | 'parsing' | 'filtering' | 'importing'
  current: number
  total: number
  message?: string
  percentage: number
}

interface EnhancedImportProgress {
  sessionId: string
  phase: string
  totalEmails: number
  processedEmails: number
  successfullyParsed: number
  duplicatesFound: number
  errors: number
  currentBatch: number
  estimatedTimeRemaining?: number
  processingRate: number
}

interface ImportResult {
  success: boolean
  imported: number
  skipped: number
  duplicates: number
  errors: number
  processingTime: number
  stats: {
    totalMessages: number
    validMessages: number
    filteredMessages: number
    duplicateMessages: number
    errorMessages: number
  }
  filterConfig?: any
  errorDetails: Array<{
    stage: string
    message: string
    messageId?: string
  }>
  // Enhanced fields
  sessionId?: string
  flights?: any[]
  confidence?: number
  recoveryStats?: any
}

export function EnhancedGmailImport() {
  const [isImporting, setIsImporting] = useState(false)
  const [progress, setProgress] = useState<ImportProgress | null>(null)
  const [enhancedProgress, setEnhancedProgress] = useState<EnhancedImportProgress | null>(null)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null)
  const [sessionStatus, setSessionStatus] = useState<'idle' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled'>('idle')
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)
  const [filterPreset, setFilterPreset] = useState('comprehensive')
  const [customFilters, setCustomFilters] = useState<Record<string, any>>({})
  const [dateRange, setDateRange] = useState({ start: '', end: '' })
  const [dateField, setDateField] = useState<'received' | 'departure' | 'both'>('received')
  const [importMode, setImportMode] = useState<'past' | 'future'>('past')
  const [processingOptions, setProcessingOptions] = useState({
    useLLM: true,
    forceLLM: false,
    maxMessages: 1000,
    concurrency: 5,
    batchSize: 50,
    useEnhancedSystem: true,
    enableClassification: true,
    classificationThreshold: 0.7,
    enableDeduplication: true,
    enableCheckpoints: true,
    resumeOnFailure: true
  })
  const [presets, setPresets] = useState<Record<string, FilterPreset>>({})
  const { toast } = useToast()

  // Load available presets on component mount
  const loadPresets = useCallback(async () => {
    try {
      const response = await fetch('/api/gmail/import-enhanced')
      if (response.ok) {
        const data = await response.json()
        setPresets(data.presets)
      }
    } catch (error) {
      console.error('Failed to load presets:', error)
    }
  }, [])

  // Initialize presets
  useState(() => {
    loadPresets()
  })

  const handleImport = async () => {
    console.log('Enhanced import button clicked')
    setIsImporting(true)
    setProgress(null)
    setEnhancedProgress(null)
    setResult(null)
    setCurrentSessionId(null)
    setSessionStatus('running')

    try {
      const requestBody = {
        filterPreset,
        customFilters,
        startDate: dateRange.start || undefined,
        endDate: dateRange.end || undefined,
        dateField: dateField,
        searchQuery: buildSearchQuery(),
        importMode,
        dateRange: dateRange.start || dateRange.end ? {
          start: dateRange.start || undefined,
          end: dateRange.end || undefined
        } : undefined,
        ...processingOptions
      }

      console.log('Sending request to enhanced import API:', requestBody)
      
      const response = await fetch('/api/gmail/enhanced-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      })
      
      console.log('API response status:', response.status)

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
        throw new Error(data.message || data.error || 'Import failed')
      }

      const importResult: ImportResult = await response.json()
      
      // Handle immediate result (no session polling needed)
      setResult(importResult)
      setSessionStatus(importResult.success ? 'completed' : 'failed')

      if (importResult.success) {
        toast({
          title: 'Import Completed',
          description: `Successfully imported ${importResult.imported} flights. ${importResult.duplicates} duplicates skipped.`,
        })
      } else {
        toast({
          title: 'Import Failed',
          description: `Failed to import flights. ${importResult.errors} errors occurred.`,
          variant: 'destructive'
        })
      }
    } catch (error) {
      console.error('Enhanced import error:', error)
      setSessionStatus('failed')
      toast({
        title: 'Import Error',
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        variant: 'destructive'
      })
    } finally {
      console.log('Enhanced import completed, setting isImporting to false')
      setIsImporting(false)
    }
  }

  const buildSearchQuery = () => {
    const terms = ['flight', 'booking', 'confirmation', 'itinerary', 'reservation']
    const domains = ['ryanair.com', 'easyjet.com', 'britishairways.com']
    
    // Build base query
    let query = ''
    
    if (customFilters.allowedDomains?.length) {
      const domainQuery = customFilters.allowedDomains.map((d: string) => `from:${d}`).join(' OR ')
      query = `(${domainQuery})`
    } else {
      const subjectQuery = terms.map(term => `subject:${term}`).join(' OR ')
      const domainQuery = domains.map(domain => `from:${domain}`).join(' OR ')
      query = `(${subjectQuery}) OR (${domainQuery})`
    }
    
    // Add future flight specific terms for better detection
    if (importMode === 'future') {
      const futureTerms = ['upcoming', 'departure', 'check-in', 'reminder', 'travel', 'boarding']
      const futureQuery = futureTerms.map(term => `subject:${term}`).join(' OR ')
      query = `(${query}) OR (${futureQuery})`
    }
    
    return query
  }

  const pollProgress = async (sessionId: string) => {
    // Disabled session polling - using immediate results instead
    console.log('Session polling disabled for sessionId:', sessionId)
  }

  const mapPhaseToStage = (phase: string): ImportProgress['stage'] => {
    switch (phase) {
      case 'search': return 'searching'
      case 'classify': return 'fetching'
      case 'parse': return 'parsing'
      case 'deduplicate': return 'filtering'
      case 'save': return 'importing'
      default: return 'parsing'
    }
  }

  const handlePauseResume = async () => {
    if (!currentSessionId) return
    
    try {
      const action = sessionStatus === 'running' ? 'pause' : 'resume'
      const response = await fetch(`/api/gmail/sessions/${currentSessionId}/${action}`, {
        method: 'POST'
      })
      
      if (response.ok) {
        setSessionStatus(action === 'pause' ? 'paused' : 'running')
        toast({
          title: action === 'pause' ? 'Import Paused' : 'Import Resumed',
          description: `Import has been ${action}d successfully.`
        })
      }
    } catch (error) {
      toast({
        title: 'Action Failed',
        description: 'Failed to pause/resume import.',
        variant: 'destructive'
      })
    }
  }

  const handleCancel = async () => {
    if (!currentSessionId) return
    
    try {
      const response = await fetch(`/api/gmail/sessions/${currentSessionId}/cancel`, {
        method: 'POST'
      })
      
      if (response.ok) {
        setSessionStatus('cancelled')
        setIsImporting(false)
        toast({
          title: 'Import Cancelled',
          description: 'Import has been cancelled successfully.'
        })
      }
    } catch (error) {
      toast({
        title: 'Cancel Failed',
        description: 'Failed to cancel import.',
        variant: 'destructive'
      })
    }
  }

  const updateCustomFilter = (key: string, value: any) => {
    setCustomFilters(prev => ({
      ...prev,
      [key]: value
    }))
  }

  const getStageIcon = (stage: string) => {
    switch (stage) {
      case 'searching': return <Mail className="w-4 h-4" />
      case 'fetching': return <Mail className="w-4 h-4" />
      case 'parsing': return <Settings className="w-4 h-4" />
      case 'filtering': return <Filter className="w-4 h-4" />
      case 'importing': return <CheckCircle className="w-4 h-4" />
      default: return <AlertCircle className="w-4 h-4" />
    }
  }

  const getStageColor = (stage: string) => {
    switch (stage) {
      case 'searching': return 'text-[var(--vermillion)]'
      case 'fetching': return 'text-[var(--vermillion)]'
      case 'parsing': return 'text-[var(--brass)]'
      case 'filtering': return 'text-[var(--vermillion)]'
      case 'importing': return 'text-[var(--jade)]'
      default: return 'text-[var(--ink-2)]'
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5" />
            Enhanced Gmail Import
          </CardTitle>
          <CardDescription>
            Import flight bookings from Gmail with advanced filtering and configuration options.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Filter Preset Selection */}
          <div className="space-y-2">
            <Label htmlFor="filter-preset">Filter Preset</Label>
            <Select value={filterPreset} onValueChange={setFilterPreset}>
              <SelectTrigger>
                <SelectValue placeholder="Select a filter preset" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(presets || {}).map(([key, preset]) => (
                  <SelectItem key={key} value={key}>
                    <div className="flex flex-col">
                      <span className="font-medium">{preset.name}</span>
                      <span className="text-sm text-muted-foreground">{preset.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {presets && presets[filterPreset] && (
              <div className="text-sm text-muted-foreground mt-2">
                {presets[filterPreset].description}
              </div>
            )}
          </div>

                     {/* Quick Filter Buttons */}
           <div className="space-y-3">
             <div className="flex items-center justify-between">
               <Label className="flex items-center gap-2">
                 <Filter className="w-4 h-4" />
                 Quick Filters
               </Label>
               {Object.keys(customFilters).length > 0 && (
                 <Badge variant="secondary" className="text-xs">
                   {Object.keys(customFilters).length} active filters
                 </Badge>
               )}
             </div>
             <div className="flex flex-wrap gap-2">
               <Button
                 variant="outline"
                 size="sm"
                 onClick={() => {
                   setCustomFilters({
                     isBookingConfirmation: true,
                     excludeCancellations: true,
                     excludeRefunds: true,
                     requireValidAirports: true,
                     requireValidTimes: true
                   })
                 }}
                 className="text-xs"
               >
                 Booking Confirmations
               </Button>
               <Button
                 variant="outline"
                 size="sm"
                 onClick={() => {
                   setCustomFilters({
                     hasAttachments: true,
                     attachmentTypes: ['pdf'],
                     isImportant: true
                   })
                 }}
                 className="text-xs"
               >
                 PDF Attachments
               </Button>
               <Button
                 variant="outline"
                 size="sm"
                 onClick={() => {
                   setCustomFilters({
                     allowedDomains: ['ryanair.com', 'easyjet.com', 'ba.com', 'virginatlantic.com'],
                     isBookingConfirmation: true
                   })
                 }}
                 className="text-xs"
               >
                 Major Airlines
               </Button>
               <Button
                 variant="outline"
                 size="sm"
                 onClick={() => {
                   setCustomFilters({
                     excludeWeekends: true,
                     timeOfDay: { start: '09:00', end: '17:00' },
                     sentimentFilter: 'positive'
                   })
                 }}
                 className="text-xs"
               >
                 Business Hours
               </Button>
               <Button
                 variant="outline"
                 size="sm"
                 onClick={() => {
                   setCustomFilters({
                     urgencyFilter: 'high',
                     formalityFilter: 'formal',
                     isImportant: true
                   })
                 }}
                 className="text-xs"
               >
                 Urgent & Formal
               </Button>
               <Button
                 variant="outline"
                 size="sm"
                 onClick={() => {
                   setCustomFilters({
                     isStarred: true,
                     hasLabels: ['Travel', 'Booking', 'Flight']
                   })
                 }}
                 className="text-xs"
               >
                 Starred & Labeled
               </Button>
               <Button
                 variant="outline"
                 size="sm"
                 onClick={() => {
                   setCustomFilters({
                     excludeCancellations: true,
                     excludeRefunds: true,
                     excludeModifications: true,
                     isBookingConfirmation: true
                   })
                 }}
                 className="text-xs"
               >
                 Active Bookings
               </Button>
               <Button
                 variant="outline"
                 size="sm"
                 onClick={() => {
                   setCustomFilters({
                     allowedTLDs: ['.com', '.co.uk', '.ie'],
                     excludedDomains: ['spam.com', 'malware.com'],
                     hasExternalLinks: false
                   })
                 }}
                 className="text-xs"
               >
                 Trusted Sources
               </Button>
               <Button
                 variant="outline"
                 size="sm"
                 onClick={() => {
                   setCustomFilters({
                     minContentLength: 100,
                     maxContentLength: 5000,
                     requireHtmlContent: true,
                     hasInlineImages: false
                   })
                 }}
                 className="text-xs"
               >
                 Well-Formatted
               </Button>
               <Button
                 variant="outline"
                 size="sm"
                 onClick={() => {
                   setCustomFilters({
                     isThreadStart: true,
                     hasReplies: false,
                     threadSize: 1
                   })
                 }}
                 className="text-xs"
               >
                 Single Messages
               </Button>
               <Button
                 variant="outline"
                 size="sm"
                 onClick={() => {
                   setCustomFilters({
                     dayOfWeek: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
                     timeOfDay: { start: '08:00', end: '18:00' },
                     excludeHolidays: true
                   })
                 }}
                 className="text-xs"
               >
                 Work Week
               </Button>
               <Button
                 variant="outline"
                 size="sm"
                 onClick={() => {
                   setCustomFilters({
                     isBookingConfirmation: true,
                     isItinerary: false,
                     excludeCancellations: true,
                     excludeRefunds: true,
                     excludeModifications: true
                   })
                 }}
                 className="text-xs"
               >
                 New Bookings Only
               </Button>
               <Button
                 variant="outline"
                 size="sm"
                 onClick={() => {
                   setCustomFilters({
                     hasAttachments: true,
                     attachmentTypes: ['pdf', 'png', 'jpg'],
                     minAttachmentSize: 10000,
                     maxAttachmentSize: 5000000
                   })
                 }}
                 className="text-xs"
               >
                 With Attachments
               </Button>
                               <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setCustomFilters({
                      sentimentFilter: 'positive',
                      urgencyFilter: 'low',
                      formalityFilter: 'formal'
                    })
                  }}
                  className="text-xs"
                >
                  Positive & Calm
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setCustomFilters({
                      language: 'en',
                      locale: 'en-US',
                      requirePlainTextContent: true
                    })
                  }}
                  className="text-xs"
                >
                  English Only
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setCustomFilters({
                      hasTrackingPixels: false,
                      hasUnsubscribeLink: false,
                      hasExternalLinks: false
                    })
                  }}
                  className="text-xs"
                >
                  Clean Emails
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setCustomFilters({
                      isModification: true,
                      isCancellation: false,
                      isRefund: false
                    })
                  }}
                  className="text-xs"
                >
                  Modifications Only
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setCustomFilters({
                      hasReplies: true,
                      threadSize: { min: 2, max: 10 }
                    })
                  }}
                  className="text-xs"
                >
                  Threaded Conversations
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setCustomFilters({
                      urgencyFilter: 'high',
                      sentimentFilter: 'negative',
                      isImportant: true
                    })
                  }}
                  className="text-xs"
                >
                  Urgent Issues
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setCustomFilters({
                      allowedDomains: ['booking.com', 'hotels.com', 'airbnb.com'],
                      isBookingConfirmation: true
                    })
                  }}
                  className="text-xs"
                >
                  Accommodation
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setCustomFilters({
                      hasAttachments: true,
                      attachmentTypes: ['pdf', 'doc', 'docx'],
                      minAttachmentSize: 50000
                    })
                  }}
                  className="text-xs"
                >
                  Documents
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setCustomFilters({
                      dayOfWeek: ['saturday', 'sunday'],
                      timeOfDay: { start: '10:00', end: '20:00' }
                    })
                  }}
                  className="text-xs"
                >
                  Weekend Bookings
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setCustomFilters({
                      customRegexPatterns: ['confirmation', 'booking', 'reservation'],
                      isBookingConfirmation: true
                    })
                  }}
                  className="text-xs"
                >
                  Confirmation Keywords
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setCustomFilters({
                      allowedTLDs: ['.com', '.co.uk', '.ie', '.de', '.fr', '.es'],
                      excludedTLDs: ['.ru', '.cn', '.in']
                    })
                  }}
                  className="text-xs"
                >
                  Western Airlines
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setCustomFilters({
                      minContentLength: 500,
                      maxContentLength: 2000,
                      requireHtmlContent: true,
                      hasInlineImages: true
                    })
                  }}
                  className="text-xs"
                >
                  Rich Content
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setCustomFilters({
                      isRefund: true,
                      sentimentFilter: 'negative',
                      urgencyFilter: 'high'
                    })
                  }}
                  className="text-xs"
                >
                  Refund Requests
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setCustomFilters({
                      allowedDomains: ['uber.com', 'lyft.com', 'taxi.com'],
                      isBookingConfirmation: true
                    })
                  }}
                  className="text-xs"
                >
                  Transportation
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setCustomFilters({
                      isCancellation: true,
                      urgencyFilter: 'high',
                      formalityFilter: 'formal'
                    })
                  }}
                  className="text-xs"
                >
                  Cancellations
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setCustomFilters({
                      hasLabels: ['Important', 'Urgent', 'Action Required'],
                      isImportant: true
                    })
                  }}
                  className="text-xs"
                >
                  Action Required
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setCustomFilters({
                      allowedDomains: ['expedia.com', 'kayak.com', 'skyscanner.com'],
                      isBookingConfirmation: true
                    })
                  }}
                  className="text-xs"
                >
                  Travel Agencies
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setCustomFilters({
                      hasAttachments: true,
                      attachmentTypes: ['png', 'jpg', 'jpeg'],
                      maxAttachmentSize: 1000000
                    })
                  }}
                  className="text-xs"
                >
                  Images Only
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setCustomFilters({
                      isItinerary: true,
                      hasAttachments: true,
                      requireValidPassengerName: true,
                      requireValidAirports: true
                    })
                  }}
                  className="text-xs"
                >
                  Complete Itineraries
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setCustomFilters({
                      sentimentFilter: 'neutral',
                      urgencyFilter: 'low',
                      formalityFilter: 'informal'
                    })
                  }}
                  className="text-xs"
                >
                  Casual Updates
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const today = new Date()
                    const oneHundredTwentyDaysAgo = new Date(today)
                    oneHundredTwentyDaysAgo.setDate(today.getDate() - 120)
                    
                    setDateRange({
                      start: oneHundredTwentyDaysAgo.toISOString().split('T')[0],
                      end: today.toISOString().split('T')[0]
                    })
                  }}
                  className="text-xs"
                >
                  Last 120 Days
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setCustomFilters({})
                    setDateRange({ start: '', end: '' })
                  }}
                  className="text-xs text-[var(--vermillion-dk)] hover:text-[var(--vermillion)]"
                >
                  Clear All
                </Button>
             </div>
           </div>

          {/* Import Mode Selection */}
          <div className="space-y-4">
            <Label className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Import Mode
            </Label>
            <div className="flex gap-2">
              <Button
                variant={importMode === 'past' ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                  setImportMode('past')
                  setDateRange({ start: '', end: '' })
                }}
                className="flex-1"
              >
                <Clock className="w-4 h-4 mr-2" />
                Past Flights
              </Button>
              <Button
                variant={importMode === 'future' ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                  setImportMode('future')
                  setDateRange({ start: '', end: '' })
                }}
                className="flex-1"
              >
                <Plane className="w-4 h-4 mr-2" />
                Future Flights
              </Button>
            </div>
          </div>

          {/* Date Range Presets */}
          <div className="space-y-4">
            <Label className="flex items-center gap-2">
              <CalendarDays className="w-4 h-4" />
              {importMode === 'past' ? 'Past' : 'Future'} Date Range Presets
            </Label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {importMode === 'past' ? (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const end = new Date().toISOString().split('T')[0]
                      const start = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
                      setDateRange({ start, end })
                    }}
                    className="text-xs"
                  >
                    Last 30 Days
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const end = new Date().toISOString().split('T')[0]
                      const start = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
                      setDateRange({ start, end })
                    }}
                    className="text-xs"
                  >
                    Last 90 Days
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const end = new Date().toISOString().split('T')[0]
                      const start = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
                      setDateRange({ start, end })
                    }}
                    className="text-xs"
                  >
                    Last 6 Months
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const end = new Date().toISOString().split('T')[0]
                      const start = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
                      setDateRange({ start, end })
                    }}
                    className="text-xs"
                  >
                    Last Year
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const start = new Date().toISOString().split('T')[0]
                      const end = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
                      setDateRange({ start, end })
                    }}
                    className="text-xs"
                  >
                    Next 60 Days
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const start = new Date().toISOString().split('T')[0]
                      const end = new Date(Date.now() + 120 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
                      setDateRange({ start, end })
                    }}
                    className="text-xs"
                  >
                    Next 120 Days
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const start = new Date().toISOString().split('T')[0]
                      const end = new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
                      setDateRange({ start, end })
                    }}
                    className="text-xs"
                  >
                    Next 6 Months
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const start = new Date().toISOString().split('T')[0]
                      const end = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
                      setDateRange({ start, end })
                    }}
                    className="text-xs"
                  >
                    Next Year
                  </Button>
                </>
              )}
            </div>
          </div>

           {/* Date Range */}
           <div className="space-y-4">
             <div className="grid grid-cols-2 gap-4">
               <div className="space-y-2">
                 <Label htmlFor="start-date">Start Date (Optional)</Label>
                 <Input
                   id="start-date"
                   type="date"
                   value={dateRange.start}
                   onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                 />
               </div>
               <div className="space-y-2">
                 <Label htmlFor="end-date">End Date (Optional)</Label>
                 <Input
                   id="end-date"
                   type="date"
                   value={dateRange.end}
                   onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                 />
               </div>
             </div>
             
             <div className="space-y-2">
               <Label htmlFor="date-field" className="flex items-center gap-2">
                 <Mail className="w-4 h-4" />
                 Date Field to Filter
               </Label>
               <Select value={dateField} onValueChange={(value: 'received' | 'departure' | 'both') => setDateField(value)}>
                 <SelectTrigger id="date-field">
                   <SelectValue placeholder="Choose date field" />
                 </SelectTrigger>
                 <SelectContent>
                   <SelectItem value="received">Email Received Date</SelectItem>
                   <SelectItem value="departure">Flight Departure Date</SelectItem>
                   <SelectItem value="both">Both (Received & Departure)</SelectItem>
                 </SelectContent>
               </Select>
               <p className="text-sm text-muted-foreground">
                 Choose which date field to use for filtering emails. "Both" will match emails where either the received date or departure date falls within the range.
               </p>
             </div>
           </div>

          {/* Advanced Options */}
          <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
            <CollapsibleTrigger asChild>
              <Button variant="outline" className="w-full justify-between">
                <span>Advanced Configuration</span>
                {showAdvanced ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-4 mt-4">
              <Separator />
              
              {/* Processing Options */}
              <div className="space-y-4">
                <h4 className="font-medium flex items-center gap-2">
                  <Settings className="w-4 h-4" />
                  Processing Options
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="max-messages">Max Messages</Label>
                    <Input
                      id="max-messages"
                      type="number"
                      value={processingOptions.maxMessages}
                      onChange={(e) => setProcessingOptions(prev => ({ 
                        ...prev, 
                        maxMessages: parseInt(e.target.value) || 1000 
                      }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="concurrency">Concurrency</Label>
                    <Input
                      id="concurrency"
                      type="number"
                      value={processingOptions.concurrency}
                      onChange={(e) => setProcessingOptions(prev => ({ 
                        ...prev, 
                        concurrency: parseInt(e.target.value) || 5 
                      }))}
                    />
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Switch
                    id="use-llm"
                    checked={processingOptions.useLLM}
                    onCheckedChange={(checked) => setProcessingOptions(prev => ({ 
                      ...prev, 
                      useLLM: checked 
                    }))}
                  />
                  <Label htmlFor="use-llm">Use LLM for parsing (fallback)</Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Switch
                    id="force-llm"
                    checked={processingOptions.forceLLM}
                    onCheckedChange={(checked) => setProcessingOptions(prev => ({ 
                      ...prev, 
                      forceLLM: checked 
                    }))}
                  />
                  <Label htmlFor="force-llm">Force LLM parsing for all messages</Label>
                </div>
              </div>

              {/* Advanced Filters */}
              <Collapsible open={showAdvancedFilters} onOpenChange={setShowAdvancedFilters}>
                <CollapsibleTrigger asChild>
                  <Button variant="outline" className="w-full justify-between">
                    <span className="flex items-center gap-2">
                      <Filter className="w-4 h-4" />
                      Advanced Filters
                    </span>
                    {showAdvancedFilters ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-4 mt-4">
                  <Separator />

                  {/* Attachment Filters */}
                  <div className="space-y-4">
                    <h5 className="font-medium flex items-center gap-2">
                      <Paperclip className="w-4 h-4" />
                      Attachment Filters
                    </h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="has-attachments"
                          checked={customFilters.hasAttachments || false}
                          onCheckedChange={(checked) => updateCustomFilter('hasAttachments', checked)}
                        />
                        <Label htmlFor="has-attachments">Require attachments</Label>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="attachment-types">Attachment Types</Label>
                        <Input
                          id="attachment-types"
                          placeholder="pdf, png, jpg"
                          value={customFilters.attachmentTypes?.join(', ') || ''}
                          onChange={(e) => updateCustomFilter('attachmentTypes', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Email Priority Filters */}
                  <div className="space-y-4">
                    <h5 className="font-medium flex items-center gap-2">
                      <Star className="w-4 h-4" />
                      Priority & Importance
                    </h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="is-important"
                          checked={customFilters.isImportant || false}
                          onCheckedChange={(checked) => updateCustomFilter('isImportant', checked)}
                        />
                        <Label htmlFor="is-important">Important emails only</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="is-starred"
                          checked={customFilters.isStarred || false}
                          onCheckedChange={(checked) => updateCustomFilter('isStarred', checked)}
                        />
                        <Label htmlFor="is-starred">Starred emails only</Label>
                      </div>
                    </div>
                  </div>

                  {/* Time-based Filters */}
                  <div className="space-y-4">
                    <h5 className="font-medium flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      Time-based Filters
                    </h5>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="time-start">Time Start (HH:MM)</Label>
                        <Input
                          id="time-start"
                          placeholder="09:00"
                          value={customFilters.timeOfDay?.start || ''}
                          onChange={(e) => updateCustomFilter('timeOfDay', { 
                            ...customFilters.timeOfDay, 
                            start: e.target.value 
                          })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="time-end">Time End (HH:MM)</Label>
                        <Input
                          id="time-end"
                          placeholder="17:00"
                          value={customFilters.timeOfDay?.end || ''}
                          onChange={(e) => updateCustomFilter('timeOfDay', { 
                            ...customFilters.timeOfDay, 
                            end: e.target.value 
                          })}
                        />
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="exclude-weekends"
                          checked={customFilters.excludeWeekends || false}
                          onCheckedChange={(checked) => updateCustomFilter('excludeWeekends', checked)}
                        />
                        <Label htmlFor="exclude-weekends">Exclude weekends</Label>
                      </div>
                    </div>
                  </div>

                  {/* Domain Filters */}
                  <div className="space-y-4">
                    <h5 className="font-medium flex items-center gap-2">
                      <Globe className="w-4 h-4" />
                      Domain Filters
                    </h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="allowed-domains">Allowed Domains</Label>
                        <Textarea
                          id="allowed-domains"
                          placeholder="ryanair.com, easyjet.com"
                          value={customFilters.allowedDomains?.join(', ') || ''}
                          onChange={(e) => updateCustomFilter('allowedDomains', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="excluded-domains">Excluded Domains</Label>
                        <Textarea
                          id="excluded-domains"
                          placeholder="spam.com, malware.com"
                          value={customFilters.excludedDomains?.join(', ') || ''}
                          onChange={(e) => updateCustomFilter('excludedDomains', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Business Logic Filters */}
                  <div className="space-y-4">
                    <h5 className="font-medium flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      Business Logic
                    </h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="is-booking-confirmation"
                          checked={customFilters.isBookingConfirmation || false}
                          onCheckedChange={(checked) => updateCustomFilter('isBookingConfirmation', checked)}
                        />
                        <Label htmlFor="is-booking-confirmation">Booking confirmations only</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="is-itinerary"
                          checked={customFilters.isItinerary || false}
                          onCheckedChange={(checked) => updateCustomFilter('isItinerary', checked)}
                        />
                        <Label htmlFor="is-itinerary">Itineraries only</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="exclude-cancellations"
                          checked={customFilters.excludeCancellations || false}
                          onCheckedChange={(checked) => updateCustomFilter('excludeCancellations', checked)}
                        />
                        <Label htmlFor="exclude-cancellations">Exclude cancellations</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="exclude-refunds"
                          checked={customFilters.excludeRefunds || false}
                          onCheckedChange={(checked) => updateCustomFilter('excludeRefunds', checked)}
                        />
                        <Label htmlFor="exclude-refunds">Exclude refunds</Label>
                      </div>
                    </div>
                  </div>

                  {/* Content Analysis Filters */}
                  <div className="space-y-4">
                    <h5 className="font-medium flex items-center gap-2">
                      <Zap className="w-4 h-4" />
                      Content Analysis
                    </h5>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="sentiment-filter">Sentiment</Label>
                        <Select 
                          value={customFilters.sentimentFilter || 'any'} 
                          onValueChange={(value) => updateCustomFilter('sentimentFilter', value)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="any">Any</SelectItem>
                            <SelectItem value="positive">Positive</SelectItem>
                            <SelectItem value="negative">Negative</SelectItem>
                            <SelectItem value="neutral">Neutral</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="urgency-filter">Urgency</Label>
                        <Select 
                          value={customFilters.urgencyFilter || 'any'} 
                          onValueChange={(value) => updateCustomFilter('urgencyFilter', value)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="any">Any</SelectItem>
                            <SelectItem value="high">High</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="low">Low</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="formality-filter">Formality</Label>
                        <Select 
                          value={customFilters.formalityFilter || 'any'} 
                          onValueChange={(value) => updateCustomFilter('formalityFilter', value)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="any">Any</SelectItem>
                            <SelectItem value="formal">Formal</SelectItem>
                            <SelectItem value="informal">Informal</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  {/* Quality Filters */}
                  <div className="space-y-4">
                    <h5 className="font-medium flex items-center gap-2">
                      <CheckCircle className="w-4 h-4" />
                      Quality Filters
                    </h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="min-confidence">Minimum Confidence</Label>
                        <Input
                          id="min-confidence"
                          type="number"
                          min="0"
                          max="1"
                          step="0.1"
                          value={customFilters.minConfidence || ''}
                          onChange={(e) => updateCustomFilter('minConfidence', parseFloat(e.target.value) || undefined)}
                          placeholder="0.7"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="duplicate-threshold">Duplicate Threshold (%)</Label>
                        <Input
                          id="duplicate-threshold"
                          type="number"
                          min="0"
                          max="100"
                          value={customFilters.duplicateThreshold || ''}
                          onChange={(e) => updateCustomFilter('duplicateThreshold', parseInt(e.target.value) || undefined)}
                          placeholder="85"
                        />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="require-valid-airports"
                          checked={customFilters.requireValidAirports || false}
                          onCheckedChange={(checked) => updateCustomFilter('requireValidAirports', checked)}
                        />
                        <Label htmlFor="require-valid-airports">Require valid airports</Label>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="require-valid-times"
                          checked={customFilters.requireValidTimes || false}
                          onCheckedChange={(checked) => updateCustomFilter('requireValidTimes', checked)}
                        />
                        <Label htmlFor="require-valid-times">Require valid times</Label>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="require-valid-passenger-name"
                          checked={customFilters.requireValidPassengerName || false}
                          onCheckedChange={(checked) => updateCustomFilter('requireValidPassengerName', checked)}
                        />
                        <Label htmlFor="require-valid-passenger-name">Require valid passenger name</Label>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="require-valid-price"
                          checked={customFilters.requireValidPrice || false}
                          onCheckedChange={(checked) => updateCustomFilter('requireValidPrice', checked)}
                        />
                        <Label htmlFor="require-valid-price">Require valid price</Label>
                      </div>
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </CollapsibleContent>
          </Collapsible>

          {/* Enhanced System Toggle */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Switch
                id="use-enhanced-system"
                checked={processingOptions.useEnhancedSystem}
                onCheckedChange={(checked) => setProcessingOptions(prev => ({ 
                  ...prev, 
                  useEnhancedSystem: checked 
                }))}
              />
              <Label htmlFor="use-enhanced-system" className="flex items-center gap-2">
                <Zap className="w-4 h-4" />
                Use Enhanced Reliability System (Recommended)
              </Label>
            </div>
            {processingOptions.useEnhancedSystem && (
              <div className="text-sm text-muted-foreground bg-[var(--vermillion)] p-3 rounded-lg">
                ✨ Enhanced system provides 99%+ success rate, intelligent error recovery, and resumable imports.
              </div>
            )}
          </div>

          {/* Import Controls */}
          <div className="space-y-2">
            {!isImporting && sessionStatus === 'idle' && (
              <Button 
                onClick={() => {
                  console.log('Button clicked - calling handleImport')
                  handleImport()
                }} 
                className="w-full"
              >
                Start Enhanced Import
              </Button>
            )}
            
            {isImporting && currentSessionId && (
              <div className="flex gap-2">
                <Button 
                  onClick={handlePauseResume}
                  variant="outline"
                  className="flex-1"
                >
                  {sessionStatus === 'running' ? 'Pause' : 'Resume'}
                </Button>
                <Button 
                  onClick={handleCancel}
                  variant="destructive"
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            )}
            
            {sessionStatus === 'paused' && (
              <div className="flex gap-2">
                <Button 
                  onClick={handlePauseResume}
                  className="flex-1"
                >
                  Resume Import
                </Button>
                <Button 
                  onClick={handleCancel}
                  variant="destructive"
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Enhanced Progress Indicator */}
      {(progress || enhancedProgress) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {progress && getStageIcon(progress.stage)}
                <span className={progress ? getStageColor(progress.stage) : 'text-[var(--vermillion)]'}>
                  {enhancedProgress ? 
                    enhancedProgress.phase.charAt(0).toUpperCase() + enhancedProgress.phase.slice(1) :
                    progress ? (progress.stage.charAt(0).toUpperCase() + progress.stage.slice(1)) : 'Processing'
                  }
                </span>
              </div>
              {currentSessionId && (
                <Badge variant="outline" className="text-xs">
                  Session: {currentSessionId.slice(-8)}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Main Progress */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>
                    {enhancedProgress ? 
                      `${enhancedProgress.phase}: ${enhancedProgress.processedEmails}/${enhancedProgress.totalEmails} emails` :
                      progress?.message || `Processing ${progress?.stage}...`
                    }
                  </span>
                  <span>
                    {enhancedProgress && enhancedProgress.totalEmails > 0 ? 
                      Math.round((enhancedProgress.processedEmails / enhancedProgress.totalEmails) * 100) :
                      progress?.percentage
                    }%
                  </span>
                </div>
                <Progress 
                  value={enhancedProgress && enhancedProgress.totalEmails > 0 ? 
                    (enhancedProgress.processedEmails / enhancedProgress.totalEmails) * 100 :
                    progress?.percentage || 0
                  } 
                  className="w-full" 
                />
              </div>
              
              {/* Enhanced Stats */}
              {enhancedProgress && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div className="text-center">
                    <div className="font-bold text-[var(--jade)]">{enhancedProgress.successfullyParsed}</div>
                    <div className="text-muted-foreground">Parsed</div>
                  </div>
                  <div className="text-center">
                    <div className="font-bold text-[var(--vermillion)]">{enhancedProgress.duplicatesFound}</div>
                    <div className="text-muted-foreground">Duplicates</div>
                  </div>
                  <div className="text-center">
                    <div className="font-bold text-[var(--vermillion-dk)]">{enhancedProgress.errors}</div>
                    <div className="text-muted-foreground">Errors</div>
                  </div>
                  <div className="text-center">
                    <div className="font-bold text-[var(--vermillion)]">{enhancedProgress.processingRate.toFixed(1)}/s</div>
                    <div className="text-muted-foreground">Rate</div>
                  </div>
                </div>
              )}
              
              {/* Time Estimation */}
              {enhancedProgress?.estimatedTimeRemaining && (
                <div className="text-sm text-muted-foreground text-center">
                  Estimated time remaining: {Math.round(enhancedProgress.estimatedTimeRemaining / 60)} minutes
                </div>
              )}
              
              {/* Session Status */}
              {sessionStatus !== 'idle' && (
                <div className="flex items-center justify-center gap-2">
                  <Badge 
                    variant={sessionStatus === 'running' ? 'default' : 
                            sessionStatus === 'completed' ? 'secondary' : 
                            sessionStatus === 'failed' ? 'destructive' : 'outline'}
                  >
                    {sessionStatus.toUpperCase()}
                  </Badge>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {result && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {result.success ? (
                <CheckCircle className="w-5 h-5 text-[var(--jade)]" />
              ) : (
                <XCircle className="w-5 h-5 text-[var(--vermillion-dk)]" />
              )}
              Import Results
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Summary Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-[var(--jade)]">{result.imported}</div>
                  <div className="text-sm text-muted-foreground">Imported</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-[var(--brass)]">{result.skipped}</div>
                  <div className="text-sm text-muted-foreground">Skipped</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-[var(--vermillion)]">{result.duplicates}</div>
                  <div className="text-sm text-muted-foreground">Duplicates</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-[var(--vermillion-dk)]">{result.errors}</div>
                  <div className="text-sm text-muted-foreground">Errors</div>
                </div>
              </div>

              {/* Detailed Stats */}
              <div className="space-y-2">
                <h4 className="font-medium">Processing Statistics</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
                  <div>Total Messages: <Badge variant="outline">{result.stats.totalMessages}</Badge></div>
                  <div>Valid Messages: <Badge variant="outline">{result.stats.validMessages}</Badge></div>
                  <div>Filtered Messages: <Badge variant="outline">{result.stats.filteredMessages}</Badge></div>
                  <div>Duplicate Messages: <Badge variant="outline">{result.stats.duplicateMessages}</Badge></div>
                  <div>Error Messages: <Badge variant="outline">{result.stats.errorMessages}</Badge></div>
                  <div>Processing Time: <Badge variant="outline">{Math.round(result.processingTime / 1000)}s</Badge></div>
                </div>
                
                {/* Enhanced Stats */}
                {result.confidence !== undefined && (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm mt-2">
                    <div>Average Confidence: <Badge variant="outline">{Math.round(result.confidence * 100)}%</Badge></div>
                    {result.sessionId && (
                      <div>Session ID: <Badge variant="outline">{result.sessionId.slice(-8)}</Badge></div>
                    )}
                    {result.flights && (
                      <div>Flights Found: <Badge variant="outline">{result.flights.length}</Badge></div>
                    )}
                  </div>
                )}
                
                {/* Recovery Stats */}
                {result.recoveryStats && (
                  <div className="mt-2 p-2 bg-[var(--vermillion)] rounded text-sm">
                    <div className="font-medium mb-1">Error Recovery:</div>
                    <div>Recovered: {result.recoveryStats.recoveredErrors}/{result.recoveryStats.totalErrors}</div>
                    <div>Success Rate: {Math.round((result.recoveryStats.recoveredErrors / Math.max(result.recoveryStats.totalErrors, 1)) * 100)}%</div>
                  </div>
                )}
              </div>

              {/* Errors */}
              {result.errorDetails && result.errorDetails.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium text-[var(--vermillion-dk)]">Errors ({result.errorDetails.length})</h4>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {result.errorDetails.slice(0, 5).map((error: any, index: number) => (
                      <Alert key={index} variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          <strong>{error.stage}:</strong> {error.message}
                          {error.messageId && <span className="text-xs"> (ID: {error.messageId})</span>}
                        </AlertDescription>
                      </Alert>
                    ))}
                    {result.errorDetails.length > 5 && (
                      <div className="text-sm text-muted-foreground">
                        ... and {result.errorDetails.length - 5} more errors
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
