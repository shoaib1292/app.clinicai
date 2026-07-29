'use client'

import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { RefreshCw, Paperclip, Mailbox, MailOpen } from 'lucide-react'

interface MessageSummary {
  uid: number
  from: string
  to: string
  subject: string
  date: string | null
  seen: boolean
  hasAttachments: boolean
  snippet: string
}

interface MessageDetail {
  uid: number
  from: string
  to: string
  subject: string
  date: string | null
  seen: boolean
  text: string
  html: string | null
  attachments: { filename: string; contentType: string; size: number }[]
}

function fmtDate(d: string | null) {
  if (!d) return ''
  try {
    return new Date(d).toLocaleString()
  } catch {
    return d
  }
}

function nameFromAddr(addr: string) {
  const m = addr.match(/^(.*?)\s*</)
  return m ? m[1].trim() : addr
}

export function PlatformMailboxClient() {
  const [messages, setMessages] = useState<MessageSummary[]>([])
  const [selected, setSelected] = useState<MessageDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [openUid, setOpenUid] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  const loadList = useCallback(() => {
    setLoading(true)
    fetch('/api/platform/mailbox?limit=50')
      .then((r) => r.json())
      .then((j) => {
        if (j.ok) {
          setMessages(j.data.messages)
          setError(null)
        } else {
          setError(j.error || 'Mailbox unavailable')
        }
        setLoading(false)
      })
      .catch(() => {
        setError('Mailbox unavailable')
        setLoading(false)
      })
  }, [])

  useEffect(() => {
    loadList()
    const t = setInterval(loadList, 60000) // IMAP has no push here; poll every 60s
    return () => clearInterval(t)
  }, [loadList])

  const openMessage = (uid: number) => {
    setOpenUid(uid)
    fetch(`/api/platform/mailbox/${uid}`)
      .then((r) => r.json())
      .then((j) => {
        if (j.ok) {
          setSelected(j.data.message)
          // refresh list to reflect read state
          setMessages((prev) => prev.map((m) => (m.uid === uid ? { ...m, seen: true } : m)))
        }
      })
      .catch(() => setError('Could not open message'))
  }

  const unread = messages.filter((m) => !m.seen).length

  return (
    <div className="space-y-6 page-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Platform Mailbox</h1>
          <p className="text-muted-foreground">
            Inbox for {process.env.NEXT_PUBLIC_MAILBOX_ADDRESS || 'admin@clinicai.pk'} — read-only
          </p>
        </div>
        <div className="flex items-center gap-3">
          {unread > 0 && <Badge variant="destructive" className="text-xs">{unread} unread</Badge>}
          <Button variant="outline" size="sm" onClick={loadList} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-1 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </Button>
        </div>
      </div>

      {error && (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="py-3 text-sm text-destructive">{error}</CardContent>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
        {/* List pane */}
        <Card className="max-h-[70vh] overflow-y-auto">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Mailbox className="w-4 h-4" /> Inbox
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {messages.length === 0 && !loading && (
              <p className="text-sm text-muted-foreground py-6 text-center">No messages.</p>
            )}
            {messages.map((m) => (
              <button
                key={m.uid}
                onClick={() => openMessage(m.uid)}
                className={`w-full text-left p-3 rounded-lg border transition-all ${
                  openUid === m.uid ? 'border-brand bg-brand/5' : 'hover:bg-accent/40'
                } ${!m.seen ? 'bg-accent/20' : ''}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="font-medium truncate flex items-center gap-1">
                    {!m.seen ? <MailOpen className="w-3 h-3 text-brand shrink-0" /> : null}
                    {nameFromAddr(m.from)}
                  </div>
                  <span className="text-2xs text-muted-foreground shrink-0">{fmtDate(m.date)}</span>
                </div>
                <div className="text-sm truncate">{m.subject}</div>
                {m.hasAttachments && (
                  <div className="mt-1">
                    <Badge variant="secondary" className="text-2xs">
                      <Paperclip className="w-3 h-3 mr-1" /> attachment
                    </Badge>
                  </div>
                )}
              </button>
            ))}
          </CardContent>
        </Card>

        {/* Reader pane */}
        <Card className="max-h-[70vh] overflow-y-auto">
          <CardContent className="p-5">
            {!selected ? (
              <div className="h-full flex flex-col items-center justify-center text-muted-foreground py-20">
                <Mailbox className="w-10 h-10 mb-3 opacity-40" />
                <p>Select a message to read.</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <h2 className="text-lg font-semibold">{selected.subject}</h2>
                  <div className="text-sm text-muted-foreground mt-1">
                    <div><span className="font-medium text-foreground">From:</span> {selected.from}</div>
                    <div><span className="font-medium text-foreground">To:</span> {selected.to}</div>
                    <div><span className="font-medium text-foreground">Date:</span> {fmtDate(selected.date)}</div>
                  </div>
                </div>

                {selected.attachments.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {selected.attachments.map((a, i) => (
                      <Badge key={i} variant="secondary" className="text-2xs">
                        <Paperclip className="w-3 h-3 mr-1" /> {a.filename} ({(a.size / 1024).toFixed(0)} KB)
                      </Badge>
                    ))}
                  </div>
                )}

                <div className="border-t pt-4">
                  {selected.html ? (
                    <div
                      className="prose prose-sm max-w-none text-sm"
                      dangerouslySetInnerHTML={{ __html: selected.html }}
                    />
                  ) : (
                    <pre className="whitespace-pre-wrap text-sm font-sans">{selected.text}</pre>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
