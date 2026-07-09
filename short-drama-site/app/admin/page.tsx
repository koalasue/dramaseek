import type { Metadata } from "next";
import { AdminLogin, AdminPanel } from "@/components/admin-panel";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { listSubmissions } from "@/lib/repository";
export const metadata: Metadata = { title: "管理后台", robots: { index: false, follow: false } };
export default async function AdminPage() { const authenticated = await isAdminAuthenticated(); return <div className="page-shell py-12 md:py-16">{authenticated ? <AdminPanel initialSubmissions={await listSubmissions()}/> : <AdminLogin/>}</div>; }
