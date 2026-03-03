"use client";

import { useState, useEffect } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { useAdmin, getIdToken } from "@/hooks/useAdmin";

interface UserRow {
  uid: string;
  email: string | null;
  displayName: string | null;
  createdAt: string;
  lastSignIn: string | null;
  applicationsCount: number;
  essaysCount: number;
}

export default function AdminUsersPage() {
  const { isAdmin, loading: adminLoading } = useAdmin();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAdmin) return;
    const load = async () => {
      const token = await getIdToken();
      if (!token) return;
      try {
        const res = await fetch("/api/admin/users", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setUsers(data.users ?? []);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [isAdmin]);

  if (adminLoading || !isAdmin) {
    return (
      <div className="space-y-6">
        <PageHeader title="Users" />
        {!isAdmin && <p className="text-sm text-[var(--muted)]">You don&apos;t have permission.</p>}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Users"
        subtitle="Users from Firebase Auth with application and essay counts."
      />

      <Card className="p-4 overflow-x-auto">
        {loading ? (
          <Skeleton className="h-48" />
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-[var(--border)]">
                <th className="text-left py-2 font-medium">Email</th>
                <th className="text-left py-2 font-medium">Name</th>
                <th className="text-left py-2 font-medium">Applications</th>
                <th className="text-left py-2 font-medium">Essays</th>
                <th className="text-left py-2 font-medium">Last sign-in</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.uid} className="border-b border-[var(--border)]">
                  <td className="py-2 text-[var(--muted)]">{u.email ?? "—"}</td>
                  <td className="py-2">{u.displayName ?? "—"}</td>
                  <td className="py-2">{u.applicationsCount}</td>
                  <td className="py-2">{u.essaysCount}</td>
                  <td className="py-2 text-[var(--muted-2)]">{u.lastSignIn ? new Date(u.lastSignIn).toLocaleDateString() : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
