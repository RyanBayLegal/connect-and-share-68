import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil, Trash2, ListChecks, ChevronDown, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import type { Department } from "@/types/database";

interface OnboardingTemplate {
  id: string;
  name: string;
  description: string | null;
  department_id: string | null;
  is_default: boolean;
  created_at: string;
}

interface OnboardingItem {
  id: string;
  template_id: string;
  title: string;
  description: string | null;
  category: string;
  position: number;
}

const CATEGORIES = [
  { value: "general", label: "General" },
  { value: "it_setup", label: "IT Setup" },
  { value: "hr_paperwork", label: "HR Paperwork" },
  { value: "training", label: "Training" },
  { value: "team_intro", label: "Team Introduction" },
];

export function AdminOnboarding() {
  const { profile } = useAuth();
  const [templates, setTemplates] = useState<OnboardingTemplate[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Template dialog state
  const [isTemplateOpen, setIsTemplateOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<OnboardingTemplate | null>(null);
  const [templateName, setTemplateName] = useState("");
  const [templateDescription, setTemplateDescription] = useState("");
  const [templateDeptId, setTemplateDeptId] = useState<string | null>(null);
  const [templateIsDefault, setTemplateIsDefault] = useState(false);
  
  // Items state
  const [expandedTemplateId, setExpandedTemplateId] = useState<string | null>(null);
  const [templateItems, setTemplateItems] = useState<Record<string, OnboardingItem[]>>({});
  
  // Item dialog state
  const [isItemOpen, setIsItemOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<OnboardingItem | null>(null);
  const [currentTemplateId, setCurrentTemplateId] = useState<string | null>(null);
  const [itemTitle, setItemTitle] = useState("");
  const [itemDescription, setItemDescription] = useState("");
  const [itemCategory, setItemCategory] = useState("general");
  
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const [{ data: templatesData }, { data: deptData }] = await Promise.all([
      supabase.from("onboarding_templates").select("*").order("name"),
      supabase.from("departments").select("*").order("name"),
    ]);
    
    setTemplates((templatesData || []) as OnboardingTemplate[]);
    setDepartments((deptData || []) as Department[]);
    setIsLoading(false);
  };

  const fetchTemplateItems = async (templateId: string) => {
    const { data } = await supabase
      .from("onboarding_template_items")
      .select("*")
      .eq("template_id", templateId)
      .order("position");
    
    setTemplateItems((prev) => ({
      ...prev,
      [templateId]: (data || []) as OnboardingItem[],
    }));
  };

  const toggleExpand = (templateId: string) => {
    if (expandedTemplateId === templateId) {
      setExpandedTemplateId(null);
    } else {
      setExpandedTemplateId(templateId);
      if (!templateItems[templateId]) {
        fetchTemplateItems(templateId);
      }
    }
  };

  const handleTemplateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const payload = {
        name: templateName,
        description: templateDescription || null,
        department_id: templateDeptId,
        is_default: templateIsDefault,
        created_by: profile?.id,
      };

      if (editingTemplate) {
        const { error } = await supabase
          .from("onboarding_templates")
          .update(payload)
          .eq("id", editingTemplate.id);
        if (error) throw error;
        toast.success("Template updated!");
      } else {
        const { error } = await supabase
          .from("onboarding_templates")
          .insert(payload);
        if (error) throw error;
        toast.success("Template created!");
      }
      
      setIsTemplateOpen(false);
      resetTemplateForm();
      fetchData();
    } catch (error: any) {
      toast.error(error.message || "Failed to save template");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleItemSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentTemplateId) return;
    setIsSubmitting(true);

    try {
      const items = templateItems[currentTemplateId] || [];
      const payload = {
        template_id: currentTemplateId,
        title: itemTitle,
        description: itemDescription || null,
        category: itemCategory,
        position: editingItem ? editingItem.position : items.length,
      };

      if (editingItem) {
        const { error } = await supabase
          .from("onboarding_template_items")
          .update(payload)
          .eq("id", editingItem.id);
        if (error) throw error;
        toast.success("Item updated!");
      } else {
        const { error } = await supabase
          .from("onboarding_template_items")
          .insert(payload);
        if (error) throw error;
        toast.success("Item added!");
      }
      
      setIsItemOpen(false);
      resetItemForm();
      fetchTemplateItems(currentTemplateId);
    } catch (error: any) {
      toast.error(error.message || "Failed to save item");
    } finally {
      setIsSubmitting(false);
    }
  };

  const deleteItem = async (item: OnboardingItem) => {
    if (!confirm("Delete this checklist item?")) return;
    
    const { error } = await supabase
      .from("onboarding_template_items")
      .delete()
      .eq("id", item.id);
    
    if (error) {
      toast.error("Failed to delete item");
    } else {
      toast.success("Item deleted");
      fetchTemplateItems(item.template_id);
    }
  };

  const deleteTemplate = async (template: OnboardingTemplate) => {
    if (!confirm("Delete this template and all its items?")) return;
    
    const { error } = await supabase
      .from("onboarding_templates")
      .delete()
      .eq("id", template.id);
    
    if (error) {
      toast.error("Failed to delete template");
    } else {
      toast.success("Template deleted");
      fetchData();
    }
  };

  const resetTemplateForm = () => {
    setTemplateName("");
    setTemplateDescription("");
    setTemplateDeptId(null);
    setTemplateIsDefault(false);
    setEditingTemplate(null);
  };

  const resetItemForm = () => {
    setItemTitle("");
    setItemDescription("");
    setItemCategory("general");
    setEditingItem(null);
    setCurrentTemplateId(null);
  };

  const openEditTemplate = (template: OnboardingTemplate) => {
    setEditingTemplate(template);
    setTemplateName(template.name);
    setTemplateDescription(template.description || "");
    setTemplateDeptId(template.department_id);
    setTemplateIsDefault(template.is_default);
    setIsTemplateOpen(true);
  };

  const openAddItem = (templateId: string) => {
    setCurrentTemplateId(templateId);
    setIsItemOpen(true);
  };

  const openEditItem = (item: OnboardingItem) => {
    setEditingItem(item);
    setCurrentTemplateId(item.template_id);
    setItemTitle(item.title);
    setItemDescription(item.description || "");
    setItemCategory(item.category);
    setIsItemOpen(true);
  };

  const getDeptName = (deptId: string | null) => {
    if (!deptId) return "All Departments";
    const dept = departments.find((d) => d.id === deptId);
    return dept?.name || "Unknown";
  };

  if (isLoading) {
    return (
      <div className="flex justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Onboarding Templates</CardTitle>
            <CardDescription>Create reusable checklists for new employee onboarding</CardDescription>
          </div>
          <Dialog
            open={isTemplateOpen}
            onOpenChange={(open) => {
              setIsTemplateOpen(open);
              if (!open) resetTemplateForm();
            }}
          >
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New Template
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingTemplate ? "Edit" : "Create"} Template</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleTemplateSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                    placeholder="e.g., Standard Onboarding"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    value={templateDescription}
                    onChange={(e) => setTemplateDescription(e.target.value)}
                    placeholder="Brief description of this template"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Department (optional)</Label>
                  <Select
                    value={templateDeptId || "all"}
                    onValueChange={(v) => setTemplateDeptId(v === "all" ? null : v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All Departments" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Departments</SelectItem>
                      {departments.map((dept) => (
                        <SelectItem key={dept.id} value={dept.id}>
                          {dept.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsTemplateOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? "Saving..." : "Save"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {templates.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <ListChecks className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No onboarding templates yet</p>
              <p className="text-sm">Create a template to get started</p>
            </div>
          ) : (
            <div className="space-y-2">
              {templates.map((template) => (
                <div key={template.id} className="border rounded-lg">
                  <div
                    className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50"
                    onClick={() => toggleExpand(template.id)}
                  >
                    <div className="flex items-center gap-3">
                      {expandedTemplateId === template.id ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                      <div>
                        <div className="font-medium">{template.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {template.description || "No description"}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{getDeptName(template.department_id)}</Badge>
                      <Badge variant="secondary">
                        {templateItems[template.id]?.length || 0} items
                      </Badge>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          openEditTemplate(template);
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteTemplate(template);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  
                  {expandedTemplateId === template.id && (
                    <div className="border-t px-4 py-3 bg-muted/30">
                      <div className="flex justify-between items-center mb-3">
                        <span className="text-sm font-medium">Checklist Items</span>
                        <Button size="sm" variant="outline" onClick={() => openAddItem(template.id)}>
                          <Plus className="h-3 w-3 mr-1" />
                          Add Item
                        </Button>
                      </div>
                      
                      {(templateItems[template.id] || []).length === 0 ? (
                        <p className="text-sm text-muted-foreground py-4 text-center">
                          No items yet. Add checklist items to this template.
                        </p>
                      ) : (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-8">#</TableHead>
                              <TableHead>Title</TableHead>
                              <TableHead>Category</TableHead>
                              <TableHead className="w-20">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {templateItems[template.id]?.map((item, idx) => (
                              <TableRow key={item.id}>
                                <TableCell className="text-muted-foreground">{idx + 1}</TableCell>
                                <TableCell>
                                  <div className="font-medium">{item.title}</div>
                                  {item.description && (
                                    <div className="text-xs text-muted-foreground">{item.description}</div>
                                  )}
                                </TableCell>
                                <TableCell>
                                  <Badge variant="outline">
                                    {CATEGORIES.find((c) => c.value === item.category)?.label || item.category}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <div className="flex gap-1">
                                    <Button variant="ghost" size="icon" onClick={() => openEditItem(item)}>
                                      <Pencil className="h-3 w-3" />
                                    </Button>
                                    <Button variant="ghost" size="icon" onClick={() => deleteItem(item)}>
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Item Dialog */}
      <Dialog
        open={isItemOpen}
        onOpenChange={(open) => {
          setIsItemOpen(open);
          if (!open) resetItemForm();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingItem ? "Edit" : "Add"} Checklist Item</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleItemSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                value={itemTitle}
                onChange={(e) => setItemTitle(e.target.value)}
                placeholder="e.g., Complete HR paperwork"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Description (optional)</Label>
              <Textarea
                value={itemDescription}
                onChange={(e) => setItemDescription(e.target.value)}
                placeholder="Additional details or instructions"
              />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={itemCategory} onValueChange={setItemCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setIsItemOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Saving..." : "Save"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
