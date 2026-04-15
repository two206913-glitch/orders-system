// Taiwan locale utilities

export function formatCurrency(amount: number | null): string {
  if (amount === null) return '-'
  return `NT$ ${amount.toLocaleString('zh-TW')}`
}

export function formatDate(date: string | null): string {
  if (!date) return '-'
  const d = new Date(date)
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}/${month}/${day}`
}

export function formatDateLong(date: string | null): string {
  if (!date) return '-'
  const d = new Date(date)
  return `${d.getFullYear()} 年 ${d.getMonth() + 1} 月 ${d.getDate()} 日`
}

// Status translations
export const PAYMENT_STATUS_LABELS: Record<string, string> = {
  pending: '待付款',
  paid: '已付款',
  cancelled: '已取消',
}

export const SHIPPING_STATUS_LABELS: Record<string, string> = {
  pending: '待出貨',
  shipped: '已出貨',
  delivered: '已送達',
}

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cash: '現金',
  credit_card: '信用卡',
  bank_transfer: '銀行轉帳',
  check: '支票',
}

export const ORDER_TYPE_LABELS: Record<string, string> = {
  sale: '銷貨',
  purchase: '進貨',
  sale_return: '銷貨退回',
  purchase_return: '進貨退回',
}

export function getPaymentStatusLabel(status: string | null): string {
  if (!status) return '-'
  return PAYMENT_STATUS_LABELS[status.toLowerCase()] || status
}

export function getShippingStatusLabel(status: string | null): string {
  if (!status) return '-'
  return SHIPPING_STATUS_LABELS[status.toLowerCase()] || status
}

export function getPaymentMethodLabel(method: string | null): string {
  if (!method) return '-'
  return PAYMENT_METHOD_LABELS[method.toLowerCase()] || method
}

export function getOrderTypeLabel(type: string | null): string {
  if (!type) return '-'
  return ORDER_TYPE_LABELS[type.toLowerCase()] || type
}

export const PAYMENT_TYPE_LABELS: Record<string, string> = {
  receipt: '收款',
  payment: '付款',
}

export function getPaymentTypeLabel(type: string | null): string {
  if (!type) return '-'
  return PAYMENT_TYPE_LABELS[type.toLowerCase()] || type
}

export const STOCK_STATUS_LABELS: Record<string, string> = {
  normal: '正常',
  low: '不足',
  out: '缺貨',
}

export function getStockStatus(stock: number, minStock: number): 'normal' | 'low' | 'out' {
  if (stock <= 0) return 'out'
  if (stock <= minStock) return 'low'
  return 'normal'
}

export function getStockStatusLabel(status: string): string {
  return STOCK_STATUS_LABELS[status] || status
}
