import { useEffect, useState, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
  Star,
  History,
  Edit,
  Building2,
  Download,
  Info,
  Settings2,
  Paperclip,
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { toast } from "sonner";
import { ArticleFormDialog } from "@/components/wiki/ArticleFormDialog";
import { CategoryManageDialog } from "@/components/wiki/CategoryManageDialog";
import { VersionHistoryDialog } from "@/components/wiki/VersionHistoryDialog";
import { TemplateSelector, WikiTemplate } from "@/components/wiki/TemplateSelector";
import { highlightText, stripHtml } from "@/lib/highlightText";
import type { WikiArticle, WikiCategory, Profile, Department } from "@/types/database";

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  FileText,
};

export default function Wiki() {
  const { isAdmin, isSuperAdmin, profile } = useAuth();
  const [categories, setCategories] = useState<WikiCategory[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [articles, setArticles] = useState<WikiArticle[]>([]);
  const [templates, setTemplates] = useState<WikiTemplate[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedDepartment, setSelectedDepartment] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedArticle, setSelectedArticle] = useState<WikiArticle | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const articleContentRef = useRef<HTMLDivElement>(null);

  // Dialogs
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isCategoryManageOpen, setIsCategoryManageOpen] = useState(false);
  const [editingArticle, setEditingArticle] = useState<WikiArticle | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [{ data: catsData }, { data: articlesData }, { data: deptsData }, { data: templatesData }] = await Promise.all([
        supabase.from("wiki_categories").select("*").order("position"),
        supabase
          .from("wiki_articles")
          .select("*, category:wiki_categories(*), author:profiles(*)")
          .eq("is_published", true)
          .order("is_featured", { ascending: false })
          .order("updated_at", { ascending: false }),
        supabase.from("departments").select("*").order("name"),
        supabase.from("wiki_templates").select("*").eq("is_active", true).order("name"),
      ]);

      setCategories((catsData as unknown as WikiCategory[]) || []);
      setArticles((articlesData as unknown as WikiArticle[]) || []);
      setDepartments((deptsData as Department[]) || []);
      setTemplates((templatesData as unknown as WikiTemplate[]) || []);
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
    department_id?: string | null;
    attachments?: { name: string; url: string; type: string; size: number }[];
  }) => {
    if (!profile) return;

    try {
      const { error } = await supabase.from("wiki_articles").insert({
        title: data.title,
        content: data.content,
        category_id: data.category_id || null,
        department_id: data.department_id || null,
        author_id: profile.id,
        is_published: true,
        is_featured: data.is_featured,
        article_type: "article",
        current_version: 1,
        last_edited_by: profile.id,
        attachments: data.attachments || [],
      });

      if (error) throw error;

      toast.success("Article published!");
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
    department_id?: string | null;
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
          department_id: data.department_id,
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

  const handleExportPdf = async () => {
    if (!selectedArticle) return;

    try {
      // Dynamic import of html2pdf
      const html2pdf = (await import("html2pdf.js")).default;

      // Create a container for the PDF content
      const container = document.createElement("div");
      container.style.padding = "40px";
      container.style.fontFamily = "Arial, sans-serif";
      container.style.maxWidth = "800px";

      // Add title
      const title = document.createElement("h1");
      title.textContent = selectedArticle.title;
      title.style.fontSize = "24px";
      title.style.marginBottom = "10px";
      title.style.color = "#1a1a1a";
      container.appendChild(title);

      // Add metadata
      const meta = document.createElement("div");
      meta.style.color = "#666";
      meta.style.fontSize = "12px";
      meta.style.marginBottom = "20px";
      meta.style.paddingBottom = "10px";
      meta.style.borderBottom = "1px solid #eee";
      meta.innerHTML = `
        <p>Author: ${selectedArticle.author?.first_name || ""} ${selectedArticle.author?.last_name || ""}</p>
        <p>Last Updated: ${format(new Date(selectedArticle.updated_at), "MMMM d, yyyy")}</p>
        <p>Version: ${selectedArticle.current_version}</p>
        ${selectedArticle.article_type === "policy" ? "<p><strong>POLICY DOCUMENT</strong></p>" : ""}
      `;
      container.appendChild(meta);

      // Add content
      const content = document.createElement("div");
      content.innerHTML = selectedArticle.content;
      content.style.lineHeight = "1.6";
      content.style.color = "#333";
      container.appendChild(content);

      // Generate PDF
      const opt = {
        margin: 10,
        filename: `${selectedArticle.title.replace(/[^a-z0-9]/gi, "_")}.pdf`,
        image: { type: "jpeg" as const, quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: "mm" as const, format: "a4" as const, orientation: "portrait" as const },
      };

      await html2pdf().set(opt).from(container).save();
      toast.success("PDF downloaded!");
    } catch (error) {
      console.error("PDF export error:", error);
      toast.error("Failed to export PDF");
    }
  };

  const filteredArticles = articles.filter((article) => {
    const matchesCategory =
      selectedCategory === "all" || article.category_id === selectedCategory;
    const matchesDepartment =
      selectedDepartment === "all" || 
      (selectedDepartment === "company" && !article.department_id) ||
      article.department_id === selectedDepartment;
    const matchesSearch =
      searchQuery === "" ||
      article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      article.content.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesDepartment && matchesSearch;
  });

  const featuredArticles = filteredArticles.filter((a) => a.is_featured);
  const regularArticles = filteredArticles.filter((a) => !a.is_featured);

  // Get department name by id
  const getDepartmentName = (departmentId: string | null) => {
    if (!departmentId) return null;
    return departments.find(d => d.id === departmentId)?.name;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Libraries</h1>
          <p className="text-muted-foreground mt-2">
            Articles, resources, and documentation
          </p>
        </div>
        <div className="flex items-center gap-3">
          {isSuperAdmin() && (
            <Button variant="outline" size="lg" onClick={() => setIsCategoryManageOpen(true)}>
              <Settings2 className="h-4 w-4 mr-2" />
              Categories
            </Button>
          )}
          {isAdmin() && (
            <Button size="lg" onClick={() => setIsCreateOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              New Article
            </Button>
          )}
        </div>
      </div>

      {/* Non-admin info message */}
      {!isAdmin() && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Only administrators can create and edit articles. 
            If you have suggestions for new content, please contact your department manager.
          </AlertDescription>
        </Alert>
      )}

      {/* Search and Filters */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search articles..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-11"
            />
          </div>
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-full sm:w-[200px] h-11">
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
          <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
            <SelectTrigger className="w-full sm:w-[200px] h-11">
              <SelectValue placeholder="All Departments" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Departments</SelectItem>
              <SelectItem value="company">Company-wide</SelectItem>
              {departments.map((dept) => (
                <SelectItem key={dept.id} value={dept.id}>
                  {dept.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Categories Overview */}
      {selectedCategory === "all" && selectedDepartment === "all" && searchQuery === "" && (
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
                departmentName={getDepartmentName(article.department_id)}
                searchQuery={searchQuery}
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
                departmentName={getDepartmentName(article.department_id)}
                searchQuery={searchQuery}
                onView={() => handleViewArticle(article)}
              />
            ))}
          </div>
        </div>
      )}

      {filteredArticles.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="py-16 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
              <BookOpen className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold">No articles found</h3>
            <p className="text-muted-foreground mt-1">Try adjusting your search or filter, or create a new article</p>
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
                  {selectedArticle.is_featured && (
                    <Badge variant="default" className="bg-amber-500">
                      <Star className="h-3 w-3 mr-1" />
                      Featured
                    </Badge>
                  )}
                  {selectedArticle.category && (
                    <Badge variant="secondary">{selectedArticle.category.name}</Badge>
                  )}
                  {selectedArticle.department_id && (
                    <Badge variant="outline" className="flex items-center gap-1">
                      <Building2 className="h-3 w-3" />
                      {getDepartmentName(selectedArticle.department_id)}
                    </Badge>
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

                {/* Action buttons */}
                <div className="flex items-center gap-2 mt-4 flex-wrap">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleExportPdf}
                  >
                    <Download className="h-3 w-3 mr-1" />
                    Export PDF
                  </Button>
                  {isAdmin() && (
                    <>
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
                    </>
                  )}
                </div>
              </DialogHeader>
              <div ref={articleContentRef} className="prose prose-sm dark:prose-invert max-w-none mt-4">
                {/* Render HTML content safely */}
                <div dangerouslySetInnerHTML={{ __html: selectedArticle.content }} />
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
        departments={departments}
        templates={templates}
        onSubmit={handleCreateArticle}
      />

      {/* Edit Article Dialog */}
      {editingArticle && (
        <ArticleFormDialog
          open={isEditOpen}
          onOpenChange={setIsEditOpen}
          categories={categories}
          departments={departments}
          templates={templates}
          isEditing
          initialData={{
            title: editingArticle.title,
            content: editingArticle.content,
            category_id: editingArticle.category_id || "",
            department_id: editingArticle.department_id,
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

      {/* Category Management Dialog */}
      <CategoryManageDialog
        open={isCategoryManageOpen}
        onOpenChange={setIsCategoryManageOpen}
        categories={categories}
        onCategoriesChanged={fetchData}
      />
    </div>
  );
}

function ArticleCard({
  article,
  departmentName,
  searchQuery,
  onView,
}: {
  article: WikiArticle;
  departmentName?: string | null;
  searchQuery?: string;
  onView: () => void;
}) {
  // Strip HTML tags for preview
  const plainTextContent = stripHtml(article.content);
  
  return (
    <Card 
      className="cursor-pointer hover:shadow-md transition-all hover:-translate-y-1" 
      onClick={onView}
    >
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">
            {searchQuery ? highlightText(article.title, searchQuery) : article.title}
          </CardTitle>
          <div className="flex items-center gap-1">
            {article.is_featured && <Star className="h-4 w-4 text-amber-500" />}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {article.category && (
            <Badge variant="secondary" className="w-fit">
              {article.category.name}
            </Badge>
          )}
          {departmentName && (
            <Badge variant="outline" className="w-fit text-xs flex items-center gap-1">
              <Building2 className="h-3 w-3" />
              {departmentName}
            </Badge>
          )}
          <Badge variant="outline" className="font-mono text-xs">
            v{article.current_version}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground line-clamp-2">
          {searchQuery ? highlightText(plainTextContent.slice(0, 150), searchQuery) : plainTextContent.slice(0, 150)}
          {plainTextContent.length > 150 && "..."}
        </p>
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
