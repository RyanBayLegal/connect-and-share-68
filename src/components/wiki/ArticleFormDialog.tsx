import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { FileText, Shield, Star } from "lucide-react";

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
}

interface ArticleFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: WikiCategory[];
  initialData?: Partial<ArticleFormData>;
  isEditing?: boolean;
  onSubmit: (data: ArticleFormData) => Promise<void>;
}

export function ArticleFormDialog({
  open,
  onOpenChange,
  categories,
  initialData,
  isEditing = false,
  onSubmit,
}: ArticleFormDialogProps) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [articleType, setArticleType] = useState<"article" | "policy">("article");
  const [isFeatured, setIsFeatured] = useState(false);
  const [changeSummary, setChangeSummary] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (open && initialData) {
      setTitle(initialData.title || "");
      setContent(initialData.content || "");
      setCategoryId(initialData.category_id || "");
      setArticleType(initialData.article_type || "article");
      setIsFeatured(initialData.is_featured || false);
      setChangeSummary("");
    } else if (!open) {
      // Reset form when closing
      setTitle("");
      setContent("");
      setCategoryId("");
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
      });
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit Article" : "Create New Article"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
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

          {/* Category and Featured */}
          <div className="grid grid-cols-2 gap-4">
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
              <Label>Featured</Label>
              <div className="flex items-center gap-2 h-10">
                <Switch
                  checked={isFeatured}
                  onCheckedChange={setIsFeatured}
                />
                <Star className={`h-4 w-4 ${isFeatured ? "text-amber-500" : "text-muted-foreground"}`} />
                <span className="text-sm text-muted-foreground">
                  {isFeatured ? "Featured" : "Not featured"}
                </span>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="space-y-2">
            <Label htmlFor="content">Content</Label>
            <Textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={12}
              required
              placeholder={articleType === "policy" 
                ? "Write your policy content here. Include scope, guidelines, and procedures..."
                : "Write your article content here..."
              }
              className="font-mono text-sm"
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
            <Button type="submit" disabled={isSubmitting}>
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
  );
}
