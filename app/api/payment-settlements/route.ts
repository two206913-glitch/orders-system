import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const paymentId = searchParams.get('payment_id')
  
  if (!paymentId) {
    return NextResponse.json({ order_ids: [] })
  }
  
  const supabase = await createClient()
  
  const { data: settlements, error } = await supabase
    .from('payment_settlements')
    .select('order_id')
    .eq('payment_id', paymentId)
  
  if (error) {
    console.error('Error fetching payment settlements:', error)
    return NextResponse.json({ order_ids: [] })
  }
  
  const orderIds = settlements?.map(s => s.order_id) || []
  
  return NextResponse.json({ order_ids: orderIds })
}
