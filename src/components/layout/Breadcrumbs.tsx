import { useLocation, Link } from "react-router-dom";
import { ChevronRight, Home } from "lucide-react";

const routeLabels: Record<string, string> = {
  "": "Dashboard",
  "directory": "Directory",
  "announcements": "Announcements",
  "documents": "Documents",
  "messages": "Messages",
  "tasks": "Tasks",
  "wiki": "Wiki",
  "events": "Events",
  "settings": "Settings",
  "admin": "Admin",
  "department": "Department Hub",
  "training": "Training",
  "team-progress": "Team Progress",
  "hr-onboarding": "HR Onboarding",
  "training-management": "Training Management",
  "time-tracking": "Time Tracking",
  "time-management": "Time Management",
  "hr-settings": "HR Settings",
  "payroll": "Payroll",
  "hr-dashboard": "HR Dashboard",
  "my-hr": "My HR",
};

export function Breadcrumbs() {
  const location = useLocation();
  const pathSegments = location.pathname.split("/").filter(Boolean);

  if (pathSegments.length === 0) return null;

  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm text-muted-foreground mb-4">
      <Link to="/" className="hover:text-foreground transition-colors flex items-center gap-1">
        <Home className="h-3.5 w-3.5" />
        <span className="sr-only">Home</span>
      </Link>
      {pathSegments.map((segment, index) => {
        const path = "/" + pathSegments.slice(0, index + 1).join("/");
        const label = routeLabels[segment] || segment;
        const isLast = index === pathSegments.length - 1;

        return (
          <span key={path} className="flex items-center gap-1.5">
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50" />
            {isLast ? (
              <span className="text-foreground font-medium">{label}</span>
            ) : (
              <Link to={path} className="hover:text-foreground transition-colors">
                {label}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}
