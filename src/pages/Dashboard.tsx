import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Users, 
  Megaphone, 
  FileText, 
  MessageSquare, 
  ArrowRight,
  Bell,
  Clock
} from "lucide-react";
import { Link } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import type { Announcement, Profile } from "@/types/database";
import { PRIORITIES, COMPANY_NAME, COMPANY_TAGLINE } from "@/lib/constants";
import bayLegalLogo from "@/assets/bay-legal-logo.webp";

interface DashboardStats {
  totalEmployees: number;
  unreadAnnouncements: number;
  totalDocuments: number;
  unreadMessages: number;
}

export default function Dashboard() {
  const { profile, user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalEmployees: 0,
    unreadAnnouncements: 0,
    totalDocuments: 0,
    unreadMessages: 0,
  });
  const [recentAnnouncements, setRecentAnnouncements] = useState<Announcement[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!user) return;

      try {
        // Fetch stats
        const [
          { count: employeeCount },
          { count: documentCount },
          { count: messageCount },
        ] = await Promise.all([
          supabase.from("profiles").select("*", { count: "exact", head: true }).eq("is_active", true),
          supabase.from("documents").select("*", { count: "exact", head: true }),
          supabase.from("messages").select("*", { count: "exact", head: true })
            .eq("recipient_id", user.id)
            .eq("is_read", false),
        ]);

        // Fetch recent announcements
        const { data: announcements } = await supabase
          .from("announcements")
          .select(`
            *,
            category:announcement_categories(*),
            author:profiles(*)
          `)
          .eq("is_published", true)
          .order("published_at", { ascending: false })
          .limit(5);

        // Get read announcements for current user
        const { data: readAnnouncements } = await supabase
          .from("announcement_reads")
          .select("announcement_id")
          .eq("user_id", user.id);

        const readIds = new Set(readAnnouncements?.map((r) => r.announcement_id) || []);
        const unreadCount = (announcements || []).filter(
          (a) => !readIds.has(a.id)
        ).length;

        setStats({
          totalEmployees: employeeCount || 0,
          unreadAnnouncements: unreadCount,
          totalDocuments: documentCount || 0,
          unreadMessages: messageCount || 0,
        });

        setRecentAnnouncements((announcements as unknown as Announcement[]) || []);
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, [user]);

  const statCards = [
    {
      title: "Employees",
      value: stats.totalEmployees,
      icon: Users,
      href: "/directory",
      bgClass: "bg-primary/10",
      iconClass: "text-primary",
    },
    {
      title: "Announcements",
      value: stats.unreadAnnouncements,
      label: "unread",
      icon: Megaphone,
      href: "/announcements",
      bgClass: "bg-accent/20",
      iconClass: "text-accent",
    },
    {
      title: "Documents",
      value: stats.totalDocuments,
      icon: FileText,
      href: "/documents",
      bgClass: "bg-green-500/10",
      iconClass: "text-green-600",
    },
    {
      title: "Messages",
      value: stats.unreadMessages,
      label: "unread",
      icon: MessageSquare,
      href: "/messages",
      bgClass: "bg-purple-500/10",
      iconClass: "text-purple-600",
    },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <Card className="bg-gradient-to-r from-[hsl(220,60%,15%)] to-[hsl(210,80%,30%)] text-white border-0 overflow-hidden relative">
        <div className="absolute inset-0 diamond-pattern opacity-50" />
        <CardContent className="py-8 relative z-10">
          <div className="flex items-center gap-4">
            <img 
              src={bayLegalLogo} 
              alt={COMPANY_NAME}
              className="h-16 w-16 rounded-xl shadow-lg hidden sm:block"
            />
            <div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
                Welcome back, {profile?.first_name}!
              </h1>
              <p className="text-white/80 mt-1">
                {COMPANY_TAGLINE}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <Card key={stat.title} className="hover:shadow-md transition-shadow border-border/50">
            <Link to={stat.href}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <div className={`p-2 rounded-lg ${stat.bgClass}`}>
                  <stat.icon className={`h-4 w-4 ${stat.iconClass}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                {stat.label && (
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                )}
              </CardContent>
            </Link>
          </Card>
        ))}
      </div>

      {/* Recent Announcements */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-primary" />
              Recent Announcements
            </CardTitle>
            <CardDescription>
              Stay updated with the latest company news
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link to="/announcements">
              View All <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          {recentAnnouncements.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No announcements yet
            </p>
          ) : (
            <div className="space-y-4">
              {recentAnnouncements.map((announcement) => (
                <div
                  key={announcement.id}
                  className="flex items-start gap-4 p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                >
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={announcement.author?.avatar_url || undefined} />
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {announcement.author
                        ? `${announcement.author.first_name[0]}${announcement.author.last_name[0]}`
                        : "A"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-semibold truncate">
                        {announcement.title}
                      </h4>
                      <Badge
                        variant={
                          announcement.priority === "critical"
                            ? "destructive"
                            : announcement.priority === "important"
                            ? "default"
                            : "secondary"
                        }
                      >
                        {PRIORITIES[announcement.priority].label}
                      </Badge>
                      {announcement.category && (
                        <Badge
                          variant="outline"
                          style={{
                            borderColor: announcement.category.color,
                            color: announcement.category.color,
                          }}
                        >
                          {announcement.category.name}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                      {announcement.content}
                    </p>
                    <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {announcement.published_at &&
                        formatDistanceToNow(new Date(announcement.published_at), {
                          addSuffix: true,
                        })}
                      <span>•</span>
                      <span>
                        {announcement.author?.first_name}{" "}
                        {announcement.author?.last_name}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
