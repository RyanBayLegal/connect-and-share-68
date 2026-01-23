import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, FileText, Video, Link as LinkIcon, Trash2, Upload, GripVertical, ExternalLink } from "lucide-react";

interface TrainingMaterial {
  id: string;
  course_id: string;
  title: string;
  type: string;
  file_path: string | null;
  external_url: string | null;
  position: number;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  courseId: string | null;
  courseTitle: string;
}

export function TrainingMaterialsDialog({ isOpen, onClose, courseId, courseTitle }: Props) {
  const [materials, setMaterials] = useState<TrainingMaterial[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // New material form
  const [newTitle, setNewTitle] = useState("");
  const [newType, setNewType] = useState("document");
  const [newUrl, setNewUrl] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && courseId) {
      fetchMaterials();
    }
  }, [isOpen, courseId]);

  const fetchMaterials = async () => {
    if (!courseId) return;
    setIsLoading(true);
    
    const { data } = await supabase
      .from("training_materials")
      .select("*")
      .eq("course_id", courseId)
      .order("position");
    
    setMaterials((data || []) as TrainingMaterial[]);
    setIsLoading(false);
  };

  const handleAddMaterial = async () => {
    if (!courseId || !newTitle.trim()) {
      toast.error("Please enter a title");
      return;
    }

    if (newType === "link" && !newUrl.trim()) {
      toast.error("Please enter a URL");
      return;
    }

    if ((newType === "document" || newType === "video") && !uploadFile) {
      toast.error("Please select a file to upload");
      return;
    }

    setIsSubmitting(true);

    try {
      let filePath: string | null = null;

      if (uploadFile) {
        const fileExt = uploadFile.name.split(".").pop();
        const fileName = `${courseId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from("training-materials")
          .upload(fileName, uploadFile);
        
        if (uploadError) {
          throw new Error(`Upload failed: ${uploadError.message}`);
        }
        
        filePath = fileName;
      }

      const { error } = await supabase.from("training_materials").insert({
        course_id: courseId,
        title: newTitle.trim(),
        type: newType,
        file_path: filePath,
        external_url: newType === "link" ? newUrl.trim() : null,
        position: materials.length,
      });

      if (error) throw error;

      toast.success("Material added!");
      resetForm();
      fetchMaterials();
    } catch (error: any) {
      toast.error(error.message || "Failed to add material");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteMaterial = async (material: TrainingMaterial) => {
    if (!confirm("Delete this material?")) return;

    try {
      // Delete file from storage if exists
      if (material.file_path) {
        await supabase.storage
          .from("training-materials")
          .remove([material.file_path]);
      }

      const { error } = await supabase
        .from("training_materials")
        .delete()
        .eq("id", material.id);

      if (error) throw error;

      toast.success("Material deleted");
      fetchMaterials();
    } catch (error: any) {
      toast.error(error.message || "Failed to delete material");
    }
  };

  const openMaterial = async (material: TrainingMaterial) => {
    if (material.external_url) {
      window.open(material.external_url, "_blank");
      return;
    }

    if (material.file_path) {
      const { data } = await supabase.storage
        .from("training-materials")
        .createSignedUrl(material.file_path, 3600);

      if (data?.signedUrl) {
        window.open(data.signedUrl, "_blank");
      } else {
        toast.error("Failed to get file URL");
      }
    }
  };

  const resetForm = () => {
    setNewTitle("");
    setNewType("document");
    setNewUrl("");
    setUploadFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "video": return Video;
      case "link": return LinkIcon;
      default: return FileText;
    }
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Course Materials: {courseTitle}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Add New Material Form */}
          <div className="p-4 border rounded-lg bg-muted/30 space-y-4">
            <h4 className="font-medium flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Add Material
            </h4>
            <div className="grid gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Title</Label>
                  <Input
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="e.g., Introduction Video"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select value={newType} onValueChange={setNewType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="document">Document</SelectItem>
                      <SelectItem value="video">Video</SelectItem>
                      <SelectItem value="link">External Link</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {newType === "link" ? (
                <div className="space-y-2">
                  <Label>URL</Label>
                  <Input
                    type="url"
                    value={newUrl}
                    onChange={(e) => setNewUrl(e.target.value)}
                    placeholder="https://..."
                  />
                </div>
              ) : (
                <div className="space-y-2">
                  <Label>File</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      ref={fileInputRef}
                      type="file"
                      accept={newType === "video" ? "video/*" : ".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt"}
                      onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                      className="flex-1"
                    />
                    {uploadFile && (
                      <Badge variant="secondary" className="text-xs">
                        {(uploadFile.size / 1024 / 1024).toFixed(1)} MB
                      </Badge>
                    )}
                  </div>
                </div>
              )}

              <Button
                onClick={handleAddMaterial}
                disabled={isSubmitting || !newTitle.trim()}
                className="w-full"
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2" />
                    {uploadFile ? "Uploading..." : "Adding..."}
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Add Material
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Materials List */}
          <div>
            <h4 className="font-medium mb-3">
              Course Materials ({materials.length})
            </h4>
            
            {isLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
              </div>
            ) : materials.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground border rounded-lg">
                <FileText className="h-10 w-10 mx-auto mb-2 opacity-50" />
                <p>No materials added yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {materials.map((material) => {
                  const Icon = getTypeIcon(material.type);
                  return (
                    <div
                      key={material.id}
                      className="flex items-center gap-3 p-3 border rounded-lg bg-background hover:bg-muted/50 transition-colors group"
                    >
                      <GripVertical className="h-4 w-4 text-muted-foreground opacity-50" />
                      <Icon className="h-5 w-5 text-muted-foreground" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{material.title}</p>
                        <Badge variant="outline" className="text-xs mt-1">
                          {material.type}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openMaterial(material)}
                          title="View/Download"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteMaterial(material)}
                          className="text-destructive hover:text-destructive"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
