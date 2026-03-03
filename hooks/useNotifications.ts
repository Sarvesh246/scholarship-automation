"use client";

import { useState, useEffect, useCallback } from "react";
import { getApplications } from "@/lib/applicationStorage";
import { getScholarships } from "@/lib/scholarshipStorage";

export type NotificationType = "deadline_urgent" | "deadline_soon" | "needs_attention";

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  href?: string;
  time?: string;
  type: NotificationType;
}

const STALE_DAYS = 7;
const SOON_DAYS = 7;
const URGENT_DAYS = 3;

export function useNotifications() {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  const load = useCallback(async () => {
    try {
      const [applications, scholarships] = await Promise.all([
        getApplications(),
        getScholarships()
      ]);
      const now = new Date();
      const notifications: NotificationItem[] = [];

      applications.forEach((app) => {
        if (app.status === "submitted") return;
        const s = scholarships.find((sch) => sch.id === app.scholarshipId);
        if (!s) return;

        const href = `/app/applications/${app.id}`;

        if (s.deadline) {
          const deadlineDate = new Date(s.deadline);
          if (deadlineDate >= now) {
            const daysLeft = Math.ceil((deadlineDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
            if (daysLeft <= URGENT_DAYS) {
              const msg = daysLeft <= 0 ? "Due today" : daysLeft === 1 ? "Due tomorrow" : `${daysLeft} days left`;
              notifications.push({
                id: `urgent-${app.id}`,
                title: s.title,
                message: `Deadline approaching: ${msg}`,
                href,
                time: s.deadline,
                type: "deadline_urgent"
              });
              return;
            }
            if (daysLeft <= SOON_DAYS) {
              notifications.push({
                id: `soon-${app.id}`,
                title: s.title,
                message: `Deadline in ${daysLeft} days — finish your application`,
                href,
                time: s.deadline,
                type: "deadline_soon"
              });
              return;
            }
          }
        }

        const lastViewed = app.lastViewedAt ? new Date(app.lastViewedAt) : null;
        const daysSinceViewed = lastViewed
          ? Math.floor((now.getTime() - lastViewed.getTime()) / (24 * 60 * 60 * 1000))
          : null;
        if (daysSinceViewed !== null && daysSinceViewed >= STALE_DAYS) {
          notifications.push({
            id: `stale-${app.id}`,
            title: s.title,
            message: `You haven't worked on this in ${daysSinceViewed} days`,
            href,
            type: "needs_attention"
          });
        } else if (!lastViewed) {
          notifications.push({
            id: `unviewed-${app.id}`,
            title: s.title,
            message: "You haven't opened this application yet",
            href,
            type: "needs_attention"
          });
        }
      });

      notifications.sort((a, b) => {
        const order: Record<NotificationType, number> = {
          deadline_urgent: 0,
          deadline_soon: 1,
          needs_attention: 2
        };
        const diff = (order[a.type] ?? 3) - (order[b.type] ?? 3);
        if (diff !== 0) return diff;
        const tA = a.time ? new Date(a.time).getTime() : 0;
        const tB = b.time ? new Date(b.time).getTime() : 0;
        return tA - tB;
      });

      const list = notifications.slice(0, 10);
      setItems(list);
      setUnreadCount(list.length);
    } catch {
      setItems([]);
      setUnreadCount(0);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const markAllAsRead = useCallback(() => setUnreadCount(0), []);

  return { items, loading, refresh: load, unreadCount, markAllAsRead };
}
