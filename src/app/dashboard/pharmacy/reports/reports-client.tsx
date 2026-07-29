'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Loader2, BarChart3 } from 'lucide-react'

export function ReportsClient() {
  const [loading, setLoading] = useState(true)
  const [range, setRange] = useState<'7' | '30' | '90'>('30')
  const [stats, setStats] = useState({
    revenue: 0, salesCount: 0, avgTicket: 0, platformFee: 0,
    topMovers: [] as { name: string; qty: number; revenue: number }[],
    lowStock: [] as { name: string; stock: number; reorder: number }[],
    expiring: [] as { name: string; expiry: string }[],
    stockValue: 0,
  })

  useEffect(() => { load() }, [range])

  async function load() {
    setLoading(true)
    try {
      const since = new Date(Date.now() - Number(range) * 864e5).toISOString()
      const [salesRes, prodsRes, stockRes, ledRes] = await Promise.all([
        fetch(`/api/pharmacy/sales?from=${since}&limit=500`).then((r) => r.json()),
        fetch('/api/pharmacy/products?limit=500').then((r) => r.json()),
        fetch('/api/pharmacy/stock?low=1').then((r) => r.json()),
        fetch('/api/analytics/clinic').then((r) => r.json()),
      ])
      const sales = salesRes.ok ? salesRes.data.items : []
      const products = prodsRes.ok ? prodsRes.data.items : []
      const lowBatches = stockRes.ok ? stockRes.data : []
      const analytics = ledRes.ok ? ledRes.data.overview : {}

      let revenue = 0
      const moverMap = new Map<string, { name: string; qty: number; revenue: number }>()
      for (const s of sales) {
        revenue += s.total
        for (const it of s.items) {
          const m = moverMap.get(it.productId) || { name: it.product.name, qty: 0, revenue: 0 }
          m.qty += it.quantity
          m.revenue += it.lineTotal
          moverMap.set(it.productId, m)
        }
      }
      const topMovers = [...moverMap.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 8)
      const lowStock = products.filter((p: any) => p.totalStock <= (p.reorderLevel || 0) && p.reorderLevel > 0).map((p: any) => ({ name: p.name, stock: p.totalStock, reorder: p.reorderLevel }))
      const expiring = lowBatches.filter((b: any) => b.expiry && new Date(b.expiry).getTime() < Date.now() + 90 * 864e5).map((b: any) => ({ name: b.product.name, expiry: new Date(b.expiry).toLocaleDateString() }))
      const stockValue = products.reduce((s: number, p: any) => s + (p.totalStock || 0) * (p.purchasePrice || 0), 0)

      setStats({
        revenue,
        salesCount: sales.length,
        avgTicket: sales.length ? Math.round(revenue / sales.length) : 0,
        platformFee: analytics.pharmacyPlatformFee || 0,
        topMovers,
        lowStock,
        expiring,
        stockValue,
      })
    } finally { setLoading(false) }
  }

  if (loading) return <div className="p-8 text-center text-muted-foreground"><Loader2 className="size-5 animate-spin mx-auto" /></div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Pharmacy Reports</h1>
          <p className="text-muted-foreground">Sales, margin, expiry, top movers, stock valuation.</p>
        </div>
        <div className="flex gap-1">
          {(['7', '30', '90'] as const).map((r) => (
            <button key={r} onClick={() => setRange(r)} className={`px-3 py-1.5 rounded-lg text-sm ${range === r ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>{r}d</button>
          ))}
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <Metric label="Revenue" value={`PKR ${stats.revenue}`} />
        <Metric label="Sales" value={String(stats.salesCount)} />
        <Metric label="Avg Ticket" value={`PKR ${stats.avgTicket}`} />
        <Metric label="Platform Fee" value={`PKR ${stats.platformFee}`} sub="extra charge" />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-base">Top Medicines</CardTitle></CardHeader>
          <CardContent className="divide-y">
            {stats.topMovers.length === 0 ? <div className="p-4 text-sm text-muted-foreground">No sales in range.</div> :
              stats.topMovers.map((m, i) => (
                <div key={i} className="flex items-center justify-between py-2">
                  <span className="text-sm">{m.name}</span>
                  <div className="text-right text-sm"><div className="font-medium">PKR {m.revenue}</div><div className="text-xs text-muted-foreground">{m.qty} units</div></div>
                </div>
              ))}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle className="text-base">Stock Valuation</CardTitle></CardHeader>
            <CardContent><div className="text-2xl font-bold">PKR {stats.stockValue}</div><p className="text-xs text-muted-foreground">Cost value of current stock on hand.</p></CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><BarChart3 className="size-4" />Alerts</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div>
                <div className="text-sm font-medium mb-1">Low stock ({stats.lowStock.length})</div>
                {stats.lowStock.length === 0 ? <div className="text-xs text-muted-foreground">None</div> :
                  stats.lowStock.map((l, i) => <div key={i} className="text-xs flex justify-between py-0.5"><span>{l.name}</span><Badge variant="destructive">{l.stock}/{l.reorder}</Badge></div>)}
              </div>
              <div>
                <div className="text-sm font-medium mb-1">Expiring ≤90d ({stats.expiring.length})</div>
                {stats.expiring.length === 0 ? <div className="text-xs text-muted-foreground">None</div> :
                  stats.expiring.slice(0, 10).map((e, i) => <div key={i} className="text-xs flex justify-between py-0.5"><span>{e.name}</span><span className="text-muted-foreground">{e.expiry}</span></div>)}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

function Metric({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <Card><CardContent className="p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-xl font-bold mt-1">{value}</div>
      {sub && <div className="text-[10px] text-muted-foreground mt-0.5">{sub}</div>}
    </CardContent></Card>
  )
}
