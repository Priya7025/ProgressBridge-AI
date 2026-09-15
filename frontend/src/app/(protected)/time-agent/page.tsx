'use client'

import { useState, useRef, useEffect, FormEvent } from 'react'
import { Send, Bot, User, Sparkles, Loader2, Clock, CheckCircle2, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { useCurrentUser } from '@/lib/hooks/use-user'

interface ExtractedEventItem {
  activity_description: string
  event_type: string
  discipline?: string | null
  location?: string | null
  asset?: string | null
  event_date?: string | null
  quantity?: string | null
  delay_reason?: string | null
}

interface Message {
  id: string
  sender: 'user' | 'agent'
  text: string
  timestamp: string
  isError?: boolean
  events?: ExtractedEventItem[]
}

const EXAMPLE_PROMPTS = [
  'Started hydro testing Line 24-XX at 10 AM',
  'Completed 50m earthwork excavation at Sector 4',
  'Poured 120m³ concrete for Pier 3 foundation',
]

function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function formatAgentResponse(resData: Record<string, any> | null | undefined): string {
  if (!resData) return 'No response data received.'

  const parts: string[] = []

  // If response has a top-level message field, display it
  if (resData.message && typeof resData.message === 'string') {
    parts.push(resData.message)
  }

  // Direct match check at root level
  const isMatched = resData.matched === true || resData.status === 'MATCHED' || Boolean(resData.matched_activity)
  const isUnmatched = resData.status === 'UNMATCHED' || resData.matched === false

  if (isMatched) {
    const code =
      resData.activity_code ||
      resData.activity_id ||
      resData.matched_activity?.activity_id ||
      resData.matched_activity?.code ||
      ''
    const desc = resData.activity_description || resData.matched_activity?.description || resData.description || ''
    const confidence =
      resData.confidence_score ?? resData.confidence ?? resData.final_score ?? resData.matched_activity?.confidence
    const confStr =
      confidence !== undefined && confidence !== null
        ? ` (Confidence: ${typeof confidence === 'number' ? (confidence <= 1 ? Math.round(confidence * 100) : confidence) : confidence}%)`
        : ''
    const codeDesc = [code, desc].filter(Boolean).join(' - ')
    parts.push(`Matched Activity: ${codeDesc || 'Activity'}${confStr}`)
  } else if (isUnmatched) {
    const discipline = resData.discipline || resData.data?.discipline
    const location = resData.location || resData.data?.location
    const eventType = resData.event_type || resData.data?.event_type
    const details = [discipline, location, eventType].filter(Boolean).join(' / ')
    parts.push(`No confident match found for: ${details || 'reported event'}`)
  }

  // Events array check (e.g. from n8n extraction output)
  const events = resData.events || resData.data?.events
  if (Array.isArray(events) && events.length > 0) {
    const eventSummaries = events.map((evt: Record<string, any>) => {
      if (evt.matched === true || evt.status === 'MATCHED' || evt.matched_activity || evt.activity_code) {
        const code = evt.activity_code || evt.activity_id || evt.matched_activity?.code || ''
        const desc = evt.activity_description || evt.matched_activity?.description || ''
        const confidence = evt.confidence_score ?? evt.confidence ?? evt.final_score
        const confStr =
          confidence !== undefined && confidence !== null
            ? ` (Confidence: ${typeof confidence === 'number' ? (confidence <= 1 ? Math.round(confidence * 100) : confidence) : confidence}%)`
            : ''
        const codeDesc = [code, desc].filter(Boolean).join(' - ')
        return `Matched Activity: ${codeDesc || 'Activity'}${confStr}`
      } else if (evt.status === 'UNMATCHED') {
        const details = [evt.discipline, evt.location, evt.event_type].filter(Boolean).join(' / ')
        return `No confident match found for: ${details || evt.activity_description || 'reported activity'}`
      } else {
        const details = [
          evt.event_type,
          evt.discipline,
          evt.location,
          evt.quantity ? `Qty: ${evt.quantity}` : null,
        ]
          .filter(Boolean)
          .join(' · ')
        return `Extracted Event: "${evt.activity_description}" [${details}]`
      }
    })
    parts.push(...eventSummaries)
  }

  if (parts.length === 0) {
    if (typeof resData === 'string') return resData
    if (resData.raw && typeof resData.raw === 'string') return resData.raw
    return JSON.stringify(resData, null, 2)
  }

  return parts.join('\n\n')
}

export default function TimeAgentPage() {
  const user = useCurrentUser()
  const activeProjectId = user?.project_ids?.[0]

  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome-msg',
      sender: 'agent',
      text: "Hello! I'm your Time Agent. Tell me what happened at site today — I'll log and structure your activity updates.",
      timestamp: '09:00 AM',
    },
  ])
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, isTyping])

  const handleSend = async (textToSend?: string) => {
    const messageText = (textToSend ?? input).trim()
    if (!messageText || isTyping) return

    const now = new Date()
    const userMsg: Message = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: messageText,
      timestamp: formatTime(now),
    }

    setMessages((prev) => [...prev, userMsg])
    setInput('')
    setIsTyping(true)

    try {
      const res = await fetch('/api/time-agent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: messageText,
          projectId: activeProjectId,
        }),
      })

      const data = await res.json().catch(() => null)

      if (!res.ok || !data?.success) {
        let errorMsg =
          'Time Agent backend is not connected yet. Configure INGESTION_WEBHOOK_URL in your environment variables to enable live AI extraction.'
        if (data?.error === 'NOT_CONFIGURED') {
          errorMsg =
            'Time Agent backend is not connected yet. Configure INGESTION_WEBHOOK_URL in your environment variables to enable live AI extraction.'
        } else if (data?.message) {
          errorMsg = data.message
        }

        const agentErrorMsg: Message = {
          id: `agent-${Date.now()}`,
          sender: 'agent',
          text: errorMsg,
          timestamp: formatTime(new Date()),
          isError: true,
        }
        setMessages((prev) => [...prev, agentErrorMsg])
        return
      }

      // Successful n8n / AI extraction response handling
      const n8nResult = data.data
      const eventsList: ExtractedEventItem[] =
        n8nResult?.data?.events || n8nResult?.events || []

      if (eventsList.length > 0) {
        const agentSuccessMsg: Message = {
          id: `agent-${Date.now()}`,
          sender: 'agent',
          text: `Successfully extracted and saved ${eventsList.length} progress event(s) to database:`,
          timestamp: formatTime(new Date()),
          events: eventsList,
        }
        setMessages((prev) => [...prev, agentSuccessMsg])
      } else if (n8nResult?.status === 'NO_EVENTS') {
        const agentNoEventMsg: Message = {
          id: `agent-${Date.now()}`,
          sender: 'agent',
          text: "I received your update, but could not detect any specific construction progress events. Please provide details like the specific activity, location, or status.",
          timestamp: formatTime(new Date()),
        }
        setMessages((prev) => [...prev, agentNoEventMsg])
      } else {
        const agentGeneralMsg: Message = {
          id: `agent-${Date.now()}`,
          sender: 'agent',
          text: n8nResult?.message || formatAgentResponse(data),
          timestamp: formatTime(new Date()),
        }
        setMessages((prev) => [...prev, agentGeneralMsg])
      }
    } catch (err: unknown) {
      const error = err as Error
      const agentNetworkErrorMsg: Message = {
        id: `agent-${Date.now()}`,
        sender: 'agent',
        text: `Network error connecting to Time Agent API: ${error.message}`,
        timestamp: formatTime(new Date()),
        isError: true,
      }
      setMessages((prev) => [...prev, agentNetworkErrorMsg])
    } finally {
      setIsTyping(false)
    }
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    handleSend()
  }

  const handleChipClick = (prompt: string) => {
    setInput(prompt)
  }

  return (
    <div className="flex flex-col h-[calc(100dvh-5.5rem)] sm:h-[calc(100dvh-6.5rem)] space-y-3 sm:space-y-4 max-w-5xl mx-auto w-full transition-colors duration-200">
      {/* PAGE HEADER */}
      <div className="shrink-0 border-b border-border/40 pb-3 sm:pb-4">
        <div className="flex items-center gap-2.5 sm:gap-3">
          <div className="p-2 sm:p-2.5 bg-muted border border-primary/40 rounded-lg text-primary shrink-0">
            <Bot className="size-5 sm:size-6" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight font-display font-heading text-primary truncate">
              Time Agent
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground font-sans truncate">
              Tell me what happened at site — I&apos;ll log it.
            </p>
          </div>
        </div>
      </div>

      {/* CHAT CONTAINER */}
      <Card className="flex-1 flex flex-col min-h-0 bg-card border border-border/60 rounded-xl overflow-hidden shadow-lg">
        {/* MESSAGE HISTORY AREA */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-5 md:p-6 space-y-3.5 sm:space-y-4 scrollbar-thin scrollbar-thumb-zinc-800">
          {messages.map((msg) => {
            const isUser = msg.sender === 'user'
            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} space-y-1`}
              >
                <div className="flex items-end gap-1.5 sm:gap-2 max-w-[92%] sm:max-w-[80%] md:max-w-[75%]">
                  {!isUser && (
                    <div
                      className={`shrink-0 size-6 sm:size-7 rounded-full flex items-center justify-center shadow-sm mb-1 ${
                        msg.isError
                          ? 'bg-destructive/20 border border-destructive/50 text-destructive'
                          : 'bg-muted border border-primary/40 text-primary'
                      }`}
                    >
                      {msg.isError ? (
                        <AlertCircle className="size-3.5 sm:size-4" />
                      ) : (
                        <Bot className="size-3.5 sm:size-4" />
                      )}
                    </div>
                  )}

                  <div
                    className={`p-3 sm:p-3.5 rounded-lg text-xs sm:text-sm leading-relaxed shadow-sm break-words ${
                      isUser
                        ? 'bg-primary text-primary-foreground font-medium rounded-br-none'
                        : msg.isError
                        ? 'bg-destructive/10 text-destructive border border-destructive/30 rounded-bl-none'
                        : 'bg-muted text-foreground border border-border/50 rounded-bl-none'
                    }`}
                  >
                    <div>{msg.text}</div>

                    {/* STRUCTURED EXTRACTED EVENTS PREVIEW CARDS */}
                    {msg.events && msg.events.length > 0 && (
                      <div className="mt-2.5 sm:mt-3 space-y-2">
                        {msg.events.map((evt, idx) => (
                          <div
                            key={idx}
                            className="bg-card/80 border border-primary/30 p-2 sm:p-2.5 rounded-md text-[11px] sm:text-xs space-y-1 text-foreground"
                          >
                            <div className="flex items-center justify-between gap-1.5 flex-wrap">
                              <span className="font-semibold text-foreground flex items-center gap-1">
                                <CheckCircle2 className="size-3 sm:size-3.5 text-primary shrink-0" />
                                <span>{evt.activity_description}</span>
                              </span>
                              <span className="px-1.5 py-0.5 rounded bg-primary/15 text-primary font-mono font-bold text-[9px] sm:text-[10px] uppercase shrink-0">
                                {evt.event_type}
                              </span>
                            </div>
                            <div className="flex flex-wrap items-center gap-x-2.5 sm:gap-x-3 gap-y-1 text-[10px] sm:text-[11px] text-muted-foreground pt-0.5">
                              {evt.discipline && (
                                <span>
                                  Discipline:{' '}
                                  <strong className="text-foreground">
                                    {evt.discipline}
                                  </strong>
                                </span>
                              )}
                              {evt.location && (
                                <span>
                                  Location:{' '}
                                  <strong className="text-foreground">
                                    {evt.location}
                                  </strong>
                                </span>
                              )}
                              {evt.asset && (
                                <span>
                                  Asset:{' '}
                                  <strong className="text-foreground">
                                    {evt.asset}
                                  </strong>
                                </span>
                              )}
                              {evt.quantity && (
                                <span>
                                  Qty:{' '}
                                  <strong className="text-foreground">
                                    {evt.quantity}
                                  </strong>
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {isUser && (
                    <div className="shrink-0 size-6 sm:size-7 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center text-primary shadow-sm mb-1">
                      <User className="size-3.5 sm:size-4" />
                    </div>
                  )}
                </div>

                <div
                  className={`flex items-center gap-1 text-[10px] sm:text-[11px] text-muted-foreground px-1 ${
                    isUser ? 'pr-7 sm:pr-9' : 'pl-7 sm:pl-9'
                  }`}
                >
                  <Clock className="size-2.5 sm:size-3" />
                  <span>{msg.timestamp}</span>
                </div>
              </div>
            )
          })}

          {/* TYPING INDICATOR */}
          {isTyping && (
            <div className="flex flex-col items-start space-y-1">
              <div className="flex items-center gap-2">
                <div className="shrink-0 size-6 sm:size-7 rounded-full bg-muted border border-primary/40 flex items-center justify-center text-primary shadow-sm">
                  <Bot className="size-3.5 sm:size-4" />
                </div>
                <div className="bg-muted text-foreground border border-border/40 p-2.5 sm:p-3 rounded-lg rounded-bl-none flex items-center gap-2 text-xs">
                  <Loader2 className="size-3.5 animate-spin text-primary" />
                  <span>Time Agent is processing your log...</span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* INPUT AREA (PINNED AT BOTTOM) */}
        <div className="p-2.5 sm:p-4 bg-muted/40 border-t border-border/40 space-y-2.5 sm:space-y-3 shrink-0">
          {/* EXAMPLE PROMPT CHIPS */}
          <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-1 sm:pb-0 sm:flex-wrap">
            <span className="text-[11px] sm:text-xs font-semibold text-primary flex items-center gap-1 shrink-0">
              <Sparkles className="size-3" /> Quick:
            </span>
            {EXAMPLE_PROMPTS.map((prompt, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleChipClick(prompt)}
                className="text-[11px] sm:text-xs bg-card hover:bg-muted text-foreground border border-border/60 hover:border-primary px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full transition-all cursor-pointer whitespace-nowrap shrink-0 max-w-[220px] sm:max-w-none truncate shadow-xs"
              >
                {prompt}
              </button>
            ))}
          </div>

          {/* INPUT FORM */}
          <form onSubmit={handleSubmit} className="flex items-center gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your site progress update here..."
              disabled={isTyping}
              className="flex-1 bg-background border-border/60 text-foreground placeholder:text-muted-foreground focus-visible:ring-primary/50 h-9 sm:h-10 px-3 text-xs sm:text-sm rounded-lg"
            />
            <Button
              type="submit"
              disabled={!input.trim() || isTyping}
              className="bg-primary text-primary-foreground font-bold hover:opacity-90 h-9 sm:h-10 px-3 sm:px-4 rounded-lg shadow-[rgba(226,191,41,0.25)_0px_0px_10px] transition-all cursor-pointer shrink-0 disabled:opacity-50 text-xs sm:text-sm"
            >
              <Send className="size-3.5 sm:size-4 sm:mr-1.5" />
              <span className="hidden sm:inline">Send</span>
            </Button>
          </form>
        </div>
      </Card>
    </div>
  )
}
