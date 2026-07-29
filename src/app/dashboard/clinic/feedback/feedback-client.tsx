'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Star, MessageSquare, Clock, TrendingUp, ThumbsUp, Loader2, Star as StarIcon, Download } from 'lucide-react'
import { toast } from 'sonner'

interface Doctor { id: string; name: string; speciality: string }
interface Feedback {
  id: string
  rating: number
  waitTimeMins: number | null
  tags: string
  comment: string | null
  channel: string
  createdAt: string
  patient: { id: string; name: string | null; phone: string }
  doctor: { id: string; name: string; speciality: string }
  appointment: { id: string; start: string; service: { name: string } | null }
}
interface Stats {
  total: number
  avgRating: number
  avgWaitMins: number
  ratingDistribution: Record<number, number>
  tagCounts: Record<string, number>
  perDoctor: Record<string, { count: number; sum: number }>
}

const TAG_LABELS: Record<string, { label: string; color: string }> = {
  friendly: { label: 'Friendly staff', color: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20' },
  on_time: { label: 'On time', color: 'bg-brand/10 text-brand border-brand/20' },
  clean: { label: 'Clean clinic', color: 'bg-violet-500/10 text-violet-700 dark:text-violet-400 border-violet-500/20' },
  rushed: { label: 'Felt rushed', color: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20' },
  confusing: { label: 'Confusing instructions', color: 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20' },
  good_advice: { label: 'Good advice', color: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20' },
  long_wait: { label: 'Long wait', color: 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20' },
  professional: { label: 'Professional', color: 'bg-brand/10 text-brand border-brand/20' },
}

export function FeedbackClient({ doctors }: { doctors: Doctor[] }) {
  const [feedback, setFeedback] = useState<Feedback[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [doctorId, setDoctorId] = useState<string>('all')
  const [loading, setLoading] = useState(true)

  async function load(did: string) {
    setLoading(true)
    try {
      const url = did === 'all' ? '/api/feedback' : `/api/feedback?doctorId=${did}`
      const r = await fetch(url)
      const j = await r.json()
      if (j.ok) {
        setFeedback(j.data.feedback)
        if (did === 'all') setStats(j.data.stats)
      } else {
        toast.error(j.error || 'Failed to load feedback')
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load(doctorId)
  }, [doctorId])

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Star className="w-6 h-6 text-brand" />
            Patient Feedback
          </h1>
          <p className="text-muted-foreground">Ratings + comments collected after completed appointments</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={doctorId} onValueChange={setDoctorId}>
            <SelectTrigger className="w-[200px]"><SelectValue placeholder="All doctors" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All doctors</SelectItem>
              {doctors.map((d) => (
                <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button asChild variant="outline" size="sm" disabled={feedback.length === 0}>
            <a
              href={`/api/feedback/export${doctorId !== 'all' ? `?doctorId=${doctorId}` : ''}`}
              download
              className="gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              Export CSV
            </a>
          </Button>
        </div>
      </div>

      {/* Stats overview */}
      {loading ? (
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}><CardContent className="p-4 space-y-2">
              <div className="skeleton h-5 w-1/2" />
              <div className="skeleton h-8 w-1/3" />
            </CardContent></Card>
          ))}
        </div>
      ) : stats && stats.total > 0 ? (
        <>
          <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
            <Card className="glass-card">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <Star className="w-5 h-5 text-amber-500" />
                </div>
                <div className="mt-2 text-2xl font-bold">{stats.avgRating.toFixed(1)}</div>
                <div className="text-xs text-muted-foreground">Average rating</div>
              </CardContent>
            </Card>
            <Card className="glass-card">
              <CardContent className="p-4">
                <MessageSquare className="w-5 h-5 text-brand" />
                <div className="mt-2 text-2xl font-bold">{stats.total}</div>
                <div className="text-xs text-muted-foreground">Total responses</div>
              </CardContent>
            </Card>
            <Card className="glass-card">
              <CardContent className="p-4">
                <Clock className="w-5 h-5 text-chart-3" />
                <div className="mt-2 text-2xl font-bold">{stats.avgWaitMins}<span className="text-sm font-normal text-muted-foreground">m</span></div>
                <div className="text-xs text-muted-foreground">Avg wait time</div>
              </CardContent>
            </Card>
            <Card className="glass-card">
              <CardContent className="p-4">
                <TrendingUp className="w-5 h-5 text-chart-2" />
                <div className="mt-2 text-2xl font-bold">
                  {stats.total > 0 ? Math.round(((stats.ratingDistribution[5] || 0) + (stats.ratingDistribution[4] || 0)) / stats.total * 100) : 0}%
                </div>
                <div className="text-xs text-muted-foreground">4★ + 5★ rate</div>
              </CardContent>
            </Card>
          </div>

          {/* Rating distribution */}
          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="glass-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2"><Star className="w-4 h-4 text-amber-500" />Rating Distribution</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {[5, 4, 3, 2, 1].map((star) => {
                  const count = stats.ratingDistribution[star] || 0
                  const pct = stats.total > 0 ? (count / stats.total) * 100 : 0
                  return (
                    <div key={star} className="flex items-center gap-3 text-sm">
                      <span className="w-6 flex items-center gap-0.5">
                        {star}<StarIcon className="w-3 h-3 fill-amber-400 text-amber-400" />
                      </span>
                      <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                        <div className="h-full bg-amber-400 transition-all" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="w-8 text-right text-xs text-muted-foreground">{count}</span>
                    </div>
                  )
                })}
              </CardContent>
            </Card>

            {/* Top tags */}
            <Card className="glass-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2"><ThumbsUp className="w-4 h-4 text-brand" />Top Tags</CardTitle>
                <CardDescription>What patients mention most</CardDescription>
              </CardHeader>
              <CardContent>
                {Object.keys(stats.tagCounts).length === 0 ? (
                  <div className="text-sm text-muted-foreground text-center py-4">No tags yet.</div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(stats.tagCounts)
                      .sort(([, a], [, b]) => b - a)
                      .slice(0, 8)
                      .map(([tag, count]) => {
                        const meta = TAG_LABELS[tag] || { label: tag, color: 'bg-muted text-muted-foreground border-border' }
                        return (
                          <span key={tag} className={`text-xs px-2.5 py-1 rounded-full border ${meta.color}`}>
                            {meta.label} <span className="opacity-70">· {count}</span>
                          </span>
                        )
                      })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Per-doctor ratings */}
            <Card className="glass-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2"><TrendingUp className="w-4 h-4 text-brand" />Doctor Leaderboard</CardTitle>
                <CardDescription>By average rating</CardDescription>
              </CardHeader>
              <CardContent>
                {Object.keys(stats.perDoctor).length === 0 ? (
                  <div className="text-sm text-muted-foreground text-center py-4">No data.</div>
                ) : (
                  <ol className="space-y-2">
                    {Object.entries(stats.perDoctor)
                      .map(([did, { count, sum }]) => {
                        const doc = doctors.find((d) => d.id === did)
                        const avg = sum / count
                        return { doc, count, avg }
                      })
                      .sort((a, b) => b.avg - a.avg)
                      .slice(0, 5)
                      .map(({ doc, count, avg }, idx) => (
                        <li key={doc?.id || idx} className="flex items-center gap-3 p-2 rounded-md hover:bg-accent/30">
                          <span className={`w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center ${idx === 0 ? 'bg-amber-100 text-amber-700' : 'bg-muted text-muted-foreground'}`}>
                            {idx + 1}
                          </span>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium truncate">{doc?.name || 'Unknown'}</div>
                            <div className="text-xs text-muted-foreground">{count} review{count !== 1 ? 's' : ''}</div>
                          </div>
                          <div className="flex items-center gap-0.5 text-sm font-bold">
                            {avg.toFixed(1)}<StarIcon className="w-3 h-3 fill-amber-400 text-amber-400" />
                          </div>
                        </li>
                      ))}
                  </ol>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      ) : (
        <Card>
          <CardContent className="empty-state">
            <div className="icon-wrap"><Star className="w-6 h-6" /></div>
            <div className="font-medium">No feedback yet</div>
            <div className="text-xs">Feedback appears here after patients submit ratings for completed appointments.</div>
          </CardContent>
        </Card>
      )}

      {/* Individual feedback list */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Reviews</CardTitle>
          <CardDescription>{feedback.length} review{feedback.length !== 1 ? 's' : ''}{doctorId !== 'all' ? ' · filtered' : ''}</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="p-3 rounded-md border space-y-2">
                  <div className="skeleton h-5 w-1/4" />
                  <div className="skeleton h-12 w-full" />
                </div>
              ))}
            </div>
          ) : feedback.length === 0 ? (
            <div className="text-center text-muted-foreground py-8 text-sm">No reviews to display.</div>
          ) : (
            <div className="max-h-[600px] overflow-y-auto scroll-thin space-y-3">
              {feedback.map((f) => {
                const tags: string[] = (() => {
                  try { return JSON.parse(f.tags || '[]') as string[] } catch { return [] }
                })()
                return (
                  <div key={f.id} className="p-4 rounded-md border hover:bg-accent/30 transition-colors">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div className="flex items-center gap-3 min-w-0">
                        <Avatar className="w-9 h-9">
                          <AvatarFallback className="bg-brand-soft text-brand text-xs">
                            {f.patient.name?.charAt(0).toUpperCase() || 'P'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <div className="font-medium text-sm truncate">{f.patient.name || 'Anonymous'}</div>
                          <div className="text-xs text-muted-foreground truncate">
                            {f.doctor.name} · {f.appointment.service?.name || f.doctor.speciality}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <StarIcon
                            key={i}
                            className={`w-3.5 h-3.5 ${i < f.rating ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/30'}`}
                          />
                        ))}
                      </div>
                    </div>
                    {f.comment && (
                      <div className="mt-2 text-sm text-foreground/85 italic">&ldquo;{f.comment}&rdquo;</div>
                    )}
                    {tags.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {tags.map((t) => {
                          const meta = TAG_LABELS[t] || { label: t, color: 'bg-muted text-muted-foreground border-border' }
                          return (
                            <span key={t} className={`text-[10px] px-1.5 py-0.5 rounded border ${meta.color}`}>
                              {meta.label}
                            </span>
                          )
                        })}
                      </div>
                    )}
                    <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                      <span>{new Date(f.createdAt).toLocaleString('en-PK', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                      {f.waitTimeMins !== null && (
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" />Waited {f.waitTimeMins}m</span>
                      )}
                      <Badge variant="outline" className="text-[10px] capitalize">{f.channel}</Badge>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
