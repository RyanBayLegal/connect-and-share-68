import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  Home,
  Users,
  Megaphone,
  FileText,
  MessageSquare,
  Settings,
  Shield,
  LogOut,
  ListTodo,
  BookOpen,
  CalendarDays,
  Menu,
  GraduationCap,
  ChevronDown,
  LayoutGrid,
  Briefcase,
  UserCog,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { GlobalSearch } from "@/components/search/GlobalSearch";
import { NotificationBell } from "@/components/layout/NotificationBell";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { TimeTrackingHeaderWidget } from "@/components/dashboard/TimeTrackingHeaderWidget";
import { useBranding } from "@/hooks/useBranding";

const quickLinks = [
  { title: "Announcements", url: "/announcements", icon: Megaphone, description: "Company news & updates" },
  { title: "Libraries", url: "/wiki", icon: BookOpen, description: "Knowledge base" },
  { title: "Training", url: "/training", icon: GraduationCap, description: "Courses & development" },
];

const hrLinks = [
  { title: "HR Dashboard", url: "/hr-dashboard", icon: Briefcase, description: "HR management hub" },
];

const resourceLinks = [
  { title: "My HR", url: "/my-hr", icon: UserCog, description: "Pay stubs, leave & PTO" },
  { title: "Directory", url: "/directory", icon: Users, description: "Find team members" },
  { title: "Department Hub", url: "/department", icon: LayoutGrid, description: "Your department" },
  { title: "Documents", url: "/documents", icon: FileText, description: "Files & resources" },
  { title: "Tasks", url: "/tasks", icon: ListTodo, description: "Projects & assignments" },
  { title: "Messages", url: "/messages", icon: MessageSquare, description: "Team communication" },
  { title: "Events", url: "/events", icon: CalendarDays, description: "Calendar & meetings" },
];

const allLinks = [...quickLinks, ...resourceLinks];

