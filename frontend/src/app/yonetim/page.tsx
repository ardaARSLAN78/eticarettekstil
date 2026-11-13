import { serverApi } from "@/lib/server-api";
import type { User } from "@/lib/types";
import { AdminShell } from "@/components/admin/admin-shell";

export default async function AdminPage() {
  const { me } = await serverApi<{ me: User | null }>("{me{id name email role}}", undefined, true);
  return <AdminShell initialUser={me} />;
}
