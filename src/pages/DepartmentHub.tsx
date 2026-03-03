import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Users,
  FileText,
  BookOpen,
  Megaphone,
  CalendarDays,
  ChevronRight,
  Building2,
} from "lucide-react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import type { Department, Profile, Document, WikiArticle, Announcement } from "@/types/database";

interface DepartmentStats {
  teamCount: number;
  documentsCount: number;
  articlesCount: number;
  announcementsCount: number;
  eventsCount: number;
}

export default function DepartmentHub() {
  const { profile, isAdmin } = useAuth();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<string>("");
  const [selectedDepartment, setSelectedDepartment] = useState<Department | null>(null);
  const [teamMembers, setTeamMembers] = useState<Profile[]>([]);
  const [recentDocuments, setRecentDocuments] = useState<Document[]>([]);
  const [recentArticles, setRecentArticles] = useState<WikiArticle[]>([]);
  const [recentAnnouncements, setRecentAnnouncements] = useState<Announcement[]>([]);
  const [stats, setStats] = useState<DepartmentStats>({
    teamCount: 0,
    documentsCount: 0,
    articlesCount: 0,
    announcementsCount: 0,
    eventsCount: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchDepartments();
  }, []);

  useEffect(() => {
    if (profile?.department_id && !selectedDepartmentId) {
      setSelectedDepartmentId(profile.department_id);
    }
  }, [profile]);

  useEffect(() => {
    if (selectedDepartmentId) {
      fetchDepartmentData();
    }
  }, [selectedDepartmentId]);

  const fetchDepartments = async () => {
    try {
      const { data, error } = await supabase
        .from("departments")
        .select("*")
        .order("name");

      if (error) throw error;
      setDepartments(data || []);
    } catch (error) {
      console.error("Error fetching departments:", error);
    }
  };

  const fetchDepartmentData = async () => {
    setIsLoading(true);
    try {
      // Fetch department details
      const { data: deptData } = await supabase
        .from("departments")
        .select("*")
        .eq("id", selectedDepartmentId)
        .single();

      if (deptData) {
        setSelectedDepartment(deptData);
      }

      // Fetch team members
      const { data: members } = await supabase
        .from("profiles")
        .select("*")
        .eq("department_id", selectedDepartmentId)
        .eq("is_active", true)
        .order("first_name")
        .limit(6);

      setTeamMembers(members || []);

      // Fetch stats
      const [teamCountRes, docsCountRes, articlesCountRes, announcementsCountRes, eventsCountRes] = await Promise.all([
        supabase
          .from("profiles")
          .select("id", { count: "exact" })
          .eq("department_id", selectedDepartmentId)
          .eq("is_active", true),
        supabase
          .from("documents")
          .select("id, folder:document_folders!inner(department_id)", { count: "exact" })
          .eq("folder.department_id", selectedDepartmentId),
        supabase
          .from("wiki_articles")
          .select("id", { count: "exact" })
          .eq("department_id", selectedDepartmentId)
          .eq("is_published", true),
        supabase
          .from("announcements")
          .select("id", { count: "exact" })
          .eq("target_department_id", selectedDepartmentId)
          .eq("is_published", true),
        supabase
          .from("events")
          .select("id", { count: "exact" })
          .eq("department_id", selectedDepartmentId),
      ]);

      setStats({
        teamCount: teamCountRes.count || 0,
        documentsCount: docsCountRes.count || 0,
        articlesCount: articlesCountRes.count || 0,
        announcementsCount: announcementsCountRes.count || 0,
        eventsCount: eventsCountRes.count || 0,
      });

      // Fetch recent documents from department folders
      const { data: folders } = await supabase
        .from("document_folders")
        .select("id")
        .eq("department_id", selectedDepartmentId);

      if (folders && folders.length > 0) {
        const folderIds = folders.map(f => f.id);
        const { data: docs } = await supabase
          .from("documents")
          .select("*")
          .in("folder_id", folderIds)
          .order("updated_at", { ascending: false })
          .limit(5);
        setRecentDocuments(docs || []);
      } else {
        setRecentDocuments([]);
      }

      // Fetch recent department articles
      const { data: articles } = await supabase
        .from("wiki_articles")
        .select("*, category:wiki_categories(*), author:profiles(*)")
        .eq("department_id", selectedDepartmentId)
        .eq("is_published", true)
        .order("updated_at", { ascending: false })
        .limit(5);

      setRecentArticles((articles as unknown as WikiArticle[]) || []);

      // Fetch recent announcements
      const { data: announcements } = await supabase
        .from("announcements")
        .select("*, category:announcement_categories(*), author:profiles(*)")
        .eq("target_department_id", selectedDepartmentId)
        .eq("is_published", true)
        .order("published_at", { ascending: false })
        .limit(3);

      setRecentAnnouncements((announcements as unknown as Announcement[]) || []);
    } catch (error) {
      console.error("Error fetching department data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!selectedDepartmentId && !profile?.department_id) {
    return (
      <div>
        <Card className="max-w-md mx-auto">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Select a Department
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={selectedDepartmentId} onValueChange={setSelectedDepartmentId}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a department to view" />
              </SelectTrigger>
              <SelectContent>
                {departments.map((dept) => (
                  <SelectItem key={dept.id} value={dept.id}>
                    {dept.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Building2 className="h-6 w-6" />
            {selectedDepartment?.name || "Department"}
          </h1>
          <p className="text-muted-foreground">
            {stats.teamCount} team member{stats.teamCount !== 1 ? "s" : ""}
          </p>
        </div>
        {isAdmin() && (
          <Select value={selectedDepartmentId} onValueChange={setSelectedDepartmentId}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Change department" />
            </SelectTrigger>
            <SelectContent>
              {departments.map((dept) => (
                <SelectItem key={dept.id} value={dept.id}>
                  {dept.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : (
        <>
          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Users className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats.teamCount}</p>
                    <p className="text-sm text-muted-foreground">Team Members</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-500/10 rounded-lg">
                    <FileText className="h-5 w-5 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats.documentsCount}</p>
                    <p className="text-sm text-muted-foreground">Documents</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-500/10 rounded-lg">
                    <BookOpen className="h-5 w-5 text-purple-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats.articlesCount}</p>
                    <p className="text-sm text-muted-foreground">Articles</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-500/10 rounded-lg">
                    <Megaphone className="h-5 w-5 text-amber-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats.announcementsCount}</p>
                    <p className="text-sm text-muted-foreground">Announcements</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-500/10 rounded-lg">
                    <CalendarDays className="h-5 w-5 text-green-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats.eventsCount}</p>
                    <p className="text-sm text-muted-foreground">Events</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Content Grid */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* Team Members */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Team Members
                </CardTitle>
                <Button variant="ghost" size="sm" asChild>
                  <Link to="/directory">
                    View All <ChevronRight className="h-4 w-4 ml-1" />
                  </Link>
                </Button>
              </CardHeader>
              <CardContent>
                {teamMembers.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No team members found
                  </p>
                ) : (
                  <div className="space-y-3">
                    {teamMembers.map((member) => (
                      <div key={member.id} className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={member.avatar_url || undefined} />
                          <AvatarFallback>
                            {member.first_name[0]}{member.last_name[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">
                            {member.first_name} {member.last_name}
                          </p>
                          <p className="text-sm text-muted-foreground truncate">
                            {member.job_title || "Employee"}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recent Documents */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Recent Documents
                </CardTitle>
                <Button variant="ghost" size="sm" asChild>
                  <Link to="/documents">
                    View All <ChevronRight className="h-4 w-4 ml-1" />
                  </Link>
                </Button>
              </CardHeader>
              <CardContent>
                {recentDocuments.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No documents found
                  </p>
                ) : (
                  <div className="space-y-3">
                    {recentDocuments.map((doc) => (
                      <div key={doc.id} className="flex items-center gap-3">
                        <div className="p-2 bg-muted rounded-lg">
                          <FileText className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{doc.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {format(new Date(doc.updated_at), "MMM d, yyyy")}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Department Articles */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  Department Articles
                </CardTitle>
                <Button variant="ghost" size="sm" asChild>
                  <Link to="/wiki">
                    View All <ChevronRight className="h-4 w-4 ml-1" />
                  </Link>
                </Button>
              </CardHeader>
              <CardContent>
                {recentArticles.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No articles found
                  </p>
                ) : (
                  <div className="space-y-3">
                    {recentArticles.map((article) => (
                      <div key={article.id} className="flex items-center gap-3">
                        <div className="p-2 bg-purple-500/10 rounded-lg">
                          <BookOpen className="h-4 w-4 text-purple-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{article.title}</p>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Badge variant="outline" className="text-xs">
                              {article.article_type}
                            </Badge>
                            <span>{format(new Date(article.updated_at), "MMM d")}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Department Announcements */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Megaphone className="h-5 w-5" />
                  Announcements
                </CardTitle>
                <Button variant="ghost" size="sm" asChild>
                  <Link to="/announcements">
                    View All <ChevronRight className="h-4 w-4 ml-1" />
                  </Link>
                </Button>
              </CardHeader>
              <CardContent>
                {recentAnnouncements.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No announcements found
                  </p>
                ) : (
                  <div className="space-y-3">
                    {recentAnnouncements.map((announcement) => (
                      <div key={announcement.id} className="p-3 bg-muted/50 rounded-lg">
                        <p className="font-medium">{announcement.title}</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          {announcement.published_at
                            ? format(new Date(announcement.published_at), "MMM d, yyyy")
                            : "Draft"}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
