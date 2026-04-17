'use server'

import { createClient } from '@/lib/supabase/server'
import type { PaymentInsert, PaymentUpdate } from '@/lib/types/payment'

export async function getPayments(filters?: {
  type?: 'receipt' | 'payment'
  party?: string
  page?: number
  pageSize?: number
}) {
  const supabase = await createClient()
  
  const page = filters?.page || 1
  const pageSize = filters?.pageSize || 20
  const offset = (page - 1) * pageSize

  let query = supabase
    .from('payments')
    .select('*', { count: 'exact' })

  if (filters?.type) {
    query = query.eq('type', filters.type)
  }

  if (filters?.party) {
    query = query.ilike('party_name', `%${filters.party}%`)
  }

  query = query.order('date', { ascending: false })
  query = query.range(offset, offset + pageSize - 1)

  const { data, error, count } = await query

  if (error) {
    console.error('Error fetching payments:', error)
    return { payments: [], total: 0 }
  }

  return { payments: data || [], total: count || 0 }
}

export async function createPayment(payment: PaymentInsert) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('payments')
    .insert(payment)
    .select()
    .single()

  if (error) {
    console.error('Error creating payment:', error)
    throw new Error('Failed to create payment')
  }

  // 收款/付款後更新對應訂單的付款狀態
  await updateOrderPaymentStatus(supabase, payment.party_name, payment.type)

  return data
}

// 更新訂單付款狀態：根據收付款紀錄與訂單金額比對
async function updateOrderPaymentStatus(
  supabase: Awaited<ReturnType<typeof createClient>>,
  partyName: string,
  type: 'receipt' | 'payment'
) {
  const isReceipt = type === 'receipt'
  const orderTypes = isReceipt ? ['sale', 'sale_return'] : ['purchase', 'purchase_return']
  const partyField = isReceipt ? 'customer_name' : 'supplier'
  const amountField = isReceipt ? 'total_price' : 'cost'

  // 取得該對象的所有訂單
  const { data: orders } = await supabase
    .from('orders')
    .select('id, type, ' + amountField)
    .eq(partyField, partyName)
    .in('type', orderTypes)
    .order('date', { ascending: true })

  if (!orders || orders.length === 0) return

  // 計算總應收/應付
  const totalAmount = orders.reduce((sum, order) => {
    const orderRecord = order as unknown as Record<string, number | string | null>
    const amount = (orderRecord[amountField] as number) || 0
    const orderType = orderRecord.type as string
    if (orderType === 'sale_return' || orderType === 'purchase_return') {
      return sum - amount
    }
    return sum + amount
  }, 0)

  // 取得已收/已付總額
  const { data: payments } = await supabase
    .from('payments')
    .select('amount')
    .eq('party_name', partyName)
    .eq('type', type)

  const totalPaid = payments?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0

  // 決定付款狀態
  let newStatus: string
  if (totalPaid >= totalAmount) {
    newStatus = 'paid'
  } else if (totalPaid > 0) {
    newStatus = 'partial'
  } else {
    newStatus = 'unpaid'
  }

  // 更新所有相關訂單的付款狀態
  await supabase
    .from('orders')
    .update({ payment_status: newStatus })
    .eq(partyField, partyName)
    .in('type', orderTypes)
}

export async function updatePayment(payment: PaymentUpdate) {
  const supabase = await createClient()

  const { id, ...updateData } = payment

  const { error } = await supabase
    .from('payments')
    .update(updateData)
    .eq('id', id)

  if (error) {
    console.error('Error updating payment:', error)
    throw new Error('Failed to update payment')
  }
}

export async function deletePayment(id: string) {
  const supabase = await createClient()

  // 先取得付款資料以便刪除後重新計算狀態
  const { data: payment } = await supabase
    .from('payments')
    .select('party_name, type')
    .eq('id', id)
    .single()

  const { error } = await supabase
    .from('payments')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Error deleting payment:', error)
    throw new Error('Failed to delete payment')
  }

  // 刪除後重新計算訂單付款狀態
  if (payment) {
    await updateOrderPaymentStatus(supabase, payment.party_name, payment.type as 'receipt' | 'payment')
  }
}

// 取得特定對象的收付款紀錄
export async function getPaymentsByParty(partyName: string, type: 'receipt' | 'payment') {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('payments')
    .select('*')
    .eq('party_name', partyName)
    .eq('type', type)
    .order('date', { ascending: false })

  if (error) {
    console.error('Error fetching payments by party:', error)
    return []
  }

  return data || []
}

// 取得收付款總計
export async function getPaymentTotals() {
  const supabase = await createClient()

  const { data: receipts } = await supabase
    .from('payments')
    .select('amount')
    .eq('type', 'receipt')

  const { data: payments } = await supabase
    .from('payments')
    .select('amount')
    .eq('type', 'payment')

  const totalReceipts = receipts?.reduce((sum, r) => sum + (r.amount || 0), 0) || 0
  const totalPayments = payments?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0

  return {
    totalReceipts,
    totalPayments,
  }
}
