'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Send, ArrowLeft, Hand, RotateCcw, Mic, CheckCheck, Zap, ChevronDown, ChevronUp, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import { useRealtime } from '@/hooks/use-realtime'

interface Message {
  id: string
  direction: string
  type: string
  body: string
  transcript: string | null
  agentGenderUsed: string | null
  agentLanguageUsed: string | null
  ts: Date
}
interface FamilyMember { id: string; name: string; gender: string; relation: string }
interface Appt { id: string; start: Date; status: string; doctor: { name: string } }
interface Patient {
  id: string; name: string | null; phone: string; gender: string; noShowCount: number; totalVisits: number
  familyMembers: FamilyMember[]
  appointments: Appt[]
}
interface Convo {
  id: string
  status: string
  lastIntent: string | null
  summary: string | null
  tags: string
  takenOverBy: string | null
  updatedAt: Date
  patient: Patient
  messages: Message[]
}

// Pre-baked bilingual quick replies — clinic staff's most common responses
const QUICK_REPLIES: { label: string; text: string; category: 'greeting' | 'booking' | 'payment' | 'info' }[] = [
  { label: 'Shukriya', text: 'Ap ko khoob shukriya, agar koi aur sawal ho to bataiye.', category: 'greeting' },
  { label: 'Aap kab aana chahte hain?', text: 'Aap kab aana chahte hain? Doctor ki available timings batata hoon.', category: 'booking' },
  { label: 'Fees info', text: 'Visiting fee PKR 1500 hoga, including consultation.', category: 'payment' },
  { label: 'Location share', text: 'Clinic ka address: <address>. Google Maps link share kar raha hoon.', category: 'info' },
  { label: 'Late ho gaye', text: 'Koi baat nahi, agle slot pe le lete hain. 15 min wait karein.', category: 'booking' },
  { label: 'Cancel karwana', text: 'Appointment cancel kar diya. Refund policy ke mutabiq process karenge.', category: 'booking' },
  { label: 'Payment confirm', text: 'Payment receive ho gayi, appointment confirm hai. Shukriya!', category: 'payment' },
  { label: 'Report le aayein', text: 'Pichli reports aur medicines le aaiye taake doctor review kar sakein.', category: 'info' },
]

const CATEGORY_COLORS: Record<string, string> = {
  greeting: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20',
  booking: 'bg-brand/10 text-brand border-brand/20',
  payment: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20',
  info: 'bg-violet-500/10 text-violet-700 dark:text-violet-400 border-violet-500/20',
  general: 'bg-muted text-muted-foreground border-border',
}

