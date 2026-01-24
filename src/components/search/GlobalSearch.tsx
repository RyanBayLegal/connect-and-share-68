import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Search, User, FileText, BookOpen, Loader2 } from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Profile, Document } from "@/types/database";

interface WikiArticle {
  id: string;
  title: string;
  content: string;
  is_published: boolean;
}

interface SearchResults {
  employees: Profile[];
  documents: Document[];
  wikiArticles: WikiArticle[];
}

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<SearchResults>({
    employees: [],
    documents: [],
    wikiArticles: [],
  });
  const navigate = useNavigate();

  // Keyboard shortcut to open search
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const searchAll = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults({ employees: [], documents: [], wikiArticles: [] });
      return;
    }

    setIsLoading(true);
    const searchTerm = `%${searchQuery}%`;

    try {
      const [employeesRes, documentsRes, wikiRes] = await Promise.all([
        // Search employees
        supabase
          .from("profiles")
          .select("*, department:departments!profiles_department_id_fkey(*)")
          .eq("is_active", true)
          .or(`first_name.ilike.${searchTerm},last_name.ilike.${searchTerm},email.ilike.${searchTerm},job_title.ilike.${searchTerm}`)
          .limit(5),
        
        // Search documents
        supabase
          .from("documents")
          .select("*")
          .or(`name.ilike.${searchTerm},description.ilike.${searchTerm}`)
          .limit(5),
        
        // Search wiki articles
        supabase
          .from("wiki_articles")
          .select("id, title, content, is_published")
          .eq("is_published", true)
          .or(`title.ilike.${searchTerm},content.ilike.${searchTerm}`)
          .limit(5),
      ]);

      setResults({
        employees: (employeesRes.data as Profile[]) || [],
        documents: (documentsRes.data as Document[]) || [],
        wikiArticles: (wikiRes.data as WikiArticle[]) || [],
      });
    } catch (error) {
      console.error("Search error:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      searchAll(query);
    }, 300);
    return () => clearTimeout(timer);
  }, [query, searchAll]);

  const handleSelect = (type: string, id: string) => {
    setOpen(false);
    setQuery("");
    
    switch (type) {
      case "employee":
        navigate(`/directory?employee=${id}`);
        break;
      case "document":
        navigate(`/documents`);
        break;
      case "wiki":
        navigate(`/wiki?article=${id}`);
        break;
    }
  };

  const totalResults = 
    results.employees.length + 
    results.documents.length + 
    results.wikiArticles.length;

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="hidden md:flex"
        onClick={() => setOpen(true)}
      >
        <Search className="h-5 w-5" />
        <span className="sr-only">Search</span>
      </Button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput
          placeholder="Search employees, documents, wiki..."
          value={query}
          onValueChange={setQuery}
        />
        <CommandList>
          {isLoading && (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}

          {!isLoading && query && totalResults === 0 && (
            <CommandEmpty>No results found.</CommandEmpty>
          )}

          {!isLoading && !query && (
            <div className="py-6 text-center text-sm text-muted-foreground">
              Start typing to search across employees, documents, and wiki articles.
              <div className="mt-2 text-xs">
                <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
                  <span className="text-xs">⌘</span>K
                </kbd>
                {" "}to open search anytime
              </div>
            </div>
          )}

          {!isLoading && results.employees.length > 0 && (
            <CommandGroup heading="Employees">
              {results.employees.map((employee) => (
                <CommandItem
                  key={employee.id}
                  value={`employee-${employee.id}`}
                  onSelect={() => handleSelect("employee", employee.id)}
                  className="cursor-pointer"
                >
                  <User className="mr-2 h-4 w-4 text-muted-foreground" />
                  <div className="flex flex-col">
                    <span>{employee.first_name} {employee.last_name}</span>
                    <span className="text-xs text-muted-foreground">
                      {employee.job_title || "Employee"} 
                      {employee.department?.name && ` • ${employee.department.name}`}
                    </span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {!isLoading && results.employees.length > 0 && 
           (results.documents.length > 0 || results.wikiArticles.length > 0) && (
            <CommandSeparator />
          )}

          {!isLoading && results.documents.length > 0 && (
            <CommandGroup heading="Documents">
              {results.documents.map((doc) => (
                <CommandItem
                  key={doc.id}
                  value={`document-${doc.id}`}
                  onSelect={() => handleSelect("document", doc.id)}
                  className="cursor-pointer"
                >
                  <FileText className="mr-2 h-4 w-4 text-muted-foreground" />
                  <div className="flex flex-col">
                    <span>{doc.name}</span>
                    {doc.description && (
                      <span className="text-xs text-muted-foreground line-clamp-1">
                        {doc.description}
                      </span>
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {!isLoading && results.documents.length > 0 && 
           results.wikiArticles.length > 0 && (
            <CommandSeparator />
          )}

          {!isLoading && results.wikiArticles.length > 0 && (
            <CommandGroup heading="Knowledge Base">
              {results.wikiArticles.map((article) => (
                <CommandItem
                  key={article.id}
                  value={`wiki-${article.id}`}
                  onSelect={() => handleSelect("wiki", article.id)}
                  className="cursor-pointer"
                >
                  <BookOpen className="mr-2 h-4 w-4 text-muted-foreground" />
                  <div className="flex flex-col">
                    <span>{article.title}</span>
                    <span className="text-xs text-muted-foreground line-clamp-1">
                      {article.content.replace(/<[^>]*>/g, '').substring(0, 60)}...
                    </span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
        </CommandList>
      </CommandDialog>
    </>
  );
}
