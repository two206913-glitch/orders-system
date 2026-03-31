export interface Payment {
  id: string
  type: 'receipt' | 'payment' // receipt = 收款, payment = 付款
  party_name: string // 客戶或供應商名稱
  amount: number
  payment_method: string | null
  date: string | null
  note: string | null
  created_at: string
}

export type PaymentInsert = Omit<Payment, 'id' | 'created_at'>
export type PaymentUpdate = Partial<PaymentInsert> & { id: string }
