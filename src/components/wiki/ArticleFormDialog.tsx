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
import { FileText, Star, Building2, LayoutTemplate, Paperclip, X, Upload } from "lucide-react";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { TemplateSelector, WikiTemplate } from "./TemplateSelector";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Department } from "@/types/database";

interface WikiCategory {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  position: number;
}

export interface ArticleFormData {
  title: string;
  content: string;
  category_id: string;
  article_type: "article" | "policy";
  is_featured: boolean;
  change_summary?: string;
  department_id?: string | null;
  attachments?: { name: string; url: string; type: string; size: number }[];
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
  const [isFeatured, setIsFeatured] = useState(false);
  const [changeSummary, setChangeSummary] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isTemplateOpen, setIsTemplateOpen] = useState(false);
  const [attachments, setAttachments] = useState<{ name: string; url: string; type: string; size: number }[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    if (open) {
      if (initialData) {
        setTitle(initialData.title || "");
        // Use a small delay to ensure editor is mounted before setting content
        const contentToSet = initialData.content || "";
        setContent("");
        setTimeout(() => setContent(contentToSet), 50);
        setCategoryId(initialData.category_id || "");
        setDepartmentId(initialData.department_id || "all");
        setIsFeatured(initialData.is_featured || false);
        setChangeSummary("");
        setAttachments(initialData.attachments || []);
      } else {
        setTitle("");
        setContent("");
        setCategoryId("");
        setDepartmentId("all");
        setIsFeatured(false);
        setChangeSummary("");
        setAttachments([]);
      }
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
        article_type: "article",
        is_featured: isFeatured,
        change_summary: changeSummary || undefined,
        department_id: departmentId === "all" ? null : departmentId,
        attachments,
      });
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSelectTemplate = (template: WikiTemplate) => {
    setContent(template.content);
    if (template.category_id) {
      setCategoryId(template.category_id);
    }
    setIsTemplateOpen(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    try {
      for (const file of Array.from(files)) {
        const fileExt = file.name.split(".").pop();
        const filePath = `wiki-attachments/${Date.now()}-${file.name}`;

        const { error: uploadError } = await supabase.storage
          .from("documents")
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from("documents")
          .getPublicUrl(filePath);

        setAttachments(prev => [...prev, {
          name: file.name,
          url: urlData.publicUrl,
          type: file.type,
          size: file.size,
        }]);
      }
      toast.success("File(s) attached!");
    } catch (error: any) {
      toast.error(error.message || "Failed to upload file");
    } finally {
      setIsUploading(false);
      e.target.value = "";
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
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

            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter article title..."
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
                placeholder="Write your article content here..."
              />
            </div>

            {/* Attachments */}
            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                <Paperclip className="h-3 w-3" />
                Attachments
              </Label>
              <div className="border border-input rounded-md p-3 space-y-2">
                {attachments.length > 0 && (
                  <div className="space-y-1">
                    {attachments.map((file, index) => (
                      <div key={index} className="flex items-center justify-between bg-muted/50 rounded px-3 py-2 text-sm">
                        <div className="flex items-center gap-2 min-w-0">
                          <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                          <span className="truncate">{file.name}</span>
                          <span className="text-xs text-muted-foreground shrink-0">({formatFileSize(file.size)})</span>
                        </div>
                        <Button type="button" variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => removeAttachment(index)}>
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
                <label className="flex items-center gap-2 cursor-pointer text-sm text-muted-foreground hover:text-foreground transition-colors">
                  <Upload className="h-4 w-4" />
                  {isUploading ? "Uploading..." : "Add documents or images"}
                  <input
                    type="file"
                    multiple
                    accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv"
                    className="hidden"
                    onChange={handleFileUpload}
                    disabled={isUploading}
                  />
                </label>
              </div>
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
