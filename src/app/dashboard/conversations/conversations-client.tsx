'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Search, MessageSquare, Clock, ArrowRight } from 'lucide-react'

interface Convo {
  id: string
  status: string
  lastIntent: string | null
  summary: string | null
  tags: string
  updatedAt: Date
  takenOverBy: string | null
  patient: { id: string; name: string | null; phone: string; gender: string }
  _count: { messages: number }
}

export function ConversationsClient({ initialConvos }: { initialConvos: Convo[] }) {
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')
  const [convos, setConvos] = useState(initialConvos)

  // Filter
  const filtered = convos.filter((c) => {
    const matchSearch = !search || c.patient.name?.toLowerCase().includes(search.toLowerCase()) || c.patient.phone.includes(search) || c.summary?.toLowerCase().includes(search.toLowerCase())
    const matchStatus = status === 'all' || c.status === status
    return matchSearch && matchStatus
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Conversations</h1>
          <p className="text-muted-foreground">{convos.length} WhatsApp conversations · all messages persisted</p>
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search patient, phone, summary..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8 w-64" />
          </div>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-2">
        {filtered.length === 0 && <Card><CardContent className="py-12 text-center text-muted-foreground">No conversations match.</CardContent></Card>}
        {filtered.map((c) => {
          const tags: string[] = JSON.parse(c.tags || '[]')
          return (
            <Link key={c.id} href={`/dashboard/conversations/${c.id}`} className="block">
              <Card className="hover:border-brand transition-colors">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-brand-soft flex items-center justify-center shrink-0">
                    <MessageSquare className="w-4 h-4 text-brand" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium">{c.patient.name || c.patient.phone}</span>
                      <Badge variant={c.status === 'active' ? 'default' : 'secondary'} className="text-xs">{c.status}</Badge>
                      {c.takenOverBy && <Badge variant="outline" className="text-xs">Staff taken over</Badge>}
                      {c.lastIntent && <Badge variant="outline" className="text-xs">{c.lastIntent}</Badge>}
                      {tags.map((t) => <Badge key={t} variant="secondary" className="text-xs">{t}</Badge>)}
                    </div>
                    <div className="text-sm text-muted-foreground truncate mt-0.5">{c.summary || 'No summary'}</div>
                    <div className="text-xs text-muted-foreground flex items-center gap-2 mt-1">
                      <Clock className="w-3 h-3" />{new Date(c.updatedAt).toLocaleString('en-PK')}
                      <span>·</span>
                      <span>{c._count.messages} messages</span>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-muted-foreground" />
                </CardContent>
              </Card>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