export function ConversationDetailClient({ convo: initial }: { convo: Convo }) {
  const [convo, setConvo] = useState(initial)
  const [messages, setMessages] = useState<Message[]>(initial.messages)
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [showReplies, setShowReplies] = useState(true)
  const [customSnippets, setCustomSnippets] = useState<Array<{ id: string; label: string; body: string; category: string }>>([])
  const [polling, setPolling] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const latestMsgTs = useRef<string>(initial.messages[initial.messages.length - 1]?.id || '')

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [messages])

  // Load custom quick reply snippets for this clinic
  useEffect(() => {
    fetch('/api/quick-replies')
      .then((r) => r.json())
      .then((j) => {
        if (j.ok) setCustomSnippets(j.data.snippets)
      })
      .catch(() => { /* silent */ })
  }, [])

  // Poll for new messages every 3s as a reliable fallback
  const fetchNewMessages = useCallback(async () => {
    try {
      const res = await fetch(`/api/conversations/${convo.id}/messages`)
      const json = await res.json()
      if (json.ok && Array.isArray(json.data)) {
        const serverMsgs = json.data as Message[]
        const newestId = serverMsgs[serverMsgs.length - 1]?.id || ''
        if (newestId !== latestMsgTs.current) {
          latestMsgTs.current = newestId
          setMessages(serverMsgs)
        }
      }
    } catch { /* silent */ }
  }, [convo.id])

  useEffect(() => {
    const interval = setInterval(() => {
      setPolling(true)
      fetchNewMessages().finally(() => setPolling(false))
    }, 3000)
    return () => clearInterval(interval)
  }, [fetchNewMessages])

  // Realtime Socket.io listener (complements polling for low-latency updates)
  const { lastEvent } = useRealtime(`clinic:${initial.id}`)
  useEffect(() => {
    if (lastEvent?.message && typeof lastEvent.message === 'object') {
      const msg = lastEvent.message as { type: string; conversationId: string }
      if (msg.type === 'message_received' && msg.conversationId === convo.id) {
        fetchNewMessages()
      }
    }
  }, [lastEvent, convo.id, fetchNewMessages])

  async function takeover() {
    const res = await fetch(`/api/conversations/${convo.id}/takeover`, { method: 'POST' })
    const json = await res.json()
    if (json.ok) {
      setConvo({ ...convo, takenOverBy: 'me' })
      toast.success('You have taken over — agent paused for this patient')
    } else toast.error(json.error)
  }

  async function release() {
    const res = await fetch(`/api/conversations/${convo.id}/release`, { method: 'POST' })
    const json = await res.json()
    if (json.ok) {
      setConvo({ ...convo, takenOverBy: null })
      toast.success('Released back to AI agent')
    } else toast.error(json.error)
  }

  async function send() {
    if (!input.trim() || loading) return
    setLoading(true)
    const res = await fetch(`/api/conversations/${convo.id}/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ body: input }),
    })
    const json = await res.json()
    setLoading(false)
    if (json.ok) {
      setMessages((prev) => [...prev, json.data])
      setInput('')
    } else toast.error(json.error)
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  function insertQuickReply(text: string) {
    setInput((prev) => (prev ? prev + ' ' + text : text))
  }

  const tags: string[] = JSON.parse(convo.tags || '[]')

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" asChild><Link href="/dashboard/conversations"><ArrowLeft className="w-4 h-4 mr-1" />All conversations</Link></Button>
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        {/* Chat panel */}
        <Card className="lg:col-span-2 overflow-hidden">
          <CardHeader className="pb-3 bg-muted/30 border-b">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Avatar>
                  <AvatarFallback className="bg-brand-soft text-brand">{(convo.patient.name || convo.patient.phone).charAt(0).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div>
                  <CardTitle className="text-base">{convo.patient.name || convo.patient.phone}</CardTitle>
                  <div className="text-xs text-muted-foreground flex items-center gap-2">
                    <Badge variant={convo.status === 'active' ? 'default' : 'secondary'} className="text-xs">{convo.status}</Badge>
                    {convo.takenOverBy && <Badge variant="outline" className="text-xs">Staff handling</Badge>}
                    {convo.lastIntent && <Badge variant="outline" className="text-xs">{convo.lastIntent}</Badge>}
                  </div>
                </div>
              </div>
              <div className="flex gap-1.5">
                {convo.takenOverBy ? (
                  <Button size="sm" variant="outline" onClick={release}><RotateCcw className="w-3 h-3 mr-1" />Release to Agent</Button>
                ) : (
                  <Button size="sm" variant="outline" onClick={takeover}><Hand className="w-3 h-3 mr-1" />Take Over</Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div ref={scrollRef} className="h-[440px] overflow-y-auto scroll-thin p-4 space-y-3 bg-muted/10">
              {messages.map((m) => (
                <div key={m.id} className={`flex ${m.direction === 'in' ? 'justify-start' : 'justify-end'}`}>
                  <div className={`max-w-[75%] px-3 py-2 ${m.direction === 'in' ? 'chat-bubble-in' : 'chat-bubble-out'}`}>
                    {m.type === 'voice' && (
                      <div className="flex items-center gap-1 text-xs mb-1 opacity-70"><Mic className="w-3 h-3" /> Voice note</div>
                    )}
                    <div className="text-sm whitespace-pre-wrap">{m.body}</div>
                    {m.transcript && <div className="text-xs italic opacity-70 mt-1">Transcript: {m.transcript}</div>}
                    <div className={`text-[10px] mt-1 flex items-center gap-1 ${m.direction === 'out' ? 'text-brand-foreground/70 justify-end' : 'text-muted-foreground'}`}>
                      {new Date(m.ts).toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' })}
                      {m.direction === 'out' && <CheckCheck className="w-3 h-3" />}
                      {m.agentGenderUsed && <span className="opacity-60">({m.agentGenderUsed})</span>}
                    </div>
                  </div>
                </div>
              ))}
              {messages.length === 0 && <div className="empty-state"><div className="icon-wrap"><Mic className="w-6 h-6" /></div>No messages yet.</div>}
            </div>

            {/* Quick Reply Snippets — visible when staff has taken over */}
            {convo.takenOverBy && (
              <div className="border-t bg-muted/20">
                <button
                  onClick={() => setShowReplies(!showReplies)}
                  className="w-full px-3 py-2 flex items-center justify-between text-xs text-muted-foreground hover:bg-muted/40 transition-colors"
                >
                  <span className="flex items-center gap-1.5 font-medium">
                    <Zap className="w-3 h-3 text-brand" />
                    Quick Replies
                  </span>
                  {showReplies ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>
                {showReplies && (
                  <div className="px-3 pb-2 space-y-1.5">
                    {/* Default built-in snippets */}
                    <div className="flex flex-wrap gap-1.5">
                      {QUICK_REPLIES.map((q) => (
                        <button
                          key={q.label}
                          onClick={() => insertQuickReply(q.text)}
                          className={`text-xs px-2.5 py-1 rounded-full border hover:scale-[1.03] active:scale-[0.97] transition-transform ${CATEGORY_COLORS[q.category]}`}
                          title={q.text}
                        >
                          {q.label}
                        </button>
                      ))}
                    </div>
                    {/* Custom clinic-defined snippets */}
                    {customSnippets.length > 0 && (
                      <>
                        <div className="text-[10px] uppercase tracking-wide text-muted-foreground/70 px-1 pt-1">Clinic custom</div>
                        <div className="flex flex-wrap gap-1.5">
                          {customSnippets.map((s) => (
                            <button
                              key={s.id}
                              onClick={() => insertQuickReply(s.body)}
                              className={`text-xs px-2.5 py-1 rounded-full border hover:scale-[1.03] active:scale-[0.97] transition-transform ${CATEGORY_COLORS[s.category] || CATEGORY_COLORS.general}`}
                              title={s.body}
                            >
                              {s.label}
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            )}

            {convo.takenOverBy && (
              <div className="border-t p-3 flex items-center gap-2">
                <Input placeholder="Type a manual reply... (Tip: use Quick Replies above)" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={onKeyDown} disabled={loading} />
                <Button onClick={send} disabled={loading || !input.trim()}><Send className="w-4 h-4" /></Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Patient panel */}
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-sm">Patient Profile</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div><span className="text-muted-foreground">Name:</span> {convo.patient.name || 'Unknown'}</div>
              <div><span className="text-muted-foreground">Phone:</span> {convo.patient.phone}</div>
              <div><span className="text-muted-foreground">Gender:</span> <span className="capitalize">{convo.patient.gender}</span></div>
              <div className="grid grid-cols-2 gap-2 pt-2">
                <div className="p-2 rounded-md bg-muted/40 text-center"><div className="font-bold">{convo.patient.totalVisits}</div><div className="text-xs text-muted-foreground">Visits</div></div>
                <div className="p-2 rounded-md bg-muted/40 text-center"><div className="font-bold">{convo.patient.noShowCount}</div><div className="text-xs text-muted-foreground">No-shows</div></div>
              </div>
            </CardContent>
          </Card>

          {convo.patient.familyMembers.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-sm">Family Members</CardTitle></CardHeader>
              <CardContent className="space-y-1 text-sm">
                {convo.patient.familyMembers.map((f) => (
                  <div key={f.id} className="flex justify-between">
                    <span>{f.name}</span>
                    <Badge variant="outline" className="text-xs capitalize">{f.relation}</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader><CardTitle className="text-sm">Recent Appointments</CardTitle></CardHeader>
            <CardContent className="space-y-1 text-sm">
              {convo.patient.appointments.length === 0 && <div className="text-muted-foreground">None</div>}
              {convo.patient.appointments.map((a) => (
                <div key={a.id} className="flex justify-between">
                  <span>{a.doctor.name}</span>
                  <Badge variant="outline" className="text-xs capitalize">{a.status.replace('_', ' ')}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
