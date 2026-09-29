'use client'

import { useState, useRef, useEffect, useMemo, FormEvent } from 'react'
import {
  Send,
  Bot,
  User,
  Sparkles,
  Loader2,
  Clock,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
} from 'lucide-react'
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
  type?: 'intelligence' | 'capture' | 'error'
  events?: ExtractedEventItem[]
}

const PLANNER_PROMPTS = [
  'What happened to PIP-2458?',
  'What is the status of activity PIP-2458?',
  'Which activities are delayed?',
  'Show Piping activities',
  'Which activities are pending review?',
  'What is the project summary?',
]

const SUPERVISOR_PROMPTS = [
  'Started hydro testing Line 24-XX at 10 AM',
  'Completed 50m earthwork excavation at Sector 4',
  'Poured 120m³ concrete for Pier 3 foundation',
  'Work halted on Line 24-XX due to crane breakdown',
]

function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

/**
 * Lightweight renderer for formatted markdown-like text in chat bubbles
 */
function FormattedMessageText({ text }: { text: string }) {
  const lines = text.split('\n')

  return (
    <div className="space-y-1.5 leading-relaxed text-xs sm:text-sm">
      {lines.map((line, idx) => {
        const trimmed = line.trim()
        if (!trimmed) {
          return <div key={idx} className="h-1" />
        }

        // Headers
        if (trimmed.startsWith('### ')) {
          return (
            <h3
              key={idx}
              className="text-xs sm:text-sm font-bold text-foreground mt-2 mb-1 flex items-center gap-1.5"
            >
              <TrendingUp className="size-3.5 text-primary shrink-0" />
              <span>{renderInlineFormatting(trimmed.replace(/^###\s+/, ''))}</span>
            </h3>
          )
        }
        if (trimmed.startsWith('#### ')) {
          return (
            <h4
              key={idx}
              className="text-[11px] sm:text-xs font-semibold text-primary/90 mt-1.5 mb-0.5"
            >
              {renderInlineFormatting(trimmed.replace(/^####\s+/, ''))}
            </h4>
          )
        }

        // Bullet points
        if (trimmed.startsWith('• ') || trimmed.startsWith('- ') || /^\d+\.\s+/.test(trimmed)) {
          return (
            <div key={idx} className="flex items-start gap-1.5 pl-1 text-foreground/90">
              <span className="text-primary select-none shrink-0">•</span>
              <span className="flex-1">
                {renderInlineFormatting(
                  trimmed.replace(/^[•-]\s+/, '').replace(/^\d+\.\s+/, '')
                )}
              </span>
            </div>
          )
        }

        return <div key={idx}>{renderInlineFormatting(trimmed)}</div>
      })}
    </div>
  )
}

function renderInlineFormatting(str: string) {
  // Replace bold **text** and code `text`
  const parts: React.ReactNode[] = []
  let remaining = str
  let key = 0

  while (remaining.length > 0) {
    const boldMatch = remaining.match(/\*\*(.+?)\*\*/)
    const codeMatch = remaining.match(/`(.+?)`/)
    const italicMatch = remaining.match(/\*(.+?)\*/)

    // Find earliest match
    const matches = [
      boldMatch ? { type: 'bold', index: boldMatch.index!, length: boldMatch[0].length, content: boldMatch[1] } : null,
      codeMatch ? { type: 'code', index: codeMatch.index!, length: codeMatch[0].length, content: codeMatch[1] } : null,
      italicMatch ? { type: 'italic', index: italicMatch.index!, length: italicMatch[0].length, content: italicMatch[1] } : null,
    ].filter(Boolean).sort((a, b) => a!.index - b!.index)

    if (matches.length === 0 || !matches[0]) {
      parts.push(remaining)
      break
    }

    const first = matches[0]!
    if (first.index > 0) {
      parts.push(remaining.slice(0, first.index))
    }

    if (first.type === 'bold') {
      parts.push(<strong key={key++} className="font-semibold text-foreground">{first.content}</strong>)
    } else if (first.type === 'code') {
      parts.push(
        <code
          key={key++}
          className="px-1.5 py-0.5 rounded bg-primary/10 text-primary font-mono text-[10px] sm:text-xs font-bold"
        >
          {first.content}
        </code>
      )
    } else if (first.type === 'italic') {
      parts.push(<em key={key++} className="italic text-muted-foreground">{first.content}</em>)
    }

    remaining = remaining.slice(first.index + first.length)
  }

  return parts
}

export default function TimeAgentPage() {
  const user = useCurrentUser()
  const activeProjectId = user?.project_ids?.[0]
  const isSupervisor = user?.role?.toLowerCase() === 'supervisor'

  const examplePrompts = isSupervisor ? SUPERVISOR_PROMPTS : PLANNER_PROMPTS

  const welcomeText = isSupervisor
    ? "Hello! I'm your Time Agent. Tell me what happened at site today — I'll log and structure your activity updates."
    : "Hello! I'm your Project Intelligence Agent. Ask me anything about schedule status, delayed activities, reviews, or specific activity histories like 'What happened to PIP-2458?'"

  const [chatLogs, setChatLogs] = useState<Message[]>([])
  const messages: Message[] = useMemo(() => [
    {
      id: 'welcome-msg',
      sender: 'agent',
      text: welcomeText,
      timestamp: '09:00 AM',
      type: 'intelligence',
    },
    ...chatLogs,
  ], [welcomeText, chatLogs])

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

    setChatLogs((prev) => [...prev, userMsg])
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
          role: user?.role || (isSupervisor ? 'supervisor' : 'planner'),
        }),
      })

      const data = await res.json().catch(() => null)

      if (!res.ok || !data?.success) {
        let errorMsg =
          'Time Agent backend is not connected yet. Please verify your environment configuration.'
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
          type: 'error',
        }
        setChatLogs((prev) => [...prev, agentErrorMsg])
        return
      }

      // Case 1: Planner Intelligence Response
      if (data.type === 'intelligence' || data.intent) {
        const agentIntelMsg: Message = {
          id: `agent-${Date.now()}`,
          sender: 'agent',
          text: data.message || 'No intelligence data returned.',
          timestamp: formatTime(new Date()),
          type: 'intelligence',
        }
        setChatLogs((prev) => [...prev, agentIntelMsg])
        return
      }

      // Case 2: Supervisor Capture Response
      const eventsList: ExtractedEventItem[] =
        data?.data?.events || data?.events || []

      if (eventsList.length > 0) {
        const agentSuccessMsg: Message = {
          id: `agent-${Date.now()}`,
          sender: 'agent',
          text: `Successfully extracted and saved ${eventsList.length} progress event(s) to database:`,
          timestamp: formatTime(new Date()),
          type: 'capture',
          events: eventsList,
        }
        setChatLogs((prev) => [...prev, agentSuccessMsg])
      } else {
        const agentGeneralMsg: Message = {
          id: `agent-${Date.now()}`,
          sender: 'agent',
          text: data?.message || data?.data?.message || 'Update processed.',
          timestamp: formatTime(new Date()),
          type: 'intelligence',
        }
        setChatLogs((prev) => [...prev, agentGeneralMsg])
      }
    } catch (err: unknown) {
      const error = err as Error
      const agentNetworkErrorMsg: Message = {
        id: `agent-${Date.now()}`,
        sender: 'agent',
        text: `Network error connecting to Time Agent API: ${error.message}`,
        timestamp: formatTime(new Date()),
        isError: true,
        type: 'error',
      }
      setChatLogs((prev) => [...prev, agentNetworkErrorMsg])
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
        <div className="flex items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="p-2 sm:p-2.5 bg-muted border border-primary/40 rounded-lg text-primary shrink-0">
              <Bot className="size-5 sm:size-6" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight font-display font-heading text-primary truncate">
                  {isSupervisor ? 'Time Agent' : 'Project Intelligence Agent'}
                </h1>
                <span className="px-2 py-0.5 rounded-full bg-primary/15 text-primary text-[10px] sm:text-xs font-semibold uppercase tracking-wider">
                  {isSupervisor ? 'Field Capture' : 'Planner Intelligence'}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground font-sans truncate">
                {isSupervisor
                  ? "Tell me what happened at site — I'll log and match it to the schedule."
                  : 'Ask project intelligence questions, query timelines, and monitor schedule variance.'}
              </p>
            </div>
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
                <div className="flex items-end gap-1.5 sm:gap-2 max-w-[94%] sm:max-w-[85%] md:max-w-[80%]">
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
                    className={`p-3 sm:p-4 rounded-lg text-xs sm:text-sm leading-relaxed shadow-sm break-words ${
                      isUser
                        ? 'bg-primary text-primary-foreground font-medium rounded-br-none'
                        : msg.isError
                        ? 'bg-destructive/10 text-destructive border border-destructive/30 rounded-bl-none'
                        : 'bg-muted/70 text-foreground border border-border/50 rounded-bl-none'
                    }`}
                  >
                    {isUser ? (
                      <div>{msg.text}</div>
                    ) : (
                      <FormattedMessageText text={msg.text} />
                    )}

                    {/* STRUCTURED EXTRACTED EVENTS PREVIEW CARDS (SUPERVISOR CAPTURE ONLY) */}
                    {msg.events && msg.events.length > 0 && (
                      <div className="mt-2.5 sm:mt-3 space-y-2">
                        {msg.events.map((evt, idx) => (
                          <div
                            key={idx}
                            className="bg-card/80 border border-primary/30 p-2.5 sm:p-3 rounded-md text-[11px] sm:text-xs space-y-1.5 text-foreground shadow-xs"
                          >
                            <div className="flex items-center justify-between gap-1.5 flex-wrap">
                              <span className="font-semibold text-foreground flex items-center gap-1.5">
                                <CheckCircle2 className="size-3.5 sm:size-4 text-primary shrink-0" />
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
                  <span>
                    {isSupervisor
                      ? 'Structuring site log and extracting event data...'
                      : 'Querying project intelligence and schedule data...'}
                  </span>
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
              <Sparkles className="size-3" /> {isSupervisor ? 'Quick Log:' : 'Suggested Questions:'}
            </span>
            {examplePrompts.map((prompt, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleChipClick(prompt)}
                className="text-[11px] sm:text-xs bg-card hover:bg-muted text-foreground border border-border/60 hover:border-primary px-2.5 sm:px-3 py-1 rounded-full transition-all cursor-pointer whitespace-nowrap shrink-0 max-w-[280px] sm:max-w-none truncate shadow-xs font-medium hover:text-primary"
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
              placeholder={
                isSupervisor
                  ? 'Type your site progress update here...'
                  : 'Ask a project intelligence question (e.g. "What happened to PIP-2458?")...'
              }
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
