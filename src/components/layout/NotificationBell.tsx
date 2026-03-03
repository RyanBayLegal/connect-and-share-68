import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Bell, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { PRIORITIES } from "@/lib/constants";
import type { Announcement } from "@/types/database";

export function NotificationBell() {
  const { user, profile } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [recentAnnouncements, setRecentAnnouncements] = useState<Announcement[]>([]);
  const [open, setOpen] = useState(false);

  const fetchNotifications = useCallback(async () => {
    if (!user) return;

    try {
      const { data: announcements } = await supabase
        .from("announcements")
        .select(`*, category:announcement_categories(*), author:profiles(*)`)
        .eq("is_published", true)
        .or(
          profile?.department_id
            ? `target_department_id.is.null,target_department_id.eq.${profile.department_id}`
            : `target_department_id.is.null`
        )
        .order("published_at", { ascending: false })
        .limit(10);

      const { data: reads } = await supabase
        .from("announcement_reads")
        .select("announcement_id")
        .eq("user_id", user.id);

      const readIds = new Set(reads?.map((r) => r.announcement_id) || []);
      const typed = (announcements as unknown as Announcement[]) || [];
      const unread = typed.filter((a) => !readIds.has(a.id));

      setUnreadCount(unread.length);
      setRecentAnnouncements(typed.slice(0, 5));
    } catch (error) {
      console.error("Error fetching notifications:", error);
    }
  }, [user, profile?.department_id]);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative text-zinc-400 hover:text-white h-9 w-9">
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold px-1 border-2 border-black">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0 bg-zinc-900 border-white/10 text-white">
        <div className="p-3 border-b border-white/5 flex items-center justify-between">
          <h4 className="text-sm font-bold">Notifications</h4>
          {unreadCount > 0 && (
            <Badge variant="destructive" className="text-[10px]">{unreadCount} unread</Badge>
          )}
        </div>
        <div className="max-h-80 overflow-y-auto">
          {recentAnnouncements.length === 0 ? (
            <p className="text-sm text-zinc-500 text-center py-6">No notifications</p>
          ) : (
            recentAnnouncements.map((a) => (
              <Link
                key={a.id}
                to="/announcements"
                onClick={() => setOpen(false)}
                className="block px-3 py-3 hover:bg-zinc-800/60 transition-colors border-b border-white/5 last:border-0"
              >
                <div className="flex items-center gap-2 mb-1">
                  <Badge
                    variant={a.priority === "critical" ? "destructive" : a.priority === "important" ? "default" : "secondary"}
                    className="text-[9px] px-1.5 py-0"
                  >
                    {PRIORITIES[a.priority]?.label}
                  </Badge>
                  {a.category && (
                    <span className="text-[10px] text-zinc-500">{a.category.name}</span>
                  )}
                </div>
                <p className="text-sm font-medium text-zinc-100 line-clamp-1">{a.title}</p>
                <p className="text-xs text-zinc-500 line-clamp-1 mt-0.5">{a.content}</p>
                {a.published_at && (
                  <p className="text-[10px] text-zinc-600 mt-1 flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {formatDistanceToNow(new Date(a.published_at), { addSuffix: true })}
                  </p>
                )}
              </Link>
            ))
          )}
        </div>
        <Link
          to="/announcements"
          onClick={() => setOpen(false)}
          className="block text-center text-xs font-bold text-sky-500 hover:text-sky-400 p-3 border-t border-white/5"
        >
          View All Announcements
        </Link>
      </PopoverContent>
    </Popover>
  );
}
