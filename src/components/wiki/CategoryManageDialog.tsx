import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus, Trash2, GripVertical } from "lucide-react";
import { toast } from "sonner";

interface WikiCategory {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  position: number;
}

interface CategoryManageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: WikiCategory[];
  onCategoriesChanged: () => void;
}

export function CategoryManageDialog({
  open,
  onOpenChange,
  categories,
  onCategoriesChanged,
}: CategoryManageDialogProps) {
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleAdd = async () => {
    if (!newName.trim()) return;
    setIsAdding(true);
    try {
      const { error } = await supabase.from("wiki_categories").insert({
        name: newName.trim(),
        description: newDescription.trim() || null,
        icon: "FileText",
        position: categories.length,
      });
      if (error) throw error;
      toast.success("Category added!");
      setNewName("");
      setNewDescription("");
      onCategoriesChanged();
    } catch (error: any) {
      toast.error(error.message || "Failed to add category");
    } finally {
      setIsAdding(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      const { error } = await supabase.from("wiki_categories").delete().eq("id", id);
      if (error) throw error;
      toast.success("Category deleted!");
      onCategoriesChanged();
    } catch (error: any) {
      toast.error(error.message || "Failed to delete category. It may have articles assigned.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Manage Categories</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Existing categories */}
          <div className="space-y-2">
            <Label>Existing Categories</Label>
            {categories.length === 0 ? (
              <p className="text-sm text-muted-foreground">No categories yet.</p>
            ) : (
              <div className="space-y-1">
                {categories.map((cat) => (
                  <div key={cat.id} className="flex items-center justify-between bg-muted/50 rounded px-3 py-2">
                    <div>
                      <p className="text-sm font-medium">{cat.name}</p>
                      {cat.description && (
                        <p className="text-xs text-muted-foreground">{cat.description}</p>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:text-destructive"
                      onClick={() => handleDelete(cat.id)}
                      disabled={deletingId === cat.id}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Add new category */}
          <div className="border-t pt-4 space-y-3">
            <Label>Add New Category</Label>
            <Input
              placeholder="Category name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
            />
            <Input
              placeholder="Description (optional)"
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
            />
            <Button onClick={handleAdd} disabled={isAdding || !newName.trim()} className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              {isAdding ? "Adding..." : "Add Category"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
