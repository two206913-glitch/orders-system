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
  
  // 根據 type 決定從哪個資料表讀取
  const tableName = filters?.type === 'receipt' ? 'receipts' : 'payments'
  const partyField = filters?.type === 'receipt' ? 'customer_name' : 'supplier_name'

  let query = supabase
    .from(tableName)
    .select('*', { count: 'exact' })

  if (filters?.party) {
    query = query.ilike(partyField, `%${filters.party}%`)
  }

  query = query.order('date', { ascending: false })
  query = query.range(offset, offset + pageSize - 1)

  const { data, error, count } = await query

  if (error) {
    console.error(`Error fetching ${tableName}:`, error)
    return { payments: [], total: 0 }
  }

  // 轉換資料格式，統一欄位名稱
  const normalizedData = (data || []).map(item => ({
    ...item,
    type: filters?.type || 'payment',
    party_name: item[partyField] || item.customer_name || item.supplier_name,
  }))

  return { payments: normalizedData, total: count || 0 }
}

export async function createPayment(payment: PaymentInsert) {
  console.log('[v0] ========== createPayment 開始 ==========')
  console.log('[v0] payment.type =', payment.type)
  console.log('[v0] payment.party_name =', payment.party_name)
  console.log('[v0] payment.amount =', payment.amount)
  
  const supabase = await createClient()
  
  // 根據 type 決定寫入哪個資料表
  const tableName = payment.type === 'receipt' ? 'receipts' : 'payments'
  console.log('[v0] 寫入資料表 =', tableName)
  
  // 準備寫入的資料（使用 customer_name / supplier_name）
  // payments 表有 type 和 party_name 欄位，receipts 表沒有
  const insertData = payment.type === 'receipt' 
    ? {
        customer_name: payment.party_name,
        amount: payment.amount,
        date: payment.date,
        payment_method: payment.payment_method,
        note: payment.note,
      }
    : {
        type: 'payment',  // payments 表需要 type 欄位
        party_name: payment.party_name,  // payments 表有 party_name 欄位
        supplier_name: payment.party_name,
        amount: payment.amount,
        date: payment.date,
        payment_method: payment.payment_method,
        note: payment.note,
      }

  console.log('[v0] insertData =', JSON.stringify(insertData))

  const { data, error } = await supabase
    .from(tableName)
    .insert(insertData)
    .select()
    .single()

  if (error) {
    console.error('[v0] ========== INSERT 失敗 ==========')
    console.error('[v0] error.message =', error.message)
    console.error('[v0] error.code =', error.code)
    console.error('[v0] error.details =', error.details)
    throw new Error(`Failed to create ${payment.type}: ${error.message}`)
  }

  console.log('[v0] ========== INSERT 成功 ==========')
  console.log('[v0] 回傳 data =', JSON.stringify(data))

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

  // 取得已收/已付總額（從對應的表）
  const paymentTableName = type === 'receipt' ? 'receipts' : 'payments'
  const paymentPartyField = type === 'receipt' ? 'customer_name' : 'supplier_name'
  
  const { data: payments } = await supabase
    .from(paymentTableName)
    .select('amount')
    .eq(paymentPartyField, partyName)

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

export async function deletePayment(id: string, type: 'receipt' | 'payment') {
  const supabase = await createClient()
  
  const tableName = type === 'receipt' ? 'receipts' : 'payments'
  const partyField = type === 'receipt' ? 'customer_name' : 'supplier_name'

  // 先取得資料以便刪除後重新計算狀態
  const { data: payment } = await supabase
    .from(tableName)
    .select(partyField)
    .eq('id', id)
    .single()

  const { error } = await supabase
    .from(tableName)
    .delete()
    .eq('id', id)

  if (error) {
    console.error(`Error deleting ${tableName}:`, error)
    throw new Error(`Failed to delete ${type}`)
  }

  // 刪除後重新計算訂單付款狀態
  if (payment) {
    const partyName = payment[partyField] as string
    await updateOrderPaymentStatus(supabase, partyName, type)
  }
}

// 取得特定對象的收付款紀錄
export async function getPaymentsByParty(partyName: string, type: 'receipt' | 'payment') {
  const supabase = await createClient()
  
  const tableName = type === 'receipt' ? 'receipts' : 'payments'
  const partyField = type === 'receipt' ? 'customer_name' : 'supplier_name'

  const { data, error } = await supabase
    .from(tableName)
    .select('*')
    .eq(partyField, partyName)
    .order('date', { ascending: false })

  if (error) {
    console.error(`Error fetching ${tableName} by party:`, error)
    return []
  }

  // 轉換資料格式
  return (data || []).map(item => ({
    ...item,
    type,
    party_name: item[partyField],
  }))
}

// 取得收付款總計
export async function getPaymentTotals() {
  const supabase = await createClient()

  // 從 receipts 表讀取收款
  const { data: receipts } = await supabase
    .from('receipts')
    .select('amount')

  // 從 payments 表讀取付款
  const { data: payments } = await supabase
    .from('payments')
    .select('amount')

  const totalReceipts = receipts?.reduce((sum, r) => sum + (r.amount || 0), 0) || 0
  const totalPayments = payments?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0

  return {
    totalReceipts,
    totalPayments,
  }
}
