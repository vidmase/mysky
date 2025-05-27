'use client'

import { useState, useEffect, useRef } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Loader2, Send, Bot, User, Plane, MapPin, Clock, BarChart3, Trash2, Pin, Pencil, Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'

interface ChatMessage {
  id?: string
  role: 'user' | 'assistant'
  content: string
  timestamp: string
  isStreaming?: boolean
  pinned?: boolean
}

interface UserStats {
  totalFlights: number
  totalCountries: number
  totalKilometers: number
  hoursInAir: number
  lastFlightDate?: string
  favoriteDestination?: string
  mostFrequentAirline?: string
  averageFlightDuration?: number
}

export default function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputMessage, setInputMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [userStats, setUserStats] = useState<UserStats | null>(null)
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)
  const [showOnlyPinned, setShowOnlyPinned] = useState(false)
  const [searchKeyword, setSearchKeyword] = useState('')
  const [searchDate, setSearchDate] = useState('')
  const [searchRole, setSearchRole] = useState<'all' | 'user' | 'assistant'>('all')
  const [toast, setToast] = useState<string | null>(null)
  
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const supabase = createClientComponentClient()
  const router = useRouter()

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const loadChatHistory = async () => {
    try {
      const response = await fetch('/api/chat/history?limit=50')
      if (response.ok) {
        const data = await response.json()
        const formattedMessages = data.messages.map((msg: any) => ({
          id: msg.id,
          role: msg.role,
          content: msg.content,
          timestamp: msg.created_at,
          isStreaming: false,
          pinned: msg.pinned || false
        }))
        setMessages(formattedMessages)
      }
    } catch (error) {
      console.error('Failed to load chat history:', error)
    }
  }

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setIsAuthenticated(!!session)
      setIsCheckingAuth(false)
      
      if (!session) {
        router.push('/auth')
      } else {
        loadChatHistory()
      }
    }

    checkAuth()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setIsAuthenticated(!!session)
      if (!session) {
        router.push('/auth')
      } else if (event === 'SIGNED_IN') {
        loadChatHistory()
      }
    })

    return () => subscription.unsubscribe()
  }, [supabase, router])

  const clearChatHistory = async () => {
    try {
      const response = await fetch('/api/chat/history', {
        method: 'DELETE'
      })
      if (response.ok) {
        setMessages([])
        setTimeout(() => {
          window.scrollTo({ top: 0, behavior: 'smooth' })
        }, 50)
        loadChatHistory()
      }
    } catch (error) {
      console.error('Failed to clear chat history:', error)
    }
  }

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return

    const userMessage: ChatMessage = {
      role: 'user',
      content: inputMessage.trim(),
      timestamp: new Date().toISOString()
    }

    setMessages(prev => [...prev, userMessage])
    setInputMessage('')
    setIsLoading(true)

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: userMessage.content,
          conversation: messages.slice(-10)
        })
      })

      if (!response.ok) {
        throw new Error('Failed to send message')
      }

      const data = await response.json()

      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: data.response || (data.error ?? 'Sorry, I could not answer that.'),
          timestamp: new Date().toISOString(),
          isStreaming: false
        }
      ])
                
                if (data.stats) {
                  setUserStats(data.stats)
      }
    } catch (error) {
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: 'Sorry, I encountered an error. Please try again.',
          timestamp: new Date().toISOString(),
          isStreaming: false
        }
      ])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const handlePinMessage = async (messageId: string, pinned: boolean) => {
    await fetch('/api/chat/pin', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messageId, pinned })
    })
    loadChatHistory()
  }

  const handleExportPDF = async (messageId: string) => {
    try {
      setToast('Exporting PDF...')
      const el = document.getElementById(`assistant-msg-${messageId}`)
      if (!el) {
        setToast('Export failed. Message not found.')
        setTimeout(() => setToast(null), 2000)
        return
      }
      const canvas = await html2canvas(el, { backgroundColor: null, scale: 2 })
      const imgData = canvas.toDataURL('image/png')
      const pdf = new jsPDF({ orientation: 'p', unit: 'pt', format: 'a4' })
      const pageWidth = pdf.internal.pageSize.getWidth()
      let y = 32
      pdf.setFillColor(67, 56, 202)
      pdf.rect(0, 0, pageWidth, 60, 'F')
      pdf.setFontSize(20)
      pdf.setTextColor(255,255,255)
      pdf.text('Flight Assistant', pageWidth/2, 40, { align: 'center' })
      y += 40
      const imgWidth = pageWidth - 80
      const imgHeight = (canvas.height * imgWidth) / canvas.width
      pdf.addImage(imgData, 'PNG', 40, y, imgWidth, imgHeight, '', 'FAST')
      y += imgHeight + 32
      pdf.setFontSize(10)
      pdf.setTextColor(120,120,120)
      pdf.text('Generated by Flight Assistant', pageWidth/2, y, { align: 'center' })
      pdf.save('assistant-answer.pdf')
      setToast('PDF downloaded!')
      setTimeout(() => setToast(null), 2000)
    } catch (err) {
      setToast('Export failed. See console for details.')
      setTimeout(() => setToast(null), 2000)
      // @ts-ignore
      console.error('PDF export error:', err)
    }
  }

  // Add highlight utility
  const highlightText = (text: string, keyword: string) => {
    if (!keyword) return text
    const regex = new RegExp(`(${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
    const parts = text.split(regex)
    return parts.map((part, i) =>
      regex.test(part)
        ? <mark key={i} className="bg-yellow-200 text-yellow-900 rounded px-1 py-0.5">{part}</mark>
        : part
    )
  }

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-blue-900">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  let pinnedWithQuestions: ChatMessage[] = []
  if (showOnlyPinned) {
    messages.forEach((msg, i) => {
      if (msg.pinned && msg.role === 'assistant') {
        // Add user message before, if exists and not already included
        if (i > 0 && messages[i-1].role === 'user') {
          if (!pinnedWithQuestions.some(m => m.id === messages[i-1].id)) {
            pinnedWithQuestions.push(messages[i-1])
          }
        }
        pinnedWithQuestions.push(msg)
      }
    })
  }
  const messagesToShow = showOnlyPinned ? pinnedWithQuestions : messages

  let filteredMessages = messagesToShow.filter(msg => {
    const matchesKeyword = searchKeyword.trim() === '' || msg.content.toLowerCase().includes(searchKeyword.toLowerCase())
    const matchesDate = searchDate === '' || msg.timestamp.slice(0, 10) === searchDate
    const matchesRole = searchRole === 'all' || msg.role === searchRole
    return matchesKeyword && matchesDate && matchesRole
  })

  let filteredWithPairs: ChatMessage[] = []
  filteredMessages.forEach((msg, i) => {
    // If user message matches, add next assistant message
    if (msg.role === 'user') {
      filteredWithPairs.push(msg)
      if (i < messagesToShow.length - 1 && messagesToShow[i+1].role === 'assistant') {
        if (!filteredWithPairs.some(m => m.id === messagesToShow[i+1].id)) {
          filteredWithPairs.push(messagesToShow[i+1])
        }
      }
    } else if (msg.role === 'assistant') {
      // If assistant message matches, add previous user message
      if (i > 0 && messagesToShow[i-1].role === 'user') {
        if (!filteredWithPairs.some(m => m.id === messagesToShow[i-1].id)) {
          filteredWithPairs.push(messagesToShow[i-1])
        }
      }
      if (!filteredWithPairs.some(m => m.id === msg.id)) {
        filteredWithPairs.push(msg)
      }
    }
  })

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-blue-900 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg border-0 shadow-xl">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg">
                    <Bot className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-2xl bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                      Flight Assistant
                    </CardTitle>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Your personalized travel companion powered by AI
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={clearChatHistory}
                    className="flex items-center gap-2"
                  >
                    <Trash2 className="h-4 w-4" />
                    Clear
                  </Button>
                </div>
              </div>
            </CardHeader>
          </Card>
        </div>

        {/* Centered welcome card with same width as header, only when no messages */}
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center w-full max-w-6xl mx-auto">
            <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg border-0 shadow-xl w-full">
              <CardContent className="p-0">
                <div className="h-[600px] flex flex-col items-center justify-center p-8">
                  <div className="flex flex-col items-center justify-center w-full">
                    <div className="bg-gradient-to-br from-blue-500/80 to-purple-600/80 rounded-full p-4 shadow-lg mb-6">
                      <Bot className="h-14 w-14 text-white drop-shadow-xl" />
                    </div>
                    <h3 className="text-3xl font-extrabold text-center bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2 tracking-tight">
                      Welcome to your Flight Assistant!
                    </h3>
                    <p className="text-base text-gray-700 dark:text-gray-300 max-w-xl text-center mb-6">
                      Ask anything about your travel history, get flight recommendations, or plan your next adventure.<br />
                      <span className="text-blue-600 dark:text-blue-300 font-semibold">I have access to your flight statistics to provide personalized suggestions.</span>
                    </p>
                    <div className="mt-2 px-5 py-3 bg-white/80 dark:bg-gray-900/80 border border-blue-200 dark:border-blue-900 rounded-xl shadow flex items-center gap-2 max-w-md mx-auto">
                      <span className="text-blue-500 dark:text-blue-300">
                        <svg xmlns='http://www.w3.org/2000/svg' className='h-5 w-5' fill='none' viewBox='0 0 24 24' stroke='currentColor'><path strokeLinecap='round' strokeLinejoin='round' strokeWidth='2' d='M13 16h-1v-4h-1m1-4h.01M12 20a8 8 0 100-16 8 8 0 000 16z' /></svg>
                      </span>
                      <span className="text-sm text-blue-700 dark:text-blue-300">
                        <b>Tip:</b> Keep messages concise (under 1000 characters) for faster responses
                      </span>
                    </div>
                  </div>
                    </div>
              </CardContent>
            </Card>
            {/* Input box directly below welcome card */}
            <div className="w-full max-w-6xl mx-auto mt-6">
              <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg border-0 shadow-xl">
                <CardContent className="p-4">
                  <div className="flex gap-2">
                    <Input
                      value={inputMessage}
                      onChange={(e) => setInputMessage(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder="Ask about your flights, get recommendations, or plan your next trip..."
                      disabled={isLoading}
                      className="flex-1 bg-white/50 dark:bg-gray-800/50 border-gray-300 dark:border-gray-600"
                    />
                    <Button
                      onClick={handleSendMessage}
                      disabled={isLoading || !inputMessage.trim()}
                      className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
                    >
                      {isLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                    </Button>
                    </div>
                </CardContent>
              </Card>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className={cn("space-y-4", userStats ? "lg:col-span-3" : "lg:col-span-4")}>
            <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg border-0 shadow-xl">
              <CardContent className="p-0">
                <div className="h-[600px] overflow-y-auto p-6 space-y-4">
                    <div className="flex justify-end mb-2">
                      <Button
                        variant={showOnlyPinned ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setShowOnlyPinned(v => !v)}
                        className="gap-2"
                        aria-pressed={showOnlyPinned}
                      >
                        <Pin className="h-4 w-4" />
                        {showOnlyPinned ? 'Showing only pinned' : 'Show only pinned'}
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2 mb-4 items-end">
                      <div className="flex items-center gap-2">
                        <Search className="h-4 w-4 text-gray-400" />
                        <Input
                          value={searchKeyword}
                          onChange={e => setSearchKeyword(e.target.value)}
                          placeholder="Search messages..."
                          className="w-48"
                          aria-label="Search by keyword"
                        />
                      </div>
                      <Input
                        type="date"
                        value={searchDate}
                        onChange={e => setSearchDate(e.target.value)}
                        className="w-40"
                        aria-label="Filter by date"
                      />
                      <select
                        value={searchRole}
                        onChange={e => setSearchRole(e.target.value as any)}
                        className="border rounded px-2 py-1 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200"
                        aria-label="Filter by type"
                      >
                        <option value="all">All</option>
                        <option value="user">User</option>
                        <option value="assistant">Assistant</option>
                      </select>
                    </div>
                    {filteredWithPairs.map((message, index) => (
                    <div
                      key={index}
                      className={cn(
                        "flex gap-3 max-w-[80%]",
                        message.role === 'user' ? "ml-auto flex-row-reverse" : "mr-auto"
                      )}
                    >
                      <div className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
                        message.role === 'user' 
                          ? "bg-gradient-to-r from-blue-500 to-purple-600" 
                          : "bg-gradient-to-r from-green-500 to-teal-600"
                      )}>
                        {message.role === 'user' ? (
                          <User className="h-4 w-4 text-white" />
                        ) : (
                          <Bot className="h-4 w-4 text-white" />
                        )}
                      </div>
                      
                      <div
                        className={cn(
                          "rounded-xl px-4 py-3 max-w-full relative",
                          message.role === 'user'
                            ? "bg-gradient-to-r from-blue-500 to-purple-600 text-white"
                              : "bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100",
                          message.pinned && 'ring-2 ring-yellow-400 shadow-lg',
                        )}
                        id={message.role === 'assistant' ? `assistant-msg-${message.id}` : undefined}
                      >
                        <div className="text-sm whitespace-pre-wrap break-words">
                            {highlightText(message.content, searchKeyword)}
                          {message.isStreaming && (
                            <span className="inline-block w-2 h-4 bg-current animate-pulse ml-1" />
                          )}
                        </div>
                        <div className={cn(
                          "text-xs mt-2 opacity-70",
                          message.role === 'user' ? "text-white" : "text-gray-500 dark:text-gray-400"
                        )}>
                          {new Date(message.timestamp).toLocaleTimeString()}
                          </div>
                          {message.role === 'assistant' && (
                            <div className="absolute top-2 right-2 flex gap-1 z-10">
                              <button
                                className={cn('p-1 rounded-full', message.pinned ? 'bg-yellow-200' : 'bg-white/40 hover:bg-yellow-100')}
                                aria-label={message.pinned ? 'Unpin message' : 'Pin message'}
                                onClick={() => handlePinMessage(message.id!, !message.pinned)}
                                tabIndex={0}
                              >
                                <Pin className={cn('h-4 w-4', message.pinned ? 'text-yellow-500' : 'text-gray-400')} fill={message.pinned ? 'currentColor' : 'none'} />
                              </button>
                              <button
                                className={cn('p-1 rounded-full bg-white/40 hover:bg-blue-100')}
                                aria-label="Export as PDF"
                                onClick={() => handleExportPDF(message.id!)}
                                tabIndex={0}
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-4 w-4 text-blue-500"><path strokeLinecap="round" strokeLinejoin="round" d="M12 16v-8m0 8l-3-3m3 3l3-3M4.5 19.5A2.25 2.25 0 006.75 21h10.5a2.25 2.25 0 002.25-2.25v-15A2.25 2.25 0 0017.25 1.5H6.75A2.25 2.25 0 004.5 4.5v15z" /></svg>
                              </button>
                            </div>
                          )}
                      </div>
                    </div>
                  ))}

                    {/* Loader and description when generating answer */}
                    {isLoading && (
                      <div className="flex items-center gap-3 mt-4" aria-live="polite">
                        <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
                        <span className="text-sm text-blue-700 dark:text-blue-300 font-medium">Generating answer, please wait...</span>
                      </div>
                    )}
                  
                  <div ref={messagesEndRef} />
                </div>

                <div className="border-t border-gray-200 dark:border-gray-700 p-4">
                  <div className="flex gap-2">
                    <Input
                      value={inputMessage}
                      onChange={(e) => setInputMessage(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder="Ask about your flights, get recommendations, or plan your next trip..."
                      disabled={isLoading}
                      className="flex-1 bg-white/50 dark:bg-gray-800/50 border-gray-300 dark:border-gray-600"
                    />
                    <Button
                      onClick={handleSendMessage}
                      disabled={isLoading || !inputMessage.trim()}
                      className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
                    >
                      {isLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
        )}
      </div>
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-blue-600 text-white px-4 py-2 rounded shadow-lg z-50 animate-fade-in">
          {toast}
        </div>
      )}
    </div>
  )
} 