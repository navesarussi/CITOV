"use client";

import { AdminCacheProvider } from "@/components/admin/AdminCacheProvider";

export default function AdminLayout(props: { children: React.ReactNode }) {
  return <AdminCacheProvider>{props.children}</AdminCacheProvider>;
}
