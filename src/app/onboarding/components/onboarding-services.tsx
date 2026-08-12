'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus, X, Activity, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface Service {
  name: string
  durationMin: number
  baseFee: number
}

const DEFAULT_SERVICES: Service[] = [
  { name: 'General Consultation', durationMin: 15, baseFee: 500 },
  { name: 'Follow-up Visit', durationMin: 10, baseFee: 300 },
]

interface Props {
  data: { services: Service[] }
  onChange: (patch: { services: Service[] }) => void
  clinicId: string
}

export function OnboardingServices({ data, onChange, clinicId }: Props) {
  const [name, setName] = useState('')
  const [duration, setDuration] = useState('15')
  const [fee, setFee] = useState('')
  const [adding, setAdding] = useState(false)

  // Initialize with defaults if empty (useEffect avoids setState-during-render)
  useEffect(() => {
    if (data.services.length === 0) {
      onChange({ services: [...DEFAULT_SERVICES] })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function addService() {
    if (!name || !fee) { toast.error('Name and fee are required'); setAdding(false); return }
    setAdding(true)
    const res = await fetch('/api/services', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, durationMin: Number(duration), baseFee: Number(fee), clinicId }),
    })
    const json = await res.json()
    if (!json.ok) { toast.error(json.error || 'Failed'); setAdding(false); return }
    onChange({ services: [...data.services, { name, durationMin: Number(duration), baseFee: Number(fee) }] })
    setName(''); setFee('')
    toast.success('Service added')
    setAdding(false)
  }

  function removeService(index: number) {
    onChange({ services: data.services.filter((_, i) => i !== index) })
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">Services & Fees</h2>
        <p className="text-muted-foreground text-sm">
          What services does your clinic offer? Patients will see these when booking online.
        </p>
      </div>

      {/* Existing services */}
      <div className="space-y-2">
        {data.services.map((s, i) => (
          <div key={i} className="flex items-center justify-between p-3 rounded-lg border bg-card">
            <div className="flex items-center gap-3">
              <Activity className="size-4 text-muted-foreground" />
              <div>
                <div className="font-medium text-sm">{s.name}</div>
                <div className="text-xs text-muted-foreground">{s.durationMin} min · PKR {s.baseFee}</div>
              </div>
            </div>
            <Button variant="ghost" size="icon" className="size-7" onClick={() => removeService(i)}>
              <X className="size-3.5 text-muted-foreground" />
            </Button>
          </div>
        ))}
      </div>

      {/* Add new service */}
      <div className="space-y-3 p-4 rounded-lg border bg-muted/20">
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Service name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Dental Checkup" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Duration (min)</Label>
            <Select value={duration} onValueChange={setDuration}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {['5', '10', '15', '20', '30', '45', '60'].map((v) => <SelectItem key={v} value={v}>{v} min</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Fee (PKR)</Label>
            <Input type="number" value={fee} onChange={(e) => setFee(e.target.value)} placeholder="500" />
          </div>
        </div>
        <Button onClick={addService} disabled={adding || !name || !fee} size="sm">
          {adding ? <Loader2 className="size-3.5 mr-1 animate-spin" /> : <Plus className="size-3.5 mr-1" />}
          Add Service
        </Button>
      </div>
    </div>
  )
}
