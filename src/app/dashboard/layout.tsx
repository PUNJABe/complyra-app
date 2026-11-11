import { redirect } from "next/navigation";
import { currentSession } from "@/lib/auth";
import type { ReactNode } from "react";

import { DashboardShell } from "@/components/app/dashboard-shell";

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  if (
    process.env.NEXT_PUBLIC_STATIC_EXPORT !== "true" &&
    !(await currentSession())
  )
    redirect("/auth/login");
  return <DashboardShell>{children}</DashboardShell>;
}
