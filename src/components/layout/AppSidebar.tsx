import { 
  Home, 
  Users, 
  Megaphone, 
  FileText, 
  MessageSquare, 
  Settings,
  Shield,
  LogOut,
  ChevronDown,
  ListTodo,
  BookOpen,
  CalendarDays,
  GraduationCap,
  Building2,
  ClipboardList,
} from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import bayLegalLogo from "@/assets/bay-legal-logo.webp";

const mainNavItems = [
  { title: "Dashboard", url: "/", icon: Home },
  { title: "My Department", url: "/department", icon: Building2 },
  { title: "Employee Directory", url: "/directory", icon: Users },
  { title: "Announcements", url: "/announcements", icon: Megaphone },
  { title: "Documents", url: "/documents", icon: FileText },
  { title: "Messages", url: "/messages", icon: MessageSquare },
  { title: "Tasks", url: "/tasks", icon: ListTodo },
  { title: "Knowledge Base", url: "/wiki", icon: BookOpen },
  { title: "Events", url: "/events", icon: CalendarDays },
  { title: "Training", url: "/training", icon: GraduationCap },
];

export function AppSidebar() {
  const { profile, isAdmin, hasRole, isSuperAdmin, signOut, rolesLoaded } = useAuth();
  const location = useLocation();

  // Access checks - use rolesLoaded from context for reliable evaluation
  const departmentName = profile?.department?.name?.toLowerCase() || "";
  const isHRDepartment = departmentName.includes("hr") || departmentName.includes("human resources");
  const isTrainingDepartment = departmentName.includes("training");
  const isTrainingManager = hasRole("training_manager");
  
  const canSeeHROnboarding = isSuperAdmin() || isHRDepartment;
  const canSeeTrainingManagement = isSuperAdmin() || isTrainingDepartment || isTrainingManager;
  
  // Only show admin section once roles are fully loaded
  const showAdminSection = rolesLoaded && (isSuperAdmin() || canSeeHROnboarding || canSeeTrainingManagement);

  const initials = profile
    ? `${profile.first_name[0]}${profile.last_name[0]}`
    : "U";

  return (
    <Sidebar>
      <SidebarHeader className="border-b border-sidebar-border px-4 py-4">
        <div className="flex items-center gap-3">
          <img 
            src={bayLegalLogo} 
            alt="Bay Legal" 
            className="h-10 w-10 rounded-lg shadow-md"
          />
          <div className="flex flex-col">
            <span className="text-base font-semibold text-sidebar-foreground">Bay Legal</span>
            <span className="text-xs text-sidebar-foreground/70">Knowledge Hub</span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/60">Main Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNavItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={location.pathname === item.url}
                  >
                    <NavLink to={item.url}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {showAdminSection && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-sidebar-foreground/60">Administration</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {isSuperAdmin() && (
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      asChild
                      isActive={location.pathname === "/admin"}
                    >
                      <NavLink to="/admin">
                        <Shield className="h-4 w-4" />
                        <span>Admin Panel</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )}
                {canSeeHROnboarding && (
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      asChild
                      isActive={location.pathname === "/hr-onboarding"}
                    >
                      <NavLink to="/hr-onboarding">
                        <ClipboardList className="h-4 w-4" />
                        <span>HR Onboarding</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )}
                {canSeeTrainingManagement && (
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      asChild
                      isActive={location.pathname === "/training-management"}
                    >
                      <NavLink to="/training-management">
                        <GraduationCap className="h-4 w-4" />
                        <span>Training Mgmt</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex w-full items-center gap-3 rounded-lg p-2 hover:bg-sidebar-accent transition-colors">
              <Avatar className="h-8 w-8">
                <AvatarImage src={profile?.avatar_url || undefined} />
                <AvatarFallback className="bg-sidebar-primary text-sidebar-primary-foreground text-sm">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 text-left">
                <p className="text-sm font-medium leading-none text-sidebar-foreground">
                  {profile?.first_name} {profile?.last_name}
                </p>
                <p className="text-xs text-sidebar-foreground/70 mt-0.5">
                  {profile?.job_title || "Employee"}
                </p>
              </div>
              <ChevronDown className="h-4 w-4 text-sidebar-foreground/70" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem asChild>
              <NavLink to="/settings" className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Settings
              </NavLink>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={signOut}
              className="text-destructive focus:text-destructive"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
