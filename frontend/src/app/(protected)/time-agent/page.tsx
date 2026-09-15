'use client'

import { useState, useRef, useEffect, FormEvent } from 'react'
import { Send, Bot, User, Sparkles, Loader2, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'

interface Message {
  id: string
  sender: 'user' | 'agent'
  text: string
  timestamp: string
  isError?: boolean
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
        body: JSON.stringify({ message: messageText }),
      })

      const data = await res.json().catch(() => null)

      if (!res.ok || (data && data.error)) {
        const errorMsg = data?.error || `Server returned error (${res.status})`
        const agentErrorMsg: Message = {
          id: `agent-${Date.now()}`,
          sender: 'agent',
          text: `Couldn't process that — ${errorMsg}. Try again?`,
          timestamp: formatTime(new Date()),
          isError: true,
        }
        setMessages((prev) => [...prev, agentErrorMsg])
      } else {
        const responseText = formatAgentResponse(data)
        const agentMsg: Message = {
          id: `agent-${Date.now()}`,
          sender: 'agent',
          text: responseText,
          timestamp: formatTime(new Date()),
        }
        setMessages((prev) => [...prev, agentMsg])
      }
    } catch (err: unknown) {
      const errMessage = err instanceof Error ? err.message : 'Network error'
      const agentErrorMsg: Message = {
        id: `agent-${Date.now()}`,
        sender: 'agent',
        text: `Couldn't process that — ${errMessage}. Try again?`,
        timestamp: formatTime(new Date()),
        isError: true,
      }
      setMessages((prev) => [...prev, agentErrorMsg])
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
    <div className="flex flex-col h-[calc(100vh-6.5rem)] bg-[#000000] p-4 sm:p-6 space-y-4 max-w-5xl mx-auto">
      {/* PAGE HEADER */}
      <div className="shrink-0 border-b border-[#e2bf29]/20 pb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-[#111111] border border-[#e2bf29]/40 rounded-lg text-[#e2bf29]">
            <Bot className="size-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight font-display font-heading text-[#e2bf29]">
              Time Agent
            </h1>
            <p className="text-sm text-[#f1f2f3]/80 font-sans">
              Tell me what happened at site — I&apos;ll log it.
            </p>
          </div>
        </div>
      </div>

      {/* CHAT CONTAINER */}
      <Card className="flex-1 flex flex-col min-h-0 bg-[#070707] border border-[#e2bf29]/30 rounded-xl overflow-hidden shadow-lg">
        {/* MESSAGE HISTORY AREA */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 scrollbar-thin scrollbar-thumb-zinc-800">
          {messages.map((msg) => {
            const isUser = msg.sender === 'user'
            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} space-y-1`}
              >
                <div className="flex items-end gap-2 max-w-[85%] sm:max-w-[75%]">
                  {!isUser && (
                    <div className="shrink-0 size-7 rounded-full bg-[#111111] border border-[#e2bf29]/40 flex items-center justify-center text-[#e2bf29] shadow-sm mb-1">
                      <Bot className="size-4" />
                    </div>
                  )}

                  <div
                    className={`p-3.5 rounded-lg text-sm leading-relaxed shadow-sm whitespace-pre-wrap ${
                      isUser
                        ? 'bg-primary text-on-primary font-medium rounded-br-none'
                        : msg.isError
                        ? 'bg-[#b71511]/10 text-[#ffffff] border border-[#b71511]/50 rounded-bl-none'
                        : 'bg-surface-container-low text-white border border-[#e2bf29]/20 rounded-bl-none'
                    }`}
                  >
                    {msg.text}
                  </div>

                  {isUser && (
                    <div className="shrink-0 size-7 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center text-primary shadow-sm mb-1">
                      <User className="size-4" />
                    </div>
                  )}
                </div>

                <div
                  className={`flex items-center gap-1 text-[11px] text-[#f1f2f3]/60 px-1 ${
                    isUser ? 'pr-9' : 'pl-9'
                  }`}
                >
                  <Clock className="size-3" />
                  <span>{msg.timestamp}</span>
                </div>
              </div>
            )
          })}

          {/* TYPING INDICATOR */}
          {isTyping && (
            <div className="flex flex-col items-start space-y-1">
              <div className="flex items-center gap-2">
                <div className="shrink-0 size-7 rounded-full bg-[#111111] border border-[#e2bf29]/40 flex items-center justify-center text-[#e2bf29] shadow-sm">
                  <Bot className="size-4" />
                </div>
                <div className="bg-surface-container-low text-[#f1f2f3] border border-[#e2bf29]/20 p-3 rounded-lg rounded-bl-none flex items-center gap-2 text-xs">
                  <Loader2 className="size-3.5 animate-spin text-[#e2bf29]" />
                  <span>Agent is thinking...</span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* INPUT AREA (PINNED AT BOTTOM) */}
        <div className="p-4 bg-[#111111] border-t border-[#e2bf29]/20 space-y-3 shrink-0">
          {/* EXAMPLE PROMPT CHIPS */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-[#e2bf29] flex items-center gap-1">
              <Sparkles className="size-3" /> Quick prompts:
            </span>
            {EXAMPLE_PROMPTS.map((prompt, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleChipClick(prompt)}
                className="text-xs bg-[#070707] hover:bg-[#1a1a1a] text-[#f1f2f3] border border-[#e2bf29]/30 hover:border-[#e2bf29] px-2.5 py-1 rounded-full transition-all cursor-pointer truncate max-w-[280px] sm:max-w-none"
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
              className="flex-1 bg-[#070707] border-[#e2bf29]/40 text-foreground placeholder:text-muted-foreground focus-visible:ring-[#e2bf29]/50 h-10 px-3 text-sm rounded-lg"
            />
            <Button
              type="submit"
              disabled={!input.trim() || isTyping}
              className="bg-primary text-on-primary font-bold hover:bg-[#c9a720] h-10 px-4 rounded-lg shadow-[rgba(226,191,41,0.25)_0px_0px_10px] transition-all cursor-pointer shrink-0 disabled:opacity-50"
            >
              <Send className="size-4 mr-1.5" />
              Send
            </Button>
          </form>
        </div>
      </Card>
    </div>
  )
}
