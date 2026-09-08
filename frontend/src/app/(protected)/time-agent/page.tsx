'use client'

/**
 * TODO: Replace this simulated response with a real call to an n8n webhook or Supabase function once the backend team defines one.
 * Currently, responses are mocked locally for UI demonstration and site testing.
 */

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
}

const EXAMPLE_PROMPTS = [
  'Started hydro testing Line 24-XX at 10 AM',
  'Completed 50m earthwork excavation at Sector 4',
  'Poured 120m³ concrete for Pier 3 foundation',
]

function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
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

  const handleSend = (textToSend?: string) => {
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

    /**
     * SIMULATED AGENT RESPONSE:
     * Parrots back a fake structured confirmation after a ~1s delay.
     * TODO: Replace with real backend call (n8n webhook / Supabase function) when available.
     */
    setTimeout(() => {
      const agentMsg: Message = {
        id: `agent-${Date.now()}`,
        sender: 'agent',
        text: `Got it — logging: "${messageText}". This is a SIMULATED response, not yet connected to the real extraction pipeline.`,
        timestamp: formatTime(new Date()),
      }
      setMessages((prev) => [...prev, agentMsg])
      setIsTyping(false)
    }, 1000)
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
                    className={`p-3.5 rounded-lg text-sm leading-relaxed shadow-sm ${
                      isUser
                        ? 'bg-primary text-on-primary font-medium rounded-br-none'
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
                  <span>Time Agent is processing your log...</span>
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
