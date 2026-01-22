import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import type { Profile } from "@/types/database";

interface WikiCategory {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  position: number;
}

interface WikiArticle {
  id: string;
  title: string;
  content: string;
  category_id: string | null;
  author_id: string | null;
  is_published: boolean;
  is_featured: boolean;
  view_count: number;
  created_at: string;
  updated_at: string;
  category?: WikiCategory;
  author?: Profile;
}

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
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedArticle, setSelectedArticle] = useState<WikiArticle | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Create article dialog
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [isFeatured, setIsFeatured] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const handleCreateArticle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from("wiki_articles").insert({
        title: newTitle,
        content: newContent,
        category_id: newCategory || null,
        author_id: profile.id,
        is_published: true,
        is_featured: isFeatured,
      });

      if (error) throw error;

      toast.success("Article published!");
      setIsCreateOpen(false);
      setNewTitle("");
      setNewContent("");
      setNewCategory("");
      setIsFeatured(false);
      fetchData();
    } catch (error: any) {
      toast.error(error.message || "Failed to create article");
    } finally {
      setIsSubmitting(false);
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

  const filteredArticles = articles.filter((article) => {
    const matchesCategory =
      selectedCategory === "all" || article.category_id === selectedCategory;
    const matchesSearch =
      searchQuery === "" ||
      article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      article.content.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
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
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New Article
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create Article</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreateArticle} className="space-y-4">
                <div className="space-y-2">
                  <Label>Title</Label>
                  <Input
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Category</Label>
                    <Select value={newCategory} onValueChange={setNewCategory}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id}>
                            {cat.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2 flex items-end">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isFeatured}
                        onChange={(e) => setIsFeatured(e.target.checked)}
                      />
                      <Star className="h-4 w-4 text-amber-500" />
                      Featured article
                    </label>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Content</Label>
                  <Textarea
                    value={newContent}
                    onChange={(e) => setNewContent(e.target.value)}
                    rows={10}
                    required
                    placeholder="Write your article content here..."
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? "Publishing..." : "Publish"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
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
      {selectedCategory === "all" && searchQuery === "" && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {categories.map((category) => {
            const IconComponent = iconMap[category.icon || "FileText"] || FileText;
            const categoryArticles = articles.filter((a) => a.category_id === category.id);
            
            return (
              <Card
                key={category.id}
                className="cursor-pointer hover:shadow-md transition-shadow"
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
                <div className="flex items-center gap-2 mb-2">
                  {selectedArticle.is_featured && (
                    <Badge variant="default" className="bg-amber-500">
                      <Star className="h-3 w-3 mr-1" />
                      Featured
                    </Badge>
                  )}
                  {selectedArticle.category && (
                    <Badge variant="secondary">{selectedArticle.category.name}</Badge>
                  )}
                </div>
                <DialogTitle className="text-2xl">{selectedArticle.title}</DialogTitle>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span>
                    By {selectedArticle.author?.first_name} {selectedArticle.author?.last_name}
                  </span>
                  <span>•</span>
                  <span>
                    Updated{" "}
                    {formatDistanceToNow(new Date(selectedArticle.updated_at), {
                      addSuffix: true,
                    })}
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Eye className="h-3 w-3" />
                    {selectedArticle.view_count} views
                  </span>
                </div>
              </DialogHeader>
              <div className="prose prose-sm max-w-none mt-4">
                <p className="whitespace-pre-wrap">{selectedArticle.content}</p>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
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
    <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={onView}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{article.title}</CardTitle>
          {article.is_featured && <Star className="h-4 w-4 text-amber-500" />}
        </div>
        {article.category && (
          <Badge variant="secondary" className="w-fit">
            {article.category.name}
          </Badge>
        )}
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
