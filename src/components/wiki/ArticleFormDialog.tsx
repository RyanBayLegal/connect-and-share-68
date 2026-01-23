import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FileText, Shield, Star, Building2, LayoutTemplate } from "lucide-react";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { TemplateSelector, WikiTemplate } from "./TemplateSelector";
import type { Department } from "@/types/database";

interface WikiCategory {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  position: number;
}

interface ArticleFormData {
  title: string;
  content: string;
  category_id: string;
  article_type: "article" | "policy";
  is_featured: boolean;
  change_summary?: string;
  department_id?: string | null;
}

interface ArticleFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: WikiCategory[];
  departments?: Department[];
  templates?: WikiTemplate[];
  initialData?: Partial<ArticleFormData>;
  isEditing?: boolean;
  onSubmit: (data: ArticleFormData) => Promise<void>;
}

export function ArticleFormDialog({
  open,
  onOpenChange,
  categories,
  departments = [],
  templates = [],
  initialData,
  isEditing = false,
  onSubmit,
}: ArticleFormDialogProps) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [departmentId, setDepartmentId] = useState<string>("all");
  const [articleType, setArticleType] = useState<"article" | "policy">("article");
  const [isFeatured, setIsFeatured] = useState(false);
  const [changeSummary, setChangeSummary] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isTemplateOpen, setIsTemplateOpen] = useState(false);

  useEffect(() => {
    if (open && initialData) {
      setTitle(initialData.title || "");
      setContent(initialData.content || "");
      setCategoryId(initialData.category_id || "");
      setDepartmentId(initialData.department_id || "all");
      setArticleType(initialData.article_type || "article");
      setIsFeatured(initialData.is_featured || false);
      setChangeSummary("");
    } else if (!open) {
      // Reset form when closing
      setTitle("");
      setContent("");
      setCategoryId("");
      setDepartmentId("all");
      setArticleType("article");
      setIsFeatured(false);
      setChangeSummary("");
    }
  }, [open, initialData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await onSubmit({
        title,
        content,
        category_id: categoryId,
        article_type: articleType,
        is_featured: isFeatured,
        change_summary: changeSummary || undefined,
        department_id: departmentId === "all" ? null : departmentId,
      });
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSelectTemplate = (template: WikiTemplate) => {
    setContent(template.content);
    setArticleType(template.article_type);
    if (template.category_id) {
      setCategoryId(template.category_id);
    }
    setIsTemplateOpen(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {isEditing ? "Edit Article" : "Create New Article"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Template Button (only for new articles) */}
            {!isEditing && templates.length > 0 && (
              <div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsTemplateOpen(true)}
                  className="w-full justify-start"
                >
                  <LayoutTemplate className="h-4 w-4 mr-2" />
                  Start from Template
                </Button>
              </div>
            )}

            {/* Article Type Selector */}
            <div className="space-y-2">
              <Label>Type</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={articleType === "article" ? "default" : "outline"}
                  className="flex-1"
                  onClick={() => setArticleType("article")}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Article
                </Button>
                <Button
                  type="button"
                  variant={articleType === "policy" ? "default" : "outline"}
                  className="flex-1"
                  onClick={() => setArticleType("policy")}
                >
                  <Shield className="h-4 w-4 mr-2" />
                  Policy
                </Button>
              </div>
            </div>

            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={articleType === "policy" ? "Enter policy title..." : "Enter article title..."}
                required
              />
            </div>

            {/* Category, Department and Featured */}
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={categoryId} onValueChange={setCategoryId}>
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
              <div className="space-y-2">
                <Label className="flex items-center gap-1">
                  <Building2 className="h-3 w-3" />
                  Department
                </Label>
                <Select value={departmentId} onValueChange={setDepartmentId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Company-wide</SelectItem>
                    {departments.map((dept) => (
                      <SelectItem key={dept.id} value={dept.id}>
                        {dept.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Featured</Label>
                <div className="flex items-center gap-2 h-10">
                  <Switch
                    checked={isFeatured}
                    onCheckedChange={setIsFeatured}
                  />
                  <Star className={`h-4 w-4 ${isFeatured ? "text-amber-500" : "text-muted-foreground"}`} />
                  <span className="text-sm text-muted-foreground">
                    {isFeatured ? "Yes" : "No"}
                  </span>
                </div>
              </div>
            </div>

            {/* Content - Rich Text Editor */}
            <div className="space-y-2">
              <Label>Content</Label>
              <RichTextEditor
                value={content}
                onChange={setContent}
                placeholder={articleType === "policy" 
                  ? "Write your policy content here. Include scope, guidelines, and procedures..."
                  : "Write your article content here..."
                }
              />
            </div>

            {/* Change Summary (only for editing) */}
            {isEditing && (
              <div className="space-y-2">
                <Label htmlFor="changeSummary">Change Summary (optional)</Label>
                <Input
                  id="changeSummary"
                  value={changeSummary}
                  onChange={(e) => setChangeSummary(e.target.value)}
                  placeholder="Briefly describe what changed..."
                />
                <p className="text-xs text-muted-foreground">
                  This helps track changes in version history
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting || !title || !content}>
                {isSubmitting
                  ? isEditing
                    ? "Saving..."
                    : "Publishing..."
                  : isEditing
                  ? "Save Changes"
                  : "Publish"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Template Selector Dialog */}
      <TemplateSelector
        open={isTemplateOpen}
        onOpenChange={setIsTemplateOpen}
        templates={templates}
        onSelectTemplate={handleSelectTemplate}
      />
    </>
  );
}
