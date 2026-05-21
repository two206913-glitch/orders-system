import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const receiptId = searchParams.get('receipt_id')
  
  if (!receiptId) {
    return NextResponse.json({ order_ids: [] })
  }
  
  const supabase = await createClient()
  
  // 查詢該收款結清的訂單 ID
  const { data: settlements, error } = await supabase
    .from('receipt_settlements')
    .select('order_id')
    .eq('receipt_id', receiptId)
  
  if (error) {
    console.error('Error fetching receipt settlements:', error)
    return NextResponse.json({ order_ids: [], error: error.message }, { status: 500 })
  }
  
  const orderIds = settlements?.map(s => s.order_id) || []
  
  return NextResponse.json({ order_ids: orderIds })
}
