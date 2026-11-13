import { notFound } from "next/navigation";
import { serverApi } from "@/lib/server-api";
import { orderFields } from "@/lib/queries";
import type { Order } from "@/lib/types";
import { OrderReceipt } from "@/components/store/order-receipt";

export const metadata = { title: "Siparişiniz", robots: { index: false, follow: false } };
export default async function ReceiptPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[a-f0-9]{64}$/.test(token)) notFound();
  const { orderReceipt } = await serverApi<{ orderReceipt: Order | null }>(
    `query($token:String!){orderReceipt(token:$token){${orderFields}}}`,
    { token },
  );
  if (!orderReceipt) notFound();
  return <OrderReceipt token={token} initialOrder={orderReceipt} />;
}
