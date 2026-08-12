'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Loader2, Plus, Trash2, Edit2, FlaskConical } from 'lucide-react'
import { toast } from 'sonner'

const CATEGORIES = [
  'general', 'hematology', 'biochemistry', 'microbiology', 'radiology', 'pathology',
]

interface LabTest { id: string; name: string; category: string; price: number; turnaroundHrs: number; specimenType: string | null; description: string | null; isActive: boolean }

export function LabTestsPage({ clinicId, tests: initialTests }: { clinicId: string; tests: LabTest[] }) {
  const [tests, setTests] = useState<LabTest[]>(initialTests)
  const [showAdd, setShowAdd] = useState(false)
  const [editing, setEditing] = useState<LabTest | null>(null)
  const [name, setName] = useState('')
  const [category, setCategory] = useState('general')
  const [price, setPrice] = useState(0)
  const [turnaroundHrs, setTurnaroundHrs] = useState(24)
  const [specimenType, setSpecimenType] = useState('')
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleAdd() {
    if (!name || price <= 0) { toast.error('Name and price required'); return }
    setSaving(true)
    const res = await fetch('/api/lab/tests', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, category, price, turnaroundHrs, specimenType: specimenType || null, description: description || null }),
    })
    const json = await res.json()
    setSaving(false)
    if (!json.ok) { toast.error(json.error); return }
    setTests([...tests, json.data])
    resetForm()
    toast.success('Test added')
  }

  async function handleToggleActive(test: LabTest) {
    const res = await fetch(`/api/lab/tests/${test.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !test.isActive }),
    })
    const json = await res.json()
    if (json.ok) {
      setTests(tests.map(t => t.id === test.id ? { ...t, isActive: !t.isActive } : t))
    }
  }

  function resetForm() {
    setShowAdd(false); setEditing(null)
    setName(''); setCategory('general'); setPrice(0); setTurnaroundHrs(24)
    setSpecimenType(''); setDescription('')
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><FlaskConical className="h-6 w-6" /> Lab Tests</h1>
          <p className="text-muted-foreground">Manage diagnostic tests and pricing</p>
        </div>
        <Button onClick={() => { setShowAdd(true); setEditing(null); setName(''); setCategory('general'); setPrice(0); }}><Plus className="h-4 w-4 mr-1" /> Add Test</Button>
      </div>

      {(showAdd || editing) && (
        <Card>
          <CardHeader><CardTitle>{editing ? 'Edit Test' : 'Add New Test'}</CardTitle></CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-3">
            <Input placeholder="Test name" value={name} onChange={e => setName(e.target.value)} />
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
            <Input type="number" placeholder="Price (PKR)" value={price || ''} onChange={e => setPrice(Number(e.target.value))} />
            <Input type="number" placeholder="Turnaround (hrs)" value={turnaroundHrs || ''} onChange={e => setTurnaroundHrs(Number(e.target.value))} />
            <Input placeholder="Specimen type (e.g. blood)" value={specimenType} onChange={e => setSpecimenType(e.target.value)} />
            <Input placeholder="Description (optional)" value={description} onChange={e => setDescription(e.target.value)} />
            <div className="flex gap-2">
              <Button onClick={handleAdd} disabled={saving}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}</Button>
              <Button variant="ghost" onClick={resetForm}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Test Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Turnaround</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-20"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tests.map(t => (
                <TableRow key={t.id} className={t.isActive ? '' : 'opacity-50'}>
                  <TableCell className="font-medium">{t.name}</TableCell>
                  <TableCell><Badge variant="outline">{t.category}</Badge></TableCell>
                  <TableCell>PKR {t.price}</TableCell>
                  <TableCell>{t.turnaroundHrs}h</TableCell>
                  <TableCell><Badge variant={t.isActive ? 'default' : 'secondary'}>{t.isActive ? 'Active' : 'Inactive'}</Badge></TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" onClick={() => handleToggleActive(t)}>
                      {t.isActive ? <Trash2 className="h-4 w-4 text-red-500" /> : <Edit2 className="h-4 w-4" />}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {tests.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No lab tests configured</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
