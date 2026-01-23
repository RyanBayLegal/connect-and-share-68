import { useState, useMemo } from "react";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { GitCompare, User, Calendar } from "lucide-react";
import { format } from "date-fns";
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

interface VersionCompareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  versions: WikiArticleVersion[];
  initialLeftVersion?: WikiArticleVersion;
  initialRightVersion?: WikiArticleVersion;
}

// Simple word-level diff algorithm
function diffWords(oldText: string, newText: string): { type: 'same' | 'added' | 'removed'; text: string }[] {
  // Strip HTML tags for comparison
  const stripHtml = (html: string) => html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  
  const oldWords = stripHtml(oldText).split(' ');
  const newWords = stripHtml(newText).split(' ');
  
  const result: { type: 'same' | 'added' | 'removed'; text: string }[] = [];
  
  let i = 0;
  let j = 0;
  
  while (i < oldWords.length || j < newWords.length) {
    if (i >= oldWords.length) {
      // Rest of new words are additions
      result.push({ type: 'added', text: newWords.slice(j).join(' ') });
      break;
    }
    if (j >= newWords.length) {
      // Rest of old words are removals
      result.push({ type: 'removed', text: oldWords.slice(i).join(' ') });
      break;
    }
    
    if (oldWords[i] === newWords[j]) {
      // Find consecutive matching words
      let matchEnd = i + 1;
      let newMatchEnd = j + 1;
      while (matchEnd < oldWords.length && newMatchEnd < newWords.length && oldWords[matchEnd] === newWords[newMatchEnd]) {
        matchEnd++;
        newMatchEnd++;
      }
      result.push({ type: 'same', text: oldWords.slice(i, matchEnd).join(' ') });
      i = matchEnd;
      j = newMatchEnd;
    } else {
      // Look ahead to find next match
      let foundMatch = false;
      for (let lookAhead = 1; lookAhead < 10 && !foundMatch; lookAhead++) {
        // Check if old word appears later in new
        if (j + lookAhead < newWords.length && oldWords[i] === newWords[j + lookAhead]) {
          result.push({ type: 'added', text: newWords.slice(j, j + lookAhead).join(' ') });
          j += lookAhead;
          foundMatch = true;
        }
        // Check if new word appears later in old
        else if (i + lookAhead < oldWords.length && newWords[j] === oldWords[i + lookAhead]) {
          result.push({ type: 'removed', text: oldWords.slice(i, i + lookAhead).join(' ') });
          i += lookAhead;
          foundMatch = true;
        }
      }
      
      if (!foundMatch) {
        // No match found, treat as replacement
        result.push({ type: 'removed', text: oldWords[i] });
        result.push({ type: 'added', text: newWords[j] });
        i++;
        j++;
      }
    }
  }
  
  return result;
}

export function VersionCompareDialog({
  open,
  onOpenChange,
  versions,
  initialLeftVersion,
  initialRightVersion,
}: VersionCompareDialogProps) {
  const [leftVersionId, setLeftVersionId] = useState<string>(
    initialLeftVersion?.id || versions[1]?.id || ""
  );
  const [rightVersionId, setRightVersionId] = useState<string>(
    initialRightVersion?.id || versions[0]?.id || ""
  );

  const leftVersion = useMemo(
    () => versions.find((v) => v.id === leftVersionId),
    [versions, leftVersionId]
  );
  const rightVersion = useMemo(
    () => versions.find((v) => v.id === rightVersionId),
    [versions, rightVersionId]
  );

  const diff = useMemo(() => {
    if (!leftVersion || !rightVersion) return [];
    return diffWords(leftVersion.content, rightVersion.content);
  }, [leftVersion, rightVersion]);

  const titleChanged = leftVersion?.title !== rightVersion?.title;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GitCompare className="h-5 w-5" />
            Compare Versions
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Older Version</label>
            <Select value={leftVersionId} onValueChange={setLeftVersionId}>
              <SelectTrigger>
                <SelectValue placeholder="Select version" />
              </SelectTrigger>
              <SelectContent>
                {versions.map((v) => (
                  <SelectItem key={v.id} value={v.id}>
                    v{v.version_number} - {format(new Date(v.created_at), "MMM d, yyyy")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Newer Version</label>
            <Select value={rightVersionId} onValueChange={setRightVersionId}>
              <SelectTrigger>
                <SelectValue placeholder="Select version" />
              </SelectTrigger>
              <SelectContent>
                {versions.map((v) => (
                  <SelectItem key={v.id} value={v.id}>
                    v{v.version_number} - {format(new Date(v.created_at), "MMM d, yyyy")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {leftVersion && rightVersion && (
          <>
            {/* Version metadata */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="p-3 bg-muted/50 rounded-lg border">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="outline" className="font-mono">
                    v{leftVersion.version_number}
                  </Badge>
                  <span className="text-sm text-muted-foreground flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {format(new Date(leftVersion.created_at), "MMM d, yyyy 'at' h:mm a")}
                  </span>
                </div>
                {leftVersion.editor && (
                  <div className="text-sm flex items-center gap-1">
                    <User className="h-3 w-3" />
                    {leftVersion.editor.first_name} {leftVersion.editor.last_name}
                  </div>
                )}
                {leftVersion.change_summary && (
                  <p className="text-sm italic text-muted-foreground mt-2">
                    "{leftVersion.change_summary}"
                  </p>
                )}
              </div>
              <div className="p-3 bg-muted/50 rounded-lg border">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="outline" className="font-mono">
                    v{rightVersion.version_number}
                  </Badge>
                  <span className="text-sm text-muted-foreground flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {format(new Date(rightVersion.created_at), "MMM d, yyyy 'at' h:mm a")}
                  </span>
                </div>
                {rightVersion.editor && (
                  <div className="text-sm flex items-center gap-1">
                    <User className="h-3 w-3" />
                    {rightVersion.editor.first_name} {rightVersion.editor.last_name}
                  </div>
                )}
                {rightVersion.change_summary && (
                  <p className="text-sm italic text-muted-foreground mt-2">
                    "{rightVersion.change_summary}"
                  </p>
                )}
              </div>
            </div>

            {/* Title comparison */}
            {titleChanged && (
              <div className="mb-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                <h4 className="text-sm font-medium mb-2">Title Changed</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-sm">
                    <span className="line-through text-destructive">{leftVersion.title}</span>
                  </div>
                  <div className="text-sm">
                    <span className="text-green-600 dark:text-green-400">{rightVersion.title}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Content diff */}
            <ScrollArea className="max-h-[400px] border rounded-lg p-4">
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <h4 className="text-sm font-medium mb-3 text-muted-foreground">Content Changes</h4>
                <div className="leading-relaxed">
                  {diff.map((segment, index) => (
                    <span
                      key={index}
                      className={
                        segment.type === 'added'
                          ? 'bg-green-500/20 text-green-700 dark:text-green-300'
                          : segment.type === 'removed'
                          ? 'bg-destructive/20 text-destructive line-through'
                          : ''
                      }
                    >
                      {segment.text}{' '}
                    </span>
                  ))}
                </div>
              </div>
            </ScrollArea>

            {/* Legend */}
            <div className="flex items-center gap-4 mt-4 text-sm">
              <span className="flex items-center gap-1">
                <span className="w-4 h-4 bg-green-500/20 rounded" />
                <span>Added</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="w-4 h-4 bg-destructive/20 rounded" />
                <span>Removed</span>
              </span>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
