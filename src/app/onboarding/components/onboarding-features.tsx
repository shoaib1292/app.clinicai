'use client'

import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Pill, FlaskConical, CreditCard, PackageSearch } from 'lucide-react'

interface Props {
  data: {
    pharmacyEnabled: boolean
    inventoryEnabled: boolean
    labEnabled: boolean
    onlinePaymentsEnabled: boolean
  }
  onChange: (patch: Partial<Props['data']>) => void
}

const features = [
  {
    key: 'pharmacyEnabled' as const,
    label: 'Pharmacy',
    description: 'Manage medicines, inventory, prescriptions, and pharmacy counter sales',
    icon: Pill,
    color: 'text-emerald-600',
    bg: 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800',
    subFeatures: [{ key: 'inventoryEnabled' as const, label: 'Inventory Management', description: 'Track stock, expiry dates, and batches', icon: PackageSearch }],
  },
  {
    key: 'labEnabled' as const,
    label: 'Lab',
    description: 'Create lab tests, manage orders, and generate reports',
    icon: FlaskConical,
    color: 'text-purple-600',
    bg: 'bg-purple-50 dark:bg-purple-950/20 border-purple-200 dark:border-purple-800',
  },
  {
    key: 'onlinePaymentsEnabled' as const,
    label: 'Online Payments',
    description: 'Accept online payments via bank transfer, JazzCash, and EasyPaisa',
    icon: CreditCard,
    color: 'text-blue-600',
    bg: 'bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800',
  },
]

export function OnboardingFeatures({ data, onChange }: Props) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">Features</h2>
        <p className="text-muted-foreground text-sm">
          Enable the features your clinic needs. You can change these anytime from Settings.
        </p>
      </div>

      <div className="space-y-4">
        {features.map((f) => (
          <Card key={f.key} className="overflow-hidden">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className={`size-9 rounded-lg ${f.bg.split(' ')[0]} ${f.bg.split(' ')[1]} flex items-center justify-center shrink-0`}>
                    <f.icon className={`size-4.5 ${f.color}`} />
                  </div>
                  <div>
                    <div className="font-medium">{f.label}</div>
                    <div className="text-sm text-muted-foreground">{f.description}</div>
                  </div>
                </div>
                <Switch
                  checked={data[f.key]}
                  onCheckedChange={(v) => onChange({ [f.key]: v })}
                />
              </div>

              {/* Sub-features */}
              {f.subFeatures && data[f.key] && f.subFeatures.map((sub) => (
                <div key={sub.key} className="flex items-center justify-between mt-3 ml-12 p-2 rounded bg-muted/30">
                  <div className="flex items-center gap-2">
                    <sub.icon className="size-3.5 text-muted-foreground" />
                    <div>
                      <div className="text-sm font-medium">{sub.label}</div>
                      <div className="text-xs text-muted-foreground">{sub.description}</div>
                    </div>
                  </div>
                  <Switch
                    checked={data[sub.key]}
                    onCheckedChange={(v) => onChange({ [sub.key]: v })}
                  />
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
