import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, Shield, Check, Eye } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

export interface WikiTemplate {
  id: string;
  name: string;
  description: string | null;
  content: string;
  article_type: "article" | "policy";
  category_id: string | null;
  is_active: boolean;
  created_at: string;
}

interface TemplateSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  templates: WikiTemplate[];
  onSelectTemplate: (template: WikiTemplate) => void;
}

export function TemplateSelector({
  open,
  onOpenChange,
  templates,
  onSelectTemplate,
}: TemplateSelectorProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<WikiTemplate | null>(null);
  const [previewMode, setPreviewMode] = useState(false);

  const handleSelect = () => {
    if (selectedTemplate) {
      onSelectTemplate(selectedTemplate);
      onOpenChange(false);
      setSelectedTemplate(null);
      setPreviewMode(false);
    }
  };

  const handlePreview = (template: WikiTemplate) => {
    setSelectedTemplate(template);
    setPreviewMode(true);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {previewMode ? "Template Preview" : "Choose a Template"}
          </DialogTitle>
          <DialogDescription>
            {previewMode
              ? selectedTemplate?.name
              : "Select a template to start with pre-formatted content"}
          </DialogDescription>
        </DialogHeader>

        {previewMode && selectedTemplate ? (
          <div className="flex flex-col flex-1 overflow-hidden">
            <ScrollArea className="flex-1 border rounded-md p-4">
              <div
                className="prose prose-sm dark:prose-invert max-w-none"
                dangerouslySetInnerHTML={{ __html: selectedTemplate.content }}
              />
            </ScrollArea>
            <div className="flex justify-between mt-4">
              <Button variant="outline" onClick={() => setPreviewMode(false)}>
                Back to Templates
              </Button>
              <Button onClick={handleSelect}>
                <Check className="h-4 w-4 mr-2" />
                Use This Template
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col flex-1 overflow-hidden">
            <ScrollArea className="flex-1">
              <div className="grid gap-3 pr-4">
                {templates.map((template) => (
                  <Card
                    key={template.id}
                    className={`cursor-pointer transition-all hover:shadow-md ${
                      selectedTemplate?.id === template.id
                        ? "ring-2 ring-primary"
                        : ""
                    }`}
                    onClick={() => setSelectedTemplate(template)}
                  >
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base flex items-center gap-2">
                          {template.article_type === "policy" ? (
                            <Shield className="h-4 w-4 text-blue-600" />
                          ) : (
                            <FileText className="h-4 w-4 text-muted-foreground" />
                          )}
                          {template.name}
                        </CardTitle>
                        <Badge variant="outline">
                          {template.article_type === "policy" ? "Policy" : "Article"}
                        </Badge>
                      </div>
                      {template.description && (
                        <CardDescription>{template.description}</CardDescription>
                      )}
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="flex justify-end">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePreview(template);
                          }}
                        >
                          <Eye className="h-3 w-3 mr-1" />
                          Preview
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
            <div className="flex justify-between mt-4 pt-4 border-t">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={handleSelect} disabled={!selectedTemplate}>
                <Check className="h-4 w-4 mr-2" />
                Use Template
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
