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
import { PRIORITIES } from "@/lib/constants";
import { ManagerProgressWidget } from "@/components/dashboard/ManagerProgressWidget";
import { BirthdaysAnniversariesWidget } from "@/components/dashboard/BirthdaysAnniversariesWidget";
import { GoogleReviewsWidget } from "@/components/dashboard/GoogleReviewsWidget";
import { TrainingQuickActionsWidget } from "@/components/dashboard/TrainingQuickActionsWidget";
import { useBranding } from "@/hooks/useBranding";

export default function Dashboard() {
  const { profile, user } = useAuth();
  const [recentAnnouncements, setRecentAnnouncements] = useState<Announcement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { branding } = useBranding();

  useEffect(() => {
    const fetchDashboardData = async () => {
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
          .limit(5);

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
    <div className="space-y-8">
      {/* Hero Section */}
      <section>
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
              {branding.company_name} Hub
            </h1>
            <p className="max-w-2xl text-zinc-300 text-lg md:text-xl leading-relaxed mb-10">
              {branding.company_slogan}
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

      {/* Main Content: Announcements center, sidebars */}
      <section>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left: Celebrations + Manager Progress */}
          <div className="lg:col-span-3 space-y-6">
            <BirthdaysAnniversariesWidget />
            <ManagerProgressWidget />
            <TrainingQuickActionsWidget />
          </div>

          {/* Center: Announcements (prominent) */}
          <div className="lg:col-span-6">
            <Card className="bg-zinc-900/40 border-white/5 overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between pb-2 bg-gradient-to-b from-white/[0.02] to-transparent">
                <div className="flex items-center gap-2">
                  <Megaphone className="h-5 w-5 text-sky-500" />
                  <CardTitle className="text-lg font-bold uppercase tracking-wider">Announcements</CardTitle>
                </div>
                <Link to="/announcements" className="text-xs font-bold text-sky-500 hover:text-sky-400 uppercase tracking-wider">View All →</Link>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                {recentAnnouncements.length === 0 ? (
                  <p className="text-sm text-zinc-500 text-center py-8">No announcements yet</p>
                ) : (
                  recentAnnouncements.map((announcement) => (
                    <Link key={announcement.id} to="/announcements" className="group block p-4 rounded-xl bg-zinc-800/30 hover:bg-zinc-800/60 border border-white/5 hover:border-sky-500/20 transition-all">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge
                          variant={
                            announcement.priority === "critical"
                              ? "destructive"
                              : announcement.priority === "important"
                              ? "default"
                              : "secondary"
                          }
                          className="text-[10px] uppercase px-2 py-0"
                        >
                          {PRIORITIES[announcement.priority]?.label || announcement.priority}
                        </Badge>
                        {announcement.target_department_id ? (
                          <Badge variant="outline" className="text-[10px] text-sky-400 border-sky-500/30 px-2 py-0">Dept</Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] px-2 py-0">Global</Badge>
                        )}
                        {announcement.category && (
                          <Badge variant="outline" className="text-[10px] px-2 py-0" style={{ borderColor: announcement.category.color, color: announcement.category.color }}>
                            {announcement.category.name}
                          </Badge>
                        )}
                      </div>
                      <h4 className="font-bold text-base text-zinc-100 group-hover:text-sky-400 transition-colors mb-1">
                        {announcement.title}
                      </h4>
                      <p className="text-sm text-zinc-400 line-clamp-2 leading-relaxed">
                        {announcement.content}
                      </p>
                      <div className="flex items-center gap-3 mt-3 text-xs text-zinc-500">
                        {announcement.published_at && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatDistanceToNow(new Date(announcement.published_at), { addSuffix: true })}
                          </span>
                        )}
                        {announcement.author && (
                          <span>{announcement.author.first_name} {announcement.author.last_name}</span>
                        )}
                      </div>
                    </Link>
                  ))
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right: Google Reviews */}
          <div className="lg:col-span-3">
            <GoogleReviewsWidget />
          </div>
        </div>
      </section>
    </div>
  );
}
