import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Plus, Clock, MessageSquare as MessageIcon } from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { toast } from "sonner";
import type { Announcement, AnnouncementCategory } from "@/types/database";
import { PRIORITIES } from "@/lib/constants";

export default function Announcements() {
  const { user, profile, isAdmin, hasRole } = useAuth();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [categories, setCategories] = useState<AnnouncementCategory[]>([]);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [isLoading, setIsLoading] = useState(true);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  // Form state
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [newPriority, setNewPriority] = useState<"general" | "important" | "critical">("general");
  const [newScope, setNewScope] = useState<"global" | "department">("global");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canCreate = isAdmin() || hasRole("department_manager");
  const isDeptManagerOnly = hasRole("department_manager") && !isAdmin();

  useEffect(() => {
    fetchData();
  }, [user, profile?.department_id]);

  const fetchData = async () => {
    if (!user) return;

    try {
      const [{ data: announcementsData }, { data: categoriesData }, { data: readsData }] =
        await Promise.all([
          supabase
            .from("announcements")
            .select(`*, category:announcement_categories(*), author:profiles(*)`)
            .eq("is_published", true)
            .or(
              profile?.department_id
                ? `target_department_id.is.null,target_department_id.eq.${profile.department_id}`
                : `target_department_id.is.null`
            )
            .order("published_at", { ascending: false }),
          supabase.from("announcement_categories").select("*").order("name"),
          supabase
            .from("announcement_reads")
            .select("announcement_id")
            .eq("user_id", user.id),
        ]);

      setAnnouncements((announcementsData as unknown as Announcement[]) || []);
      setCategories((categoriesData as unknown as AnnouncementCategory[]) || []);
      setReadIds(new Set(readsData?.map((r) => r.announcement_id) || []));
    } catch (error) {
      console.error("Error fetching announcements:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const markAsRead = async (announcementId: string) => {
    if (!user || readIds.has(announcementId)) return;
    try {
      await supabase.from("announcement_reads").insert({
        announcement_id: announcementId,
        user_id: user.id,
      });
      setReadIds((prev) => new Set([...prev, announcementId]));
    } catch (error) {
      console.error("Error marking as read:", error);
    }
  };

  const handleViewAnnouncement = (announcement: Announcement) => {
    setSelectedAnnouncement(announcement);
    markAsRead(announcement.id);
  };

  const handleCreateAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    setIsSubmitting(true);
    try {
      const targetDeptId =
        newScope === "department" ? profile.department_id : null;

      const { error } = await supabase.from("announcements").insert({
        title: newTitle,
        content: newContent,
        category_id: newCategory || null,
        priority: newPriority,
        author_id: profile.id,
        is_published: true,
        published_at: new Date().toISOString(),
        target_department_id: targetDeptId,
      });

      if (error) throw error;

      toast.success("Announcement published successfully!");
      setIsCreateOpen(false);
      setNewTitle("");
      setNewContent("");
      setNewCategory("");
      setNewPriority("general");
      setNewScope("global");
      fetchData();
    } catch (error) {
      console.error("Error creating announcement:", error);
      toast.error("Failed to publish announcement");
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredAnnouncements = announcements.filter(
    (a) => selectedCategory === "all" || a.category_id === selectedCategory
  );
  const unreadAnnouncements = filteredAnnouncements.filter((a) => !readIds.has(a.id));

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Announcements</h1>
          <p className="text-muted-foreground mt-1">Stay updated with company news and updates</p>
        </div>
        {canCreate && (
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" />New Announcement</Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create Announcement</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreateAnnouncement} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Title</Label>
                  <Input id="title" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="content">Content</Label>
                  <Textarea id="content" value={newContent} onChange={(e) => setNewContent(e.target.value)} rows={6} required />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Category</Label>
                    <Select value={newCategory} onValueChange={setNewCategory}>
                      <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                      <SelectContent>
                        {categories.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Priority</Label>
                    <Select value={newPriority} onValueChange={(v) => setNewPriority(v as "general" | "important" | "critical")}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="general">General</SelectItem>
                        <SelectItem value="important">Important</SelectItem>
                        <SelectItem value="critical">Critical</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Scope</Label>
                    <Select
                      value={newScope}
                      onValueChange={(v) => setNewScope(v as "global" | "department")}
                      disabled={isDeptManagerOnly}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {!isDeptManagerOnly && <SelectItem value="global">Global</SelectItem>}
                        <SelectItem value="department">My Department</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Publishing..." : "Publish"}</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="flex gap-4">
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-[200px]"><SelectValue placeholder="All Categories" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Tabs defaultValue="unread">
        <TabsList>
          <TabsTrigger value="unread">Unread ({unreadAnnouncements.length})</TabsTrigger>
          <TabsTrigger value="all">All ({filteredAnnouncements.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="unread" className="space-y-4 mt-4">
          <AnnouncementList announcements={unreadAnnouncements} readIds={readIds} onView={handleViewAnnouncement} />
        </TabsContent>
        <TabsContent value="all" className="space-y-4 mt-4">
          <AnnouncementList announcements={filteredAnnouncements} readIds={readIds} onView={handleViewAnnouncement} />
        </TabsContent>
      </Tabs>

      {/* Detail Dialog */}
      <Dialog open={!!selectedAnnouncement} onOpenChange={() => setSelectedAnnouncement(null)}>
        <DialogContent className="max-w-2xl">
          {selectedAnnouncement && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant={selectedAnnouncement.priority === "critical" ? "destructive" : selectedAnnouncement.priority === "important" ? "default" : "secondary"}>
                    {PRIORITIES[selectedAnnouncement.priority].label}
                  </Badge>
                  {selectedAnnouncement.target_department_id && (
                    <Badge variant="outline" className="text-primary border-primary/30">Department</Badge>
                  )}
                  {!selectedAnnouncement.target_department_id && (
                    <Badge variant="outline">Global</Badge>
                  )}
                  {selectedAnnouncement.category && (
                    <Badge variant="outline" style={{ borderColor: selectedAnnouncement.category.color, color: selectedAnnouncement.category.color }}>
                      {selectedAnnouncement.category.name}
                    </Badge>
                  )}
                </div>
                <DialogTitle className="text-xl mt-2">{selectedAnnouncement.title}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={selectedAnnouncement.author?.avatar_url || undefined} />
                    <AvatarFallback>
                      {selectedAnnouncement.author ? `${selectedAnnouncement.author.first_name[0]}${selectedAnnouncement.author.last_name[0]}` : "A"}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{selectedAnnouncement.author?.first_name} {selectedAnnouncement.author?.last_name}</p>
                    <p className="text-sm text-muted-foreground">
                      {selectedAnnouncement.published_at && format(new Date(selectedAnnouncement.published_at), "PPP 'at' p")}
                    </p>
                  </div>
                </div>
                <div className="prose prose-sm max-w-none">
                  <p className="whitespace-pre-wrap">{selectedAnnouncement.content}</p>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function AnnouncementList({ announcements, readIds, onView }: { announcements: Announcement[]; readIds: Set<string>; onView: (a: Announcement) => void }) {
  if (announcements.length === 0) {
    return (
      <div className="text-center py-12">
        <MessageIcon className="h-12 w-12 mx-auto text-muted-foreground" />
        <h3 className="mt-4 text-lg font-semibold">No announcements</h3>
        <p className="text-muted-foreground">Check back later for updates</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {announcements.map((announcement) => (
        <Card
          key={announcement.id}
          className={`cursor-pointer transition-all hover:shadow-md ${!readIds.has(announcement.id) ? "border-l-4 border-l-primary" : ""}`}
          onClick={() => onView(announcement)}
        >
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <Avatar className="h-10 w-10">
                <AvatarImage src={announcement.author?.avatar_url || undefined} />
                <AvatarFallback>{announcement.author ? `${announcement.author.first_name[0]}${announcement.author.last_name[0]}` : "A"}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="font-semibold">{announcement.title}</h4>
                  <Badge variant={announcement.priority === "critical" ? "destructive" : announcement.priority === "important" ? "default" : "secondary"}>
                    {PRIORITIES[announcement.priority].label}
                  </Badge>
                  {announcement.target_department_id ? (
                    <Badge variant="outline" className="text-primary border-primary/30 text-[10px]">Dept</Badge>
                  ) : (
                    <Badge variant="outline" className="text-[10px]">Global</Badge>
                  )}
                  {announcement.category && (
                    <Badge variant="outline" style={{ borderColor: announcement.category.color, color: announcement.category.color }}>
                      {announcement.category.name}
                    </Badge>
                  )}
                  {!readIds.has(announcement.id) && <Badge variant="default" className="bg-primary">New</Badge>}
                </div>
                <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{announcement.content}</p>
                <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {announcement.published_at && formatDistanceToNow(new Date(announcement.published_at), { addSuffix: true })}
                  </span>
                  <span>{announcement.author?.first_name} {announcement.author?.last_name}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
