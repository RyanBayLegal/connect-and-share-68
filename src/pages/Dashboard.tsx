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
    <>
      {/* Hero Section - Matching Reference */}
      <section className="container py-8">
        <div className="relative overflow-hidden rounded-3xl border border-white/10 shadow-2xl">
          {/* Background Image with Overlay */}
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
              <Button size="lg" className="bg-sky-500 hover:bg-sky-400 text-white font-bold px-8 shadow-[0_0_20px_rgba(14,165,233,0.4)] transition-all hover:scale-105">
                Explore Resources
              </Button>
              <Button size="lg" variant="secondary" className="bg-zinc-900/80 hover:bg-zinc-800 text-zinc-100 font-bold px-8 border border-white/10 transition-all hover:scale-105">
                Quick Wiki Access
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content Grid */}
      <section className="container pb-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Left: Your Resources Grid (2/3 width) */}
          <div className="lg:col-span-2 space-y-8">
            <div className="flex items-center gap-3">
              <div className="p-1.5 rounded-md bg-sky-500/10 text-sky-500">
                <div className="grid grid-cols-2 gap-0.5">
                  <div className="w-1.5 h-1.5 bg-current rounded-[1px]" />
                  <div className="w-1.5 h-1.5 bg-current rounded-[1px]" />
                  <div className="w-1.5 h-1.5 bg-current rounded-[1px]" />
                  <div className="w-1.5 h-1.5 bg-current rounded-[1px]" />
                </div>
              </div>
              <h2 className="text-2xl font-bold tracking-tight text-white uppercase">Your Resources</h2>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {resourceCards.map((resource) => (
                <Link
                  key={resource.href}
                  to={resource.href}
                  className="group relative flex flex-col items-center justify-center aspect-square p-6 rounded-2xl bg-zinc-900/40 border border-white/5 transition-all duration-300 hover:bg-zinc-800/60 hover:border-sky-500/30 hover:-translate-y-1 focus-ring"
                >
                  <div className="mb-4 p-3 rounded-xl bg-sky-500/10 text-sky-400 transition-all group-hover:scale-110 group-hover:bg-sky-500 group-hover:text-white shadow-inner">
                    <resource.icon className="h-6 w-6" />
                  </div>
                  <span className="text-sm font-bold tracking-wide text-zinc-400 transition-colors group-hover:text-white uppercase text-center">
                    {resource.title}
                  </span>
                </Link>
              ))}
            </div>

            {/* AI Powered Section */}
            <div className="pt-8">
              <ChatGPTWidget />
            </div>

            <div className="pt-4">
              <GoogleReviewsWidget />
            </div>
          </div>

          {/* Right: Sidebar (1/3 width) */}
          <div className="space-y-6">
            <BirthdaysAnniversariesWidget />

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
                  <div key={announcement.id} className="group cursor-pointer">
                    <Badge variant="outline" className="mb-2 text-[9px] uppercase border-sky-500/30 text-sky-400 px-2 py-0">
                      {announcement.category?.name || "News"}
                    </Badge>
                    <h4 className="font-bold text-sm text-zinc-100 line-clamp-2 leading-snug group-hover:text-sky-400 transition-colors">
                      {announcement.title}
                    </h4>
                    <p className="text-xs text-zinc-500 line-clamp-2 mt-1 leading-relaxed">
                      {announcement.content}
                    </p>
                  </div>
                ))}
              </CardContent>
            </Card>

            <ManagerProgressWidget />
            <HRQuickActionsWidget />
            <TrainingQuickActionsWidget />
          </div>
        </div>
      </section>
    </>
  );
}
