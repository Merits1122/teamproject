"use client";

import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import { RouteGuard } from "./route-guard";

export function DashboardClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={
      <div className="flex h-full w-full items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin" />
      </div>
    }>
      <RouteGuard>{children}</RouteGuard>
    </Suspense>
  );
}