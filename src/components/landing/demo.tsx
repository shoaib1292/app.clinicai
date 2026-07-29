import { TrendingUp } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { FadeIn } from './fade-in'

type Patient = {
  token: string
  name: string
  phone: string
  time: string
  doctor: string
  status: 'In consultation' | 'Waiting' | 'Confirmed'
  amount: number
}

const patients: Patient[] = [
  {
    token: 'T-12',
    name: 'Ahmed Raza',
    phone: '+92 300 •••••',
    time: '10:30 AM',
    doctor: 'Dr. Ahmed',
    status: 'In consultation',
    amount: 1250,
  },
  {
    token: 'T-13',
    name: 'Fatima Khan',
    phone: '+92 321 •••••',
    time: '10:45 AM',
    doctor: 'Dr. Ayesha',
    status: 'Waiting',
    amount: 1500,
  },
  {
    token: 'T-14',
    name: 'Bilal Ahmed',
    phone: '+92 333 •••••',
    time: '11:00 AM',
    doctor: 'Dr. Imran',
    status: 'Confirmed',
    amount: 1000,
  },
]

const statCards = [
  { label: "Today's appointments", value: '47', delta: '+12%', up: true },
  { label: 'Avg wait time', value: '11 min', delta: '-3 min', up: true },
  { label: 'Cash collected', value: 'PKR 58,750', delta: '+8%', up: true },
]

function StatusPill({ status }: { status: Patient['status'] }) {
  const map: Record<
    Patient['status'],
    { bg: string; text: string; dot: string }
  > = {
    'In consultation': {
      bg: 'bg-amber-100',
      text: 'text-amber-700',
      dot: 'bg-amber-500',
    },
    Waiting: {
      bg: 'bg-blue-100',
      text: 'text-blue-700',
      dot: 'bg-blue-500',
    },
    Confirmed: {
      bg: 'bg-emerald-100',
      text: 'text-emerald-700',
      dot: 'bg-emerald-500',
    },
  }
  const s = map[status]
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full ${s.bg} ${s.text} px-2 py-0.5 text-[11px] font-medium`}
    >
      <span className={`size-1.5 rounded-full ${s.dot}`} />
      {status}
    </span>
  )
}

export function DemoSection() {
  return (
    <section id="demo" className="bg-card/30 py-20 sm:py-24">
      <div className="mx-auto max-w-[1200px] px-4 sm:px-6">
        <FadeIn className="mx-auto max-w-2xl text-center">
          <span className="text-xs font-semibold uppercase tracking-wider text-brand">
            Live dashboard
          </span>
          <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
            AI receptionist live kaise kaam karta hai
          </h2>
          <p className="mt-3 text-muted-foreground">
            Real-time queue, token status, payment tracking — sab kuch ek nazar
            me.
          </p>
        </FadeIn>

        <FadeIn delay={0.1} className="mt-12">
          <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-2xl shadow-brand/10">
            {/* Browser chrome */}
            <div className="flex items-center gap-3 border-b border-border bg-muted/40 px-4 py-3">
              <div className="flex gap-1.5">
                <div className="size-3 rounded-full bg-red-400/80" />
                <div className="size-3 rounded-full bg-amber-400/80" />
                <div className="size-3 rounded-full bg-green-400/80" />
              </div>
              <div className="mx-auto flex w-full max-w-sm items-center gap-2 rounded-md bg-background px-3 py-1 text-xs text-muted-foreground">
                <span className="size-2 rounded-full bg-brand" />
                <span>app.clinicai.pk/dashboard</span>
              </div>
            </div>

            {/* Stat row */}
            <div className="grid gap-3 border-b border-border p-5 sm:grid-cols-3">
              {statCards.map((s) => (
                <div
                  key={s.label}
                  className="rounded-xl border border-border bg-background/60 p-4"
                >
                  <div className="text-xs text-muted-foreground">
                    {s.label}
                  </div>
                  <div className="mt-1 text-xl font-semibold">{s.value}</div>
                  <div className="mt-1 inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600">
                    <TrendingUp className="size-3" />
                    {s.delta}
                  </div>
                </div>
              ))}
            </div>

            {/* Live queue card */}
            <div className="p-5">
              <div className="rounded-xl border border-border bg-background">
                <div className="flex items-center justify-between border-b border-border px-5 py-3">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold">
                      Live receptionist queue
                    </h3>
                    <Badge className="rounded-full bg-brand/10 text-brand hover:bg-brand/10">
                      <span className="size-1.5 animate-pulse rounded-full bg-brand" />
                      Live
                    </Badge>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    Updated just now
                  </span>
                </div>

                {/* Header row (desktop) */}
                <div className="hidden grid-cols-12 gap-3 border-b border-border/60 px-5 py-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground sm:grid">
                  <div className="col-span-2">Token</div>
                  <div className="col-span-3">Patient</div>
                  <div className="col-span-2">Time</div>
                  <div className="col-span-2">Doctor</div>
                  <div className="col-span-2">Status</div>
                  <div className="col-span-1 text-right">Fee</div>
                </div>

                <div className="divide-y divide-border/60">
                  {patients.map((p) => (
                    <div
                      key={p.token}
                      className="grid grid-cols-2 items-center gap-2 px-5 py-3 text-sm sm:grid-cols-12 sm:gap-3"
                    >
                      <div className="col-span-1 font-mono text-xs font-semibold text-brand sm:col-span-2">
                        {p.token}
                      </div>
                      <div className="col-span-1 sm:col-span-3">
                        <div className="font-medium">{p.name}</div>
                        <div className="text-[10px] text-muted-foreground">
                          {p.phone}
                        </div>
                      </div>
                      <div className="col-span-1 hidden text-xs text-muted-foreground sm:col-span-2 sm:block">
                        {p.time}
                      </div>
                      <div className="col-span-1 hidden text-xs text-muted-foreground sm:col-span-2 sm:block">
                        {p.doctor}
                      </div>
                      <div className="col-span-1 sm:col-span-2">
                        <StatusPill status={p.status} />
                      </div>
                      <div className="col-span-2 text-right text-xs font-medium sm:col-span-1">
                        PKR {p.amount.toLocaleString('en-PK')}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </FadeIn>
      </div>
    </section>
  )
}
