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

  return data
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

  const { error } = await supabase
    .from('payments')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Error deleting payment:', error)
    throw new Error('Failed to delete payment')
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
