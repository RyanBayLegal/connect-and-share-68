import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  Folder,
  FileText,
  Upload,
  Download,
  Plus,
  Search,
  FolderPlus,
  File,
  Image,
  FileSpreadsheet,
  FileArchive,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import type { Document, DocumentFolder, Department } from "@/types/database";

const getFileIcon = (mimeType: string | null) => {
  if (!mimeType) return FileText;
  if (mimeType.startsWith("image/")) return Image;
  if (mimeType.includes("spreadsheet") || mimeType.includes("excel")) return FileSpreadsheet;
  if (mimeType.includes("zip") || mimeType.includes("archive")) return FileArchive;
  return FileText;
};

const formatFileSize = (bytes: number | null) => {
  if (!bytes) return "Unknown size";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export default function Documents() {
  const { isAdmin, profile } = useAuth();
  const [folders, setFolders] = useState<DocumentFolder[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [folderPath, setFolderPath] = useState<DocumentFolder[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  
  // Create folder dialog
  const [isCreateFolderOpen, setIsCreateFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [newFolderDepartment, setNewFolderDepartment] = useState<string>("");
  const [newFolderPublic, setNewFolderPublic] = useState(false);

  // Upload dialog
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadDescription, setUploadDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
  }, [currentFolderId]);

  useEffect(() => {
    const fetchDepartments = async () => {
      const { data } = await supabase.from("departments").select("*").order("name");
      setDepartments((data as unknown as Department[]) || []);
    };
    fetchDepartments();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Fetch folders in current directory
      const foldersQuery = supabase
        .from("document_folders")
        .select("*, department:departments!document_folders_department_id_fkey(*)")
        .order("name");

      if (currentFolderId) {
        foldersQuery.eq("parent_id", currentFolderId);
      } else {
        foldersQuery.is("parent_id", null);
      }

      const { data: foldersData } = await foldersQuery;

      // Fetch documents in current folder
      const docsQuery = supabase
        .from("documents")
        .select("*, uploader:profiles(*)")
        .order("name");

      if (currentFolderId) {
        docsQuery.eq("folder_id", currentFolderId);
      } else {
        docsQuery.is("folder_id", null);
      }

      const { data: docsData } = await docsQuery;

      setFolders((foldersData as unknown as DocumentFolder[]) || []);
      setDocuments((docsData as unknown as Document[]) || []);

      // Build folder path
      if (currentFolderId) {
        await buildFolderPath(currentFolderId);
      } else {
        setFolderPath([]);
      }
    } catch (error) {
      console.error("Error fetching documents:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const buildFolderPath = async (folderId: string) => {
    const path: DocumentFolder[] = [];
    let currentId: string | null = folderId;

    while (currentId) {
      const { data } = await supabase
        .from("document_folders")
        .select("*")
        .eq("id", currentId)
        .single();

      if (data) {
        path.unshift(data as unknown as DocumentFolder);
        currentId = data.parent_id;
      } else {
        break;
      }
    }

    setFolderPath(path);
  };

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from("document_folders").insert({
        name: newFolderName,
        parent_id: currentFolderId,
        department_id: newFolderDepartment || null,
        created_by: profile.id,
        is_public: newFolderPublic,
      });

      if (error) throw error;

      toast.success("Folder created successfully!");
      setIsCreateFolderOpen(false);
      setNewFolderName("");
      setNewFolderDepartment("");
      setNewFolderPublic(false);
      fetchData();
    } catch (error) {
      console.error("Error creating folder:", error);
      toast.error("Failed to create folder");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile || !profile) return;

    setIsSubmitting(true);
    try {
      // Upload file to storage
      const fileExt = uploadFile.name.split(".").pop();
      const filePath = `${currentFolderId || "root"}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("documents")
        .upload(filePath, uploadFile);

      if (uploadError) throw uploadError;

      // Create document record
      const { error: insertError } = await supabase.from("documents").insert({
        name: uploadFile.name,
        description: uploadDescription || null,
        file_path: filePath,
        file_size: uploadFile.size,
        mime_type: uploadFile.type,
        folder_id: currentFolderId,
        uploaded_by: profile.id,
      });

      if (insertError) throw insertError;

      toast.success("Document uploaded successfully!");
      setIsUploadOpen(false);
      setUploadFile(null);
      setUploadDescription("");
      fetchData();
    } catch (error) {
      console.error("Error uploading document:", error);
      toast.error("Failed to upload document");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDownload = async (doc: Document) => {
    try {
      const { data, error } = await supabase.storage
        .from("documents")
        .download(doc.file_path);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = url;
      a.download = doc.name;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error downloading document:", error);
      toast.error("Failed to download document");
    }
  };

  const filteredFolders = folders.filter((f) =>
    f.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredDocuments = documents.filter((d) =>
    d.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
          <h1 className="text-3xl font-bold tracking-tight">Documents</h1>
          <p className="text-muted-foreground mt-1">
            Access and manage company documents
          </p>
        </div>
        {isAdmin() && (
          <div className="flex gap-2">
            <Dialog open={isCreateFolderOpen} onOpenChange={setIsCreateFolderOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <FolderPlus className="h-4 w-4 mr-2" />
                  New Folder
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Folder</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCreateFolder} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="folderName">Folder Name</Label>
                    <Input
                      id="folderName"
                      value={newFolderName}
                      onChange={(e) => setNewFolderName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Department Access</Label>
                    <Select
                      value={newFolderDepartment}
                      onValueChange={setNewFolderDepartment}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="All departments" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">All Departments</SelectItem>
                        {departments.map((dept) => (
                          <SelectItem key={dept.id} value={dept.id}>
                            {dept.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="isPublic"
                      checked={newFolderPublic}
                      onChange={(e) => setNewFolderPublic(e.target.checked)}
                    />
                    <Label htmlFor="isPublic">Public folder (accessible to all)</Label>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsCreateFolderOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={isSubmitting}>
                      {isSubmitting ? "Creating..." : "Create"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>

            <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Upload Document</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleUpload} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="file">File</Label>
                    <Input
                      id="file"
                      type="file"
                      onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Description (optional)</Label>
                    <Input
                      id="description"
                      value={uploadDescription}
                      onChange={(e) => setUploadDescription(e.target.value)}
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsUploadOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={isSubmitting || !uploadFile}>
                      {isSubmitting ? "Uploading..." : "Upload"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        )}
      </div>

      {/* Breadcrumb Navigation */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink
              href="#"
              onClick={(e) => {
                e.preventDefault();
                setCurrentFolderId(null);
              }}
            >
              Documents
            </BreadcrumbLink>
          </BreadcrumbItem>
          {folderPath.map((folder, index) => (
            <React.Fragment key={folder.id}>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                {index === folderPath.length - 1 ? (
                  <BreadcrumbPage>{folder.name}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      setCurrentFolderId(folder.id);
                    }}
                  >
                    {folder.name}
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
            </React.Fragment>
          ))}
        </BreadcrumbList>
      </Breadcrumb>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search files and folders..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 max-w-md"
        />
      </div>

      {/* Folders */}
      {filteredFolders.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-muted-foreground mb-3">Folders</h3>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {filteredFolders.map((folder) => (
              <Card
                key={folder.id}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => setCurrentFolderId(folder.id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <Folder className="h-10 w-10 text-primary" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{folder.name}</p>
                      {folder.department && (
                        <p className="text-xs text-muted-foreground">
                          {folder.department.name}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Documents */}
      {filteredDocuments.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-muted-foreground mb-3">Files</h3>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredDocuments.map((doc) => {
              const FileIcon = getFileIcon(doc.mime_type);
              return (
                <Card key={doc.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <FileIcon className="h-10 w-10 text-muted-foreground flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{doc.name}</p>
                        {doc.description && (
                          <p className="text-sm text-muted-foreground truncate">
                            {doc.description}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatFileSize(doc.file_size)} •{" "}
                          {formatDistanceToNow(new Date(doc.created_at), {
                            addSuffix: true,
                          })}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDownload(doc)}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {filteredFolders.length === 0 && filteredDocuments.length === 0 && (
        <div className="text-center py-12">
          <File className="h-12 w-12 mx-auto text-muted-foreground" />
          <h3 className="mt-4 text-lg font-semibold">No documents</h3>
          <p className="text-muted-foreground">
            {currentFolderId
              ? "This folder is empty"
              : "No documents have been uploaded yet"}
          </p>
        </div>
      )}
    </div>
  );
}

import React from "react";
