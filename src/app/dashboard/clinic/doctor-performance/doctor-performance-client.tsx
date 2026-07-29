'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Star, TrendingUp, Clock, Users, CheckCircle2, XCircle, Ban, MessageSquare, Award, Activity } from 'lucide-react'

interface Doctor {
  id: string
  name: string
  speciality: string
  gender: string
  currentStatus: string
  totalAppointments: number
  totalReviews: number
  avgRating: number
  avgWaitMins: number
  ratingDistribution: Record<number, number>
  tagCounts: Record<string, number>
  appts30Day: { total: number; completed: number; noShow: number; cancelled: number }
  ratingTrend30Day: Array<{ date: string; avg: number | null; count: number }>
  recentComments: Array<{ id: string; rating: number; comment: string; createdAt: string }>
}

const TAG_LABELS: Record<string, { label: string; color: string }> = {
  friendly: { label: 'Friendly', color: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20' },
  on_time: { label: 'On time', color: 'bg-brand/10 text-brand border-brand/20' },
  clean: { label: 'Clean', color: 'bg-violet-500/10 text-violet-700 dark:text-violet-400 border-violet-500/20' },
  professional: { label: 'Professional', color: 'bg-brand/10 text-brand border-brand/20' },
  good_advice: { label: 'Good advice', color: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20' },
  rushed: { label: 'Rushed', color: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20' },
  long_wait: { label: 'Long wait', color: 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20' },
  confusing: { label: 'Confusing', color: 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20' },
}

export function DoctorPerformanceClient({ doctors }: { doctors: Doctor[] }) {
  const [selectedId, setSelectedId] = useState<string | null>(doctors[0]?.id ?? null)
  const selected = doctors.find((d) => d.id === selectedId) || doctors[0]

  if (doctors.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Award className="w-6 h-6 text-brand" />
          Doctor Performance
        </h1>
        <Card>
          <CardContent className="empty-state">
            <div className="icon-wrap"><Award className="w-6 h-6" /></div>
            <div className="font-medium">No doctors yet</div>
            <div className="text-xs">Add doctors to see performance metrics.</div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const completionRate = selected.appts30Day.total > 0
    ? Math.round((selected.appts30Day.completed / selected.appts30Day.total) * 100)
    : 0
  const noShowRate = selected.appts30Day.total > 0
    ? Math.round((selected.appts30Day.noShow / selected.appts30Day.total) * 100)
    : 0

  // Build SVG trend line for ratings
  const trendData = selected.ratingTrend30Day.filter((d) => d.avg !== null)
  const hasTrend = trendData.length > 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Award className="w-6 h-6 text-brand" />
          Doctor Performance
        </h1>
        <p className="text-muted-foreground">Feedback trends + appointment quality per doctor (last 30 days)</p>
      </div>

      {/* Doctor selector tabs */}
      <div className="flex gap-2 overflow-x-auto scroll-thin pb-2">
        {doctors.map((d) => {
          const active = d.id === selected.id
          return (
            <button
              key={d.id}
              onClick={() => setSelectedId(d.id)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg border whitespace-nowrap transition-all ${active ? 'bg-brand text-brand-foreground border-brand shadow-sm' : 'border-border hover:border-brand/40 hover:bg-accent/40'}`}
            >
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold ${active ? 'bg-brand-foreground/20' : d.gender === 'female' ? 'bg-pink-100 text-pink-700' : 'bg-cyan-100 text-cyan-700'}`}>
                {d.name.charAt(4) || d.name.charAt(0)}
              </div>
              <div className="text-left">
                <div className="text-sm font-medium">{d.name}</div>
                <div className={`text-[10px] ${active ? 'opacity-80' : 'text-muted-foreground'}`}>
                  {d.totalReviews > 0 ? `${d.avgRating}★ · ${d.totalReviews} reviews` : 'No reviews yet'}
                </div>
              </div>
            </button>
          )
        })}
      </div>

      {/* Doctor header card */}
      <Card className="glass-card">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <Avatar className="w-16 h-16">
              <AvatarFallback className={`text-xl ${selected.gender === 'female' ? 'bg-pink-100 text-pink-700' : 'bg-cyan-100 text-cyan-700'}`}>
                {selected.name.charAt(4) || selected.name.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <h2 className="text-2xl font-bold">{selected.name}</h2>
              <div className="text-sm text-muted-foreground flex items-center gap-3 flex-wrap mt-1">
                <span>{selected.speciality}</span>
                <span>·</span>
                <Badge variant={selected.currentStatus === 'in_clinic' ? 'default' : selected.currentStatus === 'break' ? 'secondary' : 'outline'} className="text-xs capitalize">
                  {selected.currentStatus.replace('_', ' ')}
                </Badge>
                <span>·</span>
                <span>{selected.totalAppointments} total appointments</span>
              </div>
            </div>
            {/* Big rating display */}
            <div className="text-center shrink-0">
              <div className="text-4xl font-bold gradient-number">
                {selected.avgRating > 0 ? selected.avgRating.toFixed(1) : '—'}
              </div>
              <div className="flex justify-center gap-0.5 mt-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={`w-4 h-4 star-anim ${i < Math.round(selected.avgRating) ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/30'}`}
                    style={{ animationDelay: `${i * 0.05}s` }}
                  />
                ))}
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">{selected.totalReviews} review{selected.totalReviews !== 1 ? 's' : ''}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats grid */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card className="glass-card">
          <CardContent className="p-4">
            <Activity className="w-5 h-5 text-brand" />
            <div className="mt-2 text-2xl font-bold">{selected.appts30Day.total}</div>
            <div className="text-xs text-muted-foreground">Appointments (30d)</div>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="p-4">
            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
            <div className="mt-2 text-2xl font-bold">{completionRate}%</div>
            <div className="text-xs text-muted-foreground">Completion rate</div>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="p-4">
            <XCircle className="w-5 h-5 text-rose-500" />
            <div className="mt-2 text-2xl font-bold">{noShowRate}%</div>
            <div className="text-xs text-muted-foreground">No-show rate</div>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="p-4">
            <Clock className="w-5 h-5 text-chart-3" />
            <div className="mt-2 text-2xl font-bold">{selected.avgWaitMins}<span className="text-sm font-normal text-muted-foreground">m</span></div>
            <div className="text-xs text-muted-foreground">Avg wait (patient-reported)</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Rating trend chart */}
        <Card className="glass-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-brand" />
              Rating Trend (30 days)
            </CardTitle>
            <CardDescription>Daily average rating from patient feedback</CardDescription>
          </CardHeader>
          <CardContent>
            {!hasTrend ? (
              <div className="text-center text-sm text-muted-foreground py-8">
                No feedback in the last 30 days yet.
              </div>
            ) : (
              <RatingTrendChart data={selected.ratingTrend30Day} />
            )}
          </CardContent>
        </Card>

        {/* Rating distribution */}
        <Card className="glass-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Star className="w-4 h-4 text-amber-500" />
              Rating Distribution
            </CardTitle>
            <CardDescription>All-time breakdown</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {selected.totalReviews === 0 ? (
              <div className="text-center text-sm text-muted-foreground py-8">No ratings yet.</div>
            ) : (
              [5, 4, 3, 2, 1].map((star) => {
                const count = selected.ratingDistribution[star] || 0
                const pct = selected.totalReviews > 0 ? (count / selected.totalReviews) * 100 : 0
                return (
                  <div key={star} className="flex items-center gap-3 text-sm">
                    <span className="w-6 flex items-center gap-0.5">
                      {star}<Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                    </span>
                    <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                      <div className="h-full bg-amber-400 transition-all" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="w-8 text-right text-xs text-muted-foreground">{count}</span>
                  </div>
                )
              })
            )}
          </CardContent>
        </Card>

        {/* Top tags */}
        <Card className="glass-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-brand" />
              Patient Tags
            </CardTitle>
            <CardDescription>What patients mention most</CardDescription>
          </CardHeader>
          <CardContent>
            {Object.keys(selected.tagCounts).length === 0 ? (
              <div className="text-center text-sm text-muted-foreground py-8">No tags yet.</div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {Object.entries(selected.tagCounts)
                  .sort(([, a], [, b]) => b - a)
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

        {/* Recent comments */}
        <Card className="glass-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-brand" />
              Recent Comments
            </CardTitle>
            <CardDescription>Latest patient feedback</CardDescription>
          </CardHeader>
          <CardContent>
            {selected.recentComments.length === 0 ? (
              <div className="text-center text-sm text-muted-foreground py-8">No comments yet.</div>
            ) : (
              <div className="space-y-3">
                {selected.recentComments.map((c) => (
                  <div key={c.id} className="p-3 rounded-md bg-muted/30 border-l-2 border-amber-300">
                    <div className="flex items-center gap-1 mb-1">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} className={`w-3 h-3 ${i < c.rating ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/30'}`} />
                      ))}
                      <span className="text-xs text-muted-foreground ml-auto">
                        {new Date(c.createdAt).toLocaleDateString('en-PK', { day: 'numeric', month: 'short' })}
                      </span>
                    </div>
                    <div className="text-sm italic text-foreground/85">&ldquo;{c.comment}&rdquo;</div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// Mini SVG line chart for rating trend
function RatingTrendChart({ data }: { data: Array<{ date: string; avg: number | null; count: number }> }) {
  const points = data.filter((d) => d.avg !== null)
  if (points.length === 0) return null

  const width = 100
  const height = 50
  const padding = 4
  const minRating = 1
  const maxRating = 5

  // Map each point to x,y coordinates
  const coords = points.map((p, i) => {
    const x = padding + (i / Math.max(points.length - 1, 1)) * (width - 2 * padding)
    const y = height - padding - ((p.avg! - minRating) / (maxRating - minRating)) * (height - 2 * padding)
    return { x, y, ...p }
  })

  const pathD = coords.map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x.toFixed(2)} ${c.y.toFixed(2)}`).join(' ')
  const areaD = `${pathD} L ${coords[coords.length - 1].x.toFixed(2)} ${height - padding} L ${coords[0].x.toFixed(2)} ${height - padding} Z`

  return (
    <div>
      <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="w-full" style={{ height: '120px' }}>
        {/* Grid lines for 5, 4, 3, 2, 1 */}
        {[5, 4, 3, 2, 1].map((rating) => {
          const y = height - padding - ((rating - minRating) / (maxRating - minRating)) * (height - 2 * padding)
          return (
            <g key={rating}>
              <line x1={padding} y1={y} x2={width - padding} y2={y} className="stroke-border" strokeWidth="0.3" strokeDasharray="0.5,0.5" />
              <text x={padding - 1} y={y + 0.8} className="fill-muted-foreground" style={{ fontSize: '2.5px' }}>{rating}</text>
            </g>
          )
        })}
        {/* Area under line */}
        <path d={areaD} className="fill-brand/10" />
        {/* Line */}
        <path d={pathD} fill="none" className="stroke-brand" strokeWidth="0.6" strokeLinecap="round" strokeLinejoin="round" />
        {/* Points */}
        {coords.map((c, i) => (
          <circle key={i} cx={c.x} cy={c.y} r="0.8" className="fill-brand">
            <title>{`${c.date}: ${c.avg}★ (${c.count} review${c.count !== 1 ? 's' : ''})`}</title>
          </circle>
        ))}
      </svg>
      <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
        <span>{points[0]?.date.slice(5)}</span>
        <span>{points[points.length - 1]?.date.slice(5)}</span>
      </div>
    </div>
  )
}
