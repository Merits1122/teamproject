import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { DashboardNav } from "@/components/dashboard/dashboard-nav";
import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import { RouteGuard } from "./route-guard";

export const dynamic = 'force-dynamic';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <DashboardHeader />
      <div className="flex flex-1">
        <aside className="hidden w-64 flex-col border-r bg-muted/40 md:flex">
          <DashboardNav />
        </aside>
        <main className="flex-1 p-6">
          <Suspense fallback={
            <div className="flex h-full items-center justify-center">
                <Loader2 className="h-10 w-10 animate-spin" />
            </div>
          }>
            <RouteGuard>{children}</RouteGuard>
          </Suspense>
        </main>
      </div>
    </div>
  );
}