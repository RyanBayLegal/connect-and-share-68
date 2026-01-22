import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronRight, User } from "lucide-react";
import type { Profile, Department } from "@/types/database";
import { cn } from "@/lib/utils";

interface OrgNode extends Profile {
  children: OrgNode[];
  isExpanded?: boolean;
}

interface OrgChartProps {
  employees: Profile[];
}

export function OrgChart({ employees }: OrgChartProps) {
  const [tree, setTree] = useState<OrgNode[]>([]);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

  useEffect(() => {
    buildTree();
  }, [employees]);

  const buildTree = () => {
    // Find employees without managers (top level)
    const roots = employees.filter((e) => !e.manager_id);
    
    const buildNode = (employee: Profile): OrgNode => {
      const children = employees
        .filter((e) => e.manager_id === employee.id)
        .map(buildNode);
      return { ...employee, children };
    };

    const treeNodes = roots.map(buildNode);
    setTree(treeNodes);
    
    // Expand first two levels by default
    const expanded = new Set<string>();
    treeNodes.forEach((node) => {
      expanded.add(node.id);
      node.children.forEach((child) => expanded.add(child.id));
    });
    setExpandedNodes(expanded);
  };

  const toggleNode = (id: string) => {
    setExpandedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  if (tree.length === 0) {
    return (
      <div className="text-center py-12">
        <User className="h-12 w-12 mx-auto text-muted-foreground" />
        <h3 className="mt-4 text-lg font-semibold">No org structure defined</h3>
        <p className="text-muted-foreground">
          Set manager relationships in user profiles to build the org chart
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {tree.map((node) => (
        <OrgNodeComponent
          key={node.id}
          node={node}
          level={0}
          expandedNodes={expandedNodes}
          onToggle={toggleNode}
        />
      ))}
    </div>
  );
}

function OrgNodeComponent({
  node,
  level,
  expandedNodes,
  onToggle,
}: {
  node: OrgNode;
  level: number;
  expandedNodes: Set<string>;
  onToggle: (id: string) => void;
}) {
  const isExpanded = expandedNodes.has(node.id);
  const hasChildren = node.children.length > 0;

  return (
    <div style={{ marginLeft: level * 24 }}>
      <Card
        className={cn(
          "cursor-pointer hover:shadow-md transition-shadow",
          level === 0 && "border-primary/50"
        )}
        onClick={() => hasChildren && onToggle(node.id)}
      >
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            {hasChildren ? (
              <button className="p-1 hover:bg-muted rounded">
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </button>
            ) : (
              <div className="w-6" />
            )}
            
            <Avatar className="h-12 w-12">
              <AvatarImage src={node.avatar_url || undefined} />
              <AvatarFallback className="bg-primary text-primary-foreground">
                {node.first_name[0]}
                {node.last_name[0]}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0">
              <h4 className="font-semibold">
                {node.first_name} {node.last_name}
              </h4>
              <p className="text-sm text-muted-foreground">
                {node.job_title || "Employee"}
              </p>
            </div>

            {node.department && (
              <Badge variant="secondary">{node.department.name}</Badge>
            )}

            {hasChildren && (
              <Badge variant="outline">
                {node.children.length} direct report{node.children.length !== 1 ? "s" : ""}
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {isExpanded && hasChildren && (
        <div className="mt-2 space-y-2 border-l-2 border-muted ml-6">
          {node.children.map((child) => (
            <OrgNodeComponent
              key={child.id}
              node={child}
              level={level + 1}
              expandedNodes={expandedNodes}
              onToggle={onToggle}
            />
          ))}
        </div>
      )}
    </div>
  );
}