export function TopNav() {
  const { profile, isAdmin, isHRManager, signOut } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [megaOpen, setMegaOpen] = useState(false);
  const { branding } = useBranding();

  const initials = profile
    ? `${profile.first_name[0]}${profile.last_name[0]}`
    : "U";

  return (
    <header className="sticky top-0 z-50 w-full glass-nav">
      <div className="container flex h-16 items-center justify-between px-4 lg:px-6">
        {/* Logo */}
        <NavLink to="/" className="flex items-center gap-3 group shrink-0">
          <div className="bg-primary p-1.5 rounded-lg shadow-[0_0_15px_hsl(var(--primary)/0.3)] group-hover:scale-110 transition-transform overflow-hidden">
            {branding.logo_url ? (
              <img src={branding.logo_url} alt="Logo" className="h-5 w-5 object-contain" />
            ) : (
              <Shield className="h-5 w-5 text-white" />
            )}
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-black text-foreground tracking-tighter leading-none">{branding.company_name || "Bay Legal, PC"}</span>
            <span className="text-[9px] font-bold text-primary uppercase tracking-[0.2em] leading-none mt-0.5">{branding.company_slogan || "Professional Corp"}</span>
          </div>
        </NavLink>

        {/* Desktop Navigation */}
        <nav className="hidden xl:flex items-center gap-1">
          {quickLinks.map((item) => (
            <NavLink
              key={item.url}
              to={item.url}
              className={({ isActive }) => cn(
                "text-xs font-bold uppercase tracking-wider px-3 py-2 rounded-md transition-colors hover:text-primary hover:bg-primary/10",
                isActive ? "text-primary bg-primary/10" : "text-muted-foreground"
              )}
            >
              {item.title}
            </NavLink>
          ))}

          {isHRManager() && hrLinks.map((item) => (
            <NavLink
              key={item.url}
              to={item.url}
              className={({ isActive }) => cn(
                "flex items-center gap-1 text-xs font-bold uppercase tracking-wider px-3 py-2 rounded-md transition-colors hover:text-primary hover:bg-primary/10",
                isActive ? "text-primary bg-primary/10" : "text-muted-foreground"
              )}
            >
              <item.icon className="h-3.5 w-3.5" />
              {item.title}
            </NavLink>
          ))}

          {/* Mega Menu for Resources */}
          <Popover open={megaOpen} onOpenChange={setMegaOpen}>
            <PopoverTrigger asChild>
              <button
                  className={cn(
                    "flex items-center gap-1 text-xs font-bold uppercase tracking-wider px-3 py-2 rounded-md transition-colors hover:text-primary hover:bg-primary/10",
                    megaOpen ? "text-primary bg-primary/10" : "text-muted-foreground"
                  )}
              >
                <LayoutGrid className="h-3.5 w-3.5" />
                Resources
                <ChevronDown className={cn("h-3 w-3 transition-transform", megaOpen && "rotate-180")} />
              </button>
            </PopoverTrigger>
            <PopoverContent align="center" className="w-[480px] p-0 bg-popover border-border text-popover-foreground">
              <div className="p-4">
                <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">Resources & Tools</h3>
                <div className="grid grid-cols-2 gap-1">
                  {resourceLinks.map((item) => (
                    <NavLink
                      key={item.url}
                      to={item.url}
                      onClick={() => setMegaOpen(false)}
                      className={({ isActive }) => cn(
                        "flex items-center gap-3 px-3 py-3 rounded-lg transition-colors",
                        isActive ? "bg-primary/10 text-primary" : "hover:bg-muted text-foreground"
                      )}
                    >
                      <div className="p-2 rounded-lg bg-muted text-primary">
                        <item.icon className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold">{item.title}</p>
                        <p className="text-[11px] text-muted-foreground">{item.description}</p>
                      </div>
                    </NavLink>
                  ))}
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </nav>

        {/* Right Actions */}
        <div className="flex items-center gap-3">
          <div className="hidden md:block w-52">
            <GlobalSearch />
          </div>

          <div className="hidden md:block">
            <TimeTrackingHeaderWidget />
          </div>

          <ThemeToggle />
          <NotificationBell />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 group">
                <Avatar className="h-8 w-8 border-2 border-border group-hover:border-primary transition-colors">
                  <AvatarImage src={profile?.avatar_url || undefined} />
                  <AvatarFallback className="bg-muted text-foreground font-bold text-xs">
                    {initials}
                  </AvatarFallback>
                </Avatar>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 bg-popover border-border text-popover-foreground">
              <div className="px-2 py-2">
                <p className="text-sm font-bold">{profile?.first_name} {profile?.last_name}</p>
                <p className="text-xs text-muted-foreground">{profile?.email}</p>
              </div>
              <DropdownMenuSeparator className="bg-border" />
              <DropdownMenuItem asChild className="focus:bg-primary/10 focus:text-primary">
                <NavLink to="/settings" className="flex items-center gap-2 w-full">
                  <Settings className="h-4 w-4" />
                  Settings
                </NavLink>
              </DropdownMenuItem>
              {isAdmin() && (
                <DropdownMenuItem asChild className="focus:bg-primary/10 focus:text-primary">
                  <NavLink to="/admin" className="flex items-center gap-2 w-full">
                    <Shield className="h-4 w-4" />
                    Admin Panel
                  </NavLink>
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator className="bg-border" />
              <DropdownMenuItem
                onClick={signOut}
                className="text-destructive focus:bg-destructive/10 focus:text-destructive"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Mobile Toggle */}
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="xl:hidden text-muted-foreground h-9 w-9">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="bg-background border-border text-foreground w-72">
              <div className="flex flex-col gap-2 mt-12">
                <NavLink
                  to="/"
                  onClick={() => setMobileOpen(false)}
                  className={({ isActive }) => cn(
                    "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-bold uppercase tracking-wider transition-colors",
                    isActive ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  )}
                >
                  <Home className="h-4 w-4" />
                  Home
                </NavLink>
                {allLinks.map((item) => (
                  <NavLink
                    key={item.url}
                    to={item.url}
                    onClick={() => setMobileOpen(false)}
                    className={({ isActive }) => cn(
                      "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-bold uppercase tracking-wider transition-colors",
                      isActive ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.title}
                  </NavLink>
                ))}
                {isHRManager() && hrLinks.map((item) => (
                  <NavLink
                    key={item.url}
                    to={item.url}
                    onClick={() => setMobileOpen(false)}
                    className={({ isActive }) => cn(
                      "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-bold uppercase tracking-wider transition-colors",
                      isActive ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.title}
                  </NavLink>
                ))}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
