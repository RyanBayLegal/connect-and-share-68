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
  Clock,
  ListTodo,
  BookOpen,
  CalendarDays,
  GraduationCap,
} from "lucide-react";
import { Link } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import type { Announcement } from "@/types/database";
import { PRIORITIES, COMPANY_NAME, COMPANY_TAGLINE } from "@/lib/constants";
import { ManagerProgressWidget } from "@/components/dashboard/ManagerProgressWidget";

import { ChatGPTWidget } from "@/components/dashboard/ChatGPTWidget";
import { BirthdaysAnniversariesWidget } from "@/components/dashboard/BirthdaysAnniversariesWidget";
import { GoogleReviewsWidget } from "@/components/dashboard/GoogleReviewsWidget";
import { TrainingQuickActionsWidget } from "@/components/dashboard/TrainingQuickActionsWidget";
import { HRQuickActionsWidget } from "@/components/dashboard/HRQuickActionsWidget";


interface DashboardStats {
  totalEmployees: number;
  unreadAnnouncements: number;
  totalDocuments: number;
  unreadMessages: number;
}

const resourceCards = [
  { title: "DIRECTORY", icon: Users, href: "/directory", description: "Find team members" },
  { title: "ANNOUNCEMENTS", icon: Megaphone, href: "/announcements", description: "Company news" },
  { title: "DOCUMENTS", icon: FileText, href: "/documents", description: "Files & resources" },
  { title: "WIKI", icon: BookOpen, href: "/wiki", description: "Knowledge base" },
  { title: "TASKS", icon: ListTodo, href: "/tasks", description: "Projects & tasks" },
  { title: "TRAINING", icon: GraduationCap, href: "/training", description: "Your courses" },
  { title: "MESSAGES", icon: MessageSquare, href: "/messages", description: "Team chat" },
  { title: "EVENTS", icon: CalendarDays, href: "/events", description: "Calendar" },
];

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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {/* Hero Section with Diamond Pattern */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 diamond-pattern opacity-40" />
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent" />
        <div className="container relative z-10 py-16 md:py-24 text-center">
          <h1 className="text-3xl md:text-5xl font-light tracking-wide neon-text">
            {COMPANY_NAME} Hub
          </h1>
          <p className="mt-4 text-muted-foreground text-lg">
            {COMPANY_TAGLINE}
          </p>
        </div>
      </section>

      {/* Welcome Banner */}
      <section className="glass-panel border-y border-primary/20 py-4">
        <div className="container text-center">
          <p className="text-sm md:text-base text-foreground/80">
            Welcome{profile?.first_name ? `, ${profile.first_name}` : ""} to the Bay Legal Knowledge Hub — your go-to place for policies, forms, and helpful resources designed to support you every day.
          </p>
        </div>
      </section>

      {/* Birthdays & Anniversaries Widget */}
      <section className="container pt-8">
        <BirthdaysAnniversariesWidget />
      </section>

      {/* HR Quick Actions - only visible to HR managers */}
      <section className="container pt-4">
        <HRQuickActionsWidget />
      </section>

      {/* Training Quick Actions - only visible to training managers */}
      <section className="container pt-4">
        <TrainingQuickActionsWidget />
      </section>

      {/* Resources - Full Width */}
      <section className="container py-8">
        <Card className="glass-card neon-border">
              <CardHeader className="pb-4">
                <CardTitle className="text-2xl font-light text-center neon-text">
                  YOUR RESOURCES
                </CardTitle>
                <div className="w-24 h-0.5 bg-primary/40 mx-auto rounded-full neon-glow-sm" />
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
                  {resourceCards.map((resource) => (
                    <Link
                      key={resource.href}
                      to={resource.href}
                      className="group flex flex-col items-center text-center p-4 rounded-xl transition-all duration-300 hover:bg-primary/5 hover:-translate-y-2 focus-ring"
                    >
                      <div className="w-16 h-16 md:w-20 md:h-20 rounded-full glass-panel flex items-center justify-center mb-3 transition-all duration-300 group-hover:neon-glow-md group-hover:scale-110 group-hover:border-primary/40">
                        <resource.icon className="h-8 w-8 md:h-10 md:w-10 text-primary transition-transform duration-300 group-hover:scale-110" />
                      </div>
                      <span className="text-primary font-medium text-xs md:text-sm tracking-wide transition-colors group-hover:text-foreground">
                        {resource.title}
                      </span>
                      <span className="text-muted-foreground text-xs mt-1 hidden md:block transition-colors group-hover:text-foreground/70">
                        {resource.description}
                      </span>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
      </section>

      {/* ChatGPT + Google Reviews Row */}
      <section className="container pb-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <ChatGPTWidget />
          <GoogleReviewsWidget />
        </div>
      </section>

      {/* Manager Progress Widget */}
      <section className="container pb-8">
        <ManagerProgressWidget />
      </section>

      {/* Recent Announcements */}
      <section className="container pb-12">
        <Card className="card-interactive">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-primary icon-pulse" />
                Recent Announcements
              </CardTitle>
              <CardDescription>
                Stay updated with the latest company news
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" asChild className="btn-shine group">
              <Link to="/announcements">
                View All <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
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
                    className="flex items-start gap-4 p-4 rounded-lg border bg-card transition-all duration-300 hover:bg-muted/50 hover:border-primary/30 hover:shadow-md hover:-translate-x-1 cursor-pointer"
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
      </section>
    </div>
  );
}
