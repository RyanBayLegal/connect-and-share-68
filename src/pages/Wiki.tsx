import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
} from "@/components/ui/dialog";
import {
  BookOpen,
  Search,
  Plus,
  FileText,
  Eye,
  Shield,
  Users,
  Lock,
  Rocket,
  HelpCircle,
  Star,
  History,
  Edit,
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { toast } from "sonner";
import { ArticleFormDialog } from "@/components/wiki/ArticleFormDialog";
import { VersionHistoryDialog } from "@/components/wiki/VersionHistoryDialog";
import type { WikiArticle, WikiCategory, Profile } from "@/types/database";

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Shield,
  Users,
  Lock,
  Rocket,
  HelpCircle,
  FileText,
};

export default function Wiki() {
  const { isAdmin, profile } = useAuth();
  const [categories, setCategories] = useState<WikiCategory[]>([]);
  const [articles, setArticles] = useState<WikiArticle[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedArticle, setSelectedArticle] = useState<WikiArticle | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Dialogs
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [editingArticle, setEditingArticle] = useState<WikiArticle | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [{ data: catsData }, { data: articlesData }] = await Promise.all([
        supabase.from("wiki_categories").select("*").order("position"),
        supabase
          .from("wiki_articles")
          .select("*, category:wiki_categories(*), author:profiles(*)")
          .eq("is_published", true)
          .order("is_featured", { ascending: false })
          .order("updated_at", { ascending: false }),
      ]);

      setCategories((catsData as unknown as WikiCategory[]) || []);
      setArticles((articlesData as unknown as WikiArticle[]) || []);
    } catch (error) {
      console.error("Error fetching wiki:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateArticle = async (data: {
    title: string;
    content: string;
    category_id: string;
    article_type: "article" | "policy";
    is_featured: boolean;
  }) => {
    if (!profile) return;

    try {
      const { error } = await supabase.from("wiki_articles").insert({
        title: data.title,
        content: data.content,
        category_id: data.category_id || null,
        author_id: profile.id,
        is_published: true,
        is_featured: data.is_featured,
        article_type: data.article_type,
        current_version: 1,
        last_edited_by: profile.id,
      });

      if (error) throw error;

      toast.success(`${data.article_type === "policy" ? "Policy" : "Article"} published!`);
      fetchData();
    } catch (error: any) {
      toast.error(error.message || "Failed to create article");
      throw error;
    }
  };

  const handleEditArticle = async (data: {
    title: string;
    content: string;
    category_id: string;
    article_type: "article" | "policy";
    is_featured: boolean;
    change_summary?: string;
  }) => {
    if (!profile || !editingArticle) return;

    try {
      // Save current version to history first
      const { error: versionError } = await supabase.from("wiki_article_versions").insert({
        article_id: editingArticle.id,
        version_number: editingArticle.current_version,
        title: editingArticle.title,
        content: editingArticle.content,
        change_summary: data.change_summary || null,
        edited_by: profile.id,
      });

      if (versionError) throw versionError;

      // Update the article
      const { error: updateError } = await supabase
        .from("wiki_articles")
        .update({
          title: data.title,
          content: data.content,
          category_id: data.category_id || null,
          is_featured: data.is_featured,
          article_type: data.article_type,
          current_version: editingArticle.current_version + 1,
          last_edited_by: profile.id,
        })
        .eq("id", editingArticle.id);

      if (updateError) throw updateError;

      toast.success("Changes saved!");
      fetchData();
      setSelectedArticle(null);
    } catch (error: any) {
      toast.error(error.message || "Failed to save changes");
      throw error;
    }
  };

  const handleViewArticle = async (article: WikiArticle) => {
    setSelectedArticle(article);
    // Increment view count
    await supabase
      .from("wiki_articles")
      .update({ view_count: article.view_count + 1 })
      .eq("id", article.id);
  };

  const handleEditClick = (article: WikiArticle) => {
    setEditingArticle(article);
    setIsEditOpen(true);
  };

  const handleHistoryClick = (article: WikiArticle) => {
    setEditingArticle(article);
    setIsHistoryOpen(true);
  };

  const filteredArticles = articles.filter((article) => {
    const matchesCategory =
      selectedCategory === "all" || article.category_id === selectedCategory;
    const matchesType =
      selectedType === "all" || article.article_type === selectedType;
    const matchesSearch =
      searchQuery === "" ||
      article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      article.content.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesType && matchesSearch;
  });

  const featuredArticles = filteredArticles.filter((a) => a.is_featured);
  const regularArticles = filteredArticles.filter((a) => !a.is_featured);

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
          <h1 className="text-3xl font-bold tracking-tight">Knowledge Base</h1>
          <p className="text-muted-foreground mt-1">
            Company policies, procedures, and FAQs
          </p>
        </div>
        {isAdmin() && (
          <Button onClick={() => setIsCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Article
          </Button>
        )}
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search articles..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={selectedType} onValueChange={setSelectedType}>
          <SelectTrigger className="w-full sm:w-[150px]">
            <SelectValue placeholder="All Types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="article">
              <span className="flex items-center gap-2">
                <FileText className="h-3 w-3" /> Articles
              </span>
            </SelectItem>
            <SelectItem value="policy">
              <span className="flex items-center gap-2">
                <Shield className="h-3 w-3" /> Policies
              </span>
            </SelectItem>
          </SelectContent>
        </Select>
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat.id} value={cat.id}>
                {cat.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Categories Overview */}
      {selectedCategory === "all" && selectedType === "all" && searchQuery === "" && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {categories.map((category) => {
            const IconComponent = iconMap[category.icon || "FileText"] || FileText;
            const categoryArticles = articles.filter((a) => a.category_id === category.id);
            
            return (
              <Card
                key={category.id}
                className="cursor-pointer hover:shadow-md transition-all hover:-translate-y-1"
                onClick={() => setSelectedCategory(category.id)}
              >
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <IconComponent className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{category.name}</CardTitle>
                      <CardDescription>{categoryArticles.length} articles</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                {category.description && (
                  <CardContent>
                    <p className="text-sm text-muted-foreground">{category.description}</p>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Featured Articles */}
      {featuredArticles.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <Star className="h-5 w-5 text-amber-500" />
            Featured Articles
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            {featuredArticles.map((article) => (
              <ArticleCard
                key={article.id}
                article={article}
                onView={() => handleViewArticle(article)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Regular Articles */}
      {regularArticles.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3">
            {selectedCategory !== "all" ? categories.find((c) => c.id === selectedCategory)?.name : "All Articles"}
          </h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {regularArticles.map((article) => (
              <ArticleCard
                key={article.id}
                article={article}
                onView={() => handleViewArticle(article)}
              />
            ))}
          </div>
        </div>
      )}

      {filteredArticles.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <BookOpen className="h-12 w-12 mx-auto text-muted-foreground" />
            <h3 className="mt-4 text-lg font-semibold">No articles found</h3>
            <p className="text-muted-foreground">Try adjusting your search or filter</p>
          </CardContent>
        </Card>
      )}

      {/* Article Detail Dialog */}
      <Dialog open={!!selectedArticle} onOpenChange={() => setSelectedArticle(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          {selectedArticle && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  {selectedArticle.article_type === "policy" && (
                    <Badge variant="default" className="bg-blue-600">
                      <Shield className="h-3 w-3 mr-1" />
                      Policy
                    </Badge>
                  )}
                  {selectedArticle.is_featured && (
                    <Badge variant="default" className="bg-amber-500">
                      <Star className="h-3 w-3 mr-1" />
                      Featured
                    </Badge>
                  )}
                  {selectedArticle.category && (
                    <Badge variant="secondary">{selectedArticle.category.name}</Badge>
                  )}
                  <Badge variant="outline" className="font-mono">
                    v{selectedArticle.current_version}
                  </Badge>
                </div>
                <DialogTitle className="text-2xl">{selectedArticle.title}</DialogTitle>
                <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                  <span>
                    By {selectedArticle.author?.first_name} {selectedArticle.author?.last_name}
                  </span>
                  <span>•</span>
                  <span>
                    Updated{" "}
                    {format(new Date(selectedArticle.updated_at), "MMM d, yyyy")}
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Eye className="h-3 w-3" />
                    {selectedArticle.view_count} views
                  </span>
                </div>

                {/* Action buttons for admins */}
                {isAdmin() && (
                  <div className="flex items-center gap-2 mt-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditClick(selectedArticle)}
                    >
                      <Edit className="h-3 w-3 mr-1" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleHistoryClick(selectedArticle)}
                    >
                      <History className="h-3 w-3 mr-1" />
                      Version History
                    </Button>
                  </div>
                )}
              </DialogHeader>
              <div className="prose prose-sm max-w-none mt-4">
                <p className="whitespace-pre-wrap">{selectedArticle.content}</p>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Create Article Dialog */}
      <ArticleFormDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        categories={categories}
        onSubmit={handleCreateArticle}
      />

      {/* Edit Article Dialog */}
      {editingArticle && (
        <ArticleFormDialog
          open={isEditOpen}
          onOpenChange={setIsEditOpen}
          categories={categories}
          isEditing
          initialData={{
            title: editingArticle.title,
            content: editingArticle.content,
            category_id: editingArticle.category_id || "",
            article_type: editingArticle.article_type,
            is_featured: editingArticle.is_featured,
          }}
          onSubmit={handleEditArticle}
        />
      )}

      {/* Version History Dialog */}
      {editingArticle && (
        <VersionHistoryDialog
          open={isHistoryOpen}
          onOpenChange={setIsHistoryOpen}
          articleId={editingArticle.id}
          articleTitle={editingArticle.title}
          currentVersion={editingArticle.current_version}
          isAdmin={isAdmin()}
          onRestore={() => {
            fetchData();
            setSelectedArticle(null);
          }}
        />
      )}
    </div>
  );
}

function ArticleCard({
  article,
  onView,
}: {
  article: WikiArticle;
  onView: () => void;
}) {
  return (
    <Card 
      className="cursor-pointer hover:shadow-md transition-all hover:-translate-y-1" 
      onClick={onView}
    >
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{article.title}</CardTitle>
          <div className="flex items-center gap-1">
            {article.article_type === "policy" && (
              <Shield className="h-4 w-4 text-blue-600" />
            )}
            {article.is_featured && <Star className="h-4 w-4 text-amber-500" />}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {article.category && (
            <Badge variant="secondary" className="w-fit">
              {article.category.name}
            </Badge>
          )}
          <Badge variant="outline" className="font-mono text-xs">
            v{article.current_version}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground line-clamp-2">{article.content}</p>
        <div className="flex items-center justify-between mt-4 text-xs text-muted-foreground">
          <span>
            {formatDistanceToNow(new Date(article.updated_at), { addSuffix: true })}
          </span>
          <span className="flex items-center gap-1">
            <Eye className="h-3 w-3" />
            {article.view_count}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
