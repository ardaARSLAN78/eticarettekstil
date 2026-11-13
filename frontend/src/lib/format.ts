export function money(amount: number) {
  return `${new Intl.NumberFormat("tr-TR", { minimumFractionDigits: amount % 100 ? 2 : 0, maximumFractionDigits: 2 }).format(amount / 100)} TL`;
}
export function date(value: string) {
  return new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium" }).format(new Date(value));
}
export const statusLabels: Record<string, string> = {
  PENDING_PAYMENT: "Ödeme bekleniyor",
  CONFIRMED: "Onaylandı",
  PREPARING: "Hazırlanıyor",
  SHIPPED: "Kargoya verildi",
  DELIVERED: "Teslim edildi",
  CANCELLED: "İptal edildi",
  PAID: "Ödendi",
  PENDING: "Bekliyor",
  FAILED: "Başarısız",
  DEMO: "Demo · tahsilat yok",
  REFUND_REQUIRED: "İade gerekli",
};
export function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "İşlem tamamlanamadı.";
}
