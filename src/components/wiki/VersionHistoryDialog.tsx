import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { History, RotateCcw, User, Calendar } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import type { Profile } from "@/types/database";

interface WikiArticleVersion {
  id: string;
  article_id: string;
  version_number: number;
  title: string;
  content: string;
  change_summary: string | null;
  edited_by: string | null;
  created_at: string;
  editor?: Profile;
}

interface VersionHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  articleId: string;
  articleTitle: string;
  currentVersion: number;
  isAdmin: boolean;
  onRestore: () => void;
}

export function VersionHistoryDialog({
  open,
  onOpenChange,
  articleId,
  articleTitle,
  currentVersion,
  isAdmin,
  onRestore,
}: VersionHistoryDialogProps) {
  const [versions, setVersions] = useState<WikiArticleVersion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [restoringId, setRestoringId] = useState<string | null>(null);

  useEffect(() => {
    if (open && articleId) {
      fetchVersions();
    }
  }, [open, articleId]);

  const fetchVersions = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("wiki_article_versions")
        .select("*, editor:profiles(*)")
        .eq("article_id", articleId)
        .order("version_number", { ascending: false });

      if (error) throw error;
      setVersions((data as unknown as WikiArticleVersion[]) || []);
    } catch (error) {
      console.error("Error fetching versions:", error);
      toast.error("Failed to load version history");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRestore = async (version: WikiArticleVersion) => {
    setRestoringId(version.id);
    try {
      // Update the article with the version's content
      const { error } = await supabase
        .from("wiki_articles")
        .update({
          title: version.title,
          content: version.content,
          current_version: currentVersion + 1,
        })
        .eq("id", articleId);

      if (error) throw error;

      toast.success(`Restored to version ${version.version_number}`);
      onRestore();
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || "Failed to restore version");
    } finally {
      setRestoringId(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Version History: {articleTitle}
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : versions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <History className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No version history available</p>
            <p className="text-sm">Versions are created when articles are edited</p>
          </div>
        ) : (
          <ScrollArea className="max-h-[60vh] pr-4">
            <div className="space-y-4">
              {versions.map((version, index) => (
                <div
                  key={version.id}
                  className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={index === 0 ? "default" : "secondary"}
                          className="font-mono"
                        >
                          v{version.version_number}
                        </Badge>
                        {index === 0 && (
                          <Badge variant="outline" className="text-xs">
                            Latest
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(version.created_at), "MMM d, yyyy 'at' h:mm a")}
                        </span>
                        {version.editor && (
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {version.editor.first_name} {version.editor.last_name}
                          </span>
                        )}
                      </div>
                      {version.change_summary && (
                        <p className="text-sm italic text-muted-foreground mt-2">
                          "{version.change_summary}"
                        </p>
                      )}
                    </div>
                    {isAdmin && index !== 0 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRestore(version)}
                        disabled={restoringId === version.id}
                      >
                        <RotateCcw className="h-3 w-3 mr-1" />
                        {restoringId === version.id ? "Restoring..." : "Restore"}
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
}
