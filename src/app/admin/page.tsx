import { redirect } from "next/navigation";
import { currentSession } from "@/lib/auth";
import { AdminPanel } from "@/components/app/admin-panel";
export default async function AdminPage() {
  if (process.env.NEXT_PUBLIC_STATIC_EXPORT !== "true") {
    const session = await currentSession();
    if (!session) redirect("/auth/login");
    if (session.role !== "admin") redirect("/dashboard");
  }
  return <AdminPanel />;
}
