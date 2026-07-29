'use client'

import { useState, useRef, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Send, Bot, User, Loader2, RefreshCw, Wrench, Mic, CheckCheck } from 'lucide-react'
import { toast } from 'sonner'

interface Clinic {
  id: string; name: string; agentName: string; agentGender: string; agentTone: string; agentWelcome: string
  agentEnabled: boolean
}

interface Msg {
  id: string
  direction: 'in' | 'out'
  body: string
  ts: Date
  toolCalls?: Array<{ name: string; args: Record<string, unknown>; result: unknown }>
}

export function AgentChatClient({ clinic }: { clinic: Clinic }) {
  const [messages, setMessages] = useState<Msg[]>([
    {
      id: 'welcome',
      direction: 'out',
      body: clinic.agentWelcome,
      ts: new Date(),
    },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [patientPhone] = useState('+923001234599')
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  async function send() {
    if (!input.trim() || loading) return
    const userMsg: Msg = { id: Math.random().toString(36).slice(2), direction: 'in', body: input, ts: new Date() }
    setMessages((prev) => [...prev, userMsg])
    setInput('')
    setLoading(true)

    try {
      const res = await fetch('/api/agent/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: input,
          patientPhone,
          conversationId,
        }),
      })
      const json = await res.json()
      if (!json.ok) {
        toast.error(json.error || 'Agent failed to respond')
        setMessages((prev) => [...prev, { id: 'err', direction: 'out', body: `Error: ${json.error}`, ts: new Date() }])
      } else {
        if (json.data.conversationId) setConversationId(json.data.conversationId)
        const agentMsg: Msg = {
          id: Math.random().toString(36).slice(2),
          direction: 'out',
          body: json.data.reply,
          ts: new Date(),
          toolCalls: json.data.toolCalls,
        }
        setMessages((prev) => [...prev, agentMsg])
        if (json.data.error) toast.warning(`Agent used fallback (LLM error: ${json.data.error.slice(0, 60)}...)`)
      }
    } catch (e) {
      toast.error('Network error')
    } finally {
      setLoading(false)
    }
  }

  async function resetSession() {
    await fetch('/api/agent/test', { method: 'POST' })
    setConversationId(null)
    setMessages([{ id: 'welcome', direction: 'out', body: clinic.agentWelcome, ts: new Date() }])
    toast.success('Session reset')
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold">AI Agent Test Console</h1>
          <p className="text-muted-foreground">Simulate a WhatsApp patient conversation with <strong>{clinic.agentName}</strong></p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={clinic.agentEnabled ? 'default' : 'destructive'}>{clinic.agentEnabled ? 'Agent On' : 'Agent Paused'}</Badge>
          <Badge variant="secondary" className="capitalize">{clinic.agentGender}</Badge>
          <Badge variant="outline" className="capitalize">{clinic.agentTone}</Badge>
          <Button variant="outline" size="sm" onClick={resetSession}><RefreshCw className="w-3 h-3 mr-1" />Reset Session</Button>
        </div>
      </div>

      <Card className="overflow-hidden">
        <CardHeader className="pb-3 bg-muted/30 border-b">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full brand-gradient flex items-center justify-center">
              <Bot className="w-5 h-5 text-brand-foreground" />
            </div>
            <div>
              <CardTitle className="text-base">{clinic.agentName}</CardTitle>
              <CardDescription className="flex items-center gap-1 text-xs">
                <span className="w-1.5 h-1.5 rounded-full bg-chart-2 inline-block live-dot" /> online · {clinic.name}
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div ref={scrollRef} className="h-[500px] overflow-y-auto scroll-thin p-4 space-y-3 bg-muted/10">
            {messages.map((m) => (
              <div key={m.id} className={`flex ${m.direction === 'in' ? 'justify-start' : 'justify-end'}`}>
                <div className={`max-w-[75%] ${m.direction === 'in' ? '' : 'flex flex-col items-end'}`}>
                  <div className={`px-3 py-2 ${m.direction === 'in' ? 'chat-bubble-in' : 'chat-bubble-out'}`}>
                    <div className="text-sm whitespace-pre-wrap">{m.body}</div>
                    <div className={`text-[10px] mt-1 flex items-center gap-1 ${m.direction === 'out' ? 'text-brand-foreground/70 justify-end' : 'text-muted-foreground'}`}>
                      {new Date(m.ts).toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' })}
                      {m.direction === 'out' && <CheckCheck className="w-3 h-3" />}
                    </div>
                  </div>
                  {m.toolCalls && m.toolCalls.length > 0 && (
                    <div className="mt-1 space-y-1">
                      {m.toolCalls.map((tc, i) => (
                        <div key={i} className="text-xs bg-muted/50 border rounded p-2 max-w-md">
                          <div className="flex items-center gap-1 font-mono text-brand">
                            <Wrench className="w-3 h-3" />{tc.name}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">Args: {JSON.stringify(tc.args).slice(0, 100)}</div>
                          <div className="text-xs text-muted-foreground">Result: {JSON.stringify(tc.result).slice(0, 150)}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-end">
                <div className="chat-bubble-out px-3 py-2 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-current animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-current animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-current animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            )}
          </div>

          <div className="border-t p-3 flex items-center gap-2 bg-background">
            <Button variant="ghost" size="icon" disabled><Mic className="w-4 h-4" /></Button>
            <Input
              placeholder="Type a message as the patient..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              disabled={loading || !clinic.agentEnabled}
            />
            <Button onClick={send} disabled={loading || !input.trim() || !clinic.agentEnabled}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-sm">Try these prompts</CardTitle></CardHeader>
        <CardContent className="flex flex-wrap gap-2 text-sm">
          {[
            'Asalamualaikum, appointment lena hai',
            'Main apni maa Salma ke liye appointment lena chahta hoon',
            'Abhi kya situation hai?',
            'Doctor kab ayenge?',
            'Meri appointment cancel karni hai',
            'Fees kitni hai?',
            'Main thori der late hoonga, theek hai?',
          ].map((p) => (
            <Button key={p} variant="outline" size="sm" className="text-xs" disabled={loading} onClick={() => setInput(p)}>{p}</Button>
          ))}
        </CardContent>
      </Card>

      <div className="text-xs text-muted-foreground text-center">
        <User className="w-3 h-3 inline mr-1" />Patient phone (test): <code className="text-brand">{patientPhone}</code> · Messages persist to the conversation history visible to clinic staff.
      </div>
    </div>
  )
}
