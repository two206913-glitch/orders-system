'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { PaymentFormDialog } from './payment-form-dialog'

export function AddReceiptButtonClient() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="mr-2 h-4 w-4" />
        新增收款
      </Button>
      <PaymentFormDialog
        open={open}
        onOpenChange={setOpen}
        defaultType="receipt"
      />
    </>
  )
}

export function AddPaymentButtonClient() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="mr-2 h-4 w-4" />
        新增付款
      </Button>
      <PaymentFormDialog
        open={open}
        onOpenChange={setOpen}
        defaultType="payment"
      />
    </>
  )
}
