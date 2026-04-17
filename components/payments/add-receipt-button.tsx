'use client'

import { useState, useEffect, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Field, FieldLabel } from '@/components/ui/field'
import { Card, CardContent } from '@/components/ui/card'
import { Plus, AlertCircle, CheckCircle2 } from 'lucide-react'
import { formatCurrency } from '@/lib/locale'
import { PAYMENT_METHODS } from '@/lib/types/order'
import { PAYMENT_METHOD_LABELS } from '@/lib/locale'
import { createPayment } from '@/app/actions/payments'
import { toast } from 'sonner'

interface PartyBalance {
  name: string
  total_amount: number
  received_amount: number
  pending_amount: number
  is_settled: boolean
}

// 收款按鈕（客戶端）
export function AddReceiptButtonClient() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [parties, setParties] = useState<PartyBalance[]>([])
  const [selectedParty, setSelectedParty] = useState<string>('')
  const [partyInfo, setPartyInfo] = useState<PartyBalance | null>(null)
  const [isPending, startTransition] = useTransition()
  
  const [formData, setFormData] = useState({
    amount: 0,
    payment_method: '',
    date: new Date().toISOString().split('T')[0],
    note: '',
  })

  // 載入客戶列表和餘額
  useEffect(() => {
    if (open) {
      loadParties()
    }
  }, [open])

  const loadParties = async () => {
    const res = await fetch('/api/receivables')
    const data = await res.json()
    setParties(data.receivables || [])
  }

  // 選擇客戶時更新資訊
  useEffect(() => {
    const party = parties.find(p => p.name === selectedParty)
    if (party) {
      setPartyInfo(party)
      setFormData(prev => ({
        ...prev,
        amount: party.pending_amount > 0 ? party.pending_amount : 0
      }))
    } else {
      setPartyInfo(null)
    }
  }, [selectedParty, parties])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!selectedParty) {
      toast.error('請選擇客戶')
      return
    }
    
    if (formData.amount <= 0) {
      toast.error('金額必須大於 0')
      return
    }
    
    if (partyInfo && formData.amount > partyInfo.pending_amount) {
      toast.error(`金額不可超過未收餘額 ${formatCurrency(partyInfo.pending_amount)}`)
      return
    }
    
    startTransition(async () => {
      try {
        await createPayment({
          type: 'receipt',
          party_name: selectedParty,
          amount: formData.amount,
          payment_method: formData.payment_method || null,
          date: formData.date,
          note: formData.note || null,
        })
        toast.success('收款已記錄')
        setOpen(false)
        setSelectedParty('')
        setFormData({
          amount: 0,
          payment_method: '',
          date: new Date().toISOString().split('T')[0],
          note: '',
        })
        router.refresh()
      } catch (error) {
        console.error('Failed to create payment:', error)
        toast.error('收款記錄失敗')
      }
    })
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="mr-2 h-4 w-4" />
        新增收款
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>新增收款</DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-4 pt-4">
            <Field>
              <FieldLabel>選擇客戶</FieldLabel>
              <Select value={selectedParty} onValueChange={setSelectedParty}>
                <SelectTrigger>
                  <SelectValue placeholder="選擇客戶" />
                </SelectTrigger>
                <SelectContent>
                  {parties.length === 0 ? (
                    <SelectItem value="_none" disabled>無待收款客戶</SelectItem>
                  ) : (
                    parties.map(p => (
                      <SelectItem key={p.name} value={p.name}>
                        {p.name} - 未收 {formatCurrency(p.pending_amount)}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </Field>
            
            {/* 客戶應收資訊 */}
            {partyInfo && (
              <Card className={partyInfo.is_settled ? 'bg-success/5 border-success/30' : 'bg-warning/5 border-warning/30'}>
                <CardContent className="pt-4 pb-3">
                  <div className="flex items-center gap-2 mb-3">
                    {partyInfo.is_settled ? (
                      <CheckCircle2 className="h-4 w-4 text-success" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-warning" />
                    )}
                    <span className="font-medium">{partyInfo.name}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">應收金額</p>
                      <p className="font-semibold">{formatCurrency(partyInfo.total_amount)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">已收金額</p>
                      <p className="font-semibold text-success">{formatCurrency(partyInfo.received_amount)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">未收金額</p>
                      <p className={`font-semibold ${partyInfo.pending_amount > 0 ? 'text-warning' : 'text-success'}`}>
                        {formatCurrency(partyInfo.pending_amount)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
            
            <div className="grid grid-cols-2 gap-4">
              <Field>
                <FieldLabel>收款金額 (NT$)</FieldLabel>
                <Input
                  type="number"
                  placeholder="0"
                  value={formData.amount || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, amount: parseInt(e.target.value) || 0 }))}
                  min={1}
                  max={partyInfo?.pending_amount}
                  required
                />
              </Field>
              <Field>
                <FieldLabel>日期</FieldLabel>
                <Input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                />
              </Field>
            </div>
            
            <Field>
              <FieldLabel>付款方式</FieldLabel>
              <Select 
                value={formData.payment_method} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, payment_method: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="選擇付款方式" />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map((method) => (
                    <SelectItem key={method} value={method}>
                      {PAYMENT_METHOD_LABELS[method]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            
            <Field>
              <FieldLabel>備註</FieldLabel>
              <Textarea
                placeholder="輸入備註..."
                value={formData.note}
                onChange={(e) => setFormData(prev => ({ ...prev, note: e.target.value }))}
                rows={2}
              />
            </Field>
            
            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                取消
              </Button>
              <Button type="submit" disabled={isPending || !selectedParty}>
                {isPending ? '儲存中...' : '確認收款'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}

// 付款按鈕（供應商端）
export function AddPaymentButtonClient() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [parties, setParties] = useState<PartyBalance[]>([])
  const [selectedParty, setSelectedParty] = useState<string>('')
  const [partyInfo, setPartyInfo] = useState<PartyBalance | null>(null)
  const [isPending, startTransition] = useTransition()
  
  const [formData, setFormData] = useState({
    amount: 0,
    payment_method: '',
    date: new Date().toISOString().split('T')[0],
    note: '',
  })

  // 載入供應商列表和餘額
  useEffect(() => {
    if (open) {
      loadParties()
    }
  }, [open])

  const loadParties = async () => {
    const res = await fetch('/api/payables')
    const data = await res.json()
    setParties(data.payables || [])
  }

  // 選擇供應商時更新資訊
  useEffect(() => {
    const party = parties.find(p => p.name === selectedParty)
    if (party) {
      setPartyInfo(party)
      setFormData(prev => ({
        ...prev,
        amount: party.pending_amount > 0 ? party.pending_amount : 0
      }))
    } else {
      setPartyInfo(null)
    }
  }, [selectedParty, parties])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!selectedParty) {
      toast.error('請選擇供應商')
      return
    }
    
    if (formData.amount <= 0) {
      toast.error('金額必須大於 0')
      return
    }
    
    if (partyInfo && formData.amount > partyInfo.pending_amount) {
      toast.error(`金額不可超過未付餘額 ${formatCurrency(partyInfo.pending_amount)}`)
      return
    }
    
    startTransition(async () => {
      try {
        await createPayment({
          type: 'payment',
          party_name: selectedParty,
          amount: formData.amount,
          payment_method: formData.payment_method || null,
          date: formData.date,
          note: formData.note || null,
        })
        toast.success('付款已記錄')
        setOpen(false)
        setSelectedParty('')
        setFormData({
          amount: 0,
          payment_method: '',
          date: new Date().toISOString().split('T')[0],
          note: '',
        })
        router.refresh()
      } catch (error) {
        console.error('Failed to create payment:', error)
        toast.error('付款記錄失敗')
      }
    })
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="mr-2 h-4 w-4" />
        新增付款
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>新增付款</DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-4 pt-4">
            <Field>
              <FieldLabel>選擇供應商</FieldLabel>
              <Select value={selectedParty} onValueChange={setSelectedParty}>
                <SelectTrigger>
                  <SelectValue placeholder="選擇供應商" />
                </SelectTrigger>
                <SelectContent>
                  {parties.length === 0 ? (
                    <SelectItem value="_none" disabled>無待付款供應商</SelectItem>
                  ) : (
                    parties.map(p => (
                      <SelectItem key={p.name} value={p.name}>
                        {p.name} - 未付 {formatCurrency(p.pending_amount)}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </Field>
            
            {/* 供應商應付資訊 */}
            {partyInfo && (
              <Card className={partyInfo.is_settled ? 'bg-success/5 border-success/30' : 'bg-destructive/5 border-destructive/30'}>
                <CardContent className="pt-4 pb-3">
                  <div className="flex items-center gap-2 mb-3">
                    {partyInfo.is_settled ? (
                      <CheckCircle2 className="h-4 w-4 text-success" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-destructive" />
                    )}
                    <span className="font-medium">{partyInfo.name}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">應付金額</p>
                      <p className="font-semibold">{formatCurrency(partyInfo.total_amount)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">已付金額</p>
                      <p className="font-semibold text-primary">{formatCurrency(partyInfo.received_amount)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">未付金額</p>
                      <p className={`font-semibold ${partyInfo.pending_amount > 0 ? 'text-destructive' : 'text-success'}`}>
                        {formatCurrency(partyInfo.pending_amount)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
            
            <div className="grid grid-cols-2 gap-4">
              <Field>
                <FieldLabel>付款金額 (NT$)</FieldLabel>
                <Input
                  type="number"
                  placeholder="0"
                  value={formData.amount || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, amount: parseInt(e.target.value) || 0 }))}
                  min={1}
                  max={partyInfo?.pending_amount}
                  required
                />
              </Field>
              <Field>
                <FieldLabel>日期</FieldLabel>
                <Input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                />
              </Field>
            </div>
            
            <Field>
              <FieldLabel>付款方式</FieldLabel>
              <Select 
                value={formData.payment_method} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, payment_method: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="選擇付款方式" />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map((method) => (
                    <SelectItem key={method} value={method}>
                      {PAYMENT_METHOD_LABELS[method]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            
            <Field>
              <FieldLabel>備註</FieldLabel>
              <Textarea
                placeholder="輸入備註..."
                value={formData.note}
                onChange={(e) => setFormData(prev => ({ ...prev, note: e.target.value }))}
                rows={2}
              />
            </Field>
            
            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                取消
              </Button>
              <Button type="submit" disabled={isPending || !selectedParty}>
                {isPending ? '儲存中...' : '確認付款'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
