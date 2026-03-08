import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Megaphone, Clock } from "lucide-react";
import { Link } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import type { Announcement } from "@/types/database";
import { PRIORITIES } from "@/lib/constants";
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
      {/* Row 1: Birthdays | Announcements | Google Reviews */}
      <section>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-3">
            <BirthdaysAnniversariesWidget />
          </div>

          <div className="lg:col-span-6">
            <Card className="overflow-hidden h-full">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div className="flex items-center gap-2">
                  <Megaphone className="h-5 w-5 text-primary" />
                  <CardTitle className="text-lg font-bold uppercase tracking-wider">Announcements</CardTitle>
                </div>
                <Link to="/announcements" className="text-xs font-bold text-primary hover:text-primary/80 uppercase tracking-wider">View All →</Link>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                {recentAnnouncements.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">No announcements yet</p>
                ) : (
                  recentAnnouncements.map((announcement) => (
                    <Link key={announcement.id} to="/announcements" className="group block p-4 rounded-xl bg-muted/30 hover:bg-muted/60 border border-border hover:border-primary/20 transition-all">
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
                          <Badge variant="outline" className="text-[10px] text-primary border-primary/30 px-2 py-0">Dept</Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] px-2 py-0">Global</Badge>
                        )}
                        {announcement.category && (
                          <Badge variant="outline" className="text-[10px] px-2 py-0" style={{ borderColor: announcement.category.color, color: announcement.category.color }}>
                            {announcement.category.name}
                          </Badge>
                        )}
                      </div>
                      <h4 className="font-bold text-base text-foreground group-hover:text-primary transition-colors mb-1">
                        {announcement.title}
                      </h4>
                      <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                        {announcement.content}
                      </p>
                      <div className="flex items-center gap-3 mt-3 text-xs text-muted-foreground">
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

          <div className="lg:col-span-3">
            <GoogleReviewsWidget />
          </div>
        </div>
      </section>

      {/* Row 2: Manager Progress | Training */}
      <section>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <ManagerProgressWidget />
          <TrainingQuickActionsWidget />
        </div>
      </section>
    </div>
  );
}
