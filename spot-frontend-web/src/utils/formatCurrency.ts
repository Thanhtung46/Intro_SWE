export function formatCurrency(amount: number, currency: string): string {
  if (currency === 'VND') {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount)
  }
  return `${amount.toLocaleString('vi-VN')} ${currency}`
}
