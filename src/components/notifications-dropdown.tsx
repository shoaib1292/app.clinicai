'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Bell, CheckCircle2, AlertCircle, MessageSquare, CalendarClock, Wallet, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'

interface Notification {
  id: string
  type: 'payment' | 'conversation' | 'reminder' | 'appointment' | 'system'
  title: string
  description: string
  href?: string
  ts: Date
  read: boolean
}

interface Props {
  clinicId?: string
  userType: string
}

export function NotificationsDropdown({ clinicId, userType }: Props) {
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const ref = useRef<HTMLDivElement>(null)
  const router = useRouter()

  const fetchNotifications = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (clinicId) params.set('clinicId', clinicId)
      params.set('userType', userType)
      const res = await fetch(`/api/notifications?${params}`)
      const json = await res.json()
      if (json.ok) setNotifications(json.data)
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [clinicId, userType])

  useEffect(() => {
    // setState happens after await inside fetchNotifications — this is an async callback, not a sync setState.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchNotifications()
    const interval = setInterval(() => { void fetchNotifications() }, 30000)
    return () => clearInterval(interval)
  }, [fetchNotifications])

  // Close on outside click
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [open])

  const unread = notifications.filter((n) => !n.read).length

  function onClickNotif(n: Notification) {
    if (n.href) router.push(n.href)
    setOpen(false)
  }

  async function markAllRead() {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
    await fetch('/api/notifications/read-all', { method: 'POST' }).catch(() => {})
  }

  const iconFor = (type: string) => {
    switch (type) {
      case 'payment': return <Wallet className="w-4 h-4 text-chart-4" />
      case 'conversation': return <MessageSquare className="w-4 h-4 text-brand" />
      case 'reminder': return <CalendarClock className="w-4 h-4 text-chart-3" />
      case 'appointment': return <CheckCircle2 className="w-4 h-4 text-chart-2" />
      default: return <AlertCircle className="w-4 h-4 text-muted-foreground" />
    }
  }

  return (
    <div ref={ref} className="relative">
      <Button
        variant="ghost"
        size="icon"
        className="h-9 w-9 relative"
        aria-label="Notifications"
        onClick={() => setOpen((o) => !o)}
      >
        <Bell className="w-4 h-4" />
        {unread > 0 && (
          <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 rounded-full bg-brand text-brand-foreground text-[10px] font-bold flex items-center justify-center live-dot">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </Button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-card border rounded-lg shadow-xl z-50 overflow-hidden">
          <div className="flex items-center justify-between p-3 border-b">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold">Notifications</h3>
              {unread > 0 && <Badge variant="secondary" className="text-xs">{unread} new</Badge>}
            </div>
            <div className="flex items-center gap-1">
              {unread > 0 && (
                <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={markAllRead}>
                  Mark all read
                </Button>
              )}
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setOpen(false)}>
                <X className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>

          <ScrollArea className="h-[400px]">
            {loading && (
              <div className="p-8 text-center text-sm text-muted-foreground">
                <div className="inline-block w-6 h-6 border-2 border-brand border-t-transparent rounded-full animate-spin mb-2" />
                <div>Loading notifications...</div>
              </div>
            )}
            {!loading && notifications.length === 0 && (
              <div className="p-8 text-center text-sm text-muted-foreground">
                <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-chart-2" />
                <div>All caught up!</div>
                <div className="text-xs mt-1">No pending notifications</div>
              </div>
            )}
            {!loading && notifications.map((n) => (
              <button
                key={n.id}
                onClick={() => onClickNotif(n)}
                className={cn(
                  'w-full text-left p-3 border-b hover:bg-accent/50 transition-colors flex gap-3',
                  !n.read && 'bg-brand/5'
                )}
              >
                <div className="shrink-0 mt-0.5">{iconFor(n.type)}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium truncate">{n.title}</span>
                    {!n.read && <span className="w-1.5 h-1.5 rounded-full bg-brand shrink-0" />}
                  </div>
                  <div className="text-xs text-muted-foreground line-clamp-2">{n.description}</div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">
                    {new Date(n.ts).toLocaleString('en-PK', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </button>
            ))}
          </ScrollArea>
        </div>
      )}
    </div>
  )
}
