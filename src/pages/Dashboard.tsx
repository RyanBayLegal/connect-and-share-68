import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Megaphone, Clock } from "lucide-react";
import { Link } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import type { Announcement } from "@/types/database";
import { PRIORITIES, COMPANY_NAME } from "@/lib/constants";
import { ManagerProgressWidget } from "@/components/dashboard/ManagerProgressWidget";
import { BirthdaysAnniversariesWidget } from "@/components/dashboard/BirthdaysAnniversariesWidget";
import { GoogleReviewsWidget } from "@/components/dashboard/GoogleReviewsWidget";
import { TrainingQuickActionsWidget } from "@/components/dashboard/TrainingQuickActionsWidget";

export default function Dashboard() {
  const { profile, user } = useAuth();
  const [recentAnnouncements, setRecentAnnouncements] = useState<Announcement[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!user) return;

      try {
        const { data: announcements } = await supabase
          .from("announcements")
          .select(`
            *,
            category:announcement_categories(*),
            author:profiles(*)
          `)
          .eq("is_published", true)
          .or(
            profile?.department_id
              ? `target_department_id.is.null,target_department_id.eq.${profile.department_id}`
              : `target_department_id.is.null`
          )
          .order("published_at", { ascending: false })
          .limit(5);

        // Sort by priority: critical > important > general
        const sorted = ((announcements as unknown as Announcement[]) || []).sort((a, b) => {
          const priorityOrder: Record<string, number> = { critical: 0, important: 1, general: 2 };
          const pA = priorityOrder[a.priority] ?? 2;
          const pB = priorityOrder[b.priority] ?? 2;
          if (pA !== pB) return pA - pB;
          return new Date(b.published_at || "").getTime() - new Date(a.published_at || "").getTime();
        });

        setRecentAnnouncements(sorted);
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, [user, profile?.department_id]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <>
      {/* Hero Section */}
      <section className="container py-8">
        <div className="relative overflow-hidden rounded-3xl border border-white/10 shadow-2xl">
          <div className="absolute inset-0 z-0">
            <div className="absolute inset-0 bg-gradient-to-r from-black via-black/80 to-transparent z-10" />
            <img
              src="https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80&w=2000"
              alt="Office Background"
              className="w-full h-full object-cover opacity-60"
            />
          </div>
          <div className="relative z-20 flex flex-col items-center justify-center py-20 px-6 text-center">
            <Badge variant="secondary" className="mb-6 bg-sky-500/20 text-sky-400 border-sky-500/30 px-4 py-1 rounded-full uppercase tracking-widest text-[10px] font-bold">
              • CORPORATE PORTAL
            </Badge>
            <h1 className="text-4xl md:text-6xl font-black text-white mb-6 tracking-tight">
              Bay Legal, PC Hub
            </h1>
            <p className="max-w-2xl text-zinc-300 text-lg md:text-xl leading-relaxed mb-10">
              Your unified knowledge base for policies, high-performance resources, and professional support.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
              <Button asChild size="lg" className="bg-sky-500 hover:bg-sky-400 text-white font-bold px-8 shadow-[0_0_20px_rgba(14,165,233,0.4)] transition-all hover:scale-105">
                <Link to="/wiki">Explore Resources</Link>
              </Button>
              <Button asChild size="lg" variant="secondary" className="bg-zinc-900/80 hover:bg-zinc-800 text-zinc-100 font-bold px-8 border border-white/10 transition-all hover:scale-105">
                <Link to="/wiki">Quick Wiki Access</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Two-Column Layout: Google Reviews left, Sidebar right */}
      <section className="container pb-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Google Reviews */}
          <div className="lg:col-span-2 space-y-8">
            <GoogleReviewsWidget />
          </div>

          {/* Right Column: Celebrations, Announcements, Manager Progress, Training */}
          <div className="space-y-6">
            <BirthdaysAnniversariesWidget />

            {/* Announcements Widget - priority sorted */}
            <Card className="bg-zinc-900/40 border-white/5 overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between pb-2 bg-gradient-to-b from-white/[0.02] to-transparent">
                <div className="flex items-center gap-2">
                  <Megaphone className="h-4 w-4 text-sky-500" />
                  <CardTitle className="text-sm font-bold uppercase tracking-wider">Announcements</CardTitle>
                </div>
                <Link to="/announcements" className="text-[10px] font-bold text-sky-500 hover:text-sky-400 uppercase tracking-tighter">View All</Link>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                {recentAnnouncements.slice(0, 3).map((announcement) => (
                  <Link key={announcement.id} to="/announcements" className="group block">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge
                        variant={
                          announcement.priority === "critical"
                            ? "destructive"
                            : announcement.priority === "important"
                            ? "default"
                            : "secondary"
                        }
                        className="text-[9px] uppercase px-2 py-0"
                      >
                        {PRIORITIES[announcement.priority]?.label || announcement.priority}
                      </Badge>
                      {announcement.category && (
                        <Badge variant="outline" className="text-[9px] uppercase border-sky-500/30 text-sky-400 px-2 py-0">
                          {announcement.category.name}
                        </Badge>
                      )}
                    </div>
                    <h4 className="font-bold text-sm text-zinc-100 line-clamp-2 leading-snug group-hover:text-sky-400 transition-colors">
                      {announcement.title}
                    </h4>
                    <p className="text-xs text-zinc-500 line-clamp-2 mt-1 leading-relaxed">
                      {announcement.content}
                    </p>
                    {announcement.published_at && (
                      <p className="text-[10px] text-zinc-600 mt-1 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDistanceToNow(new Date(announcement.published_at), { addSuffix: true })}
                      </p>
                    )}
                  </Link>
                ))}
                {recentAnnouncements.length === 0 && (
                  <p className="text-sm text-zinc-500 text-center py-4">No announcements</p>
                )}
              </CardContent>
            </Card>

            <ManagerProgressWidget />
            <TrainingQuickActionsWidget />
          </div>
        </div>
      </section>
    </>
  );
}
