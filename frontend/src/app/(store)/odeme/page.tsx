import { Checkout } from "@/components/store/checkout";
export const metadata = { title: "Siparişi tamamla", robots: { index: false, follow: false } };
export default function CheckoutPage() {
  return <Checkout />;
}
